import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { theme } from '../../Components/theme';
import { Icon } from '../../Components/icons';
import AttachmentPreviewList from './AttachmentPreviewList';
import VoiceInputButton from './VoiceInputButton';

export default function AssistantComposer({
  value,
  onChangeText,
  onFocus,
  onSend,
  disabled,
  attachments,
  onRemoveAttachment,
  onOpenAttachmentSheet,
  voiceState,
  onVoicePress,
  bottomPadding,
}) {
  return (
    <View style={[styles.wrap, { paddingBottom: bottomPadding }]}>
      <AttachmentPreviewList items={attachments} onRemove={onRemoveAttachment} />

      <View style={styles.controlsRow}>
        <Pressable
          onPress={onOpenAttachmentSheet}
          style={styles.sideAction}
          accessibilityLabel="Add attachment"
        >
          <Text style={styles.attachmentEmoji}>📎</Text>
        </Pressable>

        <View style={styles.inputWrap}>
          <TextInput
            value={value}
            onChangeText={onChangeText}
            onFocus={onFocus}
            placeholder="How can I help?"
            placeholderTextColor={theme.colors.textMuted}
            style={styles.input}
            multiline
            blurOnSubmit={false}
          />
        </View>

        <View style={styles.rightActions}>
          <Pressable
            onPress={onSend}
            disabled={disabled || (!value.trim() && !attachments.length)}
            style={[
              styles.sendBtn,
              (disabled || (!value.trim() && !attachments.length)) && styles.sendBtnDisabled,
            ]}
            accessibilityLabel="Send message"
          >
            <Icon name={disabled ? 'loading' : 'send'} size={18} color="#fff" />
          </Pressable>

          <VoiceInputButton state={voiceState} onPress={onVoicePress} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.stroke,
    backgroundColor: 'rgba(255,255,255,0.97)',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  sideAction: {
    width: 46,
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
    backgroundColor: 'rgba(255,255,255,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  attachmentEmoji: {
    fontSize: 20,
    lineHeight: 22,
  },
  inputWrap: {
    flex: 1,
  },
  input: {
    minHeight: 52,
    maxHeight: 120,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
    backgroundColor: 'rgba(255,255,255,0.98)',
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    textAlignVertical: 'top',
  },
  rightActions: {
    gap: 8,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: theme.colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.soft,
    marginBottom: 1,
  },
  sendBtnDisabled: {
    opacity: 0.55,
  },
});