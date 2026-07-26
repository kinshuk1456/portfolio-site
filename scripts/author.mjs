// scripts/author.mjs
// Local-only authoring helper.
// Creates new content folders/files in src/content without touching build artifacts.
// Safe for static hosting: this script never runs on Hostinger.

import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import path from 'node:path';
import { mkdir, writeFile, access } from 'node:fs/promises';

const ROOT = process.cwd();
const SRC_CONTENT = path.join(ROOT, 'src', 'content');

function slugify(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

async function writeJson(p, obj) {
  await writeFile(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function placeholderCoverSvg(title) {
  const safe = String(title || 'Cover').replace(/</g, '').replace(/>/g, '');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0b1020"/>
      <stop offset="1" stop-color="#1a1f3a"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="675" fill="url(#g)"/>
  <text x="96" y="160" fill="#eaf0ff" font-family="ui-sans-serif, system-ui" font-size="46" font-weight="700">${safe}</text>
  <text x="96" y="210" fill="#9db0d0" font-family="ui-sans-serif, system-ui" font-size="20">Placeholder image</text>
  <rect x="96" y="270" width="1008" height="310" rx="24" fill="#0f1a2a" stroke="#25324a"/>
</svg>
`;
}

async function createProject(rl) {
  const title = await rl.question('Project title: ');
  const slugInput = await rl.question(`Slug (enter to auto from title): `);
  const slug = slugify(slugInput || title);
  const date = (await rl.question(`Date (YYYY-MM-DD, enter for ${todayISO()}): `)) || todayISO();
  const summary = await rl.question('Summary (1 sentence): ');

  const folder = path.join(SRC_CONTENT, 'projects', 'items', slug);
  const gallery = path.join(folder, 'gallery');

  if (await exists(folder)) throw new Error(`Project folder already exists: ${folder}`);

  await mkdir(gallery, { recursive: true });

  const project = {
    slug,
    status: 'draft',
    featured: false,
    title,
    date,
    summary,
    problem: '',
    approach: '',
    tools: [],
    outcome: '',
    role: '',
    team: '',
    duration: '',
    links: [],
    tags: [],
    images: {
      cover: 'gallery/cover.svg',
      gallery: [],
      alt: { 'gallery/cover.svg': `${title} cover image` }
    },
    caseStudy: { enabled: true, path: 'case-study.md' }
  };

  await writeJson(path.join(folder, 'project.json'), project);
  await writeFile(path.join(folder, 'case-study.md'), `# ${title} — Case Study\n\n## Context\n\n## Problem\n\n## Approach\n\n## Outcome\n`, 'utf8');
  await writeFile(path.join(gallery, 'cover.svg'), placeholderCoverSvg(title), 'utf8');

  console.log('\nCreated project:', slug);
  console.log('  - src/content/projects/items/%s/project.json', slug);
}

async function createPost(rl, type) {
  const title = await rl.question('Post title: ');
  const slugInput = await rl.question(`Slug (enter to auto from title): `);
  const slug = slugify(slugInput || title);
  const date = (await rl.question(`Date (YYYY-MM-DD, enter for ${todayISO()}): `)) || todayISO();
  const category = await rl.question('Category: ');
  const summary = await rl.question('Summary (1 sentence): ');
  const tagsRaw = await rl.question('Tags (comma-separated): ');
  const tags = tagsRaw.split(',').map(s => s.trim()).filter(Boolean);

  const folder = path.join(SRC_CONTENT, 'posts', type, slug);
  if (await exists(folder)) throw new Error(`Post folder already exists: ${folder}`);
  await mkdir(folder, { recursive: true });

  const post = {
    slug,
    type,
    status: 'draft',
    featured: false,
    title,
    date,
    category,
    tags,
    summary,
    coverImage: 'cover.svg',
    contentPath: 'content.md'
  };

  await writeJson(path.join(folder, 'post.json'), post);
  await writeFile(path.join(folder, 'content.md'), `# ${title}\n\n`, 'utf8');
  await writeFile(path.join(folder, 'cover.svg'), placeholderCoverSvg(title), 'utf8');

  console.log('\nCreated post:', `${type}/${slug}`);
  console.log('  - src/content/posts/%s/%s/post.json', type, slug);
}

async function main() {
  const rl = readline.createInterface({ input, output });

  try {
    console.log('Local authoring helper');
    console.log('1) New Project');
    console.log('2) New Insights Post');
    console.log('3) New Life Post');

    const choice = await rl.question('Choose (1-3): ');

    if (choice === '1') await createProject(rl);
    else if (choice === '2') await createPost(rl, 'insights');
    else if (choice === '3') await createPost(rl, 'life');
    else console.log('No action.');

    console.log('\nNext: run `npm run build` and refresh preview.');
  } finally {
    rl.close();
  }
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
