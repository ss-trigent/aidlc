// Self-check for the one thing in aidlc-scaffold.mjs that fails silently and
// destroys real work: --update must refresh framework files while leaving every
// team-owned file exactly as the team left it.
//
//   npm test
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

  // the charters send personas to these, so the scaffold must create them
  for (const f of [
    ['inception', 'architecture', 'README.md'],
    ['inception', 'design', 'README.md'],
    ['ONBOARDING.md'],
  ])
    assert.ok(existsSync(join(target, ...f)), `${f.join('/')} was scaffolded`);

  // the team tailors their seeds and records real traceability data
  const standards = join(target, 'ai', 'standards', 'coding-standards.md');
  const manifest = join(target, 'knowledge', 'traceability', 'manifest.json');
  const onboarding = join(target, 'ONBOARDING.md');
  writeFileSync(standards, '# our rules\n');
  writeFileSync(manifest, '{"ours":true}\n');
  writeFileSync(onboarding, '# our onboarding\n');
  // ...and someone drifts a framework file, which the update must put back
  const gate = join(target, 'ai', 'gates', 'delivery.md');
  const gateBefore = readFileSync(gate, 'utf8');
  writeFileSync(gate, 'drifted\n');

  // a second plain run refuses rather than overwriting anything
  assert.throws(() => run(target), /already installed/);

  run(target, '--update');

  assert.equal(readFileSync(standards, 'utf8'), '# our rules\n', 'tailored standards survived');
  assert.equal(readFileSync(manifest, 'utf8'), '{"ours":true}\n', 'traceability data survived');
  assert.equal(readFileSync(onboarding, 'utf8'), '# our onboarding\n', 'onboarding survived');
  assert.equal(readFileSync(gate, 'utf8'), gateBefore, 'framework file was refreshed');
});

test('--update refuses when nothing is installed', () => {
  const target = mkdtempSync(join(tmpdir(), 'aidlc-scaffold-'));
  assert.equal(existsSync(join(target, 'ai', 'AI-DLC.md')), false);
  assert.throws(() => run(target, '--update'), /needs an existing install/);
});

test('--profile e2e installs the layer at --root and no gate machinery', () => {
  const target = mkdtempSync(join(tmpdir(), 'aidlc-e2e-'));
  execFileSync('git', ['init', '-q'], { cwd: target });
  run(target, '--profile', 'e2e', '--root', 'tests/browser');

  for (const f of [
    'tests/browser/playwright.config.ts',
    'tests/browser/src/seed.setup.ts',
    'tests/browser/plans/README.md',
    '.github/workflows/e2e.yml',
  ])
    assert.ok(existsSync(join(target, f)), `missing ${f}`);

  // the harness-agnostic claim, asserted rather than promised: four config paths,
  // and the three shapes the harnesses actually disagree on
  const cfg = (f) => JSON.parse(readFileSync(join(target, f), 'utf8'));
  assert.ok(cfg('.mcp.json').mcpServers.playwright, 'Claude Code');
  assert.ok(cfg('.cursor/mcp.json').mcpServers.playwright, 'Cursor');
  assert.ok(cfg('.vscode/mcp.json').servers.playwright, 'VS Code uses servers, not mcpServers');
  assert.equal(cfg('opencode.json').mcp.playwright.type, 'local', 'opencode needs a type');
  assert.ok(Array.isArray(cfg('opencode.json').mcp.playwright.command), 'opencode command is an array');

  // a standalone QA repo gets the one persona it needs, on every harness...
  assert.ok(existsSync(join(target, 'ai', 'templates', 'test-plan.md')));
  assert.ok(existsSync(join(target, '.claude', 'skills', 'qa', 'SKILL.md')));
  // ...without the plugin wrapper's "stop and run /aidlc-init" banner: that
  // points at machinery this profile deliberately does not install
  assert.ok(
    !readFileSync(join(target, '.claude', 'skills', 'qa', 'SKILL.md'), 'utf8').includes(
      'Framework not installed',
    ),
    'no stop-banner in a repo the framework never installs to',
  );
  assert.ok(existsSync(join(target, '.cursor', 'commands', 'qa.md')), 'Cursor surface generated');
  assert.ok(existsSync(join(target, '.opencode', 'commands', 'qa.md')), 'opencode surface generated');
  assert.ok(existsSync(join(target, '.github', 'prompts', 'qa.prompt.md')), 'Copilot surface generated');
  // ...and none of the machinery that would imply it holds requirements or a gate
  assert.ok(!existsSync(join(target, 'tools', 'aidlc-check.mjs')), 'no validator in a QA repo');
  // ...but it does get the one tool that turns a run into cross-repo evidence
  assert.ok(existsSync(join(target, 'tools', 'aidlc-qa-coverage.mjs')), 'coverage tool present');
  assert.ok(!existsSync(join(target, 'inception')), 'a QA repo holds no requirements');
  assert.ok(!existsSync(join(target, 'ai', 'gates')), 'a QA repo holds no gate authority');
  assert.ok(!existsSync(join(target, 'knowledge')), 'a QA repo holds no manifest');
  assert.ok(!existsSync(join(target, 'ai', 'roles', 'dev.md')), 'only the qa charter');

  // testDir is the ONLY record of where the layer lives
  const pw = readFileSync(join(target, 'tests/browser/playwright.config.ts'), 'utf8');
  assert.match(pw, /testDir: '\.\/src'/);

  // ...and the CI job must point at that root, or it runs nothing: the config,
  // its testDir and the JSON report all live there, not at the repository root
  const wf = readFileSync(join(target, '.github', 'workflows', 'e2e.yml'), 'utf8');
  assert.ok(!wf.includes('__E2E_ROOT__'), 'the root placeholder was substituted');
  assert.match(wf, /--config tests\/browser\/playwright\.config\.ts/);
  assert.match(wf, /--report tests\/browser\/playwright-report\.json/);
  assert.match(wf, /^\s+tests\/browser\/playwright-report\.json$/m, 'artifact path follows the root');
});

