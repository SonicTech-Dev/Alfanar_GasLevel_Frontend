import React from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import { theme } from '../../Components/theme';
import { formatTimestamp } from '../utils/formatTimestamp';
import AssistantMessageCard from './AssistantMessageCard';
import StackedProgressSequence from './StackedProgressSequence';
import AttachmentPreviewList from './AttachmentPreviewList';

export default function ChatMessageList({
  scrollRef,
  messages,
  error,
  submitting,
  onAssistantPress,
  onContentSizeChange,
  successPulseKey,
}) {
  const pulse = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 260, useNativeDriver: true }),
    ]).start();
  }, [successPulseKey, pulse]);

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.messages}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      onContentSizeChange={onContentSizeChange}
    >
      {messages.map((msg) => {
        if (msg.role === 'user') {
          return (
            <View key={msg.id} style={styles.userWrap}>
              <LinearGradient
                colors={['rgba(22,119,200,0.95)', 'rgba(41,182,255,0.92)']}
                style={styles.userBubble}
              >
                <Text style={styles.userText}>{msg.text}</Text>
                {!!msg.attachments?.length && (
                  <AttachmentPreviewList
                    items={msg.attachments}
                    compact
                    readonly
                  />
                )}
                <Text style={styles.timestampLight}>{formatTimestamp(msg.createdAt)}</Text>
              </LinearGradient>
            </View>
          );
        }

        return (
          <Animated.View
            key={msg.id}
            style={{
              opacity: pulse.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1],
              }),
              transform: [
                {
                  scale: pulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.01],
                  }),
                },
              ],
            }}
          >
            <AssistantMessageCard
              message={msg}
              onPress={() => onAssistantPress?.(msg)}
            />
          </Animated.View>
        );
      })}

      {submitting && <StackedProgressSequence />}

      {!!error && <Text style={styles.error}>{error}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  messages: {
    flex: 1,
    minHeight: 0,
  },
  content: {
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 22,
  },
  userWrap: {
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  userBubble: {
    maxWidth: '90%',
    borderRadius: 24,
    paddingHorizontal: 15,
    paddingVertical: 13,
  },
  userText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
  },
  timestampLight: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.78)',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  error: {
    color: theme.colors.red,
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 6,
  },
});