# Gate 2 — Delivery

**Question:** does this story provably work?
**Personas:** [DEV](../roles/dev.md) implements, [QA](../roles/qa.md) derives tests from requirements, [Architect](../roles/architect.md) advises (design note when risky, advisory review always)
**Approver:** a human, via GitHub PR review on the story PR
**Cadence:** one PR per story — `feat/US-###-<slug>`

## Flow

```
Approved story (Gate 1 baseline)
→ DEV persona tiers the task (ai/context/task-classification.md) and presents
   TASK CLASSIFICATION + PLANNED CHANGES — the human approves before any code
→ [Complex tier, or a design with real trade-offs] Architect persona drafts the design
   note / ADR-### into the same PR, before implementation
→ DEV persona implements; QA persona derives tests FROM THE STORY (before reading the diff):
   positive per AC, then negative, then boundary — test names cite US-###/AC-##
→ Architect persona reviews the diff (advisory: findings rated, verdict suggested)
→ PR description: AC→evidence table, real command output, QA notes; manifest.json updated
→ Human reviews + merges in GitHub. Merged = delivered.
```

Everything for the story rides **one PR**: code, tests, ADR if any, manifest update. No separate architecture PR, no post-merge test PR.

## Gate checks

| Check                                                                                                 | Enforced by                                                    |
| ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Lint, typecheck, build, tests green                                                                   | CI (required statuses)                                         |
| Every AC in the manifest has a passing test citing `US-###/AC-##` in an active test title             | `aidlc-check`                                                  |
| A story PR with no AC-citing tests at all fails — delivery is derived from the `feat/US-###-*` branch | `aidlc-check`                                                  |
| Those tests actually assert the criterion (a citation alone is not proof)                             | Architect persona review + human review                        |
| IDs/links valid, manifest consistent (incl. NFR nodes), plugin payload undrifted                      | `aidlc-check`                                                  |
| A Complex-tier change (contract, schema, or trust boundary) carries a design note written _before_ the code | Architect persona review + human review — tiers in [`context/task-classification.md`](../context/task-classification.md) |
| Design fits, no security holes, code quality                                                          | Architect persona review (advisory) + human review (authority) |
| Approval identity                                                                                     | GitHub review, protected `main`                                |

## Solo policy (the only one)

When one human wears author and reviewer hats: the Architect persona's review becomes **blocking by convention** — its `blocker`/`major` findings must be resolved or explicitly rebutted in the PR thread before self-merge. The self-merge itself is honest and visible: GitHub records who merged. No logged exceptions, no pretend second human. With two+ humans, whoever didn't author reviews — role titles irrelevant.

## Defects

Wrong behavior, found by anyone → **GitHub issue labeled `bug`**: reproduction steps, expected (citing `US-###/AC-##`), actual (real output). No reproduction, no bug — it stays a question for the reporter.

- Fix PRs (`fix/<issue#>-<slug>`) **must add a regression test citing the issue** (`(#12)` in the test name) — reviewer rejects otherwise.
- If investigation shows the _requirement_ is wrong → relabel `change-request`, route to Gate 1.
- Severity is the human QA's call, on the issue. Critical = outranks in-flight stories.