test('--profile e2e merges into an existing MCP config instead of replacing it', () => {
  const target = mkdtempSync(join(tmpdir(), 'aidlc-e2e-mcp-'));
  execFileSync('git', ['init', '-q'], { cwd: target });
  // what an adopting repo already has (ai/integrations.md names these two)
  writeFileSync(
    join(target, '.mcp.json'),
    JSON.stringify({ mcpServers: { nx: { command: 'npx', args: ['nx-mcp'] } } }, null, 2),
  );
  writeFileSync(
    join(target, 'opencode.json'),
    JSON.stringify({ model: 'ours', mcp: { context7: { type: 'local', command: ['c7'] } } }, null, 2),
  );

  run(target, '--profile', 'e2e'); // must NOT abort on those two files

  const cfg = (f) => JSON.parse(readFileSync(join(target, f), 'utf8'));
  assert.ok(cfg('.mcp.json').mcpServers.nx, 'the team\'s server survived');
  assert.ok(cfg('.mcp.json').mcpServers.playwright, 'playwright was added');
  assert.ok(cfg('opencode.json').mcp.context7, 'the team\'s opencode server survived');
  assert.ok(cfg('opencode.json').mcp.playwright, 'playwright was added');
  assert.equal(cfg('opencode.json').model, 'ours', 'unrelated opencode config survived');
});

test('--profile e2e ignores the session credential where Playwright writes it', () => {
  const target = mkdtempSync(join(tmpdir(), 'aidlc-e2e-ignore-'));
  execFileSync('git', ['init', '-q'], { cwd: target });
  writeFileSync(join(target, '.gitignore'), 'node_modules\n');
  run(target, '--profile', 'e2e', '--root', 'tests/browser');

  // storageState and outputDir are CWD-relative (the reporter's outputFile is
  // not), so a CI run from the repo root drops .auth/user.json THERE. The layer's
  // own .gitignore cannot reach it, and it is a live session credential.
  const rootIgnore = readFileSync(join(target, '.gitignore'), 'utf8');
  assert.match(rootIgnore, /^node_modules$/m, "the team's own ignores survived");
  for (const line of ['.auth/', 'test-results/'])
    assert.match(rootIgnore, new RegExp(`^${line.replace('.', '\\.')}$`, 'm'), line);
  const check = (cwd, p) =>
    execFileSync('git', ['check-ignore', p], { cwd, encoding: 'utf8' }).trim();
  assert.equal(check(target, '.auth/user.json'), '.auth/user.json');
  // ...and still ignored for someone running the suite from inside the layer
  assert.equal(check(target, 'tests/browser/.auth/user.json'), 'tests/browser/.auth/user.json');
});

