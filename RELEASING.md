# Releasing

Day to day: add a changeset (`npx changeset`) with each user-facing change. On every push to `main` the **Release** workflow opens or updates a "Version Packages" pull request; merging it publishes to npm with provenance.

## One-time setup (first release)

1. ✅ Repository `furnas-technology/timeline` created, public, `main` pushed.
   Settings → Actions → General → Workflow permissions: tick **Allow GitHub Actions to create and approve pull
   requests** (the Release workflow opens the "Version Packages" PR).
2. On npmjs.com, make sure the `@furnas-technology` organisation exists and you can publish to it.
3. First publish — npm trusted publishing can only be configured for a package that already exists, so either:
   - publish once by hand: `npm run prepublishOnly && npm run version-packages && npm publish --access public`, or
   - ✅ the `MY_NPM_TOKEN` repository secret (an npm token with publish rights) lets the Release workflow publish.
4. On npmjs.com → package settings → **Trusted publishing**, add GitHub Actions with repository
   `furnas-technology/timeline` and workflow `release.yml`. The `MY_NPM_TOKEN` secret can then be removed.
5. Settings → Pages → Build and deployment → Source: **GitHub Actions** (not "Deploy from a branch") so `pages.yml`
   publishes the demos and API docs to https://furnas-technology.github.io/timeline/.
6. Settings → Code security → enable **Private vulnerability reporting**.
