// Lightweight shims to safely access reanimated runtime helpers and normalize gradient typing
// Purpose: centralize any-casts so components don't scatter (Animated as any) usage.
import Animated from 'react-native-reanimated';

// Track which SharedValue objects we've already warned about so we don't spam
// the console in development while polling is used as a fallback.
const _warnedSharedValues = typeof WeakSet !== 'undefined' ? new WeakSet<any>() : new Set<any>();

export const withSequenceAny = (...args: any[]) => {
  try {
    return (Animated as any).withSequence
      ? (Animated as any).withSequence(...args)
      : args[args.length - 1];
  } catch (e) {
    return args[args.length - 1];
  }
};

export const interpolateColorAny = (
  value: any,
  inputRange: any,
  outputRange: any,
  colorSpace?: string,
) => {
  try {
    return (Animated as any).interpolateColor
      ? (Animated as any).interpolateColor(value, inputRange, outputRange, colorSpace)
      : outputRange[outputRange.length - 1];
  } catch (e) {
    return outputRange[outputRange.length - 1];
  }
};

export const useAnimatedGestureHandlerAny = (handler: any) => {
  try {
    return (Animated as any).useAnimatedGestureHandler
      ? (Animated as any).useAnimatedGestureHandler(handler)
      : undefined;
  } catch (e) {
    return undefined;
  }
};

// Cast dynamic string[] gradients into the readonly tuple/readonly string[] shape
// expected by expo-linear-gradient's typings. This is intentionally minimal —
// static gradient arrays should be converted to readonly tuples at source where possible.
export const castGradient = (colors: string[] | readonly string[]) => {
  // Intentionally return `any` so callers can pass dynamic arrays to
  // expo-linear-gradient without TypeScript tuple errors. Prefer using
  // readonly tuple literals for static gradients when possible.
  return colors as any;
};

// Attach a listener to a Reanimated SharedValue in a safe way.
// Returns an unsubscribe function. If addListener isn't available at runtime,
// the function returns a noop unsubscribe and logs a warning in development.
export const attachSharedValueListener = (
  sharedValue: any,
  cb: (payload: { value: any }) => void,
  options?: { pollingInterval?: number; suppressWarning?: boolean },
) => {
  try {
    if (sharedValue && typeof sharedValue.addListener === 'function') {
      const id = sharedValue.addListener(cb);
      return () => {
        try {
          if (typeof sharedValue.removeListener === 'function') {
            sharedValue.removeListener(id);
          } else if (typeof sharedValue.remove === 'function') {
            // some runtimes expose remove instead of removeListener
            sharedValue.remove(id);
          }
        } catch {}
      };
    }
  } catch (e) {
    // fallthrough to polling fallback
  }

  // Fallback: poll the value periodically and call the callback when it changes.
  // This keeps behavior functional in JS-only runtimes where addListener isn't exposed.
  const pollingInterval = (options && options.pollingInterval) || 100; // ms
  let lastValue: any;
  try {
    lastValue = sharedValue && 'value' in sharedValue ? sharedValue.value : undefined;
  } catch (e) {
    lastValue = undefined;
  }

  const intervalId = setInterval(() => {
    try {
      const current = sharedValue && 'value' in sharedValue ? sharedValue.value : undefined;
      if (current !== lastValue) {
        lastValue = current;
        try {
          cb({ value: current });
        } catch (e) {}
      }
    } catch (e) {}
  }, pollingInterval) as unknown as number;

  if (__DEV__ && !(options && options.suppressWarning)) {
    try {
      const already = _warnedSharedValues.has(sharedValue);
      if (!already) {
        // eslint-disable-next-line no-console
        console.warn(
          `[reanimated-shims] SharedValue.addListener not available on this runtime. using polling fallback (${pollingInterval}ms) to detect changes.`,
        );
        try {
          _warnedSharedValues.add(sharedValue);
        } catch (e) {
          // ignore if adding to WeakSet fails
        }
      }
    } catch (e) {
      // ignore any WeakSet lookup errors
    }
  }

  return () => {
    try {
      clearInterval(intervalId);
    } catch (e) {}
  };
};

export default {
  withSequenceAny,
  interpolateColorAny,
  useAnimatedGestureHandlerAny,
  castGradient,
  attachSharedValueListener,
};
