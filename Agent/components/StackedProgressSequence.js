import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { theme } from '../../Components/theme';

function Stage({ label, delay, mode }) {
  const glow = useRef(new Animated.Value(0.35)).current;
  const progress = useRef(new Animated.Value(0.18)).current;

  useEffect(() => {
    const target =
      mode === 'recommend' ? 0.74 : mode === 'trend' ? 0.68 : 0.61;

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(glow, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(progress, {
            toValue: target,
            duration: 1100,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(glow, {
            toValue: 0.45,
            duration: 380,
            useNativeDriver: true,
          }),
          Animated.timing(progress, {
            toValue: 0.22,
            duration: 520,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    pulse.start();
    return () => pulse.stop();
  }, [delay, glow, progress, mode]);

  return (
    <View style={styles.stage}>
      <View style={styles.stageTop}>
        <Animated.View style={[styles.signal, { opacity: glow }]} />
        <Text style={styles.stageText}>{label}</Text>
      </View>

      <View style={styles.barTrack}>
        <View style={styles.barFillWrap}>
          <Animated.View
            style={[
              styles.barFill,
              {
                opacity: glow,
                transform: [{ scaleX: progress }],
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

export default function StackedProgressSequence() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.caption}>Processing request</Text>

      <Stage label="Analyzing fleet data..." delay={0} mode="scan" />
      <Stage label="Checking consumption trends..." delay={220} mode="trend" />
      <Stage label="Preparing recommendations..." delay={420} mode="recommend" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
    backgroundColor: 'rgba(255,255,255,0.88)',
    padding: 14,
  },
  caption: {
    marginBottom: 10,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
    color: theme.colors.textMuted,
  },
  stage: {
    marginTop: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(246,248,251,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.06)',
    padding: 12,
  },
  stageTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  signal: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: theme.colors.blue,
  },
  stageText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    color: theme.colors.text,
  },
  barTrack: {
    marginTop: 10,
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(22,119,200,0.10)',
    overflow: 'hidden',
  },
  barFillWrap: {
    width: '100%',
    height: 6,
    alignItems: 'flex-start',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    height: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.blue,
  },
});