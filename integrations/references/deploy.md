# Deploy configuration — what "ready to ship" means

Read this when preparing a project to ship. Preparing the deploy and performing it are different jobs: this
covers the first. Work from the hosting integration's registry entry — CLI, domains, environment keys — and its
official documentation via the `sources` skill. Host configuration formats change without notice, and a config
that looks right and is a version stale fails at deploy time, on the operator's turn.

## Properties the configuration must have

- **The build is reproducible from a clean checkout.** Pinned tool versions, an explicit build command, an
  explicit output directory. "It works on this machine" is the failure this prevents.
- **Environment variables are declared by name, everywhere they are needed** — the host's config, the CI
  config, `.env.example`. A missing variable discovered at deploy time is the most common way a handoff stalls.
- **There is a way back.** Say how a bad release is rolled back on this host — a previous deployment promoted,
  an image retagged, a branch reverted. A deploy path without a rollback path is half a deploy path.
- **A health endpoint exists and the deploy checks it**, so "deployed" and "working" are not assumed to be the
  same thing.
- If the project enabled a sandbox, the host's CLI likely needs to sit in `excludedCommands` — Go-based CLIs
  fail TLS verification under it. Keep that list to what actually needs it.

## The deploy itself is the operator's

Production deploys, pushes, domains and DNS need the operator's accounts and identity. Prepare everything —
config, CI, the exact command to run — write it into `docs/DEPLOYMENT.md` with its post-deploy checks, mark the
item `🙋`, and keep building. Local builds and dry runs need no gate.

Record the config diff, what a local build printed, and the exact remaining human steps in order. Never print a
deploy token or secret — variable names only.

## Scope

The deploy configuration for the item. Not a CI matrix nobody asked for, not a caching strategy, not a second
environment.
