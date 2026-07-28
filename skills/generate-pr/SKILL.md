---
name: generate-pr
description: 'Generate a complete pull request when the user asks to create/open a PR, fill the PR template, or mentions "/generate-pr". Fills every section of .github/pull_request_template.md from the branch diff and commits, ticking only the boxes the evidence supports. Discovers the repository''s own branch flow rather than assuming one; aborts if a secret is in the diff; updates the open PR for the branch instead of opening a duplicate.'
license: MIT
allowed-tools: Bash, Read, Write
argument-hint: "[target branch]"
---

# Generate a Pull Request

## Overview

Produce a fully-filled pull request — every applicable section of
`.github/pull_request_template.md`, every checkbox the
**evidence** supports — and open or update the PR.

## Portability

Every command here is POSIX shell and runs on macOS, Linux, WSL2 and Git Bash — no GNU-only flags, so BSD
userland on macOS behaves identically. On native Windows without
[Git for Windows](https://git-scm.com/downloads/win), Claude Code runs commands through PowerShell, which
cannot execute them; translate them or install Git for Windows.

`git` is required. `gh` is optional — without it, or unauthenticated, the skill writes the finished body to
`out/pr-body.md` and prints the command to run, which is also how you test it without opening a real PR.
`jq` is optional and every use below has a fallback, because neither macOS nor Windows ships it.

## Branch policy — read it, do not assume it

Repositories differ: trunk-based, a long-lived integration branch, short-lived feature branches, Git Flow.
Establish this repository's flow before opening anything, from what the repository actually says:

```bash
git rev-parse --abbrev-ref HEAD                                  # where you are
git branch -a --format='%(refname:short)'                        # what exists
git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null    # the remote's default branch
grep -rniE 'branch|pull request' CLAUDE.md CONTRIBUTING.md .github/*.md 2>/dev/null | head
```

The target defaults to the remote's default branch, and `$1` overrides it. If the current branch **is** the
target, there is nothing to promote — stop and say so. Where the repository documents a flow, follow it; where
it documents none and the branch is an ordinary working branch, the default branch is the target. Creating a
branch is outside this skill.

**Deterministic facts versus written prose.** You are the one writing; there is no separate model call.
The split is:
- **Deterministic ("what is true"):** what changed, which type/area boxes to tick, which refs actually
  appear, whether a secret leaked. Gathered from `git`/`gh` — never guessed.
- **Voice (you):** the Summary, the Changes bullets, the verification narrative — prose grounded *only*
  in the deterministic facts.

**Never invent.** A reference, statistic, ticket id, or sign-off that is not in the diff/commits does not
go in the PR. Under-filling a box is recoverable; a fabricated claim is not. When a fact has no
evidence, write `n/a`.

## Arguments & modes

- `$1` (optional) — target branch. Defaults to the remote's default branch, resolved below.
- `DRY_RUN=1` (env) — emit the body to `out/pr-body.md` and print the `gh` command instead of touching
  GitHub. Also the automatic fallback when `gh` is missing/unauthenticated. This is how you **test** the
  skill without spamming real PRs.

---

## Step 0 — Preconditions (deterministic)

```bash
CURRENT=$(git rev-parse --abbrev-ref HEAD)

# Target: the argument, else the remote's default branch, else main.
DEFAULT=$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's|^origin/||')
[ -n "$DEFAULT" ] || DEFAULT=main
TARGET_BRANCH="${1:-$DEFAULT}"

[ "$CURRENT" = "$TARGET_BRANCH" ] && {
  echo "On $CURRENT, which is the target — there is nothing here to promote."; exit 1; }

# Resolve the COMPARISON ref. Prefer the remote-tracking branch — see below for why.
# A repo with no remote is purely local, so the local branch is the only truth available.
if git remote get-url origin >/dev/null 2>&1; then
  git fetch origin --quiet
  TARGET="origin/$TARGET_BRANCH"
else
  TARGET="$TARGET_BRANCH"
fi

# The target must exist.
git rev-parse --verify --quiet "$TARGET" >/dev/null || {
  echo "No '$TARGET' here — branches: $(git branch -a --format='%(refname:short)' | tr '\n' ' ')"
  echo "Create it, or pass the intended target as the argument."
  exit 1
}
```

**Compare against `origin/<target>`, never the local branch.** Nothing advances a local target branch you
never check out — `git pull` on the working branch moves the remote-tracking ref `origin/<target>` and leaves
the local branch wherever it was last checked out. Diffing against it produces a PR body describing commits
that are already on the target, and the mistake is invisible because the numbers look plausible. Local
default-branch refs are routinely dozens of commits behind their remotes while the deployed branch is
perfectly current. The same trap in the other direction is the deploy-consequence rule: **a git ref is not a
deployment** — `origin/<target>` is what a connected host builds from; the local branch is a bookmark this
clone happens to hold.

```bash
# Inputs (three-dot: changes on HEAD since it diverged from TARGET).
git diff --stat "$TARGET...HEAD"
git diff --name-only "$TARGET...HEAD"
git log "$TARGET..HEAD" --format='%s%n%b%n---'      # subjects + bodies + trailers
```

- **Empty diff** (`git diff --quiet "$TARGET...HEAD"`) ⇒ stop: "No changes vs `$TARGET`; nothing to PR."
- Capture the **full** `git diff "$TARGET...HEAD"` to read the actual hunks. **Size guard:** if it is
  larger than ~1500 lines, do **not** read every line — ground your prose in the commit subjects/bodies +
  `--stat` + a few sampled hunks from the most-changed files.

## Step 1 — Deterministic classification ("what is true")

**Type of change** — parse Conventional-Commit types from the `git log` subjects and tick every type present:

| Subject prefix | Box |
| --- | --- |
| `feat` | feat — new capability |
| `fix` | fix — bug fix |
| `docs` | docs — documentation only |
| `refactor` | refactor — no behavior change |
| `perf` | perf — performance |
| `test` | test — adds/updates tests |
| `chore`, `build`, `ci`, `style` | chore — tooling/build/deps |

**Area touched** — map the changed paths (`git diff --name-only`) to whatever area checkboxes the project's
template defines (read it in Step 3). Tick each area the diff actually hits; if the template has no area
section, skip this. Ground the mapping in real paths, never a guess.

**Traceability refs — extract, never invent.** Search the commit messages **and** the diff text for the
id schemes this project uses (decisions `D#`, plan tasks, claim IDs, issues):

```bash
LOG=$(git log "$TARGET..HEAD" --format='%B')
DIFF=$(git diff "$TARGET...HEAD")
printf '%s\n%s\n' "$LOG" "$DIFF" | grep -oE '\bD[0-9]+\b' | sort -u             # decision-log ids
printf '%s\n' "$LOG" | grep -oiE '(closes|fixes|refs) #[0-9]+'              # linked issues
```

Fill **Motivation & context** from these. If a field has no hit, write **`n/a`** — do not guess a
plausible id.

**Secret / PII scan** (informs the "No secrets/PII" box; also a hard stop):

```bash
git diff --name-only "$TARGET...HEAD" | grep -qxE '\.env(\..*)?' && { echo "ABORT: .env in diff"; exit 1; }
git diff "$TARGET...HEAD" | grep -nE '(sk-[A-Za-z0-9]{12,}|API_KEY *= *["'\'']?[A-Za-z0-9]|-----BEGIN [A-Z]+ PRIVATE KEY-----)' && \
  { echo "ABORT: a secret-looking value is in the diff — do not open a PR."; exit 1; }
```

## Step 2 — Prose ("voice" — you write it, grounded only in Step 0/1 facts)

- **Title** — Conventional-Commit aggregate: the dominant `type(scope)` across the branch + a concise
  subject, e.g. `feat(auth): add OAuth device flow`. Lowercase type, imperative subject.
- **Summary** — 1–3 sentences: what this PR does and *why*.
- **Changes** — grounded bullets, one per logical file-group from `--stat`/`--name-only`. Specific, not
  vague ("add `render.ts` multi/single/compact modes", not "improve rendering").
- **How it was verified** — honest. **Discover this repository's verification commands; do not assume
  them.** They live in one of:

  ```bash
  # jq where present; the sed fallback needs nothing, since jq ships on neither macOS nor Windows.
  # Trim only the trailing quote-colon, so a script named "test:unit" survives intact.
  if [ -f package.json ]; then
    jq -r '.scripts | keys[]' package.json 2>/dev/null \
      || sed -n '/"scripts"/,/^[[:space:]]*}/p' package.json \
         | grep -oE '"[a-zA-Z0-9:_.-]+"[[:space:]]*:' \
         | sed 's/^"//; s/"[[:space:]]*:$//' \
         | grep -v '^scripts$'
  fi
  [ -f Makefile ] && grep -E '^[a-zA-Z][a-zA-Z0-9_-]*:' Makefile | cut -d: -f1
  ls .github/workflows/*.y*ml 2>/dev/null
  ```

  List the ones relevant to the touched areas, plus any tests the branch added. A command is reported
  as passing only if it was run and its output read. If nothing was run, say which commands a reviewer
  should run.

## Step 3 — Assemble the body

**Read the template fresh** so the body never drifts from the source of truth:

```bash
cat .github/pull_request_template.md
```

Reproduce its **structure verbatim** — same headers, same order, keep any `<details>` blocks — replacing
each `<!-- … -->` placeholder with filled content. Strip the leading HTML instruction comment. Delete a
whole section only if it genuinely does not apply (the template usually says so). Write the result to a
temp file for `gh`:

```bash
BODY=$(mktemp); printf '%s\n' "$ASSEMBLED_BODY" > "$BODY"
```

## Step 4 — Definition-of-Done checkboxes

Tick a box **only** when the evidence supports it; otherwise leave it unchecked. An honest blank beats a
fabricated tick. Common ones:

- **Build/test gate green** — whatever this repository defines as its gate, discovered above. Tick only
  from a run whose output you read.
- **No secret committed** — `git diff "$TARGET...HEAD" | grep -nEi '(api[_-]?key|secret|token|password|BEGIN [A-Z ]*PRIVATE KEY)'`
- **Commits follow the repository's message convention, and the branch pair is the documented one** — check
  the subjects against `git log --oneline -20` on the target, and confirm `$CURRENT` → `$TARGET_BRANCH`
  matches the flow read in §Branch policy. Where the template asks for a trailer:
  `git log "$TARGET..HEAD" --format='%b' | grep -q 'Co-Authored-By:'`.
- **Anything else the template names** — read it and tick from evidence, never from intent. A hit from a
  scan is not automatically a failure (a seeded generator is fine); each one is read before ticking.

**Human-sign-off blocks** (if the template has any — e.g. "reviewed by domain expert") — **never auto-tick
a box that asserts a human's judgment.** Leave it blank and add one line under the checklist noting the
sign-off is pending the operator's review.

## Step 5 — Create or update the PR (fully automated)

```bash
# Fallback / preview path.
if [ -n "$DRY_RUN" ] || ! command -v gh >/dev/null || ! gh auth status >/dev/null 2>&1; then
  mkdir -p out; cp "$BODY" out/pr-body.md
  echo "Wrote out/pr-body.md. To open the PR:"
  echo "gh pr create --base $TARGET_BRANCH --head $CURRENT --title \"$TITLE\" --body-file out/pr-body.md"
  exit 0
fi

# Update the OPEN PR for this branch if there is one, else create. Idempotent — re-runs edit, never duplicate.
NUM=$(gh pr list --head "$CURRENT" --base "$TARGET_BRANCH" --state open --json number -q '.[0].number')
if [ -n "$NUM" ]; then
  gh pr edit "$NUM" --title "$TITLE" --body-file "$BODY"
  gh pr view "$NUM" --json url -q .url
else
  gh pr create --base "$TARGET_BRANCH" --head "$CURRENT" --title "$TITLE" --body-file "$BODY"
fi
```

**`--state open`, and never `gh pr view` bare.** On a long-lived branch every PR shares the same head, so
`gh pr view` — which resolves the *most recent* PR for the current branch regardless of state — returns
the **last merged** one. The update path then rewrites a merged PR's title and body: it silently edits
shipped history and no new PR is opened, and the original text is gone from every surface a reviewer
reads. Listing open PRs for the exact head/base pair is the only form that cannot select a closed one.

Print the resulting PR URL.

---

## Hard rules (red flags — stop if you catch yourself doing these)

- Writing an `A##`/`D##`/`#issue` ref that is **not** in the commits or diff. → Use `n/a`.
- Ticking a human-sign-off box without the human. → Leave blank, note it pending.
- Claiming a verification command passed that you did not run. → Say what a reviewer should run instead.
- Hardcoding/paraphrasing the template instead of reading `.github/pull_request_template.md`. → Read it fresh.
- Pasting any `.env` value or secret into the body. → Already aborted in Step 1; never reach here.
- Assuming a branch flow instead of reading it, or creating a branch. → Both are outside this skill.
