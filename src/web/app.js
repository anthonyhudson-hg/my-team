const token = new URLSearchParams(location.search).get('token') ?? '';

const el = {
  loading: document.getElementById('loading'),
  onboarding: document.getElementById('onboarding'),
  cliMissing: document.getElementById('onboarding-cli-missing'),
  notAuthenticated: document.getElementById('onboarding-not-authenticated'),
  checkAgain: document.getElementById('check-again'),
  appShell: document.getElementById('app-shell'),

  updateBanner: document.getElementById('update-banner'),
  updateBannerText: document.getElementById('update-banner-text'),
  updateBannerButton: document.getElementById('update-banner-button'),
  updateBannerDismiss: document.getElementById('update-banner-dismiss'),

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
  sendButton: document.getElementById('chat-send'),

  profileForm: document.getElementById('profile-form'),
  profileCompany: document.getElementById('profile-company'),
  profileMission: document.getElementById('profile-mission'),
  profileCeoName: document.getElementById('profile-ceo-name'),
  profileCeoPersonality: document.getElementById('profile-ceo-personality'),
  profileDefaultModel: document.getElementById('profile-default-model'),
  profileDefaultEffort: document.getElementById('profile-default-effort'),
  profileSavedHint: document.getElementById('profile-saved-hint'),

  chatModelSelect: document.getElementById('chat-model-select'),
  chatEffortSelect: document.getElementById('chat-effort-select'),

  settingsAccount: document.getElementById('settings-account'),
  settingsLogPath: document.getElementById('settings-log-path'),
};

let lastProfile = null;
let lastAccountInfo = null;
let lastModels = [];
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

function modelDisplayName(value) {
  return lastModels.find((m) => m.value === value)?.displayName ?? value;
}

// No synthetic "use the default" placeholder here — the SDK's own
// supportedModels() list already includes a real "default" entry
// (displayName "Default (recommended)") that itself supports effort
// levels. A separate blank option would be a confusing near-duplicate and
// would incorrectly read as "no model supports effort" to the effort
// selector below, since '' never matches a real model.
function populateModelSelect(selectEl) {
  selectEl.innerHTML = '';
  for (const model of lastModels) {
    const opt = document.createElement('option');
    opt.value = model.value;
    opt.textContent = model.displayName;
    selectEl.appendChild(opt);
  }
}

// Effort options are constrained to what the selected model actually
// supports (confirmed via the SDK's supportedModels() data — e.g. Haiku
// supports no effort levels at all) so a silent downgrade shouldn't occur
// in practice; the UI simply never offers an invalid combination.
function populateEffortSelect(selectEl, modelValue, blankLabel) {
  const info = lastModels.find((m) => m.value === modelValue);
  selectEl.innerHTML = '';
  if (!info?.supportsEffort) {
    selectEl.disabled = true;
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'N/A';
    selectEl.appendChild(opt);
    return;
  }
  selectEl.disabled = false;
  const blank = document.createElement('option');
  blank.value = '';
  blank.textContent = blankLabel;
  selectEl.appendChild(blank);
  for (const level of info.supportedEffortLevels ?? []) {
    const opt = document.createElement('option');
    opt.value = level;
    opt.textContent = level;
    selectEl.appendChild(opt);
  }
}

function setupModelSelectors() {
  populateModelSelect(el.chatModelSelect);
  populateModelSelect(el.profileDefaultModel);

  // Assigning select.value a string that matches no <option> clears the
  // selection entirely (selectedIndex -1) rather than falling back to the
  // first option — only assign when there's a real saved default to apply.
  if (lastProfile?.defaultModel) el.chatModelSelect.value = lastProfile.defaultModel;
  populateEffortSelect(el.chatEffortSelect, el.chatModelSelect.value, 'Default effort');
  if (lastProfile?.defaultEffort) el.chatEffortSelect.value = lastProfile.defaultEffort;
}

el.chatModelSelect.addEventListener('change', () => {
  populateEffortSelect(el.chatEffortSelect, el.chatModelSelect.value, 'Default effort');
});

el.profileDefaultModel.addEventListener('change', () => {
  populateEffortSelect(el.profileDefaultEffort, el.profileDefaultModel.value, 'Default');
});

