# Create — an empty folder to a working project

The runbook behind [`SKILL.md`](SKILL.md) §create. Measure everything against [`standard.md`](standard.md).

**Greenfield only.** If the folder already holds a real codebase, stop and say so — that is
[`transition.md`](transition.md)'s job. The one exception is a resume; check for that first.

---

## Phase R — resuming a paused build

Check before the greenfield guard and before any phase. If `.scratch/resume.json` (or
`.scratch/resume.json.inflight`) exists, or `.scratch/acceptance.json` exists with `criteria_met=false`, this
is a resume.

1. Do not abort on the existing codebase, and do not re-run phases 0–5. The foundation, research, design,
   stack and plan are on disk; re-running duplicates or clobbers them.
2. Read `.scratch/resume.json` — `{ "next_item": "<TODO id/title>", "state": "<what was in flight>",
   "expected_reset": "<ISO time>" }` — plus `.scratch/acceptance.json`, `docs/TODO.md` and `docs/TODO-done.md`.
3. Whatever was mid-build may be partial. Run the project's gate over it; if it is broken or incomplete, reset
   that item to `[~]` and rebuild.
4. Re-enter phase 6 at `next_item`.
5. Remove `.scratch/resume.json.inflight` so a later pause writes a fresh checkpoint.

---

## The order is the product

The common failure in greenfield work is starting from "which framework?". Genesis does not decide the stack
until phase 4, after the problem is understood and the architecture is designed. Work the phases in order and
mirror them in a TodoWrite list so the order stays visible.

**Scope.** Build what phase 5's plan says, at the scope the plan states. Do not add capabilities the plan does
not name because they seem useful — a feature nobody asked for is scope creep whether or not it is good. If
something genuinely missing turns up, add it to `docs/TODO.md` with its reason, then build it.

**Two windows to ask, and they are both early.** Phase 0's scope-bifurcating question, and any system
prerequisite without which nothing can build. After that the run goes to completion: decide what the spec,
architecture, or ordinary practice settles, log it in `docs/DECISIONS.md`, and continue. Anything needing the
operator's identity, credentials or money is deferred to the handoff, never asked mid-run.

---

## Phase 0 — capture the problem

- Get the problem and the objective in plain English. That is all.
- **Do not ask about stack, framework or tooling here.** A volunteered preference is recorded as a hint for
  phase 4.
- If a *paramount, scope-bifurcating* question is not answered by the prompt — consumer app versus internal
  tool, one user versus many — ask it here, batched, once. Prefer a reasonable assumption logged in
  `docs/DECISIONS.md` over a question.

## Phase 1 — foundation

Stack-agnostic substrate, laid before any stack talk.

- **`CLAUDE.md`**, from `templates/CLAUDE.template.md`, opening with the two declarations from
  [`standard.md`](standard.md) §1. One real file at the root — no symlink, no import, no `AGENTS.md`.
- **System prerequisites.** Detect what is installed (`command -v docker`, `node --version`). A tool needed to
  build or test *at all* is the one sanctioned pre-build prompt — surface it once, batched with phase 0's
  question. A tool that blocks only some work (Docker for integration tests) is recorded in
  `docs/REQUIREMENTS.md` as a `🙋` handoff item and deferred. Build everything else.
- **Repo hardening** — CI on every pull request, automated dependency updates, a protected default branch,
  and the CI check made a required gate, via the `repo-hardening` skill. These change settings on the user's
  hosted repository, so propose the set and apply on their go-ahead; if there is no remote yet, record it in
  `docs/DEPLOYMENT.md` as a `🙋` item instead of skipping it.
- **Docs skeleton** (`templates/docs/*`), **`.gitignore`** (from `templates/gitignore.template` — keep its
  universal, secrets and `.scratch/*` sections, append the stack's once known), the **`.env` family** (from
  `templates/env/`; only `.env.example` is committed; generate secrets with the `# generate:` commands),
  **`.scratch/`**, and **`.github/pull_request_template.md`**.
- **Root `README.md`** from `templates/README.project.md`. READMEs are a gate — see
  [`reference.md`](reference.md) §READMEs.
