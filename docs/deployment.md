# Static deployment

Theoria Core is a static application. Its production path is repository → `npm run build` → `dist/`
→ any static host. It has no runtime environment variables, server process, database, object store,
authentication service, or outbound email.

## GitHub Pages

The included Pages workflow runs the complete verification suite and builds with the repository name
as its base path. In GitHub, enable **Settings → Pages → Source → GitHub Actions**, then push
`main`. `404.html` is an exact application-shell fallback, so direct navigation to routes such as
`/theoria/discover` returns to React Router instead of becoming a dead 404.

For a user/organization site or custom domain served at `/`, change `THEORIA_BASE_PATH` in the
workflow to `/`.

## Render Static Site

Create a **Static Site** pointed at the repository with:

- Build command: `npm ci && npm run verify`
- Publish directory: `dist`
- Rewrite: `/*` → `/index.html` with status `200`

No environment variables or paid services are required. If Render serves the site below a path
instead of at the domain root, set non-secret `THEORIA_BASE_PATH` to that path during the build.

## Equivalent hosts

Upload `dist/` and configure unknown paths to return `index.html`. Hosts that cannot rewrite may use
the generated `404.html` fallback. Do not deploy with a Node server; one is neither generated nor
needed.
