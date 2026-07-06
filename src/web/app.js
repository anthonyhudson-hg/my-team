const token = new URLSearchParams(location.search).get('token') ?? '';

const el = {
  loading: document.getElementById('loading'),
  onboarding: document.getElementById('onboarding'),
  cliMissing: document.getElementById('onboarding-cli-missing'),
  notAuthenticated: document.getElementById('onboarding-not-authenticated'),
  checkAgain: document.getElementById('check-again'),
  appShell: document.getElementById('app-shell'),

  railHome: document.getElementById('rail-home'),
  railMessages: document.getElementById('rail-messages'),
  railProfile: document.getElementById('rail-profile'),
  railSettings: document.getElementById('rail-settings'),

  pageHome: document.getElementById('page-home'),
  pageMessages: document.getElementById('page-messages'),
  pageProfile: document.getElementById('page-profile'),
  pageSettings: document.getElementById('page-settings'),

  homeAvatar: document.getElementById('home-avatar'),
  homeGreeting: document.getElementById('home-greeting'),
  homeSub: document.getElementById('home-sub'),
  homeGoMessages: document.getElementById('home-go-messages'),

  workspaceName: document.getElementById('workspace-name'),
  navGeneral: document.getElementById('nav-general'),
  navCeo: document.getElementById('nav-ceo'),
  ceoAvatar: document.getElementById('ceo-avatar'),
  ceoNavName: document.getElementById('ceo-nav-name'),
  ceoStatusDot: document.getElementById('ceo-status-dot'),
  channelTitle: document.getElementById('channel-title'),
  channelSubtitle: document.getElementById('channel-subtitle'),
  channelGeneral: document.getElementById('channel-general'),
  channelCeo: document.getElementById('channel-ceo'),
  messages: document.getElementById('messages'),
  typingIndicator: document.getElementById('typing-indicator'),
  typingAvatar: document.getElementById('typing-avatar'),
  form: document.getElementById('chat-form'),
  input: document.getElementById('chat-input'),

  profileForm: document.getElementById('profile-form'),
  profileCompany: document.getElementById('profile-company'),
  profileMission: document.getElementById('profile-mission'),
  profileCeoName: document.getElementById('profile-ceo-name'),
  profileCeoPersonality: document.getElementById('profile-ceo-personality'),
  profileSavedHint: document.getElementById('profile-saved-hint'),

  settingsAccount: document.getElementById('settings-account'),
  settingsLogPath: document.getElementById('settings-log-path'),
};

let lastProfile = null;
let lastAccountInfo = null;
let onboardingKickedOff = false;
let currentPage = 'messages';
let currentChannel = 'ceo';
let statusState = 'offline';
let metaCache = null;

function api(path, options = {}) {
  return fetch(path, {
    ...options,
    headers: { ...(options.headers ?? {}), 'X-My-Team-Token': token },
  });
}

function getCeoInitial() {
  const name = lastProfile?.ceoName;
  return name && name !== 'your AI CEO' ? name.trim()[0].toUpperCase() : '?';
}

function renderProfileUI(profile) {
  el.workspaceName.textContent = profile?.companyName || 'my-team';
  const ceoName = profile?.ceoName || 'your AI CEO';
  el.ceoNavName.textContent = ceoName;
  el.ceoAvatar.textContent = getCeoInitial();
  if (currentPage === 'messages' && currentChannel === 'ceo') el.channelTitle.textContent = ceoName;
  if (currentPage === 'home') renderHomePage();
}

function setStatus(state) {
  statusState = state;
  el.ceoStatusDot.classList.remove('online', 'typing');
  if (state === 'online') el.ceoStatusDot.classList.add('online');
  else if (state === 'typing') el.ceoStatusDot.classList.add('typing');
  if (currentPage === 'messages' && currentChannel === 'ceo') {
    el.channelSubtitle.textContent = state === 'typing' ? 'Typing…' : state === 'online' ? 'Active' : 'Offline';
  }
}

