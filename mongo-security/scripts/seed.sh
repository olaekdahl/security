#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-insecure}"

if [[ "$MODE" != "insecure" && "$MODE" != "secure" ]]; then
  echo "Usage: bash scripts/seed.sh [insecure|secure]"
  exit 1
fi

echo "Seeding users (mode=$MODE)..."

if [[ "$MODE" == "insecure" ]]; then
  # no auth
  docker exec -i mongo-insecure mongosh "mongodb://localhost:27017/appdb" --quiet <<'MONGO'
db = db.getSiblingDB("appdb");
db.users.deleteMany({});
db.users.insertMany([
  { username: "alice", password: "password123", role: "user" },
  { username: "bob", password: "letmein", role: "user" }
]);
printjson(db.users.find().toArray());
MONGO
else
  # secure: auth + least-privileged app_user
  docker exec -i mongo-secure mongosh "mongodb://app_user:ChangeMe_AppUser_LongRandom@localhost:27017/appdb?authSource=appdb" --quiet <<'MONGO'
db = db.getSiblingDB("appdb");
db.users.deleteMany({});
db.users.insertMany([
  { username: "alice", password: "password123", role: "user" },
  { username: "bob", password: "letmein", role: "user" }
]);
printjson(db.users.find().toArray());
MONGO
fi

echo "Done."
