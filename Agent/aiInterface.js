import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  StyleSheet,
  View,
  Animated,
  Dimensions,
  Platform,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';

import { theme } from '../Components/theme';
import { Icon } from '../Components/icons';
import { api } from '../Components/api';

import AssistantModalShell from './components/AssistantModalShell';
import AssistantHeader from './components/AssistantHeader';
import ChatMessageList from './components/ChatMessageList';
import AssistantComposer from './components/AssistantComposer';
import CopyOptionsSheet from './components/CopyOptionsSheet';
import AttachmentActionSheet from './components/AttachmentActionSheet';
import {
  createAssistantWelcomeMessage,
  createUserMessage,
  createAssistantMessage,
  hydrateMessages,
} from './utils/messageFactory';
import {
  clearStoredConversation,
  loadStoredConversation,
  saveStoredConversation,
} from './storage/chatHistoryStorage';

function AssistantPanel({ visible, onClose }) {
  const insets = useSafeAreaInsets();

  const [question, setQuestion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [messages, setMessages] = useState([]);
  const [historyReady, setHistoryReady] = useState(false);
  const [connectivity, setConnectivity] = useState('online');
  const [copyTarget, setCopyTarget] = useState(null);
  const [copySheetVisible, setCopySheetVisible] = useState(false);
  const [attachmentSheetVisible, setAttachmentSheetVisible] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [voiceState, setVoiceState] = useState('idle');
  const [successPulseKey, setSuccessPulseKey] = useState(0);

  const scrollRef = useRef(null);
  const keyboardClosingRef = useRef(false);

  const scrollToBottom = useCallback((animated = true, delay = 0) => {
    if (keyboardClosingRef.current) return;

    requestAnimationFrame(() => {
      setTimeout(() => {
        if (keyboardClosingRef.current) return;
        if (scrollRef.current?.scrollToEnd) {
          scrollRef.current.scrollToEnd({ animated });
        }
      }, delay);
    });
  }, []);

  useEffect(() => {
    let mounted = true;

    async function restoreHistory() {
      try {
        const stored = await loadStoredConversation();
        if (!mounted) return;

        if (stored?.length) {
          setMessages(hydrateMessages(stored));
        } else {
          setMessages([]);
        }
      } catch (e) {
        if (mounted) {
          setMessages([]);
        }
      } finally {
        if (mounted) setHistoryReady(true);
      }
    }

    restoreHistory();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!historyReady) return;
    saveStoredConversation(messages).catch(() => {});
  }, [messages, historyReady]);

  useEffect(() => {
    if (!visible) return;

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onKeyboardShow = (e) => {
      keyboardClosingRef.current = false;
      setKeyboardVisible(true);
      setKeyboardHeight(e?.endCoordinates?.height || 0);
      scrollToBottom(true, 80);
    };

    const onKeyboardHide = () => {
      keyboardClosingRef.current = true;
      setKeyboardVisible(false);
      setKeyboardHeight(0);

      setTimeout(() => {
        keyboardClosingRef.current = false;
      }, 250);
    };

    const Keyboard = require('react-native').Keyboard;
    const showSub = Keyboard.addListener(showEvent, onKeyboardShow);
    const hideSub = Keyboard.addListener(hideEvent, onKeyboardHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [visible, scrollToBottom]);

  useEffect(() => {
    if (!visible) return;
    scrollToBottom(true, 60);
  }, [messages, visible, submitting, scrollToBottom]);

  const composerBottomPadding = keyboardVisible ? 12 : Math.max(12, insets.bottom + 6);

  const onOpenCopyOptions = useCallback((message) => {
    setCopyTarget(message);
    setCopySheetVisible(true);
  }, []);

  const onClearConversation = useCallback(async () => {
    setMessages([]);
    setAttachments([]);
    setQuestion('');
    setError('');
    await clearStoredConversation().catch(() => {});
    setSuccessPulseKey((n) => n + 1);
  }, []);

  const onAttachmentAction = useCallback((type) => {
    const stamp = Date.now();
    const mockNameMap = {
      screenshot: `screenshot-${stamp}.png`,
      pdf: `report-${stamp}.pdf`,
      document: `document-${stamp}.docx`,
      csv: `export-${stamp}.csv`,
      excel: `sheet-${stamp}.xlsx`,
    };

    setAttachments((prev) => [
      ...prev,
      {
        id: `att-${stamp}`,
        type,
        name: mockNameMap[type] || `file-${stamp}`,
      },
    ]);
    setAttachmentSheetVisible(false);
    setSuccessPulseKey((n) => n + 1);
  }, []);

  const onRemoveAttachment = useCallback((id) => {
    setAttachments((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const onVoicePress = useCallback(() => {
    if (voiceState === 'idle') {
      setVoiceState('recording');
      return;
    }

    if (voiceState === 'recording') {
      setVoiceState('processing');
      setTimeout(() => {
        const transcript = 'Please summarize fleet risks and refill priorities.';
        setQuestion((prev) => {
          const next = prev?.trim() ? `${prev.trim()} ${transcript}` : transcript;
          return next;
        });
        setVoiceState('idle');
        setSuccessPulseKey((n) => n + 1);
      }, 1100);
      return;
    }

    if (voiceState === 'processing') return;
  }, [voiceState]);

  async function onSend() {
    const q = question.trim();
    if ((!q && !attachments.length) || submitting) return;

    setError('');
    setSubmitting(true);

    const userMsg = createUserMessage({
      text: q || 'Sent with attachment',
      attachments,
    });

    setMessages((prev) => [...prev, userMsg]);
    setQuestion('');
    setAttachments([]);

    try {
      const json = await api.aiAssistant({ question: q, scope: 'fleet' });
      const aiMsg = createAssistantMessage(json);
      setMessages((prev) => [...prev, aiMsg]);
      setConnectivity('online');
      setSuccessPulseKey((n) => n + 1);
    } catch (e) {
      setError(e?.message || 'Failed to contact AI assistant.');
      setConnectivity('offline');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <AssistantModalShell
        visible={visible}
        onClose={onClose}
        keyboardVisible={keyboardVisible}
        keyboardHeight={keyboardHeight}
      >
        <View style={styles.panelFill}>
          <AssistantHeader
            onClose={onClose}
            onClearConversation={onClearConversation}
            connectivity={connectivity}
          />

          <ChatMessageList
            scrollRef={scrollRef}
            messages={messages}
            error={error}
            submitting={submitting}
            onAssistantPress={onOpenCopyOptions}
            onContentSizeChange={() => {
              if (!keyboardClosingRef.current) {
                scrollToBottom(true, 20);
              }
            }}
            successPulseKey={successPulseKey}
          />

          <AssistantComposer
            value={question}
            onChangeText={(t) => {
              setQuestion(t);
              if (error) setError('');
              if (connectivity !== 'online') setConnectivity('online');
            }}
            onFocus={() => scrollToBottom(true, 160)}
            onSend={onSend}
            disabled={submitting}
            attachments={attachments}
            onRemoveAttachment={onRemoveAttachment}
            onOpenAttachmentSheet={() => setAttachmentSheetVisible(true)}
            voiceState={voiceState}
            onVoicePress={onVoicePress}
            bottomPadding={composerBottomPadding}
          />
        </View>
      </AssistantModalShell>

      <CopyOptionsSheet
        visible={copySheetVisible}
        onClose={() => setCopySheetVisible(false)}
        message={copyTarget}
        onCopied={() => setSuccessPulseKey((n) => n + 1)}
      />

      <AttachmentActionSheet
        visible={attachmentSheetVisible}
        onClose={() => setAttachmentSheetVisible(false)}
        onSelect={onAttachmentAction}
      />
    </>
  );
}

export default function FloatingAssistant({ currentRouteName }) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const window = Dimensions.get('window');
  const bubbleSize = 62;

  const initialX = Math.max(12, window.width - bubbleSize - 16);
  const initialY = Math.max(120, window.height - bubbleSize - 160);

  const pos = useRef(new Animated.ValueXY({ x: initialX, y: initialY })).current;
  const lastOffset = useRef({ x: initialX, y: initialY });

  const hiddenOnRoutes = useMemo(() => new Set(['Login']), []);
  const isHidden = hiddenOnRoutes.has(currentRouteName);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const dx = Math.abs(gestureState.dx || 0);
        const dy = Math.abs(gestureState.dy || 0);
        return dx > 4 || dy > 4;
      },
      onPanResponderGrant: () => {
        pos.setOffset(lastOffset.current);
        pos.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, gestureState) => {
        pos.setValue({ x: gestureState.dx, y: gestureState.dy });
      },
      onPanResponderRelease: (_, gestureState) => {
        pos.flattenOffset();

        let nextX = lastOffset.current.x + gestureState.dx;
        let nextY = lastOffset.current.y + gestureState.dy;

        const minX = 8;
        const maxX = Math.max(8, window.width - bubbleSize - 8);
        const minY = Math.max(8, insets.top + 4);
        const maxY = Math.max(minY, window.height - bubbleSize - Math.max(24, insets.bottom + 24));

        nextX = Math.max(minX, Math.min(maxX, nextX));
        nextY = Math.max(minY, Math.min(maxY, nextY));

        lastOffset.current = { x: nextX, y: nextY };

        Animated.spring(pos, {
          toValue: { x: nextX, y: nextY },
          useNativeDriver: false,
          bounciness: 6,
        }).start();
      },
      onPanResponderTerminate: () => {
        pos.flattenOffset();

        Animated.spring(pos, {
          toValue: lastOffset.current,
          useNativeDriver: false,
          bounciness: 6,
        }).start();
      },
    })
  ).current;

  if (isHidden) return null;

  return (
    <>
      <Animated.View
        style={[
          styles.floatingBubbleWrap,
          {
            left: pos.x,
            top: pos.y,
          },
        ]}
        {...panResponder.panHandlers}
      >
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityLabel="Open AI assistant"
        >
          <LinearGradient
            colors={['rgba(22,119,200,0.96)', 'rgba(41,182,255,0.92)']}
            style={styles.floatingBubble}
          >
            <View style={styles.floatingBubbleInner}>
              <Icon name="robot-happy-outline" size={26} color="#fff" />
            </View>
          </LinearGradient>
        </Pressable>
      </Animated.View>

      <AssistantPanel visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  floatingBubbleWrap: {
    position: 'absolute',
    zIndex: 99999,
  },
  floatingBubble: {
    width: 62,
    height: 62,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1677C8',
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  floatingBubbleInner: {
    width: 52,
    height: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  panelFill: {
    flex: 1,
    minHeight: 0,
  },
});