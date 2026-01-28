/**
 * MongoDB Connection Module
 * Demonstrates secure database configuration
 */
import { MongoClient } from "mongodb";

let client = null;
let db = null;

const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017";
const DB_NAME = process.env.DB_NAME || "threat_modeling_demo";

export async function connectDB() {
  if (db) return db;
  
  try {
    client = new MongoClient(MONGO_URL, {
      // Connection pool settings
      maxPoolSize: 10,
      minPoolSize: 2,
      // Connection timeout
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 10000,
      // Socket timeout
      socketTimeoutMS: 45000,
    });
    
    await client.connect();
    db = client.db(DB_NAME);
    
    // Create indexes for security-related collections
    await createIndexes();
    
    return db;
  } catch (err) {
    console.error("MongoDB connection failed:", err);
    throw err;
  }
}

async function createIndexes() {
  // Users collection
  await db.collection("users").createIndex({ username: 1 }, { unique: true });
  await db.collection("users").createIndex({ email: 1 }, { unique: true, sparse: true });
  
  // Threats collection
  await db.collection("threats").createIndex({ category: 1 });
  await db.collection("threats").createIndex({ assetId: 1 });
  await db.collection("threats").createIndex({ "dreadScore.total": -1 });
  
  // Assets collection
  await db.collection("assets").createIndex({ name: 1 });
  await db.collection("assets").createIndex({ type: 1 });
  
  // Audit logs (with TTL for automatic cleanup)
  await db.collection("audit_logs").createIndex(
    { timestamp: 1 }, 
    { expireAfterSeconds: 30 * 24 * 60 * 60 } // 30 days
  );
  
  console.log("✓ Database indexes created");
}

export function getDB() {
  return db;
}

export function getClient() {
  return client;
}

export async function closeDB() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}
