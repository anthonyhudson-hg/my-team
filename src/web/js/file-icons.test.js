import { describe, expect, it } from 'vitest';
import { extensionOf, iconFor, languageFor, languageLabelFor } from './file-icons.js';

describe('extensionOf', () => {
  it('lowercases and extracts the extension of the last path segment', () => {
    expect(extensionOf('src/server/HTTP-Server.TS')).toBe('ts');
  });
  it('returns empty string for a file with no extension', () => {
    expect(extensionOf('LICENSE')).toBe('');
  });
  it('does not treat a leading-dot dotfile as an extension-only name', () => {
    expect(extensionOf('.gitignore')).toBe('');
  });
});

describe('iconFor', () => {
  it('maps known extensions to a distinct icon/color', () => {
    expect(iconFor('src/app.ts')).toEqual({ icon: 'file-ts', color: '#4c9be8' });
    expect(iconFor('package.json')).toEqual({ icon: 'brackets-curly', color: '#e0a83e' });
  });
  it('falls back to a generic file icon for unknown extensions', () => {
    expect(iconFor('LICENSE')).toEqual({ icon: 'file', color: '#8a8f98' });
  });
});

describe('languageFor', () => {
  it('groups the JS/TS family under "code"', () => {
    for (const p of ['a.ts', 'a.tsx', 'a.js', 'a.jsx', 'a.mjs', 'a.cjs']) expect(languageFor(p)).toBe('code');
  });
  it('identifies json/css/md/html distinctly', () => {
    expect(languageFor('a.json')).toBe('json');
    expect(languageFor('a.css')).toBe('css');
    expect(languageFor('a.md')).toBe('md');
    expect(languageFor('a.html')).toBe('html');
  });
  it('falls back to plain for anything else', () => {
    expect(languageFor('LICENSE')).toBe('plain');
  });
});

describe('languageLabelFor', () => {
  it('returns a human label for known extensions and "Text" otherwise', () => {
    expect(languageLabelFor('a.tsx')).toBe('TSX');
    expect(languageLabelFor('LICENSE')).toBe('Text');
  });
});
