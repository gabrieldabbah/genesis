# `hooks/` — the plugin's own hook

[`hooks.json`](hooks.json) registers one Stop hook on machines that install genesis:
[`stop-acceptance.mjs`](stop-acceptance.mjs).

**It checks a fact and nothing else:** a genesis build is in flight (`.scratch/acceptance.json` exists) and
that file says its criteria are not yet met. The build wrote the file; the hook does not judge whether the work
is good.

**It is self-inert.** With no `.scratch/acceptance.json` in the working directory it exits 0 silently, so it
never touches an ordinary session in an unrelated repository. Verify with
`echo '{}' | node hooks/stop-acceptance.mjs; echo $?` → `0`, no output.

**It cannot wedge a session.** Every parse failure allows the stop — malformed JSON, an empty file, a missing
or non-numeric field. Two independent ceilings stop it insisting: the build's own `max_iterations`, and a
count of the blocks the script itself has issued.

**Node, not shell, and the reason is the blast radius.** The first version parsed with `jq`, which neither
macOS nor Windows ships — and its absence took the fail-open path, so the gate was off and nothing said so.
The command in [`hooks.json`](hooks.json) also quotes `${CLAUDE_PLUGIN_ROOT}`: unquoted, it word-splits on the
first space in the install path, which on Windows is routinely `C:\Users\First Last\…`. Both are checks in
[`../scripts/gate.sh`](../scripts/gate.sh) §7 now rather than things to remember.

This is the only hook genesis registers on an installer's machine. The one it *writes into a scaffolded
project* is [`../templates/todo-archive-reminder.mjs`](../templates/todo-archive-reminder.mjs), a different
file with a different job.

**The test for adding another:** does it check a fact, or override a decision? A hook that refuses to let a
turn end, or denies the question tool, overrides a decision — that is how an agent ends up unable to stop and
unable to ask. Genesis shipped two of those once and removed them.
