declare module 'lottie-react-native' {
  import React from 'react';
  import { StyleProp, ViewStyle } from 'react-native';

  export interface LottieViewProps {
    source: string | { uri: string } | object;
    progress?: number;
    speed?: number;
    duration?: number;
    loop?: boolean;
    autoPlay?: boolean;
    autoSize?: boolean;
    style?: StyleProp<ViewStyle>;
    onAnimationFinish?: (isCancelled: boolean) => void;
    [key: string]: any;
  }

  const LottieView: React.ComponentClass<LottieViewProps>;

  export default LottieView;
}