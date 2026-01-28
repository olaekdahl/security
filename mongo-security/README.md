# MongoDB Security Demo Sequence (Cohesive Repo)

This repo gives you a progressive, hands-on sequence that demonstrates:

1) Insecure MongoDB (no auth) + vulnerable login endpoint (NoSQL injection)
2) Secure MongoDB (auth + RBAC) + app input validation to block operator injection
3) **Field-Level Encryption** (manual AES-256) for sensitive data
4) **MongoDB CSFLE** (Client-Side Field Level Encryption) - native automatic encryption
5) **TLS/SSL encryption** for data in transit
6) Scripted seed + scripted attacker step

## Repo layout

- `docker-compose.yml` : brings up MongoDB + the demo app in **insecure**, **secure**, **encrypted**, **csfle**, or **tls** mode
- `app/` : Node/Express app (supports validation on/off, field-level encryption)
- `mongo/init/` : Mongo init scripts (RBAC user creation for secure mode)
- `scripts/seed.sh` : seeds demo users into MongoDB
- `scripts/attacker.sh` : performs a NoSQL injection attempt against `/login`
- `scripts/demo-encryption.sh` : demonstrates manual field-level encryption
- `scripts/demo-csfle.sh` : demonstrates MongoDB native CSFLE
- `scripts/demo-tls.sh` : generates TLS certificates and shows TLS usage

---

## Demo 0: Build images once (optional)

```bash
docker compose build
```

---

## Demo 1: Insecure DB + vulnerable app (operator injection succeeds)

Start the insecure stack:

```bash
docker compose --profile insecure up -d
```

Seed demo data:

```bash
bash scripts/seed.sh insecure
```

Run the attacker script (expected: injection works, `ok=true`):

```bash
bash scripts/attacker.sh
```

View logs:

```bash
docker compose --profile insecure logs -f app-insecure
```

Stop:

```bash
docker compose --profile insecure down -v
```

---

## Demo 2: Secure DB (auth + RBAC) + safer app (injection blocked)

Start the secure stack:

```bash
docker compose --profile secure up -d
```

Seed demo data (expected: works using least-privileged `app_user`):

```bash
bash scripts/seed.sh secure
```

Run the attacker script again (expected: injection blocked, HTTP 400):

```bash
bash scripts/attacker.sh
```

Optional: prove RBAC

```bash
docker exec -it mongo-secure mongosh "mongodb://admin:ChangeMe_LongRandom@localhost:27017/admin" --quiet --eval "db.getUsers()"
docker exec -it mongo-secure mongosh "mongodb://app_user:ChangeMe_AppUser_LongRandom@localhost:27017/appdb" --quiet --eval "db.stats()"
# The app_user should NOT be able to read admin users:
docker exec -it mongo-secure mongosh "mongodb://app_user:ChangeMe_AppUser_LongRandom@localhost:27017/admin" --quiet --eval "db.getUsers()" || true
```

Stop:

```bash
docker compose --profile secure down -v
```

---

## Demo 3: Field-Level Encryption (Protecting Sensitive Data)

This demo shows application-level encryption of sensitive fields like SSN, credit cards, and emails.

Start the encrypted stack:

```bash
docker compose --profile encrypted up -d
```

Run the encryption demo script:

```bash
bash scripts/demo-encryption.sh
```

**What the demo shows:**

1. **Create user with sensitive data** — SSN, credit card, email are encrypted before storage
2. **View raw MongoDB data** — See the encrypted blobs stored in the database
3. **View decrypted data** — Application decrypts fields using the encryption key
4. **Password hashing** — Passwords are hashed (one-way), not encrypted

**Manual testing:**

```bash
# Create a user with sensitive data
curl -X POST http://localhost:3001/users/encrypted \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_user",
    "password": "MyPassword123",
    "email": "test@example.com",
    "ssn": "123-45-6789",
    "creditCard": "4111-1111-1111-1111"
  }'

# View RAW data in MongoDB (encrypted)
curl http://localhost:3001/users/raw/test_user | jq .

# View DECRYPTED data (application has the key)
curl http://localhost:3001/users/encrypted/test_user | jq .

# Test secure login
curl -X POST http://localhost:3001/login/secure \
  -H "Content-Type: application/json" \
  -d '{"username": "test_user", "password": "MyPassword123"}'
```

