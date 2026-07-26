# Portfolio Studio (local-only)

This is a local content management studio for this portfolio.

- No remote backend
- No login/auth (binds to 127.0.0.1)
- Writes directly into `src/content/**`

## Run

```bash
npm run studio
```

Then open:

- http://127.0.0.1:4174/studio/

## What it edits

- `src/content/site.json`
- `src/content/projects/items/<slug>/project.json`
- `src/content/projects/items/<slug>/case-study.md`
- `src/content/posts/{insights|life}/<slug>/post.json`
- `src/content/posts/{insights|life}/<slug>/content.md`
- `src/content/experience/experience.json`
- `src/content/education/education.json`

## Notes

- v1 does **not** support renaming slugs (folder rename). Create a new item and delete the old one.
- Build/preview buttons call the existing `npm run build` and `npm run preview` scripts.
