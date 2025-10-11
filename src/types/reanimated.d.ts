declare module 'react-native-reanimated' {
    import { ComponentType } from 'react';
    import { ViewProps } from 'react-native';

    export interface SharedValue<T> {
      value: T;
      // optional listener helpers (some code uses addListener/removeListener)
      addListener?: (cb: (payload: any) => any) => any;
      removeListener?: (id: any) => void;
    }

  export const useSharedValue: <T>(value: T) => SharedValue<T>;
  export const useAnimatedStyle: (updater: () => any) => any;
  export const useAnimatedGestureHandler: (handlers: any) => any;
  export const withSpring: (value: number, config?: any, callback?: (finished: boolean) => void) => any;
  export const withTiming: (value: number, config?: any, callback?: (finished: boolean) => void) => any;
  export const withRepeat: (animation: any, numberOfRepetitions: number, reverse: boolean) => any;
  export const withDelay: (delayMs: number, animation: any) => any;
  export const withSequence: (...animations: any[]) => any;
  export const runOnJS: <T extends (...args: any[]) => any>(fn: T) => T;
  export const interpolate: (value: number, range: [number, number], output: [number, number]) => number;
  export const interpolateColor: (value: number, inputRange: number[], outputRange: string[]) => string;
  export const useDerivedValue: <T>(updater: () => T, dependencies?: any[]) => SharedValue<T>;

    const Animated: {
      View: ComponentType<ViewProps>;
      createAnimatedComponent: <P>(component: ComponentType<P>) => ComponentType<P>;
    };

    export default Animated;
  }

  declare namespace Animated {
    interface SharedValue<T> {
      value: T;
    }
  }
