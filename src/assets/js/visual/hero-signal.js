// visual/hero-signal.js
// Bespoke hero interaction — "Signal": a field of points drifts as noise;
// wherever the pointer goes, nearby points resolve toward an ordered lattice
// and connect with faint accent lines. Order emerging from noise.
//
// Design constraints honored:
// - Hand-written 2D canvas (no heavy 3D dependency for a particle field)
// - Progressive enhancement: no canvas / reduced-motion => static resolved frame or nothing
// - Cheap: capped point count + DPR, pauses when tab hidden or hero offscreen
// - Content never depends on it; it's purely atmospheric behind the copy
// - Theme-aware: reads --fg / --accent at init

export function initHeroSignal(canvas) {
  if (!canvas || !canvas.getContext) return () => {};
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return () => {};

  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const readColor = (name, fallback) => {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  };
  let inkRGB = hexish(readColor('--fg', '#17150f'));
  let accentRGB = hexish(readColor('--accent', '#c1440e'));

  const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  let W = 0, H = 0;
  let cols = 0, rows = 0, gap = 0, ox = 0, oy = 0;
  let points = [];

  const pointer = { x: -9999, y: -9999, active: false };
  const RADIUS = 150;            // influence radius (css px)

  function layout() {
    const rect = canvas.getBoundingClientRect();
    W = Math.max(1, Math.floor(rect.width));
    H = Math.max(1, Math.floor(rect.height));
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    // Build a jittered lattice sized to the area (density scales, but capped)
    gap = Math.max(46, Math.min(72, Math.round(Math.sqrt((W * H) / 260))));
    cols = Math.ceil(W / gap) + 1;
    rows = Math.ceil(H / gap) + 1;
    if (cols * rows > 900) { // hard cap for perf
      const scale = Math.sqrt((cols * rows) / 900);
      gap = Math.round(gap * scale);
      cols = Math.ceil(W / gap) + 1;
      rows = Math.ceil(H / gap) + 1;
    }
    ox = (W - (cols - 1) * gap) / 2;
    oy = (H - (rows - 1) * gap) / 2;

    points = [];
    let i = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const hx = ox + c * gap;
        const hy = oy + r * gap;
        points.push({
          hx, hy,                 // ordered home (the "signal")
          x: hx, y: hy,
          // per-point noise seed
          a: Math.random() * Math.PI * 2,
          s: 0.4 + Math.random() * 0.7,
          amp: gap * (0.28 + Math.random() * 0.22),
          i: i++
        });
      }
    }
  }

  function neighborsGrid(p) {
    // index math to fetch right + down neighbor for lattice lines
    const idx = p.i;
    const c = idx % cols;
    const right = c < cols - 1 ? points[idx + 1] : null;
    const down = idx + cols < points.length ? points[idx + cols] : null;
    return [right, down];
  }

  function frame(t) {
    ctx.clearRect(0, 0, W, H);
    const time = t * 0.001;

    // Update positions: drift as noise, resolve toward home near pointer
    for (const p of points) {
      const driftX = Math.cos(p.a + time * p.s) * p.amp;
      const driftY = Math.sin(p.a * 1.3 + time * p.s * 0.9) * p.amp;
      const noiseX = p.hx + driftX;
      const noiseY = p.hy + driftY;

      let order = 0;
      if (pointer.active) {
        const dx = p.hx - pointer.x;
        const dy = p.hy - pointer.y;
        const d = Math.hypot(dx, dy);
        if (d < RADIUS) order = 1 - d / RADIUS;
      }
      order = order * order; // ease
      p.order = order;
      p.x = noiseX + (p.hx - noiseX) * order;
      p.y = noiseY + (p.hy - noiseY) * order;
    }

    // Lattice lines where order is high (the "signal" resolving)
    ctx.lineWidth = 1;
    for (const p of points) {
      if (p.order < 0.08) continue;
      const [right, down] = neighborsGrid(p);
      for (const n of [right, down]) {
        if (!n) continue;
        const o = Math.min(p.order, n.order);
        if (o < 0.08) continue;
        ctx.strokeStyle = `rgba(${accentRGB},${(o * 0.5).toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(n.x, n.y);
        ctx.stroke();
      }
    }

    // Points: faint ink dots, brighter + accent as they resolve
    for (const p of points) {
      const o = p.order || 0;
      const rad = 1 + o * 1.2;
      if (o > 0.15) {
        ctx.fillStyle = `rgba(${accentRGB},${(0.25 + o * 0.55).toFixed(3)})`;
      } else {
        ctx.fillStyle = `rgba(${inkRGB},${(0.10 + o * 0.2).toFixed(3)})`;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    raf = requestAnimationFrame(frame);
  }

  function staticFrame() {
    // Reduced-motion: draw the fully-resolved ordered lattice once, faint.
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = `rgba(${inkRGB},0.10)`;
    ctx.lineWidth = 1;
    for (const p of points) {
      const [right, down] = neighborsGrid(p);
      for (const n of [right, down]) {
        if (!n) continue;
        ctx.beginPath(); ctx.moveTo(p.hx, p.hy); ctx.lineTo(n.hx, n.hy); ctx.stroke();
      }
    }
    for (const p of points) {
      ctx.fillStyle = `rgba(${inkRGB},0.16)`;
      ctx.beginPath(); ctx.arc(p.hx, p.hy, 1.3, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Pointer over the whole hero (canvas is pointer-events:none, so listen on parent)
  const host = canvas.closest('.hero') || canvas.parentElement || window;
  const onMove = (e) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = e.clientX - rect.left;
    pointer.y = e.clientY - rect.top;
    pointer.active = true;
  };
  const onLeave = () => { pointer.active = false; pointer.x = pointer.y = -9999; };

  let raf = 0;
  let running = false;
  function start() {
    if (running || reduced) return;
    running = true;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  // Pause when offscreen
  let io = null;
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver((ents) => {
      for (const en of ents) {
        if (en.isIntersecting) start(); else stop();
      }
    }, { threshold: 0.01 });
    io.observe(canvas);
  } else {
    start();
  }

  const onVis = () => { if (document.hidden) stop(); else if (!reduced) start(); };
  const onResize = () => { layout(); if (reduced) staticFrame(); };

  layout();
  if (reduced) {
    staticFrame();
  } else {
    host.addEventListener('pointermove', onMove, { passive: true });
    host.addEventListener('pointerleave', onLeave, { passive: true });
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('resize', onResize, { passive: true });
  }

  return function cleanup() {
    stop();
    if (io) io.disconnect();
    host.removeEventListener && host.removeEventListener('pointermove', onMove);
    host.removeEventListener && host.removeEventListener('pointerleave', onLeave);
    document.removeEventListener('visibilitychange', onVis);
    window.removeEventListener('resize', onResize);
  };
}

// "#rrggbb" -> "r,g,b"; tolerant of already-rgb-ish values.
function hexish(v) {
  v = String(v).trim();
  const m = v.match(/^#([0-9a-f]{6})$/i);
  if (m) {
    const n = parseInt(m[1], 16);
    return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
  }
  const m3 = v.match(/^#([0-9a-f]{3})$/i);
  if (m3) {
    const r = parseInt(m3[1][0] + m3[1][0], 16);
    const g = parseInt(m3[1][1] + m3[1][1], 16);
    const b = parseInt(m3[1][2] + m3[1][2], 16);
    return `${r},${g},${b}`;
  }
  const rgb = v.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  if (rgb) return `${rgb[1]},${rgb[2]},${rgb[3]}`;
  return '23,21,15';
}
