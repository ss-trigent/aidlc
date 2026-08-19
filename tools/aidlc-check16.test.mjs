// Self-check for check 16 — the rule that a spec package present in a repo is
// internally honest. Each test asserts the presence or absence of ONE message,
// because a bare fixture legitimately has other errors.
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
    // GITHUB_HEAD_REF is scrubbed on purpose. The validator prefers it over the
    // checked-out branch — correct on a real PR, wrong here: the child would
    // inherit THIS repo's PR branch and derive delivery state from it instead of
    // from the fixture's branch, so any assertion about a story being in
    // delivery would pass locally and fail in CI.
    return execFileSync(process.execPath, [CHECK], {
      cwd,
      encoding: 'utf8',
      env: { ...process.env, GITHUB_HEAD_REF: '' },
    });
  } catch (e) {
    return `${e.stdout ?? ''}${e.stderr ?? ''}`;
  }
}

// A scaffolded repo with one story and one spec package. `traceFrs` is what the
// traceability table lists; the spec always declares FR-01 and FR-02.
function fixture({
  traceFrs = ['FR-01', 'FR-02'],
  tracePath = 'src/a.ts',
  indexRow = true,
} = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'aidlc-check16-'));
  execFileSync('git', ['init', '-q'], { cwd: dir });
  execFileSync(process.execPath, [SCAFFOLD, dir], { cwd: dir, encoding: 'utf8' });

  writeFileSync(
    join(dir, 'inception', 'stories', 'user-stories', 'US-007-export.md'),
    '# US-007 — Export\n\n## Acceptance criteria\n\n### AC-01 Downloads a file\n\nIt downloads.\n',
  );
  mkdirSync(join(dir, 'src'), { recursive: true });
  writeFileSync(join(dir, 'src', 'a.ts'), 'export const a = 1;\n');
  // The traceability table cites this in its "Proven by" column, and rule 2
  // checks every backticked path — so the consistent fixture must have it.
  writeFileSync(
    join(dir, 'src', 'a.spec.ts'),
    "test('exports csv (US-007/AC-01)', () => {});\n",
  );

  const pkg = join(dir, 'inception', 'specs', 'US-007-export');
  mkdirSync(pkg, { recursive: true });
  writeFileSync(
    join(pkg, 'spec.md'),
    '# US-007 — Export\n\n| **Story** | `inception/stories/user-stories/US-007-export.md` |\n\n' +
      '## Functional requirements\n\n| ID | Requirement | Priority | Serves | Status |\n| --- | --- | --- | --- | --- |\n' +
      '| FR-01 | Exports CSV | Must | AC-01 | implemented |\n' +
      '| FR-02 | Names the file | Must | AC-01 | implemented |\n',
  );
  writeFileSync(
    join(pkg, 'traceability.md'),
    '# US-007 — traceability\n\n## Requirement to code\n\n| Req | File | Symbol | Proven by | Status |\n| --- | --- | --- | --- | --- |\n' +
      traceFrs
        .map(
          (fr) =>
            `| ${fr} | \`${tracePath}\` | \`a\` | \`src/a.spec.ts\` | implemented |`,
        )
        .join('\n') +
      '\n',
  );

  if (indexRow) {
    const idx = join(dir, 'inception', 'specs', 'index.md');
    writeFileSync(
      idx,
      readFileSync(idx, 'utf8') +
        '| US-007 | Export | Complex | implemented | `inception/specs/US-007-export/` |\n',
    );
  }
  execFileSync('git', ['add', '-A'], { cwd: dir });
  return dir;
}

test('check 16 passes a consistent package', () => {
  const out = runCheck(fixture());
  assert.doesNotMatch(out, /US-007-export/);
});

test('check 16 catches an FR missing from traceability', () => {
  const out = runCheck(fixture({ traceFrs: ['FR-01'] }));
  assert.match(out, /US-007-export.*FR-02 .*not in traceability\.md/);
});

test('check 16 catches a traceability row citing a file that does not exist', () => {
  const out = runCheck(fixture({ tracePath: 'src/gone.ts' }));
  assert.match(out, /US-007-export.*src\/gone\.ts.*does not exist/);
});

test('check 16 catches a package with no row in the index', () => {
  const out = runCheck(fixture({ indexRow: false }));
  assert.match(out, /US-007-export.*no row in inception\/specs\/index\.md/);
});

test('check 16 catches a spec citing a story that does not exist', () => {
  const dir = fixture();
  const spec = join(dir, 'inception', 'specs', 'US-007-export', 'spec.md');
  writeFileSync(
    spec,
    readFileSync(spec, 'utf8').replace('US-007-export.md', 'US-099-ghost.md'),
  );
  const out = runCheck(dir);
  assert.match(out, /US-007-export.*cites US-099 which is not a story/);
});

