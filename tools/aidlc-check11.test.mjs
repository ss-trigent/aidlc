// Self-check for check 11's flow and token rules (ADR-008): links_to edges
// resolve and are well-formed, every screen is reachable from an entry, token
// contrast is measured per theme (and says so when it cannot be), and the
// tokens.json export resolves aliases and hides --p-* primitives.
//
//   npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = dirname(dirname(fileURLToPath(import.meta.url)));
const SCAFFOLD = join(REPO, 'tools', 'aidlc-scaffold.mjs');
const CHECK = join(REPO, 'tools', 'aidlc-check.mjs');

// A bare fixture legitimately has other errors (stale matrix, fake REQ), so
// every assertion is on the presence or absence of ONE message.
function runCheck(cwd) {
  try {
    return execFileSync(process.execPath, [CHECK], {
      cwd,
      encoding: 'utf8',
      env: { ...process.env, GITHUB_HEAD_REF: '' },
    });
  } catch (e) {
    return `${e.stdout ?? ''}${e.stderr ?? ''}`;
  }
}

// Scaffolds a repo, then writes the given screens (id -> manifest entry) with
// one-state spec files, and optionally replaces tokens.css.
function fixture({ screens = {}, tokensCss } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'aidlc-check11-'));
  execFileSync('git', ['init', '-q'], { cwd: dir });
  execFileSync(process.execPath, [SCAFFOLD, dir], { cwd: dir, encoding: 'utf8' });

  const manifestPath = join(dir, 'knowledge', 'traceability', 'manifest.json');
  const m = JSON.parse(readFileSync(manifestPath, 'utf8'));
  m.requirements['REQ-001'] = { stories: [], screens: Object.keys(screens) };
  for (const [scr, entry] of Object.entries(screens)) {
    writeFileSync(
      join(dir, 'inception', 'design', 'screens', `${scr}-x.md`),
      `# ${scr} — X\n\n### ST-01 Default\n`,
    );
    m.screens[scr] = { requirements: ['REQ-001'], states: ['ST-01'], ...entry };
  }
  writeFileSync(manifestPath, `${JSON.stringify(m, null, 2)}\n`);
  if (tokensCss) writeFileSync(join(dir, 'inception', 'design', 'tokens.css'), tokensCss);
  return dir;
}

test('a links_to target that is not a screen is an error', () => {
  const out = runCheck(
    fixture({ screens: { 'SCR-001': { entry: true, links_to: ['SCR-404'] } } }),
  );
  assert.match(out, /SCR-001 links_to SCR-404, which is not a node/);
});

test('a cluster that only links to itself is unreachable even when another screen is an entry', () => {
  const out = runCheck(
    fixture({
      screens: {
        'SCR-003': { entry: true },
        'SCR-001': { links_to: ['SCR-002'] },
        'SCR-002': { links_to: ['SCR-001'] },
      },
    }),
  );
  assert.match(out, /SCR-001 is unreachable from any entry screen/);
  assert.match(out, /SCR-002 is unreachable from any entry screen/);
  assert.doesNotMatch(out, /SCR-003 is unreachable/);
});

test('a screen reached through a chain from the entry is not flagged', () => {
  const out = runCheck(
    fixture({
      screens: {
        'SCR-001': { entry: true, links_to: ['SCR-002'] },
        'SCR-002': { links_to: ['SCR-003'] },
        'SCR-003': {},
      },
    }),
  );
  assert.doesNotMatch(out, /is unreachable/);
});

test('no entry screen at all is reported once, not per screen', () => {
  const out = runCheck(
    fixture({
      screens: {
        'SCR-001': { links_to: ['SCR-002'] },
        'SCR-002': { links_to: ['SCR-001'] },
      },
    }),
  );
  assert.match(out, /no screen is marked "entry": true/);
  assert.doesNotMatch(out, /is unreachable/);
});

test('links_to that is not an array is one clear error, not one per character', () => {
  const out = runCheck(
    fixture({ screens: { 'SCR-001': { entry: true, links_to: 'SCR-001' } } }),
  );
  assert.match(out, /SCR-001: "links_to" must be an array/);
  assert.doesNotMatch(out, /links_to S,/);
});

test('contrast is measured per theme and names the failing theme', () => {
  const out = runCheck(
    fixture({
      tokensCss: `:root { --c-text: #1a1a1a; --c-surface: #ffffff; }
@media (prefers-color-scheme: dark) { :root { --c-text: #444444; --c-surface: #1a1a1a; } }
`,
    }),
  );
  assert.match(out, /tokens\.css \(dark\): --c-text on --c-surface is \d\.\d\d:1/);
  assert.doesNotMatch(out, /tokens\.css \(light\): --c-text on --c-surface/);
});

test('a colour the contrast check cannot read is reported, not skipped', () => {
  const out = runCheck(
    fixture({ tokensCss: ':root { --c-text: hsl(0 0% 80%); --c-surface: #ffffff; }\n' }),
  );
  assert.match(out, /tokens\.css \(light\): contrast not checked for --c-text/);
});

test('the seeded tokens.json resolves aliases and exports no primitives', () => {
  const dir = fixture();
  const tokens = JSON.parse(
    readFileSync(join(dir, 'inception', 'design', 'tokens.json'), 'utf8'),
  );
  assert.equal(tokens.light.color.text.$value, '#1a1a1a');
  assert.equal(tokens.dark.color.text.$value, '#f5f5f5');
  assert.equal(tokens.light.icon.md.$type, 'dimension');
  const exported = JSON.stringify(tokens);
  assert.doesNotMatch(exported, /"--p-|p-gray/);
  assert.doesNotMatch(exported, /var\(/);
});
