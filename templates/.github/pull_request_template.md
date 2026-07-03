<!--
Genesis PR template. The `generate-pr` skill fills every applicable section from the branch diff + commits,
grounded ONLY in evidence (constitution A2/A15), and strips this comment. An unchecked box beats a fabricated
tick. Delete a section only if it genuinely does not apply.
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

<!-- Why now. Link the axioms / decisions / plan tasks / issues this discharges (A#, D#, plan T#, #issue).
Write n/a if there are none — never invent a ref. -->

## How it was verified

<!-- Honest: the commands you actually ran and their real result (A2). If you did not run something,
say which commands a reviewer should run. Paste the real output below. -->

## Definition of Done

- [ ] Postcondition specified and its check was **run and read** (A2)
- [ ] Correct on empty / boundary / malformed / adversarial inputs — not just the happy path
- [ ] Tests added/updated and seen **red before green** (P9)
- [ ] Reproducible — no ambient clock / random / IO in core logic (A7/A10)
- [ ] No secrets / PII in the diff (A13)
- [ ] Simplest change that satisfies the goal; surgical diff (A11/A12)
- [ ] READMEs current to depth 2 where folders changed
- [ ] Conventional commits + `Co-Authored-By` trailer; targets `dev` (A24)

## Human sign-off

<!-- `generate-pr` never auto-ticks these — a person confirms. -->

- [ ] Reviewed by a human before merge
