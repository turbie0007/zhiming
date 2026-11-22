import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'www');

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

for (const entry of ['index.html', 'manifest.webmanifest', 'sw.js', 'assets']) {
  cpSync(join(root, entry), join(out, entry), { recursive: true });
}

console.log('Web assets copied to www/');
