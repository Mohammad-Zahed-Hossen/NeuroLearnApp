import { DeepLinkManager } from './DeepLinkManager';
import { OAuthCallbackHandler } from '../services/integrations/OAuthCallbackHandler';

/**
 * Initialize OAuth system for the app
 * Call this once during app startup
 */
export const initializeOAuth = (): void => {
  try {
    // Initialize deep link handling
    const deepLinkManager = DeepLinkManager.getInstance();
    deepLinkManager.initialize();

    // Initialize OAuth callback handler
    const oauthHandler = OAuthCallbackHandler.getInstance();
    
    console.log('✅ OAuth system initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize OAuth system:', error);
  }
};

/**
 * Cleanup OAuth system
 * Call this during app shutdown or logout
 */
export const cleanupOAuth = (): void => {
  try {
    const deepLinkManager = DeepLinkManager.getInstance();
    deepLinkManager.cleanup();

    const oauthHandler = OAuthCallbackHandler.getInstance();
    oauthHandler.cleanup();

    console.log('✅ OAuth system cleaned up successfully');
  } catch (error) {
    console.error('❌ Failed to cleanup OAuth system:', error);
  }
};