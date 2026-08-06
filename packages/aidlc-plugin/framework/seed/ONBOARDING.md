# Onboarding

About 15 minutes, whatever your role. This repository runs **AI-DLC**: you work
with an AI persona for your role, and every approval is a GitHub pull-request
review — never chat text.

## 1. The shortest possible version

Work moves through three gates. Each one asks a single question, and a human
answers it by approving a PR:

| Gate            | Question                        | Who drafts                  |
| --------------- | ------------------------------- | ---------------------------- |
| **1 Discovery** | Are we building the right thing? | BA, UX, Architect            |
| **2 Delivery**  | Does this story provably work?   | DEV, QA, Architect           |
| **3 Release**   | Can we ship it safely?           | DevOps                       |

Nothing is "approved" because an AI said so. Approval is your click in GitHub,
recorded against your identity, on a branch that CI has already checked.

## 2. Start your persona

In your editor, type the command for your role:

```
/aidlc        not sure? start here — it works out who you are and routes you
/ba           requirements, stories, change requests
/ux           screens, states, the design system
/architect    system + DB design, ADRs, PR review
/dev          implement one story as one PR
/qa           tests derived from requirements, bug reports
/devops       CI, releases, rollback
/manager      status, routing, delivery plans
```

Works in Claude Code, Cursor, opencode and GitHub Copilot — the personas are
pinned in this repository, so cloning it is your whole setup.

The persona interviews you in plain language. You do **not** need to know the
framework, the file layout, or git to use it. If one starts talking in paths and
IDs, tell it to explain in plain words — that is in its charter.

## 3. What to expect the first time you build something

Before writing code, the DEV persona classifies the task and shows you a plan —
what it will change, what it verified by reading the code, and what it still
needs to ask. It stops there until you reply `go`. That pause is the point: a
wrong assumption is cheap to catch in a plan and expensive to catch in a diff.

## 4. Where things live

| Folder                    | What                                                       |
| ------------------------- | ------------------------------------------------------------ |
| `ai/`                     | The framework: role charters, gates, standards, templates   |
| `inception/product/`      | Requirements (`REQ-###`)                                     |
| `inception/stories/`      | Stories (`US-###`) and their numbered acceptance criteria    |
| `inception/design/`       | Screen specs, design tokens, component previews             |
| `inception/architecture/` | DB design + app architecture                                |
| `knowledge/`              | Traceability manifest and architecture decisions (`ADR-###`) |

## 5. The one rule worth memorising

If something is unclear, the persona asks — it does not guess. Hold it to that.
A confident wrong answer costs more than a question.

---

**This file is yours.** Replace this section with what a new joiner on *your*
project needs: the domain in a paragraph, how to run things locally, who to ask.
Run `/aidlc` and say "help me write the project part of ONBOARDING.md".
