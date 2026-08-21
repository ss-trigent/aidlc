# ADR-002 — Jira as a tracking and client-visibility flow, not an approval surface

|             |                                                                                         |
| ----------- | --------------------------------------------------------------------------------------- |
| **Status**  | accepted — architect reviewed and approved, recorded 2026-08-03 (banked by the PR that merges this file; GitHub review is the authoritative record) |
| **Date**    | 2026-07-31                                                                              |
| **Decider** | Solution Architect + repo admin (drafted on stakeholder instruction)                    |
| **Serves**  | framework-wide (no single story)                                                        |
| **Amends**  | [ADR-001](ADR-001-framework-structure-and-toolchain.md) decision 4, which declined Jira |

## Context

ADR-001 declined Jira: _"Issues, code, review, status and CI stay in one system with one identity model."_ It also pre-committed to the terms of any reversal:

> Revisit if the organisation mandates them, in which case GitHub remains the approval surface and the other system mirrors it — never the reverse, since approval identity is the thing that must not be forwarded through an integration.

Two facts now force the revisit, and neither is about approval:

1. **Not everyone who needs to follow the work has repository access.** Clients, and some managers and testers, will never open a pull request. A repository is not a viable shared view for them, and "read the markdown on a branch" is not an answer.
2. **Tests need a trackable home outside the code.** "What was tested, and did it pass?" is currently answerable only by reading test names and CI logs.

The stakeholder instruction was explicit that this is a tracking flow, not an approval flow.

## Decision

**Jira is adopted as a parallel tracking flow — for delivery visibility, client-facing sharing, and test evidence. It carries no gate authority. Approval remains a GitHub pull-request review and is never mirrored in either direction.**

Concretely:

1. **Direction.** GitHub is the source of truth and flows outward to Jira. A Jira ticket can also be _intake_, saved verbatim into `inception/product/inputs/` and treated like any other raw customer need. Approval flows in neither direction.

2. **Tickets are created on request, and state their real state.** The BA asks; the persona creates. A ticket for an unapproved story is allowed and useful for visibility, but its `State` field says `Draft — awaiting approval`, so the board never implies agreement that does not exist.

3. **One writer.** Every write goes through `tools/aidlc-jira.mjs`. Dry run is the default and needs no credentials, so the exact client-visible text is reviewable in a pull request before it reaches a live board. No ad-hoc REST or MCP calls.

4. **A refusal list, enforced in code.** The tool refuses to write fields that would either forward approval or duplicate what Jira owns: status/resolution transitions, sign-off and approval fields, sprint, assignee, estimate, worklog. `aidlc-check` additionally rejects a template that declares one.

5. **Templates are Markdown; the wire format is chosen at the boundary.** Jira accepts wiki markup (v2, Server/DC) or ADF JSON (v3, Cloud), never Markdown, despite the Cloud editor converting it on paste. Authoring in Markdown and converting in one function keeps five template files free of a format assumption, lets the repository's formatter own them, and makes instance type a flag rather than a rewrite. Default is v3/ADF.

6. **Test tickets carry evidence, never assertions.** One ticket per acceptance criterion, its result filled from a real CI run. A criterion with no automated test reads `Not yet automated`, never a pass nobody earned.

7. **The ticket key is a convenience edge, not a governance edge.** Recorded in the manifest as `"jira": "LOG-142"`. A missing key is a warning. **Jira going away must not break the build.** That is the test of whether this stayed in its lane.

## Alternatives considered

| Option                                                   | Pros                                          | Cons                                                                                                                             | Why rejected                                                               |
| -------------------------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Keep Jira declined; give clients a generated status page | No second system, no credentials, no drift    | Still a page nobody's process points at; no place for a client to comment; testers still have nowhere to track execution         | Solves visibility, not participation — clients already live in Jira boards |
| Jira as the system of record for work items              | One board, familiar to the whole organisation | Approval identity would end up in an editable field; the spec would drift from the code; the traceability graph loses its anchor | Exactly the failure ADR-001 was written to prevent                         |
| Two-way sync of status                                   | Board edits reflected back automatically      | Someone moving a card becomes a silent scope change; two writers, no arbiter                                                     | GitHub must win unambiguously, so the reverse edge cannot exist            |
| Mirror sprints/assignees into the manifest               | Single query for reporting                    | Recreates the status-file anti-pattern the framework was rebuilt to remove                                                       | Jira owns portfolio mechanics outright                                     |
| Ad-hoc API calls from each persona                       | Less tooling to build                         | The rules above would live in prose only, applied differently by each persona                                                    | A single writer is the only way the refusal list is real                   |

## Consequences

**Easier.** Clients and testers get a view that fits how they already work, without repository access. Test coverage becomes legible to someone who does not read code. Change requests and bugs can arrive from either system and end up cross-linked either way.

**Harder / accepted costs.**

- **A second system to keep honest.** Mirror data can go stale. Mitigation: it is regenerated from GitHub rather than hand-maintained, and staleness is visible because every ticket deep-links its artifact.
- **The "read-only" guarantee does not reach Jira.** `/architect` and `/manager` disallow the `Write` and `Edit` tools, which covers files, not external systems. A Jira write tool is not the `Write` tool. `/manager` writing tracking status is inside its charter; `/architect` writing anything to Jira is not, and **that limit is a charter rule, not tool-enforced.** Stated plainly rather than pretended.
- **Client-visible text is a new review surface.** A ticket can leak internal detail, another client's name, or an unresolved question presented as settled. Mitigation: dry-run output is reviewable in the PR, and the templates put implementation detail in comments rather than descriptions. This is a human-review item, not an automated one.
- **Credentials now exist.** Four environment variables, none committed; the tool masks the token in all output. A missing variable fails the write path loudly rather than guessing.
- **The Markdown subset is deliberately small** — headings, paragraphs, bullets, quotes, pipe tables, rules, and four inline marks. Anything richer would not round-trip to both wiki markup and ADF, so a template needing more is a change to the converter, not to the template.
- **Issue-type names are instance-specific.** The templates assume `Story`, `Bug`, `Task`, `Epic`, `Test`. A project without a `Test` type (no Xray or Zephyr) needs that mapping changed — a one-line template edit, but it will not work untouched everywhere.
- **ADR-001 decision 4 is now partially superseded.** Its Jira row should be read together with this record. Azure DevOps remains declined, and the Anthropic-only model constraint is untouched. This is an issue tracker, not a model vendor.
