#!/usr/bin/env node
// Scaffolds the AI-DLC framework into a target repository — the deterministic
// part of /aidlc-init, runnable by anyone with Node: no Claude Code, no AI.
//
//   node tools/aidlc-scaffold.mjs [target-dir]     scaffold into target (default: cwd)
//   npx github:ss-trigent/aidlc                    same, from inside the target repo
//   npx github:ss-trigent/aidlc --update           upgrade an installed repo to this version
//
//   node tools/aidlc-scaffold.mjs --profile e2e [--root <dir>]
//                                                  install the browser-test layer
//
//   --profile e2e     install the Playwright + MCP e2e layer instead of the
//                     framework. In a repo that already has the framework this
//                     adds only the layer; in a bare repo it also installs the
//                     one persona a standalone QA repo needs (and no validator,
//                     gates or manifest — a QA repo holds no gate authority)
//   --root <dir>      where the e2e layer goes (default: e2e). No layout is
//                     assumed; from then on testDir in playwright.config.ts is
//                     the only record of this choice
//   --payload <dir>   explicit plugin-payload root (contains framework/, skills/, agents/)
//   --force           overwrite existing files that differ (default: abort and list them)
//   --update          refresh an existing install: framework files are rewritten,
//                     team-owned files (TEAM_OWNED below) are left exactly as they are
//
// What it does NOT do: the tailoring interview (ai/standards/ and
// ai/project-context.md stay reference seeds until an AI persona rewrites them
// with the human — run /aidlc in any editor afterwards), and it never commits.
import {
  readFileSync,
  readdirSync,
  statSync,
  existsSync,
  writeFileSync,
  mkdirSync,
  appendFileSync,
} from 'node:fs';
import { join, resolve, dirname, relative, basename, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

// CRLF-normalized reads: Windows autocrlf checkouts must parse and compare like LF ones
function read(p) {
  return readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
}

const args = process.argv.slice(2);
const update = args.includes('--update');
const force = args.includes('--force') || update;
const payloadFlag = args.indexOf('--payload');
// Flags that consume the next argument — their values are not the target dir.
const flagValue = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? null : args[i + 1];
};
const valueOf = new Set(
  ['--payload', '--profile', '--root']
    .map((f) => args.indexOf(f))
    .filter((i) => i !== -1)
    .map((i) => i + 1),
);
const positional = args.filter(
  (a, i) => !a.startsWith('--') && !valueOf.has(i),
);
const TARGET = resolve(positional[0] ?? process.cwd());

// --profile e2e installs the browser-test layer instead of the framework. The
// e2e root is a decision, not a convention: whatever --root says, recorded from
// then on by testDir in playwright.config.ts and nowhere else.
const profile = flagValue('profile');
if (profile !== null && profile !== 'e2e') {
  console.error(
    `unknown --profile "${profile ?? ''}" — the only profile is e2e`,
  );
  process.exit(1);
}
const E2E_ROOT = (flagValue('root') ?? 'e2e').replace(/[\\/]+$/, '');
if (profile && (E2E_ROOT.startsWith('/') || E2E_ROOT.split(/[\\/]/).includes('..'))) {
  console.error(`--root must be a path inside the repository, got "${E2E_ROOT}"`);
  process.exit(1);
}

