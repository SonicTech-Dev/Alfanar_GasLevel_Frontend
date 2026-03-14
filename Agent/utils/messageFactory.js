export function createAssistantWelcomeMessage() {
  return {
    id: 'welcome',
    role: 'assistant',
    createdAt: new Date().toISOString(),
    content: {
      summary: 'Hello. I am the Alfanar AI Agent. How can I help?',
      facts: [],
      insights: [],
      recommendations: [],
    },
  };
}

export function createUserMessage({ text, attachments = [] }) {
  return {
    id: `u-${Date.now()}`,
    role: 'user',
    text: String(text || ''),
    attachments,
    createdAt: new Date().toISOString(),
  };
}

export function createAssistantMessage(json = {}) {
  return {
    id: `a-${Date.now()}`,
    role: 'assistant',
    createdAt: new Date().toISOString(),
    content: {
      summary: json?.summary || 'No summary returned.',
      facts: Array.isArray(json?.facts) ? json.facts : [],
      insights: Array.isArray(json?.insights) ? json.insights : [],
      recommendations: Array.isArray(json?.recommendations) ? json.recommendations : [],
    },
  };
}

export function hydrateMessages(items = []) {
  return items.map((item, index) => ({
    id: item?.id || `m-${index}-${Date.now()}`,
    role: item?.role === 'user' ? 'user' : 'assistant',
    text: item?.text || '',
    attachments: Array.isArray(item?.attachments) ? item.attachments : [],
    createdAt: item?.createdAt || new Date().toISOString(),
    content: {
      summary: item?.content?.summary || '',
      facts: Array.isArray(item?.content?.facts) ? item.content.facts : [],
      insights: Array.isArray(item?.content?.insights) ? item.content.insights : [],
      recommendations: Array.isArray(item?.content?.recommendations)
        ? item.content.recommendations
        : [],
    },
  }));
}