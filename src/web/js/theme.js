import { api } from './api.js';

export const THEMES = ['Contrast', 'Light', 'Dark'];
export const ACCENTS = ['#5B5BD6', '#12A594', '#8257E6', '#E5567A'];
export const ACCENT_NAMES = { '#5B5BD6': 'Indigo', '#12A594': 'Teal', '#8257E6': 'Violet', '#E5567A': 'Rose' };

export function applyTheme(theme, accent) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.setProperty('--accent', accent);
}

/**
 * Fetched fresh on every load rather than cached in localStorage: the
 * dashboard's port (and therefore its browser-storage origin) is randomized
 * per launch, so localStorage can't survive a restart the way this
 * server-side file can.
 */
export async function loadUiPrefs() {
  const { body } = await api.uiPrefs.get();
  return body.prefs;
}

export async function saveUiPrefs(patch) {
  const { body } = await api.uiPrefs.save(patch);
  return body.prefs;
}
