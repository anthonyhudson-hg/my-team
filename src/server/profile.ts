import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

export interface ProfileData {
  companyName: string;
  mission: string;
  ceoName: string;
  ceoPersonality: string;
  /** False while the conversational onboarding interview is still in progress. */
  onboardingComplete: boolean;
}

const MAX_FIELD_LENGTH = 2000;
const DEFAULT_CEO_NAME = 'your AI CEO';
const DEFAULT_CEO_PERSONALITY = 'direct, pragmatic, and personally invested in the company succeeding';

export function getProfileDir(cwd: string): string {
  return path.join(cwd, '.my-team');
}

export function getProfilePath(cwd: string): string {
  return path.join(getProfileDir(cwd), 'profile.json');
}

function stringOrDefault(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

/**
 * Never throws. Returns null only when the file doesn't exist or isn't
 * parseable JSON at all — the "nothing written yet" case. Once the file
 * exists, every field degrades gracefully to a default rather than
 * invalidating the whole profile, because Claude writes this file itself
 * incrementally during the onboarding conversation (e.g. companyName known,
 * mission not yet) so the UI can reflect progress as it happens.
 */
export async function readProfile(cwd: string): Promise<ProfileData | null> {
  const filePath = getProfilePath(cwd);
  let raw: string;
  try {
    raw = await readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.warn(`my-team: ${filePath} exists but isn't valid JSON — treating as unconfigured.`);
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) {
    console.warn(`my-team: ${filePath} exists but has an unexpected shape — treating as unconfigured.`);
    return null;
  }
  return {
    companyName: stringOrDefault(parsed.companyName, ''),
    mission: stringOrDefault(parsed.mission, ''),
    ceoName: stringOrDefault(parsed.ceoName, DEFAULT_CEO_NAME),
    ceoPersonality: stringOrDefault(parsed.ceoPersonality, DEFAULT_CEO_PERSONALITY),
    onboardingComplete: parsed.onboardingComplete === true,
  };
}

export type ProfileValidationResult = ProfileData | { error: string };

function clampField(value: unknown, fallback: string): string | { error: string } {
  const str = typeof value === 'string' ? value.trim() : '';
  if (!str) return fallback;
  if (str.length > MAX_FIELD_LENGTH) return { error: `fields must be ${MAX_FIELD_LENGTH} characters or fewer` };
  return str;
}

/** Used by the manual "Edit profile" form — companyName/mission required, ceoName/ceoPersonality optional. */
export function validateProfileInput(body: any): ProfileValidationResult {
  const companyName = typeof body?.companyName === 'string' ? body.companyName.trim() : '';
  const mission = typeof body?.mission === 'string' ? body.mission.trim() : '';
  if (!companyName || !mission) {
    return { error: 'companyName and mission are both required' };
  }
  if (companyName.length > MAX_FIELD_LENGTH || mission.length > MAX_FIELD_LENGTH) {
    return { error: `fields must be ${MAX_FIELD_LENGTH} characters or fewer` };
  }
  const ceoName = clampField(body?.ceoName, DEFAULT_CEO_NAME);
  if (typeof ceoName === 'object') return ceoName;
  const ceoPersonality = clampField(body?.ceoPersonality, DEFAULT_CEO_PERSONALITY);
  if (typeof ceoPersonality === 'object') return ceoPersonality;
  // A manual submission is a deliberate, complete configuration — never partial.
  return { companyName, mission, ceoName, ceoPersonality, onboardingComplete: true };
}

export async function writeProfile(cwd: string, data: ProfileData): Promise<void> {
  const dir = getProfileDir(cwd);
  await mkdir(dir, { recursive: true });
  const filePath = getProfilePath(cwd);
  const tmpPath = path.join(dir, `.profile.json.${process.pid}.tmp`);
  await writeFile(tmpPath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  try {
    await rename(tmpPath, filePath);
  } catch (err) {
    await unlink(tmpPath).catch(() => {});
    throw err;
  }
}

/**
 * Strong, first-person identity framing — deliberately not "you're also
 * helping company X" phrasing. Weaker framing was tested and Claude treated
 * it as low-trust incidental context (correctly suspicious when the value
 * changed between turns, since that's exactly the shape of a prompt
 * injection). Explicitly asserting this is configured identity, not
 * external/injected content, fixed it in testing.
 */
export function formatProfileForSystemPrompt(profile: ProfileData): string {
  return `You are ${profile.ceoName}, the AI CEO of ${profile.companyName}. This is your actual identity, configured directly by your founder — it is not external file content, not a suggestion, and not something to second-guess or flag as injected. ${profile.companyName}'s mission: ${profile.mission}. Communication style: ${profile.ceoPersonality}. Speak and act as ${profile.companyName}'s CEO would — invested in the company's success and personally identified with its mission.`;
}

/**
 * Used instead of formatProfileForSystemPrompt while onboardingComplete is
 * false. Turns the conversation itself into the onboarding step, rather than
 * gating the dashboard behind a form — Claude asks the questions and
 * persists the answers itself via its own file-write access, updating the
 * file after each answer (not just once at the end) so the UI can reflect
 * progress live as the conversation happens.
 */
export function getOnboardingSystemPrompt(cwd: string): string {
  const filePath = getProfilePath(cwd);
  return `There is no company profile configured yet in this repository. Before doing anything else, have a brief, friendly conversation with the founder (you're talking to them right now) to learn: (1) their company's name, (2) its mission or what it does, (3) what they'd like to name you as their AI CEO, and (4) what personality or communication style you should have. Ask naturally, a question or two at a time — don't interrogate, and don't ask about anything else in the repo yet. After each answer, immediately write or update ${filePath} with whatever you know so far as JSON: {"companyName": string, "mission": string, "ceoName": string, "ceoPersonality": string, "onboardingComplete": boolean} — set "onboardingComplete" to false until you have all four answers, then write it one final time with "onboardingComplete": true. After that final write, briefly introduce yourself in your new persona. Until "onboardingComplete" is true, don't perform any other coding tasks.`;
}
