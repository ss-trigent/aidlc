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
3. **`tokens.css` is now seeded as structure, not taste**: the framework scales (spacing `--s-2…80`, type + line heights, radius, elevation, control heights) plus a deliberately greyscale palette; `/ux` authors product colour in 2b. Primitives are `--p-*` and referenced only inside `tokens.css` — a preview referencing one is a CI error (the semantic-layer rule). Text-on-surface token pairs below WCAG AA 4.5:1 warn, per theme.
4. **Frame-side conventions are seeded** as `inception/design/wireframe-rules.md`: frame naming `WF|HF / SCR-### · name / ST-## state`, grid (12/8/4 columns), spacing application, greyscale wireframes, FILL/HUG/FIXED layout discipline, per-frame checklist. Documented, not tool-enforced — written to double as prompt material for a frame-generating agent.

## Declined, on the record

- **Strict component tiers and full variant matrices** (Repo A: 4 tiers, 96 Button variants): contradicts "a component earns its file when a screen needs it" — demand-driven stays. The variant *naming* convention survives as a line in `wireframe-rules.md`.
- **A standalone UX brief** (Repo A's one-page digest of problem/user/principles/scope): every line of it already lives in the BRD, `principles.md`, or the 2a walkthrough — a fourth copy is a drift generator, not an artifact.
- **A lo-fi fidelity stage as a gate artifact**: fidelity of frames is not repo-checkable; the greyscale token palette gives wireframes their greyscale without a stage.
- **Figma page order / status tracker as framework artifacts**: status derives from GitHub (ADR-001); page order ships as a suggestion inside `wireframe-rules.md` only.
- **A pre-component token gate** (Repo A's Gate 2: tokens signed off before any component starts): 2b stays one pass — tokens and previews refined and approved together. Two approval moments inside one styling pass is process the current team size does not need; revisit if styling churn (approved previews invalidated by later token changes) is actually observed.
- **Engineering feasibility sign-off on the design PR**: parked, not declined — it is cross-persona (an engineering human on the 2a review, a CODEOWNERS/branch-protection setting, no framework code) and out of this ADR's UX-track scope. The Architect's parallel advisory deliverable remains the feasibility signal for now.
- **Figma MCP write loop** (generate frames from specs, review in tool, re-prompt): *deferred, not declined* — the boundary in `ai/integrations.md` bars write-capable MCP from gate artifacts, and frames are not gate artifacts, so a scoped exception in the shape of ADR-006's Playwright precedent is open. It needs its own ADR once the team names the server (Figma's REST API cannot create frames; a plugin-bridge is required).

## Alternatives considered

- **Adopt Repo A's ten phases as gates** — ten approval moments and chat-confirmed gates against three PR-merged ones; rejected for the same reasons as in ADR-001.
- **Make the research pass CI-required** — a required document nobody has data for becomes a generated lie; advisory + labels keeps the honesty incentive.
- **Keep tokens unseeded** — rejected: every adopting repo re-invented (or skipped) the same scales, and the contrast/primitive checks need names to hold onto.

## Consequences

- The gap report's "19 gaps with no decision" goes to zero: each area now has either an artifact, a check, or this record.
- `aidlc-check` gains three design rules (reachability, primitive references, contrast); existing repos with hand-rolled token names are unaffected unless they adopt the `--p-*` convention (the contrast heuristic may warn — it is a warning by design).
- Scaffold output grows by two files (`tokens.css`, `wireframe-rules.md`); `/aidlc-init --update` lands them in existing adopters as ordinary reviewable seeds.
