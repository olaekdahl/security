# MongoDB Security Demo Sequence (Cohesive Repo)

This repo gives you a progressive, hands-on sequence that demonstrates:

1) Insecure MongoDB (no auth) + vulnerable login endpoint (NoSQL injection)
2) Secure MongoDB (auth + RBAC) + app input validation to block operator injection
3) Scripted seed + scripted attacker step

## Prereqs

- Docker Desktop
- Node.js is NOT required locally (everything runs in containers)
- On Windows/WSL, run commands from a shell with Docker available

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
docker compose --profile insecure logs -f app
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

## Notes / Teaching beats

- Demo 1 shows how a JSON-based query can be abused with operators like `$ne`.
- Demo 2 fixes two things:
  - DB: require auth + create a least-privileged `app_user` (RBAC)
  - App: reject operator keys (`$...`) and dotted paths plus enforce string types

---

## Environment variables

The compose file sets:
- Insecure: `MONGO_URL=mongodb://mongo-insecure:27017`
- Secure:   `MONGO_URL=mongodb://app_user:ChangeMe_AppUser_LongRandom@mongo-secure:27017/appdb?authSource=appdb`

The app also reads:
- `VALIDATION_MODE=off|on`
