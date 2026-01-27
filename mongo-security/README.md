# MongoDB Security Demo Sequence (Cohesive Repo)

This repo gives you a progressive, hands-on sequence that demonstrates:

1) Insecure MongoDB (no auth) + vulnerable login endpoint (NoSQL injection)
2) Secure MongoDB (auth + RBAC) + app input validation to block operator injection
3) Scripted seed + scripted attacker step

## Repo layout

- `docker-compose.yml` : brings up MongoDB + the demo app in either **insecure** or **secure** mode (profiles)
- `app/` : Node/Express app (supports validation on/off)
- `mongo/init/` : Mongo init scripts (RBAC user creation for secure mode)
- `scripts/seed.sh` : seeds demo users into MongoDB
- `scripts/attacker.sh` : performs a NoSQL injection attempt against `/login`

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

| Layer | Insecure Mode | Secure Mode |
|-------|--------------|-------------|
| **DB Authentication** | None | Required (`--auth`) |
| **DB Authorization** | N/A | RBAC (least-privilege `app_user`) |
| **Input Validation** | None | Blocks `$` operators, enforces types |
| **Attack Result** | ✅ Injection succeeds | ❌ Blocked at app layer |

---

## Notes / Teaching Beats

- **Demo 1** shows how a JSON-based query can be abused with operators like `$ne`, `$gt`, `$regex`
- **Demo 2** fixes with defense in depth:
  - **DB layer**: Require auth + create a least-privileged `app_user` (RBAC)
  - **App layer**: Reject operator keys (`$...`) and dotted paths, enforce string types
- Real-world applications should also use:
  - Parameterized queries or ODM/ORM with built-in sanitization
  - Rate limiting to prevent brute-force attacks
  - Password hashing (never store plaintext passwords!)
  - TLS/SSL for MongoDB connections

---

## Environment Variables

The compose file sets:
- **Insecure**: `MONGO_URL=mongodb://mongo-insecure:27017/appdb`
- **Secure**: `MONGO_URL=mongodb://app_user:ChangeMe_AppUser_LongRandom@mongo-secure:27017/appdb?authSource=appdb`

The app also reads:
- `VALIDATION_MODE=off` (insecure) or `VALIDATION_MODE=on` (secure)

---

## Port Configuration

The app runs on port **3001** by default (mapped from container port 3000). Update `BASE_URL` in scripts if needed:

```bash
BASE_URL=http://localhost:3001 bash scripts/attacker.sh
```
