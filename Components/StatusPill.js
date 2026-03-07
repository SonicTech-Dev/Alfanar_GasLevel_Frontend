import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { theme } from './theme';

function config(type) {
  switch (type) {
    case 'normal':
      return {
        label: 'Normal',
        colors: ['rgba(34,197,94,0.18)', 'rgba(236,253,243,0.10)'],
        dot: '#0F8A43',
        text: '#0F8A43',
        stroke: 'rgba(34,197,94,0.22)',
      };
    case 'min':
      return {
        label: 'Low Alarm',
        colors: ['rgba(220,38,38,0.18)', 'rgba(254,242,242,0.10)'],
        dot: theme.colors.red,
        text: theme.colors.red,
        stroke: 'rgba(220,38,38,0.20)',
      };
    case 'max':
      return {
        label: 'High Alarm',
        colors: ['rgba(220,38,38,0.18)', 'rgba(254,242,242,0.10)'],
        dot: theme.colors.red,
        text: theme.colors.red,
        stroke: 'rgba(220,38,38,0.20)',
      };
    case 'offline':
      return {
        label: 'Offline',
        colors: ['rgba(107,114,128,0.18)', 'rgba(241,245,249,0.12)'],
        dot: theme.colors.gray,
        text: theme.colors.gray,
        stroke: 'rgba(107,114,128,0.20)',
      };
    default:
      return {
        label: 'Unknown',
        colors: ['rgba(100,116,139,0.14)', 'rgba(241,245,249,0.10)'],
        dot: theme.colors.muted,
        text: theme.colors.muted,
        stroke: 'rgba(100,116,139,0.18)',
      };
  }
}

export default function StatusPill({ type, text }) {
  const c = config(type);
  return (
    <LinearGradient colors={c.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.wrap, { borderColor: c.stroke }]}>
      <View style={[styles.dot, { backgroundColor: c.dot }]} />
      <Text style={[styles.text, { color: c.text }]} numberOfLines={1}>
        {text || c.label}
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
    minHeight: 32,
    maxWidth: 138,
  },
  dot: { width: 7, height: 7, borderRadius: 99, flexShrink: 0 },
  text: { fontSize: 12, lineHeight: 16, fontWeight: '900', flexShrink: 1 },
});