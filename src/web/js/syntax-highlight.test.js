import { describe, expect, it } from 'vitest';
import { tokenizeLine } from './syntax-highlight.js';

function plainText(tokens) {
  return tokens.map((t) => t.t).join('');
}

describe('tokenizeLine', () => {
  it('reassembles to the exact original line for every language mode (no dropped/duplicated characters)', () => {
    const cases = [
      ['json', '  "name": "cofound",'],
      ['css', '.file-row:hover { color: #fff; }'],
      ['code', 'const x = foo(1, "a"); // comment'],
      ['md', '# Heading with `code`'],
      ['plain', 'just some text'],
    ];
    for (const [lang, line] of cases) {
      expect(plainText(tokenizeLine(line, lang))).toBe(line);
    }
  });

  it('colors a JSON key differently from a JSON string value', () => {
    const tokens = tokenizeLine('  "name": "value"', 'json');
    const key = tokens.find((t) => t.t === '"name"');
    const value = tokens.find((t) => t.t === '"value"');
    expect(key.c).toBe('var(--code-attr)');
    expect(value.c).toBe('var(--code-str)');
  });

  it('colors a JS keyword differently from a plain identifier', () => {
    const tokens = tokenizeLine('const value = 1;', 'code');
    const kw = tokens.find((t) => t.t === 'const');
    const ident = tokens.find((t) => t.t === 'value');
    expect(kw.c).toBe('var(--code-kw)');
    expect(ident.c).toBe('var(--code-plain)');
  });

  it('colors a function call identifier distinctly from a plain identifier', () => {
    const tokens = tokenizeLine('foo(bar)', 'code');
    const call = tokens.find((t) => t.t === 'foo');
    const arg = tokens.find((t) => t.t === 'bar');
    expect(call.c).toBe('var(--code-fn)');
    expect(arg.c).toBe('var(--code-plain)');
  });

  it('treats a markdown heading line as a single highlighted span', () => {
    const tokens = tokenizeLine('## Section', 'md');
    expect(tokens).toEqual([{ t: '## Section', c: 'var(--code-kw)' }]);
  });

  it('never returns an empty token array, even for an empty line', () => {
    for (const lang of ['json', 'css', 'md', 'code', 'plain']) {
      expect(tokenizeLine('', lang).length).toBeGreaterThan(0);
    }
  });
});
