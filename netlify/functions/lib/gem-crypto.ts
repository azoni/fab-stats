/**
 * AES-256-GCM encryption for GEM credentials.
 * Key is stored in GEM_ENCRYPTION_KEY env var (64-char hex = 256 bits).
 */
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_VERSION = 1;

function getKey(): Buffer {
  const hex = process.env.GEM_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("GEM_ENCRYPTION_KEY env var must be a 64-char hex string");
  }
  return Buffer.from(hex, "hex");
}

export interface EncryptedData {
  ciphertext: string; // base64
  iv: string;         // base64
  authTag: string;    // base64
  keyVersion: number;
}

export function encrypt(plaintext: string): EncryptedData {
  const key = getKey();
  const iv = randomBytes(12); // 96-bit IV for GCM
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: encrypted,
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    keyVersion: KEY_VERSION,
  };
}

export function decrypt(data: EncryptedData): string {
  const key = getKey();
  const iv = Buffer.from(data.iv, "base64");
  const authTag = Buffer.from(data.authTag, "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(data.ciphertext, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
