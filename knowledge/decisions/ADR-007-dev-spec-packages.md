# ADR-007 — DEV spec packages and a two-gate development cycle

|             |                                                                                          |
| ----------- | ---------------------------------------------------------------------------------------- |
| **Status**  | accepted                                                                                 |
| **Date**    | 2026-08-19                                                                               |
| **Decider** | repo admin (stakeholder instruction: development needs written specs like the ones their product repo already keeps, with the human gates in the development cycle reduced to two) |
| **Serves**  | Gate 2 (Delivery) — the development cycle only                                            |

## Context

The framework produced Discovery artifacts (BRD, screen specs, stories) and code, with nothing in between. A developer picking up `US-012` got acceptance criteria and an in-chat `TASK CLASSIFICATION` block that vanished when the session ended. Nothing recorded:

- what the story means technically — the story is deliberately business-level;
- what the change would touch, before it touched it;
- which technical decisions were taken and why — the Architect's ADRs cover architecture trade-offs, not per-story choices;
- where each requirement ended up in the code — `manifest.json` holds test paths, not code locations;
- what changed across revisions of the same feature.

An adopting team reported the gap in their own words: "development specs are not creating". They were not describing a bug. They were describing an absence, measured against a per-feature spec package their product repo already keeps, one whose workflow carries **seven** human gates. They wanted the package without the gates.

## Decision

We will keep a **per-story spec package** at `inception/specs/US-###-<slug>/`, owned by DEV, and reduce the development cycle to **two human gates**.

1. **The package.** `spec.md` (technical `FR-##`/`NFR-##` traced to the story's ACs), `implementation-plan.md`, `impact-analysis.md`, `decisions.md`, `traceability.md`, `change-log.md` — all DEV's — plus `test-cases.md`, QA's. Templates ship in `ai/templates/`. The folder name derives from the `feat/US-###-<slug>` branch, so nothing has to index it. IDs are folder-scoped (`FR-01`) and cited across files in the qualified form the framework already uses for ACs (`US-012/FR-01`).
2. **Ownership.** The Architect writes `inception/architecture/` once, before delivery starts, and an `ADR-###` when a real trade-off appears. Per-story decisions and impact are the developer's.
3. **Two gates.** **D1** — the human reads `implementation-plan.md` and `impact-analysis.md` and approves **in chat**; DEV stamps the approval into the plan (name and email from `git config`, date, and the SHA of the plan as read) and commits it. **D2** — the story PR, reviewed and merged in GitHub. Everything between is a persona obligation, not a human approval.
4. **The tier decides how much package.** Simple writes one row in `inception/specs/_change-log.md`; Medium updates an existing package; Complex writes all of it (`ai/context/task-classification.md` Step 5).
5. **Check 16.** A package that exists must be internally honest: every `FR`/`NFR` traced, every cited path real, every `US`/`AC` resolvable, a row in the index, and an approval block that is well-formed and matches the plan it approved. An **absent** package fails nothing. CI cannot know the tier.

## Alternatives considered

| Option | Pros | Cons | Why rejected |
| ------ | ---- | ---- | ------------ |
| Versioned spec filenames (`SPEC-ID-v1.0.md`, `-v1.1.md`) as the source repo keeps them | The file is the record; prior versions readable side by side | Git already holds every edit and `change-log.md` holds the curated history | Three copies of one history. The story ID is the identity; git is the archive |
| Generate `traceability.md` from `manifest.json` | One place to write, no drift between them | The manifest has no FR-level rows and no symbol locations — it records which test *files* prove an AC | Different grains. A generator would have to invent the data it was meant to derive |
| Make the Architect own `decisions.md` and `impact-analysis.md` | An architect sees every technical choice | Puts an architect in the path of every commit | The bottleneck this framework exists to avoid. The stakeholder was explicit: initial architecture is the Architect's, per-story work is the developer's |
| A per-folder `README.md` index | Mirrors the source repo's package exactly | `inception/specs/index.md` plus `spec.md`'s header table already carry story, status, and contents | A third place to update, and the first to go stale |
| Make D1 a GitHub PR review, like every other approval here | Authenticated identity, CI-enforceable | A PR round-trip before any code exists is the cost developers route around | D1 has to be cheap or it does not happen. The stamp recovers what can be recovered — see Consequences |
| Drop `manifest.json` updates now that a prose table exists | One table instead of two | Checks 2–4 parse the manifest; check 4 is the AC→test gate | It would disable the gate that makes acceptance criteria provable |
| Fold QA's e2e plan review into D1 to reach "two gates" everywhere | Literally two human touchpoints in total | ADR-006 put that review before test generation on purpose | The e2e plan belongs to the QA cycle. The two-gate rule scopes to development, and ADR-006 stands unamended |

## Consequences

**Easier.** A developer arrives at a story with the technical expansion, the blast radius, and the ordered plan already written and reviewed. A reviewer at D2 reads what was agreed instead of inferring it. A second developer touching the same feature finds the decisions rather than re-deriving them.

**Harder, and deliberately so.** Complex-tier work now writes five files before it writes code. The tier table is what keeps that proportionate: a one-file bugfix still produces one changelog row.

**The honest cost.** D1's approval is **attribution, not authentication**. A persona writes the stamp and `git config` is self-asserted, so the recorded name is forgeable. What *is* verifiable is the content: the approved SHA lets anyone run `git diff <sha> -- <plan>`, and check 16 fails a plan that changed after approval with no changelog row. `ai/gates/delivery.md` says this in those words rather than letting a name in a table imply more than it carries. A team needing authenticated plan approval requests a GitHub review on the same branch — the package is already committed there.

**Unchanged.** Discovery (Gate 1), Release (Gate 3), `manifest.json`'s schema, the `feat/US-###-<slug>` branch pattern, all seven persona commands, and ADR-006's e2e plan gate.

**Follow-up.** `ai/context/task-classification.md` is hash-locked, so every adopting repo sees that file change and the lock regenerate on update. `aidlc-scaffold.mjs --update` carries the new templates and seeds and skips team-owned files, so a repo mid-story stays green. Stories already in flight simply have no package, which check 16 permits.