function selectChannel(channel) {
  currentChannel = channel;
  el.navGeneral.classList.toggle('active', channel === 'general');
  el.navCeo.classList.toggle('active', channel === 'ceo');
  el.channelGeneral.hidden = channel !== 'general';
  el.channelCeo.hidden = channel !== 'ceo';
  if (channel === 'general') {
    el.channelTitle.textContent = '# general';
    el.channelSubtitle.textContent = '';
  } else {
    el.channelTitle.textContent = lastProfile?.ceoName || 'your AI CEO';
    setStatus(statusState);
  }
}

el.navGeneral.addEventListener('click', () => selectChannel('general'));
el.navCeo.addEventListener('click', () => selectChannel('ceo'));

function populateProfileForm(profile) {
  el.profileCompany.value = profile?.companyName ?? '';
  el.profileMission.value = profile?.mission ?? '';
  el.profileCeoName.value = profile?.ceoName ?? '';
  el.profileCeoPersonality.value = profile?.ceoPersonality ?? '';
}

function renderHomePage() {
  el.homeAvatar.textContent = getCeoInitial();
  const ceoName = lastProfile?.ceoName || 'your AI CEO';
  const companyName = lastProfile?.companyName;
  el.homeGreeting.textContent = companyName ? `Welcome to ${companyName}` : 'Welcome to my-team';
  el.homeSub.textContent = lastProfile?.onboardingComplete
    ? `${ceoName} is ready and waiting in Messages.`
    : `Head to Messages to finish setting up ${ceoName}.`;
}

async function renderSettingsPage() {
  el.settingsAccount.textContent = lastAccountInfo
    ? `${lastAccountInfo.email ?? 'unknown'}${lastAccountInfo.subscriptionType ? ` (${lastAccountInfo.subscriptionType})` : ''}`
    : 'unknown';
  if (!metaCache) {
    const res = await api('/api/meta');
    metaCache = await res.json();
  }
  el.settingsLogPath.textContent = metaCache.logFilePath;
}

function selectPage(page) {
  currentPage = page;
  el.railHome.classList.toggle('active', page === 'home');
  el.railMessages.classList.toggle('active', page === 'messages');
  el.railProfile.classList.toggle('active', page === 'profile');
  el.railSettings.classList.toggle('active', page === 'settings');
  el.pageHome.hidden = page !== 'home';
  el.pageMessages.hidden = page !== 'messages';
  el.pageProfile.hidden = page !== 'profile';
  el.pageSettings.hidden = page !== 'settings';

  if (page === 'home') renderHomePage();
  else if (page === 'profile') populateProfileForm(lastProfile);
  else if (page === 'settings') renderSettingsPage();
  else if (page === 'messages') selectChannel(currentChannel);
}

el.railHome.addEventListener('click', () => selectPage('home'));
el.railMessages.addEventListener('click', () => selectPage('messages'));
el.railProfile.addEventListener('click', () => selectPage('profile'));
el.railSettings.addEventListener('click', () => selectPage('settings'));
el.homeGoMessages.addEventListener('click', () => selectPage('messages'));

async function checkStatus() {
  el.loading.hidden = false;
  el.onboarding.hidden = true;
  el.appShell.hidden = true;

  const res = await api('/api/status');
  const result = await res.json();
  el.loading.hidden = true;

  if (result.ok) {
    lastAccountInfo = result.accountInfo;
    lastProfile = result.profile;
    renderProfileUI(lastProfile);
    el.appShell.hidden = false;
    setStatus('online');
    selectPage('messages');

    if (!lastProfile?.onboardingComplete && !onboardingKickedOff) {
      onboardingKickedOff = true;
      kickoffOnboarding();
    }
    return;
  }

  el.cliMissing.hidden = result.reason !== 'cli-missing';
  el.notAuthenticated.hidden = result.reason !== 'not-authenticated';
  el.onboarding.hidden = false;
}

el.checkAgain.addEventListener('click', checkStatus);

async function refreshProfileIfNeeded() {
  if (lastProfile?.onboardingComplete) return;
  const res = await api('/api/profile');
  const { profile } = await res.json();
  if (profile) {
    lastProfile = profile;
    renderProfileUI(profile);
  }
}

