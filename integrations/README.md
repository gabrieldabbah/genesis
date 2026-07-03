# Integrations registry

The spine that keeps sandbox + secrets + scaffold + workers + security coherent. Each third-party service is
**one YAML file** in [`registry/`](registry/). When the user selects a service in the genesis interview,
genesis applies its entry across the whole project at once.

## What a selected integration wires (automatically)

| field | wired into |
|---|---|
| `domains` | `sandbox.network.allowedDomains` (and only those) |
| `env_keys` | `.env.example` (names only) + the secret-deny lists (`denyRead` + `permissions.deny(Read(...))`) |
| `cli` | if it breaks under the sandbox → `sandbox.excludedCommands` + an "install X" instruction for the user |
| `docs_source` | `docs/SOURCES.md` as a Tier-1 trusted source for the `sources` skill |
| `worker` | the matching specialist agent added to the overlord's roster |
| `security` | items appended to the `security-audit` / `secaudit` checklist |
| `verify` | a seeded acceptance-criteria task in `docs/TODO.md` |
| `fallbacks` | other provider ids to fail over to (resilience); genesis wires the chain + degraded mode per `templates/docs/RESILIENCE.md` |

## Schema

```yaml
id: stripe                      # unique, matches filename
category: payments              # payments | hosting | backend-db | auth | email | storage | ai-media | analytics | observability | queue
domains: [api.stripe.com]       # exact domains this service calls
env_keys: [STRIPE_SECRET_KEY]   # secret NAMES only (never values)
cli: []                         # CLIs it needs; [] if none
sandbox_unfriendly_cli: true    # set when the CLI fails under macOS Seatbelt (→ excludedCommands)
worker: payments                # optional specialist from agents/_library/
security: [pci-surface, webhook-signature-verification]
docs_source: https://docs.stripe.com
verify: "a sandbox-mode charge succeeds and a signed webhook is verified"
notes: "use test-mode keys in dev; live keys are a human gate"
```

## Adding a service (the open-source extension point)

Drop a new `registry/<id>.yaml`. If it needs a new specialist, add `agents/_library/<worker>.md` and reference
it from `worker:`. Never invent a domain, key name, or version — verify against the provider's official docs
(via the `sources` skill) and vet the dependency both-ends before adopting it (constitution A15).

The seed list below is a **starting point, not exhaustive.**