// ---- stale npx cache guard ----------------------------------------------------
// `npx github:ss-trigent/aidlc` caches its first install forever and never
// re-checks the repo, so users would silently keep running old versions. The npx
// cache records the installed commit in node_modules/.package-lock.json; compare
// it with the repo's current HEAD and re-run the latest, pinned by sha — a new
// spec bypasses the stale cache entry. Skipped silently when offline, when git
// is unavailable, or when not running from an npx/npm git install.
// Escape hatch (deliberately pinned runs): AIDLC_NO_FRESH=1.
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_URL = 'https://github.com/ss-trigent/aidlc.git';
if (!process.env.AIDLC_NO_FRESH) {
  try {
    const lock = JSON.parse(
      read(join(HERE, '..', '..', '.package-lock.json')),
    );
    const cachedSha = (lock.packages?.['node_modules/aidlc']?.resolved ?? '').match(
      /^git\+.*#([0-9a-f]{40})$/,
    )?.[1];
    const head = cachedSha
      ? execFileSync('git', ['ls-remote', REPO_URL, 'HEAD'], {
          encoding: 'utf8',
          timeout: 15000,
          stdio: ['ignore', 'pipe', 'ignore'],
        }).split(/\s/)[0]
      : undefined;
    if (cachedSha && head && head !== cachedSha) {
      console.log(
        `newer aidlc available (${head.slice(0, 7)}; your npx cache has ${cachedSha.slice(0, 7)}) — running the latest…`,
      );
      const spec = `github:ss-trigent/aidlc#${head}`;
      const npm = process.env.npm_execpath ?? '';
      if (!npm) {
        console.error(`cannot re-run automatically here; run:\n  npx --yes ${spec} ${args.join(' ')}`.trimEnd());
        process.exit(1);
      }
      try {
        execFileSync(
          process.execPath,
          [npm, ...(basename(npm).includes('npx') ? [] : ['exec']), '--yes', '--', spec, ...args],
          { stdio: 'inherit', env: { ...process.env, AIDLC_NO_FRESH: '1' } },
        );
        process.exit(0);
      } catch (e) {
        process.exit(e.status ?? 1);
      }
    }
  } catch {
    /* offline, no git, or not an npx install — run what we have */
  }
}

// ---- locate the payload -----------------------------------------------------
// Layouts, in order: --payload; bundled inside a payload (this script lives at
// <payload>/framework/tools/); the framework repo / npm install (this script
// lives at <repo>/tools/, payload at <repo>/packages/aidlc-plugin).
function findPayload() {
  if (payloadFlag !== -1 && !args[payloadFlag + 1]) {
    console.error('--payload requires a directory argument');
    process.exit(1);
  }
  const candidates =
    payloadFlag !== -1
      ? [resolve(args[payloadFlag + 1])]
      : [resolve(HERE, '..', '..'), resolve(HERE, '..', 'packages', 'aidlc-plugin')];
  for (const c of candidates) {
    if (existsSync(join(c, 'framework', 'ai', 'AI-DLC.md')) && existsSync(join(c, 'skills')))
      return c;
  }
  console.error(
    'cannot locate the plugin payload (a directory containing framework/ai and skills/) — pass --payload <dir>',
  );
  process.exit(1);
}
const PAYLOAD = findPayload();

if (!existsSync(TARGET) || !statSync(TARGET).isDirectory()) {
  console.error(`target is not a directory: ${TARGET}`);
  process.exit(1);
}
const installed = existsSync(join(TARGET, 'ai', 'AI-DLC.md'));
// --profile e2e adds a layer to whatever is here; it is not a re-install, so the
// already-installed guard below must not stop it.
if (installed && !update && !profile) {
  console.error(
    `AI-DLC is already installed in ${TARGET} (ai/AI-DLC.md exists).\n` +
      'To upgrade it to this version, rerun with --update — framework files are refreshed, ' +
      'your standards, project context, traceability manifest and CI workflow are left alone.\n' +
      'Review the result as a PR before merging.',
  );
  process.exit(1);
}
if (update && !installed) {
  console.error(
    `--update needs an existing install in ${TARGET} (no ai/AI-DLC.md found). ` +
      'Drop the flag to scaffold from scratch.',
  );
  process.exit(1);
}

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

// ---- plan every file write first, so collisions abort before any mutation ----
const plan = new Map(); // target-relative path -> content
const put = (rel, content) => plan.set(rel, content);
const copyTree = (srcDir, destRel) => {
  for (const f of walk(srcDir)) put(join(destRel, relative(srcDir, f)), read(f));
};

// Read inside the framework branch, reported in the closing message after it.
let hasCheckWorkflow = false;

// ---- --profile e2e: the browser-test layer, not the framework ---------------
// Stack-neutral by construction: no runner, no monorepo tool, no directory
// convention. Where it goes came from --root, and from here on the only record
// of that is testDir in playwright.config.ts.
const seedE2e = (name) =>
  read(join(PAYLOAD, 'framework', 'seed', 'e2e', name));
