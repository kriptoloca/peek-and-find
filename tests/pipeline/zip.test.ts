import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  EXCLUDED_DIRS,
  FILE_RECOMMENDED,
  buildZip,
  checkTree,
  listFiles,
  verifyZip,
} from '../../scripts/lib/zip.mjs';

let root = '';

function file(rel: string, content: string | Buffer): void {
  const abs = join(root, rel);
  mkdirSync(join(abs, '..'), { recursive: true });
  writeFileSync(abs, content);
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'peek-zip-'));
  file('index.html', '<!doctype html><title>x</title>');
  file('playgama-bridge.js', 'bridge');
  file('assets/index-abc.js', 'console.log(1)');
  file('atlases/kitchen.png', Buffer.alloc(10, 1));
  file('test/index.html', 'dev build, never shipped');
  file('.DS_Store', 'junk');
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('submission zip', () => {
  it('lists dist files sorted, without the /test/ build and dotfiles', () => {
    expect(EXCLUDED_DIRS).toContain('test');
    expect(listFiles(root)).toEqual([
      'assets/index-abc.js',
      'atlases/kitchen.png',
      'index.html',
      'playgama-bridge.js',
    ]);
  });

  it('is deterministic and reads back with index.html at the root', () => {
    const a = buildZip(root);
    const b = buildZip(root);
    expect(a.errors).toEqual([]);
    expect(a.sha256).toBe(b.sha256);
    expect(Buffer.from(a.zip).equals(Buffer.from(b.zip))).toBe(true);
    const back = verifyZip(a.zip);
    expect(back.hasRootIndex).toBe(true);
    expect(back.entries).toEqual(a.files.map((f) => f.path));
    expect(back.entries).not.toContain('test/index.html');
  });

  it('changes when a file changes', () => {
    const a = buildZip(root);
    file('assets/index-abc.js', 'console.log(2)');
    expect(buildZip(root).sha256).not.toBe(a.sha256);
  });

  it('rejects a tree without a root index.html and pre-compressed artefacts', () => {
    expect(checkTree([{ path: 'game/index.html', size: 1 }]).errors[0]).toMatch(/index\.html/);
    const r = checkTree([
      { path: 'index.html', size: 1 },
      { path: 'assets/a.js.gz', size: 1 },
      { path: 'b.zip', size: 1 },
    ]);
    expect(r.errors).toHaveLength(2);
    file('assets/index-abc.js.br', 'x');
    expect(buildZip(root).errors.some((e) => e.includes('.br'))).toBe(true);
  });

  it('warns above 512 KB per file and fails above 30 MB', () => {
    const r = checkTree([
      { path: 'index.html', size: 1 },
      { path: 'assets/big.js', size: FILE_RECOMMENDED + 1 },
      { path: 'huge.bin', size: 31 * 1024 * 1024 },
    ]);
    expect(r.warnings.some((w) => w.includes('big.js'))).toBe(true);
    expect(r.errors.some((e) => e.includes('huge.bin'))).toBe(true);
  });
});