function populateProfileForm(profile) {
  el.profileCompany.value = profile?.companyName ?? '';
  el.profileMission.value = profile?.mission ?? '';
  el.profileCeoName.value = profile?.ceoName ?? '';
  el.profileCeoPersonality.value = profile?.ceoPersonality ?? '';
  if (profile?.defaultModel) el.profileDefaultModel.value = profile.defaultModel;
  populateEffortSelect(el.profileDefaultEffort, el.profileDefaultModel.value, 'Default');
  if (profile?.defaultEffort) el.profileDefaultEffort.value = profile.defaultEffort;
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

async function checkForUpdateBanner(retriesLeft) {
  const res = await api('/api/meta');
  metaCache = await res.json();

  if (metaCache.updateInfo?.updateAvailable) {
    el.updateBannerText.textContent = `A new version of my-team is available (v${metaCache.updateInfo.latestVersion}).`;
    el.updateBanner.hidden = false;
  } else if (!metaCache.updateInfo && retriesLeft > 0) {
    // The registry check runs in the background at server startup and may
    // not have resolved yet — try once more shortly rather than never
    // showing the banner this session.
    setTimeout(() => checkForUpdateBanner(retriesLeft - 1), 3000);
  }
}

el.updateBannerButton.addEventListener('click', async () => {
  el.updateBannerButton.disabled = true;
  el.updateBannerButton.textContent = 'Updating…';
  const res = await api('/api/update', { method: 'POST' });
  const result = await res.json();
  if (result.ok) {
    el.updateBannerText.textContent = 'Updated — restart (stop and run "npm run team" again) to use the new version.';
    el.updateBannerButton.hidden = true;
  } else {
    el.updateBannerButton.disabled = false;
    el.updateBannerButton.textContent = 'Update';
    el.updateBannerText.textContent = 'Update failed — check the terminal for details.';
  }
});

el.updateBannerDismiss.addEventListener('click', () => {
  el.updateBanner.hidden = true;
});

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
    lastModels = result.models ?? [];
    renderProfileUI(lastProfile);
    setupModelSelectors();
    el.appShell.hidden = false;
    setStatus('online');
    selectPage('messages');
    checkForUpdateBanner(1);

    const hasHistory = await loadHistory();
    // Only auto-kick off onboarding on a genuinely blank slate — if history
    // replay already left an open, answerable widget (the conversation
    // stopped mid-question last time), let the user respond to that instead
    // of firing a second, duplicate kickoff on top of it.
    if (!lastProfile?.onboardingComplete && !onboardingKickedOff && !hasHistory) {
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
      defaultModel: el.profileDefaultModel.value,
      defaultEffort: el.profileDefaultEffort.value,
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

function appendMessageRow(kind, name, avatarText, text, tsOverride) {
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
  const d = tsOverride ? new Date(tsOverride) : new Date();
  time.textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

function appendUserMessage(text, ts) {
  appendMessageRow('user', 'You', 'Y', text, ts);
}

let pendingWidgetCount = 0;

function setPendingWidget(delta) {
  pendingWidgetCount = Math.max(0, pendingWidgetCount + delta);
  el.input.disabled = pendingWidgetCount > 0;
  el.sendButton.disabled = pendingWidgetCount > 0;
  if (pendingWidgetCount === 0) el.input.focus();
}

const WIDGET_OPEN_FENCE = '```question-widget';

// Incremental parser: processes streamed text chunks as they arrive rather
// than re-parsing the full accumulated text on every delta. This matters for
// two reasons — (1) a widget block mid-stream would otherwise flash raw JSON
// before its closing fence arrives, and (2) naively re-rendering the whole
// message on every delta would wipe out a widget the user already answered
// if more text streams in afterward.
class AssistantContentRenderer {
  constructor(containerEl) {
    this.container = containerEl;
    this.state = 'text';
    this.buffer = '';
    this.textSegmentEl = null;
    this.textRaw = '';
    this.widgetPlaceholderEl = null;
    this.widgetRaw = '';
  }

  push(deltaText) {
    this.buffer += deltaText;
    for (;;) {
      if (this.state === 'text') {
        const fenceIdx = this.buffer.indexOf(WIDGET_OPEN_FENCE);
        if (fenceIdx === -1) {
          // Hold back a tail as long as the marker minus one character —
          // deltas arrive token-by-token, so the marker itself can easily
          // be split across chunks (e.g. one delta ending "``" and the next
          // starting "`question-widget"). Flushing eagerly would render the
          // first half as plain text before the second half ever confirms
          // it was a fence, and the marker would never be recognized.
          const safeLen = Math.max(0, this.buffer.length - (WIDGET_OPEN_FENCE.length - 1));
          const toFlush = this.buffer.slice(0, safeLen);
          this.buffer = this.buffer.slice(safeLen);
          if (toFlush) {
            if (!this.textSegmentEl) {
              this.textSegmentEl = document.createElement('div');
              this.textSegmentEl.className = 'msg-text-segment';
              this.container.appendChild(this.textSegmentEl);
            }
            this.textRaw += toFlush;
            this.textSegmentEl.innerHTML = renderMarkdown(this.textRaw);
          }
          return;
        }
        if (fenceIdx > 0 || this.textRaw) {
          if (!this.textSegmentEl) {
            this.textSegmentEl = document.createElement('div');
            this.textSegmentEl.className = 'msg-text-segment';
            this.container.appendChild(this.textSegmentEl);
          }
          this.textRaw += this.buffer.slice(0, fenceIdx);
          this.textSegmentEl.innerHTML = renderMarkdown(this.textRaw);
        }
        this.textSegmentEl = null;
        this.textRaw = '';
        this.buffer = this.buffer.slice(fenceIdx + WIDGET_OPEN_FENCE.length);
        this.state = 'in-widget';
        this.widgetRaw = '';
        this.widgetPlaceholderEl = document.createElement('div');
        this.widgetPlaceholderEl.className = 'question-widget-placeholder';
        this.widgetPlaceholderEl.textContent = 'Preparing a question…';
        this.container.appendChild(this.widgetPlaceholderEl);
      } else {
        const closeIdx = this.buffer.indexOf('```');
        if (closeIdx === -1) {
          // Same tail-holding logic for the closing fence (3 chars).
          const safeLen = Math.max(0, this.buffer.length - 2);
          this.widgetRaw += this.buffer.slice(0, safeLen);
          this.buffer = this.buffer.slice(safeLen);
          return;
        }
        this.widgetRaw += this.buffer.slice(0, closeIdx);
        this.buffer = this.buffer.slice(closeIdx + 3);
        this.state = 'text';
        this.renderWidget(this.widgetRaw);
      }
    }
  }

  renderWidget(rawJson) {
    let data;
    try {
      data = JSON.parse(rawJson);
    } catch {
      // Malformed JSON from the model — show the raw text rather than
      // silently dropping it, so a parsing failure is at least visible.
      this.widgetPlaceholderEl.textContent = rawJson.trim();
      this.widgetPlaceholderEl.className = 'msg-text-segment';
      this.widgetPlaceholderEl = null;
      return;
    }
    setPendingWidget(1);
    let answered = false;
    const widgetEl = createQuestionWidget(data, (messageText) => {
      if (answered) return;
      answered = true;
      setPendingWidget(-1);
      streamChat(messageText, { showUserBubble: false, isWidgetAnswer: true });
    });
    this.widgetPlaceholderEl.replaceWith(widgetEl);
    this.widgetPlaceholderEl = null;
  }

  finish() {
    // No more text is coming, so anything still held back as a possible
    // partial fence match is definitely not one — flush it as plain text.
    if (this.state === 'text' && this.buffer) {
      if (!this.textSegmentEl) {
        this.textSegmentEl = document.createElement('div');
        this.textSegmentEl.className = 'msg-text-segment';
        this.container.appendChild(this.textSegmentEl);
      }
      this.textRaw += this.buffer;
      this.textSegmentEl.innerHTML = renderMarkdown(this.textRaw);
      this.buffer = '';
    }
    // A block left unterminated when the turn ends (shouldn't normally
    // happen) — show what was received rather than leaving a permanent
    // "Preparing a question…" placeholder with no way to proceed.
    if (this.state === 'in-widget' && this.widgetPlaceholderEl) {
      this.widgetPlaceholderEl.textContent = `${WIDGET_OPEN_FENCE}\n${this.widgetRaw}${this.buffer}`;
      this.widgetPlaceholderEl.className = 'msg-text-segment';
    }
  }
}

// lockedAnswer renders the widget immediately in its answered state with no
// interactive controls — used when replaying history, since the underlying
// SDK session has already moved past that turn and re-answering it live
// would be meaningless (or worse, confusing) rather than just cosmetic.
function createQuestionWidget(data, onAnswer, lockedAnswer) {
  const card = document.createElement('div');
  card.className = 'question-widget';

  const questionEl = document.createElement('div');
  questionEl.className = 'question-widget-question';
  questionEl.textContent = data.question ?? 'Question';
  card.appendChild(questionEl);

  const body = document.createElement('div');
  body.className = 'question-widget-body';
  card.appendChild(body);

  function submit(displayText, messageText) {
    card.classList.add('answered');
    body.innerHTML = '';
    const answerEl = document.createElement('div');
    answerEl.className = 'question-widget-answer';
    answerEl.textContent = displayText;
    body.appendChild(answerEl);
    if (onAnswer) onAnswer(messageText ?? displayText);
  }

  if (lockedAnswer != null) {
    submit(lockedAnswer, lockedAnswer);
    return card;
  }

  function buildOtherRow(placeholder) {
    const row = document.createElement('div');
    row.className = 'question-widget-row question-widget-other';
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = placeholder;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Send';
    row.appendChild(input);
    row.appendChild(btn);
    const trigger = () => {
      const val = input.value.trim();
      if (val) submit(val, val);
    };
    btn.addEventListener('click', trigger);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') trigger();
    });
    return row;
  }

  const type = data.type;
  const options = Array.isArray(data.options) ? data.options : [];

  if (type === 'single_select') {
    for (const opt of options) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'question-widget-option';
      btn.textContent = opt;
      btn.addEventListener('click', () => submit(opt, opt));
      body.appendChild(btn);
    }
    body.appendChild(buildOtherRow('Other…'));
  } else if (type === 'multi_select') {
    const checkboxes = [];
    for (const opt of options) {
      const label = document.createElement('label');
      label.className = 'question-widget-checkbox-label';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = opt;
      checkboxes.push(cb);
      label.appendChild(cb);
      label.appendChild(document.createTextNode(opt));
      body.appendChild(label);
    }
    const otherInput = document.createElement('input');
    otherInput.type = 'text';
    otherInput.placeholder = 'Other (optional)…';
    otherInput.className = 'question-widget-other-inline';
    body.appendChild(otherInput);

    const submitBtn = document.createElement('button');
    submitBtn.type = 'button';
    submitBtn.className = 'question-widget-submit';
    submitBtn.textContent = 'Submit';
    submitBtn.addEventListener('click', () => {
      const selected = checkboxes.filter((c) => c.checked).map((c) => c.value);
      const other = otherInput.value.trim();
      if (other) selected.push(other);
      if (!selected.length) return;
      const display = selected.join(', ');
      submit(display, display);
    });
    body.appendChild(submitBtn);
  } else {
    // 'text', or an unrecognized type — a free-text prompt never silently drops the question.
    body.appendChild(buildOtherRow('Type your answer…'));
  }

  return card;
}

