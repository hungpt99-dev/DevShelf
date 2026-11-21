# External link health

`.github/workflows/link-health.yml` runs weekly and on manual dispatch. `scripts/check-links.ts` reads the committed catalog, checks a polite bounded batch of external URLs one host at a time, uses HEAD with GET fallback, follows redirects, applies a 10-second timeout, and identifies itself with a User-Agent containing the repo URL.

Results go to `public/data/link-health.json`: `status` (`ok`, `redirected`, `broken`, `unknown`), `httpStatus`, `checkedAt` and `consecutiveFailures`. A link is shown as "may be unavailable" only after two consecutive failures. The workflow never fails on a network error and never blocks deployment.

The catalog has a "Hide unavailable" filter, and each detail page has a prefilled "Report broken link" issue link. Issue templates live in `.github/ISSUE_TEMPLATE/`.