- **`.claude/settings.json`** — secret denials for the Read tool, and an `ask` gate on push, merge and deploy.
  **No OS sandbox by default**: one tight enough to matter also blocks `pnpm install`, and a control that
  blocks ordinary work gets switched off, taking the read protections with it. Offer one only if the project
  asks for it — a client repository, real customer data, an unattended run on a shared machine — and configure
  it so the first install works. Leave outbound network alone. Full reasoning and the working configuration:
  [`reference.md`](reference.md) §Permissions.
- **The todo-archive Stop hook.** Copy `templates/todo-archive-reminder.mjs` →
  `.claude/hooks/todo-archive-reminder.mjs` and wire it under `hooks.Stop` (the block is in
  `templates/settings.template.jsonc`). It flags a heading section that is entirely complete and still sitting
  in the live TODO, and a ticked item that is a settled question (an ask-verb opening, or a
  CONFIRMED/VERIFIED stamp) hiding inside a section that still holds open work. It needs `docs/TODO-done.md`
  to exist — without an archive file it silently does nothing.
  Fails open, blocks at most once per distinct violation set, disarmed with `touch .claude/todo-archive.off`.
- **No network exposure in dev or test.** Never auto-start servers; never bind a public interface. Where a
  server is genuinely needed — an asked-for preview, an e2e test — bind `127.0.0.1` only, never `0.0.0.0`, and
  tear it down. Opening a public port happens at deploy, behind a human gate. See
  [`reference.md`](reference.md) §Network exposure.
- **Confirm the protections behave.** Attempt one fake-secret read with the Read tool; it must be denied.
  Then run the project's real install and test commands; both must succeed. If a sandbox was enabled, also
  attempt an out-of-scope write, and check that the install still passes — a failing install is the single
  most common reason someone disables a sandbox, and it is fixed by granting the cache path, not by leaving it
  for the build to hit.

  **Say which protections are boundaries and which are rules.** The deny rules reach further than a Read tool:
  they also block Edit on the same path and the file-reading shell commands Claude Code recognises, `cat`,
  `head`, `tail` and `sed`. What they do not reach is a program that opens the file itself — a node or python
  one-liner — and only a sandbox stops that. Report the line where it actually falls rather than implying more
  coverage than exists, or less.

Lay the foundation, say what you set, and continue.

## Phase 2 — research

- Use the `sources` skill and web research to understand the domain: requirements, constraints, prior art,
  candidate approaches, and candidate stacks. Research only — the stack is phase 4.
- **Find the best that exists.** Identify the single best-in-class product or codebase for each surface (UI/UX,
  core, copy) and capture what makes it good. These become the named references the work is measured against.
  Grounding in the best available reference is what stops output from being generically adequate.
- Record findings in `docs/PROJECT.md` and the trusted registry in `docs/SOURCES.md`. Every shown claim has a
  verified origin; anything uncorroborated is flagged as a conjecture rather than asserted.
- **If the project has a UI**, research design references now — two or three best-in-class products in the same
  space, and the patterns that make them feel good. This feeds phase 3.

## Phase 3 — architecture

- Draft `docs/ARCHITECTURE.md`: the components, and where exact computation meets generated output. Finish
  `docs/PROJECT.md`. Record choices in `docs/DECISIONS.md`.
- **If the project has a UI:** fill `docs/DESIGN.md` before any UI is built — the design system (type scale,
  spacing rhythm, semantic colours with their states, radius, shadow, breakpoints, a reused component library)
  and the key screens and flows with every state specified: loading, empty, error, success, edge. The template
  carries the required structure and the UI definition-of-done. Design to the simplicity bar: one clear primary
  action per screen, minimal text, teach by doing, motion over words.

  **Where a dedicated design skill is installed, it does the craft.** Genesis states what a UI must satisfy;
  it does not ship a taste engine, and a generic one produces generically adequate output — the failure this
  phase exists to avoid. Anthropic publishes `frontend-design`, which commits to an aesthetic direction before
  writing code and covers typography, colour theming, motion and spatial composition:

  ```text
  /plugin marketplace add anthropics/claude-code
  /plugin install frontend-design@claude-code-plugins
  ```

  It may not be installed on the machine running genesis, so treat it as a preference rather than a step: use
  it where it is present, note it in the handoff where it is not, and say in the report which path was taken.
  It is about visual craft — the accessibility bar in §Phase 5 and `docs/DESIGN.md` §5 stays a genesis
  requirement either way, because no aesthetic skill enforces it.

