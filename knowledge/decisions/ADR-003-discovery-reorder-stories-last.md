# ADR-003 — Discovery reordered: requirements → design → stories, with a screen→requirement edge

|             |                                                                                                                                                          |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**  | accepted — architect reviewed and approved 2026-07-31 (banked by the PR that merges this file; GitHub review is the authoritative record)                |
| **Date**    | 2026-07-31                                                                                                                                               |
| **Decider** | Solution Architect (reviewed and approved) + repo admin                                                                                                  |
| **Serves**  | Gate 1 (Discovery), framework-wide (no single story)                                                                                                     |
| **Relates** | [ADR-001](ADR-001-framework-structure-and-toolchain.md) (Gate 1 structure), [ADR-002](ADR-002-jira-tracking-flow.md) (frames stay out of the repo)       |
| **Source**  | [inception/product/inputs/2026-07-31-architect-discovery-and-dev-flow.md](../../inception/product/inputs/2026-07-31-architect-discovery-and-dev-flow.md) |

## Context

Gate 1 originally ran the BA and UX **together**: a single artifact PR could carry the BRD, the stories, and the screens at once, and the traceability graph made the **story the sole anchor** — every screen had to name a story (`SCR → US`), and `aidlc-check` failed any screen with an empty `stories[]` as an "orphan screen … a screen that traces to nothing is decoration."

The Solution Architect's discovery-flow notes describe a different order:

> requirements → design (screen specs, prototyped as wireframes in a design tool) → **then** generate user stories, once everything is finalised — "scope locked".

The intent is to stop stories from being written against scope that is still moving: finalise _what_ the product must do, design _what the user sees_, and only then slice the stories that Construction builds against.

Two things had to be settled before this could be implemented:

1. **Wireframes.** Do they become repository artifacts? **No** — settled with the stakeholder and consistent with [ADR-002](ADR-002-jira-tracking-flow.md) and `inception/design/README.md`: the repo holds the **screen spec** (`SCR-###`/`ST-##`) and tokens; the designer prototypes the wireframes in Figma/Penpot/etc., and frames are never checked in. So "design" here means the spec, which the reorder already supports.
2. **The orphan-screen rule.** Drafting stories _last_ means screens are approved (step 2) while no story exists yet. Under the old model that screen fails CI as an orphan. The reorder is therefore **not** a pure charter change — the data model assumed the story existed first.

## Decision

**Discovery becomes three ordered steps, each its own PR whose merge is that step's exit; stories are drafted last. A screen may trace to the requirement it serves, so it can be approved before any story exists. The ordering is enforced by the persona charters and human review — not by a new CI block.**

1. **Three ordered steps.** (1) BA freezes requirements (BRD PR). (2) UX designs `SCR-###` screens from the approved requirements and hands the specs + tokens to the designer to prototype (design PR). (3) BA slices INVEST stories citing the frozen requirements and the already-approved screens (stories PR). Each merge is that step's scope baseline; the stories merge is the locked scope Gate 2 builds against.

2. **Screen → requirement edge.** A screen node gains an optional `requirements[]`, mirrored by an optional `screens[]` on the requirement node — the same bidirectional shape as every other edge. A screen is now an orphan (hard CI error) only when it traces to **neither** a story **nor** a requirement. The principle is unchanged — a screen must trace to _something_ — but during design that something is the requirement, and the `US ↔ SCR` edge is added in step 3.

3. **Enforcement is charter convention, not a new gate check.** `/ux` refuses to design without approved requirements; `/ba` refuses to draft stories until design is approved. `aidlc-check` keeps only the checks it always had — every cited artifact must resolve, bidirectionally — and does **not** turn a premature story into a red build. This was a deliberate choice over a hard "requirements-and-screens-must-be-on-`main`-first" precondition: the guarantee lives in the personas and the human review, matching the framework's preference for the lightest mechanism that holds.

4. **What does not change.** Approval is still a GitHub PR review; status is still derived from GitHub; frames still live in the design tool, not the repo; the AC→test rule and the design-completeness checks (states rendered, tokens not hand-edited, no raw hex) are untouched. Existing screens keep their story edges — the requirement edge is additive, so no migration.

## Alternatives considered

| Option                                                                           | Pros                                          | Cons                                                                                                             | Why rejected                                                                     |
| -------------------------------------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Keep story-first (status quo)                                                    | No model change; one PR for small features    | Stories get written against scope that design later moves — the rework the architect's order exists to prevent   | Does not deliver the requested "stories last, scope locked" flow                 |
| Hard CI precondition (block a story merge until its REQs and SCRs are on `main`) | Strongest guarantee; order cannot be violated | Heavier; brittle across the `docs/` authoring workflow where several steps may be in flight; more than asked for | Team chose charter convention; the lighter mechanism is enough with human review |
| Lightweight story stubs up front so screens cite them                            | No model change — screens still cite a story  | A stub _is_ a story; contradicts "scope locked, stories only once everything is finalised"; invites AC drift     | Reintroduces the very early-story problem the reorder removes                    |
| Wireframes as repo artifacts (so "design" is frames)                             | A frame is what the product team reacts to    | A frame is a URL CI cannot validate; no gate can rest on it; reopens ADR-002 and check 11                        | Settled separately: repo holds the spec, the tool holds the pixels               |

## Consequences

**Easier.** No story rework when design changes the scope, because stories come after both freezes. Screens trace to the requirement they actually serve, which reads more honestly than a screen pointing at a story invented to hold it. Design can start the moment requirements freeze, in its own reviewable PR.

**Harder / accepted costs.**

- **The order is charter-only, not CI-blocked.** A persona — or a human editing files directly — could write a story before design is approved, and only review would catch it. Stated plainly rather than pretended, the same way the "no persona may merge" limit is a charter rule, not a tool lock.
- **Three PRs where there was one.** More review touchpoints for a small feature. Mitigation: the steps can each be fast, and a feature with no UI simply has no step 2.
- **A screen now has two ways to be legitimate.** Reviewers (and future validator work) must not read an empty `stories[]` during the design phase as a bug — it is expected until step 3. The manifest `$comment` and the design README both say so.
- **Scope of this ADR is the reorder and the `SCR → REQ` edge only.** The architect's notes also propose two-phase (structural then themed) design sign-off, DB/architecture as parallel Inception work, a delivery-planning stage, and Playwright-by-QA. None of those is decided here; each remains an open decision in the source input file.
