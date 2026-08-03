# ADR-001 — Framework structure: lifecycle folders, three enforced gates, Anthropic-only toolchain

|             |                                                                                                                                                                                                       |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**  | accepted — architect reviewed and approved, recorded 2026-08-03 (banked by the PR that merges this file; GitHub review is the authoritative record)                                                   |
| **Date**    | 2026-07-29; amended 2026-07-30 (folder layout adopted; earlier Nx objection withdrawn); amended 2026-07-31 (`/ux` split out of `/ba`, 6→7 personas; design phase inverted to a tool-agnostic handoff) |
| **Decider** | Solution Architect + repo admin (drafted by Architect persona)                                                                                                                                        |
| **Serves**  | framework-wide (no single story)                                                                                                                                                                      |
| **Sources** | _AI-DLC Enterprise Framework v1.0_ (Trigent, 18 pp.); architect's platform structure (ChatGPT session, 2026-07-21)                                                                                    |

## Context

The source methodology defines **10 sequential phases** (Requirement Gathering → Wireframe → Figma → User Story → Architecture → Implementation → Code Review → Testing → GitHub → CI/CD), **11 AI roles**, **9 quality-gate items**, a **discipline-folder repository layout**, and a traceability chain from requirement to deployment. The architect's follow-up structure adds top-level `inception/` `construction/` `operations/` folders, a cross-cutting root `knowledge/` graph directory, ~18 agents, a LangGraph orchestrator, Neo4j, Jira, and Azure DevOps.

This repository implemented the 10-phase model faithfully in commit `325f389`. An independent critical review then found it was **compliance theater**: approvals were editable text in document headers, a single story required ~5 PRs, and no rule was mechanically checked. Commit `d9c1ae1` rebuilt it to three CI-enforced gates. That rebuild diverged from the source document on the folder and phase axes, and the rationale was never recorded — this ADR is that record.

Two constraints now fix the toolchain:

1. **Anthropic models only** (stakeholder decision, 2026-07-29). The source recommends a per-stage mix — OpenAI Codex, Cursor, ChatGPT, Figma AI, GPT-5.5, Ollama — which is out of scope.
2. **This is a POC** on a private GitHub Free repo, where branch protection is unavailable (403; needs Pro or a public repo).

## Decision

**We will define the source methodology's stages by what is enforced and when (gates), and run the framework entirely on Anthropic models via Claude Code.**

