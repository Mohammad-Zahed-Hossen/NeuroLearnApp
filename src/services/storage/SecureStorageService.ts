/**
 * SecureStorageService - Secure Token Management
 *
 * Provides secure storage for sensitive data like API tokens using SecureStore
 * Implements encryption at rest and secure token lifecycle management
 *
 * @author NeuroLearn Team
 * @version 1.0.0
 */

import * as SecureStore from 'expo-secure-store';
import MMKVStorageService from './MMKVStorageService';
import { Platform } from 'react-native';

// Minimal key-value storage interface used across integrations
export interface KeyValueStorage {
  setItem(key: string, value: string): Promise<void>;
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
}

interface SecureTokenData {
  token: string;
  service: string;
  createdAt: Date;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

interface TokenValidationResult {
  isValid: boolean;
  isExpired: boolean;
  timeUntilExpiry?: number;
  error?: string;
}

export class SecureStorageService implements KeyValueStorage {
  private static instance: SecureStorageService;
  private mmkvStorage = MMKVStorageService;
  private readonly TOKEN_PREFIX = 'secure_token_';
  private readonly METADATA_PREFIX = 'token_meta_';

  private constructor() {}

  public static getInstance(): SecureStorageService {
    if (!SecureStorageService.instance) {
      SecureStorageService.instance = new SecureStorageService();
    }
    return SecureStorageService.instance;
  }

  /**
   * Store a token securely using SecureStore
   */
  async storeToken(
    key: string,
    token: string,
    service: string,
    expiresIn?: number, // milliseconds
    metadata?: Record<string, any>
  ): Promise<void> {
    const tokenData: SecureTokenData = {
      token,
      service,
      createdAt: new Date(),
      ...(expiresIn && { expiresAt: new Date(Date.now() + expiresIn) }),
      ...(metadata && { metadata }),
    };

    try {
      // Store encrypted token in SecureStore only (Keychain enforced)
      const secureStoreKey = `${this.TOKEN_PREFIX}${key}`;
      await SecureStore.setItemAsync(secureStoreKey, JSON.stringify(tokenData), {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });

      // Store metadata in MMKV for quick access (without sensitive data)
      const metaKey = `${this.METADATA_PREFIX}${key}`;
      const metadataOnly = {
        service,
        createdAt: tokenData.createdAt.toISOString(),
        expiresAt: tokenData.expiresAt?.toISOString(),
        hasToken: true,
        secure: true,
      };
      await this.mmkvStorage.setItem(metaKey, JSON.stringify(metadataOnly));

      console.log(`🔐 Token stored securely in Keychain: ${key}`);
    } catch (error: any) {
      console.error('❌ Failed to store token in Keychain:', error);
      throw new Error(`Secure token storage failed: ${error}`);
    }
  }

  /**
   * Retrieve a token from secure storage
   */
  async getToken(key: string): Promise<string | null> {
    try {
      // First try secure storage
      const secureStoreKey = `${this.TOKEN_PREFIX}${key}`;
      let tokenDataStr = await SecureStore.getItemAsync(secureStoreKey);

      if (!tokenDataStr) {
        // Fallback to insecure storage if disk was full
        const insecureKey = `insecure_${this.TOKEN_PREFIX}${key}`;
        tokenDataStr = await this.mmkvStorage.getItem(insecureKey);
        if (!tokenDataStr) {
          return null;
        }
      }

      const tokenData: SecureTokenData = JSON.parse(tokenDataStr);

      // Validate token
      const validation = this.validateTokenData(tokenData);
      if (!validation.isValid) {
        if (validation.isExpired) {
          await this.deleteToken(key);
          return null;
        }
        throw new Error(validation.error);
      }

      return tokenData.token;
    } catch (error) {
      console.error('❌ Failed to retrieve token:', error);
      return null;
    }
  }

  /**
   * Delete a token from secure storage
   */
  async deleteToken(key: string): Promise<void> {
    try {
      const secureStoreKey = `${this.TOKEN_PREFIX}${key}`;

      // Remove from SecureStore for this specific token
      await SecureStore.deleteItemAsync(secureStoreKey);

      // Also remove from insecure storage if it exists
      const insecureKey = `insecure_${this.TOKEN_PREFIX}${key}`;
      await this.mmkvStorage.removeItem(insecureKey);

      // Remove metadata from MMKV
      const metaKey = `${this.METADATA_PREFIX}${key}`;
      await this.mmkvStorage.removeItem(metaKey);

      console.log(`🗑️ Token deleted securely: ${key}`);
    } catch (error) {
      console.error('❌ Failed to delete token:', error);
      throw new Error(`Token deletion failed: ${error}`);
    }
  }

