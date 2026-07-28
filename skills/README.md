# `skills/` — what genesis ships

One directory per skill, each with a `SKILL.md`. Claude Code loads only the `description` in a skill's
frontmatter until the skill is invoked, so that line is what decides whether a skill is found at the right
moment — it is written as a trigger, not a summary.

| Skill | Invoked when |
|---|---|
| [`genesis`](genesis/) | the plugin itself — routes to create, transition or system check |
| [`axiomatic-induction`](axiomatic-induction/) | planning or executing any non-trivial work — the constitution and the reasoning method |
| [`todo`](todo/) | adding, advancing or sorting work; archiving a finished section |
| [`test-gate`](test-gate/) | before a commit and before calling work done |
| [`sources`](sources/) | researching anything, or vetting a dependency |
| [`security-audit`](security-audit/) | after wiring an integration, before a handoff |
| [`repo-hardening`](repo-hardening/) | setting up CI, dependency updates, branch protection |
| [`git-commit`](git-commit/) | committing work and pushing the branch |
| [`generate-pr`](generate-pr/) | a branch is ready for review |

Two skills carry companion files — `genesis` (`SKILL.md` routes and the runbooks hold the detail) and
`axiomatic-induction` (`SKILL.md` is the working summary; `constitution.md` is the full text it summarises).
The rest are a single `SKILL.md`, which is why these directories carry no README of their own: a skill's frontmatter
`description` already states what it is and when it applies, and a second file restating that would be the
duplication [`genesis/standard.md`](genesis/standard.md) §3 exists to prevent.

Genesis defines no agents. Delegation during a build is decided per task, not by a shipped roster.

## What genesis deliberately does not ship

Two jobs are better served by a skill someone else maintains, so genesis states the requirement and points at
the tool rather than shipping a weaker copy of it:

- **Visual design craft** — Anthropic's `frontend-design`
  (`/plugin marketplace add anthropics/claude-code`, then
  `/plugin install frontend-design@claude-code-plugins`). Genesis keeps the *requirements* — the design system,
  every component and screen state, and WCAG AA — in [`templates/docs/DESIGN.md`](../templates/docs/DESIGN.md),
  because an aesthetic skill does not enforce accessibility.
- **Vulnerability hunting** — Anthropic's `claude-security` plugin, folded into
  [`security-audit`](security-audit/) §1a, which keeps the scoring, the per-integration checklist and the
  fix-versus-gate line.

Neither is required: where the plugin is absent, the requirement still stands and the run says which path it
took.
