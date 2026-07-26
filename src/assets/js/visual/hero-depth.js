// visual/hero-depth.js
// Subtle spatial depth for the layered hero: pointer parallax + scroll depth.
// Writes normalized values to CSS custom props; the CSS decides how far each
// layer moves. Deliberately understated — the portrait never chases the mouse.
//
// - Pointer parallax: desktop (fine pointer) only.
// - Scroll depth: all non-reduced-motion.
// - Fully disabled under prefers-reduced-motion.

export function initHeroDepth(stage) {
  if (!stage) return () => {};
  const inner = stage.querySelector('.hero-stage-inner');
  if (!inner) return () => {};

  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return () => {};

  const fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  let px = 0, py = 0, tpx = 0, tpy = 0, raf = 0;

  const onPointer = (e) => {
    const r = stage.getBoundingClientRect();
    tpx = ((e.clientX - r.left) / (r.width || 1) - 0.5) * 2;   // -1..1
    tpy = ((e.clientY - r.top) / (r.height || 1) - 0.5) * 2;
  };
  const onLeave = () => { tpx = 0; tpy = 0; };

  const tick = () => {
    px += (tpx - px) * 0.08;
    py += (tpy - py) * 0.08;
    inner.style.setProperty('--px', px.toFixed(3));
    inner.style.setProperty('--py', py.toFixed(3));
    raf = requestAnimationFrame(tick);
  };

  let scrollScheduled = false;
  const applyScroll = () => {
    scrollScheduled = false;
    const r = stage.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, -r.top / (r.height || 1)));
    inner.style.setProperty('--sy', p.toFixed(3));
  };
  const onScroll = () => {
    if (scrollScheduled) return;
    scrollScheduled = true;
    requestAnimationFrame(applyScroll);
  };

  applyScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', applyScroll, { passive: true });

  if (fine) {
    stage.addEventListener('pointermove', onPointer, { passive: true });
    stage.addEventListener('pointerleave', onLeave, { passive: true });
    raf = requestAnimationFrame(tick);
  }

  return function cleanup() {
    if (raf) cancelAnimationFrame(raf);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', applyScroll);
    stage.removeEventListener('pointermove', onPointer);
    stage.removeEventListener('pointerleave', onLeave);
  };
}
