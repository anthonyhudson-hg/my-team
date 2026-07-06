const token = new URLSearchParams(location.search).get('token') ?? '';
const JSON_HEADERS = { 'Content-Type': 'application/json' };

function request(path, options = {}) {
  return fetch(path, { ...options, headers: { ...(options.headers ?? {}), 'X-My-Team-Token': token } });
}

async function requestJson(path, options) {
  const res = await request(path, options);
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

function postJson(path, data) {
  return requestJson(path, { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(data) });
}

export const api = {
  status: () => requestJson('/api/status'),
  meta: () => requestJson('/api/meta'),
  update: () => requestJson('/api/update', { method: 'POST' }),
  reset: () => requestJson('/api/reset', { method: 'POST' }),
  chatHistory: () => requestJson('/api/chat/history'),
  /** Raw Response (not parsed JSON) — the caller reads it as an SSE stream. */
  chatStream: (payload) => request('/api/chat', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(payload) }),
  profile: {
    get: () => requestJson('/api/profile'),
    save: (data) => postJson('/api/profile', data),
  },
  uiPrefs: {
    get: () => requestJson('/api/ui-prefs'),
    save: (patch) => postJson('/api/ui-prefs', patch),
  },
  general: {
    history: () => requestJson('/api/general/history'),
    send: (text, name) => postJson('/api/general', { text, name }),
  },
  files: {
    list: () => requestJson('/api/files'),
    detail: (relPath) => requestJson(`/api/files/detail?path=${encodeURIComponent(relPath)}`),
  },
};
