// functions/api/github.js — Cloudflare Pages Function for "Building in public".
// Route: GET /api/github  (same origin as the site — no CORS needed)
//
// Proxies GitHub's public REST API for kinshuk1456 so the browser never needs a
// token and we stay under the unauthenticated rate limit. Set an optional
// GITHUB_TOKEN env var in the Cloudflare Pages dashboard to lift the limit
// (60 → 5000 req/hr); it is read server-side only and never sent to the client.
//
// Response is cached at the edge for ~30 min. Any upstream failure returns an
// empty-but-valid shape; the client then falls back to a plain profile link.

const USER = 'kinshuk1456';
const GH = 'https://api.github.com';
const CACHE_TTL = 1800; // seconds

const EVENT_VERBS = {
  PushEvent: 'pushed to',
  PullRequestEvent: 'opened PR in',
  CreateEvent: 'created',
  WatchEvent: 'starred',
  IssuesEvent: 'issue in',
  IssueCommentEvent: 'commented in',
  ForkEvent: 'forked',
  ReleaseEvent: 'released in',
  PublicEvent: 'open-sourced'
};

const json = (obj, status = 200, extraHeaders = {}) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders }
  });

async function ghFetch(path, env) {
  const headers = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'kinshukagarwal.com',
    'X-GitHub-Api-Version': '2022-11-28'
  };
  if (env && env.GITHUB_TOKEN) headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
  const res = await fetch(`${GH}${path}`, { headers, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`github ${res.status}`);
  return res.json();
}

function shapeRepos(repos) {
  return (Array.isArray(repos) ? repos : [])
    .filter((r) => !r.fork && !r.archived)
    .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at))
    .slice(0, 6)
    .map((r) => ({
      name: r.name,
      description: r.description || '',
      url: r.html_url,
      language: r.language || '',
      stars: r.stargazers_count || 0,
      updated: r.pushed_at
    }));
}

function shapeEvents(events) {
  return (Array.isArray(events) ? events : [])
    .filter((e) => EVENT_VERBS[e.type])
    .slice(0, 8)
    .map((e) => ({
      type: e.type,
      verb: EVENT_VERBS[e.type],
      repo: (e.repo && e.repo.name ? e.repo.name.split('/').pop() : '') || '',
      when: e.created_at
    }));
}

export async function onRequestGet(context) {
  const { env } = context;
  const cache = caches.default;
  const cacheKey = new Request(new URL('/api/github', context.request.url).toString(), context.request);

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  let payload;
  try {
    const [user, repos, events] = await Promise.all([
      ghFetch(`/users/${USER}`, env).catch(() => null),
      ghFetch(`/users/${USER}/repos?per_page=100&sort=pushed`, env).catch(() => []),
      ghFetch(`/users/${USER}/events/public?per_page=30`, env).catch(() => [])
    ]);

    payload = {
      user: user ? { login: user.login, url: user.html_url, publicRepos: user.public_repos } : null,
      repos: shapeRepos(repos),
      events: shapeEvents(events)
    };
  } catch {
    payload = { user: null, repos: [], events: [] };
  }

  const res = json(payload, 200, { 'Cache-Control': `public, max-age=${CACHE_TTL}` });
  try { context.waitUntil(cache.put(cacheKey, res.clone())); } catch { /* cache is best-effort */ }
  return res;
}
