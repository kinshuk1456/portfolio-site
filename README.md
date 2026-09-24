# Portfolio Site (Static + Content-Driven)

Kinshuk Agarwal's portfolio — a dependency-light static site that renders content from `src/content/**`.

## Author & build

- **Author** in `src/` — projects live in `src/content/projects/items/<slug>/` (`project.json` + `case-study.md` + `gallery/`), plus `experience/`, `education/`, `posts/`, and `site.json`.
- **Build:** `node scripts/build.mjs` → validates content and writes a deploy-ready `dist/`.
- **Preview:** `node scripts/serve-dist.mjs` (serves `dist/` at http://localhost:4173).

## Project content model

Each `project.json` supports: `slug, title, date, summary, problem, approach, tools,
outcome, role, team, duration, links, tags, disciplines, tier, featured, images, caseStudy`.
`tier` is one of `featured` | `selected` | `labs` and drives the grouped Projects page;
`disciplines` drive the discipline filter.

## Hosting

Deployed on **Cloudflare Pages** (build command `node scripts/build.mjs`, output dir `dist`).
The domain `kinshukagarwal.com` is registered at Hostinger (domain only) with DNS pointed at
Cloudflare. The "Ask about my work" assistant is a Cloudflare Pages Function at
`functions/api/chat.js` (`/api/chat`) calling Google Gemini; the key lives in the Cloudflare
env var `GEMINI_API_KEY` and the model defaults to `gemini-2.5-flash`.
