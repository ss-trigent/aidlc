// Builds the distributable AI-DLC Claude Code plugin (packages/aidlc-plugin)
// from this repo's single sources of truth: ai/**, tools/aidlc-check.mjs and
// the persona skills in .claude/skills/ (hand-edited source). Output is a
// build artifact — never hand-edit packages/aidlc-plugin/framework or /skills.
//
//   node tools/aidlc-build-plugin.mjs           rebuild the plugin payload
//   node tools/aidlc-build-plugin.mjs --check   exit 1 if payload differs from sources (CI)
import {
  readFileSync,
  readdirSync,
  statSync,
  existsSync,
  writeFileSync,
  mkdirSync,
  unlinkSync,
} from 'node:fs';
import { join, dirname, relative } from 'node:path';

const REPO = process.cwd();
const PLUGIN = join(REPO, 'packages', 'aidlc-plugin');
const PERSONAS = [
  'aidlc',
  'ba',
  'ux',
  'architect',
  'dev',
  'qa',
  'devops',
  'manager',
];

// Sources only: dotfiles are never framework content. Tool state written under
// ai/ (e.g. a gitignored ai/.omc/) must not be mirrored into the payload — it
// changes between sessions and would report as phantom drift.
function walkSources(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walkSources(p, acc);
    else acc.push(p);
  }
  return acc;
}

// Payload scan: deliberately sees everything, so junk that a previous build
// copied in (or a deleted source left behind) is reported and cleaned.
function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

// ---- assemble the expected payload as [relative path -> content] -----------
const files = new Map();

// framework payload: the whole ai/ folder + the validator
for (const f of walkSources(join(REPO, 'ai'))) {
  files.set(join('framework', relative(REPO, f)), readFileSync(f, 'utf8'));
}
files.set(
  join('framework', 'tools', 'aidlc-check.mjs'),
  readFileSync(join(REPO, 'tools', 'aidlc-check.mjs'), 'utf8'),
);
// aidlc-check imports this for check 12, and ai/context/jira-sync.md names it as
// the only permitted writer — so it has to ship with the framework, not beside it.
files.set(
  join('framework', 'tools', 'aidlc-jira.mjs'),
  readFileSync(join(REPO, 'tools', 'aidlc-jira.mjs'), 'utf8'),
);
// generates the Cursor/opencode/Copilot persona surfaces in adopting repos (ADR-005)
files.set(
  join('framework', 'tools', 'aidlc-build-surfaces.mjs'),
  readFileSync(join(REPO, 'tools', 'aidlc-build-surfaces.mjs'), 'utf8'),
);
// the deterministic scaffolder: /aidlc-init drives it in Claude Code, and teams
// without Claude Code run it directly from a clone (or npx) — one scaffold path
files.set(
  join('framework', 'tools', 'aidlc-scaffold.mjs'),
  readFileSync(join(REPO, 'tools', 'aidlc-scaffold.mjs'), 'utf8'),
);

// seed files for /aidlc-init
files.set(
  join('framework', 'seed', 'manifest.json'),
  JSON.stringify(
    {
      $comment:
        'Traceability knowledge graph: REQ <-> US <-> tests, plus screens (US <-> SCR -> states/components), decisions (US -> ADR) and lessons-learned edges. Edited in the same PR as the artifacts it links; validated by tools/aidlc-check.mjs; traceability-matrix.md is generated from it (never hand-edited).',
      requirements: {},
      stories: {},
      screens: {},
      lessons: [],
    },
    null,
    2,
  ) + '\n',
);
files.set(
  join('framework', 'seed', 'ci-step.yml'),
  `# Add this step to your CI workflow after dependency install.
# Make it a required status via branch protection — without that,
# the framework is guidance, not governance.
- run: node tools/aidlc-check.mjs
`,
);

