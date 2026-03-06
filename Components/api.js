const BASE_URL = 'https://gaslevel-alfanar.soniciot.com';

async function fetchJson(path, options = {}) {
  const resp = await fetch(`${BASE_URL}${path}`, {
    cache: 'no-store',
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(json.error || json.message || resp.statusText || `HTTP ${resp.status}`);
  return json;
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

  login: (username, password) =>
    fetchJson('/api/login', { method: 'POST', body: JSON.stringify({ username, password }) }),

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
};