Stop:

```bash
docker compose --profile encrypted down -v
```

---

## Demo 4: MongoDB CSFLE (Native Client-Side Field Level Encryption)

CSFLE is MongoDB's **native automatic encryption** - the driver handles encryption/decryption transparently!

### Why CSFLE over manual encryption?

| Feature | Manual (Demo 3) | CSFLE (Demo 4) |
|---------|-----------------|----------------|
| Encryption | Manual calls | Automatic |
| Query encrypted fields | ❌ No | ✓ Yes (Deterministic) |
| Forget to encrypt? | Possible | Impossible (schema-based) |
| MongoDB native | No | Yes |

### Start the CSFLE stack:

```bash
docker compose --profile csfle up -d
```

### Run the CSFLE demo:

```bash
bash scripts/demo-csfle.sh
```

### Manual testing:

```bash
# Create user - fields auto-encrypted by MongoDB driver!
curl -X POST http://localhost:3001/users/csfle \
  -H "Content-Type: application/json" \
  -d '{
    "username": "csfle_demo",
    "password": "Secret123",
    "email": "csfle@example.com",
    "ssn": "555-66-7777",
    "creditCard": "4000-1234-5678-9010"
  }'

# View RAW data (encrypted Binary blobs)
curl http://localhost:3001/users/csfle/raw/csfle_demo | jq .

# View decrypted (automatic via CSFLE client)
curl http://localhost:3001/users/csfle/csfle_demo | jq .

# Query by encrypted SSN field! (only Deterministic encryption supports this)
curl http://localhost:3001/users/csfle/by-ssn/555-66-7777 | jq .

# Compare encryption methods
curl http://localhost:3001/demo/compare-methods | jq .
```

### CSFLE Encryption Algorithms:

- **Deterministic**: Same plaintext → same ciphertext (allows equality queries)
- **Random**: Same plaintext → different ciphertext each time (more secure, no queries)

Stop:

```bash
docker compose --profile csfle down -v
```

---

## Demo 5: TLS/SSL Encryption (Data in Transit)

This demo shows how to secure MongoDB connections with TLS certificates.

### Step 1: Generate TLS Certificates

```bash
bash scripts/demo-tls.sh
```

This creates:
- `certs/ca.pem` — Certificate Authority
- `certs/server.pem` — MongoDB server certificate
- `certs/client.pem` — Client certificate (for mTLS)

### Step 2: Start MongoDB with TLS

```bash
docker compose --profile tls up -d
```

### Step 3: Connect with TLS

```bash
# Connect to MongoDB with TLS
docker exec -it mongo-tls mongosh \
  "mongodb://admin:ChangeMe_LongRandom@localhost:27017/admin" \
  --tls --tlsCAFile /certs/ca.pem

# Test the app (automatically uses TLS)
curl http://localhost:3001/health
```

### Step 4: Verify TLS is Required

```bash
# This should FAIL (no TLS)
docker exec -it mongo-tls mongosh \
  "mongodb://admin:ChangeMe_LongRandom@localhost:27017/admin" \
  --eval "db.runCommand({ping:1})" 2>&1 || echo "✓ Connection without TLS rejected!"
```

Stop:

```bash
docker compose --profile tls down -v
```

---

## Understanding Encryption Layers

### Field-Level Encryption (Data at Rest)

```
┌─────────────────────────────────────────────────────────────┐
│  Application Layer                                          │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  User Input                                             ││
│  │  { ssn: "123-45-6789", email: "user@example.com" }      ││
│  └─────────────────────────────────────────────────────────┘│
│                           │                                 │
│                    ┌──────▼──────┐                          │
│                    │  ENCRYPT    │ ◄── AES-256-GCM          │
│                    └──────┬──────┘                          │
│                           │                                 │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Encrypted Document (stored in MongoDB)                 ││
│  │  { ssn: "Abc123...==", email: "Xyz789...==" }           ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

**Benefits:**
- Even if database is breached, sensitive data is unreadable
- Encryption keys can be managed separately (KMS)
- Granular control over which fields are encrypted

### TLS Encryption (Data in Transit)

```
┌──────────┐                           ┌──────────┐
│  Client  │ ═══════TLS══════════════> │  MongoDB │
│  (App)   │ <═══════ENCRYPTED════════ │  Server  │
└──────────┘                           └──────────┘
     │                                       │
     │  • Credentials encrypted              │
     │  • Query data encrypted               │
     │  • Results encrypted                  │
     │  • Protected from MITM attacks        │
     └───────────────────────────────────────┘