test('check 16 catches an AC citation that the story does not define', () => {
  const dir = fixture();
  const spec = join(dir, 'inception', 'specs', 'US-007-export', 'spec.md');
  writeFileSync(
    spec,
    readFileSync(spec, 'utf8').replace(
      '| AC-01 | implemented |',
      '| AC-09 | implemented |',
    ),
  );
  const out = runCheck(dir);
  assert.match(out, /US-007-export.*AC-09 which US-007 does not define/);
});

test('check 16 catches a malformed Gate D1 approval block', () => {
  const dir = fixture();
  writeFileSync(
    join(dir, 'inception', 'specs', 'US-007-export', 'implementation-plan.md'),
    '# US-007 — implementation plan\n\n## Approval — Gate D1\n\n| Field | Value |\n| --- | --- |\n' +
      '| Status | approved |\n| Approved by | — |\n| Approved on | 2026-08-19 |\n| Plan commit approved | deadbee |\n\n## Steps\n\nNone.\n',
  );
  execFileSync('git', ['add', '-A'], { cwd: dir });
  const out = runCheck(dir);
  assert.match(out, /US-007-export.*approved but names no approver/);
});

// Rules 5-6 need real commits: the stamp records a SHA, and the check compares
// the plan at that SHA against the plan now. A fixture that only writes files
// cannot exercise that, which is why these build actual history.
function approvedFixture() {
  const dir = fixture();
  execFileSync('git', ['-c', 'user.email=t@e.st', '-c', 'user.name=T', 'commit', '-qm', 'scaffold'], { cwd: dir });

  const plan = join(dir, 'inception', 'specs', 'US-007-export', 'implementation-plan.md');
  const body =
    '# US-007 — implementation plan\n\n## Approval — Gate D1\n\n| Field | Value |\n| --- | --- |\n' +
    '| Status | awaiting review |\n| Approved by | — |\n| Approved on | — |\n| Plan commit approved | — |\n\n' +
    '## Steps\n\n### Step 1 — export the rows\n\nWrite the CSV writer.\n';
  writeFileSync(plan, body);
  execFileSync('git', ['add', '-A'], { cwd: dir });
  execFileSync('git', ['-c', 'user.email=t@e.st', '-c', 'user.name=T', 'commit', '-qm', 'plan'], { cwd: dir });
  const sha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: dir, encoding: 'utf8' }).trim();

  // stamp the approval, exactly as the DEV charter says to
  writeFileSync(
    plan,
    body
      .replace('| Status | awaiting review |', '| Status | approved |')
      .replace('| Approved by | — |', '| Approved by | Shivang <shivang_s@trigent.com> |')
      .replace('| Approved on | — |', '| Approved on | 2026-08-19 |')
      .replace('| Plan commit approved | — |', `| Plan commit approved | ${sha} |`),
  );
  execFileSync('git', ['add', '-A'], { cwd: dir });
  execFileSync('git', ['-c', 'user.email=t@e.st', '-c', 'user.name=T', 'commit', '-qm', 'stamp'], { cwd: dir });
  return { dir, plan, sha };
}

test('check 16 accepts a stamped plan that has not changed since approval', () => {
  const { dir } = approvedFixture();
  const out = runCheck(dir);
  assert.doesNotMatch(out, /US-007-export/);
});

test('check 16 catches a plan edited after approval with no change-log row', () => {
  const { dir, plan, sha } = approvedFixture();
  writeFileSync(
    plan,
    readFileSync(plan, 'utf8').replace('Write the CSV writer.', 'Write the CSV writer and a new endpoint.'),
  );
  const out = runCheck(dir);
  assert.match(out, new RegExp(`US-007-export.*changed after its Gate D1 approval \\(${sha}\\)`));
});

test('check 16 accepts a post-approval plan edit that IS logged', () => {
  const { dir, plan } = approvedFixture();
  writeFileSync(
    plan,
    readFileSync(plan, 'utf8').replace('Write the CSV writer.', 'Write the CSV writer and a new endpoint.'),
  );
  writeFileSync(
    join(dir, 'inception', 'specs', 'US-007-export', 'change-log.md'),
    '# US-007 — change log\n\n| Date | Change | Why | Requirements affected |\n| --- | --- | --- | --- |\n' +
      '| 2026-08-19 | Step 1 now adds an endpoint | Review found the writer alone insufficient | FR-01 |\n',
  );
  const out = runCheck(dir);
  assert.doesNotMatch(out, /changed after its Gate D1 approval/);
});

test('check 16 warns rather than fails when the approved SHA is unreachable', () => {
  const { dir, plan } = approvedFixture();
  writeFileSync(
    plan,
    readFileSync(plan, 'utf8').replace(/\| Plan commit approved \| \w+ \|/, '| Plan commit approved | abcdef1234 |'),
  );
  const out = runCheck(dir);
  assert.match(out, /warn: .*approved plan commit abcdef1234 is not reachable/);
  assert.doesNotMatch(out, /ERROR: .*US-007-export.*changed after/);
});
