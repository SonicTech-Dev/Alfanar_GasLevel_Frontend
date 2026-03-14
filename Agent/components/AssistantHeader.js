import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../../Components/theme';
import { Icon } from '../../Components/icons';
import ConnectivityBadge from './ConnectivityBadge';

export default function AssistantHeader({ onClose, onClearConversation, connectivity }) {
  return (
    <View style={styles.header}>
      <View style={styles.left}>
        <View style={styles.iconColumn}>
          <View style={styles.iconWrap}>
            <Icon name="robot-happy-outline" size={20} color={theme.colors.blue} />
          </View>

          <View style={styles.statusWrap}>
            <ConnectivityBadge status={connectivity} />
          </View>
        </View>

        <View style={styles.titleWrap}>
          <Text style={styles.title}>Alfanar AI Agent</Text>
          <Text style={styles.subtitle}>
            Fleet analytics, historical context, trends, recommendations.
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={onClearConversation}
          style={styles.actionBtn}
          accessibilityLabel="Start a new chat"
        >
          <Icon name="refresh" size={17} color={theme.colors.textSecondary} />
        </Pressable>

        <Pressable
          onPress={onClose}
          style={styles.actionBtn}
          accessibilityLabel="Close AI assistant"
        >
          <Icon name="close" size={20} color={theme.colors.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.stroke,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  iconColumn: {
    alignItems: 'flex-start',
    gap: 6,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(214,235,255,0.42)',
    borderWidth: 1,
    borderColor: 'rgba(22,119,200,0.18)',
  },
  statusWrap: {
    marginLeft: -2,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '900',
    color: theme.colors.text,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 42,
    height: 42,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
    backgroundColor: 'rgba(255,255,255,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});