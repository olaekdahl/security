import express from "express";
import cors from "cors";
import session from "express-session";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";

const PORT = process.env.PORT || 8001;
const RP_ID = process.env.RP_ID || "localhost";
const RP_NAME = process.env.RP_NAME || "Passkeys Demo";
const ORIGIN = process.env.ORIGIN || "http://localhost:8000";

const app = express();

app.use(
  cors({
    origin: ORIGIN,
    credentials: true,
  })
);
app.use(express.json());
app.use(
  session({
    secret: "passkeys-demo-not-for-production",
    resave: false,
    saveUninitialized: true,
    cookie: { sameSite: "lax", httpOnly: true, secure: false },
  })
);

/**
 * In-memory store. Replace with a database in production.
 *   users:    Map<username, { id, username, credentials: [] }>
 *   each credential: { id, publicKey, counter, deviceType, backedUp, transports }
 */
const users = new Map();

const getOrCreateUser = (username) => {
  if (!users.has(username)) {
    const id = new Uint8Array(16);
    crypto.getRandomValues(id);
    users.set(username, {
      id: Buffer.from(id),
      username,
      credentials: [],
    });
  }
  return users.get(username);
};

// ──────────────────────────────────────────────────────────────
// Registration
// ──────────────────────────────────────────────────────────────
app.post("/api/register/options", async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: "username required" });

  const user = getOrCreateUser(username);

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: user.id,
    userName: user.username,
    attestationType: "none",
    excludeCredentials: user.credentials.map((c) => ({
      id: c.id,
      transports: c.transports,
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
      // Allow both platform (Touch ID / Windows Hello) and roaming (YubiKey)
    },
  });

  req.session.currentChallenge = options.challenge;
  req.session.currentUsername = username;
  res.json(options);
});

app.post("/api/register/verify", async (req, res) => {
  const username = req.session.currentUsername;
  if (!username) return res.status(400).json({ error: "no challenge in session" });

  const user = users.get(username);
  if (!user) return res.status(400).json({ error: "user not found" });

  try {
    const verification = await verifyRegistrationResponse({
      response: req.body,
      expectedChallenge: req.session.currentChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
    });

    if (verification.verified && verification.registrationInfo) {
      const { credential, credentialDeviceType, credentialBackedUp } =
        verification.registrationInfo;

      user.credentials.push({
        id: credential.id,
        publicKey: credential.publicKey,
        counter: credential.counter,
        transports: req.body.response?.transports || [],
        deviceType: credentialDeviceType,
        backedUp: credentialBackedUp,
        createdAt: new Date().toISOString(),
      });
    }

    req.session.currentChallenge = undefined;
    res.json({
      verified: verification.verified,
      credentialCount: user.credentials.length,
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────────────────────
// Authentication
// ──────────────────────────────────────────────────────────────
app.post("/api/login/options", async (req, res) => {
  const { username } = req.body;
  // Username is optional — if omitted, allow discoverable credentials (usernameless flow)
  let allowCredentials;
  if (username) {
    const user = users.get(username);
    if (!user) return res.status(404).json({ error: "user not found" });
    allowCredentials = user.credentials.map((c) => ({
      id: c.id,
      transports: c.transports,
    }));
  }

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: "preferred",
    allowCredentials,
  });

  req.session.currentChallenge = options.challenge;
  req.session.currentUsername = username || null;
  res.json(options);
});

app.post("/api/login/verify", async (req, res) => {
  const expectedChallenge = req.session.currentChallenge;
  if (!expectedChallenge)
    return res.status(400).json({ error: "no challenge in session" });

  // Find user by credential id (works for both username and usernameless flows)
  const credentialId = req.body.id;
  let user, credential;
  for (const u of users.values()) {
    const found = u.credentials.find((c) => c.id === credentialId);
    if (found) {
      user = u;
      credential = found;
      break;
    }
  }
  if (!user || !credential)
    return res.status(404).json({ error: "credential not registered" });

  try {
    const verification = await verifyAuthenticationResponse({
      response: req.body,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      credential: {
        id: credential.id,
        publicKey: credential.publicKey,
        counter: credential.counter,
        transports: credential.transports,
      },
    });

    if (verification.verified) {
      credential.counter = verification.authenticationInfo.newCounter;
      req.session.loggedInUser = user.username;
    }

    req.session.currentChallenge = undefined;
    res.json({
      verified: verification.verified,
      username: user.username,
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────────────────────
// Session + management endpoints
// ──────────────────────────────────────────────────────────────
app.get("/api/me", (req, res) => {
  const username = req.session.loggedInUser;
  if (!username) return res.json({ loggedIn: false });
  const user = users.get(username);
  res.json({
    loggedIn: true,
    username,
    credentials: user.credentials.map((c) => ({
      id: c.id,
      deviceType: c.deviceType,
      backedUp: c.backedUp,
      transports: c.transports,
      counter: c.counter,
      createdAt: c.createdAt,
    })),
  });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.delete("/api/credentials/:id", (req, res) => {
  const username = req.session.loggedInUser;
  if (!username) return res.status(401).json({ error: "not logged in" });
  const user = users.get(username);
  user.credentials = user.credentials.filter((c) => c.id !== req.params.id);
  res.json({ ok: true, remaining: user.credentials.length });
});

app.get("/api/health", (_req, res) => res.json({ ok: true, rpID: RP_ID, origin: ORIGIN }));

app.listen(PORT, () => {
  console.log(`Passkeys demo API listening on :${PORT}`);
  console.log(`  RP_ID=${RP_ID}`);
  console.log(`  ORIGIN=${ORIGIN}`);
});
