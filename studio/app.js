const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

const API = {
  site: () => fetch('/api/site').then(r=>r.json()),
  saveSite: (data) => fetch('/api/site', {method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data)}).then(r=>r.json()),

  listProjects: () => fetch('/api/projects').then(r=>r.json()),
  getProject: (slug) => fetch(`/api/projects/${encodeURIComponent(slug)}`).then(r=>r.json()),
  saveProject: (slug, payload) => fetch(`/api/projects/${encodeURIComponent(slug)}`, {method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)}).then(r=>r.json()),
  deleteProject: (slug) => fetch(`/api/projects/${encodeURIComponent(slug)}`, {method:'DELETE'}).then(r=>r.json()),

  listPosts: (kind) => fetch(`/api/posts?kind=${encodeURIComponent(kind)}`).then(r=>r.json()),
  getPost: (kind, slug) => fetch(`/api/posts/${encodeURIComponent(kind)}/${encodeURIComponent(slug)}`).then(r=>r.json()),
  savePost: (kind, slug, payload) => fetch(`/api/posts/${encodeURIComponent(kind)}/${encodeURIComponent(slug)}`, {method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)}).then(r=>r.json()),
  deletePost: (kind, slug) => fetch(`/api/posts/${encodeURIComponent(kind)}/${encodeURIComponent(slug)}`, {method:'DELETE'}).then(r=>r.json()),

  experience: () => fetch('/api/experience').then(r=>r.json()),
  saveExperience: (data) => fetch('/api/experience', {method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data)}).then(r=>r.json()),

  education: () => fetch('/api/education').then(r=>r.json()),
  saveEducation: (data) => fetch('/api/education', {method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data)}).then(r=>r.json()),

  build: () => fetch('/api/commands/build', {method:'POST'}).then(r=>r.json()),
  previewStart: () => fetch('/api/commands/preview/start', {method:'POST'}).then(r=>r.json()),
  previewStop: () => fetch('/api/commands/preview/stop', {method:'POST'}).then(r=>r.json()),
  distOpen: () => fetch('/api/commands/dist/open', {method:'POST'}).then(r=>r.json()),
};

function setStatus(msg, kind='info'){
  const el = $('#status');
  el.textContent = msg;
  el.style.color = kind==='error' ? 'var(--danger)' : (kind==='ok' ? 'var(--ok)' : 'var(--muted)');
}

