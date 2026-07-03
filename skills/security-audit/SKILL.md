---
name: security-audit
description: "Run a security pass over the project or a change, one concern at a time, and turn findings into TODO tasks. Use before declaring work done, when the user says \"/security-audit\", \"check security\", \"audit this\", \"is this safe\", or after wiring an integration. Builds the checklist from general application-security concerns plus the per-integration security items from the integrations registry (PCI surface for payments, RLS for Supabase, IAM scope for storage, webhook signatures, secret handling, authz, injection, SSRF). Wraps the bundled security-review where available. Reports findings with severity + evidence; never prints secrets."
license: MIT
allowed-tools: Read, Bash, Grep, Glob, Task
argument-hint: "[path or 'diff']"
---

# Security audit — concern by concern, findings → tasks

Operationalize "check securities one by one, then update the TODO." Be concrete and evidence-based; a finding
without a file:line and a why is not a finding.

## Procedure

1. **Build the checklist.** Start from the baseline below, then add the **per-integration items** from each
   enabled service's registry entry (`security:` field). Tailor depth to archetype (deeper threat-modeling for
   anything network-facing; data-integrity for pipelines; PCI surface for payments).
2. **Run the bundled review.** If `/security-review` is available, run it over the diff/branch and fold its
   output in. Optionally dispatch the `secaudit` worker for a second, independent pass.
3. **Go one concern at a time** (don't blur them):
   - **Secrets** — no keys/tokens in code, logs, or git history; `.env` git-ignored; `.env.example` names only;
     Read/denyRead rules cover secret paths.
   - **AuthN/AuthZ** — every protected route/resource checks identity *and* permission; no IDOR.
   - **Input handling** — injection (SQL/command/template), validation at trust boundaries, output encoding.
   - **SSRF / network** — outbound calls restricted; no user-controlled URLs hitting internal hosts.
   - **Data at rest / in transit** — TLS; least-privilege DB/IAM; PII minimized; backups not world-readable.
   - **Dependencies** — both-ends advisory check via the `sources` skill; no abandoned/typosquatted packages.
   - **Webhooks / callbacks** — signature verification; replay protection.
   - **Per-integration** — the registry `security:` items for each enabled service.
4. **Report** each finding as `{severity: critical|high|medium|low, file:line, what, why, fix}` with evidence.
5. **Update the TODO** — turn every actionable finding into a TODO item (with a `→ verify:`), via the
   `todo` skill. Criticals/highs block "done" (the overlord must not mark acceptance green with an open high).

Never print a secret you find — report its location and that it must be rotated/removed, not its value.
