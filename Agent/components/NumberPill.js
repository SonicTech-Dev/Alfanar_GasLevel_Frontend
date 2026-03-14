import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

function NumberPillInner({ tone, text }) {
  const red = tone === 'red';

  return (
    <View style={[styles.pill, red ? styles.redPill : styles.bluePill]}>
      <Text style={[styles.text, red ? styles.redText : styles.blueText]}>{text}</Text>
    </View>
  );
}

export default function NumberPill({ tone = 'blue', text = '', inline = false }) {
  if (inline) {
    return <Text>{` `}<NumberPillInner tone={tone} text={text} />{` `}</Text>;
  }

  return <NumberPillInner tone={tone} text={text} />;
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  redPill: {
    backgroundColor: 'rgba(197,58,58,0.10)',
    borderColor: 'rgba(197,58,58,0.18)',
  },
  bluePill: {
    backgroundColor: 'rgba(22,119,200,0.10)',
    borderColor: 'rgba(22,119,200,0.18)',
  },
  text: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '900',
  },
  redText: {
    color: '#B03434',
  },
  blueText: {
    color: '#165E99',
  },
});