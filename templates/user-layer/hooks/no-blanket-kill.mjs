#!/usr/bin/env node
// Global PreToolUse guard (owner incident 2026-07-12): deny BLANKET process kills that key on
// ports or generic dev-runtime names — they take down dev servers of OTHER projects running in
// parallel on the same machine. Kills must be scoped to the current project (match each PID's
// cwd against the repo root) or use TaskStop for harness-tracked background tasks.
//
// Denied shapes:
//   lsof -ti:3000,5173 | xargs kill -9          (port-keyed mass kill)
//   kill $(lsof -ti:3000)                        (same, command substitution)
//   pkill -f node|nodemon|vite|next|npm|...      (machine-wide by generic runtime name)
// Allowed (examples):
//   TaskStop, kill <specific pid>, cwd-scoped loops over lsof output,
//   pkill -f 'Chrome for Testing'                (specific non-generic target)
//
// Safe recipe the reason echoes back:
//   proj="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
//   for pid in $(lsof -ti:PORTS); do
//     case "$(lsof -a -p "$pid" -d cwd -Fn | sed -n 's/^n//p')" in "$proj"*) kill "$pid";; esac
//   done
//
// KNOWN FALSE POSITIVE (deliberate): the regexes test the whole command string, so TEXT that
// embeds a verbatim pattern (e.g. a `git commit -m` message quoting the offending command) is
// also denied. That bias is intentional — a spurious denial costs a rephrase ("port-keyed
// lsof/xargs kill" instead of the literal string); a miss costs another cross-project kill.

let raw = '';
process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('end', () => {
  let cmd = '';
  try { cmd = JSON.parse(raw)?.tool_input?.command || ''; } catch { /* no JSON → allow */ }

  const portPipeKill = /lsof\s+(?:-\w+\s+)*-t?i[^|;&\n]*\|\s*(?:sudo\s+)?xargs\s+(?:-\S+\s+)*kill/;
  const substKill = /\bkill\s+(?:-\w+\s+)*[`$]\(?\s*lsof\s+(?:-\w+\s+)*-t?i/;
  const genericPkill = /\bpkill\b[^|;&\n]*?(?:-f\s+)?['"]?(?:node(?:mon)?|vite|next|npm|pnpm|yarn|bun|webpack|turbo)\b/;

  if (portPipeKill.test(cmd) || substKill.test(cmd) || genericPkill.test(cmd)) {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason:
          'BLANKET KILL BLOCKED (owner rule 2026-07-12): port-keyed or runtime-name kills take down ' +
          'OTHER projects\' dev servers running in parallel. Scope the kill to THIS project instead: ' +
          'proj="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"; for pid in $(lsof -ti:PORTS); do ' +
          'case "$(lsof -a -p "$pid" -d cwd -Fn | sed -n \'s/^n//p\')" in "$proj"*) kill "$pid";; esac; done ' +
          '— or use TaskStop for background tasks the harness started.',
      },
    }));
  }
  process.exit(0);
});
