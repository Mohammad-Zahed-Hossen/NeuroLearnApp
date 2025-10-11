/**
 * TypeSafeHelpers - small utilities to safely extract error messages
 * and provide a simple orchestrator error wrapper.
 */
export const tsGetErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) return String((error as any).message);
  return 'Unknown error occurred';
};

export const tsSafeErrorReturn = (error: unknown) => ({ success: false, error: tsGetErrorMessage(error) });

export const tsHandleOrchestrationError = async (
  operation: () => Promise<any>,
  context = 'orchestrator'
): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    // Minimal logging - orchestrators may replace with Logger
    // eslint-disable-next-line no-console
    console.error(`${context} error:`, error);
    return tsSafeErrorReturn(error);
  }
};
// Re-export canonical ErrorHandler utilities (named exports)
import ErrorHandler from './ErrorHandler';
export const getErrorMessage = ErrorHandler.getErrorMessage;
export const getErrorStack = ErrorHandler.getErrorStack;

