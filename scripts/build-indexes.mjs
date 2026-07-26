// scripts/build-indexes.mjs
// Generates collection manifests (indexes) into dist/content only.
// Does NOT modify src/content.

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

function toPosix(p) {
  return p.split(path.sep).join('/');
}

async function readJSON(filePath) {
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

function byDateDesc(a, b) {
  // date is YYYY-MM-DD; lexical sort works
  return String(b.date || '').localeCompare(String(a.date || ''));
}

export async function buildIndexes({ srcContentDir, distContentDir }) {
  await Promise.all([
    buildProjectsIndex({ srcContentDir, distContentDir }),
    buildPostsIndex({ srcContentDir, distContentDir, type: 'insights' }),
    buildPostsIndex({ srcContentDir, distContentDir, type: 'life' }),
    buildAllPostsIndex({ distContentDir }),
    buildExperienceIndex({ srcContentDir, distContentDir }),
    buildEducationIndex({ srcContentDir, distContentDir }),
    writeBuildMeta({ distContentDir })
  ]);
}

async function buildProjectsIndex({ srcContentDir, distContentDir }) {
  const itemsDir = path.join(srcContentDir, 'projects', 'items');
  const outDir = path.join(distContentDir, 'projects');
  const outPath = path.join(outDir, 'index.json');
  await mkdir(outDir, { recursive: true });

  const slugs = await safeListDirs(itemsDir);
  const entries = [];

  for (const slug of slugs) {
    const p = path.join(itemsDir, slug, 'project.json');
    let project;
    try {
      project = await readJSON(p);
    } catch {
      continue;
    }

    const status = project.status || 'draft';
    if (status !== 'published') continue;

    entries.push({
      slug: project.slug || slug,
      title: project.title || slug,
      date: project.date || null,
      summary: project.summary || '',
      tags: project.tags || [],
      disciplines: project.disciplines || [],
      featured: !!project.featured,
      status,
      coverImage: project?.images?.cover
        ? toPosix(path.join('data', 'projects', 'items', slug, project.images.cover))
        : null,
      hasCaseStudy: !!project?.caseStudy?.enabled
    });
  }

  entries.sort(byDateDesc);
  await writeFile(outPath, JSON.stringify(entries, null, 2), 'utf8');
}

async function buildPostsIndex({ srcContentDir, distContentDir, type }) {
  const itemsDir = path.join(srcContentDir, 'posts', type);
  const outDir = path.join(distContentDir, 'posts');
  const outPath = path.join(outDir, `${type}.index.json`);
  await mkdir(outDir, { recursive: true });

  const slugs = await safeListDirs(itemsDir);
  const entries = [];

  for (const slug of slugs) {
    const p = path.join(itemsDir, slug, 'post.json');
    let post;
    try {
      post = await readJSON(p);
    } catch {
      continue;
    }

    const status = post.status || 'draft';
    if (status !== 'published') continue;

    entries.push({
      slug: post.slug || slug,
      type: post.type || type,
      title: post.title || slug,
      date: post.date || null,
      category: post.category || '',
      tags: post.tags || [],
      summary: post.summary || '',
      featured: !!post.featured,
      status,
      coverImage: post.coverImage
        ? toPosix(path.join('data', 'posts', type, slug, post.coverImage))
        : null
    });
  }

  entries.sort(byDateDesc);
  await writeFile(outPath, JSON.stringify(entries, null, 2), 'utf8');
}

async function buildExperienceIndex({ srcContentDir, distContentDir }) {
  const inPath = path.join(srcContentDir, 'experience', 'experience.json');
  const outDir = path.join(distContentDir, 'experience');
  const outPath = path.join(outDir, 'index.json');
  await mkdir(outDir, { recursive: true });

  let items = [];
  try {
    const data = await readJSON(inPath);
    items = Array.isArray(data) ? data : (data.items || []);
  } catch {
    items = [];
  }

  items = items.slice().sort((a, b) => {
    const ac = !!a.current;
    const bc = !!b.current;
    if (ac !== bc) return bc - ac;
    return String(b.startDate || '').localeCompare(String(a.startDate || ''));
  });

  await writeFile(outPath, JSON.stringify(items, null, 2), 'utf8');
}

async function buildEducationIndex({ srcContentDir, distContentDir }) {
  const inPath = path.join(srcContentDir, 'education', 'education.json');
  const outDir = path.join(distContentDir, 'education');
  const outPath = path.join(outDir, 'index.json');
  await mkdir(outDir, { recursive: true });

  let data = null;
  try {
    data = await readJSON(inPath);
  } catch {
    data = null;
  }

  // New schema preferred: object with sections.
  if (data && typeof data === 'object' && (data.degrees || data.campusRoles || data.achievements || data.leadership)) {
    const degrees = Array.isArray(data.degrees) ? data.degrees : [];
    const campusRoles = Array.isArray(data.campusRoles) ? data.campusRoles : [];
    const achievements = Array.isArray(data.achievements) ? data.achievements : [];
    const leadership = Array.isArray(data.leadership) ? data.leadership : [];

    const sortByEndThenStartDesc = (a, b) => {
      const be = String(b.endDate || b.startDate || '');
      const ae = String(a.endDate || a.startDate || '');
      return be.localeCompare(ae);
    };

    const sortByDateDesc = (a, b) => String(b.date || '').localeCompare(String(a.date || ''));

    const out = {
      degrees: degrees.slice().sort(sortByEndThenStartDesc),
      campusRoles: campusRoles.slice(),
      achievements: achievements.slice().sort(sortByDateDesc),
      leadership: leadership.slice()
    };

    await writeFile(outPath, JSON.stringify(out, null, 2), 'utf8');
    return;
  }

  // Back-compat: old schema array/{items}
  let items = [];
  if (Array.isArray(data)) items = data;
  else if (data && typeof data === 'object') items = data.items || [];

  items = items.slice().sort((a, b) => {
    const be = String(b.endDate || b.startDate || '');
    const ae = String(a.endDate || a.startDate || '');
    return be.localeCompare(ae);
  });

  await writeFile(outPath, JSON.stringify(items, null, 2), 'utf8');
}

async function buildAllPostsIndex({ distContentDir }) {
  const outDir = path.join(distContentDir, 'posts');
  const outPath = path.join(outDir, 'index.json');
  await mkdir(outDir, { recursive: true });

  // This file is created as a convenience for homepage/combined feeds.
  // It is derived from the two per-type indexes generated above.
  const [insights, life] = await Promise.all([
    readJSON(path.join(outDir, 'insights.index.json')).catch(() => []),
    readJSON(path.join(outDir, 'life.index.json')).catch(() => [])
  ]);

  const combined = ([]).concat(insights || [], life || []).sort(byDateDesc);
  await writeFile(outPath, JSON.stringify(combined, null, 2), 'utf8');
}

async function writeBuildMeta({ distContentDir }) {
  const outDir = path.join(distContentDir);
  const outPath = path.join(outDir, 'build.json');
  await mkdir(outDir, { recursive: true });

  const meta = {
    generatedAt: new Date().toISOString(),
    schemaVersion: 1
  };

  await writeFile(outPath, JSON.stringify(meta, null, 2), 'utf8');
}

async function safeListDirs(dir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries.filter(e => e.isDirectory()).map(e => e.name);
  } catch {
    return [];
  }
}
