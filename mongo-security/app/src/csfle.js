import { MongoClient, Binary } from "mongodb";
import crypto from "crypto";

/**
 * MongoDB Client-Side Field Level Encryption (CSFLE) Demo
 * 
 * This demonstrates MongoDB's NATIVE automatic field-level encryption.
 * The driver automatically encrypts/decrypts fields based on a JSON schema.
 * 
 * For this demo, we use a LOCAL key provider (key stored in memory).
 * In PRODUCTION, use a proper KMS:
 *   - AWS KMS
 *   - Azure Key Vault
 *   - Google Cloud KMS
 *   - HashiCorp Vault (via KMIP)
 */

// Local master key (96 bytes) - FOR DEMO ONLY!
// In production, this comes from a KMS, not from code/env vars
const LOCAL_MASTER_KEY = process.env.LOCAL_MASTER_KEY 
  ? Buffer.from(process.env.LOCAL_MASTER_KEY, "base64")
  : crypto.randomBytes(96);

const KEY_VAULT_NAMESPACE = "encryption.__keyVault";

/**
 * Creates a CSFLE-enabled MongoClient with automatic encryption.
 * 
 * @param {string} connectionUri - MongoDB connection string
 * @param {string} dbName - Database name for encrypted collections
 * @param {Object} schemaMap - JSON schema defining which fields to encrypt
 */
export async function createEncryptedClient(connectionUri, dbName, schemaMap) {
  // Key vault client (unencrypted, used to manage data encryption keys)
  const keyVaultClient = new MongoClient(connectionUri);
  await keyVaultClient.connect();
  
  // Ensure key vault collection has a unique index on keyAltNames
  const keyVaultDB = keyVaultClient.db("encryption");
  const keyVaultColl = keyVaultDB.collection("__keyVault");
  
  try {
    await keyVaultColl.createIndex(
      { keyAltNames: 1 },
      { unique: true, partialFilterExpression: { keyAltNames: { $exists: true } } }
    );
  } catch (e) {
    // Index may already exist
  }

  // KMS provider configuration (local key for demo)
  const kmsProviders = {
    local: {
      key: LOCAL_MASTER_KEY
    }
  };

  // Auto-encryption options
  const autoEncryptionOpts = {
    keyVaultNamespace: KEY_VAULT_NAMESPACE,
    kmsProviders,
    schemaMap: {
      [`${dbName}.users`]: schemaMap
    },
    // Use shared library instead of mongocryptd (easier setup)
    extraOptions: {
      cryptSharedLibRequired: false,
      // If you have crypt_shared installed, uncomment:
      // cryptSharedLibPath: '/path/to/mongo_crypt_v1.so'
    }
  };

  // Create encrypted client
  const encryptedClient = new MongoClient(connectionUri, {
    autoEncryption: autoEncryptionOpts
  });
  
  await encryptedClient.connect();
  
  return {
    encryptedClient,
    keyVaultClient,
    async close() {
      await encryptedClient.close();
      await keyVaultClient.close();
    }
  };
}

/**
 * Creates or retrieves a Data Encryption Key (DEK) for field encryption.
 * 
 * @param {MongoClient} keyVaultClient - Client connected to key vault
 * @param {string} keyAltName - Alternative name for the key
 */
export async function getOrCreateDataKey(keyVaultClient, keyAltName = "demo-data-key") {
  const { ClientEncryption } = await import("mongodb-client-encryption");
  
  const encryption = new ClientEncryption(keyVaultClient, {
    keyVaultNamespace: KEY_VAULT_NAMESPACE,
    kmsProviders: {
      local: { key: LOCAL_MASTER_KEY }
    }
  });

  // Check if key already exists
  const keyVaultColl = keyVaultClient.db("encryption").collection("__keyVault");
  const existingKey = await keyVaultColl.findOne({ keyAltNames: keyAltName });
  
  if (existingKey) {
    return existingKey._id;
  }

  // Create new data encryption key
  const dataKeyId = await encryption.createDataKey("local", {
    keyAltNames: [keyAltName]
  });

  console.log(`Created new data encryption key: ${keyAltName}`);
  return dataKeyId;
}

/**
 * Generates a JSON Schema for automatic field encryption.
 * 
 * @param {Binary} dataKeyId - The data encryption key ID
 */
export function createEncryptionSchema(dataKeyId) {
  return {
    bsonType: "object",
    encryptMetadata: {
      keyId: [dataKeyId]
    },
    properties: {
      ssn: {
        encrypt: {
          bsonType: "string",
          // Deterministic allows equality queries on encrypted field
          algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic"
        }
      },
      creditCard: {
        encrypt: {
          bsonType: "string",
          // Random is more secure but doesn't allow queries
          algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Random"
        }
      },
      email: {
        encrypt: {
          bsonType: "string",
          algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic"
        }
      },
      medicalRecords: {
        encrypt: {
          bsonType: "array",
          algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Random"
        }
      }
    }
  };
}

/**
 * Example: Manual explicit encryption (when you need more control)
 */
export async function encryptValueExplicit(keyVaultClient, value, dataKeyId, algorithm = "AEAD_AES_256_CBC_HMAC_SHA_512-Random") {
  const { ClientEncryption } = await import("mongodb-client-encryption");
  
  const encryption = new ClientEncryption(keyVaultClient, {
    keyVaultNamespace: KEY_VAULT_NAMESPACE,
    kmsProviders: {
      local: { key: LOCAL_MASTER_KEY }
    }
  });

  return encryption.encrypt(value, {
    keyId: dataKeyId,
    algorithm
  });
}

/**
 * Example: Manual explicit decryption
 */
export async function decryptValueExplicit(keyVaultClient, encryptedValue) {
  const { ClientEncryption } = await import("mongodb-client-encryption");
  
  const encryption = new ClientEncryption(keyVaultClient, {
    keyVaultNamespace: KEY_VAULT_NAMESPACE,
    kmsProviders: {
      local: { key: LOCAL_MASTER_KEY }
    }
  });

  return encryption.decrypt(encryptedValue);
}
