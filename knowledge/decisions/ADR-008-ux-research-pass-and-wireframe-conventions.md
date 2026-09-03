# ADR-008 — UX research pass, flow edges, and wireframe conventions

|             |                                                                                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Status**  | proposed — awaiting designer + maintainer review on this PR                                                                                                  |
| **Date**    | 2026-08-31                                                                                                                                                   |
| **Decider** | repo admin, with the UX designer (gap report author)                                                                                                         |
| **Serves**  | Gate 1 (Discovery), UX track                                                                                                                                 |
| **Relates** | [ADR-001](ADR-001-framework-structure-and-toolchain.md) (design inversion this refines), [ADR-003](ADR-003-discovery-reorder-stories-last.md), [ADR-004](ADR-004-gate1-flow-extensions.md) (the 2a/2b split this extends) |
| **Source**  | UX design-track gap report (26 Aug 2026) comparing this framework against `jjoyjoshua/pilot-project/spec-driven-design`                                      |

## Context

A UX gap report compared this framework's design track against a 10-step spec-driven-design pipeline (Repo A) and found 21 gaps across 9 areas — its sharpest finding being that for 19 of them **no decision was ever recorded**. Verified against both repos:

- Our design track started at the screen. Nothing upstream of `SCR-###` existed: no research home, no IA, no design principles — a screen inventory fell 1:1 out of requirement rows.
- The traceability graph was rigorous vertically (REQ ↔ SCR ↔ US ↔ test) but had **no horizontal edges**: a screen no other screen leads to passed every check.
- No `tokens.css` was seeded at all ("tokens are grounded in the specific product" — true for colours, not for a spacing scale), so no spacing/type/radius scale, no breakpoints, and no numeric contrast target existed anywhere.
- ADR-001 inverted the *tool* (repo holds spec, tool holds pixels) but the inversion also dropped Repo A's tool-side *conventions* — frame naming above all, which our own one-frame-per-`ST-##` model depends on — without deciding to.

Repo A's five research phases degrade explicitly when no user data exists ("synthesise from requirements", `[PENDING]`): adopting them buys a **home for evidence and honesty about its absence**, not research itself.

## Decision

1. **2a opens with a research pass** (advisory, like the architecture): `inception/design/research/BRD-###-<slug>.md` (assumptions/risk, competitor scan, user research, personas `P-#`, `INSIGHT-##`, concept validation), durable `inception/design/ia.md` (sitemap, nav model, critical-path flows — the screen inventory is born here, not from requirement rows) and `inception/design/principles.md` (`PRIN-#`, each citing an `INSIGHT-##`). Templates: `ux-research.md`, `information-architecture.md`, `design-principles.md`. CI requires none of it; the designer reviews it in the 2a PR. Findings without real user data carry `[SYNTHESISED — validate with users]`; unrun validations carry `[PENDING]` — the walkthrough must say so out loud.
2. **Flow edges join the manifest**: `screens[].links_to[]` and `"entry": true`; screen specs record reached-from/leads-to. `aidlc-check` errors on a dangling edge and flags an unreachable screen (warning pre-delivery, error in delivery).
3. **`tokens.css` is now seeded as structure, not taste**: the framework scales (spacing `--s-2…80`, type + line heights, radius, elevation, control heights) plus a deliberately greyscale palette; `/ux` authors product colour in 2b. Primitives are `--p-*` and aliased only inside `tokens.css`; the design tool's library binds to semantic names (a convention, not a check — see decision 5). Text-on-surface token pairs below WCAG AA 4.5:1 warn, per theme.
4. **Frame-side conventions are seeded** as `inception/design/wireframe-rules.md`: frame naming `WF|HF / SCR-### · name / ST-## state`, grid (12/8/4 columns), spacing application, greyscale wireframes, FILL/HUG/FIXED layout discipline, per-frame checklist. Documented, not tool-enforced — written to double as prompt material for a frame-generating agent.
5. **HTML component previews are removed** (supersedes that part of ADR-001). The team designs in the tool; a repo-rendered HTML per component was a second place to draw every state, and nobody wanted to maintain it. A state is now "designed" when it is numbered in the spec, listed in the manifest, and drawn as its own frame in the tool. Consequence, recorded honestly: CI loses the render proof (`@state` markers, the raw-hex and primitive-reference rules on previews). What CI still proves: spec and manifest agree on states, every screen is reachable, tokens export cleanly, contrast holds. The `--p-*` primitive layer stays as a `tokens.css` convention without a check. 2b becomes tokens-only in the repo.
6. **Figma sync is a conditional final step of `/ux`.** When a Figma connector is present among the persona's tools and can create frames, and the human says yes, the persona pushes one greyscale frame per `ST-##` from the approved spec, named per `wireframe-rules.md`. One-way, repo → tool; frames are never the approved artifact. The scoped exception to "read-only MCP" is recorded in `ai/integrations.md`, in the shape of ADR-006's Playwright exception.

