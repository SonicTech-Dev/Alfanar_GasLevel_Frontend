import React, { useEffect } from 'react'
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated'
import { Text as RNText } from 'react-native'

const AnimatedText = Animated.createAnimatedComponent(RNText)

export default function AnimatedCounter({
  value = 0,
  duration = 650,
  formatter = (n) => String(Math.round(n)),
  style,
}) {
  const v = useSharedValue(0)

  useEffect(() => {
    v.value = withTiming(Number(value) || 0, { duration, easing: Easing.out(Easing.cubic) })
  }, [duration, value, v])

  const animatedProps = useAnimatedProps(() => {
    return {
      text: formatter(v.value),
    }
  })

  // RN Text doesn't officially support "text" prop everywhere,
  // so we render via children using a tiny workaround:
  // useAnimatedProps is kept for platforms that accept it, but we also compute a fallback.
  return <AnimatedText animatedProps={animatedProps} style={style}>{formatter(value)}</AnimatedText>
}