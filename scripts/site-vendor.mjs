// Copia para site/vendor/ o motor, os presets e as fontes que o app já usa (versões fixadas no package.json).
// Uso: npm run site:vendor   (site/vendor/ fica fora do git)
import { cpSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const nm = join(root, 'node_modules');
const out = join(root, 'site', 'vendor');

const files = [
  ['butterchurn/lib/butterchurn.min.js', 'butterchurn.min.js'],
  ['butterchurn/LICENSE', 'LICENSE-butterchurn.txt'],
  ['butterchurn-presets/lib/butterchurnPresets.min.js', 'butterchurnPresets.min.js'],
  ['butterchurn-presets/LICENSE', 'LICENSE-butterchurn-presets.txt'],
  ['@fontsource/space-grotesk/LICENSE', 'fonts/OFL-SpaceGrotesk.txt'],
  ['@fontsource/jetbrains-mono/LICENSE', 'fonts/OFL-JetBrainsMono.txt']
];
for (const wgt of [400, 500, 600, 700]) {
  files.push([`@fontsource/space-grotesk/files/space-grotesk-latin-${wgt}-normal.woff2`, `fonts/space-grotesk-latin-${wgt}-normal.woff2`]);
}
for (const wgt of [400, 500, 600]) {
  files.push([`@fontsource/jetbrains-mono/files/jetbrains-mono-latin-${wgt}-normal.woff2`, `fonts/jetbrains-mono-latin-${wgt}-normal.woff2`]);
}

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'fonts'), { recursive: true });
for (const [from, to] of files) {
  const src = join(nm, from);
  if (!existsSync(src)) {
    console.error(`site:vendor: falta ${from} — rode npm ci antes.`);
    process.exit(1);
  }
  cpSync(src, join(out, to));
}
console.log(`site:vendor: ${files.length} arquivos em site/vendor/`);
