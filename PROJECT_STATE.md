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

## Architecture

- Static Vite application; no server, database, authentication, secrets, or remote persistence.
- IndexedDB for user data, a virtual filesystem for MCF, and a Web Worker compiler boundary.
- `mcf-npm` commit `01e8bb8aab135d99085c0a2fbbc19dea567bd24c` is the semantic baseline.

## Verification

- `npm run content:build`: passed for all five course bundles.
- `npm run typecheck`: passed.
- `npm run lint`: passed with zero warnings.

## Known limitations

- Reader, authoring, browser compilation/export, and end-to-end tests remain.

## Next task

Implement the browser MCF parser, reader, and local progress.
