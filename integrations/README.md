# Integrations registry

Adding a service to a project usually means touching six things and forgetting two of them — the network
rules, the environment variables, the CLI, which docs to trust, the security checklist, the test that proves it
works. Here each service is **one file** in [`registry/`](registry/), and picking it during setup applies all
six at once.

## What a selected integration wires (automatically)

| field | wired into |
|---|---|
| `domains` | the app's own egress config, and `sandbox.network.allowedDomains` if the project enabled a sandbox |
| `env_keys` | `.env.example` (names only) + the secret-deny lists (`denyRead` + `permissions.deny(Read(...))`) |
| `cli` | an "install X" instruction for the user; plus `sandbox.excludedCommands` if a sandbox is enabled |
| `docs_source` | `docs/SOURCES.md` as a Tier-1 trusted source for the `sources` skill |
| `reference` | the domain reference in [`references/`](references/) to read before wiring this service |
| `security` | items appended to the security-audit checklist |
| `verify` | an acceptance-criteria task added to `docs/TODO.md` |
| `fallbacks` | other provider ids to fail over to (resilience); genesis wires the chain + degraded mode per `templates/docs/RESILIENCE.md` |
| `capabilities` | what the service can produce (`image`, `video`, `audio`, `text`) — which requests the project can route to it, and which its `fallbacks` can absorb |

## Schema

```yaml
id: stripe                      # unique, matches filename
category: payments              # payments | hosting | backend-db | auth | email | storage | ai-media | analytics | observability | queue
domains: [api.stripe.com]       # exact domains this service calls
env_keys: [STRIPE_SECRET_KEY]   # secret NAMES only (never values)
cli: []                         # CLIs it needs; [] if none
sandbox_unfriendly_cli: true    # CLI fails under macOS Seatbelt — matters only if a sandbox is enabled
reference: payments             # optional domain reference from integrations/references/
capabilities: []                # ai-media only: [image, video, audio, text] — what it can be asked to produce
fallbacks: []                   # optional: other ids to fail over to, in order
security: [pci-surface, webhook-signature-verification]
docs_source: https://docs.stripe.com
verify: "a sandbox-mode charge succeeds and a signed webhook is verified"
notes: "use test-mode keys in dev; live keys are a human gate"
```

## Adding a service (the open-source extension point)

Drop a new `registry/<id>.yaml`. If the domain has failures that are not obvious from the provider's docs, add
`references/<name>.md` and point at it from `reference:`. Never invent a domain, key name, or version — verify
against the provider's official docs (via the `sources` skill) and vet the dependency both ends before adopting
it.

The list below is a **starting point, not exhaustive.**
