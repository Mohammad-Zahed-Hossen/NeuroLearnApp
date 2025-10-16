import { Linking } from 'react-native';
import { TodoistOAuthService } from './TodoistOAuthService';
import { NotionOAuthService } from './NotionOAuthService';

export class OAuthCallbackHandler {
  private static instance: OAuthCallbackHandler;
  private listeners: Map<string, (result: any) => void> = new Map();
  private boundDeepLinkHandler: ((event: { url: string }) => void) | null = null;
  // Subscription returned by Linking.addEventListener (platform-dependent shape)
  private deepLinkSubscription: { remove?: () => void } | null = null;

  private constructor() {
    this.setupDeepLinkListener();
  }

  public static getInstance(): OAuthCallbackHandler {
    if (!OAuthCallbackHandler.instance) {
      OAuthCallbackHandler.instance = new OAuthCallbackHandler();
    }
    return OAuthCallbackHandler.instance;
  }

  /**
   * Register a callback listener for OAuth results
   */
  public registerListener(service: string, callback: (result: any) => void): void {
    this.listeners.set(service, callback);
  }

  /**
   * Unregister a callback listener
   */
  public unregisterListener(service: string): void {
    this.listeners.delete(service);
  }

  /**
   * Setup deep link listener for OAuth callbacks
   */
  private setupDeepLinkListener(): void {
    this.boundDeepLinkHandler = this.handleDeepLink.bind(this);
    // Linking.addEventListener returns a subscription object on many RN versions.
    // Capture it so we can remove the listener reliably on cleanup.
    try {
      // cast to any to avoid mismatched type issues across RN versions
      this.deepLinkSubscription = (Linking as any).addEventListener('url', this.boundDeepLinkHandler);
    } catch (e) {
      // Fallback: some RN typings/platforms may expect addEventListener to be present without returning subscription
      try { (Linking as any).addEventListener('url', this.boundDeepLinkHandler); } catch (_) { /* ignore */ }
    }

    // Handle app launch from deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        try { this.handleDeepLink({ url }); } catch (e) { console.error('Initial deep link handling failed', e); }
      }
    }).catch(e => console.warn('Failed to get initial URL for deep link', e));
  }

  /**
   * Handle incoming deep link URLs
   */
  private async handleDeepLink(event: { url: string }): Promise<void> {
    const { url } = event;

    try {
      // Normalize and accept multiple Notion callback URL formats
      if (url.startsWith('neurolearn://oauth/todoist')) {
        await this.handleTodoistCallback(url);
      } else if (
        url.startsWith('neurolearn://oauth/notion') ||
        url.startsWith('neurolearn://notion/callback')
      ) {
        // For neurolearn://notion/callback?code=... the Notion web redirect uses this form
        await this.handleNotionCallback(url);
      }
    } catch (error) {
      console.error('OAuth callback error:', error);
      // Notify any listener for that provider that an error occurred
      try {
        const provider = url.includes('todoist') ? 'todoist' : (url.includes('notion') ? 'notion' : null);
        if (provider) {
          const listener = this.listeners.get(provider);
          if (listener) {
            listener({ success: false, error: String(error), recoverable: true });
          }
        }
      } catch (e) {
        // nothing else to do
      }
    }
  }

  /**
   * Handle Todoist OAuth callback
   */
  private async handleTodoistCallback(url: string): Promise<void> {
    const todoistOAuth = TodoistOAuthService.getInstance();
    try {
      const result = await todoistOAuth.handleOAuthCallback(url);
      const listener = this.listeners.get('todoist');
      if (listener) listener(result);
    } catch (error) {
      console.error('Todoist OAuth handling failed:', error);
      const listener = this.listeners.get('todoist');
      if (listener) listener({ success: false, error: String(error), recoverable: false });
    }
  }

  /**
   * Handle Notion OAuth callback
   */
  private async handleNotionCallback(url: string): Promise<void> {
    const notionOAuth = NotionOAuthService.getInstance();
    try {
      const result = await notionOAuth.handleOAuthCallback(url);
      const listener = this.listeners.get('notion');
      if (listener) listener(result);
    } catch (error) {
      console.error('Notion OAuth handling failed:', error);
      const listener = this.listeners.get('notion');
      if (listener) listener({ success: false, error: String(error), recoverable: false });
    }
  }

  /**
   * Cleanup listeners
   */
  public cleanup(): void {
    this.listeners.clear();
    // Remove deep link subscription if available
    try {
      if (this.deepLinkSubscription && typeof this.deepLinkSubscription.remove === 'function') {
        this.deepLinkSubscription.remove();
      } else if (this.boundDeepLinkHandler && (Linking as any).removeEventListener) {
        // older RN versions
        try { (Linking as any).removeEventListener('url', this.boundDeepLinkHandler); } catch (_) {}
      }
    } catch (e) {
      // best-effort cleanup; nothing more to do
    } finally {
      this.boundDeepLinkHandler = null;
      this.deepLinkSubscription = null;
    }
  }
}
