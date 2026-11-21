# Static deployment

DevShelf builds to a plain `out/` directory. No server, environment variables, secrets or database are needed.

## GitHub Pages + automatic updates

1. In repository **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions**.
2. The workflow at `.github/workflows/sync-books.yml` has `contents: write`, `pages: write` and `id-token: write`; it uses the built-in `GITHUB_TOKEN` (no repository secret to create, and no token in frontend code).
3. It runs every 6 hours and can be started manually from the Actions tab. The manual `force` input rebuilds and redeploys even if upstream is unchanged.
4. A run with no upstream change validates the existing dataset but skips commit, build and deployment, so Pages is not redeployed unnecessarily.
5. A failed run leaves the last known good dataset and the current Pages deployment in place, writes `scripts/reports/sync-error.md` and adds a failure summary to the run.
6. Project Pages sites are served from `/<repo>/`; the workflow sets `NEXT_PUBLIC_BASE_PATH=/${{ github.event.repository.name }}` for the build so generated links and direct `public/` fetches work under that prefix. Local builds leave it empty and stay at the root.

```bash
npm ci
npm run build
# deploy the contents of out/
```

`npm run build` runs `prebuild`, which copies the pdf.js worker to `public/pdf/pdf.worker.min.mjs`, then performs a strict typecheck-free static Next.js export.

## Cloudflare Pages (automatic, from the sync workflow)

The sync workflow deploys to Cloudflare Pages on every data-changing run when these repository secrets exist:

| Secret | Value | Token permission |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token | `Account → Cloudflare Pages → Edit` |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID | — |

Add them in **Repo Settings → Secrets and variables → Actions → New repository secret**. The workflow then:

1. Creates the Pages project `devshelf-hungpt99` if it does not exist (production branch `main`).
2. Rebuilds without `NEXT_PUBLIC_BASE_PATH` because `*.pages.dev` serves from the site root.
3. Uploads `out/` with `wrangler pages deploy`.

Expected URL: `https://devshelf-hungpt99.pages.dev` (`devshelf.pages.dev` was already taken). Skip the project-creation step's harmless failure on later runs — it only reports that the project already exists.

Manual deploy from a local clone:

```bash
npm ci
npm run build
npx wrangler pages deploy out --project-name=devshelf-hungpt99 --branch=main
```

`wrangler` is installed by the GitHub Action; no local install is needed for CI. If you prefer Cloudflare's Git integration instead, set build command `npm run build`, output directory `out`, and leave `NEXT_PUBLIC_BASE_PATH` unset; note that Git integration deploys on every push, not only when catalog data changes.

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