function slugify(input){
  return String(input||'')
    .trim()
    .toLowerCase()
    .replace(/['"`]/g,'')
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/^-+|-+$/g,'')
    .slice(0,80);
}

function setHeader(title, subtitle='', actions=[]) {
  $('#viewTitle').textContent = title;
  $('#viewSubtitle').textContent = subtitle;
  const box = $('#headerActions');
  box.innerHTML = '';
  for (const a of actions) box.appendChild(a);
}

function btn(label, cls, onClick){
  const b = document.createElement('button');
  b.className = `btn ${cls||''}`.trim();
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

function field(label, inputEl, helpText=''){
  const wrap = document.createElement('div');
  wrap.className = 'field';
  const l = document.createElement('label');
  l.textContent = label;
  wrap.append(l, inputEl);
  if (helpText){
    const h = document.createElement('div');
    h.className = 'code';
    h.textContent = helpText;
    wrap.appendChild(h);
  }
  return wrap;
}

function input(type='text', value=''){
  const el = document.createElement('input');
  el.type = type;
  el.value = value ?? '';
  return el;
}

function textarea(value=''){
  const el = document.createElement('textarea');
  el.value = value ?? '';
  return el;
}

function imgPreview(){
  const img = document.createElement('img');
  img.style.maxWidth = '100%';
  img.style.maxHeight = '220px';
  img.style.display = 'none';
  img.style.borderRadius = '12px';
  img.style.border = '1px solid var(--border)';
  img.style.background = 'rgba(8,12,18,.55)';
  return img;
}

function escapeHtml(s){
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function renderMarkdown(md){
  // Tiny, safe-ish markdown renderer (no HTML passthrough).
  const lines = String(md||'').replace(/\r\n/g,'\n').split('\n');
  let html = '';
  let inUl = false;
  let inOl = false;
  const closeLists = ()=>{
    if (inUl){ html += '</ul>'; inUl=false; }
    if (inOl){ html += '</ol>'; inOl=false; }
  };

  const inline = (t) => {
    let x = escapeHtml(t);
    x = x.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    x = x.replace(/\*(.+?)\*/g, '<em>$1</em>');
    x = x.replace(/\[(.+?)\]\((.+?)\)/g, (m, a, b)=>`<a href="${escapeHtml(b)}" target="_blank" rel="noreferrer">${a}</a>`);
    return x;
  };

  for (const raw of lines){
    const line = raw || '';
    if (/^\s*$/.test(line)) { closeLists(); html += '<div style="height:8px"></div>'; continue; }

    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h){
      closeLists();
      const lvl = h[1].length;
      html += `<h${lvl}>${inline(h[2])}</h${lvl}>`;
      continue;
    }

    const bq = line.match(/^>\s?(.*)$/);
    if (bq){
      closeLists();
      html += `<blockquote>${inline(bq[1])}</blockquote>`;
      continue;
    }

    const ul = line.match(/^\s*[-*]\s+(.*)$/);
    if (ul){
      if (inOl){ html += '</ol>'; inOl=false; }
      if (!inUl){ html += '<ul>'; inUl=true; }
      html += `<li>${inline(ul[1])}</li>`;
      continue;
    }

    const ol = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ol){
      if (inUl){ html += '</ul>'; inUl=false; }
      if (!inOl){ html += '<ol>'; inOl=true; }
      html += `<li>${inline(ol[1])}</li>`;
      continue;
    }

    closeLists();
    html += `<p>${inline(line)}</p>`;
  }
  closeLists();
  return html;
}

function wordCount(s){
  const t = String(s||'').trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

function insertAround(textareaEl, before, after){
  const el = textareaEl;
  const start = el.selectionStart ?? 0;
  const end = el.selectionEnd ?? 0;
  const val = el.value;
  const sel = val.slice(start, end);
  const next = val.slice(0, start) + before + sel + after + val.slice(end);
  el.value = next;
  const pos = start + before.length + sel.length + after.length;
  el.focus();
  el.setSelectionRange(pos, pos);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

function insertTextAtCursor(textareaEl, text){
  const el = textareaEl;
  const start = el.selectionStart ?? 0;
  const end = el.selectionEnd ?? 0;
  const val = el.value;
  el.value = val.slice(0, start) + text + val.slice(end);
  const pos = start + text.length;
  el.focus();
  el.setSelectionRange(pos, pos);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

function markdownEditor({ label, value='', storageKey=null, placeholder='', imageUpload=null }){
  const wrap = document.createElement('div');
  wrap.className = 'card';

  const top = document.createElement('div');
  top.style.display = 'flex';
  top.style.justifyContent = 'space-between';
  top.style.alignItems = 'baseline';
  top.style.gap = '12px';

  const title = document.createElement('div');
  title.style.fontWeight = '700';
  title.textContent = label;

  const meta = document.createElement('div');
  meta.className = 'code';
  meta.textContent = `${wordCount(value)} words`;

  top.append(title, meta);

  const toolbar = document.createElement('div');
  toolbar.className = 'actions';
  toolbar.style.margin = '10px 0 8px';

  const ta = textarea(value);
  ta.placeholder = placeholder;
  ta.style.minHeight = '420px';

  const preview = document.createElement('div');
  preview.className = 'card';
  preview.style.background = 'rgba(8,12,18,.35)';
  preview.style.borderStyle = 'dashed';
  preview.style.minHeight = '420px';
  preview.style.overflow = 'auto';

  const previewInner = document.createElement('div');
  previewInner.style.padding = '10px 12px';
  previewInner.innerHTML = renderMarkdown(value);
  preview.appendChild(previewInner);

  const grid = document.createElement('div');
  grid.className = 'row';
  grid.append(card([field('Markdown', ta)]), card([field('Live preview', preview)]));

  // Dirty + autosave
  const initial = value;
  let dirty = false;

  const draftKey = storageKey ? `studio:draft:${storageKey}` : null;
  if (draftKey){
    const draft = localStorage.getItem(draftKey);
    if (draft && draft !== value){
      // auto-restore silently (local-only); you can undo by Ctrl+Z
      ta.value = draft;
    }
  }

  const onInput = ()=>{
    const v = ta.value;
    previewInner.innerHTML = renderMarkdown(v);
    meta.textContent = `${wordCount(v)} words`;
    dirty = (v !== initial);
    if (draftKey) localStorage.setItem(draftKey, v);
  };
  ta.addEventListener('input', onInput);
  onInput();

  const mkBtn = (label, fn)=> btn(label, '', ()=>fn());

  // Insert image helper (uploads then inserts markdown)
  const imgFileInput = document.createElement('input');
  imgFileInput.type = 'file';
  imgFileInput.accept = 'image/*';
  imgFileInput.style.display = 'none';

  const insertImageBtn = btn('Insert image…', '', ()=>{
    if (!imageUpload) return;
    imgFileInput.click();
  });
  if (!imageUpload) insertImageBtn.disabled = true;

  async function fileToBase64(file){
    return await new Promise((resolve, reject)=>{
      const fr = new FileReader();
      fr.onerror = ()=>reject(new Error('File read failed'));
      fr.onload = ()=>{
        const s = String(fr.result || '');
        const m = s.match(/base64,(.*)$/);
        resolve(m ? m[1] : '');
      };
      fr.readAsDataURL(file);
    });
  }

  async function uploadAndInsert(file){
    if (!imageUpload) return;
    const { scope, params = {}, subdir = '' } = imageUpload;
    const p = typeof params === 'function' ? (params() || {}) : (params || {});

    if (scope === 'project' && !p.slug) { setStatus('Set slug before inserting images.', 'error'); return; }
    if (scope === 'post' && (!p.slug || !p.kind)) { setStatus('Set slug before inserting images.', 'error'); return; }

    const alt = (prompt('Alt text for this image?', 'image') || 'image').trim() || 'image';

    try{
      setStatus('Uploading image…');
      const b64 = await fileToBase64(file);
      const payload = { scope, filename: file.name, dataBase64: b64, subdir, ...p };
      const r = await fetch('/api/upload', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) }).then(x=>x.json());
      if (!r?.ok){
        setStatus(r?.error || 'Upload failed', 'error');
        return;
      }
      const pathVal = r.valuePath;
      insertTextAtCursor(ta, `![${alt}](${pathVal})`);
      setStatus(`Inserted image: ${pathVal}`, 'ok');
    }catch(e){
      setStatus(e?.message || 'Upload error', 'error');
    }
  }

  imgFileInput.addEventListener('change', async ()=>{
    const f = imgFileInput.files && imgFileInput.files[0];
    if (!f) return;
    await uploadAndInsert(f);
    imgFileInput.value = '';
  });

  toolbar.append(
    mkBtn('H2', ()=> insertAround(ta, '## ', '')),
    mkBtn('Bold', ()=> insertAround(ta, '**', '**')),
    mkBtn('Italic', ()=> insertAround(ta, '*', '*')),
    mkBtn('• List', ()=> insertAround(ta, '- ', '')),
    mkBtn('1. List', ()=> insertAround(ta, '1. ', '')),
    mkBtn('Link', ()=> insertAround(ta, '[text](', ')')),
    mkBtn('Quote', ()=> insertAround(ta, '> ', '')),
    insertImageBtn,
    imgFileInput,
  );

  // beforeunload warning (page-level)
  const unloadHandler = (e)=>{
    if (!dirty) return;
    e.preventDefault();
    e.returnValue = '';
  };
  window.addEventListener('beforeunload', unloadHandler);

  const api = {
    wrap,
    textarea: ta,
    get value(){ return ta.value; },
    clearDraft(){ if (draftKey) localStorage.removeItem(draftKey); },
    destroy(){ window.removeEventListener('beforeunload', unloadHandler); }
  };

  wrap.append(top, toolbar, grid);
  return api;
}

function imagePathField({ label, value = '', scope, resolveParams = {}, optionsScope = null, optionsParams = {}, placeholder = '', mapOptionToValue = null, upload = null }) {
  const getParams = () => (typeof resolveParams === 'function' ? (resolveParams() || {}) : (resolveParams || {}));
  const getOptParams = () => (typeof optionsParams === 'function' ? (optionsParams() || {}) : (optionsParams || {}));
  const wrap = document.createElement('div');
  wrap.className = 'field';

  const l = document.createElement('label');
  l.textContent = label;

  const row = document.createElement('div');
  row.style.display = 'grid';
  row.style.gridTemplateColumns = '1fr';
  row.style.gap = '8px';

  const inp = input('text', value);
  if (placeholder) inp.placeholder = placeholder;

  const uploadRow = document.createElement('div');
  uploadRow.style.display = upload ? 'flex' : 'none';
  uploadRow.style.gap = '8px';
  uploadRow.style.alignItems = 'center';

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';

  const uploadBtn = btn('Upload image…', '', ()=> fileInput.click());
  const uploadMsg = document.createElement('div');
  uploadMsg.className = 'code';
  uploadMsg.textContent = upload ? 'Copies file into src/content and fills the path.' : '';
  uploadRow.append(uploadBtn, uploadMsg, fileInput);

  const msg = document.createElement('div');
  msg.className = 'code';
  msg.textContent = '';

  const preview = imgPreview();

  const selectBox = document.createElement('div');
  selectBox.style.display = optionsScope ? 'block' : 'none';

  const sel = document.createElement('select');
  sel.style.width = '100%';
  sel.innerHTML = `<option value="">— choose an image —</option>`;
  selectBox.appendChild(sel);

  async function loadOptions(){
    if (!optionsScope) return;
    try{
      const u = new URL('/api/image/options', location.origin);
      u.searchParams.set('scope', optionsScope);
      const p = getOptParams();
      for (const [k,v] of Object.entries(p||{})) u.searchParams.set(k, v);
      const r = await fetch(u).then(x=>x.json());
      if (!r?.ok) return;
      const opts = r.options || [];
      sel.innerHTML = `<option value="">— choose an image —</option>` + opts.map(o=>`<option value="${o.replace(/"/g,'&quot;')}">${o}</option>`).join('');
    } catch {}
  }

  async function validateAndPreview(){
    const p = inp.value.trim();
    if (!p){
      msg.textContent = 'No path set.';
      preview.style.display = 'none';
      return;
    }
    try{
      const u = new URL('/api/image/resolve', location.origin);
      u.searchParams.set('scope', scope);
      u.searchParams.set('path', p);
      const p2 = getParams();
      for (const [k,v] of Object.entries(p2||{})) u.searchParams.set(k, v);
      const r = await fetch(u).then(x=>x.json());
      if (!r?.ok){
        msg.textContent = r?.error || 'Could not validate path.';
        preview.style.display = 'none';
        return;
      }

      if (!r.exists){
        msg.textContent = `Not found (resolved: ${r.resolved || '—'})`;
        msg.style.color = 'var(--danger)';
        preview.style.display = 'none';
        return;
      }

      msg.textContent = `OK (resolved: ${r.resolved})`;
      msg.style.color = 'var(--ok)';

      if (r.previewUrl){
        preview.src = r.previewUrl;
        preview.style.display = 'block';
      } else {
        preview.style.display = 'none';
      }
    } catch(e){
      msg.textContent = e?.message || 'Error validating path.';
      msg.style.color = 'var(--danger)';
      preview.style.display = 'none';
    }
  }

  inp.addEventListener('input', ()=>{
    // debounce-ish
    window.clearTimeout(inp._t);
    inp._t = window.setTimeout(validateAndPreview, 200);
  });

  sel.addEventListener('change', ()=>{
    if (!sel.value) return;
    const v = mapOptionToValue ? mapOptionToValue(sel.value) : sel.value;
    inp.value = v;
    validateAndPreview();
  });

  async function uploadFile(file){
    if (!upload) return;
    const { scope: upScope, params = {}, subdir = '' } = upload;
    // allow params to be dynamic
    const p = typeof params === 'function' ? (params() || {}) : (params || {});

    // require slug/kind when needed
    if (upScope === 'project' && !p.slug) { setStatus('Set slug before uploading images.', 'error'); return; }
    if (upScope === 'post' && (!p.slug || !p.kind)) { setStatus('Set slug before uploading images.', 'error'); return; }

    uploadMsg.textContent = 'Uploading…';
    try{
      const b64 = await new Promise((resolve, reject)=>{
        const fr = new FileReader();
        fr.onerror = ()=>reject(new Error('File read failed'));
        fr.onload = ()=>{
          const s = String(fr.result || '');
          const m = s.match(/base64,(.*)$/);
          resolve(m ? m[1] : '');
        };
        fr.readAsDataURL(file);
      });
      const payload = {
        scope: upScope,
        filename: file.name,
        dataBase64: b64,
        subdir: subdir || '' ,
        ...p
      };
      const r = await fetch('/api/upload', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) }).then(x=>x.json());
      if (!r?.ok) {
        uploadMsg.textContent = r?.error || 'Upload failed';
        return;
      }
      inp.value = r.valuePath || inp.value;
      await validateAndPreview();
      uploadMsg.textContent = `Uploaded → ${r.valuePath}`;
    }catch(e){
      uploadMsg.textContent = e?.message || 'Upload error';
    }
  }

  fileInput.addEventListener('change', async ()=>{
    const f = fileInput.files && fileInput.files[0];
    if (!f) return;
    await uploadFile(f);
    fileInput.value = '';
  });

  row.append(inp, selectBox, uploadRow, preview, msg);
  wrap.append(l, row);

  // initial load
  loadOptions();
  validateAndPreview();

  return { wrap, input: inp, refresh: validateAndPreview, reloadOptions: loadOptions };
}

