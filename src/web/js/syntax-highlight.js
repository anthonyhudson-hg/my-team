/**
 * Small hand-rolled per-line tokenizer — real syntax highlighting (keywords,
 * strings, comments, numbers) for the Files code viewer, not a static/fake
 * color pass. Deliberately line-scoped (no multi-line block-comment
 * tracking) to keep this simple; good enough for a read-only viewer.
 */

const KEYWORDS = new Set([
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break',
  'continue', 'import', 'export', 'from', 'default', 'class', 'extends', 'implements', 'new', 'this', 'super',
  'typeof', 'instanceof', 'interface', 'type', 'enum', 'async', 'await', 'try', 'catch', 'finally', 'throw',
  'public', 'private', 'protected', 'readonly', 'static', 'as', 'in', 'of', 'null', 'undefined', 'true', 'false',
  'void', 'delete', 'yield', 'get', 'set',
]);

function push(out, text, colorVar) {
  if (text) out.push({ t: text, c: colorVar ? `var(--code-${colorVar})` : 'var(--code-plain)' });
}

function tokenizeJson(line) {
  const out = [];
  let i = 0;
  while (i < line.length) {
    const s = line.slice(i);
    let m;
    if ((m = /^\s+/.exec(s))) {
      push(out, m[0]);
    } else if ((m = /^"(?:\\.|[^"])*"/.exec(s))) {
      push(out, m[0], /^\s*:/.test(s.slice(m[0].length)) ? 'attr' : 'str');
    } else if ((m = /^-?\d+\.?\d*/.exec(s))) {
      push(out, m[0], 'num');
    } else if ((m = /^(true|false|null)\b/.exec(s))) {
      push(out, m[0], 'num');
    } else if ((m = /^[{}[\],:]/.exec(s))) {
      push(out, m[0], 'punc');
    } else {
      push(out, s[0]);
      m = [s[0]];
    }
    i += m[0].length;
  }
  return out;
}

function tokenizeCode(line) {
  const out = [];
  let i = 0;
  while (i < line.length) {
    const s = line.slice(i);
    let m;
    if ((m = /^\s+/.exec(s))) {
      push(out, m[0]);
    } else if ((m = /^\/\/.*$/.exec(s))) {
      push(out, m[0], 'com');
    } else if ((m = /^(['"`])(?:\\.|(?!\1).)*\1?/.exec(s))) {
      push(out, m[0], 'str');
    } else if ((m = /^-?\d+\.?\d*/.exec(s))) {
      push(out, m[0], 'num');
    } else if ((m = /^[a-zA-Z_$][\w$]*/.exec(s))) {
      const word = m[0];
      const isCall = s.slice(word.length).startsWith('(');
      push(out, word, KEYWORDS.has(word) ? 'kw' : isCall ? 'fn' : 'plain');
    } else if ((m = /^[{}[\]().,;:?]/.exec(s))) {
      push(out, m[0], 'punc');
    } else {
      push(out, s[0]);
      m = [s[0]];
    }
    i += m[0].length;
  }
  return out;
}

function tokenizeCss(line) {
  const out = [];
  let i = 0;
  while (i < line.length) {
    const s = line.slice(i);
    let m;
    if ((m = /^\s+/.exec(s))) {
      push(out, m[0]);
    } else if ((m = /^\/\*.*\*\//.exec(s))) {
      push(out, m[0], 'com');
    } else if ((m = /^#[0-9a-fA-F]{3,8}\b/.exec(s))) {
      push(out, m[0], 'num');
    } else if ((m = /^-?\d+\.?\d*(px|em|rem|%|s|ms|deg|vh|vw)?/.exec(s)) && /\d/.test(m[0])) {
      push(out, m[0], 'num');
    } else if ((m = /^[.#]?[a-zA-Z_-][\w-]*/.exec(s))) {
      push(out, m[0], /^\s*:/.test(s.slice(m[0].length)) ? 'attr' : 'type');
    } else if ((m = /^[{}():;,]/.exec(s))) {
      push(out, m[0], 'punc');
    } else {
      push(out, s[0]);
      m = [s[0]];
    }
    i += m[0].length;
  }
  return out;
}

function tokenizeMarkdown(line) {
  if (/^#{1,6}\s/.test(line)) return [{ t: line, c: 'var(--code-kw)' }];
  const out = [];
  let i = 0;
  while (i < line.length) {
    const s = line.slice(i);
    let m;
    if ((m = /^`[^`]*`/.exec(s))) {
      push(out, m[0], 'str');
    } else {
      push(out, s[0]);
      m = [s[0]];
    }
    i += m[0].length;
  }
  return out;
}

/** lang: 'json' | 'css' | 'md' | 'code' | 'plain'. Returns [{t, c}] token spans for one line. */
export function tokenizeLine(line, lang) {
  let tokens;
  if (lang === 'json') tokens = tokenizeJson(line);
  else if (lang === 'css') tokens = tokenizeCss(line);
  else if (lang === 'md') tokens = tokenizeMarkdown(line);
  else if (lang === 'code') tokens = tokenizeCode(line);
  else tokens = [{ t: line, c: 'var(--code-plain)' }];
  return tokens.length ? tokens : [{ t: ' ', c: 'var(--code-plain)' }];
}
