# Theoria Core

Theoria Core is a polished, fully client-side PWA for browsing, learning, authoring, validating, and
compiling MCF 1.0 courses. It has no accounts, server, database, secrets, cloud storage, or required
installation. Progress and authored work stay in the current browser until exported.

## Run locally

Use Node.js 24 LTS:

```bash
npm ci
npm run dev
```

Open `http://localhost:5173`. Run `npm run verify` for formatting, lint, strict types, unit and
integration tests, production build, PWA checks, and static-output inspection. Run
`npm run test:e2e` for the complete desktop/mobile browser journey.

## Architecture

- Vite, React, React Router, and strict TypeScript produce a static `dist/` directory.
- Bundled courses and browser imports enter the same normalized virtual filesystem.
- The browser compatibility layer preserves the parser, validation, ordering, rendering, grading,
  and compilation behavior of pinned `mcf-npm` commit `01e8bb8aab135d99085c0a2fbbc19dea567bd24c`.
- IndexedDB stores local courses and progress. Compilation runs in a Web Worker. ZIP processing is
  bounded and rejects traversal, special files, executable/script extensions, oversized archives,
  and unsafe SVG content.
- The service worker caches the application and bundled course sources. Installation is optional;
  ordinary URLs work on desktop and mobile.

See the [reuse report](docs/reuse-report.md), [deployment guide](docs/deployment.md), and
[project state](PROJECT_STATE.md).

## Browser limitations

- Local data does not sync between browsers or devices. Export source before clearing browser data.
- Storage quotas and folder-selection support vary by browser. ZIP and multi-file selection remain
  available as fallbacks.
- Remote YouTube and remote media require a network connection and display an offline notice.
- Assessment answers are client-visible for self-study and are not secure examinations.

## Short demo

### Development and production verification

Use `npm run dev` for rapid source development. Verify the production PWA, service-worker cache,
install prompt, and offline behavior with `npm run build && npm run preview`, then open the preview
URL (normally `http://localhost:4173`). The dev server is not the production PWA.

1. Open Discover, choose Basic Arithmetic, complete notes, and reload to show saved progress.
2. Open Create, edit the course and lesson, add an assessment question, then preview it.
3. Export its MCF ZIP, open Compile, import the ZIP, validate it, and preview it in Theoria.
4. Download the compiled Theoria ZIP, then show My Courses and its browser-local storage notice.
5. Optionally install the PWA or switch offline to demonstrate the cached shell and bundled courses.

## Connect this repository to GitHub

The intended remote repository name is `theoria`. Create an empty GitHub repository, then run:

```bash
cd /home/apv/theoria-core
git remote add origin git@github.com:YOUR_GITHUB_USERNAME/theoria.git
git push -u origin main
```

No remote is created or overwritten automatically.
