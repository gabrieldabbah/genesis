---
name: repo-hardening
description: "Set a repository up so it cannot merge broken code and cannot quietly rot: continuous integration, automated dependency updates, a protected default branch, and the CI check made a required gate. Use when the user says \"/repo-hardening\", \"harden this repo\", \"set up CI\", \"protect main\", \"add branch protection\", \"enable Dependabot\", or when a project is about to become public or start deploying from its default branch. Ordering matters — a required status check can only be added after that check has run once."
license: MIT
allowed-tools: Bash, Read, Write, Edit
---

# Repo hardening — make broken code unmergeable

Four things, in this order. The order is not cosmetic: step 4 depends on the check from step 2 having actually
run, and doing it earlier fails with a confusing error.

Assumes a repository hosted on GitHub with a default branch that deploys or releases. Adapt the mechanics for
another host; the four properties are the same everywhere.

**Every step here changes settings on a hosted repository the user owns.** Propose the set, then apply on their
go-ahead. Nothing in this skill is urgent enough to justify surprising someone with a changed merge policy.

## 1. Automated dependency updates

Turn on the host's dependency alerts and automatic security updates, and commit a config that also opens
routine (non-security) update PRs on a schedule. Group them — a weekly batch is reviewable, thirty individual
PRs are not. A scaffolded project already has that config at `.github/dependabot.yml`; check its ecosystem
matches the stack, and that a project with several manifests has a block per directory.

The alerts are a repository setting and the config is a file: turning on one without the other looks the same
from the outside as doing both, and neither half announces the absence of the other.

Why it earns its place: a dependency advisory is the one class of problem that arrives on someone else's
schedule rather than yours.

## 2. Continuous integration

Add a workflow that runs the project's own gate on every pull request and on pushes to the default branch. A
scaffolded project already has one at `.github/workflows/ci.yml`; a project that does not gets it written now,
with the same properties.

**The run command comes from the project, not from a guess.** Read `CLAUDE.md` §Commands, then the manifest's
scripts. Use what is actually there — the test command if the project has tests, otherwise the build, which at
least catches a type or compile error. A CI job that runs nothing is worse than none, because it goes green and
implies something was checked.

Pin the runtime version rather than floating it, and cache the dependency install. If there is no lockfile, use
the install command that tolerates that, and say so — a `ci`-style install will fail without one.

Four properties are worth naming because each is invisible when wrong:

- **Only the triggers the flow needs.** Where a working branch reaches the default branch through a pull
  request, `pull_request` already covers it; adding a push trigger for that branch runs everything twice per
  commit. A repository that commits straight to its default branch keeps only the push line.
- **`permissions: contents: read`**, plus whatever a specific job genuinely needs. The default token is
  broader than most workflows use.
- **A `concurrency` group with `cancel-in-progress`**, so a new commit supersedes the run in flight.
- **Full history where a check reads it.** `actions/checkout` clones a single commit; anything asking git
  when a file last changed — a docs freshness check, a changed-files filter, a tag-derived version — needs
  `fetch-depth: 0` or it reads a one-commit repository dated today and answers wrongly.

**Open this as a pull request rather than pushing to the default branch.** The workflow file is on the branch,
so it runs against its own PR — which is how you find out whether it passes before it can block anything. A red
result here is the point: it has surfaced a real failure that was already there.

## 3. Protect the default branch

A ruleset on the default branch: restrict deletions, block force pushes, require a pull request before merging.

**Required approvals: zero, for a solo project.** Setting it to one on a repository with a single maintainer
locks that person out of merging their own pull requests, with no way through except disabling the rule they
just set. Set it to one when there is a second person.

Leave off, unless the project actually needs them: required reviewers, code owners, linear history, signed
commits. Each adds friction that has to be paid on every change.

## 4. Make CI a required check

Only now, and only after the step-2 workflow has completed at least once — the check has to exist by name
before it can be required. Add it to the ruleset, and require branches to be up to date before merging.

**The requirement names the job, so the job's name is now an interface.** Renaming it detaches the rule, which
then passes on a workflow that no longer runs. Rename the two together or neither.

This is the step that converts CI from advisory to a gate: the default branch can no longer receive code that
does not build or does not pass its tests.

## Verify it worked

Do not assume the settings took. Confirm:

- A pull request shows the CI check running, and shows it as required.
- A direct push to the default branch is refused.
- The dependency config is on the default branch and the host reports the feature enabled.

Report what you turned on, and what remains a human step.

## Worth considering, not defaults

- **A CI badge** in the README — free signal that the project is maintained.
- **Auto-merging dependency PRs once CI passes.** Reasonable on a library. On a repository whose default branch
  deploys straight to production, it ships dependency changes with nobody looking. Suggest it only once the
  person has watched the pipeline work for a while.
- **Secret scanning with push protection, and code scanning** — free on public repositories, and worth enabling
  the moment a repository becomes public.
