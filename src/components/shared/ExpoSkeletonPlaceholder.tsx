import React from 'react';
import { View, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const WINDOW_WIDTH = Dimensions.get('window').width;

interface SkeletonPlaceholderProps {
  children: React.ReactNode;
  enabled?: boolean;
  backgroundColor?: string;
  highlightColor?: string;
  speed?: number;
  direction?: 'right' | 'left';
  borderRadius?: number;
  shimmerWidth?: number;
}

interface SkeletonItemProps {
  children?: React.ReactNode;
  style?: any;
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
}

const SkeletonPlaceholder: React.FC<SkeletonPlaceholderProps> = ({
  children,
  enabled = true,
  backgroundColor = '#E1E9EE',
  highlightColor = '#F2F8FC',
  speed = 800,
  direction = 'right',
  borderRadius,
  shimmerWidth,
}) => {
  const [layout, setLayout] = React.useState<{ width: number; height: number } | null>(null);
  const animatedValueRef = React.useRef(new Animated.Value(0));
  const isAnimationReady = Boolean(speed && layout?.width && layout?.height);

  React.useEffect(() => {
    if (!isAnimationReady) return;
    const loop = Animated.loop(
      Animated.timing(animatedValueRef.current, {
        toValue: 1,
        duration: speed,
        easing: Easing.ease,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [isAnimationReady, speed]);

  const animatedGradientStyle = React.useMemo(() => {
    const animationWidth = WINDOW_WIDTH + (shimmerWidth || 0);
    return {
      ...StyleSheet.absoluteFillObject,
      flexDirection: 'row' as const,
      transform: [
        {
          translateX: animatedValueRef.current.interpolate({
            inputRange: [0, 1],
            outputRange: direction === 'right'
              ? [-animationWidth, animationWidth]
              : [animationWidth, -animationWidth],
          }),
        },
      ],
    };
  }, [direction, shimmerWidth]);

  const placeholders = React.useMemo(() => {
    if (!enabled) return null;
    return (
      <View style={styles.placeholderContainer}>
        {transformToPlaceholder(children, backgroundColor, borderRadius)}
      </View>
    );
  }, [backgroundColor, children, borderRadius, enabled]);

  const transparentColor = React.useMemo(() => getTransparentColor(highlightColor.replace(/ /g, '')), [highlightColor]);

  if (!enabled || !placeholders) return <>{children}</>;

  if (!layout?.width || !layout?.height) {
    return (
      <View onLayout={(event) => setLayout(event.nativeEvent.layout)}>
        {placeholders}
      </View>
    );
  }

  return (
    <View style={{ height: layout.height, width: layout.width, overflow: 'hidden' }}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor }]} />
      {placeholders}
      {isAnimationReady && highlightColor !== undefined && transparentColor !== undefined && (
        <Animated.View style={animatedGradientStyle}>
          <LinearGradient
            colors={[transparentColor, highlightColor, transparentColor]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ width: shimmerWidth || WINDOW_WIDTH, height: layout.height }}
          />
        </Animated.View>
      )}
    </View>
  );
};

const Item: React.FC<SkeletonItemProps> = ({ children, style, ...props }) => (
  <View style={[style, props]}>{children}</View>
);

// Define the component with Item property
interface SkeletonPlaceholderComponent extends React.FC<SkeletonPlaceholderProps> {
  Item: typeof Item;
}

const SkeletonPlaceholderWithItem: SkeletonPlaceholderComponent = SkeletonPlaceholder as any;
SkeletonPlaceholderWithItem.Item = Item;

export default SkeletonPlaceholderWithItem;

const transformToPlaceholder = (rootElement: React.ReactNode, backgroundColor: string, radius?: number): React.ReactNode => {
  if (!rootElement) return null;
  return React.Children.map(rootElement, (element, index) => {
    if (!element || typeof element !== 'object' || !('props' in element)) return element;

    const props = (element as any).props;
    const style = props.style;
    const borderRadius = props.borderRadius || style?.borderRadius || radius;
    const width = props.width || style?.width;
    const height = props.height || style?.height || props.lineHeight || style?.lineHeight || props.fontSize || style?.fontSize;

    const isPlaceholder = !props.children ||
      typeof props.children === 'string' ||
      (Array.isArray(props.children) && props.children.every((x: any) => x == null || typeof x === 'string'));

    const finalStyle = [
      style,
      isPlaceholder ? [styles.placeholder, { backgroundColor }] : styles.placeholderContainer,
      {
        height,
        width,
        borderRadius,
      },
    ];

    return (
      <View key={index} style={finalStyle}>
        {isPlaceholder
          ? undefined
          : transformToPlaceholder(props.children, backgroundColor, borderRadius)}
      </View>
    );
  });
};

const styles = StyleSheet.create({
  placeholderContainer: {
    backgroundColor: 'transparent',
  },
  placeholder: {
    overflow: 'hidden',
  },
});

const getTransparentColor = (color: string): string => {
  const type = getColorType(color);
  if (type === 'hex') {
    if (color.length < 6) {
      return color.substring(0, 4) + '0';
    }
    return color.substring(0, 7) + '00';
  }
  const [r, g, b] = color.match(/\d+/g) || [];
  return `rgba(${r},${g},${b},0)`;
};

const getColorType = (color: string): 'hex' | 'rgb' | 'rgba' => {
  if (/^rgba\(/.test(color)) return 'rgba';
  if (/^rgb\(/.test(color)) return 'rgb';
  if (/^#?([a-f\d]{3,4}|[a-f\d]{6}|[a-f\d]{8})$/i.test(color)) return 'hex';
  throw `The provided color ${color} is not a valid (hex | rgb | rgba) color`;
};


