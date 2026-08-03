# AI-DLC — AI-Driven Development Lifecycle

A delivery framework where seven role-persona AI juniors (BA, UX, Architect, DEV, QA, DevOps, Manager) assist their human counterparts through **three CI-enforced gates** (Discovery → Delivery → Release). Approvals are authenticated GitHub PR reviews — never chat text; traceability (`REQ → US → AC → tests`) is validated on every PR by a policy-as-code check. Unlike instruction-only systems (spec-kit, AWS aidlc-workflows), it **enforces outcomes** — see the [full comparison](docs/aidlc-vs-spec-kit.md).

## Use it in your repo

In Claude Code:

```
/plugin marketplace add ss-trigent/aidlc
/plugin install aidlc@trigent-aidlc
```

Then, in the repository you want to run AI-DLC in:

```
/aidlc-init        # one-time scaffold + an interview that tailors standards to your stack
/aidlc             # start working — routes you to your persona
```

Full walkthrough — prerequisites, the init interview, CI wiring, ownership, upgrades: **[docs/adopting-aidlc.md](docs/adopting-aidlc.md)**.

## What's in this repo

| Path                                  | What                                                                | Status                                                 |
| ------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------ |
| `ai/`                                 | The framework itself: methodology, persona charters, gates, quality bars, templates, reference standards | **source of truth** (hash-locked via `ai/framework-lock.json`) |
| `.claude/skills/` + `.claude/agents/` | Persona surface sources (skills + delegatable agents)               | **source of truth**                                     |
| `tools/aidlc-*.mjs`                   | The CI validator, plugin/surface builders, Jira sync                | **source of truth**                                     |
| `packages/aidlc-plugin/`              | The Claude Code plugin (skills + bundled framework payload)         | **generated** — `node tools/aidlc-build-plugin.mjs`     |
| `.cursor/` `.opencode/` `.github/` persona files | Cursor / opencode / GitHub Copilot surfaces ([ADR-005](knowledge/decisions/ADR-005-multi-tool-persona-surfaces.md)) | **generated** — `node tools/aidlc-build-surfaces.mjs`   |
| `.claude-plugin/marketplace.json`     | The plugin marketplace this repo hosts                              | hand-maintained                                         |
| `docs/`, `knowledge/decisions/`       | Adoption guide, spec-kit comparison, framework ADRs                 | hand-maintained                                         |

## Maintaining the framework

- Edit sources (`ai/`, `.claude/`, `tools/`), then rebuild both generated trees: `npm run build:plugin` and `npm run build:surfaces`. CI (`node tools/aidlc-check.mjs`) fails on drift — never hand-edit generated files.
- Intentional changes to framework-owned files require regenerating the lock: `node tools/aidlc-check.mjs --lock` (maintainers only, deliberately excluded from `--write`).
- Adopting teams own only what `/aidlc-init` tailors for them (`ai/standards/`, `ai/project-context.md`, `ai/templates/jira/`, their manifest and CI wiring); everything else is verified against the shipped lock in *their* CI too. Their change proposals arrive here as [`change-request` issues](https://github.com/ss-trigent/aidlc/issues) — that contract is what keeps every adopter on one framework instead of divergent forks.

## Provenance

Extracted 2026-08-03 from [`ss-trigent/logistics-shortest-route-poc`](https://github.com/ss-trigent/logistics-shortest-route-poc), the reference project the framework was built and first proven in. That repo retains the full development history; this repo starts fresh as the framework's canonical home. The reference standards in `ai/standards/` still reflect that project's stack (Nx + NestJS + Angular + TypeORM) by design — they are seeds for form, rewritten per-stack by the `/aidlc-init` interview.