if (profile === 'e2e') {
  put(join(E2E_ROOT, 'playwright.config.ts'), seedE2e('playwright.config.ts'));
  put(join(E2E_ROOT, 'src', 'seed.setup.ts'), seedE2e('seed.setup.ts'));
  put(join(E2E_ROOT, 'plans', 'README.md'), seedE2e('plans-README.md'));
  put(
    join(E2E_ROOT, '.gitignore'),
    // Run output is evidence, not source. The auth state is a credential.
    '.auth/\nplaywright-report.json\nplaywright-report/\ntest-results/\n',
  );
  // One MCP server, four harness config paths, three different shapes — the
  // harnesses disagree, and half the team is on Cursor. This is the whole
  // harness-agnostic claim, so it is data, not a promise in a doc.
  put('.mcp.json', seedE2e('mcp-claude.json')); // Claude Code
  put(join('.cursor', 'mcp.json'), seedE2e('mcp-claude.json')); // Cursor
  put(join('.vscode', 'mcp.json'), seedE2e('mcp-vscode.json')); // VS Code / Copilot
  put('opencode.json', seedE2e('mcp-opencode.json')); // opencode
  put(join('.github', 'workflows', 'e2e.yml'), seedE2e('e2e-workflow.yml'));

  // A standalone QA repo has no framework: give it the one persona it needs and
  // nothing else. No aidlc-check, no gates, no inception/, no manifest — a QA
  // repo holds no requirements and no gate authority, and shipping the validator
  // there would imply it held both.
  if (!installed) {
    for (const f of [
      join('roles', 'qa.md'),
      join('context', 'guided-interaction.md'),
      join('context', 'context-loading.md'),
      join('templates', 'test-plan.md'),
      join('standards', 'testing-standards.md'),
    ])
      put(join('ai', f), read(join(PAYLOAD, 'framework', 'ai', f)));
    copyTree(join(PAYLOAD, 'skills', 'qa'), join('.claude', 'skills', 'qa'));
    put(
      join('.claude', 'agents', 'aidlc-qa.md'),
      read(join(PAYLOAD, 'agents', 'aidlc-qa.md')),
    );
    // so /qa works in Cursor, opencode and Copilot too, not just Claude Code
    put(
      join('tools', 'aidlc-build-surfaces.mjs'),
      read(join(PAYLOAD, 'framework', 'tools', 'aidlc-build-surfaces.mjs')),
    );
    // the one tool a QA repo does need: it turns a run into evidence the product
    // repo can validate. An installed repo already has it from the framework.
    put(
      join('tools', 'aidlc-qa-coverage.mjs'),
      read(join(PAYLOAD, 'framework', 'tools', 'aidlc-qa-coverage.mjs')),
    );
  }
} else {

copyTree(join(PAYLOAD, 'framework', 'ai'), 'ai');
for (const f of readdirSync(join(PAYLOAD, 'framework', 'tools'))) {
  if (f.endsWith('.mjs'))
    put(join('tools', f), read(join(PAYLOAD, 'framework', 'tools', f)));
}
for (const d of readdirSync(join(PAYLOAD, 'skills'))) {
  if (d === 'aidlc-init') continue; // scaffolder is plugin-only; this script replaces it here
  copyTree(join(PAYLOAD, 'skills', d), join('.claude', 'skills', d));
}
if (existsSync(join(PAYLOAD, 'agents')))
  for (const f of readdirSync(join(PAYLOAD, 'agents')))
    put(join('.claude', 'agents', f), read(join(PAYLOAD, 'agents', f)));
const seed = (name) => read(join(PAYLOAD, 'framework', 'seed', name));
put(join('knowledge', 'traceability', 'manifest.json'), seed('manifest.json'));

// Artifact-home READMEs: the Architect and UX charters send those personas here
// for the format of their own deliverable, so the folders cannot start empty.
put(join('inception', 'architecture', 'README.md'), seed('architecture-README.md'));
put(join('inception', 'design', 'README.md'), seed('design-README.md'));
put('ONBOARDING.md', seed('ONBOARDING.md'));

// remaining artifact homes — .gitkeep so the empty structure survives the scaffold PR
const HOMES = [
  'inception/product/requirements',
  'inception/product/inputs',
  'inception/stories/epics',
  'inception/stories/user-stories',
  'inception/design/screens',
  'inception/design/components',
  'knowledge/decisions',
];
for (const h of HOMES) put(join(h, '.gitkeep'), '');

// CI: a complete workflow when the repo has none that runs the validator;
// otherwise the human adds the seed step to their own workflow (printed below).
const wfDir = join(TARGET, '.github', 'workflows');
hasCheckWorkflow =
  existsSync(wfDir) &&
  readdirSync(wfDir).some((f) => read(join(wfDir, f)).includes('aidlc-check.mjs'));
if (!hasCheckWorkflow)
  put(
    join('.github', 'workflows', 'aidlc-check.yml'),
    `# AI-DLC gate validator. Make this a required status via branch protection —
# without that, the framework is guidance, not governance.
name: aidlc-check
on:
  pull_request:
  push:
    branches: [main]
jobs:
  aidlc-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: node tools/aidlc-check.mjs
`,
  );
}

