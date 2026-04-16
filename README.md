# Arcana, Gas & Waterworks Inc. — Website

Official website for AG&W Inc., deployed to [agw-game.com](https://agw-game.com) via GitHub Pages.

## Structure

- `src/` — Static site source (HTML, CSS, JS, assets)
- `.github/workflows/deploy.yml` — Auto-deploys `src/` to GitHub Pages on push to `main`

## Local Development

Open `src/index.html` in a browser, or serve it:

```bash
npx serve src
```

## Deployment

Push to `main` and GitHub Actions handles the rest. The `src/CNAME` file configures the custom domain.

### DNS Setup

Point `agw-game.com` to GitHub Pages:

| Type  | Name | Value                        |
|-------|------|------------------------------|
| A     | @    | 185.199.108.153              |
| A     | @    | 185.199.109.153              |
| A     | @    | 185.199.110.153              |
| A     | @    | 185.199.111.153              |
| CNAME | www  | shawnr.github.io             |

Then enable GitHub Pages in repo Settings > Pages > Source: GitHub Actions.
