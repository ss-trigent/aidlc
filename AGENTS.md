# AI-DLC framework repo — agent instructions

This is the **framework's source repo**, not an adopting project: there is no product scope here, and the personas you may know from adopting repos (BA, DEV, …) are the *artifact* of this repo, not its workflow.

## Sources of truth vs generated

- **Sources:** `ai/` (methodology, charters, gates, templates, standards), `.claude/skills/` + `.claude/agents/` (persona surfaces), `tools/aidlc-*.mjs`, `.claude-plugin/marketplace.json`, `packages/aidlc-plugin/{README.md,package.json,.claude-plugin/plugin.json}`
- **Generated — never hand-edit:** `packages/aidlc-plugin/{skills,framework,seed}/` (rebuild: `node tools/aidlc-build-plugin.mjs`) and the persona files under `.cursor/`, `.opencode/`, `.github/{agents,prompts,skills}` (rebuild: `node tools/aidlc-build-surfaces.mjs`)

## Rules

- After changing any source, rebuild **both** generated trees, then run `node tools/aidlc-check.mjs` — it must exit green before any PR (drift, lock integrity, and ID checks are CI-blocking)
- Framework-owned files are hash-locked in `ai/framework-lock.json`. An intentional framework change regenerates the lock via `node tools/aidlc-check.mjs --lock` in the same PR — maintainers only
- One rule is load-bearing and never reworded: the branch pattern `feat/US-###-<slug>` in `ai/standards/git-standards.md` (adopting repos' delivery detection depends on it)
- Change proposals from adopting teams arrive as `change-request` issues; bugs as `bug` issues whose fix PR carries a regression test
- Never commit or push without explicit instruction