// ---- never rewrite what the team owns ---------------------------------------
// These ship in the payload so a fresh install gets a seed, but once they exist
// they hold the team's own work: the standards and project context they tailored
// (both excluded from ai/framework-lock.json), their traceability data, and their
// CI. An upgrade that reset any of them would lose real work, so existing copies
// win over the payload — in every mode, --force and --update included.
const TEAM_OWNED = [
  join('ai', 'standards') + sep,
  join('ai', 'templates', 'jira') + sep,
  join('ai', 'project-context.md'),
  join('knowledge', 'traceability') + sep,
  join('.github', 'workflows') + sep,
  'inception' + sep, // artifact-home READMEs, rewritten per project
  'ONBOARDING.md',
];
const preserved = [];
for (const rel of [...plan.keys()]) {
  if (!existsSync(join(TARGET, rel))) continue;
  if (rel.endsWith('.gitkeep') || TEAM_OWNED.some((p) => rel === p || rel.startsWith(p))) {
    plan.delete(rel);
    preserved.push(rel);
  }
}

const collisions = [];
for (const [rel, content] of plan) {
  const p = join(TARGET, rel);
  if (existsSync(p) && read(p) !== content) collisions.push(rel);
}
if (collisions.length && !force) {
  console.error(
    `refusing to overwrite ${collisions.length} existing file(s) that differ (rerun with --force to overwrite):`,
  );
  for (const c of collisions) console.error(`  ${c}`);
  process.exit(1);
}

for (const [rel, content] of plan) {
  const p = join(TARGET, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, content);
}
console.log(`${update ? 'updated' : 'scaffolded'} ${plan.size} files in ${TARGET}`);
if (preserved.length)
  console.log(`kept ${preserved.length} team-owned file(s) untouched: ${preserved.join(', ')}`);

