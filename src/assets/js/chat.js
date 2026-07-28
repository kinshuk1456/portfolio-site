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
    "What's his forward-deployed experience?",
    "Show me his analytics work",
    "What did he build in HabitPact?",
    "Tell me about the Don's Drugs project",
    "What roles is he targeting?",
    "What's his background in data?"
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
    panel.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
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
    const typing = addMsg('bot', '…');
    typing.classList.add('is-typing');
    try {
      const reply = await getReply(text);
      typing.remove();
      addMsg('bot', reply);
      history.push({ role: 'model', text: reply });
      renderFollowups();
    } catch {
      typing.remove();
      addMsg('bot', 'Sorry — I couldn’t reach the assistant. Please try again shortly, or email Kinshuk directly.');
    } finally {
      busy = false;
    }
  }

  async function getReply(text) {
    if (endpoint) {
      // Real Gemini via the proxy; fall back to the grounded demo if it's unreachable.
      try { return await callEndpoint(text); } catch { return await mockReply(text); }
    }
    return mockReply(text);
  }

  async function callEndpoint(text) {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history: history.slice(-8) })
    });
    if (!res.ok) throw new Error('bad status ' + res.status);
    const data = await res.json();
    return (data.reply || '').trim() || 'I’m not sure how to answer that one.';
  }

  // Grounded local demo — honest, sourced from the real portfolio content.
  async function mockReply(text) {
    await new Promise((r) => setTimeout(r, 450));
    const t = text.toLowerCase();
    const tag = ' (Demo answer — once the Gemini proxy is connected I’ll respond to anything, grounded in the real portfolio.)';
    if (/forward|deploy|fde|implement/.test(t))
      return "The forward-deployed pattern shows in work like the Event Check-In System (QR + Python, deployed live across 30+ rooms) and the Operations KPI Dashboard (built on Snowflake/SQL and put into real operational reviews). The thread: take an ambiguous business problem, build the technical solution, and get it working in a real workflow." + tag;
    if (/analytic|data|sql|dashboard|tableau|power ?bi|kpi/.test(t))
      return "On analytics: at PIM Brands he built Power BI dashboards on SQL/Snowflake to track operational KPIs and support decisions. Projects like the Ops KPI Dashboard show KPI development and decision support — analytics framed as decisions, not just charts." + tag;
    if (/product|build|habit|ship|user/.test(t))
      return "Product-wise, HabitPact is a 0-to-1 behavioral-accountability mobile app — problem framing, user flows, prioritization, and shipping. Digital Home is a full content system he designed and built. The emphasis is on the decision (what to build and why), not just the stack." + tag;
    if (/role|hiring|looking|target|open|job/.test(t))
      return "He's targeting Product, Analytics, and Forward Deployed Engineering roles — the overlap of product thinking, data, and hands-on implementation. Based in Riverside, CA; MBA at UC Riverside." + tag;
    return "I can tell you about Kinshuk's product work, analytics work, forward-deployed engineering, experience, or the roles he's targeting — just ask." + tag;
  }

  return { open, close };
}

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
