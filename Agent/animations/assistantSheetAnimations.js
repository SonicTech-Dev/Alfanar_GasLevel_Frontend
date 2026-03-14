import { Animated } from 'react-native';

export function runAssistantSheetIn({ fade, translateY, scale }) {
  Animated.parallel([
    Animated.timing(fade, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }),
    Animated.timing(translateY, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }),
    Animated.timing(scale, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }),
  ]).start();
}

export function runAssistantSheetOut({ fade, translateY, scale, onComplete }) {
  Animated.parallel([
    Animated.timing(fade, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
    }),
    Animated.timing(translateY, {
      toValue: 12,
      duration: 120,
      useNativeDriver: true,
    }),
    Animated.timing(scale, {
      toValue: 0.992,
      duration: 120,
      useNativeDriver: true,
    }),
  ]).start(({ finished }) => {
    if (finished && onComplete) onComplete();
  });
}