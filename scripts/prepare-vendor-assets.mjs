import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Self-hosts the UI's icon font and type family instead of pulling them from
// a CDN at runtime: Cofound binds to 127.0.0.1 only and is meant to work the
// same with or without a working internet connection, so the dashboard chrome
// itself shouldn't depend on unpkg/fonts.googleapis.com being reachable.

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const nodeModules = path.join(root, 'node_modules');
const vendorOut = path.join(root, 'dist', 'web', 'vendor');

function copyPhosphorIcons() {
  const srcDir = path.join(nodeModules, '@phosphor-icons', 'web', 'src', 'regular');
  const outDir = path.join(vendorOut, 'phosphor');
  mkdirSync(outDir, { recursive: true });
  cpSync(path.join(srcDir, 'Phosphor.woff2'), path.join(outDir, 'Phosphor.woff2'));

  const css = readFileSync(path.join(srcDir, 'style.css'), 'utf-8');
  const trimmed = css.replace(
    /src:\s*\n(\s*url\([^)]*\)[^;\n]*\n?)+;/,
    'src: url("./Phosphor.woff2") format("woff2");',
  );
  writeFileSync(path.join(outDir, 'style.css'), trimmed, 'utf-8');
}

function copyFontWeights(pkg, family, weights) {
  const filesDir = path.join(nodeModules, '@fontsource', pkg, 'files');
  const outDir = path.join(vendorOut, 'fonts', pkg);
  mkdirSync(outDir, { recursive: true });
  const rules = weights.map((weight) => {
    const basename = `${pkg}-latin-${weight}-normal`;
    cpSync(path.join(filesDir, `${basename}.woff2`), path.join(outDir, `${basename}.woff2`));
    return `@font-face{font-family:'${family}';font-style:normal;font-display:swap;font-weight:${weight};src:url('./${pkg}/${basename}.woff2') format('woff2');}`;
  });
  return rules.join('\n');
}

function copyFonts() {
  const outDir = path.join(vendorOut, 'fonts');
  mkdirSync(outDir, { recursive: true });
  const hanken = copyFontWeights('hanken-grotesk', 'Hanken Grotesk', [400, 500, 600, 700, 800]);
  const jetbrains = copyFontWeights('jetbrains-mono', 'JetBrains Mono', [400, 500]);
  writeFileSync(path.join(outDir, 'fonts.css'), `${hanken}\n${jetbrains}\n`, 'utf-8');
}

copyPhosphorIcons();
copyFonts();
