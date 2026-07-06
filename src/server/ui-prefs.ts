import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getProfileDir } from './profile.js';

export type Theme = 'Contrast' | 'Light' | 'Dark';
const THEMES: readonly Theme[] = ['Contrast', 'Light', 'Dark'];
const ACCENTS: readonly string[] = ['#5B5BD6', '#12A594', '#8257E6', '#E5567A'];

export interface UiPrefs {
  theme: Theme;
  accent: string;
  coachDismissed: boolean;
  generalBannerDismissed: boolean;
}

const DEFAULT_PREFS: UiPrefs = {
  theme: 'Contrast',
  accent: ACCENTS[0],
  coachDismissed: false,
  generalBannerDismissed: false,
};

export function getUiPrefsPath(cwd: string): string {
  return path.join(getProfileDir(cwd), 'ui-prefs.json');
}

/**
 * Personal display preference, not shared team config (unlike profile.json):
 * gitignored, same category as chat-history.jsonl. Stored server-side rather
 * than in browser localStorage because the dashboard's port is randomized on
 * every launch — a different origin each run means localStorage can't
 * survive a restart, but this file can.
 */
export async function readUiPrefs(cwd: string): Promise<UiPrefs> {
  let raw: string;
  try {
    raw = await readFile(getUiPrefsPath(cwd), 'utf-8');
  } catch {
    return DEFAULT_PREFS;
  }
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return DEFAULT_PREFS;
  }
  if (typeof parsed !== 'object' || parsed === null) return DEFAULT_PREFS;
  return {
    theme: THEMES.includes(parsed.theme) ? parsed.theme : DEFAULT_PREFS.theme,
    accent: ACCENTS.includes(parsed.accent) ? parsed.accent : DEFAULT_PREFS.accent,
    coachDismissed: parsed.coachDismissed === true,
    generalBannerDismissed: parsed.generalBannerDismissed === true,
  };
}

export type UiPrefsPatch = Partial<UiPrefs>;

export function validateUiPrefsPatch(body: any): UiPrefsPatch | { error: string } {
  const patch: UiPrefsPatch = {};
  if (body?.theme !== undefined) {
    if (!THEMES.includes(body.theme)) return { error: `theme must be one of ${THEMES.join(', ')}` };
    patch.theme = body.theme;
  }
  if (body?.accent !== undefined) {
    if (!ACCENTS.includes(body.accent)) return { error: `accent must be one of ${ACCENTS.join(', ')}` };
    patch.accent = body.accent;
  }
  if (body?.coachDismissed !== undefined) patch.coachDismissed = body.coachDismissed === true;
  if (body?.generalBannerDismissed !== undefined) patch.generalBannerDismissed = body.generalBannerDismissed === true;
  return patch;
}

export async function writeUiPrefs(cwd: string, patch: UiPrefsPatch): Promise<UiPrefs> {
  const current = await readUiPrefs(cwd);
  const next: UiPrefs = { ...current, ...patch };
  const dir = getProfileDir(cwd);
  await mkdir(dir, { recursive: true });
  const filePath = getUiPrefsPath(cwd);
  const tmpPath = path.join(dir, `.ui-prefs.json.${process.pid}.tmp`);
  await writeFile(tmpPath, JSON.stringify(next, null, 2) + '\n', 'utf-8');
  try {
    await rename(tmpPath, filePath);
  } catch (err) {
    await unlink(tmpPath).catch(() => {});
    throw err;
  }
  return next;
}