function checkbox(checked=false){
  const el = document.createElement('input');
  el.type = 'checkbox';
  el.checked = !!checked;
  return el;
}

function smallBtn(label, cls, onClick){
  const b = btn(label, cls, onClick);
  b.style.padding = '6px 10px';
  b.style.fontSize = '12px';
  return b;
}

function pill(text){
  const s = document.createElement('span');
  s.className = 'pill';
  s.textContent = text;
  return s;
}

function listEditor({ label, items, placeholder = 'Add item…' }){
  const wrap = document.createElement('div');
  wrap.className = 'field';
  const l = document.createElement('label');
  l.textContent = label;

  const box = document.createElement('div');
  box.className = 'list';

  const state = {
    items: Array.isArray(items) ? [...items] : []
  };

  function render(){
    box.innerHTML = '';
    state.items.forEach((val, idx)=>{
      const row = document.createElement('div');
      row.className = 'item';
      row.style.cursor = 'default';
      row.style.alignItems = 'center';

      const left = document.createElement('div');
      left.style.flex = '1';
      const inp = input('text', val);
      inp.placeholder = placeholder;
      inp.addEventListener('input', ()=>{ state.items[idx] = inp.value; });
      left.appendChild(inp);

      const right = document.createElement('div');
      right.style.display = 'flex';
      right.style.gap = '6px';
      const up = smallBtn('↑', '', ()=>{ if (idx===0) return; const t=state.items[idx-1]; state.items[idx-1]=state.items[idx]; state.items[idx]=t; render(); });
      const dn = smallBtn('↓', '', ()=>{ if (idx===state.items.length-1) return; const t=state.items[idx+1]; state.items[idx+1]=state.items[idx]; state.items[idx]=t; render(); });
      const rm = smallBtn('Remove', 'danger', ()=>{ state.items.splice(idx,1); render(); });
      right.append(up,dn,rm);

      row.append(left, right);
      box.appendChild(row);
    });
  }

  const add = btn('Add', 'ok', ()=>{ state.items.push(''); render(); });
  render();

  wrap.append(l, box, add);
  return {
    wrap,
    get value(){ return state.items.map(s=>String(s||'').trim()).filter(Boolean); },
    set value(v){ state.items = Array.isArray(v) ? [...v] : []; render(); }
  };
}

function linksEditor({ label, links }){
  const wrap = document.createElement('div');
  wrap.className = 'field';
  const l = document.createElement('label');
  l.textContent = label;

  const box = document.createElement('div');
  box.className = 'list';

  const state = { items: Array.isArray(links) ? links.map(x=>({ label: x?.label||'', url: x?.url||'' })) : [] };

  function render(){
    box.innerHTML = '';
    state.items.forEach((it, idx)=>{
      const row = document.createElement('div');
      row.className = 'card';
      row.style.padding = '10px';

      const lab = input('text', it.label);
      const url = input('text', it.url);
      lab.placeholder = 'Label (e.g., Company)';
      url.placeholder = 'URL (https://...)';

      lab.addEventListener('input', ()=>{ state.items[idx].label = lab.value; });
      url.addEventListener('input', ()=>{ state.items[idx].url = url.value; });

      const actions = document.createElement('div');
      actions.className = 'actions';
      const up = smallBtn('↑', '', ()=>{ if (idx===0) return; const t=state.items[idx-1]; state.items[idx-1]=state.items[idx]; state.items[idx]=t; render(); });
      const dn = smallBtn('↓', '', ()=>{ if (idx===state.items.length-1) return; const t=state.items[idx+1]; state.items[idx+1]=state.items[idx]; state.items[idx]=t; render(); });
      const rm = smallBtn('Remove', 'danger', ()=>{ state.items.splice(idx,1); render(); });
      actions.append(up,dn,rm);

      row.append(field('Link label', lab), field('Link URL', url), actions);
      box.appendChild(row);
    });
  }

  const add = btn('Add link', 'ok', ()=>{ state.items.push({ label:'', url:'' }); render(); });
  render();

  wrap.append(l, box, add);

  return {
    wrap,
    get value(){
      return state.items
        .map(x=>({ label: String(x.label||'').trim(), url: String(x.url||'').trim() }))
        .filter(x=>x.url);
    }
  };
}

function tabs({ items, initialId }){
  const wrap = document.createElement('div');
  const tabBar = document.createElement('div');
  tabBar.className = 'tabs';

  const body = document.createElement('div');
  body.style.marginTop = '12px';

  const state = { id: initialId || items[0]?.id };

  function render(){
    tabBar.innerHTML = '';
    body.innerHTML = '';
    for (const it of items){
      const b = document.createElement('button');
      b.className = 'tab';
      b.setAttribute('data-active', it.id === state.id ? 'true' : 'false');
      b.textContent = it.label;
      b.addEventListener('click', ()=>{ state.id = it.id; render(); });
      tabBar.appendChild(b);
      if (it.id === state.id) body.appendChild(it.el);
    }
  }

  render();
  wrap.append(tabBar, body);
  return { wrap, get activeId(){ return state.id; }, setActive(id){ state.id=id; render(); } };
}


function select(options, value){
  const el = document.createElement('select');
  for (const opt of options){
    const o = document.createElement('option');
    o.value = opt;
    o.textContent = opt;
    el.appendChild(o);
  }
  el.value = value ?? options[0];
  return el;
}

function twoCol(left, right){
  const row = document.createElement('div');
  row.className = 'row';
  row.append(left, right);
  return row;
}

function card(children=[]){
  const c = document.createElement('div');
  c.className = 'card';
  for (const ch of children) c.appendChild(ch);
  return c;
}

function renderList(items, onPick){
  const list = document.createElement('div');
  list.className = 'list';
  for (const it of items){
    const row = document.createElement('div');
    row.className = 'item';
    const left = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'item__title';
    title.textContent = it.title || it.slug;
    const meta = document.createElement('div');
    meta.className = 'item__meta';
    meta.textContent = [it.slug, it.date, it.category, it.status].filter(Boolean).join(' • ');
    left.append(title, meta);
    const right = document.createElement('div');
    right.innerHTML = `
      <span class="pill">${it.featured ? 'featured' : '—'}</span>
    `;
    row.append(left, right);
    row.addEventListener('click', ()=>onPick(it.slug));
    list.appendChild(row);
  }
  return list;
}

// ---- views ----

