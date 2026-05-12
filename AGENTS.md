# AGENTS.md

Guidance for coding agents working on this repository.

## Project Shape

- Framework: Next.js App Router with TypeScript.
- Styling: plain CSS in `src/app/styles.css`.
- Persistence: local SQLite via Node's built-in `node:sqlite` in `src/lib/db.ts`.
- GitHub integration: REST API helpers in `src/lib/github.ts`.
- PoC detection and scoring: `src/lib/detector.ts`.
- Codex report generation: `src/lib/codex-analyzer.ts`.

## Local Commands

Use these before handing work back:

```bash
npm test
npx tsc --noEmit
npm run build
```

If a dev server is already running, avoid starting a second one unless a different port is intentional.

## Environment

Required for OAuth:

```env
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Recommended for username test mode:

```env
GITHUB_TOKEN=
```

Never commit `.env`, `.env.local`, `data/`, or generated build/cache files.

## Implementation Notes

- Keep public username search limited to public GitHub data.
- Keep OAuth public-repo-only for v1; do not add private repository scopes unless the product scope changes.
- Keep repository sampling bounded. Do not clone full repositories for routine analysis.
- Preserve the report shape: `note`, `resume`, `whatsGood`, `whatIsBad`, `howToImprove`.
- Codex analysis should fail clearly when the CLI is unavailable or unauthenticated.
- Prefer small, focused changes over broad refactors.

## UI Guidelines

- This is a work-focused dashboard, not a marketing site.
- Keep cards compact, scannable, and useful for repeated review.
- Preserve responsive behavior for the landing page, dashboard, and repo detail pages.
- Avoid adding instructional text inside the product unless it helps recover from an empty/error state.
