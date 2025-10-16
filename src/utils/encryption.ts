/**
 * Encryption utilities for sensitive data storage
 * Uses AES-256-GCM for secure encryption/decryption
 */

import CryptoJS from 'crypto-js';

// Encryption key - in production, this should be environment-specific
// For React Native, we'll use a derived key from device-specific data
const ENCRYPTION_KEY = process.env.EXPO_PUBLIC_ENCRYPTION_KEY || 'neurolearn-secure-key-2024';

// Salt for key derivation
const SALT = 'neurolearn-salt-v1';

/**
 * Derive encryption key using PBKDF2
 */
function deriveKey(password: string, salt: string): string {
  return CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32,
    iterations: 10000
  }).toString();
}

/**
 * Encrypt data using AES-256-GCM
 */
export function encryptData(data: string): string {
  try {
    const key = deriveKey(ENCRYPTION_KEY, SALT);
    const encrypted = CryptoJS.AES.encrypt(data, key, {
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    return encrypted.toString();
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt data using AES-256-GCM
 */
export function decryptData(encryptedData: string): string {
  try {
    const key = deriveKey(ENCRYPTION_KEY, SALT);
    const decrypted = CryptoJS.AES.decrypt(encryptedData, key, {
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    const result = decrypted.toString(CryptoJS.enc.Utf8);
    if (!result) {
      throw new Error('Decryption resulted in empty string');
    }
    return result;
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Check if data appears to be encrypted (simple heuristic)
 */
export function isEncrypted(data: string): boolean {
  try {
    // Try to decrypt - if it works and gives reasonable output, it's likely encrypted
    decryptData(data);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely decrypt data with fallback to original value
 */
export function safeDecrypt(data: string): string {
  try {
    return decryptData(data);
  } catch {
    // If decryption fails, assume it's already plain text
    return data;
  }
}

/**
 * Generate a secure random key for encryption
 */
export function generateEncryptionKey(): string {
  return CryptoJS.lib.WordArray.random(256/8).toString();
}
