# ADR-004 — Gate 1 flow extensions: two-phase design, architecture deliverable, delivery planning

|             |                                                                                                                                                                                                                                  |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**  | accepted — architect reviewed and approved 2026-07-31 (banked by the PR that merges this file; GitHub review is the authoritative record)                                                                                        |
| **Date**    | 2026-07-31                                                                                                                                                                                                                       |
| **Decider** | Solution Architect (reviewed and approved) + repo admin                                                                                                                                                                          |
| **Serves**  | Gate 1 (Discovery), framework-wide                                                                                                                                                                                               |
| **Relates** | [ADR-003](ADR-003-discovery-reorder-stories-last.md) (the reorder these extend), [ADR-001](ADR-001-framework-structure-and-toolchain.md) (persona/read-only model), [ADR-002](ADR-002-jira-tracking-flow.md) (Jira owns sprints) |
| **Source**  | [inception/product/inputs/2026-07-31-architect-discovery-and-dev-flow.md](../../inception/product/inputs/2026-07-31-architect-discovery-and-dev-flow.md)                                                                         |

## Context

[ADR-003](ADR-003-discovery-reorder-stories-last.md) reordered Gate 1 to requirements → design → stories. The same architect's discovery-flow notes carry three further extensions, decided together here because they are small, related, and came from one conversation:

1. **Design has two phases** — "generate design with styling and themes → loop until finalized by product team" — a styling pass distinct from the structural screen spec, signed off by the product team rather than the designer alone.
2. **DB design and app architecture** are prepared "in parallel." The architect confirmed this is an **Architect deliverable** (not dev work), that it must not block the pipeline, and that it depends only on requirements.
3. **Delivery planning** — "delivery plan, number of 2-week sprints → lock the plan and create shareable report" — has no owner in the framework today.

Each brushes against an existing invariant, which is what made them decisions rather than edits.

## Decision

### 1. Two-phase design, product-team sign-off

The design step (Gate 1 step 2) runs in two passes: **2a structure** — the `SCR-###` spec (layout, numbered `ST-##` states, components, conflicts), approved by the **designer**; then **2b styling** — refined `tokens.css` (both themes) and component previews that render the states styled, approved by the **product team**. The hi-fi frames stay in the design tool as before ([ADR-002](ADR-002-jira-tracking-flow.md)); 2b's repo artifact is the tokens + previews, not the frames. A styling change that forces a structural change reopens 2a. No validator change — tokens, previews, and states are already enforced; this is a review-sequence and an added approver.

### 2. Architecture as a read-only Architect deliverable (Path A)

The Architect produces a **DB design + app architecture** in `inception/architecture/`, once requirements are frozen, in its own reviewed PR. It **gates nothing** (no CI check requires it; no step waits on it) and **needs only requirements**.

Crucially, the Architect stays **read-only by construction** — its agent keeps `disallowedTools: Write, Edit, NotebookEdit` (invariant #6, check 10 unchanged). It **drafts** the design and a reviewed PR lands it, exactly as it already does for ADRs. We did **not** give the Architect write access (the rejected Path B), so no amendment to ADR-001's read-only model was needed.

This reverses, for Inception only, the Architect charter's "migrations and OpenAPI are the design, not prose." The reversal is a **lifecycle sequencing**, not a contradiction: before any code exists there are no migrations to point at, so the design is written as prose; once Construction produces the migrations and the OpenAPI document, **they** become the source of truth and the Inception folder is history — never a second copy kept in sync.

### 3. Delivery planning as advisory Manager work

The **Manager** proposes a delivery plan — rough estimates, a two-week-sprint grouping, risks, and a shareable report — from the merged requirements and stories. It is **advisory**: the human decides every number and **locks the plan in Jira**, which owns sprint/assignee/estimate per [ADR-002](ADR-002-jira-tracking-flow.md). The Manager stays **read-only and produces no repo artifact** — no checked-in status file, consistent with its charter. The shareable report is the same Jira/report surface the Manager already uses for status. We did **not** relax ADR-002's refusal list (the rejected alternative), so `aidlc-jira` still refuses to write sprints.

## Alternatives considered

| Option                                                              | Why rejected                                                                                                                               |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **2b:** hi-fi frames become repo artifacts                          | A frame is a URL CI cannot validate; already settled in ADR-002/ADR-003. 2b keeps frames in the tool                                       |
| **Architecture (Path B):** give the Architect write access          | Breaks the read-only-by-construction guarantee (invariant #6) and needs an ADR-001 amendment; Path A produces the same artifact without it |
| **Architecture:** make it a blocking Gate 1 deliverable             | The architect was explicit it must not block; a blocking arch doc also fights the "executable contracts carry design" stance               |
| **Architecture:** treat it as parallel `/dev` work                  | The architect corrected this — it is an Architect deliverable, not dev work                                                                |
| **Planning:** Manager writes the plan/sprints into the repo or Jira | Recreates the status-file anti-pattern (repo) or breaks ADR-002's refusal list (Jira). Advisory + human-locked avoids both                 |
| **Planning:** a new persona / new gate                              | Disproportionate — the Manager already reads GitHub and reports; planning is an advisory extension of that                                 |

## Consequences

**Easier.** The product team gets an explicit styling sign-off instead of design being one undifferentiated approval. The team gets a shared architectural shape to build against from day one. Someone finally owns "how long and in what order," with a client-shareable report.

**Harder / accepted costs.**

- **Three advisory outputs are guidance, not gates.** The architecture doc and the delivery plan can be skipped or ignored, and CI will not complain — by design. Their value rests on the personas producing them and humans using them, the same trust model as the reorder's charter-only ordering.
- **The Inception architecture doc can rot** if anyone treats it as a living contract. Mitigation: the README and the Architect charter both say it is superseded by migrations + OpenAPI in Construction; it is a starting shape, deliberately not maintained afterward.
- **A second design approver adds a review touchpoint.** For a small UI change, structure and styling can be one PR reviewed by both; the two-pass split is a rule about _what must be signed off_, not a mandate for two PRs.
- **Delivery estimates live only in Jira.** A team without Jira has the Manager's proposal in conversation and nowhere durable to lock it. Accepted: the framework must survive Jira's absence (ADR-002), and an estimate is exactly the kind of thing Jira owns.