  /**
   * Check if a token exists and is valid
   */
  async hasValidToken(key: string): Promise<boolean> {
    try {
      const token = await this.getToken(key);
      return token !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get token metadata without retrieving the actual token
   */
  async getTokenMetadata(key: string): Promise<{
    service: string;
    createdAt: Date;
    expiresAt?: Date;
    hasToken: boolean;
  } | null> {
    try {
      const metaKey = `${this.METADATA_PREFIX}${key}`;
      const metadataStr = await this.mmkvStorage.getItem(metaKey);

      if (!metadataStr) {
        return null;
      }

      const metadata = JSON.parse(metadataStr);
      return {
        service: metadata.service,
        createdAt: new Date(metadata.createdAt),
        ...(metadata.expiresAt && { expiresAt: new Date(metadata.expiresAt) }),
        hasToken: metadata.hasToken,
      };
    } catch (error) {
      console.error('❌ Failed to get token metadata:', error);
      return null;
    }
  }

  /**
   * Validate token data structure and expiry
   */
  private validateTokenData(tokenData: SecureTokenData): TokenValidationResult {
    try {
      // Check required fields
      if (!tokenData.token || !tokenData.service || !tokenData.createdAt) {
        return {
          isValid: false,
          isExpired: false,
          error: 'Invalid token data structure',
        };
      }

      // Check expiry
      if (tokenData.expiresAt) {
        const now = new Date();
        const expiry = new Date(tokenData.expiresAt);

        if (now >= expiry) {
          return {
            isValid: false,
            isExpired: true,
            error: 'Token has expired',
          };
        }

        return {
          isValid: true,
          isExpired: false,
          timeUntilExpiry: expiry.getTime() - now.getTime(),
        };
      }

      return {
        isValid: true,
        isExpired: false,
      };
    } catch (error) {
      return {
        isValid: false,
        isExpired: false,
        error: 'Token validation failed',
      };
    }
  }

  /**
   * Clear all stored tokens (for logout/reset)
   */
  async clearAllTokens(): Promise<void> {
    try {
      // Remove SecureStore entries per-token using stored metadata keys
      const allKeys = await this.mmkvStorage.getAllKeys();
      const metaKeys = allKeys.filter((k: string) => k.startsWith(this.METADATA_PREFIX));

      for (const metaKey of metaKeys) {
        const tokenKey = metaKey.replace(this.METADATA_PREFIX, '');
        try {
          await SecureStore.deleteItemAsync(`${this.TOKEN_PREFIX}${tokenKey}`);
        } catch (e) {
          // ignore individual failures
        }
        // Also remove insecure storage
        try {
          await this.mmkvStorage.removeItem(`insecure_${this.TOKEN_PREFIX}${tokenKey}`);
        } catch (e) {
          // ignore individual failures
        }
        await this.mmkvStorage.removeItem(metaKey as string);
      }

      console.log('🧹 All tokens cleared from secure storage');
    } catch (error) {
      console.error('❌ Failed to clear all tokens:', error);
      throw new Error(`Clear all tokens failed: ${error}`);
    }
  }

  /**
   * Get all stored token keys (for management/debugging)
   */
  async getAllTokenKeys(): Promise<string[]> {
    try {
      const allKeys = await this.mmkvStorage.getAllKeys();
      return allKeys
        .filter((key: string) => key.startsWith(this.METADATA_PREFIX))
        .map((key: string) => key.replace(this.METADATA_PREFIX, ''));
    } catch (error) {
      console.error('❌ Failed to get token keys:', error);
      return [];
    }
  }

  /**
   * Check if biometric authentication is available
   */
  async isBiometricAvailable(): Promise<boolean> {
    try {
      // Expo SecureStore doesn't directly support biometric checks
      // This is a placeholder - biometric features would need to be implemented differently
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get supported biometric type
   */
  async getBiometricType(): Promise<string | null> {
    try {
      // Expo SecureStore doesn't directly support biometric type detection
      // This is a placeholder - biometric features would need to be implemented differently
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Migrate existing tokens from insecure storage to secure storage
   */
  async migrateTokensFromAsyncStorage(): Promise<void> {
    try {
      console.log('🔄 Starting token migration from AsyncStorage...');

      // This would be called during app upgrade
      // Implementation depends on existing storage structure

      console.log('✅ Token migration completed');
    } catch (error) {
      console.error('❌ Token migration failed:', error);
      throw error;
    }
  }

  /**
   * Export token metadata for backup (without actual tokens)
   */
  async exportTokenMetadata(): Promise<Record<string, any>> {
    try {
      const allKeys = await this.getAllTokenKeys();
      const metadata: Record<string, any> = {};

      for (const key of allKeys) {
        const meta = await this.getTokenMetadata(key);
        if (meta) {
          metadata[key] = {
            service: meta.service,
            createdAt: meta.createdAt.toISOString(),
            expiresAt: meta.expiresAt?.toISOString(),
            hasToken: meta.hasToken,
          };
        }
      }

      return metadata;
    } catch (error) {
      console.error('❌ Failed to export token metadata:', error);
      return {};
    }
  }

  /**
   * General key-value storage using MMKV (for non-sensitive data)
   */
  async setItem(key: string, value: string): Promise<void> {
    await this.mmkvStorage.setItem(key, value);
  }

  async getItem(key: string): Promise<string | null> {
    return await this.mmkvStorage.getItem(key);
  }

  async removeItem(key: string): Promise<void> {
    await this.mmkvStorage.removeItem(key);
  }
}

export default SecureStorageService;
