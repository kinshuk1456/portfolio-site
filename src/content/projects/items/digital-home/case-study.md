# Digital Home — Case Study

## Why this exists
Most portfolios are static brochures. I wanted something closer to a personal media platform: **projects + writing + life**, with a structure that can grow without becoming messy.

## Constraints
- Static hosting (Hostinger)
- Content easy to add/edit
- Authored content must never be modified during build
- Generated indexes must live in `dist/content` only

## Approach
- Content-first structure in `src/content`
- Build step to validate JSON + generate indexes
- Multi-page static shell with shared JS renderers
- Lightweight markdown support for posts and case studies

## Result
A fast, modern, content-driven site where updates mean: add a folder + JSON/MD + images → run build → upload `dist/`.
