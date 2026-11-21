# Static deployment

DevShelf builds to a plain `out/` directory. No server, environment variables, secrets or database are needed.

## GitHub Pages + automatic updates

1. In repository **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions**.
2. The workflow at `.github/workflows/sync-books.yml` has `contents: write`, `pages: write` and `id-token: write`; it uses the built-in `GITHUB_TOKEN` (no repository secret to create, and no token in frontend code).
3. It runs every 6 hours and can be started manually from the Actions tab. The manual `force` input rebuilds and redeploys even if upstream is unchanged.
4. A run with no upstream change validates the existing dataset but skips commit, build and deployment, so Pages is not redeployed unnecessarily.
5. A failed run leaves the last known good dataset and the current Pages deployment in place, writes `scripts/reports/sync-error.md` and adds a failure summary to the run.

```bash
npm ci
npm run build
# deploy the contents of out/
```

`npm run build` runs `prebuild`, which copies the pdf.js worker to `public/pdf/pdf.worker.min.mjs`, then performs a strict typecheck-free static Next.js export.

## Host examples

- Cloudflare Pages: build command `npm run build`, output directory `out`, Node 20+.
- Netlify: build command `npm run build`, publish directory `out`.
- GitHub Pages: build to `out/`, set `basePath` in `next.config.ts` if the site is served from a subpath, and add an empty `out/.nojekyll` if needed.
- Any CDN/object storage: upload `out/` and configure SPA fallback to `404.html` for unknown routes (all catalog routes are pre-rendered, so this is only a safety net).

## Verification before deploy

```bash
npm run validate:data
npm run typecheck
npm run lint
npm run test:parser
npm run build
npm start   # serves out/ locally for a final smoke test
```

## Refreshing the catalog on a schedule

Run `npm run sync && npm run validate:data` in a scheduled job on a machine with network access, commit the updated `public/data/` and `public/content/` files, and redeploy. The app itself never needs to call GitHub at runtime.
