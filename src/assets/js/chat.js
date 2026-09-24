// chat.js — "Ask about my work": an editorial assistant panel.
// Path B: talks to a server proxy that holds the Gemini key. When no endpoint
// is configured it falls back to a grounded local demo so the UI works offline.
//
// - No API key ever touches the browser (the proxy holds it).
// - Accessible: role=dialog, focus move, Esc to close, aria-live messages.
// - Reduced-motion friendly (CSS handles transitions).

export function initChat(config = {}) {
  const endpoint = config.endpoint || '';
  const suggested = config.suggested || [];
  const followPool = config.followups || [
    "Why did you change Vizor's architecture?",
    "What did you build at PIM Brands?",
    "Which projects best show customer-facing engineering?",
    "How does your technical background complement your MBA?",
    "What did you build in HabitPact?",
    "Tell me about the Summit operations platform",
    "How do you use LLMs and MCP?",
    "What roles are you targeting?"
  ];
  const asked = new Set();
  const history = [];
  let panel, messagesEl, inputEl, restoreFocus, built = false, busy = false;

  function build() {
    panel = document.createElement('div');
    panel.className = 'chat-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Ask about Kinshuk’s work');
    panel.hidden = true;
    panel.innerHTML = `
      <div class="chat-scrim" data-chat-close></div>
      <div class="chat-card" role="document" data-lenis-prevent>
        <header class="chat-head">
          <div>
            <div class="label">Ask</div>
            <div class="chat-title">About my work</div>
          </div>
          <button class="chat-close" type="button" data-chat-close aria-label="Close">✕</button>
        </header>
        <div class="chat-messages" data-chat-messages aria-live="polite"></div>
        <div class="chat-suggest" data-chat-suggest>
          ${suggested.map(s => `<button class="chat-chip" type="button">${esc(s)}</button>`).join('')}
        </div>
        <form class="chat-form" data-chat-form>
          <input class="chat-input input" type="text" autocomplete="off"
            placeholder="Ask about my experience, projects, or focus…" aria-label="Your question" />
          <button class="btn btn-primary chat-send" type="submit">Send</button>
        </form>
        <p class="chat-foot label">${endpoint ? 'Grounded in Kinshuk’s real portfolio.' : 'Demo mode — connect the API for live answers.'}</p>
      </div>`;
    document.body.appendChild(panel);
    messagesEl = panel.querySelector('[data-chat-messages]');
    inputEl = panel.querySelector('.chat-input');
    panel.querySelectorAll('[data-chat-close]').forEach(b => b.addEventListener('click', close));
    panel.querySelector('[data-chat-form]').addEventListener('submit', (e) => { e.preventDefault(); send(inputEl.value); });
    panel.querySelectorAll('.chat-chip').forEach(c => c.addEventListener('click', () => send(c.textContent)));
    panel.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { close(); return; }
      if (e.key !== 'Tab') return;
      // Focus trap: keep Tab focus inside the dialog while it's open.
      const focusables = panel.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      const list = Array.from(focusables).filter((el) => el.offsetParent !== null);
      if (!list.length) return;
      const first = list[0], last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    addMsg('bot', "Hi — I can answer questions about Kinshuk's work across product, analytics, and forward-deployed engineering. What would you like to know?");
    built = true;
  }

  function open() {
    if (!built) build();
    restoreFocus = document.activeElement;
    panel.hidden = false;
    requestAnimationFrame(() => { panel.classList.add('is-open'); inputEl.focus(); });
    document.documentElement.style.overflow = 'hidden';
    if (window.__lenis) window.__lenis.stop();
  }

  function close() {
    if (!built) return;
    panel.classList.remove('is-open');
    document.documentElement.style.overflow = '';
    if (window.__lenis) window.__lenis.start();
    setTimeout(() => { panel.hidden = true; }, 220);
    if (restoreFocus && restoreFocus.focus) restoreFocus.focus();
  }

  function addMsg(role, text) {
    const el = document.createElement('div');
    el.className = `chat-msg chat-msg--${role}`;
    el.textContent = text;
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return el;
  }

  function renderFollowups() {
    const remaining = followPool.filter((q) => !asked.has(q.toLowerCase()));
    if (!remaining.length) return;
    const picks = remaining.slice(0, 2);
    const row = document.createElement('div');
    row.className = 'chat-followups';
    row.innerHTML = picks.map((q) => `<button class="chat-chip" type="button">${esc(q)}</button>`).join('');
    row.querySelectorAll('.chat-chip').forEach((c, i) => c.addEventListener('click', () => send(picks[i])));
    messagesEl.appendChild(row);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  async function send(text) {
    text = (text || '').trim();
    if (!text || busy) return;
    asked.add(text.toLowerCase());
    messagesEl.querySelectorAll('.chat-followups').forEach((r) => r.remove());
    inputEl.value = '';
    addMsg('user', text);
    history.push({ role: 'user', text });
    busy = true;
    const el = addMsg('bot', '…');
    el.classList.add('is-typing');
    try {
      const reply = endpoint ? await streamInto(text, el) : setReply(el, await mockReply(text));
      history.push({ role: 'model', text: reply });
      renderFollowups();
    } catch {
      // Endpoint unreachable → graceful grounded demo fallback.
      try {
        const reply = setReply(el, await mockReply(text));
        history.push({ role: 'model', text: reply });
        renderFollowups();
      } catch {
        setReply(el, 'Sorry — I couldn’t reach the assistant. Please try again shortly, or email Kinshuk directly.');
      }
    } finally {
      busy = false;
    }
  }

  function setReply(el, text) {
    el.classList.remove('is-typing');
    el.innerHTML = renderMarkdown(text);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return text;
  }

  // Streams plain-text deltas from the proxy into the message element as they arrive.
  // Falls back cleanly if the server returns a plain JSON reply instead of a stream.
  async function streamInto(text, el) {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history: history.slice(-8) }),
    });
    if (!res.ok) throw new Error('bad status ' + res.status);
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json') || !res.body || !res.body.getReader) {
      const data = await res.json().catch(() => ({}));
      return setReply(el, (data.reply || '').trim() || 'I’m not sure how to answer that one.');
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let acc = '';
    el.classList.remove('is-typing');
    el.textContent = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      acc += dec.decode(value, { stream: true });
      el.textContent = acc;
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
    acc = acc.trim();
    // Streaming showed raw text; now resolve to formatted markdown.
    return setReply(el, acc || 'I’m not sure how to answer that one.');
  }

  // Grounded local demo — honest, sourced from the real portfolio content.
  async function mockReply(text) {
    await new Promise((r) => setTimeout(r, 450));
    const t = text.toLowerCase();
    const tag = ' (Demo answer — once the Gemini proxy is connected I’ll respond to anything, grounded in the real portfolio.)';
    if (/vizor|mcp|llm|ai tool|agent|architecture/.test(t))
      return "**Vizor** is his clearest applied-AI project — **AI dashboard optimization for Tableau**. You describe a change in plain language (“add West-region revenue as a KPI”); an **agent proposes** a structured change spec, and a **deterministic compiler applies** it to the real workbook — the model never edits the file's XML. Every apply runs schema, field, zone, and **fidelity** validation and **fails closed**, and outputs are versioned, hash-verified workbooks. It started as a screenshot→critique web app, then pivoted to this propose-and-apply system. The key idea: the model plans; deterministic code ships the workbook only when validation passes." + tag;
    if (/forward|deploy|fde|implement|customer/.test(t))
      return "The forward-deployed pattern shows in work like:\n- **Summit Operations Platform** — Streamlit + Google Sheets, run live for a real event (120+ check-ins, 18 sessions)\n- **Fly Me High** — first technical hire building an internal Java/Spring platform for a non-technical company\n- **Inn4Smart** — a data-integration pipeline where reliability meant detectable, recoverable failures, not just a 200\n\nThe thread: take an ambiguous business problem, build the technical solution, and get it working in a real workflow." + tag;
    if (/analytic|data|sql|dashboard|tableau|power ?bi|kpi|pim/.test(t))
      return "At **PIM Brands** he spent time on the production floor first, then built manufacturing analytics — OEE, downtime, changeover — reconciling Snowflake, SQL Server, SAP HANA, and Redzone into Power BI. He shipped 15 analytics products and automated ~10+ hours/week of reporting. Analytics framed as decisions, not just charts." + tag;
    if (/product|build|habit|ship|user/.test(t))
      return "Product-wise, **HabitPact** is a 0-to-1 accountability app where friends verify each other's goals — taken to beta-ready with 167 automated tests and testing on real devices. The emphasis is on owning the whole problem: what a pact *is*, what proof *means*, and where to stop — not just the stack." + tag;
    if (/role|hiring|looking|target|open|job|mba/.test(t))
      return "He's targeting the overlap of product, analytics, and hands-on implementation — Forward Deployed / Deployment Engineer, AI / Customer Engineer, Technical PM, Founder's Office, and Strategy & Ops. CS undergrad plus a STEM MBA at UC Riverside; based in the San Francisco Bay Area, California." + tag;
    return "I can tell you about Kinshuk's product work, analytics, forward-deployed engineering, experience, or the roles he's targeting — just ask." + tag;
  }

  // Open the panel and immediately ask a preset question (used by the
  // "Ask my portfolio" orb prompts on the homepage).
  function ask(question) {
    open();
    const q = String(question || '').trim();
    if (q) setTimeout(() => send(q), 280);
  }

  return { open, close, ask };
}

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Minimal, safe markdown → HTML for chat replies. Escapes first, then applies
// inline (**bold**, *em*, `code`, links) and block-level (- bullets, paragraphs).
function renderMarkdown(text) {
  const inline = (s) => esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  let html = '', para = [], inList = false;
  const flushPara = () => { if (para.length) { html += `<p>${inline(para.join(' '))}</p>`; para = []; } };
  const closeList = () => { if (inList) { html += '</ul>'; inList = false; } };

  for (const raw of lines) {
    const line = raw.trim();
    if (/^[-*]\s+/.test(line)) {
      flushPara();
      if (!inList) { html += '<ul>'; inList = true; }
      html += `<li>${inline(line.replace(/^[-*]\s+/, ''))}</li>`;
    } else if (line === '') {
      flushPara(); closeList();
    } else {
      closeList(); para.push(line);
    }
  }
  flushPara(); closeList();
  return html || `<p>${inline(text)}</p>`;
}
