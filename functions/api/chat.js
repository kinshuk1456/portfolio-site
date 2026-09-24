// functions/api/chat.js — Cloudflare Pages Function for the "Ask about my work" assistant.
// Route: POST /api/chat  (same origin as the site — no CORS needed)
//
// Holds the Gemini key server-side (context.env.GEMINI_API_KEY) and grounds answers
// in PORTFOLIO_CONTEXT below. Set the key as an encrypted env var in the Cloudflare
// Pages dashboard. Model defaults to gemini-2.5-flash (free tier); override with the
// GEMINI_MODEL env var. The handler never hard-crashes (no 502s) — on any failure it
// returns a graceful reply, and the client falls back to a grounded demo.
//
// Optional: bind a KV namespace named CHAT_RL for per-IP rate limiting (see README).

const PORTFOLIO_CONTEXT = `
Kinshuk Agarwal — CS undergrad and STEM MBA (UC Riverside), based in the San Francisco Bay Area, California.
Positioning: a technical product builder and operator at the intersection of AI, software,
data, and real-world workflows. He likes starting with a messy real-world problem,
understanding how people actually work, and building the software, AI system, data product,
or process that makes the workflow better. Targeting roles like Forward Deployed / Deployment
Engineer, AI / Customer Engineer, Technical Product Manager, Founder's Office, and Strategy &
Operations. Note: he has NOT held a role literally titled "Forward Deployed Engineer" — but his
work maps naturally to it. Be honest about that if asked.

Experience:
- PIM Brands — Data Analytics Intern (Operations), Aug–Dec 2025. Spent the first part of the
  internship embedded with manufacturing teams learning how production ran BEFORE building
  dashboards. Delivered 15 analytics products (OEE, downtime, changeover, capacity) used in
  recurring reviews; reconciled data across Snowflake, SQL Server, SAP HANA, and Redzone into
  Power BI; automated Python/SQL reporting saving ~10+ hours/week; presented to plant and
  executive leadership.
- Fly Me High — Software Developer, first full-time technical hire, Jun 2023–May 2024. Replaced
  spreadsheet sales/ops workflows with an internal platform. Built the backend in Java/Spring Boot
  on PostgreSQL, designed/debugged REST APIs (Postman, ~25% faster responses), coordinated ~4
  frontend interns. ~30 min less per customer record; adoption grew from ~3 to 6–7 users.
- Inn4Smart Solutions — Software Developer Intern, Jan–May 2023. Built a data-integration workflow:
  spreadsheets → structured JSON → external API, with validation, retries, and failure logging so
  failures were detectable, understandable, and recoverable. Thousands of records; 8-release cadence;
  documented recovery and trained 6+ users.
- Sri Kalyani Cottons — Operations & Trading Analyst (family cotton manufacturing/trading business,
  NOT a software role). Worked with customers on cotton quality specs, analyzed production, found
  bottlenecks, and reframed inventory around quality parameters. Contributed to ~25% higher
  throughput (a team result).

Selected projects (published). If asked to summarize any project, use these details.

1. Vizor — AI Dashboard Optimization for Tableau (Forward Deployed + Analytics + Engineering). July
   2026 – present, solo, Windows private beta. A local-first tool: you describe a dashboard change
   in natural language ("add West-region revenue as a KPI"), an agent interprets it and PROPOSES a
   structured, neutral change spec (add/replace/move), and — after you approve — a DETERMINISTIC
   compiler applies it to the real Tableau workbook. The model never sees or edits the workbook XML.
   Every apply runs an apply loop (proposed → accepted → compiled → applied) with package, schema,
   field, zone, and fidelity validation and FAILS CLOSED; outputs are versioned workbooks
   (<source>_vizor_vN.twb), the original's SHA-256 is verified unchanged, and edits are undoable.
   Python/FastAPI backend, MCP, React/TS; Power BI (.pbip) adapters too. Evolution to explain
   honestly: it began as a screenshot → six-lens critique web app (advice only), then pivoted to the
   propose-and-apply transformation system. Metrics are scoped: real versioned workbooks, per-
   generation layout-fidelity scoring (70s–90s on evaluated dashboards, peak 91), field-tested on a
   few real dashboards. Do NOT cite "24 transformations / ~95% / 0 failures" — unsupported. Key idea:
   the model plans; deterministic code ships the workbook only when validation passes — the boundary is the product.

2. HabitPact — Product + Engineering. 2026, beta-ready, solo, 0-to-1. A private accountability app
   where friends set goals together, submit proof, and peers approve it, with points-based stakes.
   Built in Flutter on Firebase (Auth, Firestore, Cloud Functions). Proof: 167 automated host tests
   passing, tested on 2 physical Android devices, release APK produced. Friend groups, proof
   submission, and peer validation work in the prototype; device-lock, real financial penalties,
   and rewards are explored but NOT shipped — don't present them as live.

3. Summit Operations Platform — Check-in & Occupancy (Forward Deployed + Product). Built for the UC
   Riverside School of Business Emerging Careers Summit. Streamlit + Google Sheets API + QR check-in
   with UCR email validation, role-based Floor Host/Admin views, real-time occupancy, capacity
   alerts, session reassignment, and admin export. Ran the live event: 120+ check-ins across 18
   sessions. Used Google Sheets as the backend (no separate database) on purpose.

4. Grhastha — Guided Puja at Home (Product + Engineering). Family-led, non-profit oriented; Kinshuk
   is a product/technical contributor (don't overstate ownership). Three pillars: Know When
   (location-aware timing/muhurta), Know How (step-by-step guidance, materials, substitutes), Know
   the Words (Sanskrit mantras with audio, transliteration, meaning). Principles: no login, no
   subscription, calm/authentic not gamified, onboard once. Initial focus: Ganesh Chaturthi.

5. PIM Brands — Operational Analytics (Analytics + Forward Deployed). See PIM experience above:
   floor-first discovery, 15 analytics products, four source systems into Power BI, ~10+ hours/week
   of reporting automated.

6. Fly Me High — Internal Operations Platform (Forward Deployed + Engineering + Product). See Fly Me
   High experience above: first technical hire building a Java/Spring Boot + PostgreSQL internal
   system inside a non-technical travel company.

7. Inn4Smart — Enterprise Data Integration Workflow (Forward Deployed + Engineering). See Inn4Smart
   experience above. Key lesson: reliability isn't "the API returned 200" — failures must be
   detectable, understandable, and recoverable.

8. Don's Drugs — Community Pharmacy Growth Strategy (Strategy + Product). Mar–Jun 2026, MBA capstone
   (MGT 238), team of 3, independent pharmacy in San Bernardino. Three pillars (preventive care,
   medication adherence, high-touch retention). Modeled ~$156K in ESTIMATED annual opportunity
   (estimated, NOT realized revenue).

9. Sri Kalyani Cottons — Operations & Trading Improvement (Operations + Strategy). See experience
   above. Operations/trading, not software.

10. Portfolio AI Assistant (Product + Engineering) — this very chatbot. A Cloudflare Pages Function
    at /api/chat, holding the key server-side, calling Google's Gemini free tier, grounded in a
    hand-written context (deliberately NOT RAG, a vector database, or an agent), with guardrails
    against inventing facts and a graceful fallback.

11. Digital Home — the portfolio/content system this site runs on (HTML/CSS/vanilla JS/Node).

Toolkit: React, TypeScript, FastAPI, Flutter, Java/Spring Boot, PostgreSQL, Python, SQL, Snowflake,
Power BI, Tableau, plus applied AI tooling — LLMs and MCP (Model Context Protocol, used in Vizor).
Contact: kinshuk.agarwal@email.ucr.edu.
`;

