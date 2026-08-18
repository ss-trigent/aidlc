// Self-check for check 5's spec discovery — the rule that a spec citing a story
// must be listed in that story's tests[]. That rule only ever looked in apps/ and
// libs/, so every other layout (flat src/, packages/, an e2e/ dir) had its
// citations silently unvalidated. The fixture puts the spec somewhere else on
// purpose: if discovery narrows again, these fail.
//
//   npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = dirname(dirname(fileURLToPath(import.meta.url)));
const SCAFFOLD = join(REPO, 'tools', 'aidlc-scaffold.mjs');
const CHECK = join(REPO, 'tools', 'aidlc-check.mjs');

// aidlc-check exits 1 on any error, and a bare fixture legitimately has other
// errors — so every assertion here is on the presence or absence of ONE message.
function runCheck(cwd) {
  try {
    return execFileSync(process.execPath, [CHECK], { cwd, encoding: 'utf8' });
  } catch (e) {
    return `${e.stdout ?? ''}${e.stderr ?? ''}`;
  }
}

// A minimal traceable repo: one requirement, one story, one AC, one e2e spec.
function fixture({ specPath, listed, track = true }) {
  const dir = mkdtempSync(join(tmpdir(), 'aidlc-check5-'));
  execFileSync('git', ['init', '-q'], { cwd: dir });
  execFileSync(process.execPath, [SCAFFOLD, dir], { cwd: dir, encoding: 'utf8' });

  writeFileSync(
    join(dir, 'inception', 'product', 'requirements', 'brd.md'),
    '# BRD\n\n| ID | Requirement |\n| --- | --- |\n| REQ-001 | Route detail is visible |\n',
  );
  writeFileSync(
    join(dir, 'inception', 'stories', 'user-stories', 'US-003-route-detail.md'),
    '# US-003 — Route detail\n\n## Acceptance criteria\n\n### AC-01 Shows the route\n\nThe route renders.\n',
  );
  mkdirSync(dirname(join(dir, specPath)), { recursive: true });
  writeFileSync(
    join(dir, specPath),
    "import { test, expect } from '@playwright/test';\n\n" +
      "test('shows the route (US-003/AC-01)', async () => {\n  expect(1).toBe(1);\n});\n",
  );

  const manifestPath = join(dir, 'knowledge', 'traceability', 'manifest.json');
  const m = JSON.parse(readFileSync(manifestPath, 'utf8'));
  m.requirements['REQ-001'] = { stories: ['US-003'] };
  m.stories['US-003'] = {
    requirements: ['REQ-001'],
    acs: ['AC-01'],
    tests: listed ? [specPath] : [],
  };
  writeFileSync(manifestPath, `${JSON.stringify(m, null, 2)}\n`);

  if (track) execFileSync('git', ['add', '-A'], { cwd: dir });
  return dir;
}

test('check 5 catches a citing spec outside apps/ and libs/', () => {
  const out = runCheck(
    fixture({ specPath: 'e2e/src/US-003-route.spec.ts', listed: false }),
  );
  assert.match(
    out,
    /e2e\/src\/US-003-route\.spec\.ts cites US-003 but is not listed/,
  );
});

test('check 5 is satisfied once that spec is listed in tests[]', () => {
  const out = runCheck(
    fixture({ specPath: 'e2e/src/US-003-route.spec.ts', listed: true }),
  );
  assert.doesNotMatch(out, /US-003-route\.spec\.ts cites US-003/);
});

test('check 5 ignores specs git does not track', () => {
  // gitignored or never-added files are not the repo's to validate — asserting
  // this because `git ls-files` gives it for free and a walk would not.
  const dir = fixture({
    specPath: 'e2e/src/US-003-route.spec.ts',
    listed: false,
    track: false,
  });
  const out = runCheck(dir);
  assert.doesNotMatch(out, /US-003-route\.spec\.ts cites US-003/);
});
