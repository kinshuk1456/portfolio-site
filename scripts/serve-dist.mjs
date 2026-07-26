// scripts/serve-dist.mjs
// Tiny static server for local preview (no dependencies).
// Usage: npm run preview

import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

const PORT = Number(process.env.PORT || 4173);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon'
};

function safeJoin(base, reqPath) {
  const cleaned = reqPath.split('?')[0].split('#')[0];
  const decoded = decodeURIComponent(cleaned);
  const joined = path.join(base, decoded);
  const normalizedBase = path.resolve(base) + path.sep;
  const normalizedJoined = path.resolve(joined);
  if (!normalizedJoined.startsWith(normalizedBase)) return null;
  return normalizedJoined;
}

async function fileExists(p) {
  try {
    const s = await stat(p);
    return s.isFile();
  } catch {
    return false;
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const urlPath = req.url === '/' ? '/index.html' : (req.url || '/');
    const fullPath = safeJoin(DIST, urlPath);
    if (!fullPath) {
      res.writeHead(400);
      res.end('Bad request');
      return;
    }

    let target = fullPath;
    if (!(await fileExists(target))) {
      // Basic 404 fallback
      const notFound = path.join(DIST, '404.html');
      if (await fileExists(notFound)) {
        target = notFound;
        res.statusCode = 404;
      } else {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
    }

    const ext = path.extname(target).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';
    const buf = await readFile(target);

    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'no-cache');
    res.end(buf);
  } catch (err) {
    res.writeHead(500);
    res.end(err?.message || 'Server error');
  }
});

server.listen(PORT, () => {
  console.log(`Preview server running:`);
  console.log(`  http://localhost:${PORT}/`);
});
