#!/usr/bin/env bash
# resume-daemon.sh — external resumer. Run by launchd (macOS) or cron on an interval.
# If a genesis run paused itself (.scratch/resume.json exists) and usage has recovered, relaunch headless.
#
# Configure the project dir via GENESIS_PROJECT_DIR (the launchd plist sets this).
set -uo pipefail

PROJECT_DIR="${GENESIS_PROJECT_DIR:-$PWD}"
RESUME="$PROJECT_DIR/.scratch/resume.json"
GOV="$(cd "$(dirname "$0")" && pwd)/usage-governor.sh"
LOG="$PROJECT_DIR/.scratch/usage-guard.log"

ts() { date '+%Y-%m-%dT%H:%M:%S'; }

[ -f "$RESUME" ] || { exit 0; }   # nothing paused; nothing to do

# Only resume once usage has dropped back below the threshold (i.e. the window reset).
STATUS="$(GENESIS_USAGE_THRESHOLD="${GENESIS_USAGE_THRESHOLD:-85}" \
          GENESIS_WINDOW_TOKEN_BUDGET="${GENESIS_WINDOW_TOKEN_BUDGET:-0}" \
          bash "$GOV" 2>/dev/null)"
case "$STATUS" in
  OK\ *)
    echo "$(ts) usage recovered ($STATUS) — resuming genesis in $PROJECT_DIR" >> "$LOG"
    cd "$PROJECT_DIR" || exit 1
    # Resolve the CLI explicitly — launchd's PATH is minimal and `claude` may live under nvm/fnm/npm-global.
    CLAUDE_BIN="$(command -v claude 2>/dev/null)"
    [ -n "$CLAUDE_BIN" ] || { echo "$(ts) 'claude' not on PATH — cannot resume; leaving resume.json in place to retry" >> "$LOG"; exit 0; }
    # Cap retries so a persistently-failing resume can't relaunch every tick forever (burning a turn each time).
    ATTEMPTS_FILE="$PROJECT_DIR/.scratch/resume-attempts"; MAX_ATTEMPTS="${GENESIS_RESUME_MAX_ATTEMPTS:-3}"
    attempts="$(cat "$ATTEMPTS_FILE" 2>/dev/null || echo 0)"; case "$attempts" in ''|*[!0-9]*) attempts=0;; esac
    if [ "$attempts" -ge "$MAX_ATTEMPTS" ]; then
      echo "$(ts) resume failed ${attempts}x (>= $MAX_ATTEMPTS) — giving up to avoid a relaunch loop; resume.json left in place, resume manually." >> "$LOG"; exit 0
    fi
    # Mark in-flight so a second tick can't double-launch. Genesis Phase R removes .inflight on successful re-entry.
    mv "$RESUME" "$RESUME.inflight" 2>/dev/null
    # Headless + unattended, so: (1) invoke the skill by its NAMESPACED slash id `/genesis:genesis` — a bare
    # `/genesis` or plain NL prompt may not expand in -p mode (verify the exact id on your build); the genesis
    # plugin must be installed (globally) for it to resolve. (2) bypass interactive permission prompts — there
    # is no TTY, and the OS sandbox in .claude/settings.json is the real guardrail (this runs as a LaunchAgent
    # = YOU, not root; bypassPermissions refuses to start as root). (3) keep the Opus tier the overlord needs.
    "$CLAUDE_BIN" -p "/genesis:genesis Resume the paused genesis build." \
      --permission-mode bypassPermissions --model opus >> "$LOG" 2>&1
    # If Phase R re-entered cleanly it removed .inflight (success → clear the counter). If it's still here the
    # resume did NOT complete (crash/hang/skill-didn't-load) — restore resume.json AND bump the attempt counter
    # so repeated failures eventually stop instead of looping. (.inflight presence is the only honest success
    # signal: a failed launch can still exit 0 as a plain chat turn.)
    if [ -f "$RESUME.inflight" ]; then
      mv "$RESUME.inflight" "$RESUME" 2>/dev/null
      echo $((attempts + 1)) > "$ATTEMPTS_FILE"
      echo "$(ts) resume did not complete (attempt $((attempts + 1))/$MAX_ATTEMPTS) — restored resume.json for retry" >> "$LOG"
    else
      rm -f "$ATTEMPTS_FILE" 2>/dev/null
    fi
    ;;
  PAUSE\ *)
    echo "$(ts) still over threshold ($STATUS) — waiting" >> "$LOG"
    ;;
  *)
    echo "$(ts) usage unknown ($STATUS) — waiting (will retry)" >> "$LOG"
    ;;
esac