function appendAssistantRow(turnMeta) {
  const result = appendMessageRow('assistant', lastProfile?.ceoName || 'your AI CEO', getCeoInitial(), '');
  if (turnMeta?.model) {
    const badge = document.createElement('span');
    badge.className = 'msg-model-badge';
    const modelLabel = modelDisplayName(turnMeta.model);
    badge.textContent = turnMeta.effort ? `${modelLabel} · ${turnMeta.effort}` : modelLabel;
    result.row.querySelector('.msg-meta').appendChild(badge);
  }
  result.renderer = new AssistantContentRenderer(result.textEl);
  return result;
}

function appendToolMessage(name, ts) {
  appendMessageRow('tool', 'System', '⚙', `Using tool: ${name}`, ts);
}

function appendErrorMessage(message, ts) {
  appendMessageRow('error', 'Error', '!', message, ts);
}

// One-shot counterpart to AssistantContentRenderer for replaying a
// message whose full text is already known (history) rather than
// streaming in — a single regex pass is fine here since there's no
// "flash of raw JSON" or "wipe answered state" risk on a fully-formed string.
// liveOnAnswer is only passed for a trailing, never-answered widget at the
// very end of history (the conversation was interrupted — e.g. server
// restarted — before the founder responded). That one genuinely needs to
// keep working exactly like a live pending widget, composer gating
// included, rather than being either dead-looking (locked) or clickable but
// silently doing nothing (no answer handler).
function renderStaticAssistantText(container, fullText, lockedAnswer, liveOnAnswer) {
  const re = /```question-widget\s*\n([\s\S]*?)\n```/;
  const match = fullText.match(re);
  if (!match) {
    const seg = document.createElement('div');
    seg.className = 'msg-text-segment';
    seg.innerHTML = renderMarkdown(fullText);
    container.appendChild(seg);
    return;
  }

  const before = fullText.slice(0, match.index);
  const after = fullText.slice(match.index + match[0].length);

  if (before.trim()) {
    const seg = document.createElement('div');
    seg.className = 'msg-text-segment';
    seg.innerHTML = renderMarkdown(before);
    container.appendChild(seg);
  }

  let data = null;
  try {
    data = JSON.parse(match[1]);
  } catch {
    const seg = document.createElement('div');
    seg.className = 'msg-text-segment';
    seg.textContent = match[1].trim();
    container.appendChild(seg);
  }
  if (data) {
    if (lockedAnswer != null) {
      container.appendChild(createQuestionWidget(data, null, lockedAnswer));
    } else if (liveOnAnswer) {
      setPendingWidget(1);
      let answered = false;
      const widgetEl = createQuestionWidget(data, (messageText) => {
        if (answered) return;
        answered = true;
        setPendingWidget(-1);
        liveOnAnswer(messageText);
      });
      container.appendChild(widgetEl);
    } else {
      // Shouldn't normally happen (an unanswered widget anywhere but the
      // last entry would mean the conversation continued without it ever
      // being answered) — render inert rather than a dead-looking control.
      container.appendChild(createQuestionWidget(data, null, '(not answered)'));
    }
  }

  if (after.trim()) {
    const seg = document.createElement('div');
    seg.className = 'msg-text-segment';
    seg.innerHTML = renderMarkdown(after);
    container.appendChild(seg);
  }
}

