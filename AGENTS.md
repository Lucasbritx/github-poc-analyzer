# AGENTS.md

Guidance for coding agents working on this repository.

## Project Shape

- Framework: Next.js App Router with TypeScript.
- Styling: plain CSS in `src/app/styles.css`.
- Persistence: local SQLite via Node's built-in `node:sqlite` in `src/lib/db.ts`.
- GitHub integration: REST API helpers in `src/lib/github.ts`.
- PoC detection and scoring: `src/lib/detector.ts`.
- Codex report generation: `src/lib/codex-analyzer.ts`.
- Next-PoC recommendations: portfolio signals in `src/lib/recommendation-signals.ts` and Codex briefs in `src/lib/codex-recommendations.ts`.

## Local Commands

Use these before handing work back:

```bash
npm test
npx tsc --noEmit
npm run build
```

If a dev server is already running, avoid starting a second one unless a different port is intentional. Do not run `npm run build` while `npm run dev` is still running; both commands write to `.next`, and mixing them can make `/_next/static/...` CSS and JS assets return 404. Stop dev before building, or after a build restart dev from a clean `.next` cache.

## CSS Safety Check

- Before handing back UI work, open or reload `http://localhost:3000/` in the browser and confirm the page is visibly styled, not browser-default HTML.
- Keep `src/app/layout.tsx` importing `./styles.css`; App Router global CSS must stay wired from the root layout.
- Run `npm run test:assets` while the dev server is running to confirm homepage `/_next/static/...` CSS and JS assets return 200.
- If the page appears unstyled or static assets return 404, stop dev, delete the generated `.next` directory, restart dev from `/Users/lucasxavier/Documents/POCs/github-poc-analyzer`, then hard-refresh the browser.
- The `css-health` unit test protects the root stylesheet import and key global classes; update it only when the stylesheet entrypoint intentionally changes.

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
- Preserve the recommendation shape: `title`, `resume`, `whyThisFits`, `suggestedStack`, `mvpScope`, `portfolioValue`, `difficulty`, `estimatedTime`, `nextSteps`, `relatedGaps`, `relatedRepoIds`.
- Codex analysis should fail clearly when the CLI is unavailable or unauthenticated.
- Prefer small, focused changes over broad refactors.

## UI Guidelines

- This is a work-focused dashboard, not a marketing site.
- Keep cards compact, scannable, and useful for repeated review.
- Preserve responsive behavior for the landing page, dashboard, and repo detail pages.
- Avoid adding instructional text inside the product unless it helps recover from an empty/error state.
