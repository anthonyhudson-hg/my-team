import { api } from '../api.js';
import { el, icon, mount } from '../dom.js';
import { ACCENTS, ACCENT_NAMES, THEMES, applyTheme, saveUiPrefs } from '../theme.js';

const THEME_PREVIEWS = {
  Contrast: { side: '#18181c', content: '#ffffff', line: 'rgba(0,0,0,.16)' },
  Light: { side: '#e9e9ee', content: '#ffffff', line: 'rgba(0,0,0,.13)' },
  Dark: { side: '#111114', content: '#17171b', line: 'rgba(255,255,255,.18)' },
};

function labeledRow(title, desc, control) {
  return el('div', { class: 'settings-row' }, [
    el('div', {}, [el('div', { class: 'settings-row-title', text: title }), desc ? el('div', { class: 'settings-row-desc', text: desc }) : null]),
    control,
  ]);
}

export function createSettingsPanel({ onDone, onReset }) {
  let profile = null;
  let accountInfo = null;
  let models = [];
  let uiPrefs = null;

  const founderInput = el('input', { class: 'settings-input', type: 'text', style: 'width:240px;' });
  const companyInput = el('input', { class: 'settings-input', type: 'text', style: 'width:240px;' });
  const missionInput = el('textarea', { class: 'settings-textarea', rows: 2 });
  const ceoNameInput = el('input', { class: 'settings-input', type: 'text', style: 'width:240px;' });
  const ceoPersonalityInput = el('input', { class: 'settings-input', type: 'text', style: 'width:240px;' });

  async function persistProfile() {
    const payload = {
      founderName: founderInput.value,
      companyName: companyInput.value,
      mission: missionInput.value,
      ceoName: ceoNameInput.value,
      ceoPersonality: ceoPersonalityInput.value,
      defaultModel: profile?.defaultModel ?? '',
      defaultEffort: profile?.defaultEffort ?? '',
    };
    const { body } = await api.profile.save(payload);
    if (body.profile !== undefined) profile = body.profile;
    else profile = { ...profile, ...payload };
  }

  for (const input of [founderInput, companyInput, ceoNameInput, ceoPersonalityInput]) input.addEventListener('change', persistProfile);
  missionInput.addEventListener('change', persistProfile);

  // ---- AI defaults ----
  let stMenuOpen = null;
  const modelMenu = el('div', { class: 'menu', style: 'top:calc(100% + 6px);right:0;width:252px;', hidden: true });
  const modelTriggerLabel = el('span', {});
  const modelTrigger = el('button', { class: 'settings-menu-trigger', type: 'button', onclick: () => toggleStMenu('model') }, [modelTriggerLabel, icon('caret-down', 'font-size:12px;color:var(--muted);')]);
  const effortMenu = el('div', { class: 'menu', style: 'top:calc(100% + 6px);right:0;width:196px;', hidden: true });
  const effortTriggerLabel = el('span', { style: 'text-transform:capitalize;' });
  const effortTrigger = el('button', { class: 'settings-menu-trigger', type: 'button', onclick: () => toggleStMenu('effort') }, [effortTriggerLabel, icon('caret-down', 'font-size:12px;color:var(--muted);')]);
  const effortLocked = el('div', { class: 'settings-locked' }, ['Default', el('span', { style: 'font-size:10.5px;font-weight:700;', text: 'Model-managed' })]);
  const stBackdrop = el('div', { class: 'menu-backdrop', hidden: true, onclick: () => toggleStMenu(null) });

  function toggleStMenu(which) {
    stMenuOpen = stMenuOpen === which ? null : which;
    stBackdrop.hidden = !stMenuOpen;
    modelMenu.hidden = stMenuOpen !== 'model';
    effortMenu.hidden = stMenuOpen !== 'effort';
    if (stMenuOpen === 'model') renderModelMenu();
    if (stMenuOpen === 'effort') renderEffortMenu();
  }

  function renderModelMenu() {
    mount(
      modelMenu,
      models.map((m) =>
        el('div', { class: 'menu-item', onclick: () => setModel(m) }, [
          icon('sparkle', 'font-size:15px;color:var(--accent);width:18px;text-align:center;flex:0 0 auto;'),
          el('div', { style: 'flex:1;min-width:0;' }, [el('div', { class: 'menu-item-title', text: m.displayName }), el('div', { class: 'menu-item-desc', text: m.description })]),
          profile?.defaultModel === m.value ? icon('check', 'font-size:14px;color:var(--accent);flex:0 0 auto;') : null,
        ]),
      ),
    );
  }

  function renderEffortMenu() {
    const model = models.find((m) => m.value === profile?.defaultModel);
    const levels = model?.supportedEffortLevels ?? [];
    mount(
      effortMenu,
      levels.map((level) =>
        el('div', { class: 'menu-item', onclick: () => setEffort(level) }, [
          el('span', { style: 'flex:1;min-width:0;font-size:13px;font-weight:600;color:var(--text);text-transform:capitalize;', text: level }),
          profile?.defaultEffort === level ? icon('check', 'font-size:14px;color:var(--accent);flex:0 0 auto;') : null,
        ]),
      ),
    );
  }

  function setModel(m) {
    const levels = m.supportedEffortLevels ?? [];
    profile = { ...profile, defaultModel: m.value, defaultEffort: levels.includes(profile?.defaultEffort) ? profile.defaultEffort : '' };
    toggleStMenu(null);
    refreshAiDefaults();
    persistProfile();
  }

  function setEffort(level) {
    profile = { ...profile, defaultEffort: level };
    toggleStMenu(null);
    refreshAiDefaults();
    persistProfile();
  }

  function refreshAiDefaults() {
    const model = models.find((m) => m.value === profile?.defaultModel);
    modelTriggerLabel.textContent = model?.displayName || 'Default (recommended)';
    const levels = model?.supportedEffortLevels ?? [];
    effortTrigger.hidden = levels.length === 0;
    effortLocked.hidden = levels.length > 0;
    effortTriggerLabel.textContent = profile?.defaultEffort || 'Default';
  }

  // ---- account ----
  const accountEmail = el('div', { style: 'font-size:12.5px;color:var(--muted);margin-top:2px;' });
  const planBadge = el('span', { class: 'badge-pill', style: 'letter-spacing:.03em;' });

  // ---- log file ----
  const logPathCode = el('code', { class: 'log-path-code' });
  const copyIcon = el('span', {}, [icon('copy', 'font-size:15px;')]);
  const copyButton = el('button', { class: 'icon-btn icon-btn-lg', type: 'button', style: 'border:1px solid var(--border-2);', onclick: copyLogPath }, [copyIcon]);
  let logPath = '';

  async function copyLogPath() {
    try {
      await navigator.clipboard.writeText(logPath);
    } catch {
      // Clipboard access can fail (permissions, insecure context) — the path is still visible to copy by hand.
    }
    copyIcon.replaceChildren(icon('check', 'font-size:15px;color:var(--success);'));
    setTimeout(() => copyIcon.replaceChildren(icon('copy', 'font-size:15px;')), 1500);
  }

  // ---- appearance ----
  const themeCardsRow = el('div', { style: 'display:flex;gap:10px;margin-top:11px;' });
  const accentRow = el('div', { style: 'display:flex;gap:13px;margin-top:11px;align-items:center;' });

  function renderAppearance() {
    mount(
      themeCardsRow,
      THEMES.map((name) => {
        const preview = THEME_PREVIEWS[name];
        const active = uiPrefs.theme === name;
        return el('button', { class: `theme-card${active ? ' active' : ''}`, type: 'button', onclick: () => setTheme(name) }, [
          el('div', { class: 'theme-card-preview' }, [
            el('div', { style: `width:26px;background:${preview.side};` }),
            el('div', { style: `flex:1;background:${preview.content};padding:8px 7px;display:flex;flex-direction:column;gap:4px;` }, [
              el('div', { style: `height:4px;width:72%;border-radius:2px;background:${preview.line};` }),
              el('div', { style: `height:4px;width:48%;border-radius:2px;background:${preview.line};` }),
            ]),
          ]),
          el('div', { class: 'theme-card-name', text: name }),
        ]);
      }),
    );
    mount(
      accentRow,
      ACCENTS.map((hex) => {
        const active = uiPrefs.accent === hex;
        return el('button', {
          class: 'accent-swatch',
          type: 'button',
          title: ACCENT_NAMES[hex],
          style: `background:${hex};box-shadow:${active ? `0 0 0 2px var(--card-bg),0 0 0 4px ${hex}` : '0 0 0 1px var(--border-2)'};`,
          onclick: () => setAccent(hex),
        });
      }),
    );
  }

  async function setTheme(name) {
    uiPrefs = await saveUiPrefs({ theme: name });
    applyTheme(uiPrefs.theme, uiPrefs.accent);
    renderAppearance();
  }

  async function setAccent(hex) {
    uiPrefs = await saveUiPrefs({ accent: hex });
    applyTheme(uiPrefs.theme, uiPrefs.accent);
    renderAppearance();
  }

  // ---- danger zone ----
  const resetButton = el('button', { class: 'btn btn-danger', type: 'button', style: 'flex:0 0 auto;white-space:nowrap;' }, ['Reset to factory settings']);
  const resetConfirmText = el('p', { style: 'font-size:13.5px;font-weight:700;color:var(--text);margin:0 0 10px;', text: "Are you sure? This deletes everything and can't be undone." });
  const resetError = el('p', { style: 'color:var(--danger);font-size:13px;margin-top:10px;', hidden: true });
  const resetConfirmYes = el('button', { class: 'btn btn-danger', type: 'button', text: 'Yes, reset everything' });
  const resetConfirmCancel = el('button', { class: 'btn btn-secondary', type: 'button', text: 'Cancel' });
  const resetConfirmRow = el('div', { hidden: true }, [resetConfirmText, el('div', { style: 'display:flex;gap:10px;' }, [resetConfirmYes, resetConfirmCancel]), resetError]);
  const resetRow = el('div', { hidden: true }, [resetButton]);

  resetButton.addEventListener('click', () => {
    resetRow.hidden = true;
    resetConfirmRow.hidden = false;
  });
  resetConfirmCancel.addEventListener('click', () => {
    resetConfirmRow.hidden = true;
    resetRow.hidden = false;
    resetError.hidden = true;
  });
  resetConfirmYes.addEventListener('click', async () => {
    resetConfirmYes.disabled = true;
    resetConfirmYes.textContent = 'Resetting…';
    resetError.hidden = true;
    try {
      await onReset();
    } catch (err) {
      resetConfirmYes.disabled = false;
      resetConfirmYes.textContent = 'Yes, reset everything';
      resetError.textContent = err.message || 'Reset failed — check the terminal for details.';
      resetError.hidden = false;
    }
  });

  const root = el('div', { class: 'section', id: 'panel-settings' }, [
    el('div', { class: 'section-header' }, [
      el('div', { style: 'display:flex;align-items:center;gap:10px;' }, [icon('gear-six', 'font-size:18px;color:var(--text);'), el('span', { style: 'font-size:16px;font-weight:800;color:var(--text);', text: 'Settings' })]),
      el('button', { class: 'btn', type: 'button', onclick: onDone }, ['Done']),
    ]),
    el('div', { class: 'section-scroll' }, [
      el('div', { style: 'max-width:720px;margin:0 auto;padding:30px 32px 44px;position:relative;' }, [
        el('div', { class: 'settings-section-label', text: 'Workspace' }),
        el('div', { class: 'card' }, [labeledRow('Your name', 'Shown in messages you send.', founderInput), labeledRow('Company name', 'Shown across your workspace.', companyInput), el('div', { class: 'settings-row', style: 'display:block;' }, [el('div', { class: 'settings-row-title', text: 'Mission' }), el('div', { class: 'settings-row-desc', style: 'margin-bottom:10px;', text: 'What your company is here to do.' }), missionInput])]),

        el('div', { class: 'settings-section-label', text: 'Your AI CEO' }),
        el('div', { class: 'card' }, [labeledRow('Name', "What you'd like to call them.", ceoNameInput), labeledRow('Personality', 'Communication style.', ceoPersonalityInput)]),

        el('div', { class: 'settings-section-label', text: 'AI defaults' }),
        stBackdrop,
        el('div', { class: 'card' }, [
          labeledRow('Default model', 'Used for chats unless overridden per message.', el('div', { style: 'position:relative;' }, [modelTrigger, modelMenu])),
          labeledRow('Default effort', 'How hard your CEO thinks before responding.', el('div', { style: 'position:relative;' }, [effortTrigger, effortLocked, effortMenu])),
        ]),

        el('div', { class: 'settings-section-label', text: 'Appearance' }),
        el('div', { class: 'card', style: 'padding:16px;' }, [
          el('div', { style: 'font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--subtle);', text: 'Theme' }),
          themeCardsRow,
          el('div', { style: 'font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--subtle);margin-top:16px;', text: 'Accent' }),
          accentRow,
        ]),

        el('div', { class: 'settings-section-label', text: 'Claude account' }),
        el('div', { class: 'card', style: 'padding:16px;display:flex;align-items:center;gap:13px;flex-wrap:wrap;' }, [
          el('div', { style: 'width:42px;height:42px;border-radius:11px;background:var(--accent-soft);border:1px solid var(--accent-border);display:flex;align-items:center;justify-content:center;flex:0 0 auto;' }, [icon('sparkle', 'font-size:20px;color:var(--accent);')]),
          el('div', { style: 'flex:1;min-width:160px;' }, [
            el('div', { style: 'font-size:14px;font-weight:700;color:var(--text);display:flex;align-items:center;gap:8px;' }, ['Claude', el('span', { class: 'status-dot-sm' }), el('span', { style: 'font-size:11.5px;font-weight:600;color:var(--success);', text: 'Connected' })]),
            accountEmail,
          ]),
          planBadge,
          el('button', { class: 'btn btn-secondary', type: 'button', onclick: () => window.open('https://claude.ai/settings', '_blank', 'noopener') }, ['Manage']),
        ]),

        el('div', { class: 'settings-section-label', text: 'Advanced' }),
        el('div', { class: 'card', style: 'padding:15px 16px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;' }, [
          el('div', {}, [el('div', { class: 'settings-row-title', text: 'Log file' }), el('div', { class: 'settings-row-desc', text: 'Share this with support when reporting an issue.' })]),
          el('div', { style: 'display:flex;align-items:center;gap:8px;' }, [logPathCode, copyButton]),
        ]),

        el('div', { class: 'settings-section-label danger', text: 'Danger zone' }),
        el('div', { class: 'card-danger', style: 'padding:16px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;' }, [
          el('div', { style: 'flex:1;min-width:220px;' }, [el('div', { class: 'settings-row-title', text: 'Reset to factory settings' }), el('div', { class: 'settings-row-desc', style: 'line-height:1.5;margin-top:3px;', text: "Deletes the company profile and chat history, and starts onboarding over from scratch — like a fresh install. This can't be undone." })]),
          el('div', {}, [resetRow, resetConfirmRow]),
        ]),
      ]),
    ]),
  ]);
  resetRow.hidden = false;

  return {
    el: root,
    load({ profile: p, accountInfo: account, models: modelList, uiPrefs: prefs, meta }) {
      profile = p;
      accountInfo = account;
      models = modelList;
      uiPrefs = prefs;
      founderInput.value = profile?.founderName ?? '';
      companyInput.value = profile?.companyName ?? '';
      missionInput.value = profile?.mission ?? '';
      ceoNameInput.value = profile?.ceoName ?? '';
      ceoPersonalityInput.value = profile?.ceoPersonality ?? '';
      refreshAiDefaults();
      accountEmail.textContent = accountInfo?.email || 'Unknown account';
      planBadge.textContent = `${accountInfo?.subscriptionType || 'Unknown'} plan`;
      logPath = meta?.logFilePath || '';
      logPathCode.textContent = logPath;
      renderAppearance();
      resetConfirmRow.hidden = true;
      resetRow.hidden = false;
    },
  };
}
