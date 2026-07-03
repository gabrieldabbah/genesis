---
name: media-gen
description: "Generate images, video, audio, or other media via external AI providers, with Claude authoring the prompts and orchestrating the calls. Use when the user asks to generate/create an image, video, audio, icon, or asset, refine a generation prompt, or wire a media/AI provider. Provider-agnostic: works with any provider that has an adapter + an API key in .env (Google, OpenAI, and others — not a fixed list). Claude writes the prompt, calls the API, saves the asset to assets/, and logs cost. Never prints API keys."
license: MIT
allowed-tools: Read, Write, Edit, Bash
argument-hint: "[image|video|audio] <description>"
---

# Media generation — provider-agnostic, key-driven

Claude is the **prompt author and orchestrator**; the media comes from an external provider's API (Anthropic
has no image/video generation — when "Anthropic" is chosen it means Claude writes the prompt and another
provider renders). This is one consumer of the genesis integrations registry: a provider is just an adapter
+ an API key.

## How it works

1. **Pick the provider** from those enabled (an adapter in `integrations/registry/` with category `ai-media`
   and its `*_API_KEY` present in `.env`). If several fit the requested capability (image/video/audio), **pick
   the best per the seed's default / the registry, log the choice in `docs/DECISIONS.md`, and proceed** — don't
   ask (A5). Never assume a provider that has no key configured.
2. **Author the prompt.** Turn the user's request into a strong, specific generation prompt (subject, style,
   composition, constraints, negative prompts, aspect ratio, duration for video). Record it in the asset's
   sidecar so it's reproducible; **proceed — don't stop to confirm the look** (A5).
3. **Call the API.** Use the adapter's endpoint and request shape. Prefer `rtk curl` if available (compact
   output), else `curl`. Read the key from the environment at call time (e.g. `$OPENAI_API_KEY`) — **never
   hardcode, echo, log, or commit a key.** Respect the sandbox network allow-list (the adapter's domains must
   be allow-listed; if a call is blocked, that domain is missing from `settings.json`).
4. **Save the asset** to `assets/` (create it; git-ignore large/binary outputs unless the user wants them
   tracked). Use a descriptive filename + a sidecar `.json` recording {provider, model, prompt, params, time}.
5. **Log cost.** Append an estimate to `assets/COST.md` (provider, model, units, est. price) so spend is visible.

## Rules

- Keys live in `.env` (names mirrored in `.env.example`); they are read at runtime and never surface in output,
  logs, or commits. The sandbox `denyRead` + `permissions.deny(Read(.env*))` protect them.
- Verify the provider/model/endpoint against the adapter and the provider's official docs (via the `sources`
  skill) before calling — don't invent a model name or endpoint.
- Degrade gracefully: if a provider errors or is rate-limited, report it and offer an alternate enabled provider.
- For video/large jobs, respect the seed's cost ceiling / the running `assets/COST.md` budget. If a job would
  exceed it, log it as a `🙋` cost-approval item in `docs/DEPLOYMENT.md` and keep working — don't stop mid-run.
