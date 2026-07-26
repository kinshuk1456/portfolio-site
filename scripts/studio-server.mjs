// scripts/studio-server.mjs
// Local-only Portfolio Studio server (no external deps).
// Serves a small UI and provides file read/write APIs for src/content.
// Run: npm run studio

import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile, mkdir, readdir, stat, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.join(__dirname, '..');
const CONTENT_ROOT = path.join(ROOT, 'src', 'content');
const STUDIO_ROOT = path.join(ROOT, 'studio');

const HOST = process.env.HOST || '127.0.0.1'; // local-only
const PORT = Number(process.env.PORT || 4174);

// --- helpers ---

function send(res, status, body, headers = {}) {
  const isBuf = Buffer.isBuffer(body);
  const isObj = body && typeof body === 'object' && !isBuf;
  const payload = isObj ? Buffer.from(JSON.stringify(body, null, 2)) : (isBuf ? body : Buffer.from(String(body ?? '')));
  const baseHeaders = {
    'Cache-Control': 'no-cache',
    ...headers
  };
  if (!baseHeaders['Content-Type']) {
    baseHeaders['Content-Type'] = isObj ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8';
  }
  res.writeHead(status, baseHeaders);
  res.end(payload);
}

function notFound(res) {
  send(res, 404, { error: 'Not found' });
}

function badRequest(res, msg) {
  send(res, 400, { error: msg || 'Bad request' });
}

function methodNotAllowed(res) {
  send(res, 405, { error: 'Method not allowed' });
}

async function readJson(p) {
  const raw = await readFile(p, 'utf8');
  return JSON.parse(raw);
}

async function writeJson(p, obj) {
  const dir = path.dirname(p);
  await mkdir(dir, { recursive: true });
  await writeFile(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

async function readText(p) {
  return await readFile(p, 'utf8');
}

async function writeText(p, s) {
  const dir = path.dirname(p);
  await mkdir(dir, { recursive: true });
  await writeFile(p, s ?? '', 'utf8');
}

function safeInside(base, rel) {
  // rel is user-controlled: disallow absolute paths + traversal
  if (!rel || typeof rel !== 'string') return null;
  if (rel.includes('\\')) rel = rel.replace(/\\/g, '/');
  if (rel.startsWith('/') || /^[a-zA-Z]:/.test(rel)) return null;
  const full = path.resolve(base, rel);
  const normalizedBase = path.resolve(base) + path.sep;
  if (!full.startsWith(normalizedBase)) return null;
  return full;
}

async function readBodyJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('Invalid JSON body');
  }
}

function sanitizeFilename(name) {
  const base = String(name || '').trim();
  const just = base.split(/[\\/]/).pop() || 'file';
  // keep simple safe chars
  const cleaned = just
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]+/g, '')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '');
  return cleaned || 'file';
}

async function listDirs(dir) {
  const items = await readdir(dir, { withFileTypes: true });
  return items.filter(d => d.isDirectory()).map(d => d.name).sort();
}

function contentPaths() {
  return {
    site: path.join(CONTENT_ROOT, 'site.json'),
    projectsRoot: path.join(CONTENT_ROOT, 'projects', 'items'),
    postsRoot: path.join(CONTENT_ROOT, 'posts'),
    experience: path.join(CONTENT_ROOT, 'experience', 'experience.json'),
    education: path.join(CONTENT_ROOT, 'education', 'education.json')
  };
}

// --- build/preview integration ---

let previewProc = null;

function spawnCmd(cmd, args, opts = {}) {
  return spawn(cmd, args, {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
    ...opts
  });
}

async function runBuild() {
  return await new Promise((resolve) => {
    const p = spawnCmd('npm', ['run', 'build']);
    let out = '';
    p.stdout.on('data', d => { out += d.toString('utf8'); });
    p.stderr.on('data', d => { out += d.toString('utf8'); });
    p.on('close', (code) => resolve({ code, output: out }));
  });
}

function startPreview() {
  if (previewProc && !previewProc.killed) {
    return { started: false, message: 'Preview already running', url: 'http://localhost:4173/' };
  }
  previewProc = spawnCmd('npm', ['run', 'preview'], {
    env: { ...process.env, PORT: process.env.PREVIEW_PORT || '4173' }
  });
  previewProc.on('close', () => { previewProc = null; });
  return { started: true, message: 'Preview started', url: `http://localhost:${process.env.PREVIEW_PORT || 4173}/` };
}

