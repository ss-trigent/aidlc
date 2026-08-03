# Definition of Done (user story)

A `US-###` is **done** when its story PR is merged to `main`, which by construction means:

- [ ] Every `AC-##` has a passing test citing `US-###/AC-##` in its name (`aidlc-check` verifies against the manifest)
- [ ] Lint, typecheck, build, tests green in CI on the merged commit
- [ ] Architect persona findings at `blocker`/`major` resolved or rebutted in the PR thread
- [ ] Human review + merge in GitHub (solo policy: gates/delivery.md §Solo)
- [ ] `knowledge/traceability/manifest.json` row complete (REQ ↔ US ↔ tests); matrix view regenerated
- [ ] ADR added if the design had real trade-offs; docs updated where behavior/commands changed

No checklist theater: items 1, 2, and 5 are machine-checked; 3–4 are visible in the PR record. If it merged green through protected `main`, it's done — if it didn't, it isn't.
