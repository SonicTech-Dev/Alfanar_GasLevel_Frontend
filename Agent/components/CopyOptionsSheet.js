import React, { useRef } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { theme } from '../../Components/theme';
import { Icon } from '../../Components/icons';
import { copyAssistantSection } from '../utils/copyAssistantContent';

function Row({ label, section, message, onClose, onCopied }) {
  const onPress = async () => {
    await copyAssistantSection(message, section);
    onClose?.();
    onCopied?.();
  };

  return (
    <Pressable onPress={onPress} style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Icon name="copy" size={17} color={theme.colors.textSecondary} />
    </Pressable>
  );
}

export default function CopyOptionsSheet({ visible, onClose, message, onCopied }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(18)).current;

  React.useEffect(() => {
    if (!visible) return;

    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [visible, opacity, rise]);

  if (!visible || !message) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.root, { opacity }]}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Animated.View style={[styles.sheet, { transform: [{ translateY: rise }] }]}>
          <View style={styles.handle} />
          <Text style={styles.title}>Copy options</Text>

          <Row
            label="Copy full response"
            section="full"
            message={message}
            onClose={onClose}
            onCopied={onCopied}
          />
          <Row
            label="Copy summary"
            section="summary"
            message={message}
            onClose={onClose}
            onCopied={onCopied}
          />
          <Row
            label="Copy facts"
            section="facts"
            message={message}
            onClose={onClose}
            onCopied={onCopied}
          />
          <Row
            label="Copy insights"
            section="insights"
            message={message}
            onClose={onClose}
            onCopied={onCopied}
          />
          <Row
            label="Copy recommendations"
            section="recommendations"
            message={message}
            onClose={onClose}
            onCopied={onCopied}
          />
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(7,16,33,0.22)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7,16,33,0.42)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.985)',
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
    minHeight: 52,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
    backgroundColor: 'rgba(255,255,255,0.92)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLabel: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
    color: theme.colors.text,
  },
});