import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';

// A tiny, safe fallback for gradient backgrounds that avoids importing
// native gradient modules at runtime. Use this when you can't rely on the
// native view being registered (e.g., in certain Expo/bare setups).

interface GradientFallbackProps extends ViewProps {
  colors?: string[]; // accepts hex colors like ['#fff', '#000']
  style?: any;
}

const GradientFallback: React.FC<GradientFallbackProps> = ({
  colors = ['transparent', 'transparent'],
  style,
  children,
  ...rest
}) => {
  // Very small visual approximation: use the first color as background and
  // overlay a semi-transparent layer with the second color. Keep it cheap.
  const backgroundColor = colors[0] || 'transparent';
  const overlayColor = colors[1] || 'transparent';

  return (
    <View style={[{ backgroundColor }, style]} {...rest}>
      {overlayColor !== 'transparent' ? (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: overlayColor, opacity: 0.18 },
          ]}
        />
      ) : null}
      {children}
    </View>
  );
};

export default GradientFallback;
