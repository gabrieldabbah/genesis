# Genesis

**What this is:** the source of a Claude Code plugin — skills, hooks and templates that scaffold new projects
and bring existing ones up to standard. Instructions in English, not application code; there is no
build and no test suite, only the gate below.
**Who is exposed:** anyone who installs it. Everything here runs on other people's machines and writes files
into other people's repositories.

## Environment

There is no database, no deploy target, no queue and no bucket. CI is one workflow
([.github/workflows/gate.yml](.github/workflows/gate.yml)) running [scripts/gate.sh](scripts/gate.sh) on pull
requests and pushes to `dev`/`main`; it reads the repository and nothing else, needs no secret, and has no
deploy step. No credential is needed to work on this repo, it contains no `.env`, and **nothing in it opens a socket or
makes a network call.** The complete list of what it touches:

- **GitHub.** `origin` is `https://github.com/gabrieldabbah/genesis.git`, public (from `git remote -v`).
  Branches are `dev` and `main` only; PRs go from `dev` to `main`
  ([skills/generate-pr/SKILL.md](skills/generate-pr/SKILL.md)). Reached with `git`/`gh` from a dev machine.
- **Provider domains are data, not connections.** Every service endpoint named in this repo
  (`api.stripe.com`, `*.supabase.co`, …) lives in [integrations/registry/*.yaml](integrations/registry/) as
  instructions for a future scaffolded project. Nothing in this repo dials them, and the registry files carry
  env-key *names* only, never values.
- **Two Stop hooks, both currently inert.** [.claude/settings.json](.claude/settings.json) registers
  [todo-archive-reminder.mjs](.claude/hooks/todo-archive-reminder.mjs) for sessions in this repo — it exits
  silently because the repo has no `TODO.md`/archive pair for it to find — and denies `Read` on `.env*`,
  `secrets/`, `*.key`, `*.pem`, `~/.ssh`, `~/.aws` and other credential stores.
  [hooks/hooks.json](hooks/hooks.json) registers [stop-acceptance.mjs](hooks/stop-acceptance.mjs) on machines
  that *install* the plugin; it exits immediately unless `.scratch/acceptance.json` exists, which only a
  running genesis build writes.
- **[templates/env/](templates/env/)** ships `.env.example`, `.env.development` and `.env.production`
  tracked on purpose ([.gitignore](.gitignore) un-ignores them). Every value in all three is empty; they are
  placeholder templates.
- **`.claude/` is personal except two paths.** [.gitignore](.gitignore) ignores `.claude/*` but tracks
  `.claude/hooks/` and `.claude/settings.json` so working on genesis dogfoods what it ships.
  `.claude/skills/` (local `generate-pr` and `git-commit` helpers) stays on this machine and is not shipped.

## The gate

Done means all of these pass. `scripts/gate.sh` was green across all seven categories (14 units) on
2026-07-28. The install check is older **and now describes a superseded version**: on 2026-07-27 the plugin
installed from this checkout and loaded as `genesis@genesis-marketplace` 0.3.0. The manifest is 1.0.0 as of
2026-07-28, so that observation no longer covers what an installer gets — item 3 must be re-run before the
release is called verified.

Item 1 is what a session must actually run: **this gate green in the current session is the definition of
done.** Its runnable copy is `.claude/gate.cmd`, which holds `bash scripts/gate.sh` and nothing else; run it
through `.claude/gate.sh`. That file and this section state the same commands and never disagree. Both live
under the git-ignored `.claude/` and are a per-machine install, so a fresh clone is not armed until they are
written again.

1. **`bash scripts/gate.sh`** — one command, seven categories: the units are discoverable, every
   machine-readable file parses, every `.mjs`/`.js`/`.sh` is syntactically valid, both hooks are inert outside
   a build, every relative markdown link resolves, every folder to depth 2 has a README, and the properties in
   its §7. Exits non-zero and names what failed.

   §7 is where a defect becomes a check instead of a memory: no `agents/` directory, none of the emphasis
   vocabulary [standard.md](skills/genesis/standard.md) §3 prohibits, every hook command quoting its path
   variables, and every registry `reference:` naming a file that exists. Each of those was a real defect —
   the quoting one shipped, and word-splits on any install path containing a space. **Finding one a command
   could have caught is the signal to add a check**, not just to fix the instance.

2. **CI runs that same script** ([.github/workflows/gate.yml](.github/workflows/gate.yml)) on every pull
   request and every push to `dev` or `main`, plus the three things a static check cannot do: each hook's
   *block* path actually firing — the archive hook's once and then staying quiet, the acceptance hook's while
   criteria are unmet and not once they are met — and the two shipped copies of the archive hook being
   identical. There is one definition of the gate, not a local one and a CI one that drift.

3. **The interactive smoke test, which no script covers.** Install the plugin from this checkout
   (`claude plugin marketplace add <path-to-this-repo>`, then `claude plugin install
   genesis@genesis-marketplace`) and run `/genesis` in an empty folder. Needs a real session; it cannot run
   headless. Run it after any change to [skills/genesis/](skills/genesis/) or the hooks.

## Dev loop

The work is editing markdown and the few scripts; there is no app to start. Verified on this machine,
2026-07-27:

- **The gate:** `bash scripts/gate.sh` — the whole thing, in about a second.
- **Hooks, exercised directly:** `echo '{}' | node hooks/stop-acceptance.mjs` and
  `echo '{}' | node .claude/hooks/todo-archive-reminder.mjs` both exit 0 silently outside a build. To see
  the acceptance gate block, write a `.scratch/acceptance.json` with `criteria_met: false` first.
- **The plugin itself:** the smoke test in gate item 3. UNVERIFIED in any headless session — it needs an
  interactive Claude Code prompt; run it after any change to `skills/genesis/` or the hooks.

## Nothing is committed or pushed here without the owner asking for it

Not "unless told to stop" — **only when explicitly asked, per commit and per push**. This repository is
public, so a push is irreversible in a way it is not elsewhere: a deleted file stays reachable by its blob
SHA through forks, caches and mirrors, and a rewritten history does not reliably un-publish anything.

Staging changes and reporting what is staged is the normal end of a piece of work here. Before any commit:
read the full diff and check it for personal names, machine-specific paths, other repositories' names, and
anything that looks like a credential.

## What the exposure means for edits

Two rules follow from "anyone who installs it" and govern every edit:

- **A rule cannot be cut from a shipped file because this machine's `~/.claude/CLAUDE.md` covers it.** An
  installer gets their own user layer, or none. Check the claim against the base Claude Code system prompt
  every user receives, and keep anything not there.
- **A defect here has a blast radius of every machine that installs it.** A hook that refuses to let a turn
  end, a skill that mandates its own invocation, a template instructing behaviour the current model already
  performs — each ships, armed, to strangers.

## Layout

- [skills/genesis/](skills/genesis/) — the three modes. `SKILL.md` routes; `standard.md` is the rubric;
  `create.md`, `transition.md` and `system.md` are the runbooks; `reference.md` holds permissions,
  integrations, resuming after a stop, and the README audit.
- [skills/](skills/) — the working skills genesis and its scaffolded projects use: `axiomatic-induction`
  (the constitution and reasoning method for non-trivial work), `todo`, `test-gate`, `sources`,
  `security-audit`, `repo-hardening`, `git-commit`, `generate-pr`. Visual design craft and
  vulnerability hunting are deliberately not among them — [skills/README.md](skills/README.md) §What genesis
  deliberately does not ship names the Anthropic plugin each one points at instead.
- **No agents.** Genesis defines none and installs none; delegation is decided per item during a build.
  The domain knowledge the deleted roster carried lives in [integrations/references/](integrations/references/),
  read at the moment it applies and never copied into a project. Its design and accessibility half is now a
  requirement in [templates/docs/DESIGN.md](templates/docs/DESIGN.md) rather than a shipped skill.
- [hooks/hooks.json](hooks/hooks.json) — the acceptance Stop gate, self-inert outside a genesis build.
- [scripts/gate.sh](scripts/gate.sh) — the gate as one command, run identically by CI and by hand.
- [integrations/registry/](integrations/registry/) — eleven services, one YAML each; add a service by adding
  one file to the schema in [integrations/README.md](integrations/README.md). A service's optional
  `reference:` names a file in [integrations/references/](integrations/references/).
- [templates/](templates/) — what genesis writes into a new project. Genesis also copies wiring from
  `integrations/registry/`. One folder here holds no project files:
  [templates/user-layer/](templates/user-layer/) is the `~/.claude` layer — the priming file, its hook set, the
  settings block that wires them, and [arm-the-gate.md](templates/user-layer/arm-the-gate.md), the runbook
  that installs the gate's user-level and repository halves in the order that makes each observable.
  [system.md](skills/genesis/system.md) compares a machine's own layer against it and proposes the difference
  a section at a time; none of it is installed wholesale.

## Conventions

- **English-first.** Prose instructions over config a user has to hand-write. The AI generates files; the
  user converses. Machine formats where a machine must parse them.
- **No personalization.** No personal names, no machine-specific paths, no secrets, and no other
  repository's name in any committed file. A repository owner or author, as the subject of a record, is a
  fact and stays.
- **Skill frontmatter:** `name`, `description` (the trigger — make it precise, it is the only
  always-resident part), `license: MIT`, `allowed-tools`. Keep `SKILL.md` lean; push detail into a
  companion file.
- **No agent definitions.** An agent file is a dispatch mechanism welded onto domain knowledge. Ship the
  knowledge as a document read when it applies, and leave the dispatch decision to the session.
- **Markdown links** for file references, relative paths.
- **A README where it carries information.** [skills/](skills/), [templates/](templates/),
  [templates/docs/](templates/docs/), [templates/user-layer/](templates/user-layer/), [hooks/](hooks/),
  [integrations/registry/](integrations/registry/),
  and [integrations/references/](integrations/references/) each have one. Individual skill directories deliberately do not: a skill's frontmatter `description` already states
  what it is and when it applies, and a second file restating that is the duplication
  [standard.md](skills/genesis/standard.md) §3 prohibits. The depth-2 rule genesis ships is for the projects it
  scaffolds, where a bare `src/api/` teaches a reader nothing; applied here it would produce ten stubs.
- **Never read or print secrets** (`.env`, `~/.ssh`, `~/.aws`, tokens) — the deny rules in
  [.claude/settings.json](.claude/settings.json) enforce this for the Read tool; the shell is bound by this
  rule, not by a control.

## Writing an instruction here

Every line genesis ships is read literally by a model on someone else's machine. So:

- **Specific enough to check, and safe if obeyed literally.** A rule that could justify a decision you
  would reject is not finished. Full rubric: [skills/genesis/standard.md](skills/genesis/standard.md) §3.
- **State a property the artifact must have, not the model's conduct.** "The gate is green before a commit"
  is a property. "Verify your work before claiming done" is conduct the model already performs, and
  instructing it produces over-verification. This distinction is what separates what genesis keeps from
  what it removed.
- **One statement, at normal volume.** No ALL-CAPS, no ⛔, no "MANDATORY". Three statements of one rule
  compete rather than reinforce.
- **The test for any hook:** does it check a fact, or override a decision? Facts are fine. A hook that
  removes the ability to stop or the ability to ask is not.

## Two version-sensitive spots

1. **Sandbox key names**, for the projects that opt into one — confirm on the target build via `/sandbox`.
   Genesis generates no sandbox by default, so this bites only where one was requested.
2. **Plugin hooks / Stop JSON shape** — confirm on first run.

Genesis generates conservative defaults and tells the user to confirm. Keep that honesty in any edit.
