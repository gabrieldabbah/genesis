---
name: generate-pr
description: 'Generate a complete pull request from the branch diff and open or update it. Use when the user asks to create/open a PR, fill the PR template, or mentions "/generate-pr". Computes the diff between the current branch and a target branch (default `dev`), fills EVERY section of .github/pull_request_template.md grounded in that diff, and runs `gh pr create`/`gh pr edit`. Honors DRY_RUN=1 to emit out/pr-body.md instead of touching GitHub.'
license: MIT
allowed-tools: Bash, Read, Write
---

# Generate a Pull Request from the Branch Diff

## Overview

Produce a fully-filled pull request — every applicable section of
the project's `.github/pull_request_template.md`, every checkbox the
**evidence** supports — and open or update the PR. **Invocation is the authorization:** run end-to-end
without a confirm prompt.

**Core principle — deterministic vs voice (the constitution's A6).** You (the agent executing this skill)
*are* the voice; there is no separate model call. The split is:
- **Deterministic ("what is true"):** what changed, which type/area boxes to tick, which refs actually
  appear, whether a secret leaked. Gathered from `git`/`gh` — never guessed.
- **Voice (you):** the Summary, the Changes bullets, the verification narrative — prose grounded *only*
  in the deterministic facts.

**Never invent.** A reference, statistic, ticket id, or sign-off that is not in the diff/commits does not
go in the PR. Under-filling a box is recoverable; a fabricated claim is not (provenance: the constitution's
A15). When a fact has no evidence, write `n/a`.

## Arguments & modes

- `$1` (optional) — target branch. Default **`dev`** (work lands on `dev`; `main` holds proven-good only).
- `DRY_RUN=1` (env) — emit the body to `out/pr-body.md` and print the `gh` command instead of touching
  GitHub. Also the automatic fallback when `gh` is missing/unauthenticated. This is how you **test** the
  skill without spamming real PRs.

---

## Step 0 — Preconditions (deterministic)

```bash
CURRENT=$(git rev-parse --abbrev-ref HEAD)
TARGET="${1:-dev}"

# Refuse to PR from a trunk branch.
case "$CURRENT" in dev|main|master) echo "On $CURRENT — checkout a feature branch first." ; exit 1 ;; esac

# Target must exist.
git rev-parse --verify --quiet "$TARGET" >/dev/null || { echo "Target branch '$TARGET' not found." ; exit 1; }

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
id schemes this project uses (axioms `A#`, decisions `D#`, plan tasks, issues):

```bash
LOG=$(git log "$TARGET..HEAD" --format='%B')
DIFF=$(git diff "$TARGET...HEAD")
printf '%s\n%s\n' "$LOG" "$DIFF" | grep -oE '\b(A|P|D)[0-9]+\b' | sort -u   # axioms / propositions / decisions
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
- **How it was verified** — honest. List the relevant commands from the project's `AGENTS.md` §Commands
  for the touched areas, plus any tests the branch added. **Do not claim a command passed unless you
  actually ran it and saw it pass** (verification-before-completion / the constitution's A2). If nothing
  was run, say which commands a reviewer should run.

## Step 3 — Assemble the body

**Read the template fresh** so the body never drifts from the source of truth:

```bash
cat .github/pull_request_template.md
```

Every genesis repo ships this file (Phase 1 lays it down from `templates/.github/`). **If it is absent** (a
non-genesis repo), fall back to a built-in default section set in this order: *Summary · Type of change · Area
touched · Changes · Motivation & context · How it was verified · Definition of Done · Human sign-off* — then
proceed exactly as below. Reproduce its **structure verbatim** — same headers, same order, keep any `<details>` blocks — replacing
each `<!-- … -->` placeholder with filled content. Strip the leading HTML instruction comment. Delete a
whole section only if it genuinely does not apply (the template usually says so). Write the result to a
temp file for `gh`:

```bash
BODY=$(mktemp); printf '%s\n' "$ASSEMBLED_BODY" > "$BODY"
```

## Step 4 — Definition-of-Done checkboxes

Tick a box **only** when the evidence supports it; otherwise leave it unchecked. An honest blank beats a
fabricated tick. Common ones:

- **Reproducible** — tick if the diff introduced no `Date.now()`/`Math.random()` (or equivalent) into core
  logic: `git diff "$TARGET...HEAD" -- 'src/**' | grep -nE 'Date\.now\(|Math\.random\('` (no hits ⇒ safe).
- **No secrets / PII** — tick from the Step 1 scan (it passed).
- **Tests** — tick only if the branch added/updated tests AND you ran them green.
- **Commits Conventional + trailer + targets `dev`** — verify the `Co-Authored-By` trailer is present and
  `$TARGET == dev`: `git log "$TARGET..HEAD" --format='%b' | grep -q 'Co-Authored-By:'`.

**Human-sign-off blocks** (if the template has any — e.g. "reviewed by domain expert") — **never auto-tick
a box that asserts a human's judgment.** Leave it blank and add one line under the checklist noting the
sign-off is pending the operator's review. *(This generalizes the constitution's gate rule, A21.)*

## Step 5 — Create or update the PR (fully automated)

```bash
# Fallback / preview path.
if [ -n "$DRY_RUN" ] || ! command -v gh >/dev/null || ! gh auth status >/dev/null 2>&1; then
  mkdir -p out; cp "$BODY" out/pr-body.md
  echo "Wrote out/pr-body.md. To open the PR:"
  echo "gh pr create --base $TARGET --head $CURRENT --title \"$TITLE\" --body-file out/pr-body.md"
  exit 0
fi

# Update if a PR already exists for this branch, else create. Idempotent — re-runs edit, never duplicate.
if NUM=$(gh pr view --json number -q .number 2>/dev/null); then
  gh pr edit "$NUM" --title "$TITLE" --body-file "$BODY"
  gh pr view "$NUM" --json url -q .url
else
  gh pr create --base "$TARGET" --head "$CURRENT" --title "$TITLE" --body-file "$BODY"
fi
```

Print the resulting PR URL.

---

## Hard rules (red flags — stop if you catch yourself doing these)

- Writing an `A##`/`D##`/`#issue` ref that is **not** in the commits or diff. → Use `n/a`.
- Ticking a human-sign-off box without the human. → Leave blank, note it pending.
- Claiming a verification command passed that you did not run. → Say what a reviewer should run instead.
- Hardcoding/paraphrasing the template instead of reading `.github/pull_request_template.md`. → Read it fresh.
- Pasting any `.env` value or secret into the body. → Already aborted in Step 1; never reach here.
- Opening against `main`. → Default and validate `dev`.
