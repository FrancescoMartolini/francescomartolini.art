'use strict';

// ════════════════════════════════
// CURSORE ADATTIVO
// ════════════════════════════════
function avviaCursore() {
  if (!window.matchMedia('(hover: hover)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(forced-colors: active)').matches) return;
  const c = document.createElement('div');
  c.id = 'cursore';
  const r = document.createElement('div');
  r.id = 'cursore-ring';
  document.body.appendChild(c);
  document.body.appendChild(r);
  let rx = 0, ry = 0, mx = 0, my = 0;

  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    c.style.left = mx + 'px'; c.style.top = my + 'px';
    if (!avviaCursore._t) {
      avviaCursore._t = setTimeout(() => {
        avviaCursore._t = null;
        c.style.visibility = 'hidden'; r.style.visibility = 'hidden';
        const elSotto = document.elementFromPoint(mx, my);
        c.style.visibility = ''; r.style.visibility = '';
        if (elSotto) document.body.classList.toggle('cursore-invertito', isColorDark(trovaBgReale(elSotto)));
      }, 100);
    }
  });

  function animaRing() {
    rx += (mx - rx) * 0.1; ry += (my - ry) * 0.1;
    r.style.left = rx + 'px'; r.style.top = ry + 'px';
    requestAnimationFrame(animaRing);
  }
  animaRing();
}

function trovaBgReale(el) {
  let current = el;
  while (current && current !== document.documentElement) {
    const bg = window.getComputedStyle(current).backgroundColor;
    if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg;
    current = current.parentElement;
  }
  return window.getComputedStyle(document.body).backgroundColor;
}

function isColorDark(colorStr) {
  if (!colorStr) return false;
  const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]*)/);
  if (!match) return false;
  const [, r, g, b, a] = match;
  if (parseFloat(a) === 0) return false;
  return (0.299 * +r + 0.587 * +g + 0.114 * +b) / 255 < 0.4;
}
