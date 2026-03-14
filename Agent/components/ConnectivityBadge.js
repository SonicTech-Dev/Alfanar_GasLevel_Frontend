import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function ConnectivityBadge({ status = 'online' }) {
  const online = status === 'online';

  return (
    <View style={[styles.badge, online ? styles.onlineBadge : styles.offlineBadge]}>
      <View style={[styles.dot, online ? styles.onlineDot : styles.offlineDot]} />
      <Text style={[styles.text, online ? styles.onlineText : styles.offlineText]}>
        {online ? 'Online' : 'Offline'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 22,
  },
  onlineBadge: {
    backgroundColor: 'rgba(28,87,148,0.08)',
    borderColor: 'rgba(28,87,148,0.18)',
  },
  offlineBadge: {
    backgroundColor: 'rgba(176,36,36,0.08)',
    borderColor: 'rgba(176,36,36,0.18)',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  onlineDot: {
    backgroundColor: '#1677C8',
  },
  offlineDot: {
    backgroundColor: '#C53A3A',
  },
  text: {
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '900',
  },
  onlineText: {
    color: '#165E99',
  },
  offlineText: {
    color: '#A23131',
  },
});