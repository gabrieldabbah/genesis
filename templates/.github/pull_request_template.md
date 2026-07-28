<!--
Genesis PR template. The `generate-pr` skill fills every applicable section from the branch diff and
commits, grounded only in evidence, and strips this comment. An unchecked box beats a fabricated tick.
Delete a section only if it genuinely does not apply.
-->

## Summary

<!-- 1–3 sentences: what this PR does and why. -->

## Type of change

- [ ] feat — new capability
- [ ] fix — bug fix
- [ ] docs — documentation only
- [ ] refactor — no behavior change
- [ ] perf — performance
- [ ] test — adds/updates tests
- [ ] chore — tooling / build / deps

## Area touched

<!-- Tick the areas the diff actually hits; adapt this list to the project. -->

- [ ] core / domain logic
- [ ] API / server
- [ ] UI / components
- [ ] data / migrations
- [ ] integrations
- [ ] infra / CI / config
- [ ] docs

## Changes

<!-- One bullet per logical file-group, specific and grounded in the diff. -->

-

## Motivation & context

<!-- Why now. Link the decisions, plan tasks or issues this discharges (D#, T#, #issue). Write n/a if there
are none — never invent a ref. -->

## How it was verified

<!-- The commands you actually ran and what they printed. If you did not run something, say which commands
a reviewer should run. Paste the real output below. -->

## Definition of Done

- [ ] The gate was run and its output read
- [ ] Correct on empty, boundary, malformed and adversarial inputs — not only the happy path
- [ ] Tests added or updated, and seen red before green
- [ ] Reproducible — no ambient clock, randomness or IO in core logic
- [ ] No secrets or PII in the diff
- [ ] Simplest change that satisfies the goal; surgical diff
- [ ] READMEs current to depth 2 where folders changed
- [ ] Conventional commits with the `Co-Authored-By` trailer; targets the work branch

## Human sign-off

<!-- `generate-pr` never auto-ticks these — a person confirms. -->

- [ ] Reviewed by a human before merge
