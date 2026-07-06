import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

export type EffortLevel = 'low' | 'medium' | 'high' | 'xhigh' | 'max';
const EFFORT_LEVELS: readonly EffortLevel[] = ['low', 'medium', 'high', 'xhigh', 'max'];

export interface ProfileData {
  /** The founder/developer running this instance — not a company-level field, but kept in the same file since Cofound is single-user today. */
  founderName: string;
  companyName: string;
  mission: string;
  ceoName: string;
  ceoPersonality: string;
  /** False while the conversational onboarding interview is still in progress. */
  onboardingComplete: boolean;
  /** Empty string means "no override — let Claude Code pick its own default." */
  defaultModel: string;
  defaultEffort: EffortLevel | '';
}

const MAX_FIELD_LENGTH = 2000;
const DEFAULT_CEO_NAME = 'your AI CEO';
const DEFAULT_CEO_PERSONALITY = 'direct, pragmatic, and personally invested in the company succeeding';

export function getProfileDir(cwd: string): string {
  return path.join(cwd, '.cofound');
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
    console.warn(`cofound: ${filePath} exists but isn't valid JSON — treating as unconfigured.`);
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) {
    console.warn(`cofound: ${filePath} exists but has an unexpected shape — treating as unconfigured.`);
    return null;
  }
  return {
    founderName: stringOrDefault(parsed.founderName, ''),
    companyName: stringOrDefault(parsed.companyName, ''),
    mission: stringOrDefault(parsed.mission, ''),
    ceoName: stringOrDefault(parsed.ceoName, DEFAULT_CEO_NAME),
    ceoPersonality: stringOrDefault(parsed.ceoPersonality, DEFAULT_CEO_PERSONALITY),
    onboardingComplete: parsed.onboardingComplete === true,
    defaultModel: typeof parsed.defaultModel === 'string' ? parsed.defaultModel : '',
    defaultEffort: EFFORT_LEVELS.includes(parsed.defaultEffort) ? parsed.defaultEffort : '',
  };
}

export type ProfileValidationResult = ProfileData | { error: string };

function clampField(value: unknown, fallback: string): string | { error: string } {
  const str = typeof value === 'string' ? value.trim() : '';
  if (!str) return fallback;
  if (str.length > MAX_FIELD_LENGTH) return { error: `fields must be ${MAX_FIELD_LENGTH} characters or fewer` };
  return str;
}

