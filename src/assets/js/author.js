// author.js
// Local browser helper that generates downloadable JSON/MD placeholders.
// This does NOT (and cannot) write to Hostinger. It's just a file generator.

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

function downloadText(filename, text, mime = 'text/plain') {
  const blob = new Blob([text], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function placeholderCoverSvg(title) {
  const safe = String(title || 'Cover').replace(/</g, '').replace(/>/g, '');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">\n  <defs>\n    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">\n      <stop offset="0" stop-color="#0b1020"/>\n      <stop offset="1" stop-color="#1a1f3a"/>\n    </linearGradient>\n  </defs>\n  <rect width="1200" height="675" fill="url(#g)"/>\n  <text x="96" y="160" fill="#eaf0ff" font-family="ui-sans-serif, system-ui" font-size="46" font-weight="700">${safe}</text>\n  <text x="96" y="210" fill="#9db0d0" font-family="ui-sans-serif, system-ui" font-size="20">Placeholder image</text>\n  <rect x="96" y="270" width="1008" height="310" rx="24" fill="#0f1a2a" stroke="#25324a"/>\n</svg>\n`;
}

let kind = 'project';
const out = document.querySelector('#out');

for (const btn of document.querySelectorAll('[data-kind]')) {
  btn.addEventListener('click', () => {
    kind = btn.getAttribute('data-kind');
    out.textContent = `Selected: ${kind}`;
  });
}

const form = document.querySelector('#author-form');
form.addEventListener('submit', (e) => {
  e.preventDefault();

  const data = new FormData(form);
  const title = String(data.get('title') || '').trim();
  const slug = slugify(String(data.get('slug') || '').trim() || title);
  const date = String(data.get('date') || '').trim() || todayISO();
  const category = String(data.get('category') || '').trim();
  const summary = String(data.get('summary') || '').trim();
  const tags = String(data.get('tags') || '').split(',').map(s => s.trim()).filter(Boolean);

  if (!title) return;

  if (kind === 'project') {
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
      tags,
      images: {
        cover: 'gallery/cover.svg',
        gallery: [],
        alt: { 'gallery/cover.svg': `${title} cover image` }
      },
      caseStudy: { enabled: true, path: 'case-study.md' }
    };

    downloadText(`${slug}/project.json`, JSON.stringify(project, null, 2) + '\n', 'application/json');
    downloadText(`${slug}/case-study.md`, `# ${title} — Case Study\n\n## Context\n\n## Problem\n\n## Approach\n\n## Outcome\n`, 'text/markdown');
    downloadText(`${slug}/gallery/cover.svg`, placeholderCoverSvg(title), 'image/svg+xml');

    out.textContent = `Downloaded: ${slug}/ (place into src/content/projects/items/${slug}/)`;
  }

  if (kind === 'insights' || kind === 'life') {
    const type = kind;
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

    downloadText(`${slug}/post.json`, JSON.stringify(post, null, 2) + '\n', 'application/json');
    downloadText(`${slug}/content.md`, `# ${title}\n\n`, 'text/markdown');
    downloadText(`${slug}/cover.svg`, placeholderCoverSvg(title), 'image/svg+xml');

    out.textContent = `Downloaded: ${slug}/ (place into src/content/posts/${type}/${slug}/)`;
  }
});
