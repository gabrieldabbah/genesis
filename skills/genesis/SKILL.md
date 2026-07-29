---
name: genesis
description: "Build a new project from an empty folder, or bring an existing repository up to standard. Use when the user says \"/genesis\", \"start a new project\", \"scaffold this\", \"create the project\", or begins greenfield work — and equally when they say \"bring this repo up to standard\", \"modernize my setup\", \"transition this project\", \"my CLAUDE.md is out of date\", \"check my agent setup\", or \"audit my priming\". Three modes: create (empty folder → researched, designed, built, tested project), transition (an existing repository → the standard, including repositories primed for an older model), and system check (the user-level ~/.claude layer). Every run opens with the system check. Also resumes a paused build — \"resume genesis\" or a .scratch/resume.json checkpoint."
license: MIT
allowed-tools: Read, Write, Edit, Bash, TodoWrite, WebSearch, WebFetch
argument-hint: "[create | transition | system]"
---

# Genesis — three modes, one standard

Genesis measures everything against [`standard.md`](standard.md). Read it before acting in any mode; it is
the target state, and the mode files are how to reach it.

| Mode | For | Runbook |
|---|---|---|
| **system** | the user-level `~/.claude` layer — is it current, or shaped for an older model? | [`system.md`](system.md) |
| **create** | an empty folder → a researched, designed, built, tested project | [`create.md`](create.md) |
| **transition** | an existing repository → the standard | [`transition.md`](transition.md) |

## Start here — the system check runs first, every time

The user-level layer loads in every session, so a repository fixed under a stale one inherits the staleness.
Run [`system.md`](system.md) §Survey before anything else. It reads only.

Then **one short message and one question**, per [`system.md`](system.md) §Report and confirm: what is wrong,
what genesis will change, "proceed?". Yes applies all of it. No stops. There are no other questions in this
mode — not a menu of sections, not a table to choose from, not a request to pick between behaviours the
standard already decides. The user asked for the standard by invoking genesis.

- **Clean** — one line, then continue to the mode below.
- **`/genesis system`** — the system check is the whole job. Stop after it.

**Open with the finding, not with an explanation of yourself.** No preamble about what genesis is, what the
three modes are, or why the user-level layer matters — the user typed the command, so they know. The first
thing they read is what is wrong on their machine.

## Then pick the mode

Explicit argument wins. Otherwise decide from the folder and say which you picked and why:

- **Empty, or nothing but a README / `.git` / editor config** → **create**.
- **A real codebase** → **transition**. Genesis does not scaffold over existing work.
- **Ambiguous** (a half-built scaffold, a folder with a `docs/` and no code) → say what you see and ask.

**A resume outranks both.** If `.scratch/resume.json` or `.scratch/resume.json.inflight` exists, or
`.scratch/acceptance.json` exists with `criteria_met=false`, this is a paused build relaunching. Go to
[`create.md`](create.md) §Phase R and do nothing else — the foundation, research, design, stack and plan are
already on disk, and re-running the earlier phases would clobber them.

## What every mode ends with

1. **The change, applied.** Not proposed — applied, with what was run and what it printed.
2. **A request for `/doctor`.** Anthropic's `/doctor` measures the repository's configuration under its own
   rubric. Genesis does not run it: ask the user to run it and paste the output back, then apply its mechanical
   findings — dangling references, unused permission rules, broken paths. Where its `CLAUDE.md` proposals
   differ from [`standard.md`](standard.md), the standard decides; say which way you resolved it and why.
3. **The repository's own gate, run.** Whatever `CLAUDE.md` now names as the gate — the test command, the
   build, the lint — run it and record the result. A gate nobody can pass teaches an agent to skip it, so a red
   result found here is a finding rather than an inconvenience.
4. **A report the user can read**, governed by [`standard.md`](standard.md) §11. Lead with what changes what
   they do. Name things in words, never by section number or line range. Collapse everything that was already
   fine into one clause. Where the mode also wrote a durable record, the record holds the detail and the
   message holds the summary — reading the record aloud is how a report becomes a wall of text nobody finishes.
5. **On a first install, the skill roster — after the report, and only then.** Someone meeting genesis for the
   first time now has ten skills and nothing that says what they are for.
   [`system.md`](system.md) §A first install ends by naming the skills holds the trigger and the shape. A
   machine that already carried this standard skips it.

## Subagents

Genesis defines no agents and installs none. Whether to fan out on a `create` build is decided per item against
what the item actually is: delegate genuinely substantial, genuinely independent work, and finish the rest
inline. Work that completes in a handful of tool calls costs more to delegate than to do.

Never dispatch a subagent to check work another subagent just did. Independent work in parallel is the reason
fan-out exists; a second agent re-reading the first agent's output is not.

Transition and system work is inline always: it is judgment about text, and splitting it across contexts loses
the judgment.

## Detail

- [`standard.md`](standard.md) — the rubric all three modes measure against
- [`create.md`](create.md) — phases 0–6 and the resume path
- [`transition.md`](transition.md) — the six-step repository pass
- [`system.md`](system.md) — the user-level survey and its proposals
- [`reference.md`](reference.md) — permissions, integrations, resuming after a stop, the README audit
