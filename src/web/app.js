const token = new URLSearchParams(location.search).get('token') ?? '';

const el = {
  loading: document.getElementById('loading'),
  onboarding: document.getElementById('onboarding'),
  cliMissing: document.getElementById('onboarding-cli-missing'),
  notAuthenticated: document.getElementById('onboarding-not-authenticated'),
  checkAgain: document.getElementById('check-again'),
  dashboard: document.getElementById('dashboard'),
  accountLine: document.getElementById('account-line'),
  messages: document.getElementById('messages'),
  form: document.getElementById('chat-form'),
  input: document.getElementById('chat-input'),
};

function api(path, options = {}) {
  return fetch(path, {
    ...options,
    headers: { ...(options.headers ?? {}), 'X-My-Team-Token': token },
  });
}

function show(section) {
  el.loading.hidden = true;
  el.onboarding.hidden = section !== 'onboarding';
  el.dashboard.hidden = section !== 'dashboard';
}

async function checkStatus() {
  el.loading.hidden = false;
  el.onboarding.hidden = true;
  el.dashboard.hidden = true;
  const res = await api('/api/status');
  const result = await res.json();

  if (result.ok) {
    const info = result.accountInfo;
    el.accountLine.textContent = `Logged in as ${info.email ?? 'unknown'}${info.subscriptionType ? ` (${info.subscriptionType})` : ''}`;
    show('dashboard');
    return;
  }

  el.cliMissing.hidden = result.reason !== 'cli-missing';
  el.notAuthenticated.hidden = result.reason !== 'not-authenticated';
  show('onboarding');
}

el.checkAgain.addEventListener('click', checkStatus);

function appendMessage(className, text) {
  const div = document.createElement('div');
  div.className = `msg ${className}`;
  div.textContent = text;
  el.messages.appendChild(div);
  el.messages.scrollTop = el.messages.scrollHeight;
  return div;
}

async function sendMessage(message) {
  appendMessage('user', message);
  const assistantEl = appendMessage('assistant', '');
  let assistantText = '';

  const res = await api('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });

  if (!res.ok || !res.body) {
    appendMessage('error', `Request failed (${res.status})`);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sepIndex;
    while ((sepIndex = buffer.indexOf('\n\n')) !== -1) {
      const frame = buffer.slice(0, sepIndex);
      buffer = buffer.slice(sepIndex + 2);
      const line = frame.split('\n').find((l) => l.startsWith('data: '));
      if (!line) continue;
      const event = JSON.parse(line.slice('data: '.length));

      if (event.type === 'text') {
        assistantText += event.text;
        assistantEl.textContent = assistantText;
      } else if (event.type === 'tool-use') {
        appendMessage('tool', `\u{1F527} using tool: ${event.name}`);
      } else if (event.type === 'error') {
        appendMessage('error', event.message);
      }
    }
  }
}

el.form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const message = el.input.value.trim();
  if (!message) return;
  el.input.value = '';
  el.input.disabled = true;
  try {
    await sendMessage(message);
  } finally {
    el.input.disabled = false;
    el.input.focus();
  }
});

checkStatus();
