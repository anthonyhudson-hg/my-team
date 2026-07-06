import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

export interface ProfileData {
  companyName: string;
  mission: string;
}

const MAX_FIELD_LENGTH = 2000;

export function getProfileDir(cwd: string): string {
  return path.join(cwd, '.my-team');
}

export function getProfilePath(cwd: string): string {
  return path.join(getProfileDir(cwd), 'profile.json');
}

/** Never throws. Missing file is the normal "not onboarded yet" case. */
export async function readProfile(cwd: string): Promise<ProfileData | null> {
  const filePath = getProfilePath(cwd);
  let raw: string;
  try {
    raw = await readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.companyName !== 'string' || typeof parsed?.mission !== 'string') {
      console.warn(`my-team: ${filePath} exists but has an unexpected shape — treating as unconfigured.`);
      return null;
    }
    return { companyName: parsed.companyName, mission: parsed.mission };
  } catch {
    console.warn(`my-team: ${filePath} exists but isn't valid JSON — treating as unconfigured.`);
    return null;
  }
}

export type ProfileValidationResult = ProfileData | { error: string };

export function validateProfileInput(body: any): ProfileValidationResult {
  const companyName = typeof body?.companyName === 'string' ? body.companyName.trim() : '';
  const mission = typeof body?.mission === 'string' ? body.mission.trim() : '';
  if (!companyName || !mission) {
    return { error: 'companyName and mission are both required' };
  }
  if (companyName.length > MAX_FIELD_LENGTH || mission.length > MAX_FIELD_LENGTH) {
    return { error: `fields must be ${MAX_FIELD_LENGTH} characters or fewer` };
  }
  return { companyName, mission };
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

export function formatProfileForSystemPrompt(profile: ProfileData): string {
  return `You are assisting the team at ${profile.companyName}. Company mission/description: ${profile.mission}`;
}
