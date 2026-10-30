# Releasing

Day to day: add a changeset (`npx changeset`) with each user-facing change. On every push to `main` the **Release** workflow opens or updates a "Version Packages" pull request; merging it publishes to npm with provenance (authenticated by npm trusted publishing, no token), then publishes the same version to GitHub Packages (using the
workflow's `GITHUB_TOKEN`; the step skips versions already there, so a failed run is retried on the next push).

## One-time setup (first release)

1. ✅ Repository `furnas-technology/timeline` created, public, `main` pushed.
   Settings → Actions → General → Workflow permissions: tick **Allow GitHub Actions to create and approve pull
   requests** (the Release workflow opens the "Version Packages" PR).
2. On npmjs.com, make sure the `@furnas-technology` organisation exists and you can publish to it.
3. ✅ First publish — npm trusted publishing can only be configured for a package that already exists, so either:
   - publish once by hand: `npm run prepublishOnly && npm run version-packages && npm publish --access public`, or
   - ✅ the `MY_NPM_TOKEN` repository secret (an npm token with publish rights) lets the Release workflow publish.
4. On npmjs.com → `@furnas-technology/timeline` → **Settings** → **Trusted Publisher**, choose **GitHub Actions** and
   enter organization `furnas-technology`, repository `timeline`, workflow filename `release.yml` (environment
   blank). Then delete the `MY_NPM_TOKEN` repository secret; the workflow no longer reads it. Optionally, under
   **Publishing access**, choose "Require two-factor authentication and disallow tokens" so only the workflow can
   publish.
5. Settings → Pages → Build and deployment → Source: **GitHub Actions** (not "Deploy from a branch") so `pages.yml`
   publishes the demos and API docs to https://furnas-technology.github.io/timeline/.
6. Settings → Code security → enable **Private vulnerability reporting**.
7. After the first release, open the package under https://github.com/orgs/furnas-technology/packages and check it is
   linked to the `timeline` repository and its visibility is **Public**. Installing from GitHub Packages always needs
   a token with `read:packages`, even for public packages.
