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