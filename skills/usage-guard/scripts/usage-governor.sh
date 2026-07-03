#!/usr/bin/env bash
# usage-governor.sh — estimate current 5h-window usage and decide whether to keep starting new work.
# Prints one line:  OK <pct>  |  PAUSE <pct>  |  UNKNOWN <reason>
# Exit: 0 = continue (OK), 10 = pause (PAUSE/UNKNOWN-after-grace — fail SAFE, not blind).
#
# SELF-CALIBRATING: no manual budget needed. Your cap is estimated as the largest token total of any
# *completed* 5h block in your ccusage history (i.e. the most you've ever spent in a window before the cap).
# Override with GENESIS_WINDOW_TOKEN_BUDGET if you prefer an explicit number.
set -uo pipefail

THRESHOLD="${GENESIS_USAGE_THRESHOLD:-85}"      # pause at/above this %. Keep <=90; subagents spike fast.
BUDGET="${GENESIS_WINDOW_TOKEN_BUDGET:-0}"      # optional explicit override (tokens per window)

fail_safe() { echo "UNKNOWN $1"; exit 10; }     # cannot measure -> PAUSE (so we never blow past the cap blind)

# A budget override must be a non-negative integer; a typo'd value must NOT silently fall through to OK.
case "$BUDGET" in ''|*[!0-9]*) fail_safe "bad-budget-override:'$BUDGET'" ;; esac

command -v jq >/dev/null 2>&1 || fail_safe "jq-not-installed"
JSON="$(npx --yes ccusage blocks --json 2>/dev/null)" || true
[ -n "$JSON" ] || fail_safe "ccusage-no-output"

# active-window token total
ACTIVE="$(printf '%s' "$JSON" | jq -r '
  (.blocks // []) | map(select(.isActive==true)) | .[0]
  | (.totalTokens // .tokenCounts.total // .tokens // empty)' 2>/dev/null)"
[ -n "$ACTIVE" ] && [ "$ACTIVE" != "null" ] || fail_safe "no-active-block"

# cap = explicit budget, else the max token total across completed (non-active, non-gap) blocks
if [ "$BUDGET" -gt 0 ] 2>/dev/null; then
  LIMIT="$BUDGET"
else
  LIMIT="$(printf '%s' "$JSON" | jq -r '
    [ (.blocks // [])[] | select(.isActive!=true and .isGap!=true)
      | (.totalTokens // .tokenCounts.total // 0) ] | max // 0' 2>/dev/null)"
fi
{ [ -n "$LIMIT" ] && [ "$LIMIT" -gt 0 ]; } 2>/dev/null || fail_safe "no-history-to-calibrate (set GENESIS_WINDOW_TOKEN_BUDGET)"

PCT=$(( ACTIVE * 100 / LIMIT ))
if [ "$PCT" -ge "$THRESHOLD" ]; then echo "PAUSE $PCT"; exit 10; fi
echo "OK $PCT"; exit 0