const SYSTEM = `You are the assistant on Kinshuk Agarwal's portfolio site. Answer questions about his
professional background and work, grounded ONLY in the context below. Be concise (2–4 sentences),
specific, and understated — prefer "he built / analyzed / shipped" over buzzwords. Never invent
facts, metrics, dates, employers, or job titles; if a detail isn't in the context, say you don't
have it. Only discuss Kinshuk's work; politely redirect anything off-topic.

Formatting: reply in light Markdown. Use **bold** for names of projects, tools, or key terms, and
use a short "- " bulleted list when you're naming two or more distinct items (projects, skills,
responsibilities). Keep it tight — no headings, no more than ~4 bullets.

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
  } catch {
    return jsonResponse({ reply: UNAVAILABLE });
  }
}

async function handle(context) {
  const { request, env } = context;

  const key = env.GEMINI_API_KEY;
  if (!key) return jsonResponse({ reply: UNAVAILABLE });

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
      if (n >= 15) return jsonResponse({ reply: 'You’ve sent a lot of questions in a short time — give it a minute.' });
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

  const model = env.GEMINI_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(key)}`;

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents,
        generationConfig: { temperature: 0.4, maxOutputTokens: 512 },
      }),
    });
  } catch {
    return jsonResponse({ reply: UNAVAILABLE });
  }

  // On any upstream error, fall back to a plain JSON reply (the client handles both).
  if (!res.ok || !res.body) return jsonResponse({ reply: UNAVAILABLE });

  // Transform Gemini's SSE into a plain-text stream of just the answer deltas.
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const stream = new ReadableStream({
    start(controller) {
      (async () => {
        const reader = res.body.getReader();
        let buf = '';
        let any = false;
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            let nl;
            while ((nl = buf.indexOf('\n')) >= 0) {
              const line = buf.slice(0, nl).trim();
              buf = buf.slice(nl + 1);
              if (!line.startsWith('data:')) continue;
              const js = line.slice(5).trim();
              if (!js || js === '[DONE]') continue;
              try {
                const d = JSON.parse(js);
                const t = d && d.candidates && d.candidates[0] && d.candidates[0].content
                  && d.candidates[0].content.parts && d.candidates[0].content.parts[0]
                  && d.candidates[0].content.parts[0].text;
                if (t) { any = true; controller.enqueue(encoder.encode(t)); }
              } catch { /* skip malformed chunk */ }
            }
          }
        } catch { /* upstream ended */ }
        if (!any) controller.enqueue(encoder.encode("I'm not sure how to answer that from what I know about Kinshuk's work."));
        controller.close();
      })();
    },
  });

  return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
}

export function onRequestGet() {
  return jsonResponse({ ok: true, hint: 'POST { message, history } here.' });
}