el.profileForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const companyName = el.profileCompany.value.trim();
  const mission = el.profileMission.value.trim();
  if (!companyName || !mission) return;

  const res = await api('/api/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      companyName,
      mission,
      ceoName: el.profileCeoName.value.trim(),
      ceoPersonality: el.profileCeoPersonality.value.trim(),
    }),
  });
  if (!res.ok) return;

  const profileRes = await api('/api/profile');
  const { profile } = await profileRes.json();
  lastProfile = profile;
  renderProfileUI(lastProfile);

  el.profileSavedHint.hidden = false;
  setTimeout(() => {
    el.profileSavedHint.hidden = true;
  }, 2000);
});

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// Minimal, safe markdown rendering: escape first, then convert a handful of
// common patterns. Applied to the full accumulated text on every streamed
// delta, so an unclosed marker mid-stream self-corrects once the closing
// marker arrives a moment later.
function renderMarkdown(text) {
  let html = escapeHtml(text);
  html = html.replace(/```([\s\S]*?)```/g, (_, code) => `<pre><code>${code}</code></pre>`);
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
  return html;
}

function appendMessageRow(kind, name, avatarText, text) {
  const row = document.createElement('div');
  row.className = `msg-row ${kind}`;

  const avatar = document.createElement('span');
  avatar.className = 'avatar';
  avatar.textContent = avatarText;

  const content = document.createElement('div');
  content.className = 'msg-content';

  const meta = document.createElement('div');
  meta.className = 'msg-meta';
  meta.textContent = name;
  const time = document.createElement('span');
  time.className = 'msg-time';
  time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  meta.appendChild(time);

  const textEl = document.createElement('div');
  textEl.className = 'msg-text';
  textEl.innerHTML = renderMarkdown(text);

  content.appendChild(meta);
  content.appendChild(textEl);
  row.appendChild(avatar);
  row.appendChild(content);
  el.messages.appendChild(row);
  el.messages.scrollTop = el.messages.scrollHeight;
  return { row, textEl };
}

function appendUserMessage(text) {
  appendMessageRow('user', 'You', 'Y', text);
}

function appendAssistantRow() {
  return appendMessageRow('assistant', lastProfile?.ceoName || 'your AI CEO', getCeoInitial(), '');
}

function appendToolMessage(name) {
  appendMessageRow('tool', 'System', '⚙', `Using tool: ${name}`);
}

function appendErrorMessage(message) {
  appendMessageRow('error', 'Error', '!', message);
}

function showTypingIndicator() {
  el.typingAvatar.textContent = getCeoInitial();
  el.typingIndicator.hidden = false;
  el.messages.scrollTop = el.messages.scrollHeight;
}

function hideTypingIndicator() {
  el.typingIndicator.hidden = true;
}

async function streamChat(message, { showUserBubble }) {
  if (showUserBubble) appendUserMessage(message);
  showTypingIndicator();
  setStatus('typing');

  let assistantTextEl = null;
  let assistantText = '';
  let sawContent = false;

  const res = await api('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });

  if (!res.ok || !res.body) {
    hideTypingIndicator();
    appendErrorMessage(`Request failed (${res.status})`);
    setStatus('offline');
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

      if (event.type === 'text-delta') {
        if (!sawContent) {
          hideTypingIndicator();
          sawContent = true;
        }
        if (!assistantTextEl) {
          assistantTextEl = appendAssistantRow().textEl;
        }
        assistantText += event.text;
        assistantTextEl.innerHTML = renderMarkdown(assistantText);
        el.messages.scrollTop = el.messages.scrollHeight;
      } else if (event.type === 'tool-use') {
        if (!sawContent) {
          hideTypingIndicator();
          sawContent = true;
        }
        appendToolMessage(event.name);
      } else if (event.type === 'error') {
        if (!sawContent) {
          hideTypingIndicator();
          sawContent = true;
        }
        appendErrorMessage(event.message);
        setStatus('offline');
      }
    }
  }

  hideTypingIndicator();
  if (statusState !== 'offline') setStatus('online');
  await refreshProfileIfNeeded();
}

function kickoffOnboarding() {
  return streamChat('Please begin the onboarding conversation.', { showUserBubble: false });
}

el.form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const message = el.input.value.trim();
  if (!message) return;
  el.input.value = '';
  el.input.disabled = true;
  try {
    await streamChat(message, { showUserBubble: true });
  } finally {
    el.input.disabled = false;
    el.input.focus();
  }
});

checkStatus();
