// scripts/validate-content.mjs
// Validates src/content so the static site doesn't ship broken data.
// Hard-fails on structural issues (missing required fields, invalid dates, duplicate slugs).

import { readdir, readFile, access } from 'node:fs/promises';
import path from 'node:path';

async function readJSON(filePath) {
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function isValidStatus(v) {
  return v === 'draft' || v === 'published';
}

function isValidPostType(v) {
  return v === 'insights' || v === 'life';
}

function isValidDate(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function req(obj, key, ctx, errors) {
  if (obj?.[key] === undefined || obj?.[key] === null || obj?.[key] === '') {
    errors.push(`${ctx}: missing required field "${key}"`);
  }
}

export async function validateContent({ srcContentDir }) {
  const errors = [];
  const warnings = [];

  // site.json
  const sitePath = path.join(srcContentDir, 'site.json');
  if (!(await exists(sitePath))) errors.push('Missing src/content/site.json');
  else {
    try {
      await readJSON(sitePath);
    } catch {
      errors.push('Invalid JSON: src/content/site.json');
    }
  }

  // Projects
  await validateProjects({ srcContentDir, errors, warnings });

  // Posts
  await validatePosts({ srcContentDir, type: 'insights', errors, warnings });
  await validatePosts({ srcContentDir, type: 'life', errors, warnings });

  // Experience/Education (light validation)
  await validateExperience({ srcContentDir, errors });
  await validateEducation({ srcContentDir, errors });

  if (warnings.length) {
    console.warn('\nCONTENT WARNINGS:');
    for (const w of warnings) console.warn(' -', w);
  }

  if (errors.length) {
    const msg = ['\nCONTENT VALIDATION FAILED:'].concat(errors.map(e => ` - ${e}`)).join('\n');
    throw new Error(msg);
  }

  return true;
}

async function validateProjects({ srcContentDir, errors, warnings }) {
  const itemsDir = path.join(srcContentDir, 'projects', 'items');
  const slugs = await safeListDirs(itemsDir);

  const seen = new Set();
  for (const folderSlug of slugs) {
    const p = path.join(itemsDir, folderSlug, 'project.json');
    const ctx = `project:${folderSlug}`;
    if (!(await exists(p))) {
      errors.push(`${ctx}: missing project.json`);
      continue;
    }

    let project;
    try {
      project = await readJSON(p);
    } catch {
      errors.push(`${ctx}: invalid JSON in project.json`);
      continue;
    }

    req(project, 'slug', ctx, errors);
    req(project, 'title', ctx, errors);
    req(project, 'date', ctx, errors);
    req(project, 'summary', ctx, errors);
    req(project, 'problem', ctx, errors);
    req(project, 'approach', ctx, errors);
    req(project, 'tools', ctx, errors);
    req(project, 'outcome', ctx, errors);
    req(project, 'status', ctx, errors);

    if (project.slug && seen.has(project.slug)) errors.push(`${ctx}: duplicate slug "${project.slug}"`);
    if (project.slug) seen.add(project.slug);

    if (project.status && !isValidStatus(project.status)) errors.push(`${ctx}: invalid status "${project.status}"`);
    if (project.date && !isValidDate(project.date)) errors.push(`${ctx}: invalid date "${project.date}" (expected YYYY-MM-DD)`);

    // file references
    const base = path.join(itemsDir, folderSlug);
    if (project?.caseStudy?.enabled) {
      const mdPath = path.join(base, project.caseStudy.path || 'case-study.md');
      if (!(await exists(mdPath))) errors.push(`${ctx}: caseStudy enabled but missing ${project.caseStudy.path}`);
    }

    if (project?.images?.cover) {
      const imgPath = path.join(base, project.images.cover);
      if (!(await exists(imgPath))) errors.push(`${ctx}: missing cover image ${project.images.cover}`);
      if (!project?.images?.alt?.[project.images.cover]) warnings.push(`${ctx}: missing alt text for cover image`);
    }

    for (const g of project?.images?.gallery || []) {
      const imgPath = path.join(base, g);
      if (!(await exists(imgPath))) errors.push(`${ctx}: missing gallery image ${g}`);
      if (!project?.images?.alt?.[g]) warnings.push(`${ctx}: missing alt text for gallery image ${g}`);
    }
  }
}

async function validatePosts({ srcContentDir, type, errors, warnings }) {
  const itemsDir = path.join(srcContentDir, 'posts', type);
  const slugs = await safeListDirs(itemsDir);

  const seen = new Set();
  for (const folderSlug of slugs) {
    const p = path.join(itemsDir, folderSlug, 'post.json');
    const ctx = `post:${type}:${folderSlug}`;
    if (!(await exists(p))) {
      errors.push(`${ctx}: missing post.json`);
      continue;
    }

    let post;
    try {
      post = await readJSON(p);
    } catch {
      errors.push(`${ctx}: invalid JSON in post.json`);
      continue;
    }

    req(post, 'slug', ctx, errors);
    req(post, 'type', ctx, errors);
    req(post, 'status', ctx, errors);
    req(post, 'title', ctx, errors);
    req(post, 'date', ctx, errors);
    req(post, 'category', ctx, errors);
    req(post, 'tags', ctx, errors);
    req(post, 'contentPath', ctx, errors);

    if (post.slug && seen.has(post.slug)) errors.push(`${ctx}: duplicate slug "${post.slug}"`);
    if (post.slug) seen.add(post.slug);

    if (post.type && !isValidPostType(post.type)) errors.push(`${ctx}: invalid type "${post.type}"`);
    if (post.type && post.type !== type) errors.push(`${ctx}: type mismatch (folder=${type} post.json.type=${post.type})`);

    if (post.status && !isValidStatus(post.status)) errors.push(`${ctx}: invalid status "${post.status}"`);
    if (post.date && !isValidDate(post.date)) errors.push(`${ctx}: invalid date "${post.date}" (expected YYYY-MM-DD)`);

    const base = path.join(itemsDir, folderSlug);
    const mdPath = path.join(base, post.contentPath || 'content.md');
    if (!(await exists(mdPath))) errors.push(`${ctx}: missing markdown ${post.contentPath}`);

    if (post.coverImage) {
      const imgPath = path.join(base, post.coverImage);
      if (!(await exists(imgPath))) errors.push(`${ctx}: missing coverImage ${post.coverImage}`);
    } else {
      warnings.push(`${ctx}: missing coverImage (cards look better with one)`);
    }

    if (!post.summary) warnings.push(`${ctx}: missing summary (recommended for cards)`);
  }
}

async function validateExperience({ srcContentDir, errors }) {
  const p = path.join(srcContentDir, 'experience', 'experience.json');
  if (!(await exists(p))) return; // optional file

  let data;
  try {
    data = await readJSON(p);
  } catch {
    errors.push('experience: invalid JSON in experience.json');
    return;
  }

  const items = Array.isArray(data) ? data : (data.items || []);
  for (const [i, it] of items.entries()) {
    const ctx = `experience:item:${i}`;
    req(it, 'company', ctx, errors);
    req(it, 'role', ctx, errors);
    req(it, 'startDate', ctx, errors);
    req(it, 'description', ctx, errors);
    if (it.startDate && !isValidDate(it.startDate)) errors.push(`${ctx}: invalid startDate ${it.startDate}`);
    if (it.endDate && !isValidDate(it.endDate)) errors.push(`${ctx}: invalid endDate ${it.endDate}`);
  }
}

async function validateEducation({ srcContentDir, errors }) {
  const p = path.join(srcContentDir, 'education', 'education.json');
  if (!(await exists(p))) return;

  let data;
  try {
    data = await readJSON(p);
  } catch {
    errors.push('education: invalid JSON in education.json');
    return;
  }

  // New schema (preferred): { degrees, campusRoles, achievements, leadership }
  // Back-compat: allow { items: [...] } for older content.
  if (data && typeof data === 'object' && (data.degrees || data.campusRoles || data.achievements || data.leadership)) {
    const degrees = Array.isArray(data.degrees) ? data.degrees : [];
    for (const [i, it] of degrees.entries()) {
      const ctx = `education:degrees:${i}`;
      req(it, 'university', ctx, errors);
      req(it, 'degree', ctx, errors);
      if (it.startDate && !isValidDate(it.startDate)) errors.push(`${ctx}: invalid startDate ${it.startDate}`);
      if (it.endDate && !isValidDate(it.endDate)) errors.push(`${ctx}: invalid endDate ${it.endDate}`);
    }

    const roleLikeLists = [
      { key: 'campusRoles', label: 'campusRoles' },
      { key: 'leadership', label: 'leadership' }
    ];

    for (const list of roleLikeLists) {
      const arr = Array.isArray(data[list.key]) ? data[list.key] : [];
      for (const [i, it] of arr.entries()) {
        const ctx = `education:${list.label}:${i}`;
        req(it, 'title', ctx, errors);
        req(it, 'organization', ctx, errors);
        if (it.startDate && !isValidDate(it.startDate)) errors.push(`${ctx}: invalid startDate ${it.startDate}`);
        if (it.endDate && !isValidDate(it.endDate)) errors.push(`${ctx}: invalid endDate ${it.endDate}`);
      }
    }

    const achievements = Array.isArray(data.achievements) ? data.achievements : [];
    for (const [i, it] of achievements.entries()) {
      const ctx = `education:achievements:${i}`;
      req(it, 'title', ctx, errors);
      // org/date are optional; validate if present
      if (it.date && !isValidDate(it.date)) errors.push(`${ctx}: invalid date ${it.date}`);
    }

    return;
  }

  // Old schema: array or { items: [] }
  const items = Array.isArray(data) ? data : (data.items || []);
  for (const [i, it] of items.entries()) {
    const ctx = `education:item:${i}`;
    req(it, 'university', ctx, errors);
    req(it, 'degree', ctx, errors);
    if (it.startDate && !isValidDate(it.startDate)) errors.push(`${ctx}: invalid startDate ${it.startDate}`);
    if (it.endDate && !isValidDate(it.endDate)) errors.push(`${ctx}: invalid endDate ${it.endDate}`);
  }
}

async function safeListDirs(dir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries.filter(e => e.isDirectory()).map(e => e.name);
  } catch {
    return [];
  }
}

export const _internal = { isValidStatus, isValidPostType, isValidDate };
