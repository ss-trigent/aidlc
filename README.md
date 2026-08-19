# AI-DLC — AI-Driven Development Lifecycle

A delivery framework where seven role-persona AI juniors (BA, UX, Architect, DEV, QA, DevOps, Manager) assist their human counterparts through **three CI-enforced gates** (Discovery → Delivery → Release). Approvals are authenticated GitHub PR reviews — never chat text; traceability (`REQ → US → AC → tests`) is validated on every PR by a policy-as-code check. Unlike instruction-only systems (spec-kit, AWS aidlc-workflows), it **enforces outcomes** — see the [full comparison](docs/aidlc-vs-spec-kit.md).

## Use it in your repo

**One-time setup** — one person on the team, in Claude Code (no plugin exists or is needed for the other editors — and no Claude Code at all? see [Bootstrapping without Claude Code](#bootstrapping-without-claude-code)):

```
/plugin marketplace add ss-trigent/aidlc
/plugin install aidlc@trigent-aidlc
```

Then, in the repository you want to run AI-DLC in:

```
/aidlc-init        # one-time scaffold + an interview that tailors standards to your stack
/aidlc             # start working — routes you to your persona
```

The scaffold pins the personas into the repository itself for every editor. Once it's merged, each teammate's setup is **cloning the repo** — nothing to install per person:

| Your editor               | Setup                                          | Where the personas live                                                                            |
| ------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **Claude Code**           | clone (plugin optional — repo carries it all)  | `/aidlc`, `/ba`, `/dev` … as skills + delegatable agents in `.claude/`                             |
| **Cursor**                | clone                                          | `/ba`, `/dev` … as commands in `.cursor/commands/`, plus skills and agents under `.cursor/`        |
| **GitHub Copilot**        | clone                                          | `/ba`, `/dev` … as prompt files in Copilot Chat (`.github/prompts/`), plus skills and agents in `.github/` |
| **opencode**              | clone                                          | `/ba`, `/dev` … as commands in `.opencode/commands/`, plus skills and agents under `.opencode/`    |

All four surfaces are generated from the same repo-pinned sources and drift-checked in CI, so every teammate runs the identical persona version regardless of editor. The gates are editor-independent — approvals are GitHub PR reviews and `aidlc-check` is the required CI status either way.

Full walkthrough — prerequisites, the init interview, CI wiring, ownership, upgrades, per-editor details: **[docs/adopting-aidlc.md](docs/adopting-aidlc.md)**. For a visual tour of the whole methodology, open **[docs/aidlc-how-it-works.html](docs/aidlc-how-it-works.html)** in a browser.

### Bootstrapping without Claude Code

The scaffold is a plain Node script — `/aidlc-init` itself just drives it. From inside your target repo:

```bash
npx github:ss-trigent/aidlc
```

(or clone this repo and run `node aidlc/tools/aidlc-scaffold.mjs /path/to/your-repo`). It installs the framework, pins the personas for every editor, seeds the traceability manifest and artifact homes, points `AGENTS.md` at the framework, writes the `aidlc-check` CI workflow if the repo has none, and verifies — identical output to the plugin flow, refusing to overwrite anything that differs. One step stays conversational: `ai/standards/` and `ai/project-context.md` are still reference seeds afterwards, so open your editor, run `/aidlc`, and say "we just scaffolded — tailor the standards to this repo".

### Updating to a newer version

From inside the adopted repo, on a fresh branch:

```bash
npx github:ss-trigent/aidlc --update
```

Refreshes every framework-owned file and the pinned persona surfaces, then verifies with `aidlc-check`. Files you own are skipped when they already exist — your tailored `ai/standards/`, `ai/project-context.md`, the traceability manifest, your CI — and the run prints what it kept. Review `git diff` and land it as a PR. It's idempotent, so an empty diff means you're already current; there's no version to track by hand. Claude Code users can update the plugin (`/plugin`) and run `/aidlc-init`, which drives the same command. Details: [docs/adopting-aidlc.md](docs/adopting-aidlc.md#updating-to-a-newer-framework-version).

## Configuring it for your team

The framework is a shared library, not a fork. A short list of files is **yours** — the init interview writes them for your stack and you edit them freely from then on. Everything else is hash-locked, so every adopting team stays on the same gates.

| Yours to edit                          | What you put there                                                              |
| -------------------------------------- | ------------------------------------------------------------------------------- |
| `ai/standards/*.md`                    | Coding, API, testing, security and git rules for **your** stack                 |
| `ai/standards/task-surfaces.md`         | Your project's task-classification surfaces (see below)                          |
| `ai/project-context.md`                | What the product is, domain terms, the stack, how to build/test/run             |
| `inception/*/README.md`, `ONBOARDING.md` | Seeded formats and onboarding — rewrite them for your project                  |
| `ai/templates/jira/*.md`               | Your Jira ticket shapes                                                          |
| `knowledge/traceability/manifest.json` | Your traceability graph — personas write it; you don't hand-edit it              |
| `.github/workflows/`                   | Your CI                                                                          |

Everything else under `ai/` and every `tools/aidlc-*.mjs` is **framework-owned**: `ai/framework-lock.json` carries a SHA-256 per file and `aidlc-check` (check 14) fails the build on any local edit until it's reverted. An update refreshes all of them and never touches the table above.

### Extending task classification

Before writing code, a delivery persona tiers the task Simple / Medium / Complex by the riskiest surface it crosses ([`ai/context/task-classification.md`](ai/context/task-classification.md)). The five surfaces — contract, persistence, trust, dependency, operational — are framework-owned so the workflow reads the same in every repo. What they're *called in your codebase* is yours:

```
ai/standards/task-surfaces.md     ← name your protected paths, per-domain
                                     surfaces (backend / UI / scripts & jobs),
                                     and your Medium carve-outs
```

You may **add** surfaces and named carve-outs; you may not remove or demote a framework one. That isn't a promise — the framework list is locked, so it can only be extended. If a framework surface is genuinely wrong for you, that's a `change-request` upstream.

### Configuring templates

Two kinds, and only one is yours:

- **Jira templates** (`ai/templates/jira/`) — **yours.** Frontmatter fields plus a Markdown body, `${PLACEHOLDER}` syntax. Two validator rules (check 12): a template may not declare a field that forwards approval or duplicates what Jira owns (`status`, `approval`, `approver`, `signoff`, `sprint`, `assignee`, `storypoints`, `duedate`, …), and every `${PLACEHOLDER}` must be one the tooling knows. Approval lives in a GitHub review; Jira mirrors the work, it never gates it.
- **Artifact templates** (`ai/templates/brd.md`, `user-story.md`, `screen-spec.md`, `test-plan.md`, `adr.md`, `pr-description.md`) — **framework-owned.** Their shape is what `aidlc-check` validates traceability against, so a local edit breaks the guarantee for everyone. Need a different shape? `change-request` upstream.

### Optional integrations

All off by default, all configured in your own files — nothing to install into the framework: Jira mirroring ([`ai/context/jira-sync.md`](ai/context/jira-sync.md) is binding; `tools/aidlc-jira.mjs` is the only permitted writer), any design tool via the generated `inception/design/tokens.json`, MCP servers for **read-only** context, and [mattpocock/skills](https://github.com/mattpocock/skills) as companion techniques personas may invoke while staying bound by their charters. The full adopted/declined list with rationale: [`ai/integrations.md`](ai/integrations.md).

### When you need to change something locked

Open a [`change-request` issue](https://github.com/ss-trigent/aidlc/issues) against this repo. Wanting a different gate rule is legitimate; editing it locally just makes your next update a merge conflict and splits the framework into per-team forks. Ownership in full: [docs/adopting-aidlc.md](docs/adopting-aidlc.md#what-your-team-owns-vs-what-stays-framework-owned).

## What's in this repo

| Path                                  | What                                                                | Status                                                 |
| ------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------ |
| `ai/`                                 | The framework itself: methodology, persona charters, gates, quality bars, templates, reference standards | **source of truth** (hash-locked via `ai/framework-lock.json`) |
| `.claude/skills/` + `.claude/agents/` | Persona surface sources (skills + delegatable agents)               | **source of truth**                                     |
| `tools/aidlc-*.mjs`                   | The CI validator, plugin/surface builders, the scaffolder, Jira sync, cross-repo e2e evidence | **source of truth**                                     |
| `packages/aidlc-plugin/`              | The Claude Code plugin (skills + bundled framework payload)         | **generated** — `node tools/aidlc-build-plugin.mjs`     |
| `.cursor/` `.opencode/` `.github/` persona files | Cursor / opencode / GitHub Copilot surfaces ([ADR-005](knowledge/decisions/ADR-005-multi-tool-persona-surfaces.md)) | **generated** — `node tools/aidlc-build-surfaces.mjs`   |
| `.claude-plugin/marketplace.json`     | The plugin marketplace this repo hosts                              | hand-maintained                                         |
| `inception/specs/`                    | Per-story development spec packages — DEV-owned, one folder per story ([ADR-007](knowledge/decisions/ADR-007-dev-spec-packages.md)) | team-owned; the templates and check 16 are framework-owned |
| `docs/`, `knowledge/decisions/`       | Adoption guide, spec-kit comparison, framework ADRs                 | hand-maintained                                         |

## Maintaining the framework

- Edit sources (`ai/`, `.claude/`, `tools/`), then rebuild both generated trees: `npm run build:plugin` and `npm run build:surfaces`. CI (`node tools/aidlc-check.mjs`) fails on drift — never hand-edit generated files.
- Intentional changes to framework-owned files require regenerating the lock: `node tools/aidlc-check.mjs --lock` (maintainers only, deliberately excluded from `--write`).
- Adopting teams own only what `/aidlc-init` tailors for them (`ai/standards/`, `ai/project-context.md`, `ai/templates/jira/`, their manifest and CI wiring); everything else is verified against the shipped lock in *their* CI too. Their change proposals arrive here as [`change-request` issues](https://github.com/ss-trigent/aidlc/issues) — that contract is what keeps every adopter on one framework instead of divergent forks.

## Provenance

Extracted 2026-08-03 from [`ss-trigent/logistics-shortest-route-poc`](https://github.com/ss-trigent/logistics-shortest-route-poc), the reference project the framework was built and first proven in. That repo retains the full development history; this repo starts fresh as the framework's canonical home. The reference standards in `ai/standards/` still reflect that project's stack (Nx + NestJS + Angular + TypeORM) by design — they are seeds for form, rewritten per-stack by the `/aidlc-init` interview.
