import express from "express";
import { getCollections } from "./mongo.js";
import {
  deriveKey,
  encryptField,
  decryptField,
  encryptDocument,
  decryptDocument,
  hashPassword,
  verifyPassword
} from "./encryption.js";

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT || 3001);

// In production, load from a secure KMS (AWS KMS, Azure Key Vault, HashiCorp Vault)
const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET || "demo-secret-change-in-production";
const encryptionKey = deriveKey(ENCRYPTION_SECRET);

// Fields to encrypt in user documents
const SENSITIVE_FIELDS = ["ssn", "creditCard", "email"];

/**
 * Returns true if an object contains keys that can be used for operator/path injection
 */
function containsMongoOperators(value) {
  if (!value || typeof value !== "object") return false;
  for (const key of Object.keys(value)) {
    if (key.startsWith("$") || key.includes(".")) return true;
    if (containsMongoOperators(value[key])) return true;
  }
  return false;
}

app.get("/health", (_req, res) => res.json({ ok: true, mode: "encrypted" }));

/**
 * Demo: Create a user with encrypted sensitive fields
 * POST /users/encrypted
 * Body: { username, password, email, ssn, creditCard }
 */
app.post("/users/encrypted", async (req, res) => {
  try {
    if (containsMongoOperators(req.body)) {
      return res.status(400).json({ error: "Invalid input" });
    }

    const { users } = await getCollections();
    const { username, password, email, ssn, creditCard } = req.body;

    if (typeof username !== "string" || typeof password !== "string") {
      return res.status(400).json({ error: "username and password required" });
    }

    // Hash password (one-way, cannot be reversed)
    const hashedPassword = hashPassword(password);

    // Encrypt sensitive fields (can be decrypted with key)
    const userDoc = {
      username,
      password: hashedPassword,
      email: email || null,
      ssn: ssn || null,
      creditCard: creditCard || null,
      createdAt: new Date()
    };

    const encryptedDoc = encryptDocument(userDoc, SENSITIVE_FIELDS, encryptionKey);
    
    await users.insertOne(encryptedDoc);

    res.status(201).json({
      ok: true,
      message: "User created with encrypted fields",
      // Show what was stored (encrypted)
      stored: {
        username: encryptedDoc.username,
        password: "[HASHED]",
        email: encryptedDoc.email ? "[ENCRYPTED]" : null,
        ssn: encryptedDoc.ssn ? "[ENCRYPTED]" : null,
        creditCard: encryptedDoc.creditCard ? "[ENCRYPTED]" : null
      }
    });
  } catch (err) {
    res.status(500).json({ error: String(err?.message || err) });
  }
});

/**
 * Demo: Get a user with decrypted sensitive fields
 * GET /users/encrypted/:username
 */
app.get("/users/encrypted/:username", async (req, res) => {
  try {
    const { users } = await getCollections();
    const { username } = req.params;

    const user = await users.findOne({ username });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Decrypt sensitive fields for display
    const decryptedUser = decryptDocument(user, SENSITIVE_FIELDS, encryptionKey);
    
    // Remove internal fields
    delete decryptedUser._id;
    delete decryptedUser.password;

    res.json({
      ok: true,
      user: decryptedUser,
      note: "Sensitive fields have been decrypted for display"
    });
  } catch (err) {
    res.status(500).json({ error: String(err?.message || err) });
  }
});

/**
 * Demo: Show what's actually stored in the database (encrypted)
 * GET /users/raw/:username
 */
app.get("/users/raw/:username", async (req, res) => {
  try {
    const { users } = await getCollections();
    const { username } = req.params;

    const user = await users.findOne({ username });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Show the raw encrypted data
    const rawView = { ...user };
    delete rawView._id;

    res.json({
      ok: true,
      raw: rawView,
      note: "This is what's stored in MongoDB - sensitive fields are encrypted"
    });
  } catch (err) {
    res.status(500).json({ error: String(err?.message || err) });
  }
});

/**
 * Demo: Login with hashed password verification
 * POST /login/secure
 */
app.post("/login/secure", async (req, res) => {
  try {
    if (containsMongoOperators(req.body)) {
      return res.status(400).json({ error: "Invalid input" });
    }

    const { username, password } = req.body;
    if (typeof username !== "string" || typeof password !== "string") {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const { users } = await getCollections();
    const user = await users.findOne({ username });

    if (!user) {
      return res.json({ ok: false, reason: "User not found" });
    }

    // Verify hashed password
    const passwordValid = verifyPassword(password, user.password);
    
    res.json({
      ok: passwordValid,
      method: "scrypt-hash-verification"
    });
  } catch (err) {
    res.status(500).json({ error: String(err?.message || err) });
  }
});

/**
 * Demo: Encrypt a single value (for testing)
 * POST /encrypt
 */
app.post("/encrypt", (req, res) => {
  try {
    const { value } = req.body;
    if (typeof value !== "string") {
      return res.status(400).json({ error: "value must be a string" });
    }

    const encrypted = encryptField(value, encryptionKey);
    const decrypted = decryptField(encrypted, encryptionKey);

    res.json({
      original: value,
      encrypted,
      decrypted,
      match: value === decrypted
    });
  } catch (err) {
    res.status(500).json({ error: String(err?.message || err) });
  }
});

/**
 * Demo: Compare plaintext vs encrypted storage
 * GET /demo/compare
 */
app.get("/demo/compare", async (req, res) => {
  try {
    const { users } = await getCollections();

    // Find users with encrypted fields
    const encryptedUsers = await users.find({ _email_encrypted: true }).limit(5).toArray();
    // Find users without encrypted fields (from insecure demo)
    const plaintextUsers = await users.find({ _email_encrypted: { $exists: false } }).limit(5).toArray();

    res.json({
      summary: {
        encryptedCount: encryptedUsers.length,
        plaintextCount: plaintextUsers.length
      },
      examples: {
        encrypted: encryptedUsers.map(u => ({
          username: u.username,
          email: u.email ? "[ENCRYPTED: " + u.email.substring(0, 20) + "...]" : null,
          ssn: u.ssn ? "[ENCRYPTED]" : null
        })),
        plaintext: plaintextUsers.map(u => ({
          username: u.username,
          password: u.password,
          note: "⚠️ Password visible in database!"
        }))
      },
      lesson: "Encrypted fields cannot be read without the encryption key"
    });
  } catch (err) {
    res.status(500).json({ error: String(err?.message || err) });
  }
});

app.listen(PORT, () => {
  console.log(`encrypted-app listening on :${PORT}`);
  console.log(`Encryption key derived from: ${ENCRYPTION_SECRET.substring(0, 4)}****`);
});
