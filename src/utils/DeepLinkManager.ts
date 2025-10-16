import { Linking } from 'react-native';
import { OAuthCallbackHandler } from '../services/integrations/OAuthCallbackHandler';

export class DeepLinkManager {
  private static instance: DeepLinkManager;
  private oauthHandler: OAuthCallbackHandler;

  private constructor() {
    this.oauthHandler = OAuthCallbackHandler.getInstance();
  }

  public static getInstance(): DeepLinkManager {
    if (!DeepLinkManager.instance) {
      DeepLinkManager.instance = new DeepLinkManager();
    }
    return DeepLinkManager.instance;
  }

  /**
   * Initialize deep link handling
   */
  public initialize(): void {
    // Handle app launch from deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        this.handleDeepLink(url);
      }
    });

    // Handle deep links while app is running
    const subscription = Linking.addEventListener('url', (event) => {
      this.handleDeepLink(event.url);
    });

    // Store subscription for cleanup
    (this as any).linkingSubscription = subscription;
  }

  /**
   * Handle incoming deep link
   */
  private handleDeepLink(url: string): void {
    console.log('Deep link received:', url);

    // Handle OAuth callbacks
    if (url.includes('oauth')) {
      // OAuth handler will process the callback
      return;
    }

    // Handle other deep links here
    // e.g., navigation to specific screens
  }

  /**
   * Cleanup deep link listeners
   */
  public cleanup(): void {
    if ((this as any).linkingSubscription) {
      (this as any).linkingSubscription.remove();
    }
    this.oauthHandler.cleanup();
  }
}