---
name: parallel-work
description: "Rules for working in a repository where other Claude sessions are editing at the same time — no git writes, no process kills, strict scope, and verification narrowed or deferred so a test run cannot corrupt another session's. Use when the user says another session or agent is running in this codebase, asks to work in parallel mode, or mentions \"/parallel-work\"."
license: MIT
allowed-tools: Read, Edit, Write, Bash
---

# Parallel session mode

Another Claude session is working in this repository right now. The working tree, the running
processes, the git index, and whatever the tests touch are all shared. Assume every one of them has
an owner other than you.

## Rules

1. **No git writes.** Do not commit, push, stage, stash, checkout, reset, restore, merge, rebase, or
   switch branches. Finish the work, leave it uncommitted, and say so. The owner commits.
2. **Diffs you did not make are not yours.** `git status` will show another session's in-flight
   edits. Never revert, clean, or "tidy" them. If a file you are editing changes under you, re-read
   it and merge your change on top — do not overwrite.
3. **Stay inside the requested scope.** Touch only the files the request names or strictly requires.
   No drive-by refactors and no reformatting. A problem in a file you are *not* already editing is
   named in the report and never fixed here — it probably belongs to another session's in-flight
   work, and an unrelated file you edit is a file you are colliding with someone on. A defect in a
   file you are already changing stays yours to fix, in this mode as in every other.
4. **Do not kill processes.** No `pkill`, `killall`, port sweeps, or container teardowns — the dev
   server, test run, or database you would kill probably belongs to the other session. Kill only a
   PID you spawned this turn and captured yourself. Leftovers you did not spawn get reported, not
   killed.

## Verifying without corrupting anyone

**A test run is not a read.** Most suites write: they insert fixtures, truncate or reset a database,
bind a fixed port, populate a cache, or write to a shared build directory. Run one while another
session is mid-run and you corrupt both — and that is worse than a wasted run, because the wreckage
looks like real findings. Rows vanish mid-assertion, a port refuses to bind, a snapshot mismatches,
a count comes back one too high. Whoever reads that output then debugs a bug that does not exist.
Both sessions lose, and the false result is the expensive part.

So verification has three settings here, in order of preference:

1. **Narrow and provably non-interfering.** Run only what covers the change you made — and only after
   checking that it touches nothing shared: no shared database, no fixed port, no shared cache or
   build output, no global truncate/reset/seed in its setup or teardown. **Read the setup and
   teardown before trusting it.** "It's only one test file" is not the same as "it touches nothing
   else" — a per-file hook or a global setup can reset the world on behalf of a single file.
2. **Static checks.** Typecheck, lint, reading the code, a build to a private output path. Usually
   safe, usually catches most of what a suite would, and never collides with anyone.
3. **Don't run it.** If the only honest verification is a full suite, a shared database, or anything
   carrying a global reset — do not run it now. Say what you skipped and why.

**Before any command that touches shared state, look for an active run** — processes, lock files, a
database whose contents are changing under you. If you find one, wait for it or skip; never race it,
and never kill it (rule 4).

**If you ran something anyway and a foreign run was active, the result is not evidence.** Say so
plainly rather than reporting the number as fact. A contaminated green and a contaminated red are
equally worthless.

## Deferring the run is a correct outcome, not a failure

The operator would rather run the suite themselves on a quiet machine and bring back real failures
than read a green that was contaminated or a red that was someone else's collision. Handing back
"changed X; verified Y; did not run Z; run `<command>` when the machine is yours" is a complete
delivery in this mode.

**An automated gate, stop hook, or checklist that demands a full run does not override this.** If
one fires, treat the conflict as something to report, not a reason to race: state that the gate was
not run, why, and the exact command that would run it. A gate result produced while another session
was writing to the same database or port is a result nobody can act on — strictly worse than an
honest "not run". If the shared resources genuinely go quiet, running it then is fine.

## Reporting

End the turn with: what you changed, which files, and the plain statement that it is uncommitted.
Then, explicitly:

- **Verified** — what you actually ran, and its real output.
- **Not verified** — what you deliberately skipped, why, and the command the operator should run.
- **Not yours** — other sessions' in-flight edits you noticed and left alone, so they are not
  mistaken for part of your change.
