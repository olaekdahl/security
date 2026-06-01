# Okta OIDC Authentication Demo

A Node.js/Express application demonstrating OpenID Connect (OIDC) authentication with Okta, featuring secure secrets management using HashiCorp Vault.

## Overview

This project demonstrates Okta OIDC authentication with credentials retrieved
securely from HashiCorp Vault:

| File | Description |
|------|-------------|
| [index.js](index.js) | **Secure version** - Retrieves Okta credentials from HashiCorp Vault |

### Features

- **OIDC Authentication**: Login/logout flow using Okta's OIDC middleware
- **Protected Routes**: Route protection with `ensureAuthenticated()` middleware
- **Vault Integration**: Secure secrets retrieval from HashiCorp Vault
- **Session Management**: Express session handling for user state

### Routes

| Route | Description |
|-------|-------------|
| `/` | Home page with login link |
| `/login` | Initiates Okta OIDC login flow |
| `/authorization-code/callback` | OAuth2 callback endpoint |
| `/protected` | Protected route displaying user info |
| `/logout` | Logs out user and clears session |

## Prerequisites

- **Node.js** (v18+)
- **Docker** + Docker Compose (to run Vault in a container — recommended), or a local **HashiCorp Vault** binary
- **Okta Developer Account** with an OIDC application configured

## Installation

```bash
npm install
```

## Running the Application

### Secure Version (with Vault in Docker)

This runs HashiCorp Vault in a container (dev mode) and seeds your Okta
credentials into it automatically.

#### Step 1: Configure Environment Variables

Copy the example file and fill in your Okta app credentials:

```bash
cp .env.example .env
# edit .env and set OKTA_CLIENT_ID and OKTA_CLIENT_SECRET
```

#### Step 2: Start Vault and Seed Secrets

```bash
docker compose up -d
```

This starts two services:

| Service | Purpose |
|---------|---------|
| `vault` | HashiCorp Vault in dev mode, listening on `http://localhost:8200` (root token: `root`) |
| `vault-seed` | One-shot job that writes your Okta credentials to `secret/okta`, then exits |

Verify the secret was stored:

```bash
docker exec -e VAULT_ADDR=http://127.0.0.1:8200 -e VAULT_TOKEN=root \
  okta-vault vault kv get secret/okta
```

#### Step 3: Run the Application

```bash
npm install
node index.js
```

The app reads `VAULT_ADDR` / `VAULT_TOKEN` from `.env` and pulls the Okta
client credentials from Vault at startup.

> **Note**: The dev container uses **HTTP**, so no `NODE_TLS_REJECT_UNAUTHORIZED`
> workaround is needed. Dev mode is in-memory and resets on restart — re-run
> `docker compose up -d` to reseed.

#### Tear down

```bash
docker compose down
```

<details>
<summary>Alternative: run Vault locally without Docker</summary>

```bash
# Terminal 1 — start Vault (TLS dev mode)
vault server -dev -dev-root-token-id root -dev-tls

# Terminal 2 — seed the secret
export VAULT_ADDR='https://127.0.0.1:8200'
export VAULT_TOKEN='root'
export VAULT_SKIP_VERIFY=true
vault kv put secret/okta \
  client_id="your-okta-client-id" \
  client_secret="your-okta-client-secret"

# Run the app (TLS verification disabled for the self-signed dev cert)
NODE_TLS_REJECT_UNAUTHORIZED=0 node index.js
```

Set `VAULT_ADDR=https://127.0.0.1:8200` in your `.env` for this path.

</details>

## Accessing the Application

Once running, open your browser to: **http://localhost:8080**

1. Click **"Login with Okta"** to authenticate
2. Enter your Okta credentials
3. After successful login, visit `/protected` to see your user information
4. Click logout or visit `/logout` to end the session

## Understanding the `/protected` Output

After signing in, the `/protected` page decodes your tokens and displays each
claim alongside a plain-English explanation. The app receives an **ID token**
(who the user is) and an **access token** (what the caller may do); both are
issued by your Okta authorization server.

### ID Token Claims

The ID token proves the user's identity. Example claims:

| Claim | Example value | Meaning |
|-------|---------------|---------|
| `sub` | `00uzixnqrj995Gp8m697` | Subject — unique, stable identifier for the user |
| `name` | `Ola Ekdahl` | Full display name |
| `ver` | `1` | Token format version |
| `iss` | `https://integrator-3920884.okta.com/oauth2/default` | Issuer — the authorization server that signed the token |
| `aud` | `0oazixl5re5JWfkeX697` | Audience — the client (app) the token was minted for |
| `iat` | `1780334076` (6/1/2026, 10:14:36 AM) | Issued At |
| `exp` | `1780337676` (6/1/2026, 11:14:36 AM) | Expiration — note the 1-hour lifetime |
| `jti` | `ID.4l7L2Wiw0htGmlIss6eTavkbfI6sTv49nJvzq-y-3RM` | Unique token ID (helps detect replay) |
| `amr` | `["mfa","otp","pwd","okta_verify"]` | Authentication Methods References — how the user proved identity (here: MFA via OTP, password, and Okta Verify) |
| `idp` | `00ozixnqnhv4a6ktc697` | Identity Provider that authenticated the user |
| `preferred_username` | `ola@ciracon.com` | User's preferred login name |
| `auth_time` | `1780334075` (6/1/2026, 10:14:35 AM) | When the user last actively authenticated |
| `at_hash` | `A7MgwphiPSkr0-hH2docOg` | Hash binding this ID token to its access token |

