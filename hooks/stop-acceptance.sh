#!/usr/bin/env bash
# stop-acceptance.sh — genesis acceptance Stop gate.
# Blocks a session from ending while a genesis run's acceptance criteria are NOT yet observed-green.
# SELF-INERT: if there is no .scratch/acceptance.json in the cwd, it does nothing (so it never nags a
# non-genesis session).
#
# Stop-hook contract (confirm on your build via /sandbox or the hooks docs):
#   - print {"decision":"block","reason":"..."} to keep the session going (Claude gets the reason), OR
#   - print nothing / exit 0 to allow the stop.
# Written defensively: any parse problem allows the stop (fail-open) so it can never wedge a session.
set -uo pipefail

cat >/dev/null 2>&1 || true   # drain hook stdin; we don't need it

ACC=".scratch/acceptance.json"
[ -f "$ACC" ] || exit 0       # not a genesis run → allow stop

command -v jq >/dev/null 2>&1 || exit 0   # can't parse → fail-open
jq empty "$ACC" 2>/dev/null || exit 0     # malformed/empty JSON → fail-open (allow stop; never wedge on corruption)

met="$(jq -r '.criteria_met // false' "$ACC" 2>/dev/null)"
iter="$(jq -r '.iteration // 0' "$ACC" 2>/dev/null)"
maxiter="$(jq -r '.max_iterations // 50' "$ACC" 2>/dev/null)"

# Non-integer counters must fail OPEN (allow stop), never fall through to block.
case "$iter" in ''|*[!0-9]*) iter=0 ;; esac
case "$maxiter" in ''|*[!0-9]*) maxiter=50 ;; esac

# Runaway backstop: if we've hit the iteration ceiling, allow stop (the overlord escalates to the human).
if [ "$iter" -ge "$maxiter" ]; then
  exit 0
fi

if [ "$met" = "true" ]; then
  rm -f .scratch/.stop-blocks 2>/dev/null || true   # run finished green → reset our own counter
  exit 0   # criteria observed green → allow stop
fi

# Self-incrementing backstop: the ceiling above relies on the overlord updating .iteration. Count our own
# blocks too, so a session that never updates acceptance.json (or a stale file) can't be re-blocked forever.
blocks=0
[ -f .scratch/.stop-blocks ] && blocks="$(cat .scratch/.stop-blocks 2>/dev/null)"
case "$blocks" in ''|*[!0-9]*) blocks=0 ;; esac
if [ "$blocks" -ge "$maxiter" ]; then
  exit 0   # we alone have blocked $maxiter times → stop insisting (fail-open; a human should look)
fi
printf '%s' "$((blocks + 1))" > .scratch/.stop-blocks 2>/dev/null || true

open="$(jq -r '(.open // []) | join("; ")' "$ACC" 2>/dev/null)"
reason="Genesis acceptance criteria not yet met (iteration $iter/$maxiter). Open: ${open:-unspecified}. Run the workers + test-gate + secaudit, verify the criteria are OBSERVED green, then update .scratch/acceptance.json. Do not stop until criteria_met=true or the iteration ceiling is reached (then escalate to the human)."

# Emit the block decision. Both forms below are tolerated by current builds; the JSON is authoritative.
printf '{"decision":"block","reason":%s}\n' "$(printf '%s' "$reason" | jq -Rs .)"
exit 0
