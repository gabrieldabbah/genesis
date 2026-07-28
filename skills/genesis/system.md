# System check — the user-level layer

The runbook behind [`SKILL.md`](SKILL.md) §system. Every genesis run opens with §Survey; `/genesis system`
runs the whole file and stops.

**This mode reads, reports and proposes. It does not change anything outside the project without being asked.**
The home directory is the user's, the changes affect every repository they open, and several of them are hard
to notice going wrong. Present findings, propose the edit, wait.

## Why it runs first

The user-level layer loads in every session, in every repository. A repository brought to standard under a
stale user-level file inherits the staleness on the next turn — the strip is undone by whatever the always-on
layer keeps asserting. And the most expensive findings are invisible from inside a project: a session-start
hook injecting a standing instruction, a skill whose description matches every task, a hook that denies the
question tool.

## Survey — read only, report in one pass

Run these and read the output. Nothing here writes.

```bash
ls -la ~/.claude/CLAUDE.md 2>/dev/null && wc -lc ~/.claude/CLAUDE.md
ls -d ~/.claude/skills/*/ 2>/dev/null | wc -l          # user-scope skills
ls -d ~/.claude/skills/*/ 2>/dev/null
ls -d ~/.agents ~/.codex ~/.gemini ~/.cursor 2>/dev/null   # parallel agent config trees
cat ~/.claude/settings.json 2>/dev/null                # hooks, permissions, skillOverrides, env
ls ~/.claude/hooks/ 2>/dev/null                        # the hook scripts the settings above point at
claude --version
git --version 2>/dev/null                              # the gate loop's hooks locate the repo with it
jq --version 2>/dev/null                               # the gate loop's bash hooks parse with it
gh auth status 2>&1 | head -1                          # generate-pr needs this
rtk --version 2>/dev/null                              # see §Tooling below — recommended, not required
```

