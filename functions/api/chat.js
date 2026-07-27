// functions/api/chat.js — Cloudflare Pages Function for the "Ask about my work" assistant.
// Route: POST /api/chat  (same origin as the site — no CORS needed)
//
// Holds the Gemini key server-side (context.env.GEMINI_API_KEY) and grounds answers
// in PORTFOLIO_CONTEXT below. Set the key as an encrypted env var in the Cloudflare
// Pages dashboard, then set site.json -> chat.endpoint to "/api/chat" and rebuild.
//
// Hardened: the whole handler is wrapped so it never hard-crashes (no 502s). On any
// failure it returns HTTP 200 with a graceful reply plus a `_debug` field describing
// the cause (safe — never includes the API key).

const PORTFOLIO_CONTEXT = `
Kinshuk Agarwal — MBA candidate at UC Riverside, based in Riverside, California.
Background in software development and data/analytics. Positioning: works where
product, data, and implementation meet. Targeting Product, Analytics, and Forward
Deployed Engineering roles. Note: he has NOT held a role literally titled "Forward
Deployed Engineer" — but his work maps naturally to it. Be honest about that if asked.

Experience:
- PIM Brands — Data Analytics Intern. Built Power BI dashboards on SQL/Snowflake to
  track operational KPIs and support decisions across engineering and operations.
- Fly Me High — Software Developer.
- Inn4Smart Solutions — Software Developer Intern.

Selected projects (published):
- Operations KPI Dashboard (Power BI) — Analytics + Forward Deployed. Power BI on
  SQL/Snowflake/Redzone; repeatable operational reviews; better decision visibility.
- HabitPact — Product + Engineering. A 0-to-1 behavioral-accountability mobile app
  (Flutter) attaching real consequences to commitments; problem framing, user flows.
- Event Check-In Product System (QR + Python) — Forward Deployed + Product. QR check-in
  with real-time tracking and dashboard reporting across 30+ rooms.
- Digital Home — Product + Engineering. A static-hostable portfolio + content system
  with validation, generated indexes, and a local authoring Studio.
- Product Delivery & Agile Execution Case — Product + Strategy. Clearer stories, tighter
  QA/UAT alignment, smoother releases.

In progress (mention as drafts if asked, don't over-claim): Vizor (AI-assisted Tableau
workbook reviewer, Python MCP), Signal Map, Ops Pulse, Forecast Forge, Don's Drugs
(MBA consulting capstone, details being finalized).

Toolkit: SQL, Power BI, Snowflake, Python, Tableau, Excel.
Contact: kinshuk.agarwal@email.ucr.edu.
`;

const SYSTEM = `You are the assistant on Kinshuk Agarwal's portfolio site. Answer questions about his
professional background and work, grounded ONLY in the context below. Be concise (2–4 sentences),
specific, and understated — prefer "he built / analyzed / shipped" over buzzwords. Never invent
facts, metrics, dates, employers, or job titles; if a detail isn't in the context, say you don't
have it. Only discuss Kinshuk's work; politely redirect anything off-topic.

---
${PORTFOLIO_CONTEXT}`;

const MAX_MSG = 800;
const MAX_HISTORY = 8;

const jsonResponse = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });

const UNAVAILABLE = 'The assistant is momentarily unavailable — please try again shortly, or email kinshuk.agarwal@email.ucr.edu.';

export async function onRequestPost(context) {
  try {
    return await handle(context);
  } catch (err) {
    // Never 502. Surface the cause for debugging (no secrets).
    return jsonResponse({ reply: UNAVAILABLE, _debug: 'handler_threw: ' + String((err && err.message) || err) });
  }
}

async function handle(context) {
  const { request, env } = context;

  const key = env.GEMINI_API_KEY;
  if (!key) return jsonResponse({ reply: UNAVAILABLE, _debug: 'no GEMINI_API_KEY' }, 200);

  const allow = env.CHAT_ALLOW_ORIGIN;
  if (allow) {
    const origin = request.headers.get('Origin') || '';
    if (origin && origin !== allow) return jsonResponse({ reply: 'Request not allowed.' }, 403);
  }

  if (env.CHAT_RL) {
    try {
      const ip = request.headers.get('CF-Connecting-IP') || 'x';
      const k = `rl:${ip}`;
      const n = parseInt((await env.CHAT_RL.get(k)) || '0', 10);
      if (n >= 15) return jsonResponse({ reply: 'You’ve sent a lot of questions in a short time — give it a minute.' }, 200);
      await env.CHAT_RL.put(k, String(n + 1), { expirationTtl: 600 });
    } catch { /* rate-limit is best-effort */ }
  }

  let body = {};
  try { body = await request.json(); } catch { /* empty */ }
  let message = String((body && body.message) || '').trim();
  if (!message) return jsonResponse({ reply: 'Ask me anything about Kinshuk’s work.' });
  if (message.length > MAX_MSG) message = message.slice(0, MAX_MSG);

  const contents = [];
  for (const turn of (Array.isArray(body.history) ? body.history : []).slice(-MAX_HISTORY)) {
    const role = turn && turn.role === 'model' ? 'model' : 'user';
    const text = String((turn && turn.text) || '').trim().slice(0, 1500);
    if (text) contents.push({ role, parts: [{ text }] });
  }
  contents.push({ role: 'user', parts: [{ text: message }] });

  const model = env.GEMINI_MODEL || 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents,
        generationConfig: { temperature: 0.4, maxOutputTokens: 400 },
      }),
    });
  } catch (err) {
    return jsonResponse({ reply: UNAVAILABLE, _debug: 'fetch_threw: ' + String((err && err.message) || err) });
  }

  const raw = await res.text();
  if (!res.ok) {
    return jsonResponse({ reply: UNAVAILABLE, _debug: `gemini_${res.status} model=${model}: ` + raw.slice(0, 900) });
  }

  let data;
  try { data = JSON.parse(raw); } catch (err) {
    return jsonResponse({ reply: UNAVAILABLE, _debug: 'bad_json: ' + raw.slice(0, 200) });
  }

  const reply = (data && data.candidates && data.candidates[0] && data.candidates[0].content
    && data.candidates[0].content.parts && data.candidates[0].content.parts[0]
    && data.candidates[0].content.parts[0].text || '').trim();

  if (!reply) {
    const blocked = data?.promptFeedback?.blockReason || data?.candidates?.[0]?.finishReason || 'empty';
    return jsonResponse({ reply: "I'm not sure how to answer that from what I know about Kinshuk's work.", _debug: 'no_text: ' + blocked });
  }

  return jsonResponse({ reply });
}

export function onRequestGet() {
  return jsonResponse({ ok: true, hint: 'POST { message, history } here.' });
}
