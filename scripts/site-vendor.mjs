// Copia para site/vendor/ o motor, os presets e as fontes que o app já usa (versões fixadas no package.json).
// Uso: npm run site:vendor   (site/vendor/ fica fora do git)
import { cpSync, mkdirSync, rmSync, existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { pbkdf2Sync, createDecipheriv } from 'node:crypto';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const nm = join(root, 'node_modules');
const out = join(root, 'site', 'vendor');

const files = [
  ['butterchurn-v2-site/lib/butterchurn.min.js', 'butterchurn.min.js'],
  ['butterchurn-v2-site/LICENSE', 'LICENSE-butterchurn.txt'],
  ['butterchurn-presets-v2-site/lib/butterchurnPresets.min.js', 'butterchurnPresets.min.js'],
  ['butterchurn-presets-v2-site/LICENSE', 'LICENSE-butterchurn-presets.txt'],
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

// Músicas da demo (Uppbeat — spec 019). Os arquivos não podem ser redistribuídos como avulsos,
// então só as versões criptografadas ficam no git (site-media/*.enc, openssl enc aes-256-cbc/pbkdf2).
// Com SITE_AUDIO_KEY no ambiente (segredo do CI, ou export local), decifra para site/assets/audio/;
// sem a chave, a demo usa a faixa sintetizada no navegador.
const key = process.env.SITE_AUDIO_KEY;
const media = join(root, 'site-media');
const audioOut = join(root, 'site', 'assets', 'audio');
rmSync(audioOut, { recursive: true, force: true });
const encs = existsSync(media) ? readdirSync(media).filter((f) => f.endsWith('.enc')) : [];
if (key && encs.length) {
  mkdirSync(audioOut, { recursive: true });
  for (const f of encs) {
    const buf = readFileSync(join(media, f));
    if (buf.subarray(0, 8).toString('latin1') !== 'Salted__') {
      console.error(`site:vendor: ${f} não está no formato do openssl enc.`);
      process.exit(1);
    }
    const kiv = pbkdf2Sync(key, buf.subarray(8, 16), 200000, 48, 'sha256');
    const d = createDecipheriv('aes-256-cbc', kiv.subarray(0, 32), kiv.subarray(32));
    writeFileSync(join(audioOut, f.replace(/\.enc$/, '')), Buffer.concat([d.update(buf.subarray(16)), d.final()]));
  }
  console.log(`site:vendor: ${encs.length} música(s) da demo decifrada(s)`);
} else {
  console.log('site:vendor: sem SITE_AUDIO_KEY — demo com a faixa sintetizada.');
}
