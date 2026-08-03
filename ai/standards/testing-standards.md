# Testing standards

## Levels & placement

| Level                         | Tool                                         | Where                        |
| ----------------------------- | -------------------------------------------- | ---------------------------- |
| Unit                          | Vitest                                       | `*.spec.ts` next to the unit |
| Integration (API modules, DB) | Vitest + Nest testing module                 | `apps/api/**/*.spec.ts`      |
| API contract                  | Vitest (supertest-style) against running app | `apps/api`                   |
| UI component                  | Vitest (vitest-angular)                      | `apps/ui/**/*.spec.ts`       |
| Accessibility                 | story a11y notes + review checklist §5       | asserted in component tests  |
| Performance                   | budget asserts citing the NFR (`NFR-###`)    | `*.spec.ts` next to the code |

Run via Nx only: `npm run test`, `npm run affected:test`.

## Rules

- Test the **requirement**: every TC cites `US-### / AC-##`; tests assert observable behavior, not implementation internals
- Per story: positive cases from AC, then negative, then boundary — all three classes or a written justification
- Deterministic tests only — no sleeps/real network/wall-clock deps; use fakes and fixed seeds
- Test names read as specs: `describe('RoutingService') → it('rejects shipment when no feasible route exists (US-003/AC-04)')`
- A red test is a finding: never deleted, skipped, or loosened to pass. Fix code or (with BA/human approval) fix the requirement
- Coverage: every AC ≥1 TC before a story is _done_; graph-engine algorithms additionally cover the documented edge cases
- **The AC citation is a label, not the proof.** `aidlc-check` can only confirm an active test named `US-###/AC-##` exists and passes — an empty body would satisfy it. The proof is the assertion, so write the test first and watch it fail; a reviewer who can't see which assertion maps to the AC treats that as a finding

## Bug reports

Reproducible or it doesn't exist: steps, expected (AC ref), actual, environment, severity. Filed to DEV; regression TC added on fix.
