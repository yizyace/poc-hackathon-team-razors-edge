# AI Agents Guidelines

<!-- This file is managed by dd-dm -->
<!-- See CONSTITUTION.md for project rules and guidelines -->

## Project Conventions

For project conventions and coding standards, refer to: [CONSTITUTION.md](./CONSTITUTION.md)

The CONSTITUTION.md file contains all engineering rules and conventions that should be followed when working on this project. All AI agents (GitHub Copilot, Claude, etc.) should read and adhere to those guidelines.

---

<!-- dd-dm:custom:start -->
<!-- Add project-specific agent overrides below this line -->
<!-- These overrides will be preserved during dd-dm pull operations -->

## Team

The hackathon team roster and member GitHub profiles live in
[README.md](./README.md#team). Start there for team context in new sessions.

## Marketing / Presentation Site

> **Scope guard:** This section is ONLY about the public demo/marketing
> website. It is intentionally kept separate from the VisionOps application
> (the hackathon project itself). Do not conflate the two. For the app, see
> the spec in `docs/visionops-baseline-specification.md`.

**Decision:** This one repo hosts two distinct deliverables:

1. **The app** — the VisionOps three-agent pipeline (the hackathon project).
   Backend code; Slack is its only polished surface, no product web UI.
2. **The marketing/presentation site** — a public, static demo site published
   via **GitHub Pages**. In progress on branch `feat/docs-presentation-website`.

The repo is **public**, so Pages is free (no GitHub Pro needed).

**Layout — keep the trees separate:**

- App code lives in its own tree (e.g. `agents/` or `src/`).
- The presentation site lives in its own folder (e.g. `web/`).
- Research/spec stays in `docs/`.
- Never serve the app from the site, and never import site assets into the app.

**Publishing (GitHub Pages):**

- Method: GitHub Actions building the site folder → Pages (Settings → Pages →
  Source: GitHub Actions). Avoid "deploy from branch → /docs" — `docs/` holds
  research markdown that Jekyll would try to render as pages.
- Project-page URL: `https://yizyace.github.io/poc-hackathon-team-razors-edge/`.
  It is served under a subpath, so set the build tool's base path to
  `/poc-hackathon-team-razors-edge/` (Vite `base`, Astro `base`, Next
  `basePath`) or every asset 404s.
- Add a `.nojekyll` file at the publish root if the site is a JS build.

**Hard constraint — the site is public static hosting:**

- NO secrets on the site. GMI Cloud / Slack webhook / Phinite keys must never
  ship to the client or be called from it.
- The marketing site is static only: recorded demo, screenshots, narrative, or
  a keyless mock. All live, authenticated calls stay in the app.

<!-- dd-dm:custom:end -->