**These are POSIX-shell commands, and the shell is not a given.** On native Windows Claude Code provides the
Bash tool only where Git for Windows is installed, and otherwise runs commands through PowerShell, where none
of the lines above parse. Establish which one you are in from the session's own tool list before reading an
empty result as a finding — `Get-Content`, `Get-ChildItem` and `$env:USERPROFILE\.claude\` are the equivalents,
and an error message is not the same fact as an absent file.

Report six things, each with what it costs rather than a score. Then the tooling check in §Tooling, briefly.
Never install anything yourself — report and recommend.

**1. Is there a user-level `CLAUDE.md` at all, and what is in it?**

Absent is a finding: everything it would say is then repeated in every repository, or missing everywhere. Too
heavy is a different finding — see §What belongs there.

Read it for the three things [`transition.md`](transition.md) §1 strips, and for the two things that actually
degrade adherence: **the same rule stated more than once**, and **two rules in tension**. Count ALL-CAPS
directives and emphasis stacking; each one is obeyed at face value, including where judgment would have served.

**2. Hooks that override a decision rather than check a fact.**

The test is that one sentence. Report each hook with which side of it the hook falls on.

The two that matter most, because they suppress exactly the behaviour that makes the current model good:

- **A `Stop` hook that refuses to let a turn end.** It converts "I am done, or I am blocked" into another full
  model turn, repeatedly — several times per session in normal use, each one costing a turn and producing work
  the user did not ask for.
- **A `PreToolUse` hook denying the question tool.** The model cannot ask when asking is the right move. Paired
  with the above, the agent can neither ask nor stop, which is a mechanical recipe for confident wrong action.

Also check `SessionStart` hooks: one that injects a standing instruction is active before any prompt, which
makes it the loudest voice in every session regardless of what the user actually asked for.

**A hook present on disk but absent from the settings file is not installed.** Read the wiring, per hook,
rather than inferring it from `ls` — an unwired script and a missing one behave identically and look
different. The gate loop is where this matters most, because it spans two scopes: `mark-edit.sh` and
`stop-gate.sh` wired at the user level, and `.claude/gate.sh` plus `.claude/gate.cmd` in each repository.
Either half alone is silent, and silence reads like a gate that passed.
[`../../templates/user-layer/arm-the-gate.md`](../../templates/user-layer/arm-the-gate.md) installs them in
the order that makes each part observable.

**3. User-scope skills — count, and what each one instructs.**

The number matters less than the kind. Sort each into:

- **Procedure** — how a *task* is done. Worth having; rewrite per [`transition.md`](transition.md) §Rewriting.
- **Behaviour** — how the model should *be*: verify your own work, delegate verification to a subagent, prove
  the postcondition before declaring done, never truncate, always use a skill if one applies. This is the class
  Anthropic's Opus 5 guidance retires, and a stale one costs nothing until it fires — then it substitutes its
  own instructions for judgment at exactly the moment judgment was needed.

Two specific smells: several skills with the same name resolving to different content, and a skill whose
description is broad enough to match every coding task.

**4. `skillOverrides`, or anything disabled-but-present.**

A skill turned off in settings is invisible. Reinstall it later and it silently does not load, and nothing
explains why. Prefer deleted-and-archived over disabled: files that are gone are gone, and the archive is the
record.

**5. Plugins.**

Which are enabled, and is each one maintained against the current model generation? A plugin built for an
earlier generation ships that generation's assumptions into every session. Report usage where the user can
tell you — an enabled plugin nobody invokes is pure cost.

**6. Parallel agent config trees.**

`~/.agents/`, `~/.codex/`, `~/.gemini/` and friends. If the user runs only Claude Code, a second tool's config
tree is dead weight that duplicates the live one and then diverges from it. **Ask before concluding that** —
it is a claim about the user, not about the machine, and it is wrong the moment they use a second tool.

## Tooling — present or missing, and what it costs

None of this is required and none of it is a finding about the user's judgment. Say what is missing and what
stops working.

- **`jq` absent — report this one first where the gate loop is installed.** It is the one missing dependency
  that disarms a control instead of disabling a feature, and it disarms it *quietly*: `stop-gate.sh` and
  `mark-edit.sh` both exit 0 without it, so every stop is allowed as if the gate had run. That is fail-open by
  design — the alternative is wedging a session on a missing binary — so nothing announces the loss. Neither
  macOS nor Windows ships it: `brew install jq`, `winget install jqlang.jq`, or the distribution's package
  manager. Genesis's own acceptance hook does not need it; that one is node, for exactly this reason.
- **`node` absent** — the acceptance Stop gate and the archive hook are both node scripts, and a project that
  cannot run node cannot run them.
- **`git` absent** — the gate loop's hooks locate the repository with it and write their markers inside
  `.git/`; without it they exit 0 and the loop is off.
- **`gh`, unauthenticated or absent** — `/generate-pr` cannot open a pull request.
- **On native Windows, Git for Windows decides whether any `.sh` hook runs at all.** Claude Code executes
  hooks through Git Bash where it is present and PowerShell where it is not, and PowerShell cannot run a shell
  script. The gate loop's two bash hooks are the ones this affects; install Git for Windows, or do not wire
  them there.

**`rtk` absent — recommend it, and explain why rather than just naming it.**

`rtk` is a CLI proxy that sits in front of ordinary shell commands and filters their output before it reaches
the model: `ls`, `tree`, `git`, `gh`, `find`, `diff`, `grep`, test runners, package managers, `docker`, log
files. Same commands, same results, a fraction of the text — upstream reports 60–90% fewer tokens on common
dev commands. Apache-2.0, in `homebrew/core` on macOS and Linux (`brew install rtk`); source and the other install routes at
<https://github.com/rtk-ai/rtk>.

Why it matters more here than for most tools: **command output is where an agentic session's context actually
goes.** A single `npm install`, a failing test suite, or a `git diff` on a real branch can cost more context
than the entire conversation around it. An autonomous build issues thousands of those, and every one is paid
for twice — once in context spent, and once in how much sooner the run hits a usage limit and has to pause. Cut
that and a build simply gets further before stopping.

It installs as a `PreToolUse` hook on `Bash` that rewrites commands transparently, so nothing needs changing in
how anyone works, and it reports its own measured savings with `rtk gain` — so the user can check the benefit
on their own machine instead of taking a number on faith.

Two honest caveats to state alongside the recommendation:

- **An unrelated project publishes the same binary name.** The one meant here is
  <https://github.com/rtk-ai/rtk>, which is what `brew install rtk` resolves to. Confirm with `rtk gain` — if
  that command is unrecognised, the other package is on the path instead.
- **Filtered output is still filtered.** When byte-exact output matters — an exact line number, a precise
  match — the raw form is still available, and genesis never depends on rtk being present.

## What belongs in the user-level file

The organising question: **what does an agent need to know before it is asked anything?** The goal it serves,
how much latitude it has, what must be true of what it produces, what must never appear, and how to record what
it did. Anything not answering one of those belongs elsewhere.

A file that covers this ground is roughly: what a repository is and how it declares itself · scope · claims ·
communication · how conflicting instructions resolve · the bar where a server takes outside input · the bar
everywhere else · what must never appear in an artifact · TODO discipline · build order.

[`../../templates/user-layer/CLAUDE.user.md`](../../templates/user-layer/CLAUDE.user.md) is that shape written
out — the approved layer this standard was derived from, kept verbatim apart from the two machine-specific
removals its header names. Read it as a source of sections to propose, not a file to install: where the user's
existing file already says something in their own words and says it well, theirs wins, and where it assumes a
setup the user does not have, [`../../templates/user-layer/README.md`](../../templates/user-layer/README.md)
§What the copy assumes says which sections those are. Anything from it that survives into their file is a
section they accepted, one at a time, per §Proposing the changes below.

The same folder holds the hook set that runs alongside that file — the gate loop, the blanket-kill guard and
the instructions-loaded log — with what each one costs when it is missing and the command that verifies it was
actually applied.

**What may not go in it:**

1. **Identity.** No personal name, no company, no brand. It loads while working personally, for an employer,
   and for a client — content assuming one is wrong in the other two. Identity belongs in auto-memory, which is
   machine-local and never written into a repository.
2. **Preferences that could be wrong elsewhere.** A preferred database, host or framework: in a client
   repository the stack is the client's. Keep these as *defaults to offer*, not rules to apply.
3. **Anything derivable from a repository**, or true of only one repository. That is the repository's own file.
4. **Verification ceremony.** Instructions to check its own work.
5. **Repetition.** Nothing said twice. Restatements compete rather than reinforce.

Everything in [`standard.md`](standard.md) §3 applies to how each line is written: specific enough to check,
safe if obeyed literally, and stated once.

## Proposing the changes

Order the findings by what each one costs per session, highest first. For each, give the finding, the failure
it produces, and the specific edit. Then ask.

Three rules on the proposal itself:

- **Deletion beats disabling**, and both beat rewriting in place where the file is long enough that nobody will
  re-read it. Archive what is removed somewhere the user can find it.
- **Do not propose a rewrite of the user-level file as one edit.** Propose the sections, so the user can accept
  the ones they agree with. A single 200-line replacement is unreviewable, and this file governs everything
  they do.
- **A change here is measurable, so measure it.** The `InstructionsLoaded` hook appends one line per session to
  `~/.claude/instructions-loaded.jsonl` recording which instruction files actually loaded and why. Without it,
  "the priming is now correct" is inferable only from behaviour, which is the inference this whole check exists
  because it is unreliable. Propose wiring it if it is absent.

## After

Say plainly which findings the user accepted, which they declined, and — for the declined ones — what will keep
affecting the repository work. Then continue to the chosen mode, or stop if this was `/genesis system`.

There is no measurement that says whether priming improved; only weeks of use. So write down the reasoning
behind each change somewhere durable. If a repository comes out wrong later, the recovery is to find the
assumption that was wrong, fix it there, and redo that repository — which only works if the assumption was
written down.
