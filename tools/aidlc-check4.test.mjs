// Self-check for the reverse edge of checks 3-4: a story FILE that nobody added
// to the manifest. Those checks iterate manifest.stories, so an unmanifested
// story was invisible to both — its ACs were never matched against the file and
// never required a citing test. On a delivery branch that meant green CI with
// zero tests, which is exactly the guarantee check 4 exists to make.
//
//   npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = dirname(dirname(fileURLToPath(import.meta.url)));
const SCAFFOLD = join(REPO, 'tools', 'aidlc-scaffold.mjs');
const CHECK = join(REPO, 'tools', 'aidlc-check.mjs');

function runCheck(cwd) {
  try {
    return execFileSync(process.execPath, [CHECK], { cwd, encoding: 'utf8' });
  } catch (e) {
    return `${e.stdout ?? ''}${e.stderr ?? ''}`;
  }
}

// `manifested` decides whether US-030 gets a manifest entry; `branch` is what we
// end up on, which is how the validator derives what is in delivery.
function fixture({ manifested, branch, storyFile = true }) {
  const dir = mkdtempSync(join(tmpdir(), 'aidlc-check4-'));
  execFileSync('git', ['init', '-q'], { cwd: dir });
  execFileSync(process.execPath, [SCAFFOLD, dir], { cwd: dir, encoding: 'utf8' });

  writeFileSync(
    join(dir, 'inception', 'product', 'requirements', 'BRD-001.md'),
    '# BRD-001\n\n| ID | Requirement |\n| --- | --- |\n| REQ-001 | Things work |\n',
  );
  if (storyFile)
    writeFileSync(
      join(dir, 'inception', 'stories', 'user-stories', 'US-030-thing.md'),
      '# US-030 — Thing\n\n## Acceptance criteria\n\n### AC-01 It works\n\nIt works.\n',
    );

  if (manifested) {
    mkdirSync(join(dir, 'src'), { recursive: true });
    writeFileSync(
      join(dir, 'src', 'thing.spec.ts'),
      "test('it works (US-030/AC-01)', () => {});\n",
    );
    const p = join(dir, 'knowledge', 'traceability', 'manifest.json');
    const m = JSON.parse(readFileSync(p, 'utf8'));
    m.requirements['REQ-001'] = { stories: ['US-030'] };
    m.stories['US-030'] = {
      requirements: ['REQ-001'],
      acs: ['AC-01'],
      tests: ['src/thing.spec.ts'],
    };
    writeFileSync(p, `${JSON.stringify(m, null, 2)}\n`);
  }

  execFileSync('git', ['add', '-A'], { cwd: dir });
  execFileSync('git', ['-c', 'user.email=t@e.st', '-c', 'user.name=T', 'commit', '-qm', 'fixture'], { cwd: dir });
  if (branch) execFileSync('git', ['checkout', '-q', '-b', branch], { cwd: dir });
  return dir;
}

test('an unmanifested story on a delivery branch is an error', () => {
  const out = runCheck(
    fixture({ manifested: false, branch: 'feat/US-030-thing' }),
  );
  assert.match(out, /ERROR: US-030 is in delivery .* no entry in knowledge\/traceability\/manifest\.json/);
});

test('an unmanifested story NOT in delivery is only a warning', () => {
  const out = runCheck(fixture({ manifested: false, branch: 'docs/notes' }));
  assert.match(out, /warn: US-030 has a story file but no entry in/);
  assert.doesNotMatch(out, /ERROR: US-030 is in delivery/);
});

test('a delivery branch whose story file does not exist is an error', () => {
  const out = runCheck(
    fixture({ manifested: false, storyFile: false, branch: 'feat/US-030-thing' }),
  );
  assert.match(out, /ERROR: branch is delivering US-030, which has no story file/);
});

test('a properly manifested story in delivery still passes', () => {
  const out = runCheck(
    fixture({ manifested: true, branch: 'feat/US-030-thing' }),
  );
  assert.doesNotMatch(out, /US-030/);
});