## Phase 4 — choose the stack

Now, and derived from the architecture and research rather than assumed.

- **Decide** the language, framework, package manager and test runner, with rationale grounded in phases 2–3;
  log it in `docs/DECISIONS.md`; proceed. Honour any phase-0 hint.
- Fill the stack-specific parts: the test harness (`docs/TESTING.md`), build and artifact directories in
  `.gitignore`, the integrations the project needs (wire each from `integrations/registry/*.yaml`), and the
  list of external skills for the user to install — you list them, the user runs the installs.
- **Note the domain references.** Where a chosen integration has a `reference:` field, that names a file in
  `${CLAUDE_PLUGIN_ROOT}/integrations/references/` holding the failures in that domain that are not obvious
  from the provider's docs — money moving twice, a migration that will not reverse, a deploy with no way back.
  Read it when building that integration's items. Nothing is copied into the project: the reference is read at
  the moment it applies, not installed as standing instruction.
- **Arm the gate, now that its commands are real.** The test and lint commands decided here are what
  `CLAUDE.md` §The gate names, so this is the first moment a gate can be declared rather than guessed. Follow
  [`../../templates/user-layer/arm-the-gate.md`](../../templates/user-layer/arm-the-gate.md): it confirms the
  user-level half is wired before installing `.claude/gate.sh` and `.claude/gate.cmd`, and phase 6's per-item
  "run the project's gate" is what it makes checkable.
- **Finalize the `.env` family** for the stack and every integration's `env_keys`. If the project calls an
  external provider, add fallback envs per `templates/docs/RESILIENCE.md`. `.gitignore` covers all `.env*`
  except `.env.example`.
- **Design the degradation path.** Provider fallback chains, cached or last-known responses, and a
  deterministic offline mode — so the test scope covers the happy path, each fallback, the degraded path, and
  injected errors. Write `docs/RESILIENCE.md`.
- **If the project is a SaaS:** plan the admin dashboard and structured logging per
  `templates/docs/ADMIN-DASHBOARD.md`. These become phase-5 TODO items.

## Phase 5 — plan

