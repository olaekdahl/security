# Okta OIDC Authentication Demo

A Node.js/Express application demonstrating OpenID Connect (OIDC) authentication with Okta, featuring secure secrets management using HashiCorp Vault.

## Overview

This project showcases two approaches to implementing Okta authentication:

| File | Description |
|------|-------------|
| [index.js](index.js) | **Secure version** - Retrieves Okta credentials from HashiCorp Vault |
| [index_unsecure.js](index_unsecure.js) | **Demo version** - Hardcoded credentials (not for production) |

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
- **HashiCorp Vault** (for secure version)
- **Okta Developer Account** with an OIDC application configured

## Installation

```bash
npm install
```

## Running the Application

### Option 1: Secure Version (with Vault)

#### Step 1: Start Vault in Dev Mode

```bash
vault server -dev -dev-root-token-id root -dev-tls
```

#### Step 2: Configure Environment Variables

Create a `.env` file in the project root:

```env
VAULT_ADDR=https://127.0.0.1:8200
VAULT_TOKEN=root
```

#### Step 3: Store Okta Secrets in Vault

```bash
export VAULT_ADDR='https://127.0.0.1:8200'
export VAULT_TOKEN='root'
export VAULT_SKIP_VERIFY=true

vault kv put secret/okta \
  client_id="your-okta-client-id" \
  client_secret="your-okta-client-secret"
```

#### Step 4: Run the Application

```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 node index.js
```

> **Note**: `NODE_TLS_REJECT_UNAUTHORIZED=0` is needed for Vault's self-signed TLS certificate in dev mode.

### Option 2: Unsecure Version (Demo Only)

⚠️ **Warning**: This version has hardcoded credentials and should only be used for testing.

```bash
node index_unsecure.js
```

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
├── index_unsecure.js  # Demo version with hardcoded credentials
├── vault.js           # Vault client for secrets retrieval
├── package.json       # Dependencies and scripts
└── README.md          # This file
```

## Dependencies

| Package | Purpose |
|---------|---------|
| `express` | Web framework |
| `express-session` | Session management |
| `@okta/oidc-middleware` | Okta OIDC authentication |
| `dotenv` | Environment variable loading |
| `node-fetch` | HTTP client for Vault API |

## Security Notes

- Never commit secrets to version control
- Use Vault or similar secrets management in production
- Replace the session secret with a strong random value
- Enable HTTPS in production environments