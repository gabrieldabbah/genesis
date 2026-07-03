---
name: usage-guard
description: "Keep an autonomous run inside Claude Code subscription usage limits and resume it automatically after they reset. Use when the user asks about usage limits, auto-pause, auto-resume, or \"don't let it die at 100%\", and internally by the genesis overlord between work items. Estimates current 5-hour-window usage from ccusage; at a threshold (default 85%, below 100% on purpose) it stops starting new work/subagents so in-flight workers aren't killed, checkpoints state, and halts cleanly. Ships an external launchd resumer that relaunches Claude after the window resets."
license: MIT
allowed-tools: Read, Write, Bash
argument-hint: "[check] | [install-resumer]"
---

# Usage guard — stop early, protect subagents, auto-resume

There is no official subscription usage-% API. The practical signal is **`ccusage`**, which reads Claude
Code's local session logs. Genesis uses it in two parts.

## Part 1 — Governor (in-session; the valuable, reliable part)

The overlord calls this before every worker dispatch (`/usage-guard check` or the bundled script):

1. Run the helper: `bash "${CLAUDE_PLUGIN_ROOT}/skills/usage-guard/scripts/usage-governor.sh"`.
   It runs `npx ccusage blocks --json` and **self-calibrates**: your cap is estimated as the largest token
   total of any *completed* 5h block in your history (the most you've ever spent in a window). No manual budget
   needed — though `GENESIS_WINDOW_TOKEN_BUDGET` overrides it if you want an explicit number.
2. It prints `OK <pct>` (exit 0), `PAUSE <pct>` (exit 10), or `UNKNOWN <reason>` (exit 10). **Crucially it
   fails SAFE: if it cannot measure usage it returns exit 10 (pause), so a run never barrels blind into the
   cap** — the old behavior that let it hit 100%.
3. **On exit 10 (`pct >= threshold`, default 85%, or unmeasurable)** — deliberately below 100% so the hard cap
   can't kill in-flight subagents: 
   - stop dispatching **new** items / new subagents,
   - let in-flight workers **finish** on the reserve headroom,
   - checkpoint everything to `.scratch/`: `acceptance.json`, the TODO state, uncommitted diffs, and a
     canonical **`resume.json`** so the relaunch can re-enter — genesis **Phase R** reads exactly this shape:
     ```json
     { "next_item": "<the docs/TODO.md id/title to do next>",
       "state": "<one line: what was mid-build when paused, if anything>",
       "expected_reset": "<ISO-8601 time the window is expected to reset>" }
     ```
   - **halt cleanly** (don't crash). A checkpoint is a **silent state-save, not a prompt** — leave a one-line
     note that it paused and when it expects to resume, but **never ask the user to restart it or confirm a
     resume.** The external resumer (Part 2) relaunches it unattended.
4. Else: report headroom and continue.

Helper script: [`scripts/usage-governor.sh`](scripts/usage-governor.sh) (prints `OK <pct>` or `PAUSE <pct>`).

## Part 2 — Resumer (external; survives the multi-hour reset)

A session can't sleep through its own reset and wake itself, so the resumer lives outside Claude. Install once
(`/usage-guard install-resumer`):

- A macOS **launchd** job ([`templates/com.genesis.usage-guard.plist`](templates/com.genesis.usage-guard.plist))
  runs [`scripts/resume-daemon.sh`](scripts/resume-daemon.sh) on an interval. It checks for a paused genesis run
  (`resume.json` present) and, once usage has recovered past the reset, relaunches headless
  `claude -p "/genesis:genesis Resume the paused genesis build." --permission-mode bypassPermissions --model opus` (genesis **Phase R** reads `.scratch/resume.json` and re-enters the build loop) in the project dir.
- Non-macOS: run the same `resume-daemon.sh` from cron or any scheduler.

Installation is a one-time human step (loading a launchd job). Genesis writes the files and shows the two
commands; it does not silently install system jobs.

## Wiring (so it actually fires)

- **The overlord must call the governor before EVERY worker dispatch** — not once per item — because parallel
  subagents spike usage fast. On exit 10 it stops *starting* new work, drains in-flight, checkpoints, halts.
- **Auto-resume only works if the resumer is installed.** If the user wants unattended/overnight runs, install
  the launchd job up front (during machine setup or when autonomy is enabled) — don't leave it for later, or a
  paused run just sits there. Without it, the in-session pause+checkpoint still protects the work; the user
  resumes manually with `claude -p "/genesis:genesis Resume the paused genesis build." --permission-mode bypassPermissions --model opus` (genesis **Phase R** reads `.scratch/resume.json` and re-enters the build loop).

## First-run note (honest)

`ccusage`'s exact JSON fields can vary by version. The governor tries several field names and **fails safe**
(pauses) if it can't read them — so the worst case is an over-cautious pause, never a blind run into the cap.
First-window edge: if there's no completed block yet to calibrate from, set `GENESIS_WINDOW_TOKEN_BUDGET` once.
