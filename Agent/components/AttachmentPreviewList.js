import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../../Components/theme';
import { Icon } from '../../Components/icons';

function getTypeLabel(type) {
  switch (type) {
    case 'screenshot':
      return 'IMG';
    case 'pdf':
      return 'PDF';
    case 'document':
      return 'DOC';
    case 'csv':
      return 'CSV';
    case 'excel':
      return 'XLS';
    default:
      return 'FILE';
  }
}

export default function AttachmentPreviewList({
  items = [],
  onRemove,
  compact = false,
  readonly = false,
}) {
  if (!items.length) return null;

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      {items.map((item) => (
        <View key={item.id} style={[styles.item, compact && styles.itemCompact]}>
          <View style={styles.typePill}>
            <Text style={styles.typePillText}>{getTypeLabel(item.type)}</Text>
          </View>

          <Text numberOfLines={1} style={styles.fileName}>
            {item.name}
          </Text>

          {!readonly && (
            <Pressable onPress={() => onRemove?.(item.id)} style={styles.removeBtn}>
              <Icon name="close" size={14} color={theme.colors.textSecondary} />
            </Pressable>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 10,
    gap: 8,
  },
  wrapCompact: {
    marginTop: 10,
    marginBottom: 0,
  },
  item: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
    backgroundColor: 'rgba(255,255,255,0.96)',
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemCompact: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderColor: 'rgba(255,255,255,0.22)',
  },
  typePill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: 'rgba(22,119,200,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(22,119,200,0.14)',
  },
  typePillText: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '900',
    color: '#165E99',
  },
  fileName: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: '800',
    color: theme.colors.text,
  },
  removeBtn: {
    width: 24,
    height: 24,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});