test('--profile e2e adds only the layer to an installed repo', () => {
  const target = mkdtempSync(join(tmpdir(), 'aidlc-e2e-installed-'));
  execFileSync('git', ['init', '-q'], { cwd: target });
  run(target); // full framework first
  const gate = readFileSync(join(target, 'ai', 'gates', 'delivery.md'), 'utf8');

  // a plain second run refuses; the profile must not be caught by that guard
  assert.throws(() => run(target), /already installed/);
  run(target, '--profile', 'e2e');

  assert.ok(existsSync(join(target, 'e2e', 'playwright.config.ts')), 'default root is e2e/');
  assert.equal(
    readFileSync(join(target, 'ai', 'gates', 'delivery.md'), 'utf8'),
    gate,
    'the framework was left alone',
  );
});

test('--profile rejects anything but e2e', () => {
  const target = mkdtempSync(join(tmpdir(), 'aidlc-e2e-bad-'));
  assert.throws(() => run(target, '--profile', 'unit'), /only profile is e2e/);
});

test('scaffold seeds the development spec home', () => {
  const target = mkdtempSync(join(tmpdir(), 'aidlc-specs-'));
  execFileSync('git', ['init', '-q'], { cwd: target });
  run(target);

  const index = readFileSync(join(target, 'inception', 'specs', 'index.md'), 'utf8');
  assert.match(index, /\| Story \| Feature \| Tier \| Status \| Folder \|/);
  const log = readFileSync(
    join(target, 'inception', 'specs', '_change-log.md'),
    'utf8',
  );
  assert.match(log, /Simple tier/);

  // the seeded CI fetches full history: the Gate D1 plan-tamper check verifies
  // approved plan commits with `git show`, which a shallow clone cannot reach
  const wf = readFileSync(join(target, '.github', 'workflows', 'aidlc-check.yml'), 'utf8');
  assert.match(wf, /fetch-depth: 0/);
});

test('--profile e2e at the repository root merges .gitignore, never replaces it', () => {
  const target = mkdtempSync(join(tmpdir(), 'aidlc-e2e-root-'));
  execFileSync('git', ['init', '-q'], { cwd: target });
  writeFileSync(join(target, '.gitignore'), 'node_modules\n.env\n');
  run(target, '--profile', 'e2e', '--root', '.');

  const ig = readFileSync(join(target, '.gitignore'), 'utf8');
  assert.match(ig, /^node_modules$/m, "the team's ignores survived");
  assert.match(ig, /^\.env$/m);
  for (const line of ['.auth/', 'playwright-report.json', 'test-results/'])
    assert.match(ig, new RegExp(`^${line.replace(/[.]/g, '\\.')}$`, 'm'), line);
  assert.ok(existsSync(join(target, 'playwright.config.ts')), 'config landed at the root');
});

test('a --profile e2e rerun preserves the config and setup the team edited', () => {
  // testDir in the config is the only record of where the tests live, and
  // seed.setup.ts carries the product's real sign-in selectors — a rerun
  // (say, after a framework upgrade) must not reset either or demand --force
  const target = mkdtempSync(join(tmpdir(), 'aidlc-e2e-rerun-'));
  execFileSync('git', ['init', '-q'], { cwd: target });
  run(target, '--profile', 'e2e', '--root', 'tests/browser');

  const cfg = join(target, 'tests', 'browser', 'playwright.config.ts');
  const setup = join(target, 'tests', 'browser', 'src', 'seed.setup.ts');
  writeFileSync(cfg, '// ours: testDir moved\n');
  writeFileSync(setup, '// ours: real selectors\n');

  run(target, '--profile', 'e2e', '--root', 'tests/browser'); // must not abort

  assert.equal(readFileSync(cfg, 'utf8'), '// ours: testDir moved\n');
  assert.equal(readFileSync(setup, 'utf8'), '// ours: real selectors\n');
});