// ---- point agents at it -------------------------------------------------------
// A standalone QA repo gets a different pointer: it has no gates and no
// aidlc-check, so telling its agents to run one would be a lie in a file agents
// are told to trust.
const E2E_SECTION = `
## Browser tests (AI-DLC e2e layer)

This repository runs the AI-DLC e2e layer. Before working here: read
\`ai/roles/qa.md\` and \`ai/standards/testing-standards.md\`, and use \`/qa\` in any
editor (Claude Code, Cursor, opencode, Copilot) to work on tests.

The plan comes first: \`${E2E_ROOT}/plans/US-###.md\` from
\`ai/templates/test-plan.md\`, reviewed **before** its tests are generated. Every
test title carries the criterion it proves (\`test('… (US-###/AC-##)')\`).

Test placement is recorded by \`testDir\` in \`${E2E_ROOT}/playwright.config.ts\` —
nowhere else. Requirements live in the product repository on GitHub, never here.
`;
const AGENTS_SECTION = `
## AI-DLC

This repository runs the AI-DLC framework. Before working here: read \`ai/AI-DLC.md\`
and \`ai/project-context.md\`, adopt a persona charter from \`ai/roles/\`, and run
\`node tools/aidlc-check.mjs\` before opening a PR. Approvals are GitHub PR reviews —
never chat text.

Before changing code, classify the task (\`ai/context/task-classification.md\`) and
present the plan for approval. Project-specific surfaces: \`ai/standards/task-surfaces.md\`.

Upgrade the framework to its latest version with \`npx github:ss-trigent/aidlc --update\`
on a fresh branch — it never touches \`ai/standards/\`, \`ai/project-context.md\`, your
traceability manifest or your CI.
`;
const section = profile === 'e2e' && !installed ? E2E_SECTION : AGENTS_SECTION;
const marker = profile === 'e2e' && !installed ? 'ai/roles/qa.md' : 'ai/AI-DLC.md';
for (const name of ['AGENTS.md', 'CLAUDE.md']) {
  const p = join(TARGET, name);
  if (name === 'CLAUDE.md' && !existsSync(p)) continue; // only annotate an existing CLAUDE.md
  if (existsSync(p) && read(p).includes(marker)) continue;
  // an installed repo already points at the framework; the e2e layer adds nothing
  if (profile === 'e2e' && installed) continue;
  appendFileSync(p, (existsSync(p) ? '\n' : `# ${basename(TARGET)}\n`) + section);
  console.log(`pointed ${name} at the ${profile === 'e2e' ? 'e2e layer' : 'framework'}`);
}

// ---- generate the editor surfaces and verify ----------------------------------
const run = (script, ...extra) =>
  execFileSync(process.execPath, [join(TARGET, 'tools', script), ...extra], {
    cwd: TARGET,
    stdio: 'inherit',
  });
run('aidlc-build-surfaces.mjs');
// A standalone QA repo has no validator by design — there is nothing here for it
// to validate. An installed repo runs it, because the layer just added files.
if (existsSync(join(TARGET, 'tools', 'aidlc-check.mjs'))) {
  run('aidlc-check.mjs', '--write');
  run('aidlc-check.mjs');
}

if (profile === 'e2e')
  console.log(`
E2E layer installed at ${E2E_ROOT}/ and verified.

Three steps a script cannot do:

1. Install Playwright: npm i -D @playwright/test && npx playwright install
2. Point it at an app. Same repo: uncomment webServer in
   ${E2E_ROOT}/playwright.config.ts and set the start command. Separate QA repo:
   set E2E_BASE_URL to the deployed environment.
3. Replace the sign-in selectors in ${E2E_ROOT}/src/seed.setup.ts with this
   product's login screen, and set E2E_USER / E2E_PASSWORD for a seeded account.

Then run /qa in any editor and say "generate e2e tests for US-###". The plan is
reviewed before any test is generated from it.`);
else
console.log(
  update
    ? `
Update complete and verified. Review it as a PR before merging — \`git diff\` shows
exactly what the framework changed. Two things worth a read in that diff:

1. New or changed gate rules under ai/ — the personas follow them from now on.
2. New project-owned seeds (ai/standards/) that landed because you did not have
   them yet. Tailor those to this repo: run /aidlc in any editor and say
   "we just updated — tailor the new standards to this repo".

If aidlc-check fails on a framework file, someone edited it locally: revert that
file, and take the change upstream as a change-request issue.`
    : `
Scaffold complete and verified. Two steps remain that a script cannot do:

1. Tailor the seeds — ai/standards/, ai/project-context.md, ONBOARDING.md and the
   inception/*/README.md formats still describe the reference project. In any
   editor (Claude Code, Cursor, opencode, Copilot), run /aidlc and say
   "we just scaffolded — tailor the standards to this repo".
2. Land it as a PR and make the aidlc-check status required via branch
   protection — that click is what turns the gates from guidance into governance.
${hasCheckWorkflow ? '\nYour existing workflow already runs aidlc-check — no CI change made.' : ''}`,
);
