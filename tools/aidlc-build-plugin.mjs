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
        'Traceability knowledge graph: REQ <-> US <-> tests, plus screens (US <-> SCR -> states, with flow edges: links_to[] between screens and "entry": true on roots), decisions (US -> ADR) and lessons-learned edges. Edited in the same PR as the artifacts it links; validated by tools/aidlc-check.mjs; traceability-matrix.md is generated from it (never hand-edited).',
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
| \`research/BRD-###-<slug>.md\` | The 2a research pass: assumptions, competitor scan, personas, \`INSIGHT-##\` |
| \`ia.md\`                    | Sitemap, navigation model, critical-path flows, the screen inventory         |
| \`principles.md\`            | \`PRIN-#\` design principles, each citing the insight it derives from         |
| \`screens/SCR-###-<slug>.md\` | Screen specs: purpose, every numbered \`ST-##\` state, a11y notes             |
| \`tokens.css\`               | The design system's single source — colors, type, spacing, radius, elevation |
| \`tokens.json\`              | **Generated** from \`tokens.css\` by \`aidlc-check --write\` — never hand-edited |
| \`wireframe-rules.md\`       | Grid, layout discipline, frame naming — for the designer's tool or a frame-generating agent |

**Not here: the visual design files.** Frames stay in Figma, Penpot, or whatever
the designer uses. The tool imports \`tokens.json\`, so the design file and this
repo agree on the values without either owning the other. What this folder holds
is the part a reviewer must be able to check: which screens exist, which states
each has, and how the screens connect. Frames are drawn from it — by the
designer, or by \`/ux\` through a Figma connector when one is present.

## Rules \`aidlc-check\` enforces

- A story with a \`## UI\` section cites a screen
- A screen's \`ST-##\` states match its manifest entry
- Every screen is reachable: marked \`"entry": true\` or in another screen's \`links_to\`
- Text-on-surface token pairs meet WCAG AA 4.5:1 (warning, both themes)
- \`tokens.json\` is generated, never edited by hand

Incomplete is a warning before delivery and an error on a \`feat/US-###\` branch.

## Adding a screen

Run \`/ux\`. It interviews you, numbers the states so none are skipped, writes the
spec, and updates the manifest. Consistency with what already
exists beats a fresh idea — read the neighbouring specs and \`tokens.css\` first.

Tailor this README to your project; it is yours from here.
`,
);
// Seed design tokens: the SCALES are framework-owned form (step names the
// checks and templates rely on); the PALETTE is a deliberate greyscale
// wireframe set — /ux authors the product colours with the human in pass 2b
// (ADR-008). Prefixes are the tokens.json export contract in aidlc-check.mjs.
files.set(
  join('framework', 'seed', 'tokens.css'),
  `/* Design tokens — the single source. tokens.json is GENERATED from this file
   by \`node tools/aidlc-check.mjs --write\`; the designer's tool imports the JSON.

   Prefixes are the export contract: --c- color · --t- font size · --lh- line
   height · --fw- weight · --f- family · --s- spacing · --r- radius ·
   --shadow- elevation · --control- control heights.
   --p-* are PRIMITIVES: raw values aliased only inside this file. The design
   tool's library binds to the semantic names, never to a primitive.

   The scales are seeds: keep the step names, retune values with the designer.
   The palette is deliberately greyscale (wireframe-grade): /ux replaces the
   --c-* aliases with the product palette in pass 2b, both themes, leaving the
   structural scales untouched. */

:root {
  /* primitives — greyscale ramp */
  --p-gray-0: #ffffff;
  --p-gray-50: #f5f5f5;
  --p-gray-100: #eeeeee;
  --p-gray-200: #e0e0e0;
  --p-gray-300: #bdbdbd;
  --p-gray-600: #616161;
  --p-gray-800: #424242;
  --p-gray-850: #242424;
  --p-gray-900: #1a1a1a;

  /* color — semantic aliases; components reference ONLY these */
  --c-surface: var(--p-gray-0);
  --c-surface-raised: var(--p-gray-50);
  --c-surface-overlay: var(--p-gray-100);
  --c-border: var(--p-gray-200);
  --c-border-strong: var(--p-gray-300);
  --c-text: var(--p-gray-900);
  --c-text-secondary: var(--p-gray-600);
  --c-text-disabled: var(--p-gray-300);
  --c-action: var(--p-gray-800);
  --c-action-label: var(--p-gray-0);
  --c-focus-ring: var(--p-gray-900);

  /* spacing — closed scale, no values between steps */
  --s-2: 2px;   /* icon-to-label gaps */
  --s-4: 4px;   /* tight internal spacing */
  --s-8: 8px;   /* default internal padding */
  --s-12: 12px;
  --s-16: 16px; /* default gap between elements */
  --s-24: 24px; /* section internal padding */
  --s-32: 32px;
  --s-48: 48px; /* between major sections */
  --s-64: 64px; /* page-level vertical rhythm */
  --s-80: 80px;

  /* type — sizes pair with line heights; body max line length 60–80ch */
  --f-body: system-ui, sans-serif;
  --fw-regular: 400;
  --fw-medium: 500;
  --fw-semibold: 600;
  --fw-bold: 700;
  --t-display: 36px;    --lh-display: 44px;
  --t-heading-xl: 30px; --lh-heading-xl: 38px;
  --t-heading-lg: 24px; --lh-heading-lg: 32px;
  --t-heading: 20px;    --lh-heading: 28px;
  --t-heading-sm: 16px; --lh-heading-sm: 24px;
  --t-body-lg: 18px;    --lh-body-lg: 28px;
  --t-body: 16px;       --lh-body: 24px;
  --t-body-sm: 14px;    --lh-body-sm: 20px;
  --t-label: 12px;      --lh-label: 16px;

  /* radius */
  --r-sm: 4px;
  --r-md: 8px;
  --r-lg: 12px;
  --r-full: 9999px;

  /* elevation */
  --shadow-1: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-2: 0 4px 6px rgba(0, 0, 0, 0.07);
  --shadow-3: 0 10px 15px rgba(0, 0, 0, 0.1);

  /* control heights */
  --control-sm: 32px;
  --control-md: 40px;
  --control-lg: 48px;

  /* icon sizes */
  --icon-sm: 16px;
  --icon-md: 20px;
  --icon-lg: 24px;
}

/* dark theme — override only what changes; tokens.json mirrors this split */
@media (prefers-color-scheme: dark) {
  :root {
    --c-surface: var(--p-gray-900);
    --c-surface-raised: var(--p-gray-850);
    --c-surface-overlay: var(--p-gray-800);
    --c-border: var(--p-gray-800);
    --c-border-strong: var(--p-gray-600);
    --c-text: var(--p-gray-50);
    --c-text-secondary: var(--p-gray-300);
    --c-text-disabled: var(--p-gray-600);
    --c-action: var(--p-gray-100);
    --c-action-label: var(--p-gray-900);
    --c-focus-ring: var(--p-gray-50);
  }
}
`,
);
// Wireframe conventions: everything the frame side of the handoff needs that
// no CI check can reach into the design tool to enforce. Written to work as
// prompt material for a frame-generating agent as much as a checklist for a
// human designer (ADR-008; the Figma-write loop itself is a later ADR).
files.set(
  join('framework', 'seed', 'wireframe-rules.md'),
  `# Wireframe rules

For whoever draws the frames — a designer in Figma/Penpot/Sketch, or a
frame-generating agent. The repo holds the spec (\`screens/\`, \`tokens.css\`);
these rules keep the frames matched to it. None of this is CI-enforced — it
cannot be, the frames live in the tool — which is exactly why it is written down.

## Frame naming — the one rule that ties a frame to the spec

\`\`\`text
WF / SCR-### · <Screen name> / ST-## <State name>     (wireframe)
HF / SCR-### · <Screen name> / ST-## <State name>     (hi-fi)
\`\`\`

One frame per \`ST-##\` in the spec — the numbering is the checklist. A frame
whose name matches no spec state is an orphan; a state with no frame is
undrawn work hiding.

## Grid

Apply the grid before placing any content. Nothing sits outside the columns.

| Breakpoint | Columns | Gutter | Margin | Frame width | Max content |
| ---------- | ------- | ------ | ------ | ----------- | ----------- |
| Desktop    | 12      | 24px   | 40px   | 1440px      | 1280px      |
| Tablet     | 8       | 20px   | 24px   | 768px       | —           |
| Mobile     | 4       | 16px   | 16px   | 390px       | —           |

A persistent sidebar sits in columns 1–2; main content in 3–12.

## Spacing

All spacing from the \`--s-*\` scale in \`tokens.css\` — no in-between values.
Component padding \`--s-8\`/\`--s-16\`, gaps between elements \`--s-16\` or
\`--s-24\`, between sections \`--s-48\`, page rhythm \`--s-64\`.

## Wireframes are greyscale

Wireframes use only the greyscale \`--c-*\` set from \`tokens.css\`. Brand colour
arrives in pass 2b, on tokens — never painted onto a frame first.

## Layout discipline

Every container is auto-layout; nothing is manually positioned.

| Mode  | Behaviour                     | Use for                                  |
| ----- | ----------------------------- | ---------------------------------------- |
| FILL  | stretches to fill the parent  | page wrappers, sections, rows            |
| HUG   | wraps its children            | buttons, tags, cards with variable content |
| FIXED | explicit size                 | icons, avatars, images                   |

Standard nesting: page frame (FILL) → layout wrapper (FILL, grid-constrained)
→ section (FILL) → card (HUG) → header/body (FILL), footer actions (HUG).

## Recurring page patterns

Empty, error, loading, and page-header are designed once and reused — a screen
spec's \`ST-##\` says *when* they appear, not what they look like. Empty states
differ by context (first use, cleared by filter, no permission, nothing yet);
errors differ by cause (not found, server, offline, forbidden) — reuse the
pattern, vary the copy and recovery action. If a pattern component does not
exist yet, it earns its place in the library the first time a screen needs it.

In the design tool, name component variants \`Property=Value\` (\`Type=Primary,
State=Hover\`) so a spec can reference a variant unambiguously.

## Design-file organisation (suggestion, not a rule)

A shared file needs an order whoever creates the pages. One that works:
an index page first, then research boards (if kept in the tool), then one
wireframe page per screen in \`SCR-###\` order, then design-system foundations
and components, then hi-fi pages per screen. Keep the order stable; people
navigate shared files by muscle memory.

## Per-frame checklist

- [ ] Grid applied, content inside columns
- [ ] Auto-layout everywhere, modes per the table above
- [ ] Spacing and colour from tokens only — no raw values
- [ ] Reuse existing pattern components before drawing new shapes
- [ ] Frame named \`WF / SCR-### · <name> / ST-## <state>\`
- [ ] Every \`ST-##\` in the spec has its own frame

Tailor this file to your project; it is yours from here.
`,
);
// AI-DLC.md sends every new joiner to a root ONBOARDING.md, so the scaffold
// writes a framework-level one. The team makes it project-specific from there.
files.set(
  join('framework', 'seed', 'ONBOARDING.md'),
  `# Onboarding

About 15 minutes, whatever your role. This repository runs **AI-DLC**: you work
with an AI persona for your role, and approvals are GitHub pull-request reviews
rather than chat text — with one exception, called out below.

## 1. The shortest possible version

Work moves through three gates. Each one asks a single question, and a human
answers it by approving a PR:

| Gate            | Question                        | Who drafts                  |
| --------------- | ------------------------------- | ---------------------------- |
| **1 Discovery** | Are we building the right thing? | BA, UX, Architect            |
| **2 Delivery**  | Does this story provably work?   | DEV, QA, Architect           |
| **3 Release**   | Can we ship it safely?           | DevOps                       |

Nothing is "approved" because an AI said so. Approval is your click in GitHub,
recorded against your identity, on a branch that CI has already checked. One
exception, named on purpose: the developer's implementation plan is approved in
chat, before any code exists, because a pull request at that point is a review
people learn to skip. Your name and the version you read are written into the
plan, and CI fails a plan that changed afterwards without saying so.

## 2. Start your persona

In your editor, type the command for your role:

\`\`\`
/aidlc        not sure? start here — it works out who you are and routes you
/ba           requirements, stories, change requests
/ux           screens, states, the design system
/architect    system + DB design, ADRs, PR review
/dev          plan a story, get the plan approved, then implement it as one PR
/qa           tests derived from requirements, browser tests, bug reports
/devops       CI, releases, rollback
/manager      status, routing, delivery plans
\`\`\`

Works in Claude Code, Cursor, opencode and GitHub Copilot — the personas are
pinned in this repository, so cloning it is your whole setup.

The persona interviews you in plain language. You do **not** need to know the
framework, the file layout, or git to use it. If one starts talking in paths and
IDs, tell it to explain in plain words — that is in its charter.

## 3. What building something actually looks like

A story is approved and it is yours. You type \`/dev\` and name it. From there:

| #   | Who     | What happens                                                                                                                              |
| --- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | AI      | Reads the story, sizes the task, verifies what it can by reading your code, and **asks** about anything it cannot verify                    |
| 2   | AI      | Writes a spec package into \`inception/specs/US-###-<slug>/\` — the technical requirements, an ordered implementation plan, and what the change will touch |
| 3   | **You** | **Gate D1.** Read \`implementation-plan.md\` and \`impact-analysis.md\`. Reply \`go\`, or say what is wrong. Any open question is answered first |
| 4   | AI      | Writes your name, the date, and the exact version you approved into the plan                                                                |
| 5   | AI      | Implements it — a failing test per acceptance criterion first, then the code that turns it green                                            |
| 6   | AI      | Records where each requirement landed, and pastes real command output into the pull request                                                 |
| 7   | **You** | **Gate D2.** Review the PR in GitHub, run anything that has to be checked by hand, merge                                                    |

**Two decisions, both yours: the plan, then the merge.** Everything between them
the AI owes you without asking again.

Why the plan is reviewed first: a wrong assumption costs a sentence to fix in a
plan and a rewrite to fix in a diff. Step 4 exists so that pause leaves a trace
— if the plan changes after you approved it, CI fails the PR unless the change
was written down.

**A one-line fix does not get all of this.** For a docs edit or a string change
you get the sizing and a \`go\`, nothing more. The bigger the surface the task
crosses — a new endpoint, a schema change, anything touching auth — the more of
the package it writes. It says which size it picked and why, so you can argue.

**Changed your mind, or the work grew?** Say so. It stops, re-presents, and waits
for a fresh \`go\` rather than quietly widening the diff.

## 4. Where things live

| Folder                    | What                                                       |
| ------------------------- | ------------------------------------------------------------ |
| \`ai/\`                     | The framework: role charters, gates, standards, templates   |
| \`inception/product/\`      | Requirements (\`REQ-###\`)                                     |
| \`inception/stories/\`      | Stories (\`US-###\`) and their numbered acceptance criteria    |
| \`inception/design/\`       | Research, IA, screen specs, design tokens, wireframe rules  |
| \`inception/architecture/\` | DB design + app architecture                                |
| \`inception/specs/\`        | One folder per story being built: technical requirements, the approved plan, impact, decisions, traceability |
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

// The development cycle's spec home (ADR-007). Seeded rather than .gitkeep'd
// because both files are read by humans (the catalog) and by aidlc-check
// (check 16's index rule) — an empty directory would make that rule fail on the
// first spec package a team writes.
files.set(
  join('framework', 'seed', 'specs-index.md'),
  `# Spec index

Every development spec package in this repo. **Check here before creating a new folder** — the capability may already have one, and a change to it is a revision of that package, not a second spec.

| Story | Feature | Tier | Status | Folder |
| ----- | ------- | ---- | ------ | ------ |

## How to update

- Add a row when you create \`inception/specs/US-###-<slug>/\` (DEV, at Gate D1)
- Move Status to \`implemented\` when the story PR merges
- Simple-tier changes own no folder — they record one row in \`_change-log.md\` instead
`,
);
files.set(
  join('framework', 'seed', 'specs-change-log.md'),
  `# Spec change log — Simple tier

Changes too small to own a spec package: a docs edit, a user-facing string, a constant. One row each. Anything with a spec folder logs in that folder's own \`change-log.md\` instead.

| Date | Change | Why | Story or issue |
| ---- | ------ | --- | -------------- |
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

Format: \`ai/templates/test-plan.md\`, from the repository root (this folder's
depth depends on the \`--root\` the layer was installed to). Steps are
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
#
# __E2E_ROOT__ is replaced by aidlc-scaffold with the --root it installed to. The
# config, its testDir and the JSON report all live under that root, while npm ci
# belongs at the repository root — so the paths are explicit rather than a cwd.
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
      - run: npx playwright test --config __E2E_ROOT__/playwright.config.ts
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
        run: >
          node tools/aidlc-qa-coverage.mjs --repo "$GITHUB_REPOSITORY"
          --report __E2E_ROOT__/playwright-report.json
        env:
          PRODUCT_SHA: \${{ vars.PRODUCT_SHA }}
      - if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: |
            __E2E_ROOT__/playwright-report.json
            test-results/
            e2e-coverage.json
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
4. **Confirm CI is real:** the scaffold wrote \`.github/workflows/aidlc-check.yml\` if the repo had no workflow running the validator; if the repo already had workflows, help the human add the step from \`$CLAUDE_PLUGIN_ROOT/framework/seed/ci-step.yml\` after dependency install. Either way, explain that branch protection with this status as required is what makes the gates real — and that on private GitHub Free repos it needs Pro or a public repo. The design system is seeded as **structure, not taste**: \`inception/design/tokens.css\` arrives with the framework's scales (spacing, type, radius, elevation, control heights) and a deliberately greyscale palette — \`/ux\` authors the product colours with the human in design pass 2b, and \`aidlc-check --write\` generates the \`tokens.json\` export their design tool imports. \`inception/design/wireframe-rules.md\` carries the frame-side conventions (grid, auto-layout, frame naming) the repo cannot CI-check.
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