async function viewSite(){
  setHeader('Site Settings', 'Edits src/content/site.json (mapped to current nested schema)');
  setStatus('Loading site settings…');
  const data = await API.site();
  const c = $('#content');
  c.innerHTML = '';

  // Helpers for social[] mapping (do not change schema)
  const getSocial = (label) => (data.social || []).find(x => (x?.label || '').toLowerCase() === label.toLowerCase())?.url || '';
  const setSocial = (label, url) => {
    const social = Array.isArray(data.social) ? [...data.social] : [];
    const idx = social.findIndex(x => (x?.label || '').toLowerCase() === label.toLowerCase());
    const cleanUrl = (url || '').trim();
    if (idx >= 0) {
      social[idx] = { ...social[idx], label: social[idx].label || label, url: cleanUrl };
    } else if (cleanUrl) {
      social.push({ label, url: cleanUrl });
    }
    return social;
  };

  const person = data.person || {};
  const home = data.home || {};
  const hero = (home.hero || {});
  const seo = data.seo || {};

  // Direct, labeled fields (prefilled)
  const name = input('text', person.name || '');
  const headline = input('text', person.headline || '');
  const location = input('text', person.location || '');
  const email = input('text', person.email || '');

  const linkedIn = input('text', getSocial('LinkedIn'));
  const gitHub = input('text', getSocial('GitHub'));
  const website = input('text', getSocial('Website'));

  const heroTitle = input('text', hero.title || '');
  const heroSubtitle = textarea(hero.subtitle || '');

  const seoTitle = input('text', seo.siteTitle || '');
  const seoDescription = textarea(seo.siteDescription || '');

  const featuredProjectSlug = input('text', (home.featuredProjectSlugs || [])[0] || '');
  const featuredInsightSlug = input('text', (home.featuredInsightSlugs || [])[0] || '');
  const featuredLifeSlug = input('text', (home.featuredLifeSlugs || [])[0] || '');

  const profileImageField = imagePathField({
    label: 'Profile image path',
    value: person.profileImage || '',
    scope: 'site',
    optionsScope: 'assets',
    placeholder: 'Example: data/assets/headshot.jpg',
    mapOptionToValue: (opt) => `data/assets/${opt}`,
    upload: { scope: 'assets' }
  });

  const profileImageAltField = imagePathField({
    label: 'Alternate profile image path',
    value: person.profileImageAlt || '',
    scope: 'site',
    optionsScope: 'assets',
    placeholder: 'Example: data/assets/headshot-ghibli.png',
    mapOptionToValue: (opt) => `data/assets/${opt}`,
    upload: { scope: 'assets' }
  });

  const save = btn('Save', 'primary', async ()=>{
    if (!name.value.trim()) return setStatus('Name is required.', 'error');

    // Build new object WITHOUT changing schema
    const out = structuredClone(data);
    out.person = { ...(out.person || {}) };
    out.home = { ...(out.home || {}) };
    out.home.hero = { ...(out.home.hero || {}) };
    out.seo = { ...(out.seo || {}) };

    out.person.name = name.value.trim();
    out.person.headline = headline.value;
    out.person.location = location.value;
    out.person.email = email.value;

    // social[] mapping by label
    out.social = Array.isArray(out.social) ? [...out.social] : [];
    out.social = setSocial('LinkedIn', linkedIn.value);
    // setSocial returns based on current `data`, so re-apply in order using a working array
    // (keep stable order as much as possible)
    const socialBase = Array.isArray(out.social) ? [...out.social] : [];
    const applySocial = (arr, label, url) => {
      const idx = arr.findIndex(x => (x?.label || '').toLowerCase() === label.toLowerCase());
      const cleanUrl = (url || '').trim();
      if (idx >= 0) arr[idx] = { ...arr[idx], label: arr[idx].label || label, url: cleanUrl };
      else if (cleanUrl) arr.push({ label, url: cleanUrl });
      return arr;
    };
    let s = socialBase;
    s = applySocial(s, 'LinkedIn', linkedIn.value);
    s = applySocial(s, 'GitHub', gitHub.value);
    s = applySocial(s, 'Website', website.value);
    out.social = s;

    out.home.hero.title = heroTitle.value;
    out.home.hero.subtitle = heroSubtitle.value;

    out.seo.siteTitle = seoTitle.value;
    out.seo.siteDescription = seoDescription.value;

    // featured slugs (single field each, stored as arrays in schema)
    out.home.featuredProjectSlugs = featuredProjectSlug.value.trim() ? [featuredProjectSlug.value.trim()] : [];
    out.home.featuredInsightSlugs = featuredInsightSlug.value.trim() ? [featuredInsightSlug.value.trim()] : [];
    out.home.featuredLifeSlugs = featuredLifeSlug.value.trim() ? [featuredLifeSlug.value.trim()] : [];

    out.person.profileImage = profileImageField.input.value;
    out.person.profileImageAlt = profileImageAltField.input.value;

    setStatus('Saving…');
    const r = await API.saveSite(out);
    if (r?.ok) setStatus('Saved site.json', 'ok');
    else setStatus(r?.error || 'Save failed', 'error');
  });

  setHeader('Site Settings', 'Mapped to current site.json keys (no schema changes)', [save]);

  // Clean, practical layout
  c.append(card([
    card([twoCol(
      card([
        field('Name *', name),
        field('Headline', headline),
        field('Location', location),
        field('Email', email),
      ]),
      card([
        field('LinkedIn', linkedIn),
        field('GitHub', gitHub),
        field('Website', website),
        profileImageField.wrap,
        profileImageAltField.wrap,
      ])
    )]),

    card([
      field('Hero title', heroTitle),
      field('Hero subtitle', heroSubtitle),
    ]),

    card([
      field('SEO title', seoTitle),
      field('SEO description', seoDescription),
    ]),

    card([twoCol(
      card([field('Featured project slug', featuredProjectSlug)]),
      card([field('Featured insight slug', featuredInsightSlug)])
    )]),

    card([
      field('Featured life slug', featuredLifeSlug),
      (()=>{ const d=document.createElement('div'); d.className='code'; d.textContent='These featured fields map to home.featured*Slugs arrays; leaving blank clears the array.'; return d; })()
    ]),
  ]));

  setStatus('Ready.', 'ok');
}

function projectForm(slug, project, caseStudy, onSave, onDelete){
  const title = input('text', project.title || '');
  const slugEl = input('text', project.slug || slug || '');
  const date = input('text', project.date || '');
  const summary = textarea(project.summary || '');

  const problem = textarea(project.problem || '');
  const approach = textarea(project.approach || '');
  const tools = textarea((project.tools||[]).join('\n'));
  const outcome = textarea(project.outcome || '');

  const role = input('text', project.role || '');
  const team = input('text', project.team || '');
  const duration = input('text', project.duration || '');
  const tags = textarea((project.tags||[]).join('\n'));

  const links = textarea((project.links||[]).map(l=>JSON.stringify(l)).join('\n'));
  const featured = checkbox(!!project.featured);
  const status = input('text', project.status || '');

  // Images (current schema uses project.images.cover + project.images.gallery)
  const initialCover = project?.images?.cover || project.coverImage || '';
  const initialGallery = project?.images?.gallery || project.galleryImages || [];

  const coverField = imagePathField({
    label: 'Cover image path',
    value: initialCover,
    scope: 'project',
    resolveParams: () => ({ slug: slugEl.value.trim() || slug }),
    optionsScope: 'project',
    optionsParams: () => ({ slug: slugEl.value.trim() || slug }),
    placeholder: 'Example: gallery/cover.svg',
    upload: {
      scope: 'project',
      params: () => ({ slug: slugEl.value.trim() || slug }),
      subdir: (String(initialCover||'').startsWith('gallery/') ? 'gallery' : '')
    }
  });

  const galleryWrap = document.createElement('div');
  const galleryLabel = document.createElement('label');
  galleryLabel.textContent = 'Gallery image paths';
  galleryLabel.style.display = 'block';
  galleryLabel.style.color = 'var(--muted)';
  galleryLabel.style.fontSize = '12px';
  galleryLabel.style.marginBottom = '6px';

  const galleryList = document.createElement('div');
  galleryList.className = 'list';

  let galleryValues = Array.isArray(initialGallery) ? [...initialGallery] : [];

  function renderGallery(){
    galleryList.innerHTML = '';
    galleryValues.forEach((val, idx) => {
      const row = document.createElement('div');
      row.className = 'card';
      row.style.padding = '10px';

      const fieldObj = imagePathField({
        label: `Image #${idx+1}`,
        value: val,
        scope: 'project',
        resolveParams: () => ({ slug: slugEl.value.trim() || slug }),
        optionsScope: 'project',
        optionsParams: () => ({ slug: slugEl.value.trim() || slug }),
        placeholder: 'Example: gallery/01.svg',
        upload: {
          scope: 'project',
          params: () => ({ slug: slugEl.value.trim() || slug }),
          subdir: (String(val||'').startsWith('gallery/') ? 'gallery' : '')
        }
      });

      const remove = btn('Remove', 'danger', ()=>{
        galleryValues.splice(idx, 1);
        renderGallery();
      });
      remove.style.marginTop = '8px';

      // keep array updated
      fieldObj.input.addEventListener('input', ()=>{
        galleryValues[idx] = fieldObj.input.value.trim();
      });

      row.appendChild(fieldObj.wrap);
      row.appendChild(remove);
      galleryList.appendChild(row);
    });
  }

  const addGallery = btn('Add gallery image', 'ok', ()=>{
    galleryValues.push('');
    renderGallery();
  });

  renderGallery();
  galleryWrap.append(galleryLabel, galleryList, addGallery);

  // auto slug
  title.addEventListener('input', ()=>{
    if (!slugEl.dataset.touched){
      slugEl.value = slugify(title.value);
    }
  });
  slugEl.addEventListener('input', ()=>{ slugEl.dataset.touched = '1'; });

  const caseEditor = markdownEditor({
    label: 'Case study markdown',
    value: caseStudy || '',
    storageKey: slug ? `project:${slug}:caseStudy` : null,
    placeholder: 'Write your case study markdown here…',
    imageUpload: { scope: 'project', params: () => ({ slug: slugEl.value.trim() || slug }), subdir: 'gallery' }
  });

  const saveBtn = btn('Save', 'primary', ()=>{
    const out = {
      ...project,
      title: title.value.trim(),
      slug: slugEl.value.trim(),
      date: date.value,
      summary: summary.value,
      problem: problem.value,
      approach: approach.value,
      tools: tools.value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean),
      outcome: outcome.value,
      role: role.value,
      team: team.value,
      duration: duration.value,
      tags: tags.value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean),
      links: links.value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean).map(s=>{ try{return JSON.parse(s)} catch { return { label:'link', url:s } } }),
      featured: featured.checked,
      status: status.value,
    };

    out.images = { ...(out.images || {}) };
    out.images.cover = coverField.input.value.trim();
    out.images.gallery = galleryValues.map(s=>String(s||'').trim()).filter(Boolean);

    if (!out.title) return setStatus('Title is required.', 'error');
    if (!out.slug) return setStatus('Slug is required.', 'error');
    onSave(out, caseEditor.value);
    caseEditor.clearDraft();
  });

  const delBtn = btn('Delete', 'danger', ()=>{
    if (!confirm(`Delete project “${slug}”? This removes the entire folder.`)) return;
    onDelete();
  });

  return {
    slugEl,
    el: card([
      card([twoCol(
        card([field('Title *', title), field('Slug *', slugEl), field('Date', date)]),
        card([field('Featured', featured), field('Status', status), coverField.wrap])
      )]),
      card([field('Summary', summary)]),
      card([twoCol(
        card([field('Problem', problem), field('Approach', approach)]),
        card([field('Tools (one per line)', tools), field('Outcome', outcome)])
      )]),
      card([twoCol(
        card([field('Role', role), field('Team', team), field('Duration', duration)]),
        card([field('Tags (one per line)', tags), field('Links (one JSON per line or URL)', links)])
      )]),
      card([galleryWrap]),
      caseEditor.wrap,
      card([document.createTextNode('Notes:'), document.createElement('br'),
        (()=>{const d=document.createElement('div'); d.className='code'; d.textContent='Rename (changing slug) is not supported yet in v1. Keep slug stable once saved.'; return d;})()
      ]),
      (()=>{ const a=document.createElement('div'); a.className='actions'; a.append(saveBtn, delBtn); return a; })()
    ])
  };
}