**Scope note.** Enforcement/toolchain and physical layout are independent questions; the source document is a general reference architecture, not a spec for one Nx workspace. The layout decision — **the lifecycle grouping is adopted for artifacts** — is recorded separately under [Folder layout](#folder-layout--adopted), together with the withdrawal of an earlier draft's incorrect Nx-based objection.

Concretely:

1. **Ten phases become three enforced gates.** Every phase survives as a step inside a gate; none is deleted except Figma (below). What changes is that a gate boundary is a _mechanically checked, human-approved PR merge_, where a phase boundary was a document header someone typed.

   | Source phase            | Lives in                                                                                                       |
   | ----------------------- | -------------------------------------------------------------------------------------------------------------- |
   | 1 Requirement Gathering | Gate 1 — BRD with `REQ/NFR/RISK` IDs, preceded by a grill pass                                                 |
   | 2 Wireframe Generation  | Gate 1 — `SCR-###` screen spec with numbered `ST-##` states; the wireframe itself stays in the designer's tool |
   | 3 Figma Design          | Gate 1 — **inverted**: the repo holds tokens + specs, any design tool consumes them; see below                 |
   | 4 User Story Generation | Gate 1 — `US-###` with numbered Given/When/Then `AC-##`                                                        |
   | 5 Architecture          | Gate 2 — ADR only where trade-offs are real; OpenAPI + migrations carry the rest as executable contracts       |
   | 6 Implementation        | Gate 2 — DEV persona, test-first per AC                                                                        |
   | 7 Code Review           | Gate 2 — Architect persona advisory review; human review is the authority                                      |
   | 8 Testing               | Gate 2 — tests ride the story PR, named `US-###/AC-##`                                                         |
   | 9 GitHub Integration    | Gate 2 — the story PR _is_ the mechanism, not a phase after it                                                 |
   | 10 CI/CD                | Gate 3 — `.github/workflows/ci.yml` + human-approved promotions                                                |

   We deliberately **invert phases 7 and 8**: the source reviews code and then generates tests. We write the failing AC-citing test first, so a test that passes has failed at least once. Tests generated after a green implementation tend to assert what the code does, not what the requirement demands.

2. **Eleven roles become seven personas**, one per real human counterpart, because a persona with no human to report to has no one to approve its work.

   | Source roles                                  | Persona                                             |
   | --------------------------------------------- | --------------------------------------------------- |
   | Product Owner, Business Analyst, Scrum Master | `/ba`                                               |
   | UX Designer, UI Designer                      | `/ux`                                               |
   | Architect, Principal Engineer (review)        | `/architect`                                        |
   | Senior Developer                              | `/dev`                                              |
   | Senior QA                                     | `/qa`                                               |
   | DevOps Engineer                               | `/devops`                                           |
   | Technical Writer                              | folded in — docs ride the PR that changes behaviour |
   | _(not in source)_                             | `/manager` — reporting only, no gate authority      |

   **Amended 2026-07-31: `/ux` split out of `/ba`.** The original mapping folded the two designer roles into `/ba` on the grounds that a POC had no designer to report to. Two things changed. First, design became an _enforced_ Gate 1 artifact rather than an inline sketch, so `/ba` was carrying two crafts with different review criteria — a PO reviewing requirement testability is not reviewing state coverage or focus order. Second, the counterpart exists: the human designer, who approves screen specs the same way the PO approves a BRD. The split follows the rule the mapping was built on rather than departing from it. Cost: one more charter/skill/agent triple to keep in sync, which `aidlc-check` proves rather than trusting.

3. **Traceability is one validated JSON graph, not seven sub-directories.** `knowledge/traceability/manifest.json` holds `REQ ↔ US ↔ AC ↔ tests`, plus `decisions` (US→ADR) and `lessons` edges. `tools/aidlc-check.mjs` proves on every PR that every link resolves bidirectionally, that no ID is duplicated, and that every AC is cited in the title of an active passing test. `traceability-matrix.md` is generated from it and never hand-edited.

4. **The toolchain is Anthropic-only.**

   | Source recommends                                      | We use                                                 |
   | ------------------------------------------------------ | ------------------------------------------------------ |
   | Codex / Cursor / ChatGPT / Figma AI / Ollama / GPT-5.5 | Claude Code (Anthropic models) for every stage         |
   | LangGraph or AutoGen orchestrator                      | Claude Code skills + subagents; `/aidlc` is the router |
   | Neo4j / Cosmos Gremlin knowledge graph                 | `manifest.json`, validated in CI                       |
   | Jira                                                   | GitHub issues (`change-request`, `bug` labels)         |
   | Azure DevOps                                           | GitHub Actions                                         |

   No orchestrator service, no graph database, no second vendor. The orchestration the source asks for is the skill router plus the gates; the state it would hold lives in GitHub and one JSON file.

5. **Status is never a file.** The source's "every phase is version controlled" is honoured for _artifacts_; for _state_ we derive from GitHub (PRs, issues, checks). `ai/memory/` and all status documents were deleted, and re-adding them is a regression.

## Alternatives considered

| Option                                                                                                                                  | Pros                                                      | Cons                                                                                                                                                                                          | Why rejected                                                                                                  |
| --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Keep 10 phases, add CI enforcement to each                                                                                              | Honours the source exactly; each phase gets a check       | 10 approval moments per feature for a 3-person POC; most phases have nothing mechanically checkable (a wireframe has no assertion)                                                            | Enforcement is only credible where a check can exist; the other 7 gates would have stayed theatre             |
| Root `knowledge/` with all 7 subdirectories (requirements-, design-, code-, dependency-graph, traceability, decisions, lessons-learned) | Matches the architect's enhancement in full; room to grow | 5 of the 7 would be empty or duplicate tooling we already have — `code-graph`/`dependency-graph` are the Nx project graph, computed and always current; hand-maintained copies drift silently | Adopted the two that carry information (`decisions`, `lessons`) as manifest edges; declined empty scaffolding |
| Neo4j for the knowledge graph                                                                                                           | Real graph queries; scales past one file                  | A service to run, secure, back up, and keep in sync; nothing in CI could validate it; a POC has ~14 requirements                                                                              | JSON is diffable, reviewable in the PR, and CI-validated — the properties that make traceability trustworthy  |
| Multi-model per stage (Codex for code, Claude for architecture, …)                                                                      | Best-of-breed per task                                    | Contradicts the Anthropic-only decision; multiplies vendor, billing, and prompt-injection surface; no single audit trail                                                                      | Ruled out by stakeholder decision                                                                             |

## Folder layout — adopted

The source document specifies `inception/ construction/ operations/` as the top-level grouping. **We adopt it for artifacts, in this repo and in the distributable plugin.** An earlier draft of this ADR rejected it on the grounds that relocating folders would break the Nx build. That reasoning was wrong and is withdrawn: the artifact folders had **zero** build coupling — `product/`, `stories/`, `architecture/`, `testing/traceability/` appeared in no `nx.json`, no `tsconfig.base.json`, and no `project.json`. The objection conflated this repo's product-code layout with the framework's artifact layout, and the source document is a general reference architecture, not a spec for one Nx workspace.

**What moved:**

| Before                    | After                     |
| ------------------------- | ------------------------- |
| `product/`                | `inception/product/`      |
| `stories/`                | `inception/stories/`      |
| `architecture/decisions/` | `knowledge/decisions/`    |
| `testing/traceability/`   | `knowledge/traceability/` |

**What did not move, and why:**

- **`apps/` and `libs/` stay at the repository root.** They carry the Nx project graph and 3 tsconfig path aliases. Relocating them is configuration churn rather than breakage, but a framework should govern _artifact_ layout and leave source layout to the adopting project — a Maven, Gradle, or Cargo project would place Construction differently and the framework must not care.
- **`ai/` stays at the root** — the source's own "Shared AI Layer", stage-neutral by design.
- **`knowledge/` is at the root, not under a stage.** This follows the architect's explicit enhancement and it resolves the strongest argument against the grouping: traceability and decisions are referenced from all three stages, so filing them under one would misrepresent their lifetime. An ADR in particular is _authored_ during Delivery when a trade-off surfaces, even though the source files `architecture/` under Inception.
- **`construction/` and `operations/` are not scaffolded empty.** Construction is `apps/`/`libs/`; `operations/` is created when the first release artifact lands. Empty directories carry no information and a previous cleanup pass removed exactly that kind of placeholder taxonomy.

**The residual disagreement, stated honestly for the record.** A user story is authored in Inception, but its AC are the contract Construction tests against and the reference Operations traces incidents back to. `inception/stories/user-stories/US-002.md` slightly implies the story stops mattering after Inception, when it is the most-referenced artifact in Gate 2. We accept that imprecision because the grouping's legibility is worth more than the edge case, and because `knowledge/` already carries the genuinely cross-stage artifacts. Separately: the source's stated motive for the grouping is phase-scoped context loading to cut tokens — here that benefit already comes from following manifest ID links and the per-gate context chains, so the grouping is adopted for clarity rather than for the token saving.

## Consequences

**Easier.** One approval mechanism (GitHub review: authenticated identity + reviewed commit SHA) instead of editable headers. One required CI status makes traceability non-optional. Three gates fit a small team. One vendor, one audit trail. `/aidlc-init` installs the whole framework into another repo in minutes.

**Harder / accepted costs.**

- **Folder layout does not currently signal lifecycle stage** — a reader consults `ai/AI-DLC.md`'s mapping table instead. Whether that stays true is the open question above, not a consequence of this decision.
- **The design phase is inverted, not deleted** (amended 2026-07-31). Rather than replacing one design tool with another, the repository became _upstream_ of whichever tool the designer uses. `inception/design/` holds `SCR-###` screen specs with numbered `ST-##` states, canonical `tokens.css`, and a generated `tokens.json` in **W3C DTCG** format; the designer imports that token set into Figma (Tokens Studio), Penpot or anything else, and draws one frame per state. Frames are not checked in. The reason is enforceability rather than preference: a frame is a URL that `aidlc-check` cannot validate, so phases 2–3 could only ever be convention — the source specification did not achieve enforcement there either. Specs and tokens _can_ be validated, so a UI story citing no screen, a state nothing renders, or a component that does not exist now fails CI. Because `tokens.json` is generated from `tokens.css` with drift failing the build, the palette a designer draws with cannot diverge from the palette that ships — a guarantee a Figma-first workflow could not give.

  Remaining gap, narrower than before: this does not capture Figma's collaboration surface (comment threads, handoff annotations, visual version history). The collaboration a _gate_ depends on — which states exist, which conflicts are unresolved and who owns them — is now reviewable in files; the rest stays in the designer's tool, where it works well. No tool is mandated and none is declined, so a designer joining with an existing Figma practice costs nothing to accommodate.

- **The traceability chain stops at tests.** The source's chain continues Implementation → Deployment, and the architect's adds Monitoring → Incident → Improvement. We cover requirement → story → AC → test; there is no code edge and no deployment edge. Recommended follow-up, in priority order: (a) a `code` edge per story (cheap — the story PR's merge commit); (b) a `deployments` edge once an environment exists; (c) incidents already land as `lessons` entries, so that hop is half-built.
- **Four of the source's nine quality-gate items are not yet mechanically checked**: Security Scan (declared in Gate 3, no scanner wired), Accessibility Scan (asserted by hand in component specs, no axe run), Performance Check (NFR budget asserts not yet written), Documentation Update (review-checklist only). These are honestly labelled as human-review items in `ai/quality/quality-gates.md` rather than claimed as enforced.
- **Branch protection is unavailable on this plan**, so the required-status spine currently runs on convention. Until the repo is Pro or public, `aidlc-check` is visible but not blocking. **This is the single highest-value fix available** and it is an admin setting, not code.
- **Non-Anthropic tool configs remain in the tree** (`.cursor/`, `.gemini/`, `.opencode/`, `.codex/`, `opencode.json`). They are Nx-generated, carry no AI-DLC content, and are now inconsistent with decision 4 — follow-up issue to remove.
- **Integration positions are now recorded**, closing three items this ADR originally left silent: MCP servers are adopted for read-only context with an explicit no-gate-bypass boundary; durable agent memory is **declined** (state must be derived, not stored, or it becomes the status-file anti-pattern again); OpenTelemetry is **deferred** to the first real deployment. Full list with rationale in `ai/integrations.md`.
- **Personas gained a second surface.** Each is now a charter plus a skill (human-invoked) plus an agent (delegated to), with `aidlc-check` proving the three agree. The Architect and Manager agents are read-only by tooling, which makes "advisory" and "no gate authority" structural rather than aspirational.
