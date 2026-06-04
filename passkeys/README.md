# Passkeys Demo

A standalone WebAuthn / passkeys demo inspired by [passkeys.com](https://www.passkeys.com/), built with **React + Vite** (client) and **Node + Express + @simplewebauthn/server** (API).

## What it shows

- **Registration** — create a passkey for a username using your device's authenticator (Touch ID, Windows Hello, security key).
- **Sign-in (with username)** — authenticate against passkeys registered for a specific username.
- **Sign-in (usernameless / discoverable)** — let the browser surface all passkeys registered for this site.
- **Credential management** — list and remove your passkeys; see whether each one is *synced* (e.g. iCloud Keychain, Google Password Manager) or *device-bound*.

## Run it

```bash
cd passkeys
docker compose up --build
```

Then open **http://localhost:8000**.

> WebAuthn requires a *secure context*. `localhost` counts as secure, so HTTPS is not needed for local development.

| Service | URL                     |
|---------|-------------------------|
| Client  | http://localhost:8000   |
| API     | http://localhost:8001   |

## Architecture

```
Browser  ──(1) /register/options──▶  API   (returns challenge + RP info)
        ◀──(2) challenge──────────
        ──(3) navigator.credentials.create() ──▶  Authenticator (Touch ID / Hello / YubiKey)
        ◀──(4) attestation────────  Authenticator
        ──(5) /register/verify───▶  API   (verifies signature, stores public key)
```

Authentication follows the same shape with `/login/options` + `/login/verify` and `navigator.credentials.get()`.

## Storage

This demo uses an **in-memory store** (`Map` in [`server/index.js`](server/index.js)). Restarting the API clears all registered passkeys. For production, persist users + credentials in a database (Postgres, DynamoDB, etc.).

## Files

```
passkeys/
├── docker-compose.yml
├── Dockerfile.api
├── Dockerfile.client
├── server/
│   ├── package.json
│   └── index.js          # Express + @simplewebauthn/server endpoints
└── client/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx        # All UI: register / sign-in / credential list / flow diagram
        └── index.css
```

## Configuration

The API reads three environment variables (set in `docker-compose.yml`):

| Var       | Default                  | Notes                                                  |
|-----------|--------------------------|--------------------------------------------------------|
| `RP_ID`   | `localhost`              | The Relying Party ID. Must match the site's hostname.  |
| `RP_NAME` | `Passkeys Demo`          | Shown in the OS / browser passkey prompt.              |
| `ORIGIN`  | `http://localhost:8000`  | Used to verify the `clientDataJSON.origin` from the authenticator. |

If you change the client port, update `ORIGIN` accordingly.
