# "Ask about my work" — setup (Cloudflare Pages + Gemini)

You host on **Cloudflare**, so the site and the chatbot backend both run there, free.
The browser never sees the API key — it calls `/api/chat` (a Cloudflare Pages Function),
which holds the key and calls Gemini. Same origin, no CORS.

Files already in the repo:
- `functions/api/chat.js` — the Pages Function (endpoint `/api/chat`).
- `src/content/site.json` → `chat.endpoint` is already set to `/api/chat`.

## 1. Get a free Gemini API key (~30 sec)
1. Go to **https://aistudio.google.com/apikey**, sign in, **Create API key**, copy it.
   (Free tier — no billing. Model `gemini-2.0-flash`, or `gemini-2.5-flash`.)

## 2. Create the Cloudflare Pages project
Easiest is Git integration so Functions deploy automatically:
1. Push this repo to GitHub (or GitLab).
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git** → pick the repo.
3. Build settings:
   - **Build command:** `node scripts/build.mjs`
   - **Build output directory:** `dist`
   - (Cloudflare auto-detects `/functions` at the repo root — nothing else needed.)
4. Deploy.

*(No Git? Alternative: `npx wrangler pages deploy dist` after building — but Git integration is
the reliable way to include Functions.)*

## 3. Add your key to the Pages project
Pages project → **Settings → Environment variables** → add (Production + Preview):
- `GEMINI_API_KEY` = your key  (mark as **encrypted/secret**)
- optional `GEMINI_MODEL` = `gemini-2.5-flash`
- optional `CHAT_ALLOW_ORIGIN` = `https://kinshukagarwal.com` (blocks other sites calling it)

Redeploy after adding the variable.

## 4. Point your domain
Your domain is *registered* at Hostinger, so first make sure Cloudflare manages its DNS:
- If kinshukagarwal.com is already added to Cloudflare (nameservers point to Cloudflare):
  Pages project → **Custom domains** → add `kinshukagarwal.com` → done.
- If not yet: Cloudflare → **Add a site** (free plan) → enter kinshukagarwal.com → copy the two
  Cloudflare nameservers → in **Hostinger → Domains → kinshukagarwal.com → DNS/Nameservers**,
  replace the nameservers with Cloudflare's. After it verifies (can take a bit), add the
  custom domain in the Pages project.

That's it — the assistant answers live at `kinshukagarwal.com`, grounded in your real content.

## Guardrails built in
- Key stays server-side (Cloudflare env var); browser only calls `/api/chat`.
- Grounded strictly in the context inside `functions/api/chat.js`; the system prompt forbids
  inventing facts, metrics, or job titles (and is honest that you weren't literally an FDE).
- Message length cap + short max output. Optional origin lock via `CHAT_ALLOW_ORIGIN`.
- Free Gemini tier = no billing surprises.
- If Gemini is ever unreachable, the site silently falls back to a grounded demo answer.

## Optional: stronger rate limiting
Create a KV namespace and bind it to the Pages project as **`CHAT_RL`**
(Settings → Functions → KV namespace bindings). The function then limits ~15 requests / 10 min
per IP automatically. Without it, everything still works.

---
`deploy/chat.php` is the PHP version of this same proxy — only needed if you ever move to
PHP hosting. On Cloudflare, ignore it and use `functions/api/chat.js`.
