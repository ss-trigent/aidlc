# Design

What lives here, and what deliberately does not.

| Here                       | Contains                                                                    |
| -------------------------- | ----------------------------------------------------------------------------- |
| `screens/SCR-###-<slug>.md` | Screen specs: purpose, every numbered `ST-##` state, a11y notes             |
| `components/`              | One preview per component, each rendering the states it claims               |
| `tokens.css`               | The design system's single source — colors, type, spacing, radius, elevation |
| `tokens.json`              | **Generated** from `tokens.css` by `aidlc-check --write` — never hand-edited |

**Not here: the visual design files.** Frames stay in Figma, Penpot, or whatever
the designer uses. The tool imports `tokens.json`, so the design file and this
repo agree on the values without either owning the other. What this folder holds
is the part a reviewer must be able to check: which screens exist, which states
each has, and that a preview renders every one of them.

## Rules `aidlc-check` enforces

- A story with a `## UI` section cites a screen
- A screen's `ST-##` states match its manifest entry
- Every state is rendered and marked in a preview: `<!-- @state SCR-###/ST-## -->`
- Previews hold no raw hex — colors come from tokens
- `tokens.json` is generated, never edited by hand

Incomplete is a warning before delivery and an error on a `feat/US-###` branch.

## Adding a screen

Run `/ux`. It interviews you, numbers the states so none are skipped, writes the
spec and the preview, and updates the manifest. Consistency with what already
exists beats a fresh idea — read the neighbouring specs and `tokens.css` first.

Tailor this README to your project; it is yours from here.