```

**Benefits:**
- Prevents eavesdropping on network traffic
- Verifies server identity (prevents impersonation)
- Required for compliance (PCI-DSS, HIPAA, SOC2)

---

## Understanding Secure vs Insecure Mode

### Insecure Mode: What's Vulnerable

**Database Layer:**

- MongoDB runs with **no authentication** — anyone who can reach port 27017 can read/write any database
- No user accounts, no passwords, no access control
- Connection string: `mongodb://mongo-insecure:27017` (no credentials)

**Application Layer:**

- The `/login` endpoint directly passes user input to MongoDB's `findOne()`:

  ```javascript
  // VULNERABLE: req.body goes straight to the query
  const user = await users.findOne({ username, password });
  ```

- No input validation — accepts any JSON structure

**The Attack (NoSQL Injection):**

```bash
# Normal login
curl -X POST http://localhost:3001/login \
  -H "content-type: application/json" \
  -d '{"username":"alice","password":"password123"}'
# → {"ok":true} if credentials match

# Injection attack using MongoDB operators
curl -X POST http://localhost:3001/login \
  -H "content-type: application/json" \
  -d '{"username":{"$ne":null},"password":{"$ne":null}}'
# → {"ok":true} — bypasses authentication!
```

The `$ne` (not equal) operator makes the query: *"find a user where username is not null AND password is not null"* — which matches ANY user in the database.

---

### Secure Mode: Defense in Depth

**Database Layer (Authentication + RBAC):**

- MongoDB runs with `--auth` flag — authentication required
- **Admin user** created with root privileges (for DB management only)
- **app_user** created with least-privilege access:

  ```javascript
  // From mongo/init/01-rbac.js
  db.createUser({
    user: "app_user",
    pwd: "ChangeMe_AppUser_LongRandom",
    roles: [{ role: "readWrite", db: "appdb" }]  // Only appdb, nothing else
  });
  ```
  
- The app connects as `app_user` — even if compromised, attacker can't access other databases or admin functions

**Application Layer (Input Validation):**
- Rejects any input containing MongoDB operators (`$ne`, `$gt`, `$regex`, etc.):
  ```javascript
  function containsMongoOperators(value) {
    if (!value || typeof value !== "object") return false;
    for (const key of Object.keys(value)) {
      if (key.startsWith("$") || key.includes(".")) return true;  // Block operators & dot notation
      if (containsMongoOperators(value[key])) return true;        // Recursive check
    }
    return false;
  }
  ```
- Enforces string types for username and password:
  ```javascript
  if (typeof username !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "Invalid input" });
  }
  ```

**Attack Result in Secure Mode:**
```bash
# Same injection attempt
curl -X POST http://localhost:3001/login \
  -H "content-type: application/json" \
  -d '{"username":{"$ne":null},"password":{"$ne":null}}'
# → HTTP 400: {"error":"Invalid input"} — blocked!
```

---

## Security Layers Summary

| Layer | Insecure | Secure | Encrypted | CSFLE | TLS |
|-------|----------|--------|-----------|-------|-----|
| **DB Authentication** | ❌ None | ✓ Required | ✓ Required | ✓ Required | ✓ Required |
| **DB Authorization** | ❌ N/A | ✓ RBAC | ✓ RBAC | ✓ RBAC | ✓ RBAC |
| **Input Validation** | ❌ None | ✓ Blocks operators | ✓ Blocks operators | ✓ Blocks operators | ✓ Blocks operators |
| **Field Encryption** | ❌ None | ❌ None | ✓ AES-256-GCM | ✓ MongoDB native | ✓ AES-256-GCM |
| **Auto Encrypt/Decrypt** | ❌ | ❌ | ❌ Manual | ✓ Automatic | ❌ Manual |
| **Query Encrypted Fields** | ❌ | ❌ | ❌ | ✓ Deterministic | ❌ |
| **Transport Encryption** | ❌ None | ❌ None | ❌ None | ❌ None | ✓ TLS 1.3 |
| **Password Storage** | ❌ Plaintext | ❌ Plaintext | ✓ Hashed | N/A | ✓ Hashed |

