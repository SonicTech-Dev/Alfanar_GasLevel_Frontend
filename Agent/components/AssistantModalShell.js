import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';

import { theme } from '../../Components/theme';
import { runAssistantSheetIn, runAssistantSheetOut } from '../animations/assistantSheetAnimations';

export default function AssistantModalShell({
  visible,
  onClose,
  keyboardVisible,
  keyboardHeight,
  children,
}) {
  const insets = useSafeAreaInsets();
  const fade = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(28)).current;
  const scale = useRef(new Animated.Value(0.985)).current;
  const [renderVisible, setRenderVisible] = React.useState(visible);

  useEffect(() => {
    if (visible) {
      setRenderVisible(true);
      runAssistantSheetIn({ fade, translateY, scale });
      return;
    }

    runAssistantSheetOut({
      fade,
      translateY,
      scale,
      onComplete: () => setRenderVisible(false),
    });
  }, [visible, fade, translateY, scale]);

  const bottomPad = useMemo(
    () => (keyboardVisible ? keyboardHeight : Math.max(14, insets.bottom + 8)),
    [keyboardVisible, keyboardHeight, insets.bottom]
  );

  if (!renderVisible) return null;

  return (
    <Modal
      visible={renderVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" backgroundColor="rgba(8,15,32,0.52)" />
      <Animated.View style={[styles.root, { opacity: fade }]}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <Animated.View
          style={[
            styles.wrap,
            {
              paddingTop: Math.max(8, insets.top + 4),
              paddingBottom: bottomPad,
              transform: [{ translateY }, { scale }],
            },
          ]}
        >
          <LinearGradient
            colors={[
              'rgba(255,255,255,0.99)',
              'rgba(250,252,255,0.985)',
              'rgba(242,246,251,0.98)',
            ]}
            style={styles.card}
          >
            <LinearGradient
              colors={[
                'rgba(22,119,200,0.12)',
                'rgba(255,255,255,0)',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={styles.glowLayer}
            />
            <View style={styles.surface}>{children}</View>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'rgba(7,16,33,0.26)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7,16,33,0.46)',
  },
  wrap: {
    flex: 1,
    paddingHorizontal: 8,
  },
  card: {
    flex: 1,
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.stroke,
    ...theme.shadow.sheet,
  },
  glowLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  surface: {
    flex: 1,
    minHeight: 0,
    backgroundColor: 'transparent',
  },
});