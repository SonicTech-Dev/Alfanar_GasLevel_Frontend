import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import { theme } from '../../Components/theme';
import WowCard from '../../Components/WowCard';
import { formatTimestamp } from '../utils/formatTimestamp';
import { severityColors } from '../constants/severity';
import { tokenizeForPills } from '../utils/numberPill';
import NumberPill from './NumberPill';
import CollapsibleSection from './CollapsibleSection';

function InlinePillText({ text }) {
  const tokens = tokenizeForPills(String(text || ''));

  return (
    <Text style={styles.bodyText}>
      {tokens.map((token, idx) => {
        if (token.type === 'pill') {
          return (
            <Text key={`${token.value}-${idx}`} style={styles.pillFallback}>
              {token.value}
            </Text>
          );
        }
        return (
          <Text key={`${token.value}-${idx}`} style={styles.bodyText}>
            {token.value}
          </Text>
        );
      })}
    </Text>
  );
}

function SeverityPill({ value }) {
  const colors = severityColors[value] || severityColors.medium;

  return (
    <View style={[styles.severityPill, { backgroundColor: colors.soft, borderColor: colors.border }]}>
      <Text style={[styles.severityPillText, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

export default function AssistantMessageCard({ message, onPress }) {
  const content = message?.content || {};
  const summary = content.summary || 'No summary available.';
  const facts = Array.isArray(content.facts) ? content.facts : [];
  const insights = Array.isArray(content.insights) ? content.insights : [];
  const recommendations = Array.isArray(content.recommendations) ? content.recommendations : [];

  return (
    <Pressable onPress={onPress} style={styles.wrap}>
      <WowCard style={styles.card}>
        <LinearGradient
          colors={['rgba(22,119,200,0.08)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.topGlow}
        />

        <View style={styles.headerRow}>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>AI RESPONSE</Text>
          </View>
          <Text style={styles.timestamp}>{formatTimestamp(message.createdAt)}</Text>
        </View>

        <CollapsibleSection title="Summary" defaultExpanded>
          <InlinePillText text={summary} />
        </CollapsibleSection>

        {!!facts.length && (
          <CollapsibleSection title="Facts" defaultExpanded>
            <View style={styles.group}>
              {facts.map((fact, idx) => (
                <View key={`${message.id}-fact-${idx}`} style={styles.bulletRow}>
                  <View style={styles.bulletDot} />
                  <View style={styles.bulletContent}>
                    <InlinePillText text={fact} />
                  </View>
                </View>
              ))}
            </View>
          </CollapsibleSection>
        )}

        {!!insights.length && (
          <CollapsibleSection title="Insights" defaultExpanded>
            <View style={styles.group}>
              {insights.map((item, idx) => {
                const sev = String(item?.severity || 'medium').toLowerCase();
                const colors = severityColors[sev] || severityColors.medium;

                return (
                  <View
                    key={`${message.id}-insight-${idx}`}
                    style={[
                      styles.innerCard,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.soft,
                      },
                    ]}
                  >
                    <View style={styles.innerCardTop}>
                      <Text style={styles.innerTitle}>{item?.title || 'Insight'}</Text>
                      <SeverityPill value={sev} />
                    </View>
                    <Text style={styles.innerMeta}>{String(item?.category || 'fleet').toUpperCase()}</Text>
                    <InlinePillText text={item?.message || ''} />
                  </View>
                );
              })}
            </View>
          </CollapsibleSection>
        )}

        {!!recommendations.length && (
          <CollapsibleSection title="Recommendations" defaultExpanded>
            <View style={styles.group}>
              {recommendations.map((item, idx) => {
                const sev = String(item?.priority || 'medium').toLowerCase();
                const colors = severityColors[sev] || severityColors.medium;

                return (
                  <View
                    key={`${message.id}-recommendation-${idx}`}
                    style={[
                      styles.recommendationRow,
                      {
                        borderColor: colors.border,
                        backgroundColor: 'rgba(255,255,255,0.72)',
                      },
                    ]}
                  >
                    <View style={styles.recommendationTextWrap}>
                      <InlinePillText text={item?.label || ''} />
                    </View>
                    <SeverityPill value={sev} />
                  </View>
                );
              })}
            </View>
          </CollapsibleSection>
        )}
      </WowCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 12,
  },
  card: {
    padding: 14,
    overflow: 'hidden',
  },
  topGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  headerRow: {
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(22,119,200,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(22,119,200,0.16)',
  },
  headerBadgeText: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '900',
    letterSpacing: 0.7,
    color: '#165E99',
  },
  timestamp: {
    color: theme.colors.textMuted,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  group: {
    gap: 8,
  },
  bodyText: {
    fontSize: 13.5,
    lineHeight: 20,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  pillFallback: {
    color: '#165E99',
    fontWeight: '900',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bulletDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    marginTop: 7,
    backgroundColor: theme.colors.blue,
  },
  bulletContent: {
    flex: 1,
  },
  innerCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
  },
  innerCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  innerTitle: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: '900',
    color: theme.colors.text,
  },
  innerMeta: {
    marginTop: 4,
    marginBottom: 7,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
    color: theme.colors.textMuted,
  },
  recommendationRow: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recommendationTextWrap: {
    flex: 1,
  },
  severityPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  severityPillText: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '900',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});