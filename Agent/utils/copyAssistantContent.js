import { Alert } from 'react-native';

let ClipboardModule = null;

try {
  ClipboardModule = require('@react-native-clipboard/clipboard').default;
} catch (e) {
  ClipboardModule = null;
}

function normalizeMessage(message) {
  const content = message?.content || {};
  return {
    summary: String(content.summary || ''),
    facts: Array.isArray(content.facts) ? content.facts : [],
    insights: Array.isArray(content.insights) ? content.insights : [],
    recommendations: Array.isArray(content.recommendations) ? content.recommendations : [],
  };
}

function buildFullText(message) {
  const data = normalizeMessage(message);

  const facts = data.facts.length ? `Facts\n${data.facts.map((x) => `• ${x}`).join('\n')}` : '';
  const insights = data.insights.length
    ? `Insights\n${data.insights
        .map((x) => `• ${x?.title || 'Insight'}: ${x?.message || ''}`)
        .join('\n')}`
    : '';
  const recommendations = data.recommendations.length
    ? `Recommendations\n${data.recommendations
        .map((x) => `• ${x?.label || ''}`)
        .join('\n')}`
    : '';

  return [
    data.summary ? `Summary\n${data.summary}` : '',
    facts,
    insights,
    recommendations,
  ]
    .filter(Boolean)
    .join('\n\n');
}

function buildSectionText(message, section) {
  const data = normalizeMessage(message);

  switch (section) {
    case 'summary':
      return data.summary;
    case 'facts':
      return data.facts.map((x) => `• ${x}`).join('\n');
    case 'insights':
      return data.insights.map((x) => `• ${x?.title || 'Insight'}: ${x?.message || ''}`).join('\n');
    case 'recommendations':
      return data.recommendations.map((x) => `• ${x?.label || ''}`).join('\n');
    case 'full':
    default:
      return buildFullText(message);
  }
}

export async function copyAssistantSection(message, section = 'full') {
  const text = buildSectionText(message, section);

  if (!text) {
    Alert.alert('Nothing to copy');
    return false;
  }

  if (!ClipboardModule?.setString) {
    Alert.alert(
      'Clipboard dependency required',
      'Install @react-native-clipboard/clipboard to enable copy actions.'
    );
    return false;
  }

  ClipboardModule.setString(text);
  return true;
}