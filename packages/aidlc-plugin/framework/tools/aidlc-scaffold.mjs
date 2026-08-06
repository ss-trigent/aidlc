#!/usr/bin/env node
// Scaffolds the AI-DLC framework into a target repository — the deterministic
// part of /aidlc-init, runnable by anyone with Node: no Claude Code, no AI.
//
//   node tools/aidlc-scaffold.mjs [target-dir]     scaffold into target (default: cwd)
//   npx github:ss-trigent/aidlc                    same, from inside the target repo
//   npx github:ss-trigent/aidlc --update           upgrade an installed repo to this version
//
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

const args = process.argv.slice(2);
const update = args.includes('--update');
const force = args.includes('--force') || update;
const payloadFlag = args.indexOf('--payload');
const positional = args.filter(
  (a, i) => !a.startsWith('--') && (payloadFlag === -1 || i !== payloadFlag + 1),
);
const TARGET = resolve(positional[0] ?? process.cwd());

// ---- locate the payload -----------------------------------------------------
// Layouts, in order: --payload; bundled inside a payload (this script lives at
// <payload>/framework/tools/); the framework repo / npm install (this script
// lives at <repo>/tools/, payload at <repo>/packages/aidlc-plugin).
const HERE = dirname(fileURLToPath(import.meta.url));
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
if (installed && !update) {
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
  for (const f of walk(srcDir)) put(join(destRel, relative(srcDir, f)), readFileSync(f, 'utf8'));
};

copyTree(join(PAYLOAD, 'framework', 'ai'), 'ai');
for (const f of readdirSync(join(PAYLOAD, 'framework', 'tools'))) {
  if (f.endsWith('.mjs'))
    put(join('tools', f), readFileSync(join(PAYLOAD, 'framework', 'tools', f), 'utf8'));
}
for (const d of readdirSync(join(PAYLOAD, 'skills'))) {
  if (d === 'aidlc-init') continue; // scaffolder is plugin-only; this script replaces it here
  copyTree(join(PAYLOAD, 'skills', d), join('.claude', 'skills', d));
}
if (existsSync(join(PAYLOAD, 'agents')))
  for (const f of readdirSync(join(PAYLOAD, 'agents')))
    put(join('.claude', 'agents', f), readFileSync(join(PAYLOAD, 'agents', f), 'utf8'));
put(
  join('knowledge', 'traceability', 'manifest.json'),
  readFileSync(join(PAYLOAD, 'framework', 'seed', 'manifest.json'), 'utf8'),
);

// artifact homes — .gitkeep so the empty structure survives the scaffold PR
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
const hasCheckWorkflow =
  existsSync(wfDir) &&
  readdirSync(wfDir).some((f) => readFileSync(join(wfDir, f), 'utf8').includes('aidlc-check.mjs'));
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
  join('knowledge', 'traceability', 'manifest.json'),
  join('.github', 'workflows') + sep,
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
  if (existsSync(p) && readFileSync(p, 'utf8') !== content) collisions.push(rel);
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
const AGENTS_SECTION = `
## AI-DLC

This repository runs the AI-DLC framework. Before working here: read \`ai/AI-DLC.md\`
and \`ai/project-context.md\`, adopt a persona charter from \`ai/roles/\`, and run
\`node tools/aidlc-check.mjs\` before opening a PR. Approvals are GitHub PR reviews —
never chat text.
`;
for (const name of ['AGENTS.md', 'CLAUDE.md']) {
  const p = join(TARGET, name);
  if (name === 'CLAUDE.md' && !existsSync(p)) continue; // only annotate an existing CLAUDE.md
  if (existsSync(p) && readFileSync(p, 'utf8').includes('ai/AI-DLC.md')) continue;
  appendFileSync(p, (existsSync(p) ? '\n' : `# ${basename(TARGET)}\n`) + AGENTS_SECTION);
  console.log(`pointed ${name} at the framework`);
}

// ---- generate the editor surfaces and verify ----------------------------------
const run = (script, ...extra) =>
  execFileSync(process.execPath, [join(TARGET, 'tools', script), ...extra], {
    cwd: TARGET,
    stdio: 'inherit',
  });
run('aidlc-build-surfaces.mjs');
run('aidlc-check.mjs', '--write');
run('aidlc-check.mjs');

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

1. Tailor the seeds — ai/standards/ and ai/project-context.md still describe the
   reference project. In any editor (Claude Code, Cursor, opencode, Copilot),
   run /aidlc and say "we just scaffolded — tailor the standards to this repo".
2. Land it as a PR and make the aidlc-check status required via branch
   protection — that click is what turns the gates from guidance into governance.
${hasCheckWorkflow ? '\nYour existing workflow already runs aidlc-check — no CI change made.' : ''}`,
);