function stopPreview() {
  if (!previewProc) return { stopped: false, message: 'Preview not running' };
  try {
    previewProc.kill();
  } catch {}
  previewProc = null;
  return { stopped: true, message: 'Preview stopped' };
}

async function openDistFolder() {
  const dist = path.join(ROOT, 'dist');
  if (process.platform === 'win32') {
    spawn('explorer.exe', [dist], { detached: true, stdio: 'ignore' }).unref();
    return { ok: true, path: dist };
  }
  return { ok: false, path: dist, message: 'Open folder is only implemented for Windows in this repo' };
}

// --- API routes ---

async function handleApi(req, res, url) {
  const { site, projectsRoot, postsRoot, experience, education } = contentPaths();

  const isImageExt = (p) => ['.svg','.png','.jpg','.jpeg','.webp','.gif','.ico'].includes(path.extname(p).toLowerCase());

  const resolveSiteContentPath = (p) => {
    // Site uses paths like: data/assets/headshot.jpg
    // Map to src/content/** by stripping leading "data/" if present.
    let rel = String(p || '').trim();
    rel = rel.replace(/^\//, '');
    if (rel.startsWith('data/')) rel = rel.slice('data/'.length);
    return rel;
  };

  const resolveProjectContentRel = (slug, p) => {
    // project image paths are typically relative to project folder (e.g. gallery/cover.svg)
    let rel = String(p || '').trim().replace(/^\//, '');
    // if a user pastes a data/... path, try to map similarly
    if (rel.startsWith('data/')) rel = rel.slice('data/'.length);
    // If already absolute under projects/items, keep it; else treat as relative within the project folder
    if (!rel.startsWith('projects/items/')) rel = path.posix.join('projects/items', slug, rel);
    return rel;
  };

  const resolvePostContentRel = (kind, slug, p) => {
    let rel = String(p || '').trim().replace(/^\//, '');
    if (rel.startsWith('data/')) rel = rel.slice('data/'.length);
    if (!rel.startsWith(`posts/${kind}/`)) rel = path.posix.join('posts', kind, slug, rel);
    return rel;
  };

  async function fileExists(p) {
    try {
      const s = await stat(p);
      return s.isFile();
    } catch {
      return false;
    }
  }

  // health
  if (url.pathname === '/api/health' && req.method === 'GET') {
    return send(res, 200, { ok: true, root: ROOT });
  }

  // Site settings
  if (url.pathname === '/api/site') {
    if (req.method === 'GET') {
      const data = await readJson(site);
      return send(res, 200, data);
    }
    if (req.method === 'PUT') {
      const body = await readBodyJson(req);
      // minimal validation
      if (!body?.name) return badRequest(res, 'Site.name is required');
      await writeJson(site, body);
      return send(res, 200, { ok: true });
    }
    return methodNotAllowed(res);
  }

  // Projects list
  if (url.pathname === '/api/projects' && req.method === 'GET') {
    const slugs = await listDirs(projectsRoot);
    const items = [];
    for (const slug of slugs) {
      const p = path.join(projectsRoot, slug, 'project.json');
      try {
        const j = await readJson(p);
        items.push({ slug, title: j.title || slug, date: j.date || null, featured: !!j.featured, status: j.status || null });
      } catch {
        items.push({ slug, title: slug, date: null, featured: false, status: 'error' });
      }
    }
    return send(res, 200, { items });
  }

  // Projects item CRUD
  if (url.pathname.startsWith('/api/projects/')) {
    const slug = decodeURIComponent(url.pathname.slice('/api/projects/'.length));
    if (!slug) return badRequest(res, 'Missing slug');

    const folder = path.join(projectsRoot, slug);
    const projectJsonPath = path.join(folder, 'project.json');
    const caseStudyPath = path.join(folder, 'case-study.md');

    if (req.method === 'GET') {
      const project = await readJson(projectJsonPath);
      let body = '';
      try { body = await readText(caseStudyPath); } catch { body = ''; }
      return send(res, 200, { project, caseStudy: body });
    }

    if (req.method === 'PUT') {
      const payload = await readBodyJson(req);
      const { project, caseStudy } = payload || {};
      if (!project?.title) return badRequest(res, 'Project.title is required');
      if (!project?.slug) return badRequest(res, 'Project.slug is required');
      if (project.slug !== slug) {
        return badRequest(res, 'Slug in URL must match project.slug (rename will be added later)');
      }
      await writeJson(projectJsonPath, project);
      await writeText(caseStudyPath, caseStudy ?? '');
      return send(res, 200, { ok: true });
    }

    if (req.method === 'DELETE') {
      // delete entire project folder
      await rm(folder, { recursive: true, force: true });
      return send(res, 200, { ok: true });
    }

    return methodNotAllowed(res);
  }

  // Posts list (insights/life)
  if (url.pathname === '/api/posts' && req.method === 'GET') {
    const kind = url.searchParams.get('kind');
    if (!['insights', 'life'].includes(kind)) return badRequest(res, 'kind must be insights|life');
    const root = path.join(postsRoot, kind);
    const slugs = await listDirs(root);
    const items = [];
    for (const slug of slugs) {
      const p = path.join(root, slug, 'post.json');
      try {
        const j = await readJson(p);
        items.push({ slug, title: j.title || slug, date: j.date || null, featured: !!j.featured, status: j.status || null, category: j.category || null });
      } catch {
        items.push({ slug, title: slug, date: null, featured: false, status: 'error' });
      }
    }
    return send(res, 200, { items });
  }

  // Posts item CRUD
  if (url.pathname.startsWith('/api/posts/')) {
    const rest = url.pathname.slice('/api/posts/'.length); // {kind}/{slug}
    const [kind, slugRaw] = rest.split('/');
    const slug = decodeURIComponent(slugRaw || '');
    if (!['insights', 'life'].includes(kind)) return badRequest(res, 'kind must be insights|life');
    if (!slug) return badRequest(res, 'Missing slug');

    const folder = path.join(postsRoot, kind, slug);
    const postJsonPath = path.join(folder, 'post.json');
    const contentMdPath = path.join(folder, 'content.md');

    if (req.method === 'GET') {
      const post = await readJson(postJsonPath);
      let body = '';
      try { body = await readText(contentMdPath); } catch { body = ''; }
      return send(res, 200, { post, content: body });
    }

    if (req.method === 'PUT') {
      const payload = await readBodyJson(req);
      const { post, content } = payload || {};
      if (!post?.title) return badRequest(res, 'Post.title is required');
      if (!post?.slug) return badRequest(res, 'Post.slug is required');
      if (post.slug !== slug) {
        return badRequest(res, 'Slug in URL must match post.slug (rename will be added later)');
      }
      await writeJson(postJsonPath, post);
      await writeText(contentMdPath, content ?? '');
      return send(res, 200, { ok: true });
    }

    if (req.method === 'DELETE') {
      await rm(folder, { recursive: true, force: true });
      return send(res, 200, { ok: true });
    }

    return methodNotAllowed(res);
  }

  // Experience
  if (url.pathname === '/api/experience') {
    if (req.method === 'GET') {
      const data = await readJson(experience);
      return send(res, 200, data);
    }
    if (req.method === 'PUT') {
      const body = await readBodyJson(req);
      await writeJson(experience, body);
      return send(res, 200, { ok: true });
    }
    return methodNotAllowed(res);
  }

  // Education
  if (url.pathname === '/api/education') {
    if (req.method === 'GET') {
      const data = await readJson(education);
      return send(res, 200, data);
    }
    if (req.method === 'PUT') {
      const body = await readBodyJson(req);
      await writeJson(education, body);
      return send(res, 200, { ok: true });
    }
    return methodNotAllowed(res);
  }

  // Image path resolve + validation (local-only)
  // GET /api/image/resolve?scope=site|project|post&path=...&slug=...&kind=insights|life
  if (url.pathname === '/api/image/resolve' && req.method === 'GET') {
    const scope = url.searchParams.get('scope');
    const p = url.searchParams.get('path') || '';
    if (!p.trim()) return send(res, 200, { ok: true, exists: false, resolved: null, previewUrl: null, message: 'No path set' });

    let rel;
    if (scope === 'site') {
      rel = resolveSiteContentPath(p);
    } else if (scope === 'project') {
      const slug = url.searchParams.get('slug');
      if (!slug) return badRequest(res, 'Missing slug for project scope');
      rel = resolveProjectContentRel(slug, p);
    } else if (scope === 'post') {
      const kind = url.searchParams.get('kind');
      const slug = url.searchParams.get('slug');
      if (!kind || !slug) return badRequest(res, 'Missing kind/slug for post scope');
      rel = resolvePostContentRel(kind, slug, p);
    } else {
      return badRequest(res, 'scope must be site|project|post');
    }

    // Ensure it's inside src/content
    const full = safeInside(CONTENT_ROOT, rel);
    if (!full) return send(res, 200, { ok: true, exists: false, resolved: rel, previewUrl: null, message: 'Path is outside src/content (blocked)' });

    const exists = await fileExists(full);
    const isImg = isImageExt(full);
    const previewUrl = exists && isImg ? `/content/${encodeURIComponent(rel).replace(/%2F/g,'/')}` : null;
    return send(res, 200, {
      ok: true,
      exists,
      isImage: isImg,
      resolved: rel,
      previewUrl,
      message: exists ? 'OK' : 'File not found'
    });
  }

  // Upload helper (local-only)
  // POST /api/upload { scope: 'assets'|'project'|'post', kind?, slug?, filename, dataBase64, subdir? }
  if (url.pathname === '/api/upload' && req.method === 'POST') {
    const body = await readBodyJson(req);
    const scope = body.scope;
    const kind = body.kind;
    const slug = body.slug;
    const subdir = (body.subdir || '').toString().replace(/^\//,'');

    if (!['assets','project','post'].includes(scope)) return badRequest(res, 'scope must be assets|project|post');
    if (scope === 'project' && !slug) return badRequest(res, 'Missing slug');
    if (scope === 'post' && (!slug || !kind)) return badRequest(res, 'Missing kind/slug');
    if (scope === 'post' && !['insights','life'].includes(kind)) return badRequest(res, 'kind must be insights|life');

    const filename = sanitizeFilename(body.filename);
    if (!filename) return badRequest(res, 'Missing filename');

    const ext = path.extname(filename).toLowerCase();
    if (!['.svg','.png','.jpg','.jpeg','.webp','.gif','.ico'].includes(ext)) {
      return badRequest(res, 'Only image files are allowed');
    }

    const b64 = String(body.dataBase64 || '').trim();
    if (!b64) return badRequest(res, 'Missing dataBase64');

    // size guard (~12MB base64 string -> ~9MB binary)
    if (b64.length > 12_000_000) return badRequest(res, 'File too large');

    let baseDir;
    let relForValue;

    if (scope === 'assets') {
      baseDir = path.join(CONTENT_ROOT, 'assets');
      relForValue = (name) => `data/assets/${name}`;
    } else if (scope === 'project') {
      baseDir = path.join(CONTENT_ROOT, 'projects', 'items', slug);
      relForValue = (name) => (subdir ? `${subdir}/${name}` : name);
    } else {
      baseDir = path.join(CONTENT_ROOT, 'posts', kind, slug);
      relForValue = (name) => (subdir ? `${subdir}/${name}` : name);
    }

    const fullDir = subdir ? path.join(baseDir, subdir) : baseDir;
    // block traversal
    const safeDir = safeInside(CONTENT_ROOT, path.relative(CONTENT_ROOT, fullDir).replace(/\\/g,'/'));
    if (!safeDir) return badRequest(res, 'Invalid destination');

    await mkdir(safeDir, { recursive: true });
    const dest = path.join(safeDir, filename);

    const buf = Buffer.from(b64, 'base64');
    await writeFile(dest, buf);

    // Return both the value to put into JSON and the resolved path under src/content for preview
    let resolvedRel;
    if (scope === 'assets') {
      resolvedRel = `assets/${filename}`;
    } else if (scope === 'project') {
      const rel = subdir ? `projects/items/${slug}/${subdir}/${filename}` : `projects/items/${slug}/${filename}`;
      resolvedRel = rel;
    } else {
      const rel = subdir ? `posts/${kind}/${slug}/${subdir}/${filename}` : `posts/${kind}/${slug}/${filename}`;
      resolvedRel = rel;
    }

    return send(res, 200, {
      ok: true,
      valuePath: relForValue(filename),
      resolved: resolvedRel,
      previewUrl: `/content/${encodeURIComponent(resolvedRel).replace(/%2F/g,'/')}`
    });
  }

  // List image options
  // GET /api/image/options?scope=assets|project|post&slug=...&kind=insights|life
  if (url.pathname === '/api/image/options' && req.method === 'GET') {
    const scope = url.searchParams.get('scope');
    let baseDir;
    if (scope === 'assets') {
      baseDir = path.join(CONTENT_ROOT, 'assets');
    } else if (scope === 'project') {
      const slug = url.searchParams.get('slug');
      if (!slug) return badRequest(res, 'Missing slug for project scope');
      baseDir = path.join(CONTENT_ROOT, 'projects', 'items', slug);
    } else if (scope === 'post') {
      const kind = url.searchParams.get('kind');
      const slug = url.searchParams.get('slug');
      if (!kind || !slug) return badRequest(res, 'Missing kind/slug for post scope');
      baseDir = path.join(CONTENT_ROOT, 'posts', kind, slug);
    } else {
      return badRequest(res, 'scope must be assets|project|post');
    }

    async function walk(dir, relBase = '') {
      const out = [];
      let items = [];
      try { items = await readdir(dir, { withFileTypes: true }); } catch { return out; }
      for (const it of items) {
        if (it.name.startsWith('.')) continue;
        const full = path.join(dir, it.name);
        const rel = relBase ? `${relBase}/${it.name}` : it.name;
        if (it.isDirectory()) {
          out.push(...await walk(full, rel));
        } else if (it.isFile() && isImageExt(full)) {
          out.push(rel);
        }
      }
      return out;
    }

    const options = await walk(baseDir);
    options.sort();
    return send(res, 200, { ok: true, options });
  }

  // Commands
  if (url.pathname === '/api/commands/build' && req.method === 'POST') {
    const r = await runBuild();
    return send(res, 200, r);
  }
  if (url.pathname === '/api/commands/preview/start' && req.method === 'POST') {
    return send(res, 200, startPreview());
  }
  if (url.pathname === '/api/commands/preview/stop' && req.method === 'POST') {
    return send(res, 200, stopPreview());
  }
  if (url.pathname === '/api/commands/dist/open' && req.method === 'POST') {
    return send(res, 200, await openDistFolder());
  }

  return notFound(res);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon'
};

async function serveStatic(req, res, url) {
  // Serve /studio/* from STUDIO_ROOT
  const reqPath = url.pathname === '/' ? '/index.html' : url.pathname;
  const rel = reqPath.startsWith('/studio') ? reqPath.slice('/studio'.length) : reqPath;
  const fileRel = (!rel || rel === '/' ) ? '/index.html' : rel;
  const full = safeInside(STUDIO_ROOT, fileRel.replace(/^\//, ''));
  if (!full) return notFound(res);

  try {
    const s = await stat(full);
    if (!s.isFile()) return notFound(res);
    const ext = path.extname(full).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';
    const buf = await readFile(full);
    return send(res, 200, buf, { 'Content-Type': mime });
  } catch {
    return notFound(res);
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || `${HOST}:${PORT}`}`);

    // basic CORS for local UI
    res.setHeader('Access-Control-Allow-Origin', `http://${HOST}:${PORT}`);
    res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return send(res, 204, '');

    if (url.pathname.startsWith('/api/')) {
      return await handleApi(req, res, url);
    }

    // Serve read-only content files for previews (local-only)
    if (url.pathname.startsWith('/content/')) {
      const rel = decodeURIComponent(url.pathname.slice('/content/'.length));
      const full = safeInside(CONTENT_ROOT, rel);
      if (!full) return notFound(res);
      try {
        const s = await stat(full);
        if (!s.isFile()) return notFound(res);
        const ext = path.extname(full).toLowerCase();
        const mime = MIME[ext] || 'application/octet-stream';
        const buf = await readFile(full);
        return send(res, 200, buf, { 'Content-Type': mime });
      } catch {
        return notFound(res);
      }
    }

    // Redirect / to /studio/
    if (url.pathname === '/') {
      res.writeHead(302, { Location: '/studio/' });
      res.end();
      return;
    }

    // Serve UI
    if (url.pathname === '/studio' || url.pathname.startsWith('/studio/')) {
      return await serveStatic(req, res, url);
    }

    return notFound(res);
  } catch (err) {
    return send(res, 500, { error: err?.message || 'Server error' });
  }
});

server.listen(PORT, HOST, () => {
  console.log('Portfolio Studio running (local-only):');
  console.log(`  http://${HOST}:${PORT}/studio/`);
  console.log('Writes directly into: src/content/**');
});
