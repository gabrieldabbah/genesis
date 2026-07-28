# Arming the stop gate in a repository

The stop gate is four parts across two scopes, and it fails silently when only half of it is present: the
three user-level parts in [`README.md`](README.md) §The gate loop enforce nothing without a repository that
declares a gate, and a repository that declares one is inert on a machine where nothing is wired to read it.
An inert gate someone believes is armed is worse than no gate, because it is the reason they stop checking.

Run the prompt below in the repository being armed — during a genesis build once the project's real test
commands exist, during a transition once `CLAUDE.md` names them, or on its own in any repository afterwards.
It reads, installs the two repo-level files, runs the gate once, and reports; it commits nothing.

```text
Arm the stop gate in this repository. This is a four-part mechanism, not a two-file install, and it
fails silently if only half of it is present. Change no other code and commit nothing — report instead.

0. Confirm the enforcement half exists before installing the repo half. The stop gate is four parts:
   ~/.claude/hooks/mark-edit.sh (records that files were edited), ~/.claude/hooks/stop-gate.sh
   (blocks the stop when a declared gate has not run since the last edit), the settings wiring that
   registers both, and the per-repo .claude/gate.sh + .claude/gate.cmd. Read the settings file and
   confirm both hooks are actually registered — do not infer it from the files existing on disk. If
   any of the three user-level parts is missing or unwired, say so and install it from the same
   source as the template before continuing: a repo gate with nothing enforcing it is inert, and an
   inert gate you believe is armed is worse than no gate at all.

1. Read enough of this repo to know its real verification commands: package manifests and
   scripts, Makefile, CI config, existing CLAUDE.md and docs. Before running anything,
   establish from config — not assumption — what those commands touch: which database instance,
   which services, what they leave behind. If a run would reach anything shared, paid, or
   production, stop and report that instead of running it.

2. Copy ~/.claude/hooks/gate.sh.template to .claude/gate.sh and make it executable. Do not edit
   it — it is the universal runner, identical bytes in every repository.

3. Write .claude/gate.cmd: the exact commands that define done in this repository — plain shell,
   one or many lines, derived from what you read, nothing guessed and nothing aspirational. If
   this repository genuinely has no meaningful gate (a records folder, a research repo), write
   no gate.cmd, and say so in your report — that is a valid outcome, not a failure.

4. Run .claude/gate.sh once and put its full output in your report. If it is red, leave it red
   and report why — do not fix code to make it pass, and do not weaken the commands so they
   pass. A red gate honestly reported is a correct result of this task.

5. Add or update a "## The gate" section in CLAUDE.md stating the same commands and one
   sentence: this gate green in the current session is the definition of done. gate.cmd and
   CLAUDE.md must never disagree.

Report: which of the four parts you found already in place and which you installed, with the evidence
for each — a file listing is not evidence that a hook is wired; the commands declared and why those;
what they touch when they run; the run's actual output; and anything you could not verify.
```

## Where the parts come from

Step 0's "the same source as the template" is this folder: [`hooks/mark-edit.sh`](hooks/mark-edit.sh),
[`hooks/stop-gate.sh`](hooks/stop-gate.sh) and the wiring in
[`settings.hooks.jsonc`](settings.hooks.jsonc). Step 2's runner is
[`hooks/gate.sh.template`](hooks/gate.sh.template), and [`hooks/gate.cmd.example`](hooks/gate.cmd.example)
is the shape step 3 writes. Installing any of the three user-level parts changes the user's home directory,
so it is proposed and applied on their go-ahead, never silently.

## Whether a fresh clone stays armed

`.claude/gate.sh` and `.claude/gate.cmd` are ordinary files, so whether the next clone is armed is decided by
the repository's `.gitignore` and nothing else:

- **A project genesis scaffolds tracks `.claude/`** — the shipped [`gitignore.template`](../gitignore.template)
  ignores nothing there — so both files are committed and every clone is armed on arrival.
- **A repository that ignores `.claude/`** keeps the gate per-machine: the declaration survives only in
  `CLAUDE.md` §The gate, and a fresh clone is unarmed until someone runs this prompt again. Say which of the
  two the repository is in when reporting, because it decides whether "armed" is a property of the repository
  or of one checkout.

## What stops it working

- **No `jq`** — `stop-gate.sh` and `mark-edit.sh` both exit 0 without it, so the gate loop is off with nothing
  announcing the loss. [`README.md`](README.md) §Dependencies has the rest, including the Windows case where
  hooks run through PowerShell and cannot execute a `.sh` at all.
- **A gate that nobody can pass** teaches a session to route around it. A red gate is reported red and left
  red; weakening the commands until they pass produces a green that means nothing.
- **`gate.cmd` and `CLAUDE.md` disagreeing.** Two declarations of done drift, and the one a session reads is
  whichever it happened to open. Step 5 is what keeps them one statement in two places.
