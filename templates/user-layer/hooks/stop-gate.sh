#!/usr/bin/env bash
# stop-gate.sh — fleet-wide Stop gate. Checks three facts and judges nothing:
#
#   1. the repository defines a gate            (.claude/gate.sh exists in cwd)
#   2. this session edited files                (marker written by mark-edit.sh)
#   3. the gate has not run since the last edit (mtime of gate marker vs edit marker)
#
# All three true → block with observation directives, at most MAX_BLOCKS times. Anything else →
# allow silently. In a repo with no .claude/gate.sh, or a session that edited nothing, it is inert.
#
# Termination is structural, not judged. Running .claude/gate.sh updates the gate marker — green
# OR red — and releases this hook: a red gate honestly reported is a valid stop; only a silent one
# is blocked. The block counter bounds the pathological case where the gate cannot run at all.
# The counter resets only when a gate run releases the hook, so edits between blocks cannot mint
# extra blocks — a session gets MAX_BLOCKS total per gate cycle, then the stop is allowed.
#
# Fail-open everywhere: missing jq, unparseable input, non-repo cwd, absent markers — all allow
# the stop, so this can never wedge a session.
#
# Stop-hook contract (same as genesis stop-acceptance.sh; confirm against the hooks docs for your
# build on first firing):
#   print {"decision":"block","reason":"..."} to keep the session going (Claude gets the reason)
#   print nothing / exit 0 to allow the stop
set -uo pipefail
MAX_BLOCKS=2

command -v jq >/dev/null 2>&1 || exit 0
input="$(cat 2>/dev/null)" || exit 0
[ -n "$input" ] || exit 0

sid="$(printf '%s' "$input" | jq -r '.session_id // empty' 2>/dev/null)"
cwd="$(printf '%s' "$input" | jq -r '.cwd // empty' 2>/dev/null)"
[ -n "$sid" ] && [ -n "$cwd" ] || exit 0

top="$(git -C "$cwd" rev-parse --show-toplevel 2>/dev/null)" || exit 0
# A gate is DECLARED when .claude/gate.cmd holds at least one substantive line. gate.sh alone is
# just the universal runner — mechanism without a declaration must not arm the hook.
grep -qvE '^[[:space:]]*(#|$)' "$top/.claude/gate.cmd" 2>/dev/null || exit 0

gitdir="$(git -C "$cwd" rev-parse --git-dir 2>/dev/null)" || exit 0
case "$gitdir" in /*) ;; *) gitdir="$cwd/$gitdir" ;; esac
sdir="$gitdir/claude-gate/$sid"

[ -f "$sdir/last-edit" ] || exit 0             # no edits this session → conversation → allow

gatemark="$gitdir/claude-gate/last-gate-run"
if [ -f "$gatemark" ] && [ "$gatemark" -nt "$sdir/last-edit" ]; then
  rm -f "$sdir/blocks" 2>/dev/null || true     # gate ran after the last edit → released
  exit 0
fi

blocks=0
[ -f "$sdir/blocks" ] && blocks="$(cat "$sdir/blocks" 2>/dev/null)"
case "$blocks" in ''|*[!0-9]*) blocks=0 ;; esac
if [ "$blocks" -ge "$MAX_BLOCKS" ]; then
  exit 0                                       # bounded: never insists more than MAX_BLOCKS times
fi
printf '%s' "$((blocks + 1))" > "$sdir/blocks" 2>/dev/null || exit 0   # can't record the block → don't block

reason="Files were edited this session and the repository's gate has not run since the last edit. Run $top/.claude/gate.sh and report its actual output. Read the complete diff of this session's changes once, whole — not scanning for problems already named. If the gate is red and the blocker is real, report it plainly and stop: a red gate honestly reported is a valid stop; a silent one is not. State what remains unverified. (block $((blocks + 1))/$MAX_BLOCKS)"
printf '{"decision":"block","reason":%s}\n' "$(printf '%s' "$reason" | jq -Rs .)"
exit 0
