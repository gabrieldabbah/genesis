#!/usr/bin/env bash
# mark-edit.sh — PostToolUse marker on Edit|Write|NotebookEdit.
#
# Records one fact for the stop gate to read: "this session edited files in this repo", as the
# mtime of .git/claude-gate/<session_id>/last-edit. No edits marker → stop-gate.sh treats the
# session as a conversation and never fires. Writes inside .git/ so nothing can ever be committed.
#
# Fail-open everywhere: any missing tool, unparseable input, or non-repo cwd exits 0 silently —
# the worst failure mode is a stop gate that fires less, never a wedged tool call.
set -uo pipefail

command -v jq >/dev/null 2>&1 || exit 0
input="$(cat 2>/dev/null)" || exit 0
[ -n "$input" ] || exit 0

sid="$(printf '%s' "$input" | jq -r '.session_id // empty' 2>/dev/null)"
cwd="$(printf '%s' "$input" | jq -r '.cwd // empty' 2>/dev/null)"
[ -n "$sid" ] && [ -n "$cwd" ] || exit 0

top="$(git -C "$cwd" rev-parse --show-toplevel 2>/dev/null)" || exit 0
gitdir="$(git -C "$cwd" rev-parse --git-dir 2>/dev/null)" || exit 0
case "$gitdir" in /*) ;; *) gitdir="$cwd/$gitdir" ;; esac

# Only edits inside this repo arm the gate — an edit to a file elsewhere (another repo, a global
# config) is not this repo's unverified work. A path we cannot extract still marks: a wrong mark
# costs one bounded block; a wrong skip costs an unguarded stop.
fp="$(printf '%s' "$input" | jq -r '.tool_input.file_path // .tool_input.notebook_path // empty' 2>/dev/null)"
if [ -n "$fp" ]; then
  case "$fp" in "$top"/*) ;; *) exit 0 ;; esac
fi

mkdir -p "$gitdir/claude-gate/$sid" 2>/dev/null || exit 0
touch "$gitdir/claude-gate/$sid/last-edit" 2>/dev/null || true
exit 0
