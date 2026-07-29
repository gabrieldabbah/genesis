<!-- Template for a scaffolded project's CLAUDE.md. Genesis fills every {{PLACEHOLDER}} and deletes every
     section that does not apply to this project. A section left as boilerplate is worse than absent: it
     teaches an agent that the file describes something other than this repository.

     One real file at the root. No symlink, no import, no second copy under another name — indirection buys
     nothing and drifts.

     Delete this comment. -->

**What this is:** `{{WHAT_THIS_IS}}`
**Who is exposed:** `{{WHO_IS_EXPOSED}}`

# {{PROJECT_NAME}}

`{{PROJECT_ONE_LINER}}`

- **Stack:** `{{STACK}}`
- **Status:** `{{PHASE}}`
- **Measured against:** UI/UX `{{UI_REFERENCE}}` · code `{{CODE_REFERENCE}}` · copy `{{COPY_REFERENCE}}`

## Commands

<!-- FILL: the exact commands to install, run, test, build. This is the source of truth — update it when a
     command changes. Do not list what `package.json` (or its equivalent) already states plainly; list what
     someone would otherwise guess wrong. -->

```bash
{{COMMANDS}}
```

**The gate:** `{{TEST_CMD}}` must be green before a commit. It is run and its output read — a suite reported
as passing without being watched pass is the failure this gate exists to prevent.

## Gotchas

<!-- FILL, and this is the reason the file exists. Anything a session could not work out by reading the code:
     what looks safe and is not, a convention that differs from the tool's default, a non-guessable command,
     a failure that already happened once, design rationale that the code does not carry.

     One line each, specific enough to check. Delete this comment and any example that does not apply. -->

- `{{GOTCHA}}`

## How work is tracked

The backlog is [`docs/TODO.md`](./docs/TODO.md): `[ ]` not started · `[~]` in progress · `[?]` implemented but
unverified. Every item carries a verification type — `🤖` an agent can prove it, `🙋` needs the operator's
judgment, credentials or a live check — and a `→ verify:` line saying exactly how.

A completed **section** moves out of `docs/TODO.md` into [`docs/TODO-done.md`](./docs/TODO-done.md) under a
dated heading, when it holds no open items at all. An `[x]` inside a section still in progress is correct and
stays: it records that one part is built while the unit is not. The `todo` skill maintains the sort
(priority → ease → dependencies) and the archive move.

Work lands on `{{WORK_BRANCH}}`; `{{RELEASE_BRANCH}}` holds released work. Do not commit or push unless asked.

## What the AI does not do

Exactly one class: work needing the operator's real-world identity, credentials, money, or a live external
mutation — creating or logging into accounts, entering real secrets, switching to live keys, deploying to
production, pushing, pointing DNS, destructive migrations.

These are **deferred, not asked about mid-run.** Build everything around them in test or sandbox mode, write
the exact step into [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md), mark the item `🙋`, and keep going. They are
handed off together at the end.

## Secrets

Never read, `cat`, print or echo `.env` or any key file; never paste a secret into chat, a commit, or a log.
To check a variable is set, test presence only (`[ -n "$VAR" ] && echo set`), never the value. Secrets live in
`.env` (git-ignored) or the host environment; `.env.example` documents variable **names**.

**Know where the wall ends.** `.claude/settings.json` denies these paths to the file tools and to the shell
commands Claude Code recognises as file reads — `cat`, `head`, `tail`, `sed` — so those are refused. A program
that opens the file itself, such as a node or python one-liner, is not covered by anything here; only an OS
sandbox would cover it, and this project does not use one by default. For that remainder the rule above is the
only boundary.

## No network exposure in development or test

Never auto-start a server, and never bind a public interface. Where a server is genuinely needed — a preview
that was asked for, an e2e test — bind `127.0.0.1` only, never `0.0.0.0`, and tear it down. No tunnels. A
public port is opened at deploy, behind a human gate.

<!-- KEEP THE SECTION BELOW ONLY IF THIS PROJECT SERVES REQUESTS FROM ANYONE BUT THE OPERATOR.
     If it does not, delete the whole section — it is not relaxed for such a project, it is irrelevant to it,
     and leaving it in teaches an agent that this file describes something else. -->

## Where the server takes outside input

Each of these is a property you can point at in a diff.

- **Fail-safe defaults.** Authority comes from an explicit positive check, never the absence of a negative one
  — a query error, a missing row, an unhandled branch all deny.
- **Complete mediation.** Authorise every access at the point of access, per resource, per request. Never infer
  authority from an earlier step in the same flow.
- **Least privilege.** Where a key bypasses row-level security, every query the application issues is a
  security boundary.
- **Allowlist, not denylist.** A denylist claims to have imagined every attack.
- **Parse, don't validate.** Untrusted input becomes a typed value once, at the boundary.
- **Idempotency.** Anything that grants, charges or mutates is safe to apply twice, enforced by a unique
  constraint, conditional update or idempotency key. A disabled button is not a control.
- **Atomicity.** A multi-step mutation completes or leaves no trace.
- **Bounded reads.** A query whose result set grows with the data carries an explicit limit and a deterministic
  order. A sweep pages; a limit alone leaves later rows permanently unreachable.
