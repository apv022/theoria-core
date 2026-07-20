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

## Known limitations

- The standalone compiled ZIP intentionally presents safe source content and navigation; expanding
  it to the full in-app interaction model remains before final handoff.
- Browser end-to-end and direct static-route verification remain.

## Next task

Harden validation and ZIP handling, complete exported-reader interactions, then run browser and
static deployment verification.