async function viewProjects(){
  setHeader('Projects', 'Edits src/content/projects/items/<slug>/{project.json,case-study.md}');
  setStatus('Loading projects…');
  const { items } = await API.listProjects();
  const c = $('#content');
  c.innerHTML = '';

  const left = card([
    btn('New Project', 'ok', ()=>editProject('')),
    document.createElement('hr'),
    renderList(items, (slug)=>editProject(slug))
  ]);

  const right = card([
    document.createElement('div')
  ]);

  c.append(twoCol(left, right));

  async function editProject(slug){
    right.innerHTML = '';
    if (!slug){
      const template = {
        title: '', slug: '', date: '', summary: '',
        problem: '', approach: '', tools: [], outcome: '',
        role: '', team: '', duration: '', tags: [], links: [],
        featured: false, status: 'draft',
        images: { cover: '', gallery: [] }
      };
      const form = projectForm('', template, '', async (proj, caseStudy)=>{
        if (!proj.slug) return setStatus('Slug required.', 'error');
        setStatus('Saving new project…');
        const r = await API.saveProject(proj.slug, { project: proj, caseStudy });
        if (r?.ok){ setStatus('Saved. Reload the list to see it.', 'ok'); await viewProjects(); }
        else setStatus(r?.error || 'Save failed', 'error');
      }, async ()=>{});
      right.append(form.el);
      return;
    }

    setStatus(`Loading ${slug}…`);
    const data = await API.getProject(slug);
    const form = projectForm(slug, data.project, data.caseStudy, async (proj, caseStudy)=>{
      setStatus('Saving…');
      const r = await API.saveProject(slug, { project: proj, caseStudy });
      if (r?.ok) setStatus('Saved.', 'ok');
      else setStatus(r?.error || 'Save failed', 'error');
    }, async ()=>{
      setStatus('Deleting…');
      const r = await API.deleteProject(slug);
      if (r?.ok){ setStatus('Deleted.', 'ok'); await viewProjects(); }
      else setStatus(r?.error || 'Delete failed', 'error');
    });
    right.append(form.el);
    setStatus('Ready.', 'ok');
  }

  setStatus('Ready.', 'ok');
}

function postForm(kind, slug, post, content, onSave, onDelete){
  const title = input('text', post.title || '');
  const slugEl = input('text', post.slug || slug || '');
  const date = input('text', post.date || '');
  const category = input('text', post.category || '');
  const tags = textarea((post.tags||[]).join('\n'));
  const summary = textarea(post.summary || '');

  const coverField = imagePathField({
    label: 'Cover image path',
    value: post.coverImage || '',
    scope: 'post',
    resolveParams: () => ({ kind, slug: slugEl.value.trim() || slug }),
    optionsScope: 'post',
    optionsParams: () => ({ kind, slug: slugEl.value.trim() || slug }),
    placeholder: 'Example: cover.svg',
    upload: { scope: 'post', params: () => ({ kind, slug: slugEl.value.trim() || slug }) }
  });

  const featured = checkbox(!!post.featured);
  const status = input('text', post.status || 'draft');

  const editor = markdownEditor({
    label: 'Post markdown',
    value: content || '',
    storageKey: slug ? `post:${kind}:${slug}` : null,
    placeholder: 'Write your post markdown here…',
    imageUpload: { scope: 'post', params: () => ({ kind, slug: slugEl.value.trim() || slug }), subdir: '' }
  });

  title.addEventListener('input', ()=>{
    if (!slugEl.dataset.touched){
      slugEl.value = slugify(title.value);
    }
  });
  slugEl.addEventListener('input', ()=>{ slugEl.dataset.touched = '1'; });

  const saveBtn = btn('Save', 'primary', ()=>{
    const out = {
      ...post,
      title: title.value.trim(),
      slug: slugEl.value.trim(),
      date: date.value,
      category: category.value,
      tags: tags.value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean),
      summary: summary.value,
      coverImage: coverField.input.value.trim(),
      featured: featured.checked,
      status: status.value,
    };
    if (!out.title) return setStatus('Title is required.', 'error');
    if (!out.slug) return setStatus('Slug is required.', 'error');
    onSave(out, editor.value);
    editor.clearDraft();
  });

  const delBtn = btn('Delete', 'danger', ()=>{
    if (!confirm(`Delete ${kind} post “${slug}”? This removes the entire folder.`)) return;
    onDelete();
  });

  return {
    el: card([
      card([twoCol(
        card([field('Title *', title), field('Slug *', slugEl), field('Date', date)]),
        card([field('Featured', featured), field('Status', status), coverField.wrap])
      )]),
      card([twoCol(
        card([field('Category', category), field('Tags (one per line)', tags)]),
        card([field('Summary', summary)])
      )]),
      editor.wrap,
      (()=>{ const a=document.createElement('div'); a.className='actions'; a.append(saveBtn, delBtn); return a; })(),
      (()=>{const d=document.createElement('div'); d.className='code'; d.textContent='Rename (changing slug) is not supported yet in v1. Keep slug stable once saved.'; return d;})()
    ])
  };
}

