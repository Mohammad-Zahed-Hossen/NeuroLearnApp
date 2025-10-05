import React from 'react';
import { Path as SkiaPath, PathProps } from '@shopify/react-native-skia';
import Animated from 'react-native-reanimated';

interface AnimatedPathProps extends PathProps {
  animationTime: Animated.SharedValue<number>;
}

export const AnimatedPath: React.FC<AnimatedPathProps> = ({ animationTime, ...props }) => {
  // For now, just render a regular path
  // Animation can be added later with proper reanimated version
  return <SkiaPath {...props} />;
};
