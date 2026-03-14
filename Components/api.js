const BASE_URL = 'https://gaslevel-alfanar.soniciot.com';

let authCookie = '';

function mergeCookie(existing, incoming) {
  const map = new Map();

  function add(cookieStr) {
    if (!cookieStr) return;
    String(cookieStr)
      .split(/,(?=[^;]+=[^;]+)/)
      .forEach((chunk) => {
        const firstPart = String(chunk).split(';')[0].trim();
        const eq = firstPart.indexOf('=');
        if (eq <= 0) return;
        const key = firstPart.slice(0, eq).trim();
        const val = firstPart.slice(eq + 1).trim();
        if (!key) return;
        map.set(key, `${key}=${val}`);
      });
  }

  add(existing);
  add(incoming);

  return Array.from(map.values()).join('; ');
}

function storeResponseCookies(resp) {
  try {
    const headers = resp?.headers;
    if (!headers || typeof headers.get !== 'function') return;

    const setCookie =
      headers.get('set-cookie') ||
      headers.get('Set-Cookie') ||
      '';

    if (setCookie) {
      authCookie = mergeCookie(authCookie, setCookie);
    }
  } catch {}
}

async function fetchJson(path, options = {}) {
  const headers = {
    ...(options.headers || {}),
  };

  const isFormData =
    typeof FormData !== 'undefined' && options.body instanceof FormData;

  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (authCookie) {
    headers.Cookie = authCookie;
  }

  const resp = await fetch(`${BASE_URL}${path}`, {
    cache: 'no-store',
    credentials: 'include',
    ...options,
    headers,
  });

  storeResponseCookies(resp);

  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(json.error || json.message || resp.statusText || `HTTP ${resp.status}`);
  return json;
}

async function fetchRaw(path, options = {}) {
  const headers = {
    ...(options.headers || {}),
  };

  const isFormData =
    typeof FormData !== 'undefined' && options.body instanceof FormData;

  if (!isFormData && !headers['Content-Type'] && options.body && typeof options.body === 'string') {
    headers['Content-Type'] = 'application/json';
  }

  if (authCookie) {
    headers.Cookie = authCookie;
  }

  const resp = await fetch(`${BASE_URL}${path}`, {
    cache: 'no-store',
    credentials: 'include',
    ...options,
    headers,
  });

  storeResponseCookies(resp);
  return resp;
}

function qs(params = {}) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export const api = {
  BASE_URL,

  login: async (username, password) => {
    const result = await fetchJson('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    return result;
  },

  me: () => fetchJson('/api/me'),

  logout: async () => {
    try {
      const result = await fetchJson('/api/logout', { method: 'POST' });
      authCookie = '';
      return result;
    } catch (e) {
      authCookie = '';
      throw e;
    }
  },

  createAccount: (payload) =>
    fetchJson('/api/account-management/accounts', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }),

  sites: () => fetchJson('/api/sites'),
  titles: () => fetchJson('/api/titles'),
  tankInfo: () => fetchJson('/api/tank-info'),
  tank: (terminalId) => fetchJson(`/api/tank?terminalId=${encodeURIComponent(String(terminalId))}`),

  consumption: () => fetchJson('/api/consumption'),

  consumptionSeries: (terminalId, { rangeDays = 30, unit = 'liters' } = {}) =>
    fetchJson(
      `/api/consumption-series${qs({
        terminalId: String(terminalId),
        rangeDays,
        unit,
      })}`
    ),

  deviceStatus: (terminalId) =>
    fetchJson(`/api/device-status${qs({ terminalId })}`),

  aiAssistant: ({ question, scope = 'fleet', terminalId = null } = {}) =>
    fetchJson('/api/ai-assistant', {
      method: 'POST',
      body: JSON.stringify({
        question: question == null ? '' : String(question),
        scope,
        terminalId,
      }),
    }),

  documentList: (q = '', { page, pageSize, limit, status, docType, offset } = {}) =>
    fetchJson(
      `/api/tank-documents${qs({
        q: q || undefined,
        page,
        pageSize,
        limit,
        status: status && status !== 'all' ? status : undefined,
        docType: docType && docType !== 'all' ? docType : undefined,
        offset,
      })}`
    ),

  documentSummary: ({ q = '', status, docType } = {}) =>
    fetchJson(
      `/api/tank-documents/summary${qs({
        q: q || undefined,
        status: status && status !== 'all' ? status : undefined,
        docType: docType && docType !== 'all' ? docType : undefined,
      })}`
    ),

  documentGet: (id) =>
    fetchJson(`/api/tank-documents/${encodeURIComponent(String(id))}`),

  documentCreate: (payload) =>
    fetchJson('/api/tank-documents', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }),

  documentUpdate: (id, payload) =>
    fetchJson(`/api/tank-documents/${encodeURIComponent(String(id))}`, {
      method: 'PUT',
      body: JSON.stringify(payload || {}),
    }),

  documentDelete: (id) =>
    fetchJson(`/api/tank-documents/${encodeURIComponent(String(id))}`, {
      method: 'DELETE',
    }),

  documentImport: (rows) =>
    fetchJson('/api/tank-documents/import', {
      method: 'POST',
      body: JSON.stringify({ rows: Array.isArray(rows) ? rows : [] }),
    }),

  documentUploadFile: (id, type, file) => {
    const fd = new FormData();
    fd.append('file', file);
    return fetchJson(`/api/tank-documents/${encodeURIComponent(String(id))}/upload/${encodeURIComponent(String(type))}`, {
      method: 'POST',
      body: fd,
      headers: {},
    });
  },

  documentDeleteFile: (id, type) =>
    fetchJson(
      `/api/tank-documents/${encodeURIComponent(String(id))}/upload/${encodeURIComponent(String(type))}?mode=delete`,
      { method: 'POST' }
    ),

  documentFileUrl: (id, type) =>
    `${BASE_URL}/api/tank-documents/${encodeURIComponent(String(id))}/file/${encodeURIComponent(String(type))}`,

  documentFileHead: async (id, type) => {
    const resp = await fetchRaw(
      `/api/tank-documents/${encodeURIComponent(String(id))}/file/${encodeURIComponent(String(type))}`,
      { method: 'GET' }
    );
    if (!resp.ok) {
      const json = await resp.json().catch(() => ({}));
      throw new Error(json.error || json.message || resp.statusText || `HTTP ${resp.status}`);
    }
    return resp;
  },
};