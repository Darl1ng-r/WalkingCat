import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  StyleProp,
  ViewStyle,
} from 'react-native';

export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  className?: string;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius = 8,
  className = '',
  style,
}: SkeletonProps) {
  const [opacityAnim] = useState(() => new Animated.Value(0.3));

  useEffect(() => {
    let isMounted = true;

    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (!isMounted) return;
      if (!enabled) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(opacityAnim, {
              toValue: 0.7,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 0.3,
              duration: 800,
              useNativeDriver: true,
            }),
          ])
        ).start();
      } else {
        opacityAnim.setValue(0.5);
      }
    });

    return () => {
      isMounted = false;
      opacityAnim.stopAnimation();
    };
  }, [opacityAnim]);

  return (
    <Animated.View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading content"
      className={`bg-border dark:bg-border-dark ${className}`}
      style={[
        {
          width: width as any,
          height: height as any,
          borderRadius,
          opacity: opacityAnim,
        },
        style,
      ]}
    />
  );
}
