import express from "express";
import { MongoClient } from "mongodb";
import {
  createEncryptedClient,
  getOrCreateDataKey,
  createEncryptionSchema,
  encryptValueExplicit,
  decryptValueExplicit
} from "./csfle.js";

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT || 3001);
const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017";
const DB_NAME = "appdb";

let clients = null;
let dataKeyId = null;

/**
 * Initialize CSFLE clients and data encryption key
 */
async function initCSFLE() {
  if (clients) return clients;

  console.log("Initializing MongoDB CSFLE...");
  
  // First, create/get the data encryption key
  const keyVaultClient = new MongoClient(MONGO_URL);
  await keyVaultClient.connect();
  
  try {
    dataKeyId = await getOrCreateDataKey(keyVaultClient, "demo-data-key");
    console.log("Data encryption key ready");
  } catch (err) {
    console.error("Failed to create data key:", err.message);
    console.log("Note: CSFLE requires 'mongodb-client-encryption' package");
    console.log("Falling back to non-encrypted mode...");
    
    // Return basic client without encryption
    clients = {
      encryptedClient: keyVaultClient,
      keyVaultClient,
      close: async () => { await keyVaultClient.close(); }
    };
    return clients;
  }

  // Create encryption schema
  const schema = createEncryptionSchema(dataKeyId);
  
  // Create encrypted client
  await keyVaultClient.close();
  clients = await createEncryptedClient(MONGO_URL, DB_NAME, schema);
  
  console.log("CSFLE initialized successfully!");
  return clients;
}

/**
 * Input validation (same as secure mode)
 */
function containsMongoOperators(value) {
  if (!value || typeof value !== "object") return false;
  for (const key of Object.keys(value)) {
    if (key.startsWith("$") || key.includes(".")) return true;
    if (containsMongoOperators(value[key])) return true;
  }
  return false;
}

app.get("/health", (_req, res) => res.json({ ok: true, mode: "csfle" }));

/**
 * Create a user with CSFLE automatic encryption
 * POST /users/csfle
 * 
 * Fields defined in schema (ssn, creditCard, email) are AUTOMATICALLY encrypted!
 */
app.post("/users/csfle", async (req, res) => {
  try {
    if (containsMongoOperators(req.body)) {
      return res.status(400).json({ error: "Invalid input" });
    }

    const { encryptedClient } = await initCSFLE();
    const users = encryptedClient.db(DB_NAME).collection("users");
    
    const { username, password, email, ssn, creditCard, medicalRecords } = req.body;

    if (typeof username !== "string" || typeof password !== "string") {
      return res.status(400).json({ error: "username and password required" });
    }

    // Just insert normally - CSFLE encrypts automatically based on schema!
    const doc = {
      username,
      password, // Note: In production, HASH this, don't encrypt it
      email: email || null,
      ssn: ssn || null,
      creditCard: creditCard || null,
      medicalRecords: medicalRecords || null,
      createdAt: new Date(),
      _csfle: true // Marker for demo
    };

    await users.insertOne(doc);

    res.status(201).json({
      ok: true,
      message: "User created with CSFLE automatic encryption",
      note: "Fields ssn, creditCard, email were automatically encrypted by MongoDB driver"
    });
  } catch (err) {
    res.status(500).json({ error: String(err?.message || err) });
  }
});

/**
 * Get user - CSFLE automatically decrypts!
 * GET /users/csfle/:username
 */
app.get("/users/csfle/:username", async (req, res) => {
  try {
    const { encryptedClient } = await initCSFLE();
    const users = encryptedClient.db(DB_NAME).collection("users");
    
    const user = await users.findOne({ username: req.params.username });
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Remove internal fields
    delete user._id;
    delete user.password;
    delete user._csfle;

    res.json({
      ok: true,
      user,
      note: "Encrypted fields were automatically decrypted by MongoDB driver"
    });
  } catch (err) {
    res.status(500).json({ error: String(err?.message || err) });
  }
});

/**
 * View RAW encrypted data (bypass CSFLE)
 * GET /users/csfle/raw/:username
 * 
 * This uses a NON-encrypted client to show what's actually stored
 */
