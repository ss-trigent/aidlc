# ADR-005 — Persona surfaces for Cursor, opencode and GitHub Copilot, generated from the Claude sources

|             |                                                                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**  | proposed — awaiting review                                                                                                            |
| **Date**    | 2026-08-03                                                                                                                            |
| **Decider** | repo admin (stakeholder instruction: personas must be usable from Cursor, opencode and GitHub Copilot)                                |
| **Serves**  | framework-wide (no single story)                                                                                                      |
| **Relates** | [ADR-001](ADR-001-framework-structure-and-toolchain.md) (scopes its Anthropic-only toolchain), [ADR-004](ADR-004-gate1-flow-extensions.md) (read-only model this preserves) |

## Context

The persona commands (`/ba`, `/ux`, `/dev`, …) exist only as Claude Code surfaces: skills in `.claude/skills/` and agents in `.claude/agents/`. The stakeholder wants the same personas usable from **Cursor, opencode and GitHub Copilot**.

Three facts make this cheap rather than a rewrite:

1. The charters in `ai/roles/` are deliberately tool-agnostic. The Claude surfaces are thin wrappers that defer to them.
2. All three target tools read the same **Agent Skills** format (`skills/<name>/SKILL.md`) that Claude Code uses, and each has a typed-command surface (`.cursor/commands/`, `.opencode/commands/`, `.github/prompts/`) and an agent surface (`.cursor/agents/`, `.opencode/agents/`, `.github/agents/`).
3. This repo already carries that layout: the Nx tooling scaffolds its own skills into all four tools' directories.

Two invariants were at stake:

- **ADR-001's Anthropic-only toolchain.** Adding tool surfaces means the personas can be executed by non-Anthropic models. That position must be scoped, not silently contradicted.
- **Read-only by construction** (ADR-001, reaffirmed ADR-004): the Architect and Manager agents disallow the write tools, and check 10 fails if that is ever removed. Not every target tool can express a tool restriction.

## Decision

**The per-tool surfaces are build artifacts, generated from the Claude sources by `tools/aidlc-build-surfaces.mjs`, and CI fails on drift (check 13). The gates do not move: approval remains a GitHub PR review and `aidlc-check` remains the required status, whichever assistant did the drafting.**

1. **One source, four tools.** `.claude/skills/<p>/SKILL.md` and `.claude/agents/aidlc-<p>.md` stay the hand-edited source (they defer to the charters). The generator emits, per persona: a verbatim `SKILL.md` mirror into `.cursor/skills/`, `.opencode/skills/`, `.github/skills/`; a typed command into `.cursor/commands/<p>.md`, `.opencode/commands/<p>.md`, `.github/prompts/<p>.prompt.md`; and an agent into `.cursor/agents/aidlc-<p>.md`, `.opencode/agents/aidlc-<p>.md`, `.github/agents/aidlc-<p>.agent.md`. Generated files are never hand-edited; `node tools/aidlc-build-surfaces.mjs --check` runs inside `aidlc-check` as check 13.

2. **Enforcement parity is uneven, and recorded rather than pretended.** The read-only guarantee survives at tool level on **opencode** (`tools: write/edit: false` in the agent frontmatter). **Cursor** and **Copilot** have no per-agent tool restriction, so their Architect and Manager surfaces carry an injected read-only notice — a charter rule, not a tool restriction, exactly the class of limit the framework already states plainly for Jira and for merge authority. Check 10 (the `.claude` agents' `disallowedTools`) is unchanged and still guards the strongest surface.

3. **ADR-001's "Anthropic-only" is scoped to what it actually decided:** one primary assistant, one audit trail, and no multi-vendor *orchestration stack* (no Codex/LangGraph/etc. as framework components). It did not, and after this ADR explicitly does not, forbid a team member's editor from executing the tool-agnostic charters. The accepted cost: work drafted in Cursor/opencode/Copilot is produced by whatever model that tool runs, so "one model vendor" no longer describes drafting. It still describes the framework's own tooling, and the enforcement spine (GitHub reviews + `aidlc-check`) is model-independent by design, which is the real guarantee.

4. **The Claude Code plugin ships the generator** (`framework/tools/aidlc-build-surfaces.mjs`) so adopting repos can emit the same surfaces; wiring it into `/aidlc-init` is deferred until someone asks. *(Since done: `/aidlc-init` now drives the deterministic scaffolder `tools/aidlc-scaffold.mjs`, which pins the personas and generates all editor surfaces in adopting repos, also runnable without Claude Code via `npx github:ss-trigent/aidlc`.)*

## Alternatives considered

| Option                                            | Why rejected                                                                                                          |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Hand-author the per-tool files                    | Twenty-plus near-copies of seven contracts; drift is a matter of time, and check 10 only sees the Claude surfaces      |
| Root `AGENTS.md` only, no commands/agents         | Gives every tool the framework brief but no `/ba`-style entry point and no delegatable read-only agents                |
| Symlinks from the tool dirs into `.claude/`       | Frontmatter needs differ per tool (opencode `mode`/`tools`, Copilot `.agent.md` naming); symlinks cannot adapt content |
| Give Cursor/Copilot personas fewer capabilities   | Nothing to withhold — those tools have no restriction mechanism; an honest notice beats a pretended guarantee          |

## Consequences

- `/ba`, `/ux`, `/architect`, `/dev`, `/qa`, `/devops`, `/manager`, `/aidlc` are typeable in Claude Code, Cursor, opencode and Copilot Chat; `aidlc-*` agents are delegatable in Claude Code, Cursor, opencode and Copilot.
- Editing a persona means editing `.claude/skills|agents` (or the charter) and running `node tools/aidlc-build-surfaces.mjs`; CI rejects a PR that edits a generated file directly.
- The read-only guarantee is tool-enforced on Claude Code and opencode, charter-enforced on Cursor and Copilot, stated in `ai/integrations.md`.
