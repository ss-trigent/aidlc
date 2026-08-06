# aidlc — AI-DLC as a Claude Code plugin

Packages this repo's AI-DLC framework so any team can install it: seven role-persona AI juniors (BA, UX, Architect, DEV, QA, DevOps, Manager) driving three CI-enforced gates (Discovery → Delivery → Release), with approvals as GitHub PR reviews and a CI-validated traceability graph. Full methodology: [`ai/AI-DLC.md`](framework/ai/AI-DLC.md); comparison with spec-kit / AWS aidlc-workflows: [`docs/aidlc-vs-spec-kit.md`](../../docs/aidlc-vs-spec-kit.md).

## Install

In Claude Code:

```
/plugin marketplace add ss-trigent/aidlc
/plugin install aidlc@trigent-aidlc
```

Then, in the repo you want to run AI-DLC in:

```
/aidlc-init        # one-time scaffold: ai/, aidlc-check, manifest, CI step —
                   # then an interview tailors ai/standards/ and ai/project-context.md to your stack
/aidlc             # start working — routes you to your persona
```

Or jump straight to a persona: `/ba` `/ux` `/architect` `/dev` `/qa` `/devops` `/manager`.

The scaffold pins the personas into the repo for **every editor** — Claude Code (`.claude/`), Cursor (`.cursor/`), opencode (`.opencode/`) and GitHub Copilot (`.github/`) — so teammates on those editors need nothing installed; cloning the repo is their setup, and `aidlc-check` keeps all four surfaces in sync.

No Claude Code on the team? The scaffold `/aidlc-init` drives is a plain Node script (`framework/tools/aidlc-scaffold.mjs`) — run `npx github:ss-trigent/aidlc` from inside the target repo for the identical result, then tailor the standards via `/aidlc` in any editor.

## Update

Update the plugin (`/plugin` → update `aidlc@trigent-aidlc`), then run `/aidlc-init` in the adopted repo — it detects the install and upgrades instead of scaffolding. Without Claude Code, the same upgrade is one command from inside that repo:

```bash
npx github:ss-trigent/aidlc --update
```

Framework files and all four persona surfaces are refreshed; files the team owns — tailored `ai/standards/`, `ai/project-context.md`, `ai/templates/jira/`, the traceability manifest, their CI workflow — are skipped when they already exist, and the run prints what it kept. It verifies with `aidlc-check` and leaves the result for review as a PR. Idempotent: an empty `git diff` means already current.

Full adoption walkthrough — prerequisites, the init interview, CI wiring, ownership, upgrades: [`docs/adopting-aidlc.md`](../../docs/adopting-aidlc.md).

Optional companion: [mattpocock/skills](https://github.com/mattpocock/skills) — personas can invoke its techniques (`grilling`, `tdd`, `domain-modeling`, `triage`, ...) as sub-skills while staying bound by their charters and gates. See the mapping table in `framework/ai/AI-DLC.md` §Companion skills.

## What's inside

| Path                              | What                                                     | Source of truth                                |
| --------------------------------- | -------------------------------------------------------- | ---------------------------------------------- |
| `skills/`                         | 8 persona skills + `/aidlc-init` scaffolder              | **generated** — `tools/aidlc-build-plugin.mjs` |
| `framework/ai/`                   | Charters, gates, templates, standards, interaction rules | **generated** — copied from this repo's `ai/`  |
| `framework/tools/*.mjs`           | The policy-as-code CI validator, the persona-surface builder, the Jira boundary, and the deterministic scaffolder (`aidlc-scaffold.mjs`) | **generated** — copied from `tools/`           |
| `framework/seed/`                 | Fresh-repo manifest skeleton + CI step snippet           | **generated**                                  |
| `.claude-plugin/plugin.json`      | Plugin manifest                                          | hand-maintained                                |

Never hand-edit generated paths — change the sources in the repo root and run `node tools/aidlc-build-plugin.mjs`. CI fails on drift (`aidlc-check` check #9).

## Ownership after install

The framework is a shared library. An adopting team owns — and freely edits — what `/aidlc-init` generates for it: `ai/standards/` (rewritten for their stack in the init interview, including `task-surfaces.md`, where they name the task-classification surfaces their codebase actually has), `ai/project-context.md`, `ai/templates/jira/`, the traceability manifest, and CI wiring. Everything else under `ai/` plus the `aidlc-*` tools is framework-owned: `ai/framework-lock.json` ships a SHA-256 per file and `aidlc-check` (check #14) fails the build on any edit or deletion until reverted — that includes the artifact templates (`brd.md`, `user-story.md`, `screen-spec.md`, `adr.md`, `pr-description.md`), whose shape is what traceability is validated against. Wanting a different gate rule is legitimate — it goes upstream as a `change-request` issue against this repo, never a local edit. Full configuration guide: [README §Configuring it for your team](../../README.md#configuring-it-for-your-team).

## What makes it different from spec-kit / AWS aidlc-workflows

Those systems steer agents through instructions; this one **enforces outcomes**: a required CI status validates artifact IDs, bidirectional traceability, AC→test coverage, and generated-file drift, and every approval is an authenticated GitHub review. See the [full comparison](../../docs/aidlc-vs-spec-kit.md).
