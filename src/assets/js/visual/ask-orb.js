// visual/ask-orb.js
// A small, ambient "fluid orb" for the Ask-my-portfolio entry point. Cheap 2D
// canvas — a few soft blobs drifting inside a circular clip, tinted in the
// editorial rust/ochre palette. No WebGL. Pauses when off-screen or the tab is
// hidden, reacts subtly to the pointer, and renders a single static frame under
// reduced motion. Code-split + init-on-visible from app.js.

export function initAskOrb(canvas) {
  if (!canvas || !canvas.getContext) return;
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ctx = canvas.getContext('2d');

  const dark = () => document.documentElement.getAttribute('data-theme') === 'dark';
  // Warm editorial palette (rust / ochre / deep ink accents).
  const palette = () => (dark()
    ? ['#e0623a', '#c1440e', '#7a3a1e', '#eab676']
    : ['#c1440e', '#d8722e', '#a63a0b', '#e6a15a']);

  let W = 0, H = 0, R = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
  const blobs = [];
  const N = 5;
  let pointer = { x: 0, y: 0, active: false };
  let raf = 0, running = false;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const size = Math.max(80, Math.min(rect.width, rect.height));
    W = canvas.width = Math.round(size * dpr);
    H = canvas.height = Math.round(size * dpr);
    R = W / 2;
    canvas.style.width = canvas.style.height = size + 'px';
  }

  function seed() {
    blobs.length = 0;
    const cols = palette();
    for (let i = 0; i < N; i++) {
      const ang = (i / N) * Math.PI * 2;
      blobs.push({
        x: R + Math.cos(ang) * R * 0.35,
        y: R + Math.sin(ang) * R * 0.35,
        vx: (Math.random() - 0.5) * 0.25 * dpr,
        vy: (Math.random() - 0.5) * 0.25 * dpr,
        r: R * (0.5 + Math.random() * 0.25),
        c: cols[i % cols.length]
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.beginPath();
    ctx.arc(R, R, R - dpr, 0, Math.PI * 2);
    ctx.clip();

    // Bone/ink base wash so the orb reads as a disc, not a floating glow.
    ctx.fillStyle = dark() ? '#1b1a14' : '#efe9db';
    ctx.fillRect(0, 0, W, H);

    ctx.globalCompositeOperation = 'source-over';
    for (const b of blobs) {
      const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
      g.addColorStop(0, hexA(b.c, 0.55));
      g.addColorStop(1, hexA(b.c, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Fine hairline ring, matching the site's rule language.
    ctx.beginPath();
    ctx.arc(R, R, R - dpr, 0, Math.PI * 2);
    ctx.strokeStyle = dark() ? 'rgba(242,239,228,0.28)' : 'rgba(23,21,15,0.22)';
    ctx.lineWidth = dpr;
    ctx.stroke();
  }

  function step() {
    for (const b of blobs) {
      b.x += b.vx; b.y += b.vy;
      // gentle attraction toward center keeps them pooled
      b.vx += (R - b.x) * 0.00018;
      b.vy += (R - b.y) * 0.00018;
      if (pointer.active) {
        b.vx += (pointer.x - b.x) * 0.00035;
        b.vy += (pointer.y - b.y) * 0.00035;
      }
      b.vx *= 0.985; b.vy *= 0.985;
    }
    draw();
    raf = requestAnimationFrame(step);
  }

  function start() {
    if (running || reduce) return;
    running = true;
    raf = requestAnimationFrame(step);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  resize(); seed(); draw();

  if (reduce) return; // one static frame is enough

  canvas.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = (e.clientX - rect.left) * dpr;
    pointer.y = (e.clientY - rect.top) * dpr;
    pointer.active = true;
  });
  canvas.addEventListener('pointerleave', () => { pointer.active = false; });

  window.addEventListener('resize', () => { resize(); seed(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop(); else start();
  });

  // Only animate while the orb is on screen.
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) { if (e.isIntersecting) start(); else stop(); }
    }, { threshold: 0.1 });
    io.observe(canvas);
  } else {
    start();
  }
}
