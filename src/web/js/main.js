import { api } from './api.js';
import { createAuthGate } from './components/auth-gate.js';
import { createCeoPanel } from './components/ceo-panel.js';
import { createCoachMark } from './components/coach-mark.js';
import { createCommandPalette } from './components/command-palette.js';
import { createActivityPanel } from './components/empty-pages.js';
import { createEmployeeConfigPanel } from './components/employee-config.js';
import { createFilesPanel } from './components/files.js';
import { createGeneralPanel } from './components/general-panel.js';
import { createHomePanel } from './components/home.js';
import { createRail } from './components/rail.js';
import { createSettingsPanel } from './components/settings.js';
import { createSidebar } from './components/sidebar.js';
import { createSplash } from './components/splash.js';
import { createUpdateBanner } from './components/update-banner.js';
import { el, mount } from './dom.js';
import { initialOf } from './format.js';
import { applyTheme, saveUiPrefs } from './theme.js';

const splash = createSplash();
const authGate = createAuthGate({ onCheckAgain: () => checkStatus() });
const updateBanner = createUpdateBanner();
const rail = createRail({ onNavigate: navigateSection });
const palette = createCommandPalette({ getItems: paletteItems });
const coachMark = createCoachMark({ onOpenCeo: () => navigateView('ceo'), onDismiss: dismissCoach });

const sidebar = createSidebar({
  onNavigate: navigateView,
  onOpenPalette: () => palette.open(),
  onOpenSettings: () => navigateSection('settings'),
});
const generalPanel = createGeneralPanel({ onOpenCeo: () => navigateView('ceo'), onOpenSettings: () => navigateSection('settings') });
const ceoPanel = createCeoPanel({ onConfigureEmployee: () => navigateSection('employee-config') });
const homePanel = createHomePanel({ onOpenPalette: () => palette.open(), onGoGeneral: () => navigateView('general'), onGoCeo: () => navigateView('ceo') });
const settingsPanel = createSettingsPanel({ onDone: () => navigateSection('chats'), onReset: doReset });
const activityPanel = createActivityPanel();
const filesPanel = createFilesPanel({ onOpenCeo: () => navigateView('ceo') });
const employeeConfigPanel = createEmployeeConfigPanel({ onDone: () => navigateSection('chats') });

const chatsBlock = el('div', { style: 'display:flex;flex:1;min-width:0;' }, [sidebar.el, generalPanel.el, ceoPanel.el]);
const rightArea = el('div', { id: 'right-area' }, [chatsBlock, homePanel.el, settingsPanel.el, activityPanel, filesPanel.el, employeeConfigPanel.el]);

mount(document.getElementById('window'), [rail.el, rightArea, coachMark.el, palette.el, updateBanner.el, authGate.el, splash.el]);

let statusData = null;
let uiPrefsData = null;
let metaData = null;
let currentSection = 'chats';
let currentView = 'general';
// The initial status-check + dashboard load spawns a real Claude CLI process
// and can take several real seconds - long enough for the user to click a
// rail/sidebar item before it resolves. Without this guard, loadDashboard's
// own default-view navigation at the end would silently stomp over wherever
// the user had already navigated to in the meantime.
let isLoadingDashboard = false;
let navigatedDuringLoad = false;

function profileFields() {
  const profile = statusData?.profile;
  return {
    companyName: profile?.companyName || '',
    founderName: profile?.founderName || '',
    ceoName: profile?.ceoName || 'your AI CEO',
    onboardingComplete: profile?.onboardingComplete === true,
  };
}

function navigateSection(section) {
  if (isLoadingDashboard) navigatedDuringLoad = true;
  currentSection = section;
  rail.setActive(section);
  chatsBlock.hidden = section !== 'chats';
  homePanel.el.hidden = section !== 'home';
  settingsPanel.el.hidden = section !== 'settings';
  activityPanel.hidden = section !== 'activity';
  filesPanel.el.hidden = section !== 'files';
  employeeConfigPanel.el.hidden = section !== 'employee-config';
  palette.close();

  if (section === 'home') {
    homePanel.update({ ...profileFields(), hasSentToCeo: ceoPanel.hasSentMessage(), hasGeneralMessage: generalPanel.hasSentMessage() });
  } else if (section === 'settings') {
    loadSettings();
  } else if (section === 'employee-config') {
    employeeConfigPanel.update({ ceoName: profileFields().ceoName });
  } else if (section === 'files') {
    filesPanel.setProfile(profileFields());
    filesPanel.load();
  }
}

