# AI context loading — cost guidance

**Honest classification (post-review): this is efficiency guidance, not governance.** Nothing can verify what a persona actually read; what the framework _enforces_ lives in CI and branch protection. Follow this to keep sessions fast, cheap, and focused — not because it's checked.

## The rule

1. Start from the task's artifact (a story, a BRD section, a PR, an issue)
2. Follow its ID links one hop upstream (story → its REQs) and to its gate's listed inputs
3. Load your charter (`ai/roles/`) + the gate doc (`ai/gates/`)
4. Load only the standards your task touches (coding for implementation, testing for tests, ...)
5. Load code only for the modules under change

## Example — implementing a story

```
US-### story → AC → inline UI sketch → covering ADR
→ coding standards → api/security standards → modules under change
```

Not `apps/`, not other features, not the full BRD.

## Anti-patterns

- "Let me read the whole repo first" — follow the chain instead
- Loading downstream artifacts to write upstream ones (implementation details don't belong in requirements)
- Re-litigating merged artifacts — approved is settled; changes go through a `change-request` issue and a new PR
