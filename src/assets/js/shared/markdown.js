// shared/markdown.js
// Tiny, dependency-free markdown renderer.
// Scope (intentionally minimal):
// - headings (#, ##, ###)
// - paragraphs
// - unordered lists (-, *)
// - fenced code blocks ```
// - inline code `code`
// - links [text](url)
// - emphasis *em* and **strong** (best-effort)
//
// Since authored content is trusted (your own files), we keep it lightweight.
// We still escape HTML by default.

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderInline(md) {
  let s = escapeHtml(md);

  // code
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');

  // strong then em
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // links
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  return s;
}

export function markdownToHtml(markdown) {
  const lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n');

  let html = '';
  let inCode = false;
  let codeBuf = [];
  let inList = false;

  function closeList() {
    if (inList) {
      html += '</ul>';
      inList = false;
    }
  }

  for (const rawLine of lines) {
    const line = rawLine;

    if (line.trim().startsWith('```')) {
      if (!inCode) {
        closeList();
        inCode = true;
        codeBuf = [];
      } else {
        inCode = false;
        const code = escapeHtml(codeBuf.join('\n'));
        html += `<pre><code>${code}</code></pre>`;
      }
      continue;
    }

    if (inCode) {
      codeBuf.push(line);
      continue;
    }

    // headings
    if (/^###\s+/.test(line)) {
      closeList();
      html += `<h3>${renderInline(line.replace(/^###\s+/, ''))}</h3>`;
      continue;
    }
    if (/^##\s+/.test(line)) {
      closeList();
      html += `<h2>${renderInline(line.replace(/^##\s+/, ''))}</h2>`;
      continue;
    }
    if (/^#\s+/.test(line)) {
      closeList();
      html += `<h1>${renderInline(line.replace(/^#\s+/, ''))}</h1>`;
      continue;
    }

    // lists
    if (/^\s*[-*]\s+/.test(line)) {
      if (!inList) {
        html += '<ul>';
        inList = true;
      }
      html += `<li>${renderInline(line.replace(/^\s*[-*]\s+/, ''))}</li>`;
      continue;
    }

    // blank line
    if (line.trim() === '') {
      closeList();
      continue;
    }

    // paragraph
    closeList();
    html += `<p>${renderInline(line.trim())}</p>`;
  }

  // close any open blocks
  closeList();
  if (inCode) {
    const code = escapeHtml(codeBuf.join('\n'));
    html += `<pre><code>${code}</code></pre>`;
  }

  return html;
}