function navigateView(view) {
  currentView = view;
  navigateSection('chats');
  sidebar.setActiveView(view);
  generalPanel.el.hidden = view !== 'general';
  ceoPanel.el.hidden = view !== 'ceo';
  if (view === 'ceo') dismissCoach();
}

function dismissCoach() {
  coachMark.hide();
  if (!uiPrefsData?.coachDismissed) {
    uiPrefsData = { ...uiPrefsData, coachDismissed: true };
    saveUiPrefs({ coachDismissed: true });
  }
}

function paletteItems() {
  const { ceoName } = profileFields();
  return [
    { label: 'Home', icon: 'house', onSelect: () => navigateSection('home') },
    { label: '#general', icon: 'hash', onSelect: () => navigateView('general') },
    { label: `${ceoName} · AI CEO`, icon: 'sparkle', onSelect: () => navigateView('ceo') },
    { label: 'Activity', icon: 'bell', onSelect: () => navigateSection('activity') },
    { label: 'Files', icon: 'folder-simple', onSelect: () => navigateSection('files') },
    { label: 'Settings', icon: 'gear-six', onSelect: () => navigateSection('settings') },
  ];
}

async function loadSettings() {
  const [profileRes, prefsRes] = await Promise.all([api.profile.get(), api.uiPrefs.get()]);
  uiPrefsData = prefsRes.body.prefs;
  settingsPanel.load({ profile: profileRes.body.profile, accountInfo: statusData?.accountInfo, models: statusData?.models ?? [], uiPrefs: uiPrefsData, meta: metaData });
}

async function doReset() {
  const { ok, body } = await api.reset();
  if (!ok) {
    throw new Error(body.error === 'busy' ? 'Still responding to a message — try again in a moment.' : 'Reset failed — check the terminal for details.');
  }
  location.reload();
}

async function loadDashboard() {
  const [metaRes, prefsRes, historyRes, generalHistoryRes] = await Promise.all([
    api.meta(),
    api.uiPrefs.get(),
    api.chatHistory(),
    api.general.history(),
  ]);
  metaData = metaRes.body;
  uiPrefsData = prefsRes.body.prefs;
  applyTheme(uiPrefsData.theme, uiPrefsData.accent);

  const { companyName, founderName, ceoName, onboardingComplete } = profileFields();
  rail.setLogoInitial(initialOf(companyName, 'M'));
  sidebar.update({ companyName, ceoName, founderName, onboardingComplete });

  const history = historyRes.body.history ?? [];
  const generalHistory = generalHistoryRes.body.history ?? [];

  await ceoPanel.load({
    ceoName,
    companyName,
    founderName,
    onboardingComplete,
    models: statusData.models,
    defaults: { model: statusData.profile?.defaultModel, effort: statusData.profile?.defaultEffort },
    history,
  });
  await generalPanel.load({
    companyName,
    founderName,
    ceoName,
    onboardingComplete,
    hasSentToCeo: history.length > 0,
    generalBannerDismissed: uiPrefsData.generalBannerDismissed,
    generalHistory,
    onSavePrefs: saveUiPrefs,
  });

  if (!navigatedDuringLoad) {
    navigateSection('chats');
    navigateView('general');
  }

  if (!onboardingComplete && !uiPrefsData.coachDismissed && currentSection === 'chats' && currentView === 'general') {
    coachMark.show(ceoName);
  }
  updateBanner.checkForUpdate();
}

async function checkStatus() {
  isLoadingDashboard = true;
  navigatedDuringLoad = false;
  const { body } = await api.status();
  if (!body.ok) {
    isLoadingDashboard = false;
    authGate.hide();
    if (body.reason === 'cli-missing') authGate.showCliMissing();
    else authGate.showNotAuthenticated();
    splash.hide();
    return;
  }
  authGate.hide();
  statusData = body;
  await loadDashboard();
  isLoadingDashboard = false;
  splash.hide();
}

checkStatus();