async function viewPosts(kind){
  const title = kind==='insights' ? 'Insights Posts' : 'Life Posts';
  setHeader(title, `Edits src/content/posts/${kind}/<slug>/{post.json,content.md}`);
  setStatus('Loading posts…');
  const { items } = await API.listPosts(kind);
  const c = $('#content');
  c.innerHTML = '';

  const left = card([
    btn('New Post', 'ok', ()=>editPost('')),
    document.createElement('hr'),
    renderList(items, (slug)=>editPost(slug))
  ]);

  const right = card([document.createElement('div')]);
  c.append(twoCol(left, right));

  async function editPost(slug){
    right.innerHTML = '';
    if (!slug){
      const template = { title:'', slug:'', date:'', category:'', tags:[], summary:'', coverImage:'', featured:false, status:'draft' };
      const form = postForm(kind, '', template, '', async (post, content)=>{
        setStatus('Saving new post…');
        const r = await API.savePost(kind, post.slug, { post, content });
        if (r?.ok){ setStatus('Saved. Reloading…', 'ok'); await viewPosts(kind); }
        else setStatus(r?.error || 'Save failed', 'error');
      }, async ()=>{});
      right.append(form.el);
      return;
    }

    setStatus(`Loading ${slug}…`);
    const data = await API.getPost(kind, slug);
    const form = postForm(kind, slug, data.post, data.content, async (post, content)=>{
      setStatus('Saving…');
      const r = await API.savePost(kind, slug, { post, content });
      if (r?.ok) setStatus('Saved.', 'ok');
      else setStatus(r?.error || 'Save failed', 'error');
    }, async ()=>{
      setStatus('Deleting…');
      const r = await API.deletePost(kind, slug);
      if (r?.ok){ setStatus('Deleted.', 'ok'); await viewPosts(kind); }
      else setStatus(r?.error || 'Delete failed', 'error');
    });
    right.append(form.el);
    setStatus('Ready.', 'ok');
  }

  setStatus('Ready.', 'ok');
}

async function viewJsonEditor(title, subtitle, loadFn, saveFn){
  // Kept as an optional escape hatch for power users.
  setHeader(title, subtitle);
  setStatus('Loading…');
  const data = await loadFn();
  const c = $('#content');
  c.innerHTML = '';
  const ta = textarea(JSON.stringify(data, null, 2));
  ta.style.minHeight = '520px';

  const save = btn('Save JSON', 'primary', async ()=>{
    setStatus('Saving…');
    try{
      const parsed = JSON.parse(ta.value);
      const r = await saveFn(parsed);
      if (r?.ok) setStatus('Saved.', 'ok');
      else setStatus(r?.error || 'Save failed', 'error');
    }catch(e){
      setStatus(`Invalid JSON: ${e.message}`, 'error');
    }
  });

  setHeader(title, subtitle, [save]);
  c.append(card([
    field('Advanced: JSON editor', ta, 'This is a fallback. The default editor is form-based.')
  ]));
  setStatus('Ready.', 'ok');
}

async function viewTools(){
  setHeader('Build / Preview', 'Convenience buttons (still local-only)');
  const c = $('#content');
  c.innerHTML = '';

  const buildBtn = btn('Build public site', 'primary', async ()=>{
    setStatus('Running build… (this can take a bit)');
    const r = await API.build();
    if (r?.code === 0) setStatus('Build complete.', 'ok');
    else setStatus(`Build failed (code ${r?.code}). See output below.`, 'error');
    out.value = r?.output || '';
  });

  const previewBtn = btn('Start preview (dist)', 'ok', async ()=>{
    const r = await API.previewStart();
    setStatus(r.message, r.started ? 'ok' : 'info');
    if (r.url) window.open(r.url, '_blank');
  });

  const previewStopBtn = btn('Stop preview', '', async ()=>{
    const r = await API.previewStop();
    setStatus(r.message, r.stopped ? 'ok' : 'info');
  });

  const openDistBtn = btn('Open dist folder', '', async ()=>{
    const r = await API.distOpen();
    setStatus(r.ok ? `Opened: ${r.path}` : (r.message || 'Could not open folder'), r.ok ? 'ok' : 'error');
  });

  const out = textarea('');
  out.style.minHeight = '320px';
  out.readOnly = true;

  c.append(card([
    (()=>{const a=document.createElement('div'); a.className='actions'; a.append(buildBtn, previewBtn, previewStopBtn, openDistBtn); return a;})(),
    field('Build output', out),
    (()=>{const d=document.createElement('div'); d.className='code'; d.textContent='Preview serves dist/ via your existing scripts/serve-dist.mjs on http://localhost:4173/.'; return d;})()
  ]));
  setStatus('Ready.', 'ok');
}

async function viewExperience(){
  setHeader('Experience', 'Professional roles only (no TA/club/campus leadership here).');
  setStatus('Loading experience…');
  const data = await API.experience();
  const items = Array.isArray(data) ? data : (data.items || []);

  // Keep a mutable local copy.
  const state = {
    items: items.map(it => ({
      id: it.id || '',
      company: it.company || '',
      role: it.role || '',
      location: it.location || '',
      startDate: it.startDate || '',
      endDate: it.endDate || '',
      current: !!it.current,
      description: it.description || '',
      achievements: Array.isArray(it.achievements) ? [...it.achievements] : [],
      tools: Array.isArray(it.tools) ? [...it.tools] : [],
      links: Array.isArray(it.links) ? it.links.map(l => ({ label: l?.label || '', url: l?.url || '' })) : []
    }))
  };

  const c = $('#content');
  c.innerHTML = '';

  const list = document.createElement('div');
  list.className = 'stack';

  function roleSummary(it){
    const bits = [it.company, it.role].filter(Boolean).join(' — ');
    const dates = [it.startDate, it.current ? 'Present' : it.endDate].filter(Boolean).join(' → ');
    return [bits, dates].filter(Boolean).join(' · ');
  }

  function render(){
    list.innerHTML = '';

    state.items.forEach((it, idx)=>{
      const header = document.createElement('div');
      header.className = 'actions';
      header.style.justifyContent = 'space-between';
      header.style.alignItems = 'center';

      const left = document.createElement('div');
      left.appendChild(pill(roleSummary(it) || `Role #${idx+1}`));

      const right = document.createElement('div');
      right.className = 'actions';
      right.append(
        smallBtn('Move up', '', ()=>{ if (idx===0) return; const t=state.items[idx-1]; state.items[idx-1]=state.items[idx]; state.items[idx]=t; render(); }),
        smallBtn('Move down', '', ()=>{ if (idx===state.items.length-1) return; const t=state.items[idx+1]; state.items[idx+1]=state.items[idx]; state.items[idx]=t; render(); }),
        smallBtn('Remove', 'danger', ()=>{ if (!confirm('Remove this role?')) return; state.items.splice(idx,1); render(); })
      );

      header.append(left, right);

      const company = input('text', it.company);
      const role = input('text', it.role);
      const location = input('text', it.location);
      const startDate = input('text', it.startDate);
      const endDate = input('text', it.endDate);
      const current = checkbox(it.current);
      const description = textarea(it.description);

      const achievements = listEditor({ label: 'Achievements (bullets)', items: it.achievements, placeholder: 'Achievement…' });
      const tools = listEditor({ label: 'Tools', items: it.tools, placeholder: 'Tool…' });
      const links = linksEditor({ label: 'Links', links: it.links });

      company.addEventListener('input', ()=>{ it.company = company.value; });
      role.addEventListener('input', ()=>{ it.role = role.value; });
      location.addEventListener('input', ()=>{ it.location = location.value; });
      startDate.addEventListener('input', ()=>{ it.startDate = startDate.value; });
      endDate.addEventListener('input', ()=>{ it.endDate = endDate.value; });
      current.addEventListener('change', ()=>{ it.current = current.checked; });
      description.addEventListener('input', ()=>{ it.description = description.value; });

      const cardEl = card([
        header,
        twoCol(
          card([
            field('Company *', company),
            field('Role *', role),
            field('Location', location)
          ]),
          card([
            field('Start date (YYYY-MM-DD) *', startDate),
            field('End date (YYYY-MM-DD)', endDate),
            field('Current role', current)
          ])
        ),
        card([field('Description', description)]),
        card([achievements.wrap]),
        card([tools.wrap]),
        card([links.wrap])
      ]);

      list.appendChild(cardEl);

      // Keep editors synced back into the item.
      Object.defineProperty(it, '_sync', { value: ()=>{
        it.achievements = achievements.value;
        it.tools = tools.value;
        it.links = links.value;
      }, enumerable: false });
    });
  }

  const addBtn = btn('Add professional role', 'ok', ()=>{
    state.items.push({
      id: '', company: '', role: '', location: '',
      startDate: '', endDate: '', current: false,
      description: '', achievements: [], tools: [], links: []
    });
    render();
  });

  const advancedBtn = btn('Advanced JSON…', '', ()=>viewJsonEditor('Experience (Advanced)', 'Directly edits src/content/experience/experience.json', API.experience, API.saveExperience));

  const saveBtn = btn('Save', 'primary', async ()=>{
    // sync nested editors
    state.items.forEach(it => { if (typeof it._sync === 'function') it._sync(); });

    // Minimal guardrails
    for (const [i, it] of state.items.entries()){
      if (!String(it.company||'').trim()) return setStatus(`Role #${i+1}: company is required.`, 'error');
      if (!String(it.role||'').trim()) return setStatus(`Role #${i+1}: role is required.`, 'error');
      if (!String(it.startDate||'').trim()) return setStatus(`Role #${i+1}: startDate is required.`, 'error');
      if (String(it.role||'').toLowerCase().includes('teaching assistant')) return setStatus(`Role #${i+1}: looks like a campus role; move it to Education → On-Campus Roles.`, 'error');
    }

    const out = { items: state.items.map(it => ({
      id: String(it.id||'').trim() || undefined,
      company: it.company.trim(),
      role: it.role.trim(),
      location: String(it.location||'').trim(),
      startDate: String(it.startDate||'').trim(),
      endDate: String(it.endDate||'').trim(),
      current: !!it.current,
      description: String(it.description||'').trim(),
      achievements: Array.isArray(it.achievements) ? it.achievements : [],
      tools: Array.isArray(it.tools) ? it.tools : [],
      links: Array.isArray(it.links) ? it.links.filter(l => l?.url) : []
    })) };

    setStatus('Saving…');
    const r = await API.saveExperience(out);
    if (r?.ok) setStatus('Saved experience.json', 'ok');
    else setStatus(r?.error || 'Save failed', 'error');
  });

  setHeader('Experience', 'Professional roles only. Use Education for campus roles/leadership.', [saveBtn, addBtn, advancedBtn]);

  render();
  c.append(list, card([
    (()=>{ const d=document.createElement('div'); d.className='code'; d.textContent='Shown fields map to experience.items[]. The public Experience page reads /content/experience/index.json generated during build.'; return d; })()
  ]));

  setStatus('Ready.', 'ok');
}