// persona skills: reuse the generated .claude/skills content, plus a
// not-installed pointer so the plugin works in repos without the framework yet
for (const name of PERSONAS) {
  const src = join(REPO, '.claude', 'skills', name, 'SKILL.md');
  const text = readFileSync(src, 'utf8');
  const lines = text.split('\n');
  const h1 = lines.findIndex((l) => l.startsWith('# '));
  lines.splice(
    h1 + 1,
    0,
    '',
    '> **Framework not installed?** If `ai/AI-DLC.md` does not exist in this repository, stop and run `/aidlc-init` first — it scaffolds the framework this persona depends on.',
  );
  files.set(join('skills', name, 'SKILL.md'), lines.join('\n'));
}

// persona subagents: delegatable workers sharing the same charters as the skills.
// Shipped verbatim — the authority limits in their frontmatter are load-bearing.
for (const name of PERSONAS) {
  if (name === 'aidlc') continue; // router is a skill only, it has no agent form
  const src = join(REPO, '.claude', 'agents', `aidlc-${name}.md`);
  files.set(join('agents', `aidlc-${name}.md`), readFileSync(src, 'utf8'));
}

// the /aidlc-init scaffolder — plugin-only skill
files.set(
  join('skills', 'aidlc-init', 'SKILL.md'),
  `---
name: aidlc-init
description: "Install the AI-DLC framework into the current repository: scaffold ai/ (personas, gates, templates, standards), the aidlc-check validator, repo-pinned persona surfaces for Claude Code / Cursor / opencode / GitHub Copilot, the traceability manifest, and CI wiring. USE WHEN user invokes /aidlc-init, asks to set up / install / initialize AI-DLC, or another aidlc persona reports the framework is missing."
---

# AI-DLC — install the framework into this repository

You scaffold the AI-DLC framework from this plugin's bundled payload. The payload root is \`$CLAUDE_PLUGIN_ROOT/framework\`. Guide the human in plain language; ask before overwriting anything.

## Steps

1. **Refuse-if-present check:** if \`ai/AI-DLC.md\` already exists, the framework is installed — offer an upgrade instead: diff \`$CLAUDE_PLUGIN_ROOT/framework/ai\` against \`ai/\`, walk the human through changes, and after they approve, refresh with \`node "$CLAUDE_PLUGIN_ROOT/framework/tools/aidlc-scaffold.mjs" . --force\` (their project-owned files are not in the payload, so it never touches them). Never blind-overwrite.
2. **Run the scaffold:** \`node "$CLAUDE_PLUGIN_ROOT/framework/tools/aidlc-scaffold.mjs"\` — deterministic, no interview. It copies the framework (\`ai/\`, the validator, the Jira boundary, the surface builder), pins the persona skills and delegatable agents into \`.claude/\`, generates the Cursor (\`.cursor/\`), opencode (\`.opencode/\`) and GitHub Copilot (\`.github/\`) surfaces, seeds the traceability manifest and artifact homes, points \`AGENTS.md\` at the framework, writes an \`aidlc-check\` CI workflow if the repo has none, and verifies with \`aidlc-check\`. It aborts (rather than overwrite) on any differing existing file. Tell the human: every teammate now runs the same repo-pinned persona version whatever they edit with — Claude Code reads \`.claude/\`, Cursor \`.cursor/\`, opencode \`.opencode/\`, Copilot \`.github/\` — enforced from now on by checks 10 and 13; teammates on other editors need nothing installed, and a team with no Claude Code at all runs this same script from a clone of the framework repo. (Claude Code users may also see this plugin's own copies of the persona skills — identical content; the repo copies are canonical for this project.)
3. **Tailor the project-owned files.** The payload's \`ai/standards/\` comes from the reference project (Nx + NestJS + Angular + TypeORM) — it is a seed for **form**, not content, and shipping it unchanged into a different stack would misdirect every persona. So:
   1. Detect the stack yourself before asking anything: package manager, language(s), frameworks, test runner, DB layer, monorepo tool — read \`package.json\`/lockfiles/configs; never ask what the repo already answers.
   2. Interview the human in plain language, one question at a time: what the product is (a short paragraph in their words), whatever detection could not settle, and conventions the team already has (commit style, API style, review habits). Existing conventions win over the seed's — the framework governs gates, not taste.
   3. Rewrite each \`ai/standards/*.md\` for **this** stack, keeping the seeds' shape and rigor: same headings, same level of specificity — a standard vague enough to always pass is not a standard. One rule is load-bearing and stays verbatim in \`git-standards.md\`: the branch pattern \`feat/US-###-<slug>\`, which \`aidlc-check\` uses to derive what is in delivery.
   4. Write \`ai/project-context.md\` from the interview: what the product is and for whom, domain terms, the stack, how to build/test/run. Personas read it before working, so a wrong sentence here misleads all of them — read it back to the human before moving on.

   These files are **project-owned**: \`ai/framework-lock.json\` deliberately excludes \`ai/standards/\`, \`ai/templates/jira/\` and \`ai/project-context.md\`, and the team edits them freely from now on. Everything else under \`ai/\` is framework-owned and hash-verified by \`aidlc-check\` (check 14) — a local edit there fails CI; framework changes go upstream as a change-request.
4. **Confirm CI is real:** the scaffold wrote \`.github/workflows/aidlc-check.yml\` if the repo had no workflow running the validator; if the repo already had workflows, help the human add the step from \`$CLAUDE_PLUGIN_ROOT/framework/seed/ci-step.yml\` after dependency install. Either way, explain that branch protection with this status as required is what makes the gates real — and that on private GitHub Free repos it needs Pro or a public repo. The design system is deliberately not seeded — tokens are grounded in the specific product, so \`/ux\` authors \`inception/design/tokens.css\` with the human on the first UI story, and \`aidlc-check --write\` then generates the \`tokens.json\` export their design tool imports.
5. **Verify:** \`node tools/aidlc-check.mjs\` must exit green (warnings about empty scope are expected on a fresh install — the scaffold already ran it once; rerun after tailoring).
6. **Hand off:** tell the human the gates in one sentence each and that the next step is \`/ba\` with their first customer need — and \`/ux\` once a story has UI. The personas now live in the repository (step 2), so they arrive with every clone; the plugin stays useful as the upgrade vehicle and for scaffolding the next repo.

## Never

- Overwrite existing framework files without an explicit yes per file
- Commit or push — leave the scaffold for the human (or their persona session) to review and land through a PR
`,
);

