/**
 * RetryHandler - Implements exponential backoff retry logic for API calls
 *
 * Handles transient failures with configurable retry policies
 * Includes jitter to prevent thundering herd problems
 */

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
  jitter: boolean;
  retryableErrors?: (error: any) => boolean;
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: any;
  attempts: number;
  totalDelay: number;
}

export class RetryHandler {
  constructor(private config: RetryConfig) {}

  /**
   * Execute a function with retry logic
   */
  async execute<T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<RetryResult<T>> {
    let lastError: any;
    let totalDelay = 0;

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        const result = await operation();
        return {
          success: true,
          result,
          attempts: attempt,
          totalDelay
        };
      } catch (error) {
        lastError = error;

        // Check if error is retryable
        if (!this.isRetryableError(error)) {
          console.warn(`❌ Non-retryable error on attempt ${attempt}${context ? ` (${context})` : ''}:`, error);
          break;
        }

        // Don't retry on last attempt
        if (attempt === this.config.maxAttempts) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = this.calculateDelay(attempt);
        totalDelay += delay;

        console.warn(`⚠️ Attempt ${attempt} failed${context ? ` (${context})` : ''}, retrying in ${delay}ms:`, error);

        // Wait before retry
        await this.sleep(delay);
      }
    }

    return {
      success: false,
      error: lastError,
      attempts: this.config.maxAttempts,
      totalDelay
    };
  }

  /**
   * Execute with custom retry condition
   */
  async executeWithCondition<T>(
    operation: () => Promise<T>,
    shouldRetry: (error: any, attempt: number) => boolean,
    context?: string
  ): Promise<RetryResult<T>> {
    let lastError: any;
    let totalDelay = 0;

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        const result = await operation();
        return {
          success: true,
          result,
          attempts: attempt,
          totalDelay
        };
      } catch (error) {
        lastError = error;

        // Check custom retry condition
        if (!shouldRetry(error, attempt)) {
          console.warn(`❌ Custom retry condition failed on attempt ${attempt}${context ? ` (${context})` : ''}:`, error);
          break;
        }

        // Don't retry on last attempt
        if (attempt === this.config.maxAttempts) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = this.calculateDelay(attempt);
        totalDelay += delay;

        console.warn(`⚠️ Attempt ${attempt} failed${context ? ` (${context})` : ''}, retrying in ${delay}ms:`, error);

        // Wait before retry
        await this.sleep(delay);
      }
    }

    return {
      success: false,
      error: lastError,
      attempts: this.config.maxAttempts,
      totalDelay
    };
  }

  /**
   * Calculate delay for the given attempt with exponential backoff and optional jitter
   */
  private calculateDelay(attempt: number): number {
    const exponentialDelay = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt - 1);
    const delay = Math.min(exponentialDelay, this.config.maxDelay);

    if (this.config.jitter) {
      // Add random jitter (±25% of delay)
      const jitterRange = delay * 0.25;
      return delay + (Math.random() - 0.5) * 2 * jitterRange;
    }

    return delay;
  }

  /**
   * Check if an error is retryable based on configuration
   */
  private isRetryableError(error: any): boolean {
    if (this.config.retryableErrors) {
      return this.config.retryableErrors(error);
    }

    // Default retryable errors
    if (error?.code) {
      // Network errors
      const retryableCodes = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED', 'EPIPE'];
      if (retryableCodes.includes(error.code)) {
        return true;
      }

      // HTTP status codes
      if (typeof error.code === 'number') {
        return error.code >= 500 || error.code === 429; // Server errors or rate limiting
      }
    }

    // Check response status for axios/fetch errors
    if (error?.response?.status) {
      return error.response.status >= 500 || error.response.status === 429;
    }

    // Check status for fetch Response objects
    if (error?.status) {
      return error.status >= 500 || error.status === 429;
    }

    // Default to not retrying unknown errors
    return false;
  }

  /**
   * Sleep for the specified number of milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Default retry configurations for different use cases
 */
export const RetryConfigs = {
  // Fast retries for quick operations
  FAST: {
    maxAttempts: 3,
    baseDelay: 500,
    maxDelay: 5000,
    backoffMultiplier: 2,
    jitter: true
  } as RetryConfig,

  // Standard retries for normal API calls
  STANDARD: {
    maxAttempts: 5,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitter: true
  } as RetryConfig,

  // Slow retries for heavy operations
  SLOW: {
    maxAttempts: 3,
    baseDelay: 2000,
    maxDelay: 60000,
    backoffMultiplier: 2,
    jitter: true
  } as RetryConfig,

  // Aggressive retries for critical operations
  AGGRESSIVE: {
    maxAttempts: 10,
    baseDelay: 500,
    maxDelay: 120000,
    backoffMultiplier: 1.5,
    jitter: true
  } as RetryConfig
};

/**
 * Create a retry handler with default configuration
 */
export function createRetryHandler(config: Partial<RetryConfig> = {}): RetryHandler {
  return new RetryHandler({
    maxAttempts: 5,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitter: true,
    ...config
  });
}