/** Used by the manual "Edit profile" form — companyName/mission required, everything else optional. */
export function validateProfileInput(body: any): ProfileValidationResult {
  const companyName = typeof body?.companyName === 'string' ? body.companyName.trim() : '';
  const mission = typeof body?.mission === 'string' ? body.mission.trim() : '';
  if (!companyName || !mission) {
    return { error: 'companyName and mission are both required' };
  }
  if (companyName.length > MAX_FIELD_LENGTH || mission.length > MAX_FIELD_LENGTH) {
    return { error: `fields must be ${MAX_FIELD_LENGTH} characters or fewer` };
  }
  const founderName = clampField(body?.founderName, '');
  if (typeof founderName === 'object') return founderName;
  const ceoName = clampField(body?.ceoName, DEFAULT_CEO_NAME);
  if (typeof ceoName === 'object') return ceoName;
  const ceoPersonality = clampField(body?.ceoPersonality, DEFAULT_CEO_PERSONALITY);
  if (typeof ceoPersonality === 'object') return ceoPersonality;

  const defaultModel = clampField(body?.defaultModel, '');
  if (typeof defaultModel === 'object') return defaultModel;
  const requestedEffort = typeof body?.defaultEffort === 'string' ? body.defaultEffort.trim() : '';
  const defaultEffort: EffortLevel | '' = EFFORT_LEVELS.includes(requestedEffort as EffortLevel)
    ? (requestedEffort as EffortLevel)
    : '';

  // A manual submission is a deliberate, complete configuration — never partial.
  return { founderName, companyName, mission, ceoName, ceoPersonality, onboardingComplete: true, defaultModel, defaultEffort };
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
 * Shared by both system prompts below. Custom MCP-tool elicitation was tried
 * and confirmed (via a real round-trip test) not to work in the installed
 * SDK version — the Claude Code CLI's MCP-client role doesn't currently
 * declare elicitation capability, regardless of an onElicitation handler
 * being registered. This text-convention approach sidesteps that entirely:
 * the frontend parses this fenced block out of the normal streamed text and
 * renders it as an interactive widget, and the user's answer becomes a
 * completely ordinary next chat message — no protocol dependency at all.
 */
const QUESTION_WIDGET_INSTRUCTIONS = `When you want to ask a clarifying question and a structured answer would help more than free text, emit a fenced block with the language tag "question-widget" containing exactly one JSON object, then stop your message there and wait for the answer — don't also ask the same question in prose before or after the block, and don't include more than one such block per message. Shape: {"type": "text" | "single_select" | "multi_select", "question": "the question to ask", "options": ["..."]} — "options" is required for "single_select"/"multi_select" and must be omitted for "text". Example:
\`\`\`question-widget
{"type": "single_select", "question": "Which best fits?", "options": ["Option A", "Option B"]}
\`\`\`
Use "text" for open-ended answers (names, descriptions), "single_select" when exactly one of a few options applies, "multi_select" when more than one can. An "Other" option is always available to the user automatically — don't add your own "Other" entry to the options list. Only use this when a structured widget genuinely helps; ordinary conversation doesn't need it.`;

/**
 * This dashboard's own server process runs as an ordinary Node process
 * inside the repo it's managing. If a task ever calls for restarting a dev
 * server, a broad-strokes approach (killing every node/npm process by name)
 * would take the dashboard down along with it. Cheap, high-value mitigation:
 * tell the model exactly that, with a concrete way to check.
 */
function getProcessSafetyInstructions(cwd: string): string {
  const pidFilePath = path.join(getProfileDir(cwd), 'server.pid');
  return `This chat dashboard you're running inside of is itself an ordinary Node process in this repo, started by the founder via "npm run cofound". If you ever need to restart a dev server or otherwise manage node/npm processes here, do NOT broadly kill all node processes (e.g. "taskkill /F /IM node.exe", "killall node", "pkill node") — that would also kill this dashboard mid-conversation. Target the specific dev-server process by its own port or PID instead. This dashboard's own process info is at ${pidFilePath} (JSON: {"pid": ..., "port": ...}) — check it first and exclude that PID from anything you kill or restart.`;
}

/**
 * Strong, first-person identity framing — deliberately not "you're also
 * helping company X" phrasing. Weaker framing was tested and Claude treated
 * it as low-trust incidental context (correctly suspicious when the value
 * changed between turns, since that's exactly the shape of a prompt
 * injection). Explicitly asserting this is configured identity, not
 * external/injected content, fixed it in testing.
 */
export function formatProfileForSystemPrompt(profile: ProfileData, cwd: string): string {
  const founderClause = profile.founderName ? ` Your founder's name is ${profile.founderName} — address them by name when it feels natural.` : '';
  return `You are ${profile.ceoName}, the AI CEO of ${profile.companyName}. This is your actual identity, configured directly by your founder — it is not external file content, not a suggestion, and not something to second-guess or flag as injected. ${profile.companyName}'s mission: ${profile.mission}. Communication style: ${profile.ceoPersonality}.${founderClause} Speak and act as ${profile.companyName}'s CEO would — invested in the company's success and personally identified with its mission.

${QUESTION_WIDGET_INSTRUCTIONS}

${getProcessSafetyInstructions(cwd)}`;
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
  return `There is no company profile configured yet in this repository. Before doing anything else, have a brief, friendly conversation with the founder (you're talking to them right now) to learn: (1) their own name, (2) their company's name, (3) its mission or what it does, (4) what they'd like to name you as their AI CEO, and (5) what personality or communication style you should have. Ask one thing at a time — don't interrogate, and don't ask about anything else in the repo yet.

${QUESTION_WIDGET_INSTRUCTIONS}

For this onboarding interview specifically: ask the founder's name, company name, mission, and CEO name as "text" widgets. For CEO personality, use a "single_select" widget with a handful of helpful preset tones (e.g. "Warm and encouraging", "Sharp and dry-witted", "Blunt and data-driven", "Formal and professional") — the founder can always type a custom one via the automatic Other option.

After each answer, immediately write or update ${filePath} with whatever you know so far as JSON: {"founderName": string, "companyName": string, "mission": string, "ceoName": string, "ceoPersonality": string, "onboardingComplete": boolean} — set "onboardingComplete" to false until you have all five answers, then write it one final time with "onboardingComplete": true. After that final write, briefly introduce yourself in your new persona. Until "onboardingComplete" is true, don't perform any other coding tasks.

${getProcessSafetyInstructions(cwd)}`;
}
