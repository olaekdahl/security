import crypto from "crypto";

/**
 * Application-Level Field Encryption Demo
 * 
 * This module demonstrates manual field-level encryption for sensitive data.
 * In production, consider using MongoDB's native CSFLE (Client-Side Field Level Encryption)
 * with a proper Key Management Service (KMS).
 * 
 * This demo uses AES-256-GCM for authenticated encryption.
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Derives a 256-bit key from a password/secret.
 * In production, use a KMS (AWS KMS, Azure Key Vault, HashiCorp Vault, etc.)
 */
export function deriveKey(secret) {
  return crypto.scryptSync(secret, "mongo-demo-salt", 32);
}

/**
 * Encrypts a string value using AES-256-GCM.
 * Returns a base64 string containing: IV + AuthTag + Ciphertext
 */
export function encryptField(plaintext, key) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const authTag = cipher.getAuthTag();
  
  // Pack: IV (16) + AuthTag (16) + Ciphertext
  const combined = Buffer.concat([
    iv,
    authTag,
    Buffer.from(encrypted, "hex")
  ]);
  
  return combined.toString("base64");
}

/**
 * Decrypts a value encrypted with encryptField().
 * Returns the original plaintext string.
 */
export function decryptField(encryptedBase64, key) {
  const combined = Buffer.from(encryptedBase64, "base64");
  
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(ciphertext, undefined, "utf8");
  decrypted += decipher.final("utf8");
  
  return decrypted;
}

/**
 * Encrypts an object's sensitive fields.
 * @param {Object} doc - The document to encrypt
 * @param {string[]} fields - Array of field names to encrypt
 * @param {Buffer} key - Encryption key
 * @returns {Object} Document with specified fields encrypted
 */
export function encryptDocument(doc, fields, key) {
  const result = { ...doc };
  for (const field of fields) {
    if (result[field] !== undefined && result[field] !== null) {
      result[field] = encryptField(String(result[field]), key);
      // Mark as encrypted for demo visibility
      result[`_${field}_encrypted`] = true;
    }
  }
  return result;
}

/**
 * Decrypts an object's encrypted fields.
 * @param {Object} doc - The document to decrypt
 * @param {string[]} fields - Array of field names to decrypt
 * @param {Buffer} key - Encryption key
 * @returns {Object} Document with specified fields decrypted
 */
export function decryptDocument(doc, fields, key) {
  const result = { ...doc };
  for (const field of fields) {
    if (result[field] !== undefined && result[`_${field}_encrypted`]) {
      result[field] = decryptField(result[field], key);
      delete result[`_${field}_encrypted`];
    }
  }
  return result;
}

/**
 * Hashes a password using scrypt (for secure storage, not encryption).
 * Use this instead of storing plaintext or reversibly encrypted passwords.
 */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verifies a password against a stored hash.
 */
export function verifyPassword(password, storedHash) {
  const [salt, hash] = storedHash.split(":");
  const testHash = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(testHash, "hex"));
}
