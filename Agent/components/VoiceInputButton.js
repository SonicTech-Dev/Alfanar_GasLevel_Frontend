import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';

import { theme } from '../../Components/theme';
import { Icon } from '../../Components/icons';

export default function VoiceInputButton({ state = 'idle', onPress }) {
  const pulse = useRef(new Animated.Value(0.88)).current;

  useEffect(() => {
    if (state !== 'recording') {
      pulse.stopAnimation();
      pulse.setValue(0.88);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 500, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.88, duration: 500, useNativeDriver: true }),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [state, pulse]);

  const label =
    state === 'recording'
      ? 'Recording'
      : state === 'processing'
      ? 'Processing'
      : 'Voice';

  return (
    <Pressable onPress={onPress} style={styles.button}>
      <Animated.View style={[styles.iconWrap, { transform: [{ scale: pulse }] }]}>
        <Icon
          name={state === 'processing' ? 'loading' : 'microphone'}
          size={17}
          color={state === 'recording' ? '#C53A3A' : theme.colors.textSecondary}
        />
      </Animated.View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 74,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
    backgroundColor: 'rgba(255,255,255,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    gap: 2,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '900',
    color: theme.colors.textMuted,
  },
});