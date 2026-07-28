#!/usr/bin/env bash
# The gate. What CLAUDE.md means by "done" — every check it names, runnable in one command,
# locally and in CI. Exits non-zero on the first category that fails.
#
# Anything that cannot run headless (the interactive /genesis smoke test) is out of scope here
# and stays a human step; this script says so at the end rather than implying it covered it.
set -uo pipefail
cd "$(dirname "$0")/.."

fails=0
pass() { printf '  ok    %s\n' "$1"; }
fail() { printf '  FAIL  %s\n' "$1"; fails=$((fails + 1)); }

echo "== 1. authored units =="
count=$(find skills -name '*.md' | wc -l | tr -d ' ')
# A zero here means an intercepted command or a broken tree, not a clean repo.
if [ "$count" -gt 0 ]; then pass "$count skill files"; else fail "find returned nothing — check stderr"; fi

echo "== 2. machine-readable files parse =="
for f in .claude-plugin/plugin.json .claude-plugin/marketplace.json hooks/hooks.json \
         .claude/settings.json; do
  if python3 -m json.tool "$f" >/dev/null 2>&1; then pass "$f"; else fail "$f"; fi
done

echo "== 3. executables are syntactically valid =="
while IFS= read -r f; do
  if node --check "$f" >/dev/null 2>&1; then pass "$f"; else fail "$f"; fi
done < <(find .claude/hooks hooks templates -name '*.mjs' -o -name '*.js' 2>/dev/null)
while IFS= read -r f; do
  if bash -n "$f" 2>/dev/null; then pass "$f"; else fail "$f"; fi
done < <(find hooks scripts templates \( -name '*.sh' -o -name '*.sh.template' -o -name '*.cmd.example' \) 2>/dev/null)

echo "== 4. hooks are inert outside a build =="
out=$(echo '{}' | node hooks/stop-acceptance.mjs 2>&1); rc=$?
if [ $rc -eq 0 ] && [ -z "$out" ]; then pass "stop-acceptance.mjs exits 0, silent"; else fail "stop-acceptance.mjs rc=$rc out=$out"; fi
out=$(echo '{}' | node .claude/hooks/todo-archive-reminder.mjs 2>&1); rc=$?
if [ $rc -eq 0 ] && [ -z "$out" ]; then pass "todo-archive-reminder.mjs exits 0, silent"; else fail "todo-archive rc=$rc out=$out"; fi
# The user-layer hooks ship to other people's home directories, so their inertness is a property of this
# repository too: empty input must allow the stop and say nothing.
for h in stop-gate.sh mark-edit.sh; do
  out=$(bash "templates/user-layer/hooks/$h" </dev/null 2>&1); rc=$?
  if [ $rc -eq 0 ] && [ -z "$out" ]; then pass "$h exits 0, silent"; else fail "$h rc=$rc out=$out"; fi
done
out=$(echo '{}' | node templates/user-layer/hooks/no-blanket-kill.mjs 2>&1); rc=$?
if [ $rc -eq 0 ] && [ -z "$out" ]; then pass "no-blanket-kill.mjs exits 0, silent"; else fail "no-blanket-kill rc=$rc out=$out"; fi

echo "== 5. every relative markdown link resolves =="
# templates/ is excluded: its links resolve from a scaffolded project root, not from here.
python3 - <<'PY' || fails=$((fails + 1))
import re, os, glob, sys
bad = []
for f in (x for x in glob.glob('**/*.md', recursive=True) if '.git/' not in x and not x.startswith('templates/')):
    d = os.path.dirname(f)
    for m in re.finditer(r'\[[^\]]*\]\(([^)\s]+)\)', open(f, encoding='utf8', errors='ignore').read()):
        t = m.group(1)
        if t.startswith(('http', '#', 'mailto:')) or '{{' in t:
            continue
        p = t.split('#')[0]
        if p and not os.path.exists(os.path.normpath(os.path.join(d, p))):
            bad.append(f"{f} -> {t}")
for b in bad:
    print(f"  FAIL  {b}")
print(f"  ok    all relative links resolve" if not bad else f"  {len(bad)} broken")
sys.exit(1 if bad else 0)
PY

echo "== 6. folder READMEs =="
# Skill directories are the documented exception (CLAUDE.md §Conventions): a skill's frontmatter
# description already states what it is, so a stub restating it would be duplication.
missing=0
for d in $(find . -mindepth 1 -maxdepth 2 -type d | grep -vE '/\.|node_modules|/dist|/build|^\./skills/[a-z-]+$'); do
  [ -f "$d/README.md" ] || { fail "$d/README.md missing"; missing=1; }
done
[ $missing -eq 0 ] && pass "every non-skill folder to depth 2 has a README"

echo "== 7. properties this repo has committed to =="
# Each of these was a real defect once. They are cheap to check and expensive to rediscover.

[ -d agents ] && fail "agents/ exists — genesis ships no agent definitions" || pass "no agents/ directory"

if grep -rqIE 'MANDATORY|non-negotiable|not optional|this is now law|⛔' \
     --include='*.md' --include='*.jsonc' skills templates integrations hooks \
     --exclude-dir=genesis 2>/dev/null; then
  fail "emphasis vocabulary the standard prohibits (see standard.md §3)"
  grep -rnIE 'MANDATORY|non-negotiable|not optional|this is now law|⛔' \
    --include='*.md' --include='*.jsonc' skills templates integrations hooks --exclude-dir=genesis 2>/dev/null | sed 's/^/        /'
else
  pass "no prohibited emphasis vocabulary"
fi

# Every `$` in a hook command sits inside double quotes. An unquoted ${CLAUDE_PLUGIN_ROOT} word-splits on
# the first space in the install path — which on Windows is routinely `C:\Users\First Last\…` — and the hook
# then fails on every stop with exit 127. Shipped unquoted once; this is that defect as a check.
python3 - <<'PY' || fails=$((fails + 1))
import glob, re, sys
bad = []
for f in ['hooks/hooks.json'] + glob.glob('templates/**/settings*.json*', recursive=True):
    text = open(f, encoding='utf8').read()
    for m in re.finditer(r'"command"\s*:\s*"((?:[^"\\]|\\.)*)"', text):
        cmd = m.group(1).replace('\\"', '"')
        inside, quoted = False, True
        for ch in cmd:
            if ch == '"':
                inside = not inside
            elif ch == '$' and not inside:
                quoted = False
        if not quoted:
            bad.append(f"{f}: unquoted variable in {cmd!r}")
for b in bad:
    print(f"  FAIL  {b}")
print("  ok    every hook command quotes its path variables" if not bad else "")
sys.exit(1 if bad else 0)
PY

# A registry `reference:` must name a file that exists.
python3 - <<'PY' || fails=$((fails + 1))
import glob, os, re, sys
bad = []
for f in glob.glob('integrations/registry/*.yaml'):
    m = re.search(r'^reference:\s*(\S+)', open(f).read(), re.M)
    if m and not os.path.exists(f"integrations/references/{m.group(1)}.md"):
        bad.append(f"{f} -> references/{m.group(1)}.md")
for b in bad:
    print(f"  FAIL  dangling reference: {b}")
print("  ok    every registry reference: resolves" if not bad else "")
sys.exit(1 if bad else 0)
PY

echo
if [ $fails -eq 0 ]; then
  echo "GATE GREEN ($count units)."
  echo "Not covered here: the interactive /genesis smoke test — install the plugin from this checkout"
  echo "and run /genesis in an empty folder. It needs a real session and cannot run headless."
  exit 0
fi
echo "GATE RED — $fails failing check(s)."
exit 1
