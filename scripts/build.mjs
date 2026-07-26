// scripts/build.mjs
// Orchestrates the build (deployment-ready dist/ for Hostinger).
// Requirements implemented:
// - src/content is source-of-truth
// - build does NOT modify authored source files
// - dist/data contains authored content (copied, excluding templates)
// - dist/content contains GENERATED artifacts only (indexes/manifests)
// - exclude src/content/templates from dist

import { rm, mkdir, cp } from 'node:fs/promises';
import path from 'node:path';

import { validateContent } from './validate-content.mjs';
import { buildIndexes } from './build-indexes.mjs';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');

async function cleanDist() {
  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });
}

async function copyPagesAndAssets() {
  // Copy pages -> dist (flat)
  await cp(path.join(SRC, 'pages'), DIST, { recursive: true });

  // Copy frontend assets -> dist/assets
  await cp(path.join(SRC, 'assets'), path.join(DIST, 'assets'), { recursive: true });
}

async function copyAuthoredContentToDist() {
  // Copy authored content into dist/data (deployment-readable), but keep dist/content
  // reserved for GENERATED artifacts only.
  // Note: we exclude templates after copy to keep it simple and reliable.
  await cp(path.join(SRC, 'content'), path.join(DIST, 'data'), { recursive: true });

  // Remove templates from dist/data (authoring-only)
  await rm(path.join(DIST, 'data', 'templates'), { recursive: true, force: true });
}

async function main() {
  await cleanDist();

  // 1) Validate source content (fail fast)
  await validateContent({ srcContentDir: path.join(SRC, 'content') });

  // 2) Copy authored content first (so dist has item json/md/images)
  await copyAuthoredContentToDist();

  // 3) Generate manifests into dist/content only
  await buildIndexes({ srcContentDir: path.join(SRC, 'content'), distContentDir: path.join(DIST, 'content') });

  // 4) Copy pages + assets
  await copyPagesAndAssets();

  console.log('Build complete:', DIST);
  console.log('Upload this folder to Hostinger: dist/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