- **Effects at the boundary.** Clock, randomness, network and spend are injected, not ambient.
- **Reversibility.** Expand/contract migrations, rollable deploys, destructive operations behind an explicit
  confirmation.

**Display code inverts this.** Refusing a request costs a retry; refusing to render costs the feature. When a
missing value or an unrecognised shape reaches display code, degrade toward the most useful honest output, not
toward nothing.

<!-- END of the server section. -->

<!-- KEEP THE SECTION BELOW ONLY IF THIS PROJECT HAS A GENERATIVE COMPONENT. Otherwise delete it — with a
     wholly deterministic core these rules are vacuous, not relaxed. -->

## Where generated output meets exact computation

- Pure functions compute structure and arithmetic; generators write prose and judgment. The boundary between
  them is a validated type, and generated output never flows where exactness is required.
- Every shown fact has a verified origin. Unsourced means dropped, not shown.
- Ground, generate, verify, degrade: AI calls are bounded and schema-constrained, with a validation pass and a
  deterministic fallback that has actually been exercised. Cache by input hash.
- Use the best available model for anything quality-sensitive; reserve a smaller one for genuinely trivial wide
  fan-out. Use the `claude-api` skill for model ids and parameters rather than guessing them.

<!-- END of the generative section. -->

## Conventions

- **Style:** `{{LANG_CONVENTIONS}}`. Match the file you are in. Small pure functions; no abstraction for a
  single use.
- **Comments** explain *why*, at the density of the surrounding code.
- **Determinism:** no ambient clock, randomness or wall-time in core logic — inject them, so output is
  reproducible and testable.
- **Surgical change:** every changed line traces to the request. Name unrelated problems; do not fix them
  uninvited.
- **Scratch space:** anything ephemeral goes in [`.scratch/`](./.scratch/) (git-ignored). Durable work belongs
  in `docs/TODO.md`.

## Skills

Reach for a skill when its moment comes; a description that matches is the invitation.

| Skill | When |
|---|---|
| `parallel-work` | another Claude session is editing this repository at the same time |
| `todo` | adding, advancing or sorting work; archiving a finished section |
| `sources` | researching anything, or choosing and vetting a dependency |
| `test-gate` | before a commit, and before calling work done |
| `security-audit` | after wiring an integration, and before the handoff |
| `repo-hardening` | setting up CI, dependency updates, or branch protection |
| `git-commit` | committing work and pushing the branch |
| `generate-pr` | a branch is ready for review |

Project-specific: `{{PROJECT_SKILLS}}`.

**UI work uses `frontend-design`**, Anthropic's design skill, where it is installed
(`/plugin marketplace add anthropics/claude-code`, then
`/plugin install frontend-design@claude-code-plugins`). It decides the visual direction; `docs/DESIGN.md`
states what this project's UI must satisfy regardless — every component and screen state, responsive
behaviour, and WCAG AA. Those are requirements, not suggestions, and no design skill enforces them.

## Subagents

Delegate when a piece of work is genuinely substantial and independent. Work that finishes in a handful of tool
calls costs more to hand off than to do.

Never dispatch a subagent to check work another subagent just did.

## Repository structure

<!-- FILL: a tree to depth 2, one comment per folder — only where the name does not already say it. Every
     folder to depth 2 has its own README.md saying what lives there and why. -->

```
{{REPO_TREE}}
```

## Documents

| Doc | Purpose |
|---|---|
| [`docs/PROJECT.md`](./docs/PROJECT.md) | Scope, framing, success criteria |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | Design and the reasoning behind it |
| [`docs/DESIGN.md`](./docs/DESIGN.md) | *(UI)* the design system and screen specs with every state |
| [`docs/TODO.md`](./docs/TODO.md) | The backlog |
| [`docs/PLAN.md`](./docs/PLAN.md) | The dependency ordering and the scope gates behind the backlog |
| [`docs/TODO-done.md`](./docs/TODO-done.md) | Dated archive of completed sections |
| [`docs/TESTING.md`](./docs/TESTING.md) | What is tested, how, and what the gate runs |
| [`docs/SOURCES.md`](./docs/SOURCES.md) | Trusted sources and approved dependencies |
| [`docs/DECISIONS.md`](./docs/DECISIONS.md) | Decisions taken, with the reason each was taken |
| [`docs/REQUIREMENTS.md`](./docs/REQUIREMENTS.md) | System prerequisites, and what is present or missing |
| [`docs/RESILIENCE.md`](./docs/RESILIENCE.md) | Fallback chains, offline mode, degradation policy |
| [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) | The human handoff — accounts, secrets, deploy, checks |
| [`docs/ADMIN-DASHBOARD.md`](./docs/ADMIN-DASHBOARD.md) | *(SaaS)* admin dashboard and structured logging |
| [`docs/REPO-LAYOUT.md`](./docs/REPO-LAYOUT.md) | Target repository organization and per-folder purposes |
| [`docs/MAINTENANCE.md`](./docs/MAINTENANCE.md) | The keep-current routine: dependency and advisory policy |
| `{{EXTRA_DOCS}}` | Project-specific |
