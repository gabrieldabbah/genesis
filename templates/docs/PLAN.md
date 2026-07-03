# {{PROJECT_NAME}} — Plan

> The task-based, dependency-ordered plan (A21). Work is a DAG executed top-to-bottom: do first what is
> **certain and unblocked**; the further down, the more it depends on a prior task or a human decision.
> Scope-changing forks are settled up front. Work needing the human's credentials/accounts is **deferred to
> [`DEPLOYMENT.md`](./DEPLOYMENT.md)** and handed off at the end — never a mid-run stop (A5/A21).
>
> This is the **only** place volatile task state lives — never in memory (A25).

## Legend

- `[ ]` todo · `[~]` in progress · `[x]` done · `🙋` deferred to the human handoff ([`DEPLOYMENT.md`](./DEPLOYMENT.md)) · `🚧 GATE` an at-start scope fork only.
- Each task: a verb, a verifiable outcome, and (where useful) `→ verify: <check>`.

## Tasks

- [ ] **T1 — Scaffold the repo from the kit.** → verify: `AGENTS.md` + `CLAUDE.md` symlink + `.agents/skills/`
  present; `npx skills list` clean.
- [ ] **T2 — Fill `PROJECT.md` / `ARCHITECTURE.md` placeholders.** → verify: no `{{...}}` left.
- [ ] **T3 — `{{FIRST_REAL_TASK}}`** → verify: `{{CHECK}}`.

<!-- Add the dependency-ordered task list. Put scope-changing forks early. Work needing the human's
credentials/accounts goes to `🙋` + DEPLOYMENT.md, never a mid-run halt. -->
