# Minimal Eleventy blog + GitHub Pages CI

What this repo contains
- A minimal Eleventy site in `src/`.
- A GitHub Actions workflow that builds the site and deploys to GitHub Pages on `push` to `main` and on `pull_request` targeting `main`.

Quick local test
1. Install dependencies: `npm ci`
2. Preview locally: `npm start` (opens Eleventy dev server)
3. Build locally: `npm run build` -> output in `_site/`

RSS feed
- This site includes `/feed.xml` generated from posts in `src/posts/`.
- Set the site URL in `src/_data/site.json` (currently `https://first-draft-v2.github.io/half-baked`) so feed links are absolute. Update it if you use a custom domain.

Using the workflow
- The workflow runs on `push` and `pull_request` events.
- It builds the site into `_site`, uploads the artifact, and deploys to GitHub Pages via the official Pages deploy actions.
- If you want automatic publishing you don't need to configure Pages manually; the workflow uses the Pages API to deploy. If you prefer to publish from a branch (like `gh-pages`) instead, replace the deploy steps with a branch-publish action (e.g., `peaceiris/actions-gh-pages`) and configure GitHub Pages in repository settings.

Notes & limitations
- Pull requests from forks: workflows triggered by PRs from forks run with limited permissions for security. That means PRs from forks may not be able to deploy to Pages. For previewing PR changes, consider:
  - Opening branches in the same repo (not from a fork), or
  - Using a separate preview branch/action that uses a PAT (store it in secrets) — but be careful with tokens and security.