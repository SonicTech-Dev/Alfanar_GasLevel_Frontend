import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../../Components/theme';

const OPTIONS = [
  { key: 'screenshot', label: 'Add screenshot' },
  { key: 'pdf', label: 'Add PDF file' },
  { key: 'document', label: 'Add document' },
  { key: 'csv', label: 'Add CSV file' },
  { key: 'excel', label: 'Add Excel file' },
];

export default function AttachmentActionSheet({ visible, onClose, onSelect }) {
  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Add attachment</Text>

          {OPTIONS.map((item) => (
            <Pressable
              key={item.key}
              onPress={() => onSelect?.(item.key)}
              style={styles.row}
            >
              <Text style={styles.rowText}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7,16,33,0.42)',
  },
  sheet: {
    backgroundColor: 'rgba(255,255,255,0.985)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderColor: theme.colors.stroke,
  },
  handle: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.12)',
  },
  title: {
    marginTop: 12,
    marginBottom: 10,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '900',
    color: theme.colors.text,
  },
  row: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
    backgroundColor: 'rgba(255,255,255,0.92)',
    justifyContent: 'center',
    paddingHorizontal: 14,
    marginTop: 8,
  },
  rowText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
    color: theme.colors.text,
  },
});