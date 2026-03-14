function classifyValue(raw) {
  const lower = String(raw || '').toLowerCase();

  if (/\b\d+(\.\d+)?\s*days?\b/i.test(lower)) {
    const match = lower.match(/(\d+(\.\d+)?)\s*days?/i);
    const days = match ? Number(match[1]) : null;
    if (days != null) {
      return days <= 5 ? 'red' : 'blue';
    }
  }

  if (
    lower.includes('alarm') ||
    lower.includes('above max') ||
    lower.includes('below min') ||
    lower.includes('threshold')
  ) {
    return 'red';
  }

  if (/\b\d+(\.\d+)?%/.test(lower)) {
    if (lower.includes('above') || lower.includes('below') || lower.includes('alarm')) {
      return 'red';
    }
    return 'blue';
  }

  return null;
}

export function tokenizeForPills(text = '') {
  const regex = /(\b\d+(\.\d+)?\s*days?\b|\b\d+(\.\d+)?%)/gi;
  const tokens = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text))) {
    const start = match.index;
    const end = regex.lastIndex;

    if (start > lastIndex) {
      tokens.push({
        type: 'text',
        value: text.slice(lastIndex, start),
      });
    }

    const value = text.slice(start, end);
    const contextWindow = text.slice(Math.max(0, start - 18), Math.min(text.length, end + 18));
    const tone = classifyValue(contextWindow) || classifyValue(value) || 'blue';

    tokens.push({
      type: 'pill',
      value,
      tone,
    });

    lastIndex = end;
  }

  if (lastIndex < text.length) {
    tokens.push({
      type: 'text',
      value: text.slice(lastIndex),
    });
  }

  return tokens;
}