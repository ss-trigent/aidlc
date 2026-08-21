# SCR-### — <Screen name>

> Approval = Gate 1 review of this file's PR. A state is "designed" when a component preview renders it and marks it `<!-- @state SCR-###/ST-## -->`.

|                  |                                                      |
| ---------------- | ---------------------------------------------------- |
| **Serves**       | US-### (, US-###)                                    |
| **Traces to**    | REQ-###, NFR-###                                     |
| **Surface**      | `apps/ui` `features/<area>` — <route or entry point> |
| **Primary user** | <the actor from the BRD>                             |
| **Status**       | draft — awaiting designer review                     |

## Purpose

One or two sentences: what the user is trying to accomplish here, and what "done" looks like for them. If this cannot be written without inventing a business rule, stop and raise it with `/ba`.

## Layout

Structure in words — regions, hierarchy, what dominates. A rough ASCII block is welcome; a pixel-perfect one is not the job of this file.

```
┌─────────────────────────────────────┐
│ <region>                            │
├─────────────────────────────────────┤
│ <region>                            │
└─────────────────────────────────────┘
```

## States

Numbered like acceptance criteria, and for the same reason: an unnumbered state is a state someone forgets to build. Floor for any screen that loads data: default, loading, empty, error, plus every domain state the requirement implies.

### ST-01 <Name>

- **When** <the condition that puts the screen in this state>
- **Shows** <what the user sees>
- **Can do** <the actions available; "none" is a valid answer>

### ST-02 <Name>

- **When**
- **Shows**
- **Can do**

## Components

| Component | Preview                                           | Notes            |
| --------- | ------------------------------------------------- | ---------------- |
| `<name>`  | `inception/design/components/<name>/preview.html` | <states covered> |

Components are declared in `knowledge/traceability/manifest.json` under this screen; `aidlc-check` proves each preview file exists.

## Interaction and accessibility

- **Keyboard:** tab order, what is operable without a mouse, where focus goes after each action
- **Focus:** visible ring on every interactive element (`--focus-ring`)
- **Non-colour signalling:** every status carries an icon or label, never colour alone (NFR-003)
- **Announcements:** what a screen reader is told when state changes

## Structural decisions

Recorded so the human can interrogate them at review. "Why this way?" should have an answer in the file, not in someone's memory.

| Decision | Rationale | Alternative rejected |
| -------- | --------- | -------------------- |
|          |           |                      |

## Conflicts and open questions

Blocks approval of this screen until each row has a resolution. A conflict resolved now is cheaper than a wireframe redrawn later.

| #   | Conflict / question | Between | Owner | Status |
| --- | ------------------- | ------- | ----- | ------ |
| 1   |                     |         |       | open   |

## Designer handoff

Tokens: `inception/design/tokens.json` (W3C DTCG — importable into Figma via Tokens Studio, Penpot, and others). Draw one frame per `ST-##` above; the numbering is the checklist.
