#!/usr/bin/env node
// Reports dist/ size against the Playables budget (CLAUDE.md rule 2).
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;
const TARGET = 8 * 1024 * 1024;
const HARD = 30 * 1024 * 1024;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else out.push({ path: relative(DIST, p), size: st.size });
  }
  return out;
}

const mb = (n) => (n / 1024 / 1024).toFixed(2) + ' MB';

let files;
try {
  files = walk(DIST);
} catch {
  console.error('dist/ not found. Run `npm run build` first.');
  process.exit(1);
}

const total = files.reduce((s, f) => s + f.size, 0);
files.sort((a, b) => b.size - a.size);

console.log(`dist/ total: ${mb(total)} in ${files.length} files`);
console.log('largest files:');
for (const f of files.slice(0, 10)) console.log(`  ${mb(f.size).padStart(10)}  ${f.path}`);

let failed = false;
for (const f of files) {
  if (f.size > HARD) {
    console.error(`FAIL: ${f.path} is ${mb(f.size)} (> 30 MB single-file limit)`);
    failed = true;
  }
}
if (total > HARD) {
  console.error(`FAIL: total ${mb(total)} exceeds the 30 MB hard limit`);
  failed = true;
} else if (total > TARGET) {
  console.warn(`WARN: total ${mb(total)} exceeds the 8 MB target`);
}
process.exit(failed ? 1 : 0);
