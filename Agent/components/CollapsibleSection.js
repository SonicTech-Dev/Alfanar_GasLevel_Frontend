import React, { useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../../Components/theme';
import { Icon } from '../../Components/icons';

export default function CollapsibleSection({ title, defaultExpanded = true, children }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const rotate = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;
  const bodyAnim = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);

    Animated.parallel([
      Animated.timing(rotate, {
        toValue: next ? 1 : 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(bodyAnim, {
        toValue: next ? 1 : 0,
        duration: 180,
        useNativeDriver: false,
      }),
    ]).start();
  };

  return (
    <View style={styles.section}>
      <Pressable onPress={toggle} style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Animated.View
          style={{
            transform: [
              {
                rotate: rotate.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '180deg'],
                }),
              },
            ],
          }}
        >
          <Icon name="chevron-down" size={18} color={theme.colors.textMuted} />
        </Animated.View>
      </Pressable>

      {expanded ? (
        <Animated.View style={[styles.bodyWrap, { opacity: bodyAnim }]}>
          <View style={styles.body}>{children}</View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
    backgroundColor: 'rgba(255,255,255,0.70)',
    overflow: 'hidden',
  },
  header: {
    minHeight: 48,
    paddingHorizontal: 13,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
    letterSpacing: 0.3,
    color: theme.colors.textMuted,
  },
  bodyWrap: {
    overflow: 'hidden',
  },
  body: {
    paddingHorizontal: 13,
    paddingBottom: 13,
  },
});