async function viewEducation(){
  setHeader('Education', 'Academic + campus profile (degrees, on-campus roles, achievements, leadership).');
  setStatus('Loading education…');
  const data = await API.education();

  // Migrate old schema in-memory if needed.
  const isNew = data && typeof data === 'object' && (data.degrees || data.campusRoles || data.achievements || data.leadership);
  const state = {
    degrees: isNew ? (Array.isArray(data.degrees) ? data.degrees.map(x=>structuredClone(x)) : []) : [],
    campusRoles: isNew ? (Array.isArray(data.campusRoles) ? data.campusRoles.map(x=>structuredClone(x)) : []) : [],
    achievements: isNew ? (Array.isArray(data.achievements) ? data.achievements.map(x=>structuredClone(x)) : []) : [],
    leadership: isNew ? (Array.isArray(data.leadership) ? data.leadership.map(x=>structuredClone(x)) : []) : [],
  };

  const c = $('#content');
  c.innerHTML = '';

  function sectionEditor({ title, items, renderCard, onAdd }){
    const wrap = document.createElement('div');
    const top = document.createElement('div');
    top.className = 'actions';
    top.style.justifyContent = 'space-between';
    top.style.alignItems = 'center';

    const t = document.createElement('div');
    t.style.fontWeight = '750';
    t.textContent = title;

    const add = btn('Add', 'ok', onAdd);
    top.append(t, add);

    const list = document.createElement('div');
    list.className = 'stack';

    function rerender(){
      list.innerHTML = '';
      items.forEach((it, idx)=>{
        list.appendChild(renderCard(it, idx, rerender));
      });
    }

    rerender();
    wrap.append(top, list);
    return { el: wrap, rerender };
  }

  function moveButtons(items, idx, rerender){
    const box = document.createElement('div');
    box.className = 'actions';
    box.append(
      smallBtn('Move up', '', ()=>{ if (idx===0) return; const t=items[idx-1]; items[idx-1]=items[idx]; items[idx]=t; rerender(); }),
      smallBtn('Move down', '', ()=>{ if (idx===items.length-1) return; const t=items[idx+1]; items[idx+1]=items[idx]; items[idx]=t; rerender(); }),
      smallBtn('Remove', 'danger', ()=>{ if (!confirm('Remove this item?')) return; items.splice(idx,1); rerender(); })
    );
    return box;
  }

  const degreesView = sectionEditor({
    title: 'Degrees',
    items: state.degrees,
    onAdd: ()=>{ state.degrees.push({ id:'', university:'', degree:'', location:'', startDate:'', endDate:'', duration:'', details:[], links:[] }); degreesView.rerender(); },
    renderCard: (it, idx, rerender)=>{
      const university = input('text', it.university || '');
      const degree = input('text', it.degree || '');
      const location = input('text', it.location || '');
      const startDate = input('text', it.startDate || '');
      const endDate = input('text', it.endDate || '');
      const duration = input('text', it.duration || '');
      const details = listEditor({ label: 'Details (bullets)', items: it.details || [], placeholder: 'Detail…' });
      const links = linksEditor({ label: 'Links', links: it.links || [] });

      university.addEventListener('input', ()=>{ it.university = university.value; });
      degree.addEventListener('input', ()=>{ it.degree = degree.value; });
      location.addEventListener('input', ()=>{ it.location = location.value; });
      startDate.addEventListener('input', ()=>{ it.startDate = startDate.value; });
      endDate.addEventListener('input', ()=>{ it.endDate = endDate.value; });
      duration.addEventListener('input', ()=>{ it.duration = duration.value; });

      Object.defineProperty(it, '_sync', { value: ()=>{ it.details = details.value; it.links = links.value; }, enumerable: false });

      return card([
        moveButtons(state.degrees, idx, rerender),
        twoCol(
          card([field('University *', university), field('Degree *', degree), field('Location', location)]),
          card([field('Start date (YYYY-MM-DD)', startDate), field('End date (YYYY-MM-DD)', endDate), field('Duration (display)', duration)])
        ),
        card([details.wrap]),
        card([links.wrap])
      ]);
    }
  });

  const campusRolesView = sectionEditor({
    title: 'On-Campus Roles',
    items: state.campusRoles,
    onAdd: ()=>{ state.campusRoles.push({ id:'', title:'', organization:'', location:'', startDate:'', endDate:'', current:false, duration:'', description:'', details:[], links:[] }); campusRolesView.rerender(); },
    renderCard: (it, idx, rerender)=>{
      const title = input('text', it.title || '');
      const org = input('text', it.organization || '');
      const location = input('text', it.location || '');
      const startDate = input('text', it.startDate || '');
      const endDate = input('text', it.endDate || '');
      const current = checkbox(!!it.current);
      const duration = input('text', it.duration || '');
      const description = textarea(it.description || '');
      const details = listEditor({ label: 'Details (bullets)', items: it.details || [], placeholder: 'Detail…' });
      const links = linksEditor({ label: 'Links', links: it.links || [] });

      title.addEventListener('input', ()=>{ it.title = title.value; });
      org.addEventListener('input', ()=>{ it.organization = org.value; });
      location.addEventListener('input', ()=>{ it.location = location.value; });
      startDate.addEventListener('input', ()=>{ it.startDate = startDate.value; });
      endDate.addEventListener('input', ()=>{ it.endDate = endDate.value; });
      current.addEventListener('change', ()=>{ it.current = current.checked; });
      duration.addEventListener('input', ()=>{ it.duration = duration.value; });
      description.addEventListener('input', ()=>{ it.description = description.value; });

      Object.defineProperty(it, '_sync', { value: ()=>{ it.details = details.value; it.links = links.value; }, enumerable: false });

      return card([
        moveButtons(state.campusRoles, idx, rerender),
        twoCol(
          card([field('Title *', title), field('Organization *', org), field('Location', location)]),
          card([field('Start date (YYYY-MM-DD)', startDate), field('End date (YYYY-MM-DD)', endDate), field('Current', current), field('Duration (display)', duration)])
        ),
        card([field('Description', description)]),
        card([details.wrap]),
        card([links.wrap])
      ]);
    }
  });

  const achievementsView = sectionEditor({
    title: 'Achievements',
    items: state.achievements,
    onAdd: ()=>{ state.achievements.push({ id:'', title:'', organization:'', date:'', description:'', links:[] }); achievementsView.rerender(); },
    renderCard: (it, idx, rerender)=>{
      const title = input('text', it.title || '');
      const org = input('text', it.organization || '');
      const date = input('text', it.date || '');
      const description = textarea(it.description || '');
      const links = linksEditor({ label: 'Links', links: it.links || [] });

      title.addEventListener('input', ()=>{ it.title = title.value; });
      org.addEventListener('input', ()=>{ it.organization = org.value; });
      date.addEventListener('input', ()=>{ it.date = date.value; });
      description.addEventListener('input', ()=>{ it.description = description.value; });

      Object.defineProperty(it, '_sync', { value: ()=>{ it.links = links.value; }, enumerable: false });

      return card([
        moveButtons(state.achievements, idx, rerender),
        twoCol(
          card([field('Title *', title), field('Organization / Event', org)]),
          card([field('Date (YYYY-MM-DD)', date)])
        ),
        card([field('Description', description)]),
        card([links.wrap])
      ]);
    }
  });

  const leadershipView = sectionEditor({
    title: 'Leadership',
    items: state.leadership,
    onAdd: ()=>{ state.leadership.push({ id:'', title:'', organization:'', location:'', startDate:'', endDate:'', current:false, duration:'', description:'', details:[], links:[] }); leadershipView.rerender(); },
    renderCard: (it, idx, rerender)=>{
      const title = input('text', it.title || '');
      const org = input('text', it.organization || '');
      const location = input('text', it.location || '');
      const startDate = input('text', it.startDate || '');
      const endDate = input('text', it.endDate || '');
      const current = checkbox(!!it.current);
      const duration = input('text', it.duration || '');
      const description = textarea(it.description || '');
      const details = listEditor({ label: 'Details (bullets)', items: it.details || [], placeholder: 'Detail…' });
      const links = linksEditor({ label: 'Links', links: it.links || [] });

      title.addEventListener('input', ()=>{ it.title = title.value; });
      org.addEventListener('input', ()=>{ it.organization = org.value; });
      location.addEventListener('input', ()=>{ it.location = location.value; });
      startDate.addEventListener('input', ()=>{ it.startDate = startDate.value; });
      endDate.addEventListener('input', ()=>{ it.endDate = endDate.value; });
      current.addEventListener('change', ()=>{ it.current = current.checked; });
      duration.addEventListener('input', ()=>{ it.duration = duration.value; });
      description.addEventListener('input', ()=>{ it.description = description.value; });

      Object.defineProperty(it, '_sync', { value: ()=>{ it.details = details.value; it.links = links.value; }, enumerable: false });

      return card([
        moveButtons(state.leadership, idx, rerender),
        twoCol(
          card([field('Title *', title), field('Organization *', org), field('Location', location)]),
          card([field('Start date (YYYY-MM-DD)', startDate), field('End date (YYYY-MM-DD)', endDate), field('Current', current), field('Duration (display)', duration)])
        ),
        card([field('Description', description)]),
        card([details.wrap]),
        card([links.wrap])
      ]);
    }
  });

  const saveBtn = btn('Save', 'primary', async ()=>{
    // sync nested editors
    [...state.degrees, ...state.campusRoles, ...state.achievements, ...state.leadership].forEach(it => { if (typeof it._sync === 'function') it._sync(); });

    // Minimal required checks
    for (const [i, d] of state.degrees.entries()){
      if (!String(d.university||'').trim()) return setStatus(`Degree #${i+1}: university is required.`, 'error');
      if (!String(d.degree||'').trim()) return setStatus(`Degree #${i+1}: degree is required.`, 'error');
    }
    for (const [i, r] of state.campusRoles.entries()){
      if (!String(r.title||'').trim()) return setStatus(`Campus role #${i+1}: title is required.`, 'error');
      if (!String(r.organization||'').trim()) return setStatus(`Campus role #${i+1}: organization is required.`, 'error');
    }
    for (const [i, a] of state.achievements.entries()){
      if (!String(a.title||'').trim()) return setStatus(`Achievement #${i+1}: title is required.`, 'error');
    }
    for (const [i, r] of state.leadership.entries()){
      if (!String(r.title||'').trim()) return setStatus(`Leadership #${i+1}: title is required.`, 'error');
      if (!String(r.organization||'').trim()) return setStatus(`Leadership #${i+1}: organization is required.`, 'error');
    }

    const out = {
      degrees: state.degrees.map(x => ({
        id: String(x.id||'').trim() || undefined,
        university: String(x.university||'').trim(),
        degree: String(x.degree||'').trim(),
        location: String(x.location||'').trim(),
        startDate: String(x.startDate||'').trim(),
        endDate: String(x.endDate||'').trim(),
        duration: String(x.duration||'').trim(),
        details: Array.isArray(x.details) ? x.details : [],
        links: Array.isArray(x.links) ? x.links.filter(l => l?.url) : []
      })),
      campusRoles: state.campusRoles.map(x => ({
        id: String(x.id||'').trim() || undefined,
        title: String(x.title||'').trim(),
        organization: String(x.organization||'').trim(),
        location: String(x.location||'').trim(),
        startDate: String(x.startDate||'').trim(),
        endDate: String(x.endDate||'').trim(),
        current: !!x.current,
        duration: String(x.duration||'').trim(),
        description: String(x.description||'').trim(),
        details: Array.isArray(x.details) ? x.details : [],
        links: Array.isArray(x.links) ? x.links.filter(l => l?.url) : []
      })),
      achievements: state.achievements.map(x => ({
        id: String(x.id||'').trim() || undefined,
        title: String(x.title||'').trim(),
        organization: String(x.organization||'').trim(),
        date: String(x.date||'').trim(),
        description: String(x.description||'').trim(),
        links: Array.isArray(x.links) ? x.links.filter(l => l?.url) : []
      })),
      leadership: state.leadership.map(x => ({
        id: String(x.id||'').trim() || undefined,
        title: String(x.title||'').trim(),
        organization: String(x.organization||'').trim(),
        location: String(x.location||'').trim(),
        startDate: String(x.startDate||'').trim(),
        endDate: String(x.endDate||'').trim(),
        current: !!x.current,
        duration: String(x.duration||'').trim(),
        description: String(x.description||'').trim(),
        details: Array.isArray(x.details) ? x.details : [],
        links: Array.isArray(x.links) ? x.links.filter(l => l?.url) : []
      })),
    };

    setStatus('Saving…');
    const r = await API.saveEducation(out);
    if (r?.ok) setStatus('Saved education.json', 'ok');
    else setStatus(r?.error || 'Save failed', 'error');
  });

  const advancedBtn = btn('Advanced JSON…', '', ()=>viewJsonEditor('Education (Advanced)', 'Directly edits src/content/education/education.json', API.education, API.saveEducation));

  setHeader('Education', 'Form-based editor. Data saved into src/content/education/education.json', [saveBtn, advancedBtn]);

  const tabbed = tabs({
    initialId: 'degrees',
    items: [
      { id: 'degrees', label: 'Degrees', el: degreesView.el },
      { id: 'campusRoles', label: 'On-Campus Roles', el: campusRolesView.el },
      { id: 'achievements', label: 'Achievements', el: achievementsView.el },
      { id: 'leadership', label: 'Leadership', el: leadershipView.el },
    ]
  });

  c.append(tabbed.wrap, card([
    (()=>{ const d=document.createElement('div'); d.className='code'; d.textContent='Public Education page reads /content/education/index.json generated during build.'; return d; })()
  ]));

  setStatus('Ready.', 'ok');
}

const routes = {
  site: viewSite,
  projects: viewProjects,
  insights: ()=>viewPosts('insights'),
  life: ()=>viewPosts('life'),
  experience: viewExperience,
  education: viewEducation,
  tools: viewTools,
};

function setCurrent(view){
  $$('#nav .nav__item').forEach(b=>{
    b.setAttribute('aria-current', b.dataset.view===view ? 'page' : 'false');
  });
}

async function go(view){
  if (!routes[view]) view = 'site';
  setCurrent(view);
  location.hash = view;
  try{
    await routes[view]();
  }catch(e){
    console.error(e);
    setStatus(e?.message || 'Error', 'error');
    $('#content').innerHTML = `<div class="card"><div class="code">${(e?.stack||e?.message||String(e)).replace(/</g,'&lt;')}</div></div>`;
  }
}

window.addEventListener('hashchange', ()=>go(location.hash.replace('#','')));
$('#nav').addEventListener('click', (e)=>{
  const btn = e.target.closest('button[data-view]');
  if (!btn) return;
  go(btn.dataset.view);
});

// boot
(async ()=>{
  const view = location.hash.replace('#','') || 'site';
  await go(view);
})();
