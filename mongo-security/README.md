# MongoDB Security Demo Sequence (Cohesive Repo)

This repo gives you a progressive, hands-on sequence that demonstrates:

1) Insecure MongoDB (no auth) + vulnerable login endpoint (NoSQL injection)
2) Secure MongoDB (auth + RBAC) + app input validation to block operator injection
3) **Field-Level Encryption** (manual AES-256) for sensitive data
4) **MongoDB CSFLE** (Client-Side Field Level Encryption) - native automatic encryption
5) **TLS/SSL encryption** for data in transit
6) Scripted seed + scripted attacker step

---

## What this demo shows and demonstrates

This is a **teaching lab**. Instead of explaining MongoDB security in the abstract, it lets
you *run an attack, watch it succeed, then apply real controls and watch the same attack
fail*. Each stage builds on the previous one, so by the end you have walked the full path
from a wide-open database to a defense-in-depth deployment.

### The story it tells

> "Here is a working app. Here is how an attacker breaks in. Here is each layer of defense
> that shuts the attack down — authentication, authorization, input validation, encryption
> at rest, and encryption in transit."

You start by **proving the vulnerability is real** (Demo 1), then add controls one layer at
a time so you can see exactly what each control buys you and what it does *not* cover.

### Security concepts demonstrated

| Concept | Where | What you actually see |
|---------|-------|-----------------------|
| **NoSQL injection** | Demo 1 | A crafted JSON payload (`{"$ne": null}`) bypasses login entirely |
| **Authentication** | Demo 2 | MongoDB started with `--auth`; anonymous access is rejected |
| **Authorization (RBAC)** | Demo 2 | A least-privilege `app_user` that cannot touch admin or other databases |
| **Input validation** | Demo 2 | The app rejects MongoDB operators and dotted paths, enforces types |
| **Defense in depth** | Demo 2 | The same attack is blocked at *two* independent layers (DB + app) |
| **Encryption at rest** | Demo 3 | Sensitive fields stored as AES-256-GCM ciphertext blobs |
| **Password hashing vs. encryption** | Demo 3 | Passwords are one-way hashed (scrypt), not reversibly encrypted |
| **Native CSFLE** | Demo 4 | The MongoDB driver auto-encrypts/decrypts fields from a JSON schema |
| **Queryable encryption** | Demo 4 | Equality queries against deterministically-encrypted fields |
| **Key management** | Demo 3 & 4 | Where keys live, and why a real KMS belongs in production |
| **Encryption in transit (TLS)** | Demo 5 | MongoDB requires TLS; non-TLS connections are refused |

### Threats it addresses (and the control that stops each one)

- **Authentication bypass via injection** → input validation + least-privilege RBAC
- **Unauthorized database access** → `--auth` + scoped `app_user` role
- **Data theft from a breached database** → field-level encryption at rest (Demo 3/4)
- **Lateral movement / privilege escalation** → RBAC limits a compromised app to `appdb` only
- **Network eavesdropping / MITM** → TLS encryption in transit (Demo 5)
- **Credential exposure in a dump** → password hashing, not plaintext storage

### What you can do after running it

- Explain *why* a JSON query API is exploitable and how operator injection works
- Configure MongoDB authentication and least-privilege RBAC users
- Validate and sanitize untrusted input to block operator/path injection
- Choose between manual field encryption and MongoDB-native CSFLE — and explain the trade-offs
- Stand up MongoDB with TLS and prove that plaintext connections are rejected
- Articulate the difference between encryption *at rest* and encryption *in transit*, and
  why production needs a real Key Management Service (AWS KMS, Azure Key Vault, GCP KMS, Vault)

### What it intentionally does NOT do (demo simplifications)

These shortcuts keep the lab easy to run but are **not** production-safe:

- Encryption keys and the CSFLE master key live in env vars / code (use a KMS in production)
- Passwords and secrets in `docker-compose.yml` are hardcoded demo values
- TLS uses self-signed certs and allows invalid hostnames for convenience
- No rate limiting, logging/auditing, or secrets manager integration

---

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

### What the attacker script is actually doing

The interesting line in [scripts/attacker.sh](scripts/attacker.sh) is the injection request:

```bash
HTTP_CODE=$(curl -sS -o /tmp/attack_body.json -w "%{http_code}" "${BASE_URL}/login" \
  -H "content-type: application/json" \
  -d '{"username":{"$ne":null},"password":{"$ne":null}}')
```

Breaking it down:

- `curl -sS` — make an HTTP request, silent but still show errors.
- `-o /tmp/attack_body.json` — write the **response body** to a temp file so the script can print it afterwards.
- `-w "%{http_code}"` — after the request, print just the **HTTP status code** (e.g. `200` or `400`). That value is captured into the `HTTP_CODE` variable so the script can report success/failure separately from the body.
- `"${BASE_URL}/login"` — POST to the app's login endpoint.
- `-H "content-type: application/json"` — tell the server the body is JSON.
- `-d '{...}'` — the malicious **payload**.

**The payload is the attack.** A normal login sends string values:

```json
{ "username": "alice", "password": "password123" }
```

The app turns that into a MongoDB query `users.findOne({ username: "alice", password: "password123" })` — find a user whose fields *equal* those exact strings.

The attacker instead sends **objects** where strings are expected:

```json
{ "username": {"$ne": null}, "password": {"$ne": null} }
```

`$ne` is the MongoDB **"not equal" operator**. Because the vulnerable app passes the JSON straight into the query, MongoDB now runs:

```js
users.findOne({ username: { $ne: null }, password: { $ne: null } })
```

which means *"find any user whose username is not null AND password is not null"* — i.e. **the first user in the collection**. `findOne` returns a match, the app sees a user, and replies `{"ok": true}`. **Login is bypassed without knowing any username or password.**

This works because the app trusts client-supplied JSON *shape*. The attacker controls not just the values but the **structure** of the query — turning a value into a query operator. This is the NoSQL equivalent of classic SQL injection's `' OR '1'='1`.

> Run the same script in Demo 2 and the response becomes **HTTP 400** — the app now rejects any payload containing `$`-prefixed keys before it ever reaches the database.

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

> **Production note:** This demo uses a **local KMS provider** with a key kept on the
> application host — convenient for learning, but not safe for production. In production,
> back your Data Encryption Keys with a real Key Management Service
> (**AWS KMS**, **Azure Key Vault**, **GCP KMS**, or **KMIP**) so the Customer Master Key
> never lives next to the data. Rotate keys and restrict access to the key vault separately
> from database access.

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