---

## Notes / Teaching Beats

- **Demo 1** shows how a JSON-based query can be abused with operators like `$ne`, `$gt`, `$regex`
- **Demo 2** fixes with defense in depth:
  - **DB layer**: Require auth + create a least-privileged `app_user` (RBAC)
  - **App layer**: Reject operator keys (`$...`) and dotted paths, enforce string types
- Real-world applications should also use:
  - Parameterized queries or ODM/ORM with built-in sanitization
  - Rate limiting to prevent brute-force attacks
  - Password hashing (never store plaintext passwords!) — **Demo 3 shows this!**
  - MongoDB CSFLE for automatic field encryption — **Demo 4 shows this!**
  - TLS/SSL for MongoDB connections — **Demo 5 shows this!**
  - Field-level encryption for PII — **Demo 3 & 4 show this!**
  - A proper Key Management Service (AWS KMS, Azure Key Vault, HashiCorp Vault)

---

## Environment Variables

The compose file sets:
- **Insecure**: `MONGO_URL=mongodb://mongo-insecure:27017/appdb`
- **Secure**: `MONGO_URL=mongodb://app_user:ChangeMe_AppUser_LongRandom@mongo-secure:27017/appdb?authSource=appdb`
- **Encrypted**: Same as secure + `ENCRYPTION_SECRET=demo-encryption-key-change-in-production`
- **CSFLE**: Same as secure + `LOCAL_MASTER_KEY` (base64 encoded 96-byte key)
- **TLS**: Secure URL + `tls=true&tlsCAFile=/certs/ca.pem`

The app also reads:
- `VALIDATION_MODE=off` (insecure) or `VALIDATION_MODE=on` (secure/encrypted/tls)
- `ENCRYPTION_SECRET` — Key for manual field-level encryption (use KMS in production!)
- `LOCAL_MASTER_KEY` — CSFLE master key (use real KMS in production!)

---

## Port Configuration

The app runs on port **3001** by default (mapped from container port 3000). Update `BASE_URL` in scripts if needed:

```bash
BASE_URL=http://localhost:3001 bash scripts/attacker.sh
```

---

## Quick Reference: All Profiles

| Profile | Command | What it demonstrates |
|---------|---------|---------------------|
| `insecure` | `docker compose --profile insecure up -d` | No auth, NoSQL injection works |
| `secure` | `docker compose --profile secure up -d` | Auth + RBAC + input validation |
| `encrypted` | `docker compose --profile encrypted up -d` | Manual field-level encryption (AES-256) |
| `csfle` | `docker compose --profile csfle up -d` | MongoDB native CSFLE (automatic encryption) |
| `tls` | `docker compose --profile tls up -d` | TLS/SSL encryption in transit |

> **Note:** Each profile is self-contained. The `encrypted`, `csfle`, and `tls` profiles automatically include the secure MongoDB instance.

**Full security demo progression:**
```bash
# 1. Show the vulnerability
docker compose --profile insecure up -d
bash scripts/seed.sh insecure
bash scripts/attacker.sh          # Injection succeeds!
docker compose --profile insecure down -v

# 2. Fix with auth + validation
docker compose --profile secure up -d
bash scripts/seed.sh secure
bash scripts/attacker.sh          # Injection blocked!
docker compose --profile secure down -v

# 3. Add manual field-level encryption
docker compose --profile encrypted up -d
bash scripts/demo-encryption.sh   # Shows encrypted storage
docker compose --profile encrypted down -v

# 4. MongoDB native CSFLE (recommended!)
docker compose --profile csfle up -d
bash scripts/demo-csfle.sh        # Automatic encryption + queryable!
docker compose --profile csfle down -v

# 5. Add TLS (requires certs)
bash scripts/demo-tls.sh          # Generate certs first
docker compose --profile tls up -d
curl http://localhost:3001/health
docker compose --profile tls down -v
```
