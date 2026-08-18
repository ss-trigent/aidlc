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

// CRLF-normalized reads: Windows autocrlf checkouts must parse and compare like LF ones
function read(p) {
  return readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
}

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
  files.set(join('framework', relative(REPO, f)), read(f));
}
files.set(
  join('framework', 'tools', 'aidlc-check.mjs'),
  read(join(REPO, 'tools', 'aidlc-check.mjs')),
);
// aidlc-check imports this for check 12, and ai/context/jira-sync.md names it as
// the only permitted writer — so it has to ship with the framework, not beside it.
files.set(
  join('framework', 'tools', 'aidlc-jira.mjs'),
  read(join(REPO, 'tools', 'aidlc-jira.mjs')),
);
// aidlc-check imports this for check 15 (cross-repo e2e evidence), and a
// standalone QA repo runs it to produce that evidence — so it ships with the
// framework rather than beside it, same reason as aidlc-jira.
files.set(
  join('framework', 'tools', 'aidlc-qa-coverage.mjs'),
  read(join(REPO, 'tools', 'aidlc-qa-coverage.mjs')),
);
// generates the Cursor/opencode/Copilot persona surfaces in adopting repos (ADR-005)
files.set(
  join('framework', 'tools', 'aidlc-build-surfaces.mjs'),
  read(join(REPO, 'tools', 'aidlc-build-surfaces.mjs')),
);
// the deterministic scaffolder: /aidlc-init drives it in Claude Code, and teams
// without Claude Code run it directly from a clone (or npx) — one scaffold path
files.set(
  join('framework', 'tools', 'aidlc-scaffold.mjs'),
  read(join(REPO, 'tools', 'aidlc-scaffold.mjs')),
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
// Artifact-home READMEs. Four places in the charters send the Architect to
// inception/architecture/README.md and three send UX to inception/design/README.md
// for the format of their deliverable — so the scaffold has to put them there.
files.set(
  join('framework', 'seed', 'architecture-README.md'),
  `# Architecture

The Architect's **Gate 1 deliverable**: the shape the whole build shares, written
once requirements are frozen and before any code exists. Two documents:

| File                 | Contains                                                                                     |
| -------------------- | -------------------------------------------------------------------------------------------- |
| \`db-design.md\`       | Entities, their relationships and cardinality, keys, the shape the data takes, and why        |
| \`app-architecture.md\` | Services/modules, their boundaries, how they talk, where shared logic sits, and why           |

## What goes in \`db-design.md\`

1. **Entities** — one section each: what it represents in the business, its fields
   with types and nullability, and which \`REQ-###\` put it there
2. **Relationships** — cardinality and direction, stated as sentences a
   non-engineer can check ("one shipment has many legs; a leg belongs to exactly
   one shipment")
3. **Keys and constraints** — primary keys, uniqueness, and the business rule each
   one enforces. A constraint with no rule behind it is a guess
4. **Lifecycle** — what is created, updated, soft-deleted, or never deleted, and
   what that means for history and audit
5. **Open questions** — anything the requirements do not settle. Do **not** invent
   a rule; an unanswered question here is a BA question, and saying so is the job

## What goes in \`app-architecture.md\`

1. **Modules** — one per business capability, what each owns
2. **Boundaries** — what may import what, and which rules are enforced in tooling
   rather than by agreement
3. **Flows** — the two or three paths that matter, request to persistence
4. **Cross-cutting** — auth, validation, error shape, logging, configuration
5. **Open questions** — same rule as above

## Three rules

- **It gates nothing.** Stories and screens do not wait on it; \`aidlc-check\` never
  fails for its absence. It runs in parallel and informs the build
- **It needs only approved requirements.** Every entity traces to a \`REQ-###\`
- **It is a design, not a second copy of the code.** Once migrations and the
  OpenAPI document exist, **they** are the source of truth and this becomes
  history — not a document to keep in sync

Written by the Architect persona (\`/architect\`), landed through its own reviewed
PR. Tailor this README to your project; it is yours from here.
`,
);
files.set(
  join('framework', 'seed', 'design-README.md'),
  `# Design

What lives here, and what deliberately does not.

| Here                       | Contains                                                                    |
| -------------------------- | ----------------------------------------------------------------------------- |
| \`screens/SCR-###-<slug>.md\` | Screen specs: purpose, every numbered \`ST-##\` state, a11y notes             |
| \`components/\`              | One preview per component, each rendering the states it claims               |
| \`tokens.css\`               | The design system's single source — colors, type, spacing, radius, elevation |
| \`tokens.json\`              | **Generated** from \`tokens.css\` by \`aidlc-check --write\` — never hand-edited |

**Not here: the visual design files.** Frames stay in Figma, Penpot, or whatever
the designer uses. The tool imports \`tokens.json\`, so the design file and this
repo agree on the values without either owning the other. What this folder holds
is the part a reviewer must be able to check: which screens exist, which states
each has, and that a preview renders every one of them.

## Rules \`aidlc-check\` enforces

- A story with a \`## UI\` section cites a screen
- A screen's \`ST-##\` states match its manifest entry
- Every state is rendered and marked in a preview: \`<!-- @state SCR-###/ST-## -->\`
- Previews hold no raw hex — colors come from tokens
- \`tokens.json\` is generated, never edited by hand

Incomplete is a warning before delivery and an error on a \`feat/US-###\` branch.

## Adding a screen

Run \`/ux\`. It interviews you, numbers the states so none are skipped, writes the
spec and the preview, and updates the manifest. Consistency with what already
exists beats a fresh idea — read the neighbouring specs and \`tokens.css\` first.

Tailor this README to your project; it is yours from here.
`,
);
// AI-DLC.md sends every new joiner to a root ONBOARDING.md, so the scaffold
// writes a framework-level one. The team makes it project-specific from there.
files.set(
  join('framework', 'seed', 'ONBOARDING.md'),
  `# Onboarding

About 15 minutes, whatever your role. This repository runs **AI-DLC**: you work
with an AI persona for your role, and every approval is a GitHub pull-request
review — never chat text.

## 1. The shortest possible version

Work moves through three gates. Each one asks a single question, and a human
answers it by approving a PR:

| Gate            | Question                        | Who drafts                  |
| --------------- | ------------------------------- | ---------------------------- |
| **1 Discovery** | Are we building the right thing? | BA, UX, Architect            |
| **2 Delivery**  | Does this story provably work?   | DEV, QA, Architect           |
| **3 Release**   | Can we ship it safely?           | DevOps                       |

Nothing is "approved" because an AI said so. Approval is your click in GitHub,
recorded against your identity, on a branch that CI has already checked.

## 2. Start your persona

In your editor, type the command for your role:

\`\`\`
/aidlc        not sure? start here — it works out who you are and routes you
/ba           requirements, stories, change requests
/ux           screens, states, the design system
/architect    system + DB design, ADRs, PR review
/dev          implement one story as one PR
/qa           tests derived from requirements, browser tests, bug reports
/devops       CI, releases, rollback
/manager      status, routing, delivery plans
\`\`\`

Works in Claude Code, Cursor, opencode and GitHub Copilot — the personas are
pinned in this repository, so cloning it is your whole setup.

The persona interviews you in plain language. You do **not** need to know the
framework, the file layout, or git to use it. If one starts talking in paths and
IDs, tell it to explain in plain words — that is in its charter.

## 3. What to expect the first time you build something

Before writing code, the DEV persona classifies the task and shows you a plan —
what it will change, what it verified by reading the code, and what it still
needs to ask. It stops there until you reply \`go\`. That pause is the point: a
wrong assumption is cheap to catch in a plan and expensive to catch in a diff.

## 4. Where things live

| Folder                    | What                                                       |
| ------------------------- | ------------------------------------------------------------ |
| \`ai/\`                     | The framework: role charters, gates, standards, templates   |
| \`inception/product/\`      | Requirements (\`REQ-###\`)                                     |
| \`inception/stories/\`      | Stories (\`US-###\`) and their numbered acceptance criteria    |
| \`inception/design/\`       | Screen specs, design tokens, component previews             |
| \`inception/architecture/\` | DB design + app architecture                                |
| \`knowledge/\`              | Traceability manifest and architecture decisions (\`ADR-###\`) |
| \`<e2e-root>/\`             | Browser tests, if this project installed them: reviewed plans + generated specs. Where it is comes from \`testDir\` in its \`playwright.config.ts\` |

## 5. The one rule worth memorising

If something is unclear, the persona asks — it does not guess. Hold it to that.
A confident wrong answer costs more than a question.

---

**This file is yours.** Replace this section with what a new joiner on *your*
project needs: the domain in a paragraph, how to run things locally, who to ask.
Run \`/aidlc\` and say "help me write the project part of ONBOARDING.md".
`,
);
files.set(
  join('framework', 'seed', 'ci-step.yml'),
  `# Add this step to your CI workflow after dependency install.
# Make it a required status via branch protection — without that,
# the framework is guidance, not governance.
- run: node tools/aidlc-check.mjs
`,
);

// ---- e2e layer seeds (aidlc-scaffold --profile e2e) -------------------------
// Deliberately stack-neutral: no Nx, no framework-specific runner, and the only
// external dependency is Playwright itself plus its MCP server — which every
// harness consumes as configuration, so the layer works from Claude Code,
// Cursor, opencode and Copilot alike. testDir is the ONLY record of where the
// layer lives; nothing else stores that path, so nothing else can drift from it.
files.set(
  join('framework', 'seed', 'e2e', 'playwright.config.ts'),
  `import { defineConfig, devices } from '@playwright/test';

// The e2e root is wherever --root put this file. testDir is relative to it, and
// it is the one place that records the layout — personas read it, humans edit it.
export default defineConfig({
  testDir: './src',
  // The JSON report is what aidlc-qa-coverage.mjs reads to build AC evidence.
  reporter: [['list'], ['json', { outputFile: 'playwright-report.json' }]],
  // A red test is a finding (ai/standards/testing-standards.md): no retries
  // locally, and one in CI only to distinguish infrastructure flake from a real
  // failure — never to make a failing assertion eventually pass.
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,
  use: {
    // Same repo: leave E2E_BASE_URL unset and let webServer below start the app.
    // Separate QA repo: point it at the deployed environment under test.
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:4200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /seed\\.setup\\.ts/ },
    {
      name: 'chromium',
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], storageState: '.auth/user.json' },
    },
  ],
  // Uncomment in a same-repo install so CI has an app to test. Replace the
  // command with whatever starts THIS project — there is no default that is
  // right for every stack.
  // webServer: {
  //   command: 'npm run start',
  //   url: process.env.E2E_BASE_URL ?? 'http://localhost:4200',
  //   reuseExistingServer: !process.env.CI,
  // },
});
`,
);
files.set(
  join('framework', 'seed', 'e2e', 'seed.setup.ts'),
  `import { test as setup, expect } from '@playwright/test';

// Deterministic tests need a known starting state (ai/standards/testing-standards.md).
// This runs once before the suite and saves an authenticated session the specs
// reuse, so no test carries login steps that are not part of its criterion.
//
// Credentials come from the environment. Nothing instance-specific is committed —
// same rule the Jira integration follows.
const FILE = '.auth/user.json';

setup('authenticate', async ({ page }) => {
  const email = process.env.E2E_USER;
  const password = process.env.E2E_PASSWORD;
  expect(
    email && password,
    'set E2E_USER and E2E_PASSWORD — a seeded account this suite may use',
  ).toBeTruthy();

  // Replace the selectors and the route with this product's sign-in screen.
  await page.goto('/login');
  await page.getByLabel('Email').fill(email!);
  await page.getByLabel('Password').fill(password!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/\\/login/);

  await page.context().storageState({ path: FILE });
});
`,
);
// One server, three config shapes — the harnesses genuinely disagree, and a
// single blob copied to four paths would silently fail in two of them.
// Claude Code and Cursor: `mcpServers`. VS Code / Copilot: `servers`. opencode:
// `mcp` with a type and the command as an array.
const PW_MCP = { command: 'npx', args: ['-y', '@playwright/mcp@latest'] };
const json = (o) => `${JSON.stringify(o, null, 2)}\n`;
files.set(
  join('framework', 'seed', 'e2e', 'mcp-claude.json'),
  json({ mcpServers: { playwright: PW_MCP } }),
);
files.set(
  join('framework', 'seed', 'e2e', 'mcp-vscode.json'),
  json({ servers: { playwright: PW_MCP } }),
);
files.set(
  join('framework', 'seed', 'e2e', 'mcp-opencode.json'),
  json({
    $schema: 'https://opencode.ai/config.json',
    mcp: {
      playwright: {
        type: 'local',
        command: ['npx', '-y', '@playwright/mcp@latest'],
        enabled: true,
      },
    },
  }),
);
files.set(
  join('framework', 'seed', 'e2e', 'plans-README.md'),
  `# E2E test plans

One plan per story, named after it: \`US-###.md\`. The story ID is the plan's
identity — there is no separate plan ID to keep in sync.

Format: [\`ai/templates/test-plan.md\`](../../ai/templates/test-plan.md). Steps are
written so a human could execute them by hand, which is what makes a plan
reviewable on its own and what lets generation produce a test without guessing
intent.

**The plan is reviewed before its tests are generated.** That review is the only
cheap moment to catch a scenario that tests something adjacent to the acceptance
criterion rather than the criterion itself.
`,
);
files.set(
  join('framework', 'seed', 'e2e', 'e2e-workflow.yml'),
  `# Browser-level tests. In a same-repo install, make this a required status only
# once the suite is stable — an e2e job that flakes teaches the team to re-run
# rather than to read the failure.
name: e2e
on:
  pull_request:
  workflow_dispatch:
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test
        env:
          E2E_BASE_URL: \${{ vars.E2E_BASE_URL }}
          E2E_USER: \${{ secrets.E2E_USER }}
          E2E_PASSWORD: \${{ secrets.E2E_PASSWORD }}
      # Separate QA repo only: turn the run into evidence the product repo can
      # validate. Set PRODUCT_REPO as a repository variable to enable it. In a
      # same-repo install it stays unset and this is skipped — there the spec path
      # in the story's tests[] already carries the edge, and a second record of
      # the same fact is a second thing to drift.
      - if: always() && vars.PRODUCT_REPO != ''
        run: node tools/aidlc-qa-coverage.mjs --repo "$GITHUB_REPOSITORY"
        env:
          PRODUCT_SHA: \${{ vars.PRODUCT_SHA }}
      - if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: |
            playwright-report.json
            e2e-coverage.json
            playwright-report/
`,
);

// persona skills: reuse the generated .claude/skills content, plus a
// not-installed pointer so the plugin works in repos without the framework yet
for (const name of PERSONAS) {
  const src = join(REPO, '.claude', 'skills', name, 'SKILL.md');
  const text = read(src);
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
  files.set(join('agents', `aidlc-${name}.md`), read(src));
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

1. **Refuse-if-present check:** if \`ai/AI-DLC.md\` already exists, the framework is installed — this is an **upgrade**, not an install. Make sure the plugin itself is current first (\`/plugin\` → update \`aidlc@trigent-aidlc\`), then run \`node "$CLAUDE_PLUGIN_ROOT/framework/tools/aidlc-scaffold.mjs" . --update\` on a fresh branch. It refreshes every framework-owned file and **skips anything the team owns that already exists** — \`ai/standards/\`, \`ai/templates/jira/\`, \`ai/project-context.md\`, the traceability manifest, their CI workflow — printing what it kept. Then walk the human through \`git diff\` (what gate rules changed, and any new seed that landed because they did not have it yet) and leave it as a PR. Never blind-overwrite, never commit.
2. **Run the scaffold:** \`node "$CLAUDE_PLUGIN_ROOT/framework/tools/aidlc-scaffold.mjs"\` — deterministic, no interview. It copies the framework (\`ai/\`, the validator, the Jira boundary, the surface builder, the e2e evidence tool), pins the persona skills and delegatable agents into \`.claude/\`, generates the Cursor (\`.cursor/\`), opencode (\`.opencode/\`) and GitHub Copilot (\`.github/\`) surfaces, seeds the traceability manifest and the artifact homes (including \`inception/architecture/README.md\` and \`inception/design/README.md\`, which define the format of the Architect's and UX's deliverables, plus a root \`ONBOARDING.md\`), points \`AGENTS.md\` at the framework, writes an \`aidlc-check\` CI workflow if the repo has none, and verifies with \`aidlc-check\`. It aborts (rather than overwrite) on any differing existing file. Tell the human: every teammate now runs the same repo-pinned persona version whatever they edit with — Claude Code reads \`.claude/\`, Cursor \`.cursor/\`, opencode \`.opencode/\`, Copilot \`.github/\` — enforced from now on by checks 10 and 13; teammates on other editors need nothing installed, and a team with no Claude Code at all runs this same script from a clone of the framework repo. (Claude Code users may also see this plugin's own copies of the persona skills — identical content; the repo copies are canonical for this project.)
3. **Tailor the project-owned files.** The payload's \`ai/standards/\` comes from the reference project (Nx + NestJS + Angular + TypeORM) — it is a seed for **form**, not content, and shipping it unchanged into a different stack would misdirect every persona. So:
   1. Detect the stack yourself before asking anything: package manager, language(s), frameworks, test runner, DB layer, monorepo tool — read \`package.json\`/lockfiles/configs; never ask what the repo already answers.
   2. Interview the human in plain language, one question at a time: what the product is (a short paragraph in their words), whatever detection could not settle, and conventions the team already has (commit style, API style, review habits). Existing conventions win over the seed's — the framework governs gates, not taste.
   3. Rewrite each \`ai/standards/*.md\` for **this** stack, keeping the seeds' shape and rigor: same headings, same level of specificity — a standard vague enough to always pass is not a standard. One rule is load-bearing and stays verbatim in \`git-standards.md\`: the branch pattern \`feat/US-###-<slug>\`, which \`aidlc-check\` uses to derive what is in delivery.
   4. Write \`ai/project-context.md\` from the interview: what the product is and for whom, domain terms, the stack, how to build/test/run. Personas read it before working, so a wrong sentence here misleads all of them — read it back to the human before moving on.

   These files are **project-owned**: \`ai/framework-lock.json\` deliberately excludes \`ai/standards/\`, \`ai/templates/jira/\` and \`ai/project-context.md\`, and the team edits them freely from now on. Everything else under \`ai/\` is framework-owned and hash-verified by \`aidlc-check\` (check 14) — a local edit there fails CI; framework changes go upstream as a change-request.
4. **Confirm CI is real:** the scaffold wrote \`.github/workflows/aidlc-check.yml\` if the repo had no workflow running the validator; if the repo already had workflows, help the human add the step from \`$CLAUDE_PLUGIN_ROOT/framework/seed/ci-step.yml\` after dependency install. Either way, explain that branch protection with this status as required is what makes the gates real — and that on private GitHub Free repos it needs Pro or a public repo. The design system is deliberately not seeded — tokens are grounded in the specific product, so \`/ux\` authors \`inception/design/tokens.css\` with the human on the first UI story, and \`aidlc-check --write\` then generates the \`tokens.json\` export their design tool imports.
5. **Verify:** \`node tools/aidlc-check.mjs\` must exit green (warnings about empty scope are expected on a fresh install — the scaffold already ran it once; rerun after tailoring).
6. **Mention the optional browser-test layer, do not install it.** Nothing so far installs Playwright and no gate needs it. If the human asks for browser/UI testing (now or later), it is one command: \`node tools/aidlc-scaffold.mjs --profile e2e --root <dir>\` — \`--root\` is their choice, no layout is assumed, and \`testDir\` in the generated \`playwright.config.ts\` becomes the only record of it. It also writes the Playwright MCP config in all four harness shapes. QA who do not hold this repo run the same command in their own repo and publish evidence back as a PR — with the cost stated in [ADR-006](../knowledge/decisions/ADR-006-e2e-testing-layer.md): cross-repo e2e cannot block a story PR.
7. **Hand off:** tell the human the gates in one sentence each and that the next step is \`/ba\` with their first customer need — and \`/ux\` once a story has UI. The personas now live in the repository (step 2), so they arrive with every clone; the plugin stays useful as the upgrade vehicle and for scaffolding the next repo.

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
    if (!existsSync(target) || read(target) !== content) {
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
