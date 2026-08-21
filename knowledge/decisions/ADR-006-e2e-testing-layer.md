# ADR-006 — Browser-level testing as an opt-in layer, with two storage topologies

|             |                                                                                                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Status**  | proposed — awaiting review                                                                                                                                               |
| **Date**    | 2026-08-18                                                                                                                                                               |
| **Decider** | repo admin (stakeholder instruction: QA must generate specs per story and Playwright tests from them; harness-agnostic; QA may or may not hold the product repo)          |
| **Serves**  | framework-wide (no single story)                                                                                                                                         |
| **Relates** | [ADR-001](ADR-001-framework-structure-and-toolchain.md) (scopes its Anthropic-only toolchain and adds the first hard external runtime dependency), [ADR-005](ADR-005-multi-tool-persona-surfaces.md) (the four-harness generation this reuses), [ADR-002](ADR-002-jira-tracking-flow.md) (the read direction added to its boundary) |

## Context

The framework proved acceptance criteria only with in-repo tests: check 4 reads active test titles for `US-###/AC-##`. It had no browser-level story at all — no plan artifact, no generation path, no statement about where e2e specs live. Meanwhile QA engineers were expected to work from stories they could reach, in a repository they may not hold.

Four facts shaped the decision:

1. **Playwright already ships the agentic loop.** `npx playwright init-agents` generates planner/generator/healer agents. Its loops are `vscode`, `claude` and `opencode`. **There is no Cursor loop**, and half the team uses Cursor. So the feature could be reused in spirit but not depended on.
2. **A plan is the reviewable artifact, not the test.** A generated Playwright test is hard to review against a criterion; numbered steps a human could execute by hand are not. The cheap moment to catch "this tests something adjacent to the criterion" is before the test exists.
3. **The requirement is the only honest input.** Playwright's own planner explores a running app to invent scenarios. Deriving scenarios from the app is deriving them from the implementation, the thing `ai/roles/qa.md` exists to prevent.
4. **Check 5 already assumed a layout.** It walked `apps/` and `libs/` for `*.spec.ts`, an Nx assumption in a framework-owned tool. Any other layout had its citations silently unvalidated, so "put the e2e tests in the Nx place" would have been a convention masquerading as a guarantee.

Two invariants were at stake:

- **`ai/integrations.md`'s "MCP servers — read-only context only".** Playwright MCP drives a browser: it writes to a running application. That position had to be scoped, not silently contradicted, and that file itself says adding a write-capable MCP server "is a decision that belongs in an ADR".
- **ADR-001's Anthropic-only toolchain and zero-hard-dependency posture.** Playwright is the first external runtime the framework tells a team to install.

## Decision

**Browser testing is an opt-in layer installed by `aidlc-scaffold --profile e2e`, in which a reviewed per-story plan precedes generation, placement is chosen rather than conventional, and cross-repo evidence is validated when published and required never.**

1. **Plan before test.** `<e2e-root>/plans/US-###.md` (`ai/templates/test-plan.md`) is written from the story's criteria and approved in its own PR before any test is generated. One plan per story, named after it — **no new ID series**, because the plan is 1:1 with its story and a second counter would only be a thing to keep in sync.
2. **Two topologies, same-repo default.** Same repo: the spec path goes in the story's `tests[]` and the criterion is proven by check 4 exactly like any other test, so Gate 2 still blocks. Separate QA repo: evidence travels as `knowledge/traceability/e2e-coverage.json`, opened as a PR into the product repo. Stories are always read from **GitHub** (`gh api`), never from a ticket.
3. **The cross-repo check is opportunistic and honest about its limit.** Absent file → silent: no warning, no config, no requirement, so a project that never adopts this is unaffected. Present → strict: every claimed criterion must exist in its story, a failing remote test is an error, and a pass must carry the run it came from. It **cannot** prove that a remote assertion ran, only the claim's form and the criterion's existence. `run_url` is mandatory for a pass precisely because that is all the product repo can see.
4. **Placement is a decision, not a convention.** `--root <dir>` chooses it (default `e2e/`), and from then on `testDir` in `playwright.config.ts` is the **only** record, no config key, nothing to drift. To make that safe, check 5 now finds test files with `git ls-files` over test globs instead of walking `apps/` and `libs/`.
5. **Harness-agnostic by construction.** The persona instructions live in `.claude/skills/qa/SKILL.md` and `.claude/agents/aidlc-qa.md` and reach Cursor, opencode and Copilot through the ADR-005 generator. The only external dependencies are Playwright MCP — configuration, written in the three shapes the harnesses actually disagree on — and `npx playwright test`. Playwright's own agent definitions are **not** vendored.
6. **Playwright MCP is a scoped exception to "read-only MCP".** It may drive a browser against a test environment, because a locator verified against the real DOM is the difference between a generated test and a guessed one. It may not act against production, and nothing it does approves, merges, deploys, or edits an approved artifact. The gate boundary is unchanged.
7. **No new persona.** `/qa` gains a mode. A `qa-e2e` role would need a charter, an agent, a generator entry and a routing slot to describe the same person.

