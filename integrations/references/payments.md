# Payments — what the integration must get right

Read this when wiring a payments provider. Work from the provider's registry entry and its official
documentation via the `sources` skill, never from a remembered API shape: provider APIs version, and a
plausible-looking wrong endpoint fails only under real traffic.

## Properties the integration must have

These are the ones that fail quietly, which is why they are written down rather than left to judgment.

- **Money moves at most once per intent.** Use the provider's idempotency keys on every mutating call, and make
  the handler safe to run twice — the provider *will* deliver a webhook twice, and a retry that charges again
  is not an edge case.
- **Webhook input is untrusted until the signature verifies.** Verify against the raw body, before parsing, and
  reject replays outside the tolerance window. A framework that parses the body before the handler sees it will
  silently break signature verification — check where the raw bytes go.
- **Card data never reaches this application.** Hosted checkout or the provider's elements. The PCI surface is
  a property of the architecture, not something to audit afterwards.
- **Entitlement and ledger land together.** A write that grants access without recording the payment, or
  records it without granting access, is a defect class rather than an edge case. One transaction, or a
  reconciliation path that closes the gap.
- **Test mode throughout.** Build and test the entire flow against sandbox keys. Reference key names only;
  never print or commit a value.

## The tests it needs

At minimum a sandbox charge, a signed-webhook test, and a replayed webhook that is rejected. Record what each
printed, and which of them was not run.

## The live switch is deferred, never asked about

Live keys, real charges, going live: write the exact step into `docs/DEPLOYMENT.md`, mark the item `🙋`, and
keep building.

## Scope

The payment flow the item names — not the pricing page, not the account model, not a refund flow nobody asked
for. A payments integration invites adjacent work; leave it on `docs/TODO.md` rather than building it uninvited.

The provider's registry `security:` items belong to the security pass.
