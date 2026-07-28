# The user-level layer

The `~/.claude` layer that loads in every session, in every repository, before anything has been asked — kept
here as a reference copy so a session can read a machine's actual layer, compare it against this one, and
propose the difference. [`skills/genesis/system.md`](../../skills/genesis/system.md) is the runbook that does
that; this folder is what it compares against and installs from once the user agrees.

Nothing here is installed by genesis on its own. The home directory is the user's, the changes affect every
repository they open, and several of them are hard to notice going wrong.

| File | Installs as | What it is |
|---|---|---|
| [`CLAUDE.user.md`](CLAUDE.user.md) | `~/.claude/CLAUDE.md` | the priming file, proposed a section at a time |
| [`settings.hooks.jsonc`](settings.hooks.jsonc) | merged into `~/.claude/settings.json` | the `hooks` block that wires the scripts below |
| [`hooks/stop-gate.sh`](hooks/stop-gate.sh) | `~/.claude/hooks/stop-gate.sh` | the Stop gate — see §The gate loop |
| [`hooks/mark-edit.sh`](hooks/mark-edit.sh) | `~/.claude/hooks/mark-edit.sh` | records "this session edited files"; the Stop gate reads it |
| [`hooks/gate.sh.template`](hooks/gate.sh.template) | `~/.claude/hooks/gate.sh.template`, copied per repository to `<repo>/.claude/gate.sh` | the universal gate runner, identical bytes everywhere |
| [`hooks/gate.cmd.example`](hooks/gate.cmd.example) | `<repo>/.claude/gate.cmd` | where a repository declares its own gate commands |
| [`hooks/no-blanket-kill.mjs`](hooks/no-blanket-kill.mjs) | `~/.claude/hooks/no-blanket-kill.mjs` | denies port-keyed and runtime-name process kills that reach other projects |
| [`hooks/instructions-loaded-log.mjs`](hooks/instructions-loaded-log.mjs) | `~/.claude/hooks/instructions-loaded-log.mjs` | appends one line per session naming which instruction files actually loaded |
| [`hooks/context-reground.mjs`](hooks/context-reground.mjs) | `~/.claude/hooks/context-reground.mjs` | re-injects the already-loaded `CLAUDE.md` files near the context tail in a long session — see §Re-grounding |
| [`arm-the-gate.md`](arm-the-gate.md) | nothing — it is a runbook | how to arm the gate in a repository, user-level half confirmed first |

## The gate loop — three files, one fact each

The pieces are inert individually and only mean something together:

1. `mark-edit.sh` (PostToolUse on `Edit|Write|NotebookEdit`) touches a marker inside `.git/claude-gate/` when
   this session edits a file in this repository. A session that edited nothing is a conversation, and the
   gate never fires for it.
2. `<repo>/.claude/gate.cmd` is where the repository states its gate — the same commands its `CLAUDE.md`
   names as the definition of done. `gate.sh` runs that declaration from the repository root and records
   green or red where the Stop hook reads it.
3. `stop-gate.sh` (Stop) blocks the stop when all three of *a gate is declared*, *this session edited files*
   and *the gate has not run since the last edit* hold. Anything else allows the stop silently.

**It ends structurally, not by judgment.** Running the gate updates the marker green *or* red and releases the
hook: a red gate honestly reported is a valid stop, and only a silent one is blocked. The block counter caps
the pathological case at two, and every failure path — no `jq`, unparseable input, a non-repository directory,
an absent marker — allows the stop. A repository that has not declared a gate never arms it at all.

**Half of it installed is the failure mode to watch.** The hooks enforce nothing where no repository declares
a gate, and a declaration is inert on a machine where nothing is wired to read it — in both directions the
result is silence, which reads exactly like a passing gate. [`arm-the-gate.md`](arm-the-gate.md) is the
runbook that installs the halves in the order that makes each one observable, and reports which of the four
parts were already there.

This is the distinction [`skills/genesis/system.md`](../../skills/genesis/system.md) §2 draws between a hook
that checks a fact and one that overrides a decision. A Stop hook that refuses to let a turn end until the
model judges itself finished is the second kind and belongs nowhere; this one asks whether a specific command
has run since a specific edit, which is a fact on disk.

## Re-grounding — the instructions repeated near the tail of a long session

[`hooks/context-reground.mjs`](hooks/context-reground.mjs) (UserPromptSubmit) re-injects
`~/.claude/CLAUDE.md` and the working directory's `CLAUDE.md`, verbatim, once every 150 000 tokens of context
growth. It adds no instruction of its own: the injected bytes are the same files the session already loaded at
its start, under a header saying so.

**The problem it addresses is position, not absence.** In a session that has accumulated hundreds of
thousands of tokens of tool output, the priming files are still in context but sit far behind everything
added since, and instructions further from the tail pull less on behaviour. Repeating them near the tail
restores the position. Whether that measurably changes behaviour is an observation the operator can make and
this file does not assert — what is verifiable is the mechanism: the text is injected, at that cadence, and
nothing else changes.

**Why it is not the `SessionStart` injection §2 of [`system.md`](../../skills/genesis/system.md) warns
about.** That warning is about a hook that makes *its own* standing instruction the loudest voice in every
session, ahead of whatever the user asked for. This one carries no text of its own, adds nothing the user did
not already install, and fires only after the context has grown past the threshold. It supplies no new
authority; it re-supplies existing authority at a position where it is read.

