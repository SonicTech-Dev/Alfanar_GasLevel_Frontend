import React from 'react';
import { View, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { theme } from './theme';

export default function WowCard({
  children,
  style,
  gradient = ['rgba(255,255,255,0.92)', 'rgba(255,255,255,0.78)'],
  stroke = theme.colors.stroke,
}) {
  return (
    <View style={[styles.shadowWrap, style]}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientClip}
      >
        <View style={[styles.stroke, { borderColor: stroke }]}>
          <View style={styles.inner}>{children}</View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  // Shadow must live on an outer wrapper; if we clip it, shadow gets cut off.
  shadowWrap: {
    borderRadius: theme.radius.xl,
    ...theme.shadow.soft,
  },

  // This is the important part: the gradient is clipped perfectly to rounded corners.
  gradientClip: {
    borderRadius: theme.radius.xl,
    overflow: 'hidden',
  },

  stroke: {
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },

  inner: {
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.36)',
  },
});