---
name: aidlc-init
description: "Install the AI-DLC framework into the current repository: scaffold ai/ (personas, gates, templates, standards), the aidlc-check validator, repo-pinned persona surfaces for Claude Code / Cursor / opencode / GitHub Copilot, the traceability manifest, and CI wiring. USE WHEN user invokes /aidlc-init, asks to set up / install / initialize AI-DLC, or another aidlc persona reports the framework is missing."
---

# AI-DLC — install the framework into this repository

You scaffold the AI-DLC framework from this plugin's bundled payload. The payload root is `$CLAUDE_PLUGIN_ROOT/framework`. Guide the human in plain language; ask before overwriting anything.

## Steps

1. **Refuse-if-present check:** if `ai/AI-DLC.md` already exists, the framework is installed — offer an upgrade instead (diff `$CLAUDE_PLUGIN_ROOT/framework/ai` against `ai/`, walk the human through changes, and refresh the repo personas and surfaces per step 3). Never blind-overwrite.
2. **Copy the framework:** `cp -r "$CLAUDE_PLUGIN_ROOT/framework/ai" ./ai` and `mkdir -p tools && cp "$CLAUDE_PLUGIN_ROOT"/framework/tools/*.mjs tools/` — the validator, the Jira boundary it imports (check 12), and the persona-surface builder.
3. **Install the personas into the repository:** `mkdir -p .claude/skills .claude/agents`, then copy every persona skill except this scaffolder — `for d in "$CLAUDE_PLUGIN_ROOT"/skills/*/; do n=$(basename "$d"); [ "$n" = "aidlc-init" ] || cp -r "$d" ".claude/skills/$n"; done` — and the delegatable agents: `cp "$CLAUDE_PLUGIN_ROOT"/agents/*.md .claude/agents/`. Then generate the other editors' surfaces from them: `node tools/aidlc-build-surfaces.mjs`. This pins the personas to the repository so every teammate runs the same version whatever they edit with — Claude Code reads `.claude/`, Cursor `.cursor/`, opencode `.opencode/`, GitHub Copilot `.github/` — and `aidlc-check` enforces persona completeness (check 10) and cross-tool sync (check 13) from now on. Tell the human: teammates on Cursor/opencode/Copilot need nothing installed — cloning the repo is their whole setup. (Claude Code users may also see this plugin's own copies of the persona skills — identical content; the repo copies are canonical for this project.)
4. **Tailor the project-owned files.** The payload's `ai/standards/` comes from the reference project (Nx + NestJS + Angular + TypeORM) — it is a seed for **form**, not content, and shipping it unchanged into a different stack would misdirect every persona. So:
   1. Detect the stack yourself before asking anything: package manager, language(s), frameworks, test runner, DB layer, monorepo tool — read `package.json`/lockfiles/configs; never ask what the repo already answers.
   2. Interview the human in plain language, one question at a time: what the product is (a short paragraph in their words), whatever detection could not settle, and conventions the team already has (commit style, API style, review habits). Existing conventions win over the seed's — the framework governs gates, not taste.
   3. Rewrite each `ai/standards/*.md` for **this** stack, keeping the seeds' shape and rigor: same headings, same level of specificity — a standard vague enough to always pass is not a standard. One rule is load-bearing and stays verbatim in `git-standards.md`: the branch pattern `feat/US-###-<slug>`, which `aidlc-check` uses to derive what is in delivery.
   4. Write `ai/project-context.md` from the interview: what the product is and for whom, domain terms, the stack, how to build/test/run. Personas read it before working, so a wrong sentence here misleads all of them — read it back to the human before moving on.

   These files are **project-owned**: `ai/framework-lock.json` deliberately excludes `ai/standards/`, `ai/templates/jira/` and `ai/project-context.md`, and the team edits them freely from now on. Everything else under `ai/` is framework-owned and hash-verified by `aidlc-check` (check 14) — a local edit there fails CI; framework changes go upstream as a change-request.
5. **Seed traceability:** `mkdir -p knowledge/traceability`, copy `$CLAUDE_PLUGIN_ROOT/framework/seed/manifest.json` there, then run `node tools/aidlc-check.mjs --write` to generate the matrix view.
6. **Create artifact homes:** `mkdir -p inception/product/requirements inception/product/inputs inception/stories/epics inception/stories/user-stories inception/design/screens inception/design/components knowledge/decisions`. The design system itself is not seeded — tokens are grounded in the specific product, so `/ux` authors `inception/design/tokens.css` with the human on the first UI story, and `aidlc-check --write` then generates the `tokens.json` export their design tool imports.
7. **Wire CI:** show the human `$CLAUDE_PLUGIN_ROOT/framework/seed/ci-step.yml` and add the step to their workflow after dependency install. Explain that branch protection with this status as required is what makes the gates real — and that on private GitHub Free repos it needs Pro or a public repo.
8. **Point agents at it:** append the AI-DLC section to `AGENTS.md` (and `CLAUDE.md` if present): read `ai/AI-DLC.md` and `ai/project-context.md`, adopt a persona charter from `ai/roles/`, run `node tools/aidlc-check.mjs` before opening PRs, approvals are GitHub PR reviews.
9. **Verify:** `node tools/aidlc-check.mjs` must exit green (warnings about empty scope are expected on a fresh install).
10. **Hand off:** tell the human the gates in one sentence each and that the next step is `/ba` with their first customer need — and `/ux` once a story has UI. The personas now live in the repository (step 3), so they arrive with every clone; the plugin stays useful as the upgrade vehicle and for scaffolding the next repo.

## Never

- Overwrite existing framework files without an explicit yes per file
- Commit or push — leave the scaffold for the human (or their persona session) to review and land through a PR