### Access Token Claims

The access token authorizes calls to APIs. Example claims:

| Claim | Example value | Meaning |
|-------|---------------|---------|
| `ver` | `1` | Token format version |
| `jti` | `AT.H8_YrHwi4_PM-a-3F6MhfE-RhivY4aOfrl2Ed_AFM3Q` | Unique token ID |
| `iss` | `https://integrator-3920884.okta.com/oauth2/default` | Issuer |
| `aud` | `api://default` | Audience — the **API** this token is meant for (contrast with the ID token's client-ID audience) |
| `iat` | `1780334076` (6/1/2026, 10:14:36 AM) | Issued At |
| `exp` | `1780337676` (6/1/2026, 11:14:36 AM) | Expiration |
| `cid` | `0oazixl5re5JWfkeX697` | Client ID that requested the token |
| `uid` | `00uzixnqrj995Gp8m697` | Okta's internal user identifier |
| `scp` | `["profile","openid"]` | Scopes — the permissions granted to this token |
| `auth_time` | `1780334075` (6/1/2026, 10:14:35 AM) | When the user last authenticated |
| `sub` | `ola@ciracon.com` | Subject of the access token |

> **Things to notice when teaching:**
> - The two tokens have **different `aud` values**: the ID token is for the app
>   (client ID), the access token is for the API (`api://default`).
> - `amr` shows strong, **phishing-resistant MFA** was used.
> - Tokens are **short-lived** (`exp − iat` = 1 hour).
> - The `at_hash` in the ID token cryptographically ties it to the access token.

### Raw Context JSON

The page also exposes the full `req.userContext` under **"View Raw Context JSON"**,
which contains the `userinfo` response plus the raw `access_token` and `id_token`
JWTs (and their `token_type`, `scope`, and `expires_at`):

```jsonc
{
  "userinfo": {
    "sub": "00uzixnqrj995Gp8m697",
    "name": "Ola Ekdahl",
    "locale": "en_US",
    "preferred_username": "ola@ciracon.com",
    "given_name": "Ola",
    "family_name": "Ekdahl",
    "zoneinfo": "America/Los_Angeles",
    "updated_at": 1769384227
  },
  "tokens": {
    "token_type": "Bearer",
    "expires_at": 1780337675,
    "access_token": "eyJraWQiOiJJUk85...<truncated JWT>",
    "scope": "profile openid",
    "id_token": "eyJraWQiOiJJUk85...<truncated JWT>"
  }
}
```

> ⚠️ **These are live bearer credentials.** The raw `access_token` and
> `id_token` are real, signed JWTs — anyone holding them can call the API or
> impersonate the session until they expire. Only the **decoded payload** is safe
> to share; never paste full tokens into issues, logs, or screenshots. You can
> inspect a decoded token safely at [jwt.io](https://jwt.io).

## Okta Configuration

To use this demo with your own Okta account:

1. Create a new **Web Application** in the Okta Admin Console
2. Set the following redirect URIs:
   - **Sign-in redirect URI**: `http://localhost:8080/authorization-code/callback`
   - **Sign-out redirect URI**: `http://localhost:8080`
3. Update the `issuer` URL in the code to match your Okta domain
4. Use your application's Client ID and Client Secret

## Project Structure

```
├── index.js           # Secure version with Vault integration
├── vault.js           # Vault client for secrets retrieval
├── docker-compose.yml # Vault (dev mode) + one-shot secret seeder
├── .env.example       # Template for Vault/Okta environment variables
├── package.json       # Dependencies and scripts
└── README.md          # This file
```

## Dependencies

| Package | Purpose |
|---------|---------|
| `express` | Web framework (v4 — required by `@okta/oidc-middleware`) |
| `express-session` | Session management |
| `@okta/oidc-middleware` | Okta OIDC authentication |
| `dotenv` | Environment variable loading |

> **Note**: Vault calls use the built-in global `fetch` (Node.js 18+), so no extra HTTP client dependency is required.

> **Express version**: `@okta/oidc-middleware` (current stable 5.x) targets **Express 4**. Do not upgrade this project to Express 5 — the middleware's router and session handling are not compatible. For new projects, consider the framework-agnostic [`openid-client`](https://github.com/panva/node-openid-client) library instead.

## Security Notes

- Never commit secrets to version control
- Use Vault or similar secrets management in production
- Replace the session secret with a strong random value
- Enable HTTPS in production environments