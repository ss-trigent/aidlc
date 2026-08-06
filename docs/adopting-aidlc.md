# Adopting AI-DLC in another repository

This repo is the home of the AI-DLC framework: the package under [`packages/aidlc-plugin`](../packages/aidlc-plugin) ships seven role-persona AI juniors (BA, UX, Architect, DEV, QA, DevOps, Manager), three CI-enforced gates (Discovery → Delivery → Release), GitHub-review approvals, and a validated traceability graph. This page is the instruction set for using it in **any other repository** — a new product, an existing codebase, any stack.

Ten minutes of setup, and the human doing it needs no framework knowledge: the install interview explains itself.

## Prerequisites

- **Claude Code** (CLI or desktop) — recommended, by whoever runs the scaffold (the interview flow is smoothest there); teams without it scaffold via `npx github:ss-trigent/aidlc` instead (see [Working from Cursor, opencode, or GitHub Copilot](#working-from-cursor-opencode-or-github-copilot)). After setup, teammates work from Claude Code, Cursor, opencode, or GitHub Copilot
- A **GitHub repository** — approvals are PR reviews and status derives from GitHub, so this is load-bearing, not a preference
- **Node 20+** available in CI and locally — `aidlc-check.mjs` is a plain Node script with no dependencies
- Branch protection requires **GitHub Pro or a public repo** if the repo is private on the Free plan (step 3 explains why it matters)

## Step 1 — Install the plugin

In Claude Code, from any directory:

```
/plugin marketplace add ss-trigent/aidlc
/plugin install aidlc@trigent-aidlc
```

That's the whole install. The plugin carries the persona skills (`/aidlc`, `/ba`, `/ux`, `/architect`, `/dev`, `/qa`, `/devops`, `/manager`), the `/aidlc-init` scaffolder, and the full framework payload it scaffolds from. Only the person running the scaffold needs it — the scaffold pins the personas into the repo itself for every editor.

## Step 2 — Scaffold the repo: `/aidlc-init`

Open Claude Code **in the repository you're adopting into** and run:

```
/aidlc-init
```

One command, one interview. What it does, in order:

1. **Refuses to overwrite** — if `ai/AI-DLC.md` already exists it offers an upgrade diff instead of a blind reinstall
2. **Copies the framework** — `ai/` (charters, gates, templates, quality bars, interaction rules) and the `tools/` scripts (the CI validator, the Jira boundary, the persona-surface builder)
3. **Installs the personas into the repo, for every editor** — the persona skills and delegatable agents land in `.claude/`, and the surface builder generates the Cursor (`.cursor/`), opencode (`.opencode/`) and GitHub Copilot (`.github/`) wrappers from them. Everyone on the team runs the same persona version whatever they edit with, and cloning the repo is the whole setup for non-Claude editors
4. **Tailors the project-owned files to your stack.** It first detects what the repo already answers (package manager, frameworks, test runner, DB layer), then interviews you in plain language — what the product is, whatever detection couldn't settle, conventions your team already has (which win over the seed's). It then rewrites `ai/standards/*.md` for *your* stack and generates `ai/project-context.md`, which every persona reads before working. The shipped standards come from this reference project (Nx + NestJS + Angular + TypeORM) and are a seed for form, not content — the interview exists so they never land unchanged in a different stack
5. **Seeds traceability** — `knowledge/traceability/manifest.json` plus the generated matrix view
6. **Creates artifact homes** — `inception/` for requirements, stories and screen specs; `knowledge/decisions/` for ADRs
7. **Wires CI** — shows you the one-line CI step to add (step 3 below)
8. **Points agents at it** — appends the AI-DLC section to `AGENTS.md` (and `CLAUDE.md` if present) so any agent in the repo knows the rules

It never commits — the scaffold lands through a reviewed PR like everything else in this framework.

One rule survives every interview verbatim: the branch pattern `feat/US-###-<slug>` in `git-standards.md`. `aidlc-check` derives "story in delivery" from it, so renaming that convention would silently disable the tests-required enforcement.

## Step 3 — Make the validator a required status

Add to your CI workflow, after dependency install (the snippet ships in the plugin at `framework/seed/ci-step.yml`):

```yaml
- run: node tools/aidlc-check.mjs
```

Then, in the repo's branch protection rules, mark that status **required**. This is the step that turns the framework from guidance into governance: artifact IDs, bidirectional traceability, AC→test coverage, and framework-file integrity are then enforced on every PR, no matter who — or which model — drafted the work.

## Step 4 — Start working

```
/aidlc          # not sure where to start — briefs you and routes you
/ba             # first customer need → BRD + user stories
```

Or go straight to any persona: `/ux` `/architect` `/dev` `/qa` `/devops` `/manager`. Personas speak plain language, ask one question at a time, and never require the human to touch git — every decision arrives as a GitHub link plus "here's the click that approves it."

## What your team owns vs. what stays framework-owned

After init, the adopting team **owns and freely edits**:

| Yours | Why |
| --- | --- |
| `ai/standards/` | Rewritten for your stack in the init interview |
| `ai/project-context.md` | Generated from the interview — keep it true as the product evolves |
| `ai/templates/jira/` | Encodes your team's workflow, not the framework's |
| `knowledge/traceability/manifest.json` | Your project's traceability graph |
| CI wiring | Your workflow files |

Everything else under `ai/` plus the `aidlc-*` tools is **framework-owned**: `ai/framework-lock.json` ships a SHA-256 per file, and `aidlc-check` (check 14) fails the build on any edit or deletion until reverted. The repo-pinned persona files are framework-owned too — the generated Cursor/opencode/Copilot wrappers are drift-checked against their `.claude/` sources (check 13), and upgrades refresh all of them together. Wanting a different gate rule is legitimate — it goes upstream as a [`change-request` issue](https://github.com/ss-trigent/aidlc/issues) against this repo, never a local edit. That's what keeps every adopting team on the same framework instead of seven divergent forks.

## Updating to a newer framework version

One command, from inside the adopted repo, on a fresh branch:

```bash
npx github:ss-trigent/aidlc --update
```

It refreshes every framework-owned file — `ai/` methodology, gates, templates, the `aidlc-*` tools, the pinned persona surfaces for all four editors — regenerates the Cursor/opencode/Copilot wrappers, and runs `aidlc-check` before it finishes. Then review `git diff` and land it as a PR, exactly like any other change.

**What an update never touches.** Anything you own that already exists is skipped, and the run prints what it kept:

| Kept as-is                               | Why                                    |
| ---------------------------------------- | -------------------------------------- |
| `ai/standards/`, `ai/templates/jira/`    | Seeds you tailored to your stack       |
| `ai/project-context.md`                  | Written from your init interview       |
| `knowledge/traceability/manifest.json`   | Your traceability data                 |
| `.github/workflows/`                     | Your CI                                |

A file you own that the framework has *added since your install* (a new standards seed, for instance) does land — it can't overwrite anything, because you don't have it yet. Tailor those in the same PR: run `/aidlc` and say "we just updated — tailor the new standards to this repo".

**In Claude Code:** update the plugin first (`/plugin` → update `aidlc@trigent-aidlc`), then run `/aidlc-init` — it detects the install, runs the same `--update`, and walks you through the diff. The plugin is only the delivery vehicle; the command above is what actually changes your repo, which is why teams with no Claude Code at all update the same way.

**Are we current?** The update is idempotent — run it and look at `git diff`. Empty means you're on the latest. There's no version to track by hand.

**If `aidlc-check` fails after an update**, check 14 will name the file: someone edited a framework-owned file locally at some point. Revert that file — the update already wrote the correct content — and take the change upstream as a [`change-request` issue](https://github.com/ss-trigent/aidlc/issues).

## Working from Cursor, opencode, or GitHub Copilot

Nothing to install. The scaffold pins the personas into the repository for every editor ([ADR-005](../knowledge/decisions/ADR-005-multi-tool-persona-surfaces.md)) — cloning the adopted repo **is** the install:

| Editor | Reads | Start a persona |
| --- | --- | --- |
| Cursor | `.cursor/commands`, `.cursor/skills`, `.cursor/agents` | type `/ba`, `/dev`, … in the chat input; the `aidlc-*` agents are delegatable |
| opencode | `.opencode/commands`, `.opencode/skills`, `.opencode/agents` | type `/ba`, `/dev`, … |
| GitHub Copilot (VS Code) | `.github/prompts`, `.github/skills`, `.github/agents` | type `/ba`, `/dev`, … in Copilot Chat (prompt files) |

All of these are generated from the same `.claude/` sources by `tools/aidlc-build-surfaces.mjs` and drift-checked in CI (check 13), so a teammate on Cursor and one on Claude Code are always running the identical persona.

**Team with no Claude Code at all?** The scaffold is a plain Node script (`/aidlc-init` itself just drives it). From inside your target repo:

```bash
npx github:ss-trigent/aidlc
```

(or clone [`ss-trigent/aidlc`](https://github.com/ss-trigent/aidlc) and run `node <clone>/tools/aidlc-scaffold.mjs /path/to/your-repo`). It installs the framework, pins the personas for every editor, seeds the traceability manifest and artifact homes, points `AGENTS.md` at the framework, writes the `aidlc-check` CI workflow if the repo has none, and verifies — identical output to the plugin flow, and it refuses to overwrite anything that differs. Afterwards, tailor the seeds: open your editor, run `/aidlc`, and say "we just scaffolded — tailor the standards to this repo" (`ai/standards/` and `ai/project-context.md` still describe the reference project until then).

One thing remains Claude Code–only, deliberately: tool-level enforcement of the read-only personas — Cursor and Copilot can't restrict an agent's tools, so there Architect and Manager carry an injected read-only notice and the charter rule stands on the model. The gates never move with the editor either way: approval is a GitHub PR review and `aidlc-check` is the required status no matter which assistant drafted the work.

## Where distribution goes next

Today the plugin installs straight from this repo via the Claude Code marketplace. The agreed destination is an npm package (`npx aidlc init` / `aidlc update`) once folder-based distribution outgrows itself — the install and ownership contract above won't change, only the delivery vehicle.