## Declined, on the record

- **Strict component tiers and full variant matrices** (Repo A: 4 tiers, 96 Button variants): contradicts "a component earns its file when a screen needs it" — demand-driven stays. The variant *naming* convention survives as a line in `wireframe-rules.md`.
- **A standalone UX brief** (Repo A's one-page digest of problem/user/principles/scope): every line of it already lives in the BRD, `principles.md`, or the 2a walkthrough — a fourth copy is a drift generator, not an artifact.
- **A lo-fi fidelity stage as a gate artifact**: fidelity of frames is not repo-checkable; the greyscale token palette gives wireframes their greyscale without a stage.
- **Figma page order / status tracker as framework artifacts**: status derives from GitHub (ADR-001); page order ships as a suggestion inside `wireframe-rules.md` only.
- **A pre-component token gate** (Repo A's Gate 2: tokens signed off before any component starts): 2b stays one pass — tokens refined and approved together with the styled frames in the tool. Two approval moments inside one styling pass is process the current team size does not need; revisit if styling churn (approved frames invalidated by later token changes) is actually observed.
- **Engineering feasibility sign-off on the design PR**: parked, not declined — it is cross-persona (an engineering human on the 2a review, a CODEOWNERS/branch-protection setting, no framework code) and out of this ADR's UX-track scope. The Architect's parallel advisory deliverable remains the feasibility signal for now.
- **An unconditional Figma dependency**: the sync in decision 6 exists only when a connector is present and can create frames (Figma's REST API cannot; a connector that only reads is reported, not used). A team with no connector gets the full handoff (`tokens.json` + spec) and loses nothing. Review findings in the tool change the spec first, then the persona syncs again — the tool never becomes upstream.

## Alternatives considered

- **Adopt Repo A's ten phases as gates** — ten approval moments and chat-confirmed gates against three PR-merged ones; rejected for the same reasons as in ADR-001.
- **Make the research pass CI-required** — a required document nobody has data for becomes a generated lie; advisory + labels keeps the honesty incentive.
- **Keep tokens unseeded** — rejected: every adopting repo re-invented (or skipped) the same scales, and the contrast check needs token names to hold onto.

## Consequences

- The gap report's "19 gaps with no decision" goes to zero: each area now has either an artifact, a check, or this record.
- `aidlc-check` gains two design rules (reachability, contrast) and loses the component-preview rules (existence, `@state` render, raw hex). An adopting repo that kept `inception/design/components/` has dead files, not a failing build; the contrast heuristic may warn on hand-rolled token names — it is a warning by design.
- The design-inversion paragraph of ADR-001 is amended: the repo still holds the spec and the tokens; it no longer holds a rendered proof of each state.
- Scaffold output grows by two files (`tokens.css`, `wireframe-rules.md`); `/aidlc-init --update` lands them in existing adopters as ordinary reviewable seeds.
- `tokens.json` now resolves `var()` aliases to concrete values and omits `--p-*` primitives, so the design tool binds only to semantic names. An existing adopter's `tokens.json` goes stale once and is regenerated with `aidlc-check --write`.
