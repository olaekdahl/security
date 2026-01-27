import { MongoClient } from "mongodb";

let client;

/**
 * Connects once and reuses the client for the life of the process.
 */
export async function getCollections() {
  const url = process.env.MONGO_URL;
  if (!url) throw new Error("MONGO_URL is required");

  if (!client) {
    client = new MongoClient(url);
    await client.connect();
  }

  // If MONGO_URL includes a db name, MongoClient.db() uses it by default.
  const db = client.db();
  return {
    db,
    users: db.collection("users")
  };
}
