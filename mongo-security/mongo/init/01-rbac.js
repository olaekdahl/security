// Runs only on first initialization of the mongo-secure container.
db = db.getSiblingDB("appdb");

db.createUser({
  user: "app_user",
  pwd: "ChangeMe_AppUser_LongRandom",
  roles: [
    { role: "readWrite", db: "appdb" }
  ]
});

// Optional: create a tiny collection so students can see the DB exists
db.createCollection("users");