async function loadHistory() {
  const res = await api('/api/chat/history');
  const { history } = await res.json();

  for (let i = 0; i < history.length; i++) {
    const entry = history[i];
    if (entry.kind === 'user') {
      appendUserMessage(entry.text, entry.ts);
    } else if (entry.kind === 'widget-answer') {
      // Consumed by the preceding assistant entry's widget below — a live
      // widget answer never gets its own bubble either.
      continue;
    } else if (entry.kind === 'tool') {
      appendToolMessage(entry.name, entry.ts);
    } else if (entry.kind === 'error') {
      appendErrorMessage(entry.message, entry.ts);
    } else if (entry.kind === 'assistant') {
      const { row, textEl } = appendMessageRow(
        'assistant',
        lastProfile?.ceoName || 'your AI CEO',
        getCeoInitial(),
        '',
        entry.ts,
      );
      if (entry.model) {
        const badge = document.createElement('span');
        badge.className = 'msg-model-badge';
        const modelLabel = modelDisplayName(entry.model);
        badge.textContent = entry.effort ? `${modelLabel} · ${entry.effort}` : modelLabel;
        row.querySelector('.msg-meta').appendChild(badge);
      }
      const next = history[i + 1];
      const lockedAnswer = next?.kind === 'widget-answer' ? next.text : null;
      const isTrailingUnanswered = i === history.length - 1 && !lockedAnswer;
      renderStaticAssistantText(
        textEl,
        entry.text,
        lockedAnswer,
        isTrailingUnanswered ? (messageText) => streamChat(messageText, { showUserBubble: false, isWidgetAnswer: true }) : null,
      );
    }
  }

  return history.length > 0;
}

