// Self-check for the one thing in aidlc-scaffold.mjs that fails silently and
// destroys real work: --update must refresh framework files while leaving every
// team-owned file exactly as the team left it.
//
//   node --test tools/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = dirname(dirname(fileURLToPath(import.meta.url)));
const SCAFFOLD = join(REPO, 'tools', 'aidlc-scaffold.mjs');
const run = (cwd, ...args) =>
  execFileSync(process.execPath, [SCAFFOLD, cwd, ...args], { cwd, encoding: 'utf8' });

test('--update refreshes the framework and preserves team-owned files', () => {
  const target = mkdtempSync(join(tmpdir(), 'aidlc-scaffold-'));
  execFileSync('git', ['init', '-q'], { cwd: target });
  run(target);

  // the team tailors their seeds and records real traceability data
  const standards = join(target, 'ai', 'standards', 'coding-standards.md');
  const manifest = join(target, 'knowledge', 'traceability', 'manifest.json');
  writeFileSync(standards, '# our rules\n');
  writeFileSync(manifest, '{"ours":true}\n');
  // ...and someone drifts a framework file, which the update must put back
  const gate = join(target, 'ai', 'gates', 'delivery.md');
  const gateBefore = readFileSync(gate, 'utf8');
  writeFileSync(gate, 'drifted\n');

  // a second plain run refuses rather than overwriting anything
  assert.throws(() => run(target), /already installed/);

  run(target, '--update');

  assert.equal(readFileSync(standards, 'utf8'), '# our rules\n', 'tailored standards survived');
  assert.equal(readFileSync(manifest, 'utf8'), '{"ours":true}\n', 'traceability data survived');
  assert.equal(readFileSync(gate, 'utf8'), gateBefore, 'framework file was refreshed');
});

test('--update refuses when nothing is installed', () => {
  const target = mkdtempSync(join(tmpdir(), 'aidlc-scaffold-'));
  assert.equal(existsSync(join(target, 'ai', 'AI-DLC.md')), false);
  assert.throws(() => run(target, '--update'), /needs an existing install/);
});
