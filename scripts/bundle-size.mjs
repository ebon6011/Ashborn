// Reports what an iPhone downloads on first load: JS, CSS, HTML (and total incl. images/sounds).
// Run after `npm run build`: `npm run size`.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

const root = 'dist';
const rows = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else {
      const bytes = readFileSync(path);
      rows.push({ file: relative(root, path).replaceAll('\\', '/'), raw: bytes.length, gzip: gzipSync(bytes).length });
    }
  }
};
walk(root);

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
const code = rows.filter((r) => /\.(js|css|html)$/.test(r.file));
const sum = (list, key) => list.reduce((s, r) => s + r[key], 0);

for (const r of code.sort((a, b) => b.raw - a.raw)) console.log(`${r.file.padEnd(40)} ${kb(r.raw).padStart(10)}  gzip ${kb(r.gzip)}`);
console.log(`\nCode (js+css+html): ${kb(sum(code, 'raw'))}, gzip ${kb(sum(code, 'gzip'))}`);
console.log(`Everything in dist: ${kb(sum(rows, 'raw'))}`);