- Build `docs/TODO.md` with the `todo` skill: ordered by priority → ease → dependency count, broken into
  sub-tasks, each with a status marker (`[ ]`/`[~]`/`[?]`), a verification type (`🤖` auto, `🙋` needs the
  operator's credentials or judgment), a real `→ verify:` line, and `deps:`. Fill gaps with reasoned
  assumptions logged in `docs/DECISIONS.md`, then re-sort. Create the empty dated archive `docs/TODO-done.md`.
  Dependency ordering and the scope gates behind the list live in `docs/PLAN.md`; `docs/TODO.md` is the
  actionable backlog. Do not restate one in the other.
- **The plan is the scope contract.** Everything genesis builds traces to an item here, and phase 6 does not
  add capabilities the plan does not name. So be exhaustive now. Before calling the plan ready, confirm it
  covers each dimension below, or record why one is omitted:
  - **UI** — every screen and every state; the design system and component library; responsive breakpoints;
    accessibility to WCAG AA; real, minimal microcopy. Each UI item carries `docs/DESIGN.md` §6, the UI
    definition-of-done, as its acceptance criteria.
  - **Core logic** with unit and property tests; the seam between computed and generated output typed.
  - **Each integration**, wired and verified, plus the fallback, degraded and offline paths.
  - **SaaS** — the admin dashboard and structured logging.
  - **Tests** — unit, property, contract, integration, e2e, visual, accessibility, fallback/offline.
  - **Security** items, per the `security-audit` skill and each integration's checklist.
  - **Docs** — root and per-folder READMEs to depth 2, architecture, design, deployment, requirements.
  - **Ops** — logging, health checks, the deployment handoff.
- Each item names the best-in-class reference it is measured against and the skills the work should use, so
  "done" means the thing is good rather than merely present.

## Phase 6 — build

Work `docs/TODO.md` one item at a time, in dependency order: select the next item → implement → run the
project's gate → advance the item's status → update `.scratch/acceptance.json`. Mirror the list in TodoWrite so
the position stays visible across a long run.

- **Sequence before fan-out.** Early work builds the prerequisites everything else needs — skeleton, test
  harness, core types, shared config. Widen to parallel work only once that is in place and green, and only for
  items whose `deps:` are satisfied. An item dispatched without its prerequisites guesses at them.
- **Delegation is a judgment call, made per item, and the defaults are against it.** Do not delegate work that
  finishes in a handful of tool calls, and never dispatch a subagent to check what another just did. Parallel
  independent work is what fan-out is for; sequential re-reading is not. Group small related items into one
  brief rather than one dispatch each.
- **Where an integration names a `reference:`, read it before building that item** — the domain references in
  `${CLAUDE_PLUGIN_ROOT}/integrations/references/` carry the failures that do not show up until real traffic.
- **The security pass is a gate, not a second opinion.** Run `security-audit` over a surface when it is
  complete — an integration wired, an auth path built, before the handoff — not as a per-item rubber stamp.
  Open critical or high findings block done.
- **Checkpoint as you go, so a stop is never a loss.** A build long enough to matter will outlast something —
  a usage window, a closed laptop, a crash. After each item, write `.scratch/acceptance.json` and keep
  `docs/TODO.md` current. Then any halt is resumable, and no prediction about how much allowance is left has to
  be right. Genesis does not estimate that; `/usage` and `/status` report it, and
  [`reference.md`](reference.md) §Surviving a usage limit says why a script cannot.

  On any halt, write `.scratch/resume.json` — §Phase R above reads exactly this shape — and stop cleanly. A
  checkpoint is a state save, not a question: never ask the operator to approve a resume.

  ```json
  { "next_item": "<the docs/TODO.md id or title to do next>",
    "state": "<one line: what was mid-build when it stopped, if anything>",
    "expected_reset": "<ISO-8601 time work can continue, if known>" }
  ```

  Write the TODO state and any uncommitted diff alongside it.
- **Defer, never stop for, the human-only class:** work needing the operator's identity, credentials, money or
  a live external mutation — creating or logging into accounts, live keys, real charges, production deploys,
  pushes, DNS, destructive migrations. Build everything around them in test or sandbox mode, append the exact
  step to `docs/DEPLOYMENT.md`, mark the item `🙋`, and keep building. All `🙋` items are handed off together at
  the end.
- **At `max_iterations` from the acceptance file, checkpoint and summarize rather than looping.**
- The Stop gate refuses to end the run while `.scratch/acceptance.json` shows criteria unmet. It is self-inert
  outside a genesis build and fails open.

**When `docs/TODO.md` looks empty, sweep once before stopping.** A spec is rarely fully discharged on the first
pass: check the plan's dimensions from phase 5 against what exists, and add what is genuinely missing rather
than declaring done against a list that was never complete.

**Before declaring the build finished, all of these hold and you have seen each one:**

- The project's gate is green, and you read its output.
- The security pass is clean — no open critical or high findings.
- A `README.md` exists at the root and in every folder to depth 2. See [`reference.md`](reference.md) §READMEs
  for the audit command.
- Every `docs/TODO.md` item is either archived to `docs/TODO-done.md` with the date its verify passed, or is a
  `🙋` item deferred to `docs/DEPLOYMENT.md`.
- `docs/DEPLOYMENT.md` states exactly what the operator must do to ship: accounts to create, secrets to set,
  per-host steps from the chosen hosting integration, and the post-deploy checks.

Then summarize what was built with the evidence, ask the user to run `/doctor` over the repository, and wait.
