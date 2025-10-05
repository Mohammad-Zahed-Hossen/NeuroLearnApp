import React, { useEffect, useState } from 'react';
import { View, Platform, ViewProps } from 'react-native';

type BlurProps = ViewProps & {
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
};

/**
 * BlurViewWrapper
 * - Dynamically imports `expo-blur` at runtime and uses its `BlurView` when available.
 * - Falls back to a translucent View if the native module is not available (prevents native runtime crashes in Expo Go).
 * - Safe to import at top-level across the app.
 */
const BlurViewWrapper: React.FC<BlurProps> = ({
  children,
  style,
  intensity = 50,
  tint = 'default',
  ...rest
}) => {
  const [BlurComponent, setBlurComponent] =
    useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    let mounted = true;
    // Try dynamic import so we don't crash if expo-blur is not available in the runtime
    import('expo-blur')
      .then((mod) => {
        if (mounted && mod && mod.BlurView)
          setBlurComponent(() => mod.BlurView);
      })
      .catch(() => {
        // ignore - will fallback to translucent View
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (BlurComponent) {
    // @ts-ignore - BlurView typing is included in expo-blur when available
    return (
      <BlurComponent style={style} intensity={intensity} tint={tint} {...rest}>
        {children}
      </BlurComponent>
    );
  }

  // Fallback: translucent view that visually approximates blur without native dependency
  return (
    <View
      style={[{ backgroundColor: 'rgba(255,255,255,0.6)' }, style]}
      {...rest}
    >
      {children}
    </View>
  );
};

export default BlurViewWrapper;