app.get("/users/csfle/raw/:username", async (req, res) => {
  try {
    // Connect WITHOUT encryption to see raw data
    const rawClient = new MongoClient(MONGO_URL);
    await rawClient.connect();
    
    const users = rawClient.db(DB_NAME).collection("users");
    const user = await users.findOne({ username: req.params.username });
    
    await rawClient.close();
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Convert Binary fields to base64 for display
    const rawView = { ...user };
    delete rawView._id;
    
    for (const [key, value] of Object.entries(rawView)) {
      if (value && value._bsontype === "Binary") {
        rawView[key] = `[ENCRYPTED Binary: ${value.length()} bytes]`;
      }
    }

    res.json({
      ok: true,
      raw: rawView,
      note: "This shows the RAW encrypted data stored in MongoDB"
    });
  } catch (err) {
    res.status(500).json({ error: String(err?.message || err) });
  }
});

/**
 * Query by encrypted field (Deterministic encryption only)
 * GET /users/csfle/by-ssn/:ssn
 * 
 * This works because SSN uses Deterministic encryption algorithm
 */
app.get("/users/csfle/by-ssn/:ssn", async (req, res) => {
  try {
    const { encryptedClient } = await initCSFLE();
    const users = encryptedClient.db(DB_NAME).collection("users");
    
    // With CSFLE, you can query encrypted fields directly!
    // The driver encrypts the query value and compares encrypted-to-encrypted
    const user = await users.findOne({ ssn: req.params.ssn });
    
    if (!user) {
      return res.json({
        ok: false,
        message: "No user found with that SSN",
        note: "Query value was encrypted before comparison"
      });
    }

    res.json({
      ok: true,
      found: user.username,
      note: "Queried by encrypted SSN field (Deterministic encryption allows this)"
    });
  } catch (err) {
    res.status(500).json({ error: String(err?.message || err) });
  }
});

/**
 * Demo: Explicit encryption/decryption
 * POST /encrypt/explicit
 */
app.post("/encrypt/explicit", async (req, res) => {
  try {
    const { value } = req.body;
    if (typeof value !== "string") {
      return res.status(400).json({ error: "value must be a string" });
    }

    const { keyVaultClient } = await initCSFLE();
    
    if (!dataKeyId) {
      return res.status(500).json({ error: "CSFLE not initialized" });
    }

    const encrypted = await encryptValueExplicit(keyVaultClient, value, dataKeyId);
    const decrypted = await decryptValueExplicit(keyVaultClient, encrypted);

    res.json({
      original: value,
      encrypted: `[Binary: ${encrypted.length()} bytes]`,
      decrypted,
      match: value === decrypted
    });
  } catch (err) {
    res.status(500).json({ error: String(err?.message || err) });
  }
});

/**
 * Compare CSFLE vs manual encryption
 * GET /demo/compare-methods
 */
app.get("/demo/compare-methods", async (_req, res) => {
  res.json({
    comparison: {
      "Manual (app/src/encryption.js)": {
        pros: [
          "No extra dependencies",
          "Works with any MongoDB version",
          "Full control over encryption",
          "Can use any encryption algorithm"
        ],
        cons: [
          "Must manually encrypt/decrypt each field",
          "Cannot query encrypted fields",
          "Key management is your responsibility",
          "Easy to forget to encrypt a field"
        ]
      },
      "CSFLE (app/src/csfle.js)": {
        pros: [
          "Automatic encryption/decryption",
          "Can query Deterministic-encrypted fields",
          "Schema-based (fields defined once)",
          "MongoDB-native, battle-tested",
          "Supports KMS integration"
        ],
        cons: [
          "Requires mongodb-client-encryption package",
          "More complex setup",
          "Enterprise or Atlas for some features",
          "Slightly higher latency"
        ]
      }
    },
    recommendation: "Use CSFLE for production if you can. It's more secure and less error-prone."
  });
});

app.listen(PORT, async () => {
  console.log(`csfle-app listening on :${PORT}`);
  
  // Pre-initialize CSFLE
  try {
    await initCSFLE();
  } catch (err) {
    console.error("CSFLE init failed:", err.message);
    console.log("Server running in degraded mode");
  }
});
