# How this AI-DLC framework compares to spec-kit and AWS aidlc-workflows

Researched 2026-07-23 against [github/spec-kit](https://github.com/github/spec-kit) and [awslabs/aidlc-workflows](https://github.com/awslabs/aidlc-workflows) (v2.0 GA). Our framework lives in `ai/` with enforcement in `tools/aidlc-check.mjs`; installable as the `aidlc` plugin from `packages/aidlc-plugin`.

## The three systems in one sentence each

- **spec-kit (GitHub):** a per-feature _spec-driven development_ toolkit — `/speckit.constitution → specify → clarify → plan → tasks → implement (+ analyze, checklist, converge)` — generating `.specify/` artifacts, working across 30+ AI agents.
- **aidlc-workflows (AWS Labs):** _steering rules_ that put any coding agent through Inception → Construction → Operations with mob elaboration, in-file question/approval loops, an `aidlc-docs/` artifact tree, and opt-in extension packs (security, testing, resiliency).
- **This framework:** seven role personas assisting their human counterparts through three **CI-enforced** gates (Discovery / Delivery / Release), with approvals as authenticated GitHub PR reviews and a machine-validated traceability graph.

Lineage note: our source methodology (the Trigent AI-DLC PDF) mirrors AWS's AI-DLC — same phase names, same philosophy. We are an _implementation with enforcement_, not a competing methodology.

## Feature comparison

| Dimension           | spec-kit                                        | aidlc-workflows                                                             | this framework                                                                                                         |
| ------------------- | ----------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Unit of operation   | one feature spec                                | one project/intent ("Using AI-DLC, ...")                                    | one story through gates, carrying its own spec package; feature via epic                                               |
| Lifecycle coverage  | specify → implement (stops at code)             | Inception → Construction → Operations (docs through deploy)                 | Discovery → Delivery → Release + change/defect loops                                                                   |
| Roles               | none — a developer drives                       | none — workflow stages, not team roles                                      | **7 personas mapped to real team roles**, incl. non-technical users via guided interaction                             |
| Approvals           | in-chat / artifact review                       | answers + plan approvals written into files                                 | **authenticated GitHub PR reviews** (identity + commit SHA), bar one named exception: the developer's in-chat plan review at Gate D1, which stamps approver, date and the approved plan's SHA into the plan itself |
| Enforcement         | prompts + checklists (agent obedience)          | blocking rules _by instruction_; evaluator/CI tools exist as separate repos | **one required CI status (`aidlc-check`)**: ID uniqueness, bidirectional traceability, AC→test coverage, payload drift, framework-file integrity, and published cross-repo e2e evidence |
| Traceability        | not addressed                                   | separate optional tool generates matrices                                   | **built-in graph** (`manifest.json`: REQ↔US↔AC↔tests↔ADR + lessons), validated on every PR, matrix generated           |
| Tests               | generated during implement; coverage unverified | QA stage + property-based-testing extension                                 | **tests are the only proof**: AC citations in test names checked by CI, at the lowest sufficient level — and for browser tests, a plan the human approves before any test is generated                                                 |
| Multi-agent support | 30+ agents                                      | 8 targets (Kiro, Q, Cursor, Cline, Claude Code, Copilot, Codex, AGENTS.md)  | Claude Code skills + `AGENTS.md` convention (any agent can adopt the charters — skills are plain markdown)             |
| Customization       | constitution + extensions/presets               | extension packs with audit-logged rule IDs                                  | standards in `ai/standards/`, edited via PRs like everything else                                                      |
| Distribution        | `specify` CLI (pip/uv)                          | release ZIP copied into agent config dirs                                   | **Claude Code plugin** (`/plugin marketplace add`) with `/aidlc-init` scaffolder, or `npx github:ss-trigent/aidlc` (plain-Node scaffold, no Claude Code needed) |
| Status truth        | artifacts                                       | artifacts                                                                   | **GitHub** (PRs/issues/checks) — no status files by design                                                             |

## What genuinely differentiates us

1. **Enforcement over obedience.** Both spec-kit and aidlc-workflows ultimately depend on the agent _following instructions_; their quality mechanisms are more prompts. Our external review demonstrated exactly why that fails — so every load-bearing rule here is validated deterministically in CI, and approvals are cryptographically attributable GitHub reviews, not editable text.
2. **Team roles, not just workflow stages.** Personas are junior colleagues bound to a human counterpart (BA, Architect, DEV, QA, DevOps, Manager), with interaction rules built for non-technical users. Neither comparator models the _team_.
3. **Traceability as a first-class, validated graph** — not a separate tool (AWS) or absent (spec-kit).

## What they have that we should consider adopting

- **spec-kit's `/clarify` discipline** — a dedicated ambiguity-resolution pass before planning. _Adopted 2026-07-23_ as the Gate 1 **grill pass** (technique borrowed from [mattpocock/skills](https://github.com/mattpocock/skills), now a gate check in `ai/gates/discovery.md`).
- **spec-kit's `constitution`** — a single project-principles file agents load first. Our `ai/standards/` covers this, but a one-page constitution is a nice compression.
- **A written, per-unit spec artifact.** _Adopted 2026-08-19_ ([ADR-007](../knowledge/decisions/ADR-007-dev-spec-packages.md)). This was a real gap and an adopting team named it: we produced Discovery artifacts and code with nothing in between, so a developer's plan lived in a chat block that vanished with the session. Development now keeps a package per story at `inception/specs/US-###-<slug>/` — technical `FR`/`NFR` traced to the story's criteria, an implementation plan the human approves before any code, impact analysis, decisions, traceability, change log. The lineage is not spec-kit but a Trigent product repo already running its own AI-DLC variant; what we took from it was the artifact set, not its seven human gates.
- **AWS's extension packs** — opt-in, audit-logged rule bundles (security baseline, property-based testing, resiliency). Our standards are monolithic; packs would scale better across client projects.
- **AWS's adaptive stage-skipping** — executing only stages that add value per request. Our gates are already minimal (3), but the principle matches our "ADR only for real trade-offs" rule.
- **Breadth of agent targets** — both support many agents out of the box; our skills are plain markdown plus the `AGENTS.md` convention, so new surfaces are added when real users appear.

## Where we still differ from a spec-driven pipeline

Adopting a written spec package does not make this spec-kit. spec-kit's `/speckit.specify` generates a spec from a prompt in one pass; here the spec is the developer's technical expansion of a **story that a human already approved at Gate 1**, and its requirements must trace to that story's numbered criteria or `aidlc-check` fails the PR. The document is downstream of an authenticated approval rather than upstream of a conversation — which is why our specs can be validated and theirs are read.

## Bottom line

spec-kit is the best _single-feature spec pipeline_; aidlc-workflows is the closest _methodology sibling_ (same lifecycle, richer doc generation, more agent targets); ours is the only one of the three where the lifecycle is **enforced by a required CI status and authenticated approvals** and where **team roles** (including non-technical ones) are first-class. The gap we should close over time is distribution maturity — which the `aidlc` plugin starts.

Sources: [github/spec-kit](https://github.com/github/spec-kit) · [awslabs/aidlc-workflows](https://github.com/awslabs/aidlc-workflows) · [AWS DevOps blog: AI-DLC](https://aws.amazon.com/blogs/devops/ai-driven-development-life-cycle)
