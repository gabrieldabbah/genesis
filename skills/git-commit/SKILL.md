---
name: git-commit
description: "Stage, write a Conventional Commits message from the actual diff, commit, and push. Use when the user asks to commit, save work to git, or mentions \"/git-commit\" or \"/commit\". Reads the diff rather than the conversation to pick type and scope, groups unrelated changes into separate commits, refuses to stage a secret, and pushes the branch that was just committed. Never opens a pull request — that is the generate-pr skill."
license: MIT
allowed-tools: Bash, Read
argument-hint: "[type] [scope] [description]"
---

# Commit and push

The message comes from the diff, not from the conversation. What you remember doing and what is actually
staged diverge constantly — a message written from memory describes a commit that was not made.

## Portability

Every command here is POSIX shell and runs on macOS, Linux, WSL2 and Git Bash. On native Windows without
[Git for Windows](https://git-scm.com/downloads/win), Claude Code runs commands through PowerShell, which
cannot execute these — translate them or install Git for Windows. No GNU-only flags are used, so BSD
userland on macOS behaves identically. `git` is the only required binary.

## 1. Read the state before touching it

```bash
git rev-parse --abbrev-ref HEAD          # which branch
git status --porcelain                   # what is modified, staged, untracked
git diff --staged                        # if something is already staged, this is the commit
git diff                                 # otherwise this is the candidate
```

**Someone else's staged work is not yours to commit.** A non-empty index you did not create belongs to
another session or an interrupted one. Commit only what this task changed — stage those paths by name.
`git add -A` sweeps a working tree you have not read.

## 2. Branch

Commit on the current branch. Read the repository's own branch policy — `CLAUDE.md`, `CONTRIBUTING.md`, the
default branch on the remote — and follow it; where it names a working branch, that is where commits go.

- **On the default branch** (`main`/`master`) in a repository that has a separate working branch: ask before
  committing, unless the operator asked for a commit there specifically.
- **Creating a branch is outside this skill.** A request to commit is not a request to branch.

## 3. Group before you write

One logical change per commit. Where the working tree holds two unrelated changes, that is two commits with
two messages, staged by path — not one commit with a message that has to say "and".

## 4. Message

```
<type>[optional scope]: <description>

[optional body — why, not what; the diff already says what]

[optional footer]
```

| Type | For |
|---|---|
| `feat` | a new capability |
| `fix` | a bug fix |
| `docs` | documentation only |
| `style` | formatting, no logic change |
| `refactor` | no behaviour change |
| `perf` | performance |
| `test` | adds or updates tests |
| `build` | build system or dependencies |
| `ci` | CI configuration |
| `chore` | maintenance |
| `revert` | reverts a commit |

Scope is the area the diff actually touches, taken from the changed paths. Description is imperative and
present tense — "add", not "added" — and under 72 characters.

A breaking change takes `!` after the type (`feat!: drop the v1 endpoint`) or a `BREAKING CHANGE:` footer.

Match the repository's existing style before imposing this one: `git log --oneline -20`. A repository that
does not use Conventional Commits gets messages in the form it already uses.

## 5. Check the diff before it becomes permanent

```bash
git diff --staged --name-only | grep -E '(^|/)\.env($|\.)' | grep -vE '\.(example|template|sample)$' \
  && echo "STOP: an env file is staged"
git diff --staged | grep -nE '(sk-[A-Za-z0-9]{12,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(api[_-]?key|secret|token|password)[[:space:]]*[:=][[:space:]]*["'"'"']?[A-Za-z0-9_-]{16,})'
```

A hit is read, not assumed: a fixture, a variable name, or a placeholder is fine; a live value is not.
Unstage a real secret and say so — a value that reaches a commit is compromised even if the next commit
removes it, because the blob stays reachable.

In a public repository, also read the diff for personal names, machine-specific paths, and internal
hostnames.

## 6. Commit

```bash
git commit -m "<type>[scope]: <description>"
```

With a body:

```bash
git commit -m "$(cat <<'EOF'
<type>[scope]: <description>

<body>
EOF
)"
```

A commit rejected by a hook is fixed and committed again — not retried with `--no-verify`.

## 7. Push

Pushing is the last step of this skill, not a separate request. A commit left local is invisible to every
other machine and reads as "not done".

```bash
git push origin "$(git rev-parse --abbrev-ref HEAD)"
```

- Push the branch just committed to. Pushing the default branch of a repository that has a working branch
  needs the operator to have asked for it.
- **Where the repository states that nothing is pushed without the operator asking, that rule wins** — commit
  locally and report the branch as unpushed.
- On an authentication failure, report it. Do not leave the work local and silent.
- **A push does not run CI.** Read what the repository's workflows trigger on before calling anything
  validated, and say which lanes actually ran.

**Never open a pull request here.** That is the `generate-pr` skill, and it exists for merging a working
branch to production.

## Git safety

- Git config is left as it is.
- `--force`, hard reset, and history rewrites happen only on an explicit request, and `--force` never targets
  the default branch.
- `--no-verify` only when asked.
