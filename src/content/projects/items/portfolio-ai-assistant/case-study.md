## The problem

A portfolio is static, and questions aren't. A recruiter reading this site has a specific thing they want to know — "what's his forward-deployed experience?", "tell me about Vizor" — and the usual answer is "go click around until you find it." I wanted to let people just ask. But an "ask me anything" box on a portfolio has two obvious failure modes: it invents things that make you look like a liar, or it quietly leaks an API key into the browser.

## What actually exists

I'm describing this from the real implementation, not an aspirational one.

- **A Cloudflare Pages Function** at `/api/chat`, same origin as the site, that holds the API key server-side (never in the client).
- **Google Gemini free tier** as the model, so it costs nothing to run.
- **A hand-authored context block** about my real experience and projects that grounds every answer.
- **A system prompt with guardrails** — be concise, be specific, and never invent facts, metrics, dates, employers, or titles; if a detail isn't in the context, say so and redirect off-topic questions.
- **Graceful failure** — the handler never hard-crashes, and the client falls back to a grounded demo answer if the endpoint is ever unreachable, so the feature can't take the page down with it.

The assistant lives on the **Contact page** so it complements navigation instead of hijacking it.

## The honest architecture note

It would be easy to dress this up as "RAG with a vector database and an agent framework." It isn't, on purpose. The knowledge here is small and stable — one person's work — so a **curated, hand-verified context** is both more accurate and far simpler than retrieval over embeddings. Choosing *not* to add RAG, a vector store, or an agent loop was the right engineering call, and I'd rather say that plainly than imply a heavier stack than the problem needs. It's the same instinct as Vizor: match the machinery to the problem, and keep the parts that must be trustworthy under your own control.

## What I learned

The interesting constraint wasn't building the chatbot — it was making one you'd trust on your own portfolio. That meant the design work was mostly about what the model is *not* allowed to do: no fabrication, no leaked key, no way to break the page. Guardrails and graceful degradation did more for this feature than any amount of model capability.