// ---- write or check ---------------------------------------------------------
const check = process.argv.includes('--check');
let drift = 0;
for (const [rel, content] of files) {
  const target = join(PLUGIN, rel);
  if (check) {
    if (!existsSync(target) || readFileSync(target, 'utf8') !== content) {
      console.error(
        `DRIFT: packages/aidlc-plugin/${rel} does not match its source`,
      );
      drift++;
    }
  } else {
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
}
// payload files with no source are drift too (e.g. a source file was deleted)
for (const dir of ['framework', 'skills', 'agents']) {
  const root = join(PLUGIN, dir);
  if (!existsSync(root)) continue;
  for (const p of walk(root)) {
    const relPath = relative(PLUGIN, p);
    if (files.has(relPath)) continue;
    if (check) {
      console.error(
        `DRIFT: packages/aidlc-plugin/${relPath} has no source — stale payload file`,
      );
      drift++;
    } else {
      unlinkSync(p);
    }
  }
}
if (check) {
  if (drift) {
    console.error(
      `\n${drift} plugin file(s) drifted. Run: node tools/aidlc-build-plugin.mjs`,
    );
    process.exit(1);
  }
  console.log(`plugin payload in sync (${files.size} files)`);
} else {
  console.log(`wrote ${files.size} files to packages/aidlc-plugin/`);
}
