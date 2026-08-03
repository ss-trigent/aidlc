# AI-DLC framework repo

Read [AGENTS.md](AGENTS.md) before working here — it defines which files are sources of truth vs generated, the rebuild commands (`aidlc-build-plugin.mjs`, `aidlc-build-surfaces.mjs`), and the lock/check rules. In short: edit sources only, rebuild both generated trees, `node tools/aidlc-check.mjs` must be green before any PR, and never commit or push without explicit instruction.
