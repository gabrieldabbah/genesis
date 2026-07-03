# {{PROJECT_NAME}} — Architecture

> Design and the reasoning behind it. Phased and local-first (A14). Records the *how*; decisions that
> bifurcated scope are logged in [`DECISIONS.md`](./DECISIONS.md).

## 1. Overview

<!-- FILL: the system in one diagram or a short prose description. The major pieces and how data flows. -->

```
{{ARCHITECTURE_DIAGRAM}}
```

## 2. Components

<!-- FILL: each major module/service — responsibility, inputs, outputs, the deterministic↔AI seam (A6). -->

## 3. The deterministic ↔ generative seam *(A6)*

<!-- FILL: what is pure/testable computation vs what is AI/generative. Make the boundary explicit.
     If this project has NO generative/AI component, say so here — "the whole core is deterministic" — and
     the seam invariants (A15/A16/A17) are vacuously satisfied. -->

## 4. Data & contracts

<!-- FILL: the schemas/types at module boundaries; where they're validated. -->

## 5. Phases *(A14 — local-first → interface → deploy)*

1. **Phase 1 — local core.** `{{PHASE_1}}`
2. **Phase 2 — interface/API.** `{{PHASE_2}}`
3. **Phase 3 — deploy.** `{{PHASE_3}}`

## 6. Reproducibility & testing *(A10)*

<!-- FILL: how determinism is enforced (injected clock/seed, input-hash cache) and how it's tested. -->
