# E2E test plans

One plan per story, named after it: `US-###.md`. The story ID is the plan's
identity — there is no separate plan ID to keep in sync.

Format: [`ai/templates/test-plan.md`](../../ai/templates/test-plan.md). Steps are
written so a human could execute them by hand, which is what makes a plan
reviewable on its own and what lets generation produce a test without guessing
intent.

**The plan is reviewed before its tests are generated.** That review is the only
cheap moment to catch a scenario that tests something adjacent to the acceptance
criterion rather than the criterion itself.
