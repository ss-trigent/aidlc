// Self-check for the cross-repo evidence path. Two things here fail silently and
// matter: a citation that is not extracted (a criterion quietly reads unproven)
// and a claim that is accepted without proof (a green tick nobody earned).
//
//   npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  COVERAGE_SCHEMA,
  coverageFromReport,
  validateCoverage,
} from './aidlc-qa-coverage.mjs';

const META = {
  sourceRepo: 'org/qa-e2e',
  productSha: '9f2c1ab',
  runUrl: 'https://github.com/org/qa-e2e/actions/runs/1234',
  generatedAt: '2026-08-18T10:04:00Z',
};

const spec = (title, status = 'passed') => ({
  title,
  file: 'src/US-003-route-detail.spec.ts',
  ok: status === 'passed',
  tests: [{ results: [{ status }] }],
});

// nested one level deep on purpose: Playwright nests describe blocks as suites,
// and a walk that only reads the top level would miss most real reports
const report = (...specs) => ({
  suites: [{ title: 'route detail', specs: [], suites: [{ specs }] }],
});

const storyAcs = new Map([['US-003', new Set(['AC-01', 'AC-02'])]]);
const anySha = () => true;

test('extracts one claim per cited test', () => {
  const doc = coverageFromReport(
    report(
      spec('renders the route (US-003/AC-01)'),
      spec('expands leg detail (US-003/AC-02)'),
    ),
    META,
  );
  assert.equal(doc.schema, COVERAGE_SCHEMA);
  assert.equal(doc.source_repo, 'org/qa-e2e');
  assert.equal(doc.product_sha, '9f2c1ab');
  assert.equal(doc.run_url, META.runUrl);
  assert.equal(doc.generated_at, META.generatedAt);
  assert.deepEqual(
    doc.results.map((r) => `${r.story}/${r.ac}:${r.outcome}`),
    ['US-003/AC-01:pass', 'US-003/AC-02:pass'],
  );
  assert.equal(doc.results[0].test, 'renders the route (US-003/AC-01)');
  assert.equal(doc.results[0].file, 'src/US-003-route-detail.spec.ts');
  assert.deepEqual(validateCoverage(doc, storyAcs, anySha).errors, []);
});

test('an uncited test is omitted, not guessed at', () => {
  const doc = coverageFromReport(
    report(spec('some sensible check nobody linked to a criterion')),
    META,
  );
  assert.deepEqual(doc.results, []);
});

test('a skipped test is not evidence', () => {
  // testing-standards: a skipped test cannot serve as AC proof
  const doc = coverageFromReport(
    report(spec('renders the route (US-003/AC-01)', 'skipped')),
    META,
  );
  assert.deepEqual(doc.results, []);
});

test('a failing test is recorded as fail and rejected on validation', () => {
  const doc = coverageFromReport(
    report(spec('renders the route (US-003/AC-01)', 'failed')),
    META,
  );
  assert.equal(doc.results[0].outcome, 'fail');
  const { errors } = validateCoverage(doc, storyAcs, anySha);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /US-003\/AC-01 failed/);
});

test('a claim against an unknown story or criterion is an error', () => {
  const base = coverageFromReport(
    report(spec('renders the route (US-003/AC-01)')),
    META,
  );

  const badAc = structuredClone(base);
  badAc.results[0].ac = 'AC-09';
  assert.match(
    validateCoverage(badAc, storyAcs, anySha).errors[0],
    /US-003 has no AC-09/,
  );

  const badStory = structuredClone(base);
  badStory.results[0].story = 'US-404';
  assert.match(
    validateCoverage(badStory, storyAcs, anySha).errors[0],
    /US-404 is not a story/,
  );
});

test('a pass with no evidence is not a pass', () => {
  const doc = coverageFromReport(
    report(spec('renders the route (US-003/AC-01)')),
    META,
  );
  doc.run_url = '';
  assert.match(
    validateCoverage(doc, storyAcs, anySha).errors[0],
    /claims a pass with no run_url/,
  );
});

test('an unknown schema is rejected outright', () => {
  const doc = coverageFromReport(report(), META);
  doc.schema = 'something-else/2';
  assert.match(
    validateCoverage(doc, storyAcs, anySha).errors[0],
    /unknown schema/,
  );
});

test('a product_sha this repo does not have is stale evidence, not an error', () => {
  const doc = coverageFromReport(
    report(spec('renders the route (US-003/AC-01)')),
    META,
  );
  const { errors, warnings } = validateCoverage(doc, storyAcs, () => false);
  assert.deepEqual(errors, []);
  assert.match(warnings[0], /9f2c1ab/);
});

// ---- check 15 in aidlc-check: opportunistic, and strict once present --------
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = dirname(dirname(fileURLToPath(import.meta.url)));

function scaffolded(coverage) {
  const dir = mkdtempSync(join(tmpdir(), 'aidlc-cov-'));
  execFileSync('git', ['init', '-q'], { cwd: dir });
  execFileSync(process.execPath, [join(REPO, 'tools', 'aidlc-scaffold.mjs'), dir], {
    cwd: dir,
    encoding: 'utf8',
  });
  writeFileSync(
    join(dir, 'inception', 'stories', 'user-stories', 'US-003-route.md'),
    '# US-003 — Route\n\n### AC-01 Renders\n\nbody\n',
  );
  if (coverage)
    writeFileSync(
      join(dir, 'knowledge', 'traceability', 'e2e-coverage.json'),
      `${JSON.stringify(coverage, null, 2)}\n`,
    );
  try {
    return execFileSync(process.execPath, [join(REPO, 'tools', 'aidlc-check.mjs')], {
      cwd: dir,
      encoding: 'utf8',
    });
  } catch (e) {
    return `${e.stdout ?? ''}${e.stderr ?? ''}`;
  }
}

test('aidlc-check says nothing about e2e when no evidence was published', () => {
  const out = scaffolded(null);
  assert.doesNotMatch(out, /e2e-coverage/);
});

test('aidlc-check rejects evidence citing a criterion the story does not define', () => {
  const out = scaffolded({
    schema: COVERAGE_SCHEMA,
    source_repo: 'org/qa-e2e',
    product_sha: '',
    run_url: 'https://example.test/run/1',
    generated_at: '2026-08-18T10:04:00Z',
    results: [
      { story: 'US-003', ac: 'AC-07', test: 'x (US-003/AC-07)', file: 'a.spec.ts', outcome: 'pass' },
    ],
  });
  assert.match(out, /e2e-coverage\.json: US-003 has no AC-07/);
});
