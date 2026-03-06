import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { theme } from './theme';

function config(type) {
  switch (type) {
    case 'normal':
      return {
        label: 'Normal',
        colors: ['rgba(22,119,200,0.18)', 'rgba(214,235,255,0.10)'],
        dot: theme.colors.blue,
        text: theme.colors.blue,
        stroke: 'rgba(22,119,200,0.22)',
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
      <Text style={[styles.text, { color: c.text }]}>{text || c.label}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
    minHeight: 36,
  },
  dot: { width: 8, height: 8, borderRadius: 99 },
  text: { fontSize: 13, lineHeight: 18, fontWeight: '900' },
});