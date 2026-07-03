# Seed: oss-default

> The canonical, public example seed. It shows the shape genesis writes when you say "save this as a seed."
> Copy it to `seeds/private/<name>.md` (untracked) and let genesis fill in machine-specific values there —
> never put real paths, keys, or a private constitution in a committed seed.

A balanced, portable default: a typical web app, conservative sandbox scoped to the current project, generic
trusted sources, no machine assumptions, maximal autonomy with sane human gates. Use it as a starting point;
genesis will ask for anything missing.

```yaml
name: oss-default
archetype: web-app                  # saas | web-app | marketing-site | web-game | cli | library | api | data-ml | other
stack:
  language: typescript
  framework: ""                     # ask
  package_manager: ""               # ask (npm | pnpm | yarn | bun)
  test_runner: ""                   # ask (vitest | jest | pytest | cargo-test | ...)
integrations: []                    # e.g. [supabase, stripe, vercel, resend] — ask, then wire from the registry
sandbox:
  scope: project                    # project | dev-parent  (dev-parent = the folder holding your repos)
  write_path: "."                   # resolved at scaffold; dev-parent is detected/asked, never hardcoded
  network_posture: open             # open | allow-list | hybrid
                                    #   open      = unrestricted outbound (research/browser/AI/general dev);
                                    #               filesystem + secret protection still fully apply
                                    #   allow-list= only the domains below (use for money/PII apps)
                                    #   hybrid    = allow-list + a broad allowance
  network:
    base: [localhost, github, npm-registry, pypi, crates, anthropic-docs]   # OUTBOUND only; used when posture = allow-list/hybrid
    trusted_sources: []             # added to docs/SOURCES.md
  excluded_commands: []             # computed from installed tools + integration/browser CLIs that break under sandbox
  expose_app: never-in-dev-or-test  # do NOT expose the app while building/testing: bind 127.0.0.1, never 0.0.0.0,
                                     # no tunnels; open a public port ONLY at deploy (a human gate). Separate from posture.
autonomy:
  mode: maximize                    # 0 -> 100% in one prompt; run uninterrupted to done
  never_ask: choice-questions       # options all on the plan? do them all in dependency order -- never "which first?"
  decide_and_log: true              # settle any spec/best-practice decision yourself (A5); log in docs/DECISIONS.md
  defer_to_handoff:                 # the ONLY work not to do: it needs the human's identity/secrets.
    - account-creation-or-login     #   never sign up / log in (Stripe, Supabase, hosting, DNS, OAuth, email)
    - live-keys-or-payments         #   test/sandbox only; live keys + real charges are the human's
    - prod-deploy-push-dns          #   prod deploy, git push, DNS, destructive/prod migrations
                                    # build around these in fallback/sandbox mode, document in docs/DEPLOYMENT.md, keep going
  paramount_question: at-start-only # one batched scope-fork at Phase 0 if the prompt leaves it open; then never
  stop_only_when: every-todo-done-reviewed-documented-and-sweep-dry
  max_iterations: 200               # high backstop; usage-guard governs the real limit
usage_guard:
  threshold_pct: 85                 # stop starting new work at this %, below 100 to protect in-flight subagents
  window_token_budget: 0            # set after observing a few `npx ccusage blocks --json` windows
  auto_resume: false                # true once the launchd resumer is installed
constitution: axiomatic-induction   # the public constitution; a private seed may point at a fuller overlay
media_providers: []                 # e.g. [google-gemini, openai] — keys live in .env, never here
```

## Notes (English, for humans)

- Nothing here is machine-specific; `oss-default` is safe to publish. Your real setup lives in a private seed.
- `window_token_budget: 0` means usage-guard reports "unknown" until you calibrate it (watch a couple of
  5-hour windows with `npx ccusage blocks --json` and pick a number that trips a little before your cap).
- To reuse: `/genesis use oss-default` — genesis loads this and asks only the deltas (project name, framework,
  package manager, test runner, integrations, repo URL).
