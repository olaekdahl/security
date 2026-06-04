import { useEffect, useState } from "react";
import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
} from "@simplewebauthn/browser";

const API = import.meta.env.VITE_API_URL || "http://localhost:8001";

async function api(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: body ? "POST" : "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export default function App() {
  const [tab, setTab] = useState("register");
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState(null); // { type: 'success' | 'error' | 'info', msg }
  const [me, setMe] = useState({ loggedIn: false });
  const [supported, setSupported] = useState(true);
  const [platformAvailable, setPlatformAvailable] = useState(false);

  useEffect(() => {
    setSupported(browserSupportsWebAuthn());
    platformAuthenticatorIsAvailable().then(setPlatformAvailable);
    refreshSession();
  }, []);

  const refreshSession = async () => {
    try {
      setMe(await api("/api/me"));
    } catch {
      setMe({ loggedIn: false });
    }
  };

  const handleRegister = async () => {
    if (!username.trim()) return setStatus({ type: "error", msg: "Enter a username" });
    setStatus({ type: "info", msg: "Requesting registration options…" });
    try {
      const options = await api("/api/register/options", { username: username.trim() });
      setStatus({ type: "info", msg: "Touch your authenticator (Touch ID / Windows Hello / security key)…" });
      const attResp = await startRegistration({ optionsJSON: options });
      const result = await api("/api/register/verify", attResp);
      if (result.verified) {
        setStatus({
          type: "success",
          msg: `Passkey registered for "${username}". Total passkeys: ${result.credentialCount}`,
        });
      } else {
        setStatus({ type: "error", msg: "Registration not verified" });
      }
    } catch (err) {
      setStatus({ type: "error", msg: err.message || String(err) });
    }
  };

  const handleLogin = async (usernameless = false) => {
    setStatus({ type: "info", msg: "Requesting authentication options…" });
    try {
      const body = usernameless ? {} : { username: username.trim() };
      if (!usernameless && !body.username)
        return setStatus({ type: "error", msg: "Enter a username, or use 'Sign in with passkey' for usernameless" });

      const options = await api("/api/login/options", body);
      setStatus({ type: "info", msg: "Authenticate with your passkey…" });
      const authResp = await startAuthentication({ optionsJSON: options });
      const result = await api("/api/login/verify", authResp);
      if (result.verified) {
        setStatus({ type: "success", msg: `Signed in as "${result.username}"` });
        refreshSession();
      } else {
        setStatus({ type: "error", msg: "Authentication failed" });
      }
    } catch (err) {
      setStatus({ type: "error", msg: err.message || String(err) });
    }
  };

  const handleLogout = async () => {
    await api("/api/logout", {});
    setMe({ loggedIn: false });
    setStatus({ type: "info", msg: "Signed out" });
  };

  const handleDelete = async (id) => {
    await fetch(`${API}/api/credentials/${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "include",
    });
    refreshSession();
  };

  if (!supported) {
    return (
      <div className="container">
        <div className="header"><h1>🔐 Passkeys Demo</h1></div>
        <div className="unsupported">
          ⚠️ Your browser does not support WebAuthn. Try a recent version of Chrome, Edge, Safari, or Firefox.
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <h1>🔐 Passkeys Demo</h1>
        <p>Passwordless authentication with WebAuthn — Touch ID, Windows Hello, or a security key</p>
      </div>

      {me.loggedIn && (
        <div className="session-bar">
          <div>
            ✅ Signed in as <strong>{me.username}</strong> &middot;{" "}
            <span className="muted">{me.credentials.length} passkey(s) on file</span>
          </div>
          <button className="btn" onClick={handleLogout}>Sign out</button>
        </div>
      )}

      {!me.loggedIn && (
        <div className="card">
          <div className="tabs">
            <button className={`tab ${tab === "register" ? "active" : ""}`} onClick={() => setTab("register")}>
              Register
            </button>
            <button className={`tab ${tab === "login" ? "active" : ""}`} onClick={() => setTab("login")}>
              Sign in
            </button>
          </div>

          {tab === "register" ? (
            <>
              <h2>Create a passkey</h2>
              <p className="subtitle">
                Choose a username, then approve with your device's biometric or security key.
                No password — the private key never leaves your device.
              </p>
              <div className="row">
                <input
                  className="input"
                  placeholder="username (e.g. alice@example.com)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
                <button className="btn btn-primary" onClick={handleRegister}>
                  Create passkey
                </button>
              </div>
            </>
          ) : (
            <>
              <h2>Sign in with a passkey</h2>
              <p className="subtitle">
                Enter your username, or use the usernameless flow to let your browser show all available passkeys.
              </p>
              <div className="row">
                <input
                  className="input"
                  placeholder="username (optional)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
                <button className="btn btn-primary" onClick={() => handleLogin(false)}>
                  Sign in
                </button>
                <button className="btn" onClick={() => handleLogin(true)}>
                  Sign in with passkey (usernameless)
                </button>
              </div>
            </>
          )}

          {status && (
            <div className={`alert alert-${status.type}`}>
              <span>{status.type === "success" ? "✅" : status.type === "error" ? "❌" : "ℹ️"}</span>
              <span>{status.msg}</span>
            </div>
          )}

          <div className="muted" style={{ marginTop: "1rem" }}>
            Platform authenticator (Touch ID / Windows Hello) {platformAvailable ? "✓ available" : "✗ not detected"}
          </div>
        </div>
      )}

      {me.loggedIn && (
        <div className="card">
          <h2>Your passkeys</h2>
          <p className="subtitle">
            Each passkey is a unique public/private keypair scoped to this site. You can have multiple
            (e.g. one per device).
          </p>
          {me.credentials.length === 0 ? (
            <div className="empty">No passkeys.</div>
          ) : (
            me.credentials.map((c) => (
              <div key={c.id} className="credential">
                <div className="credential-info">
                  <div className="credential-id">{c.id}</div>
                  <div>
                    <span className={`badge ${c.backedUp ? "badge-synced" : "badge-device"}`}>
                      {c.backedUp ? "Synced" : "Device-bound"}
                    </span>
                    <span className="badge">{c.deviceType}</span>
                    {c.transports?.map((t) => (
                      <span key={t} className="badge">{t}</span>
                    ))}
                    <span className="muted">
                      &nbsp;sig-count: {c.counter} &middot; created {new Date(c.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
                <button className="btn btn-danger" onClick={() => handleDelete(c.id)}>
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      )}

      <div className="card">
        <h2>How it works</h2>
        <p className="subtitle">
          Passkeys use the WebAuthn standard. Registration creates a keypair on your device;
          the server stores only the public key. Authentication is a signed challenge.
        </p>
        <div className="flow">
          <div className="flow-step">
            <h4><span className="flow-step-num">1</span>Challenge</h4>
            <p>Server generates a random challenge and registration options (RP ID, user info, allowed algorithms).</p>
          </div>
          <div className="flow-step">
            <h4><span className="flow-step-num">2</span>Create keypair</h4>
            <p>Browser asks the authenticator to create a new keypair. Private key stays in secure hardware.</p>
          </div>
          <div className="flow-step">
            <h4><span className="flow-step-num">3</span>Attest</h4>
            <p>Authenticator returns the public key + attestation, signed over the challenge.</p>
          </div>
          <div className="flow-step">
            <h4><span className="flow-step-num">4</span>Verify &amp; store</h4>
            <p>Server verifies the signature and origin, then stores the public key against the user.</p>
          </div>
        </div>
        <p className="subtitle" style={{ marginTop: "1.5rem" }}>
          On sign-in, steps 1–4 repeat with <em>authentication</em>: the server sends a challenge,
          the authenticator signs it with the private key, and the server verifies with the stored public key.
        </p>
      </div>
    </div>
  );
}
