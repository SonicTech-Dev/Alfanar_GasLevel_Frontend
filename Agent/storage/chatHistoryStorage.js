let inMemoryConversation = [];

function cloneMessages(messages = []) {
  return JSON.parse(JSON.stringify(Array.isArray(messages) ? messages : []));
}

export async function loadStoredConversation() {
  return cloneMessages(inMemoryConversation);
}

export async function saveStoredConversation(messages = []) {
  inMemoryConversation = cloneMessages(messages);
  return true;
}

export async function clearStoredConversation() {
  inMemoryConversation = [];
  return true;
}