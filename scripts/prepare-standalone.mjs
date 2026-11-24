import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const standalone = join(root, '.next', 'standalone');

if (!existsSync(standalone)) {
  console.error('MISSING_STANDALONE');
  process.exit(1);
}

const copies = [
  [join(root, '.next', 'static'), join(standalone, '.next', 'static')],
  [join(root, 'public'), join(standalone, 'public')],
];

for (const [from, to] of copies) {
  if (!existsSync(from)) {
    console.log(`SKIP ${from}`);
    continue;
  }
  mkdirSync(dirname(to), { recursive: true });
  cpSync(from, to, { recursive: true, force: true });
  console.log(`COPIED ${from} -> ${to}`);
}