function showTypingIndicator() {
  el.typingAvatar.textContent = getCeoInitial();
  el.typingIndicator.hidden = false;
  el.messages.scrollTop = el.messages.scrollHeight;
}

function hideTypingIndicator() {
  el.typingIndicator.hidden = true;
}

async function streamChat(message, { showUserBubble, isWidgetAnswer }) {
  if (showUserBubble) appendUserMessage(message);
  showTypingIndicator();
  setStatus('typing');

  let assistantRenderer = null;
  let sawContent = false;
  let turnMeta = null;

  const res = await api('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      model: el.chatModelSelect.value,
      effort: el.chatEffortSelect.value,
      isWidgetAnswer: isWidgetAnswer === true,
    }),
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

      if (event.type === 'meta') {
        turnMeta = { model: event.model, effort: event.effort };
      } else if (event.type === 'text-delta') {
        if (!sawContent) {
          hideTypingIndicator();
          sawContent = true;
        }
        if (!assistantRenderer) {
          assistantRenderer = appendAssistantRow(turnMeta).renderer;
        }
        assistantRenderer.push(event.text);
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

  assistantRenderer?.finish();
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
  el.sendButton.disabled = true;
  try {
    await streamChat(message, { showUserBubble: true });
  } finally {
    // A widget the model asked as part of this same turn may still be
    // unanswered — setPendingWidget already owns disabling in that case,
    // so only re-enable here if nothing is pending.
    if (pendingWidgetCount === 0) {
      el.input.disabled = false;
      el.sendButton.disabled = false;
      el.input.focus();
    }
  }
});

checkStatus();
