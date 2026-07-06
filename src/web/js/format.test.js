import { describe, expect, it } from 'vitest';
import { deriveChecklist, effortShortLabel, formatClockTime, fuzzyMatch, greetingForHour, initialOf, modelShortLabel } from './format.js';

describe('initialOf', () => {
  it('uppercases the first letter of a trimmed name', () => {
    expect(initialOf('  taylor swift ')).toBe('T');
  });
  it('falls back when the name is empty or whitespace-only', () => {
    expect(initialOf('', 'Y')).toBe('Y');
    expect(initialOf('   ', 'Y')).toBe('Y');
    expect(initialOf(undefined, 'A')).toBe('A');
  });
});

describe('formatClockTime', () => {
  it('formats midnight and noon boundaries correctly', () => {
    expect(formatClockTime(new Date(2026, 0, 1, 0, 5))).toBe('12:05 AM');
    expect(formatClockTime(new Date(2026, 0, 1, 12, 0))).toBe('12:00 PM');
  });
  it('pads single-digit minutes', () => {
    expect(formatClockTime(new Date(2026, 0, 1, 9, 3))).toBe('9:03 AM');
  });
  it('converts 24h afternoon hours to 12h PM', () => {
    expect(formatClockTime(new Date(2026, 0, 1, 15, 30))).toBe('3:30 PM');
  });
});

describe('greetingForHour', () => {
  it('picks morning/afternoon/evening based on the hour', () => {
    expect(greetingForHour(6)).toBe('Good morning');
    expect(greetingForHour(11)).toBe('Good morning');
    expect(greetingForHour(12)).toBe('Good afternoon');
    expect(greetingForHour(17)).toBe('Good afternoon');
    expect(greetingForHour(18)).toBe('Good evening');
    expect(greetingForHour(23)).toBe('Good evening');
  });
});

describe('modelShortLabel / effortShortLabel', () => {
  it('falls back to "Default" for empty or whitespace values', () => {
    expect(modelShortLabel('')).toBe('Default');
    expect(modelShortLabel('   ')).toBe('Default');
    expect(modelShortLabel('claude-opus-4-8')).toBe('claude-opus-4-8');
    expect(effortShortLabel(undefined)).toBe('Default');
    expect(effortShortLabel('high')).toBe('high');
  });
});

describe('fuzzyMatch', () => {
  it('matches case-insensitively as a substring', () => {
    expect(fuzzyMatch('gen', '#general')).toBe(true);
    expect(fuzzyMatch('GEN', '#general')).toBe(true);
    expect(fuzzyMatch('xyz', '#general')).toBe(false);
  });
  it('treats an empty query as matching everything', () => {
    expect(fuzzyMatch('', '#general')).toBe(true);
    expect(fuzzyMatch('   ', '#general')).toBe(true);
  });
});

describe('deriveChecklist', () => {
  it('marks each item done only when its real backing condition is true', () => {
    const checklist = deriveChecklist({ onboardingComplete: true, hasSentToCeo: false, hasGeneralMessage: false });
    expect(checklist.find((c) => c.id === 'profile').done).toBe(true);
    expect(checklist.find((c) => c.id === 'meet-ceo').done).toBe(false);
    expect(checklist.find((c) => c.id === 'first-message').done).toBe(false);
  });
  it('has no fixed/decorative items that ignore their input', () => {
    const allDone = deriveChecklist({ onboardingComplete: true, hasSentToCeo: true, hasGeneralMessage: true });
    expect(allDone.every((c) => c.done)).toBe(true);
    const allPending = deriveChecklist({ onboardingComplete: false, hasSentToCeo: false, hasGeneralMessage: false });
    expect(allPending.every((c) => !c.done)).toBe(true);
  });
});
