---
name: security-audit
description: "Audit a surface for security problems, score them honestly, and turn each into a task with a fix. Use before declaring work done, after wiring an integration, before a deploy handoff, or when the user says \"/security-audit\", \"check security\", \"audit this\", \"is this safe\". Builds the checklist from general application-security concerns plus the per-integration items in the integrations registry. Reports findings with severity, file:line and evidence; states which fixes it applied and which need a human decision; never prints secrets."
license: MIT
allowed-tools: Read, Bash
argument-hint: "[path or 'diff']"
---

# Security audit — score it, fix what is safe to fix, gate the rest

A finding without a location, a reason and a fix is not a finding. An audit that reports "nothing obvious" is
not an audit — it is the absence of one.

## 1. Build the checklist

Start from the domains in §5. Add the per-integration items from each enabled service's registry entry
(`security:` field). Tailor depth to what the thing is: deeper threat modelling for anything network-facing,
data integrity for pipelines, the PCI surface for payments.

## 1a. Where a stronger scanner is installed, it does the hunting

Finding vulnerabilities and deciding what to do about them are different jobs, and this skill is better at the
second than the first. A single read of a surface has no adversarial verification and no coverage accounting,
so where a dedicated scanner is available, hand it the hunt and fold its output in here:

- **Anthropic's `claude-security` plugin**, if installed. `/claude-security` opens its menu; scan a diff for a
  surface just built, or the whole codebase before a handoff. It partitions the tree, threat-models each
  component, and puts every candidate through a three-lens panel that defaults to false-positive — which is the
  part a single pass cannot reproduce. Its `CLAUDE-SECURITY-RESULTS.jsonl` is the evidence to fold in.
- **`/security-review`**, if available.

Three reasons this stays a preference rather than a step: the plugin may not be installed on the machine
running genesis, it cannot be invoked as a skill (only as its own command or agent), and it asks the operator
to accept its cost before starting — which an unattended build cannot answer on their behalf. When none is
available, or the run is unattended, do §2 onward directly and say in the report which path was taken.

**What stays here either way**, because no general scanner covers it: the per-integration checklist from the
registry, dependency advisories, the domain ledger in §5, the fix-versus-gate line in §4, and turning findings
into `docs/TODO.md` items that gate the build.

## 2. Recon before reading

Cheap commands first, so the reading is targeted rather than a scroll:

```bash
# entry points — routes, handlers, resolvers (adjust to the framework)
grep -rnE "app\.(get|post|put|patch|delete)|@(Get|Post|Route)|export (async )?function (GET|POST)" .
# dangerous sinks
grep -rnE "innerHTML|dangerouslySetInnerHTML|eval\(|new Function|execSync|os\.system|pickle\.loads|yaml\.load\(" .
# secrets in code — report LOCATION and TYPE, never the value
grep -rnE "(api[_-]?key|secret|token|password)[[:space:]]*[:=][[:space:]]*['\"][A-Za-z0-9_-]{12,}" .
# config: debug flags, permissive CORS, disabled verification
grep -rnE "DEBUG[[:space:]]*=[[:space:]]*True|origin:[[:space:]]*['\"]\*|rejectUnauthorized:[[:space:]]*false" .
# dependency advisories (whichever applies)
npm audit --omit=dev 2>/dev/null || pip-audit 2>/dev/null || cargo audit 2>/dev/null || govulncheck ./... 2>/dev/null
```

## 3. Score, don't guess

Severity is **impact if exploited**, adjusted by **how hard it is to reach** and **who can reach it**. The same
bug lands differently in different places: reflected XSS on a public login page is not the same finding as the
identical code behind an internal admin login.

| Severity | Meaning |
|---|---|
| **critical** | A direct, likely path to full compromise, mass data exposure, auth bypass — or any live secret. |
| **high** | A serious hole a realistic attacker can exploit. |
| **medium** | A real weakness that needs preconditions, or a meaningful gap in depth. |
| **low** | Minor exposure or a hardening gap, hard to exploit on its own. |
| **info** | Not a vulnerability now. Worth noting because it could compound. |

Then adjust: reachable unauthenticated → **up**. Needs victim interaction or rare preconditions → **down**.
Affects every tenant, or admin → **up**. Exposes credentials, PII or payment data → **up, and never below
high**.

## 4. Fix what is safe to fix; gate the rest

"Fix everything" must not become "silently rewrite security-critical logic". The line:

**Fix directly, with a regression test** — mechanical, small blast radius, no ambiguity about behaviour: a
missing security header or cookie flag; a string-built query replaced with a parameterised one; a dangerous
sink swapped for the safe equivalent; input validation, size limits, output encoding; a vulnerable dependency
moved to a patched version that does not break; a hardcoded secret moved out of code and into the environment;
an obviously wrong config (debug enabled on a production path, `origin: '*'` alongside credentials).

**Do not apply — report with the exact fix and let a human run it:**

- **Rotating a leaked secret.** You may take it out of the source and read it from the environment, but the
  value that was committed is compromised and only its owner can rotate it. Critical, always — never assume a
  leaked key is already dead.
- **Changing who can do what** — authentication or authorisation semantics, session lifetime, MFA. The lockout
  risk is real and the decision is not yours.
- **Anything that deletes or migrates data, or touches money or billing.**
- **New rate limits.** Propose the numbers; imposing them can lock out real users.
- **Cryptographic changes that break existing data** — re-hashing at rest, changing a token format. Needs a
  migration plan.
- **Production infrastructure, IAM, DNS or deploy configuration.**

Anything gated becomes a ranked finding and a `docs/TODO.md` item with the precise remediation, not an edit.

## 5. Cover every domain, and say so

Mark each **evaluated** or **not applicable, with the reason**. "Not applicable" is a real answer — no file
uploads, single tenant, no browser UI — but it has to be *stated*. An unmarked domain is an unfinished audit,
and silence reads identically to "checked, found nothing".

Surface map · authentication · sessions · authorisation and IDOR · multi-tenant isolation · injection · output
encoding and XSS · input, payload and upload validation · CSRF · SSRF · headers, CORS and middleware ·
cryptography · randomness · secret handling · rate limiting and resource exhaustion · information disclosure ·
business logic, races and replay · API surface (REST, GraphQL, gRPC) · dependencies and supply chain ·
configuration · logging and monitoring · inbound webhooks · open redirects · client-side · **memory safety**
(buffer and integer overflow, use-after-free, unsafe FFI — not applicable in a managed language, and say so) ·
AI features called on untrusted input · and the security tests themselves, which are never not applicable —
every fix earns one.

## 6. Report

Each finding as `{severity, file:line, what, why it matters, fix}`, ranked, with the evidence.

Then: what you fixed, what you gated and why, and the domain coverage from §5. Critical and high findings block
"done". Turn every actionable finding into a `docs/TODO.md` item with a `→ verify:` line, via the `todo` skill.

**Never print a secret you find.** Report where it is and that it needs removing and rotating — not its value.