**How it decides, and where that can go quiet.** Hook input carries no token count, so the hook derives
context size from the transcript itself: it reads the last 256 KB of `transcript_path` and takes the final
`usage` record's `input_tokens + cache_creation_input_tokens + cache_read_input_tokens`. That is a **shape
this repository does not control** — if the transcript's usage field is renamed or reordered, the regex
matches nothing, the derived size stays 0, and the hook silently never fires. It fails toward silence in
every direction: no transcript, an unreadable one, no `CLAUDE.md` to inject, any exception at all — exit 0,
no output, prompt unaffected. A hook on the prompt path must never be the reason a prompt does not go
through.

**Cadence and cost.** Each injection is the full byte size of both `CLAUDE.md` files, once per interval, and
it is charged to the user's context. Set `CLAUDE_REGROUND_INTERVAL` (tokens, minimum 50 000, default 150 000)
to change it. One marker file per session under `~/.claude/.reground/` records the context size at the last
injection; markers older than seven days are pruned on each run.

**Read it back rather than assuming it fired:**

```bash
echo '{}' | node ~/.claude/hooks/context-reground.mjs; echo "rc=$?"   # inert on empty input: rc=0, silent
ls -la ~/.claude/.reground/ 2>/dev/null   # one file per session that has re-grounded; its content is a token count
```

An empty `~/.claude/.reground/` after a long session means the hook never reached its threshold — either the
session stayed under it, or the derived size is stuck at 0 because the transcript shape moved.

## What the copy assumes, where it may not hold

The prompt text is verbatim apart from the three removals its header comment names. Where it still assumes
something about a particular setup, that is recorded here rather than by editing the wording:

- **§Search and §rtk** describe a native macOS or Linux build (2.1.117+, where `Grep` and `Glob` are replaced
  by shell-function shims) with `rtk` wired as a `PreToolUse` hook. On a Windows or npm install both tools
  are present and there is no shim layer; with no proxy installed, §rtk describes nothing. The session's own
  function list settles which case a machine is in.
- **§The seam** names the `axiomatic-induction` constitution as the standing law of non-trivial work.
  Genesis ships it as a skill ([`axiomatic-induction`](../../skills/axiomatic-induction/SKILL.md)), so the
  reference resolves once the plugin is installed. Without it, the section's own rules — origins on every
  claim, severity only from read/ran, degrade rather than promote — still stand on their own.
- **§Commits, pushes, and pull requests** names the `git-commit` and `generate-pr` skills. Genesis ships both
  ([`git-commit`](../../skills/git-commit/SKILL.md),
  [`generate-pr`](../../skills/generate-pr/SKILL.md)), so this section holds as written once the plugin is
  installed. Without it, read the section as "the operator asks, per commit and per push", which is the rule
  underneath it.
- **The canary in §0 of the loop** is instrumentation: it makes the read-the-documentation step observable in
  the transcript instead of inferable from behaviour, at a cost of one line per session. It installs with the
  rest of the layer and is not offered as a choice — a session that drops it loses the only direct evidence
  that the instructions loaded. Remove it if the user asks for it gone; do not raise it yourself.

## Dependencies, and what breaks quietly without them

- **`jq`** — `stop-gate.sh` and `mark-edit.sh` parse the hook payload with it. Absent, both exit 0 and the
  gate loop is off with nothing announcing the loss. This is fail-open by design; the alternative is wedging
  a session on a missing binary. macOS and Windows ship no `jq` (`brew install jq`, `winget install
  jqlang.jq`, or the distribution's package manager).
- **`node`** — the three `.mjs` hooks. Present on any machine that will run a build.
- **`git`** — both bash hooks locate the repository with it and write their markers inside `.git/`, so nothing
  they record can ever be committed.
- **A POSIX shell.** These are bash hooks. On native Windows Claude Code runs hooks through Git Bash when Git
  for Windows is installed and through PowerShell when it is not, and PowerShell cannot execute a `.sh` file.
  Install Git for Windows, or do not wire the two bash hooks there.

## Verifying an install rather than assuming it

Each line is a fact you can read back after applying the changes:

```bash
ls -la ~/.claude/CLAUDE.md && wc -lc ~/.claude/CLAUDE.md    # the layer exists, and its size
jq -e '.hooks.Stop, .hooks.PostToolUse' ~/.claude/settings.json   # the wiring parsed and is present
bash ~/.claude/hooks/stop-gate.sh </dev/null; echo "rc=$?"        # inert outside a gated repo: rc=0, silent
echo '{}' | node ~/.claude/hooks/no-blanket-kill.mjs; echo "rc=$?" # allows an empty command: rc=0, silent
echo '{}' | node ~/.claude/hooks/context-reground.mjs; echo "rc=$?" # no transcript, nothing injected: rc=0, silent
tail -1 ~/.claude/instructions-loaded.jsonl | jq -r '.files[]?'    # which instruction files a session loaded
```

The last one is the only way to tell whether a change to a priming file reached a session. Without it, "the
priming is now correct" is inferable only from behaviour — the inference this whole check exists because it is
unreliable.
