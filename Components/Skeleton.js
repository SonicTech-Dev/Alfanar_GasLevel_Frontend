import React, { useEffect, useRef } from 'react'
import { Animated, StyleSheet, View } from 'react-native'
import { theme } from './theme'

export function SkeletonBlock({ height = 14, width = '100%', radius = 12, style }) {
  const a = useRef(new Animated.Value(0.35)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(a, { toValue: 0.65, duration: 650, useNativeDriver: true }),
        Animated.timing(a, { toValue: 0.35, duration: 650, useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [a])

  return (
    <Animated.View
      style={[
        styles.block,
        {
          height,
          width,
          borderRadius: radius,
          opacity: a,
        },
        style,
      ]}
    />
  )
}

export function SkeletonCard({ style }) {
  return (
    <View style={[styles.card, style]}>
      <SkeletonBlock height={16} width="60%" radius={10} />
      <View style={{ height: 10 }} />
      <SkeletonBlock height={12} width="92%" radius={10} />
      <View style={{ height: 8 }} />
      <SkeletonBlock height={12} width="78%" radius={10} />
      <View style={{ height: 14 }} />
      <SkeletonBlock height={44} width="100%" radius={14} />
    </View>
  )
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: theme.colors.skeleton,
  },
  card: {
    padding: 14,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
    backgroundColor: theme.colors.surface,
  },
})