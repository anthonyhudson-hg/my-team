const token = new URLSearchParams(location.search).get('token') ?? '';

const el = {
  loading: document.getElementById('loading'),
  onboarding: document.getElementById('onboarding'),
  cliMissing: document.getElementById('onboarding-cli-missing'),
  notAuthenticated: document.getElementById('onboarding-not-authenticated'),
  checkAgain: document.getElementById('check-again'),
  profileSetup: document.getElementById('profile-setup'),
  profileForm: document.getElementById('profile-form'),
  profileCompany: document.getElementById('profile-company'),
  profileMission: document.getElementById('profile-mission'),
  profileCancel: document.getElementById('profile-cancel'),
  dashboard: document.getElementById('dashboard'),
  accountLine: document.getElementById('account-line'),
  companyLine: document.getElementById('company-line'),
  editProfile: document.getElementById('edit-profile'),
  messages: document.getElementById('messages'),
  form: document.getElementById('chat-form'),
  input: document.getElementById('chat-input'),
};

let lastProfile = null;

function api(path, options = {}) {
  return fetch(path, {
    ...options,
    headers: { ...(options.headers ?? {}), 'X-My-Team-Token': token },
  });
}

function show(section) {
  el.loading.hidden = true;
  el.onboarding.hidden = section !== 'onboarding';
  el.profileSetup.hidden = section !== 'profile-setup';
  el.dashboard.hidden = section !== 'dashboard';
}

function renderCompanyLine(profile) {
  el.companyLine.textContent = profile ? `\u{00B7} ${profile.companyName}` : '';
}

function populateProfileForm(profile) {
  el.profileCompany.value = profile?.companyName ?? '';
  el.profileMission.value = profile?.mission ?? '';
  el.profileCancel.hidden = !profile;
}

async function checkStatus() {
  el.loading.hidden = false;
  el.onboarding.hidden = true;
  el.profileSetup.hidden = true;
  el.dashboard.hidden = true;
  const res = await api('/api/status');
  const result = await res.json();

  if (result.ok) {
    const info = result.accountInfo;
    el.accountLine.textContent = `Logged in as ${info.email ?? 'unknown'}${info.subscriptionType ? ` (${info.subscriptionType})` : ''}`;
    lastProfile = result.profile;

    if (!lastProfile) {
      populateProfileForm(null);
      show('profile-setup');
    } else {
      renderCompanyLine(lastProfile);
      show('dashboard');
    }
    return;
  }

  el.cliMissing.hidden = result.reason !== 'cli-missing';
  el.notAuthenticated.hidden = result.reason !== 'not-authenticated';
  show('onboarding');
}

el.checkAgain.addEventListener('click', checkStatus);

el.profileForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const companyName = el.profileCompany.value.trim();
  const mission = el.profileMission.value.trim();
  if (!companyName || !mission) return;

  const res = await api('/api/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ companyName, mission }),
  });
  if (!res.ok) return;

  lastProfile = { companyName, mission };
  renderCompanyLine(lastProfile);
  show('dashboard');
});

el.editProfile.addEventListener('click', () => {
  populateProfileForm(lastProfile);
  show('profile-setup');
});

el.profileCancel.addEventListener('click', () => {
  show('dashboard');
});

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