## Alternatives considered

| Alternative                                                             | Why not                                                                                                                                                        |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Depend on `playwright init-agents --loop=…`                             | No Cursor loop, and half the team uses Cursor. Vendoring its prompts would mean maintaining a Claude-shaped copy of someone else's file                          |
| Use Playwright's planner agent to explore the app and invent scenarios  | Deriving tests from the running app is deriving them from the implementation — the exact failure `ai/roles/qa.md` exists to prevent                              |
| Separate-repo only (the stakeholder's first choice)                      | Cannot block a story PR, and forfeits machine-checked AC proof. Kept as a supported topology, not as the default                                                 |
| Same-repo only                                                          | Leaves a QA team with no product checkout unable to contribute traceable work at all                                                                             |
| A `TP-###` ID series for plans                                          | The plan is 1:1 with its story; a second identifier buys a counter and a check rule and nothing else                                                            |
| Make the cross-repo evidence file **required** once configured           | A required file the product repo cannot truly verify is governance theater. Opportunistic keeps the guarantee honest and adopting repos unaffected               |
| Have `aidlc-check` fetch the evidence from the QA repo's CI artifacts    | Puts a network call in the required status. A gate that fails when someone else's artifact host is down is a gate teams learn to re-run instead of read          |
| Record the e2e root in a config key                                     | `playwright.config.ts`'s `testDir` already records it. Two records of one fact is one opportunity to disagree                                                    |
| Put e2e specs at `apps/<app>-e2e/` and rely on check 5's existing walk   | That is the Nx assumption this ADR removes. It would have made the guarantee true only for Nx repos while reading as universal                                   |

## Consequences

**Accepted:**

- **The separate-repo topology cannot block a story PR.** Its evidence proves form, not assertion. Teams that need e2e to gate delivery use same-repo, and both the standards and the Definition of Done say so plainly rather than implying parity.
- **Playwright is the first hard external runtime dependency** the framework asks a team to install. It is confined to the opt-in layer: a project that never runs `--profile e2e` acquires nothing, and no gate depends on Playwright existing.
- **A write-capable MCP server is now sanctioned**, scoped to test environments and documented rather than tool-enforced. MCP availability is a client-side setting, and the framework says so rather than pretending otherwise.
- **A prose test-case document now exists**, which `ai/roles/qa.md` previously banned outright. The ban is rescoped to documents that re-record results a test already proves; the plan is a generation input and a review surface, and it is reviewed *before* the code it produces.

**Gained:**

- Check 5 became layout-agnostic, closing a pre-existing hole: specs outside `apps/` and `libs/` had their `US-###` citations silently unvalidated in every non-Nx adopting repo.
- The e2e layer installs identically for Claude Code, Cursor, opencode and Copilot users, with no per-harness instructions to maintain.

**Reversible:** the layer is additive. Deleting `<e2e-root>/`, the MCP configs and any `e2e-coverage.json` returns a repo to its previous behaviour, and check 15 goes quiet on its own. The one non-additive change is check 5's discovery, which is a strict improvement and stays.

**Deferred:** a QA repo posting a GitHub check run against the product SHA, so cross-repo e2e could block. It requires the deployed environment to *be* that SHA, which is a Gate 3 (Release) concern, and it is DevOps-configured when a team asks for it.
