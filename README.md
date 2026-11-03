# Tech Kadak — free apps website

Static site (plain HTML/CSS/JS, no build step needed to host) for the Instagram page [@techkadak](https://www.instagram.com/techkadak/).
Hosting: GitHub Pages (free). Daily update: GitHub Actions (free). **Setup guide (Hinglish): [README-HINDI.md](README-HINDI.md)**

- `data/apps.json` — all apps ([schema](docs/SCHEMA.md)); `data/queue.json` — upcoming apps, one published per day
- `scripts/build.mjs` — generates `index.html`, `apps.html`, `apps/<slug>.html` (SEO pages with JSON-LD), `sitemap.xml`, `robots.txt`, `feed.xml`
- `scripts/daily.mjs` — adds today's app (queue first; optional Gemini AI mode picks only from the official F-Droid index / GitHub API and marks entries `aiAdded`), then rebuilds. `--dry-run` changes nothing.
- `.github/workflows/daily.yml` — runs daily at 09:00 IST, on push and on demand; commits and deploys to Pages
- `assets/js/hero3d.js` — the 3D stage (three.js, MIT, bundled from `src/hero3d.src.js`); lazy-loaded, capped pixel ratio, pauses off-screen, CSS fallback without WebGL
- `config.json` — site URL (empty = automatic github.io URL), social links, daily mode, AI model, AdSense switch (off), Search Console tag
- Tests: `node --test test/site.test.mjs`

Fonts: Unbounded and DM Sans (SIL Open Font License), subset to WOFF2.
