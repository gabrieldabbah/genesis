<div align="center">

# {{PROJECT_NAME}}

### {{TAGLINE}}

{{ONE_LINE_PITCH}}

[![License](https://img.shields.io/badge/license-{{LICENSE}}-blue.svg)](#license)
![Status](https://img.shields.io/badge/status-{{STATUS}}-orange)
![Stack](https://img.shields.io/badge/stack-{{STACK_BADGE}}-6e56cf)
[![CI]({{CI_BADGE_URL}})]({{CI_URL}})
[![Coverage]({{COVERAGE_BADGE_URL}})]({{COVERAGE_URL}})

</div>

---

> [!NOTE]
> {{PROJECT_NAME}} {{ELEVATOR_PARAGRAPH}}

## Table of contents

- [Features](#features)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Usage](#usage)
- [Architecture](#architecture)
- [Testing](#testing)
- [Deployment](#deployment)
- [Project layout](#project-layout)
- [Contributing](#contributing)
- [FAQ](#faq)
- [License](#license)

<!-- FILL: trim or extend the ToC to match the sections you actually keep. Every heading below must have an
entry here, and every entry must point at a real heading. -->

---

## Features

<!-- FILL: 4–8 bullets, each a concrete capability a reader can verify, not a marketing adjective. Lead with
the verb; one line each. -->

- **{{FEATURE_1_TITLE}}** — {{FEATURE_1_DESC}}
- **{{FEATURE_2_TITLE}}** — {{FEATURE_2_DESC}}
- **{{FEATURE_3_TITLE}}** — {{FEATURE_3_DESC}}
- **{{FEATURE_4_TITLE}}** — {{FEATURE_4_DESC}}

## Quick start

> [!IMPORTANT]
> Requires {{RUNTIME_AND_VERSION}}{{EXTRA_PREREQS}}. The exact, canonical commands live in
> [`AGENTS.md`](./AGENTS.md) §5 — keep this section in step with it.

**1. Install**

```bash
{{CLONE_CMD}}                 # e.g. git clone {{REMOTE_URL}} && cd {{REPO_DIR}}
{{INSTALL_CMD}}               # e.g. npm install · uv sync · go mod download
```

**2. Configure** (copy the env template, fill it locally — see [Configuration](#configuration))

```bash
cp .env.example .env          # then fill in the values; .env is git-ignored, never committed
```

**3. Run**

```bash
{{RUN_CMD}}                   # starts {{WHAT_RUN_DOES}} on {{LOCAL_URL_OR_ENTRYPOINT}}
```

You should see {{EXPECTED_FIRST_OUTPUT}}.

## Configuration

Configuration is read from the environment. **Secrets never live in this file or in git** — copy
[`.env.example`](./.env.example) to `.env` (git-ignored) and fill values locally; `.env.example` documents the
variable **names** only. See [`AGENTS.md`](./AGENTS.md) §6 for the secret-handling rule.

| Variable | Required | Default | Purpose |
|---|:---:|---|---|
| `{{ENV_VAR_1}}` | ✅ | — | {{ENV_VAR_1_PURPOSE}} |
| `{{ENV_VAR_2}}` | ✅ | — | {{ENV_VAR_2_PURPOSE}} |
| `{{ENV_VAR_3}}` | — | `{{ENV_VAR_3_DEFAULT}}` | {{ENV_VAR_3_PURPOSE}} |

<!-- FILL: one row per variable in .env.example, in the same order. Integration keys (e.g. STRIPE_SECRET_KEY,
SUPABASE_URL) are added here when that integration is wired. List names, never values. -->

> [!WARNING]
> Never commit `.env`, paste a secret into chat/logs/issues, or `cat` a secret file. To check a value is set,
> test presence only: `[ -n "${{ENV_VAR_1}}" ] && echo set`.

## Usage

<!-- FILL: the shortest real example that shows the product doing its job — a CLI invocation, an API request,
or a code snippet. Show input and the actual output. Add a second example only if it earns its place. -->

```bash
{{USAGE_EXAMPLE_CMD}}
```

```text
{{USAGE_EXAMPLE_OUTPUT}}
```

{{USAGE_NOTES}}

## Architecture

{{ARCHITECTURE_ONE_PARAGRAPH}}

```mermaid
flowchart LR
    {{ARCH_DIAGRAM_NODES}}
```

The deterministic core is separated from the effectful shell (and, if present, the deterministic↔generative
seam) — the design, the components, and the decisions behind them are in
[`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md), with the rationale logged in
[`docs/DECISIONS.md`](./docs/DECISIONS.md).

## Testing

All development is gated on tests — nothing is *done* until its check has been **run and read**. Run the full
battery before any commit:

```bash
{{TEST_CMD}}                  # the Tier-B gate: lint → typecheck → unit → property → contract → integration
{{TEST_WATCH_CMD}}            # fast Tier-A loop while developing
```

The kinds of tests, the two tiers, the hermetic Docker infrastructure, and the pre-commit gate are documented
in [`docs/TESTING.md`](./docs/TESTING.md). The `test-gate` skill runs the battery and **blocks the commit on
any red**.

## Deployment

{{DEPLOY_ONE_LINE}} The full procedure — environments, secrets, rollback, and the human gates around any
outward-facing or mutating step — is in [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md).

> [!CAUTION]
> Deploys, pushes, and other irreversible/outward-facing actions are **human gates**: review and approve
> before they run. They are never automated silently.

## Project layout

<!-- FILL: a tree to depth 2, one comment per folder. Every folder down to the second level has its own
README.md (what lives here + why) — that depth-2 README rule is mandatory and checked. -->

```
{{REPO_TREE}}
```

The full operating manual for both humans and AI agents is [`AGENTS.md`](./AGENTS.md); the document map is its
§11.

## Contributing

Contributions are welcome. Before opening a PR:

1. Read [`AGENTS.md`](./AGENTS.md) — the conventions, the golden rules, and the workflow.
2. Work on `dev`; keep changes small and surgical; match the surrounding style.
3. Make the gate green: `{{TEST_CMD}}` must pass (the `test-gate` skill enforces it).
4. Use Conventional Commits; open the PR against `dev`.

{{CONTRIBUTING_EXTRA}}

## FAQ

<details>
<summary><b>{{FAQ_Q1}}</b></summary>

{{FAQ_A1}}
</details>

<details>
<summary><b>{{FAQ_Q2}}</b></summary>

{{FAQ_A2}}
</details>

<details>
<summary><b>How do I configure secrets / API keys?</b></summary>

Copy [`.env.example`](./.env.example) to `.env` and fill the values locally. `.env` is git-ignored and is
never committed, logged, or printed. The file documents variable **names** only; see
[Configuration](#configuration).
</details>

<details>
<summary><b>Where do I report a bug or request a feature?</b></summary>

Open an issue at {{ISSUES_URL}}. For bugs, include the steps to reproduce and the real output you saw — a
reproduction is worth more than a description.
</details>

## License

{{LICENSE}}{{LICENSE_LINK}}
