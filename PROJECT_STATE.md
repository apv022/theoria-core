# Theoria Core project state

Last updated: 2026-07-19

## Completed

- Reference repositories, pinned commits, browser compatibility boundary, and sample packages were
  inventoried.
- The new browser-only repository and Vite/React/TypeScript/PWA toolchain were defined.
- The responsive static shell, requested route map, accessible theme, bundled catalog, source bundle
  generator, and versioned IndexedDB stores were implemented.
- Five local course packages were preserved. The four newest ZIP candidates match the corresponding
  `mcf-npm/examples` source trees.
- The browser virtual filesystem, MCF parser, rich renderer, six question controls, assessment
  grading, deterministic essay completion, course reader, and IndexedDB progress were implemented.
- The structured authoring studio autosaves to IndexedDB and generates MCF source with chapters,
  ordered lessons, activities, question builders, local media, preview, and ZIP export.
- ZIP/folder import, hostile-path and resource limits, Web Worker validation/compilation, React
  preview, source export, compiled multi-file export, local library, and PWA update/install behavior
  were implemented.
- Compiled ZIPs now include an offline Theoria reader with CommonMark/KaTeX content, remapped local
  media, all response controls, practice checks, assessment scoring, essay completion, navigation,
  and local progress.
- GitHub Pages and Render static deployment guidance, Pages automation, SPA fallbacks, installable
  PWA metadata, update handling, and static-output verification were completed.

## Architecture

- Static Vite application; no server, database, authentication, secrets, or remote persistence.
- IndexedDB for user data, a virtual filesystem for MCF, and a Web Worker compiler boundary.
- `mcf-npm` commit `01e8bb8aab135d99085c0a2fbbc19dea567bd24c` is the semantic baseline.

## Verification

- `npm run content:build`: passed for all five course bundles.
- `npm run typecheck`: passed.
- `npm run lint`: passed with zero warnings.
- `npm test`: passed, 4 files and 11 tests including all five bundled courses.
- `npm run build`: passed; static export and PWA service worker generated.
- `npm run verify`: passed formatting, lint, strict types, 13 unit/integration tests, production
  build, PWA checks, five-course bundle inspection, secret scan, and static fallback verification.
- `npm run test:e2e`: passed 4 desktop/mobile tests covering browse → learn → persisted progress →
  author → export → import → validate → Web Worker compile → compiled ZIP download.
- Production preview returned HTTP 200 for `/`, `/discover`, `/courses/basic-arithmetic/learn`,
  `/create`, `/compile`, `/my-courses`, and `/about` via direct navigation.
- `npm audit --omit=dev`: passed with 0 vulnerabilities.
- `git diff --check`: passed.

## Known limitations

- No GitHub or Render remote was created, pushed, or deployed because remote mutation was not
  authorized.
- IndexedDB data is browser-local and cannot sync across devices. Browser quota and folder picker
  support vary; ZIP and multi-file import are the portable fallbacks.
- Remote video and media require connectivity. Client-visible answers are suitable only for
  self-study, not secure examinations.

## Next task

Connect `/home/apv/theoria-core` to the intended GitHub `theoria` repository using the documented
commands, enable GitHub Pages Actions, or configure an equivalent Render Static Site. No code phase
is required before deployment.
