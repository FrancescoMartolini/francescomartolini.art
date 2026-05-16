/* ============================================
  LIBRO ENGINE v2 — Francesco Martolini .art
   Implementazioni: con Google Sheets, protezione
   immagini,cookie, mappa, link esterno, Caveat,
   foto taccuino

  LIBRO ENGINE v3 — Francesco Martolini .art
   Layout: header / libro / footer
   Favicon dinamica, tema scuro, Google Sheets

  LIBRO ENGINE v4 — Francesco Martolini .art
   Desktop: scroll editoriale
   Mobile: libro a pagine

  LIBRO ENGINE v5 — Francesco Martolini .art
   + cursore adattivo, slider progetti, 4 pagine overlay
   + orologio sticky, tema scuro area progetti
   ============================================ */

'use strict';

const SHEETS_URL = 'https://docs.google.com/spreadsheets/d/XXXXXXXXXXXXXXXX/pub?output=csv';

const stato = {
  paginaCorrente: 0,
  totPagine: 0,
  inTransizione: false,
  progetti: [],
  intervalli: [],
  taccuino: [],
  collaborazioni:[],
  sliderIdx: 0
};

const $ = id => document.getElementById(id);
const crea = tag => document.createElement(tag);
const isMobile = () => window.innerWidth <= 768;

function formatData(s) {
  if (!s) return '';
  const d = new Date(s);
  if (isNaN(d)) return s;
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatNum(n) { return String(n).padStart(2, '0'); }

// ── Favicon dinamica ──
function aggiorneFavicon(lettera) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#0a0a0a" rx="6"/><text x="16" y="24" font-family="Georgia,serif" font-size="20" font-style="italic" fill="#fafaf8" text-anchor="middle">${lettera}</text></svg>`;
  let link = document.querySelector("link[rel='icon']");
  if (!link) { link = crea('link'); link.rel = 'icon'; document.head.appendChild(link); }
  link.href = 'data:image/svg+xml,' + encodeURIComponent(svg);
}

// ── CSV Parser ──
function parseCsv(csv) {
  return csv.trim().split('\n').slice(1).map((riga, i) => {
    const celle = []; let inQ = false, cell = '';
    for (const ch of riga) {
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === ',' && !inQ) { celle.push(cell.trim()); cell = ''; continue; }
      cell += ch;
    }
    celle.push(cell.trim());
    return { id: i + 1, testo: celle[0] || '', data: celle[1] || '', foto: celle[2] || null };
  }).filter(v => v.testo);
}

// ── Carica dati ──
async function caricaDati() {
  const [progetti, intervalli, collaborazioni] = await Promise.all([
    fetch('json/progetti.json').then(r => r.json()),
    fetch('json/intervalli.json').then(r => r.json()),
    fetch('json/collaborazioni.json').then(r => r.json())
  ]);
  stato.progetti = progetti;
  stato.intervalli = intervalli;
  stato.collaborazioni = collaborazioni

  try {
    const r = await fetch(SHEETS_URL);
    if (!r.ok) throw new Error();
    stato.taccuino = parseCsv(await r.text()).sort((a, b) => new Date(b.data) - new Date(a.data));
  } catch {
    try {
      stato.taccuino = (await fetch('json/taccuino.json').then(r => r.json()))
        .sort((a, b) => new Date(b.data) - new Date(a.data));
    } catch { stato.taccuino = []; }
  }
}

// ── Orologio ──
function avviaOrologio() {
  function tick() {
    const o = new Date();
    const pad = n => String(n).padStart(2, '0');
    const oo = `${pad(o.getHours())}:${pad(o.getMinutes())}:${pad(o.getSeconds())}`;
    const dd = `${pad(o.getDate())}.${pad(o.getMonth()+1)}.${o.getFullYear()}`;
    document.querySelectorAll('.ora-live').forEach(el => el.textContent = oo);
    document.querySelectorAll('.data-live').forEach(el => el.textContent = dd);
  }
  tick(); setInterval(tick, 1000);
}

// ── Orologio sticky desktop ──
function avviaOrologioSticky() {
  if (isMobile()) return;
  const wrap = crea('div'); wrap.id = 'orologio-sticky';
  wrap.innerHTML = `<div class="data-live"></div><div class="ora-live"></div><span class="ora-label-small">ora corrente</span>`;
  document.body.appendChild(wrap);

  // Nasconde quando entra nell'hero (che ha già il proprio orologio)
  const hero = document.querySelector('.desktop-hero');
  if (!hero) return;
  const obs = new IntersectionObserver(entries => {
    wrap.style.opacity = entries[0].isIntersecting ? '0' : '1';
  }, { threshold: 0.3 });
  obs.observe(hero);
}

// ── Immagine protetta ──
function creaImg(src, alt) {
  const wrap = crea('div');
  wrap.style.cssText = 'width:100%;height:100%;overflow:hidden;position:relative;background:var(--grigio-chiaro);';
  if (src) {
    const img = crea('img');
    img.src = src; img.alt = alt || ''; img.draggable = false;
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;pointer-events:none;-webkit-user-drag:none;';
    img.onerror = () => {
      img.remove();
      wrap.style.cssText += 'display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--grigio-medio);';
      wrap.textContent = alt || '';
    };
    const overlay = crea('div'); overlay.style.cssText = 'position:absolute;inset:0;z-index:1;';
    wrap.appendChild(img); wrap.appendChild(overlay);
  } else {
    wrap.style.cssText += 'display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--grigio-medio);';
    wrap.textContent = alt || '';
  }
  return wrap;
}

// ════════════════════════════════
// CURSORE ADATTIVO
// Diventa bianco quando sopra area scura
// ════════════════════════════════
function avviaCursore() {
  if (!window.matchMedia('(hover: hover)').matches) return;

  const c = crea('div'); c.id = 'cursore';
  const r = crea('div'); r.id = 'cursore-ring';
  document.body.appendChild(c); document.body.appendChild(r);

  let rx = 0, ry = 0, mx = 0, my = 0;

  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    c.style.left = mx + 'px'; c.style.top = my + 'px';

    // Throttle: controlla sfondo solo ogni 100ms
    if (!avviaCursore._t) {
      avviaCursore._t = setTimeout(() => {
        avviaCursore._t = null;
        c.style.visibility = 'hidden';
        r.style.visibility = 'hidden';
        const elSotto = document.elementFromPoint(mx, my);
        c.style.visibility = '';
        r.style.visibility = '';
        if (elSotto) {
          const bg = trovaBgReale(elSotto);
          document.body.classList.toggle('cursore-invertito', isColorDark(bg));
        }
      }, 100);
    }
  });

  function animaRing() {
    rx += (mx - rx) * 0.1;
    ry += (my - ry) * 0.1;
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
  if (parseFloat(a) === 0) return false; // trasparente
  const luminanza = (0.299 * +r + 0.587 * +g + 0.114 * +b) / 255;
  return luminanza < 0.4;
}

// ════════════════════════════════
// DESKTOP — Popola sezioni
// ════════════════════════════════
function popolaDesktop() {
  // Hero image
  const heroImg = $('hero-img');
  if (heroImg && stato.progetti[0]) {
    heroImg.appendChild(creaImg(stato.progetti[0].immagine_copertina, stato.progetti[0].titolo));
  }

  // Slider progetti
  popolaSliderProgetti();

  // Taccuino colonne
  const colonne = $('taccuino-colonne-desktop');
  if (colonne) {
    stato.taccuino.slice(0, 3).forEach(v => {
      const col = crea('div'); col.className = 'taccuino-col-voce';
      col.innerHTML = `
        <p class="taccuino-col-data">${formatData(v.data)}</p>
        <p class="taccuino-col-frase">${v.testo}</p>
        <button class="taccuino-col-expand" onclick="apriTaccuino()">+</button>
      `;
      colonne.appendChild(col);
    });
  }

  // Studi griglia (prime 5 immagini)
  const studiGriglia = $('studi-griglia-desktop');
  if (studiGriglia) {
    stato.intervalli.flatMap(iv => iv.immagini).slice(0, 5).forEach((src, i) => {
      const cell = crea('div'); cell.className = 'studio-img';
      cell.appendChild(creaImg(src, `Studio ${i+1}`));
      studiGriglia.appendChild(cell);
    });
  }

  // Footer anno
  const annoEl = $('footer-anno');
  if (annoEl) annoEl.textContent = new Date().getFullYear();
}

document.addEventListener('click', e => {
  if (isMobile()) return;
  if ($('lightbox')?.classList.contains('aperto')) return;

  // Cerca img sia come target diretto che come figlio del target
  const img = e.target.tagName === 'IMG'
    ? e.target
    : e.target.querySelector('img');

  if (!img) return;
  if (img.closest('#lightbox')) return;
  if (img.closest('.progetto-card-img')) return;
  if (img.closest('.hero-immagine')) return;
  if (img.closest('.tutti-card-img')) return;
  if (img.closest('.chi-sono-desktop-img')) return;
  if (img.closest('.collab-img')) return;

  const src = img.src;
  if (src && !src.endsWith('favicon.svg')) apriLightbox(src, img.alt || '');
});

// ── Slider progetti ──
function popolaSliderProgetti() {
  const griglia = $('progetti-griglia-desktop');
  if (!griglia) return;

  stato.progetti.forEach((pr, i) => {
    const card = crea('div'); card.className = 'progetto-card';
    card.innerHTML = `
      <div class="progetto-card-img"></div>
      <p class="progetto-card-num">0${i+1}</p>
      <p class="progetto-card-titolo">${pr.titolo.toUpperCase()}</p>
      <p class="progetto-card-anno">${pr.anno}</p>
    `;
    card.querySelector('.progetto-card-img').appendChild(creaImg(pr.immagine_copertina, pr.titolo));
    card.addEventListener('click', () => apriProgetto(pr.id));
    griglia.appendChild(card);
  });

  // Slider frecce — mostrale solo se ci sono più di 4 progetti
  const sx = $('proj-sx'), dx = $('proj-dx');
  if (!sx || !dx) return;

  const visibili = 4;
  const tot = stato.progetti.length;

  if (tot <= visibili) { sx.hidden = true; dx.hidden = true; return; }

  sx.hidden = true; // inizia a sinistra, nascondi freccia sx

  function aggiorna() {
    const larghezzaCard = griglia.querySelector('.progetto-card')?.offsetWidth || 0;
    const gap = 24;
    griglia.style.transform = `translateX(-${stato.sliderIdx * (larghezzaCard + gap)}px)`;
    sx.hidden = stato.sliderIdx === 0;
    dx.hidden = stato.sliderIdx >= tot - visibili;
  }

  sx.addEventListener('click', () => { stato.sliderIdx = Math.max(0, stato.sliderIdx - 1); aggiorna(); });
  dx.addEventListener('click', () => { stato.sliderIdx = Math.min(tot - visibili, stato.sliderIdx + 1); aggiorna(); });
}

// ════════════════════════════════
// OVERLAY PAGINE
// ════════════════════════════════
function apriPagina(tipo) {
  const overlay = $('overlay-pagina');
  const contenuto = $('overlay-contenuto');
  contenuto.innerHTML = '';

  switch (tipo) {

    case 'tutti-progetti':
      contenuto.innerHTML = `<h1 class="overlay-titolo">Tutti i progetti</h1><div class="tutti-progetti-griglia" id="tutti-proj-grid"></div>`;
      overlay.classList.add('aperta');
      overlay.scrollTop = 0;
      stato.progetti.forEach((pr, i) => {
        const card = crea('div'); card.className = 'tutti-card';
        card.innerHTML = `
          <div class="tutti-card-img"></div>
          <p class="tutti-card-num">0${i+1}</p>
          <h2 class="tutti-card-titolo">${pr.titolo}</h2>
          <p class="tutti-card-anno">${pr.anno}</p>
          <p class="tutti-card-desc">${pr.descrizione}</p>
        `;
        card.querySelector('.tutti-card-img').appendChild(creaImg(pr.immagine_copertina, pr.titolo));
        card.addEventListener('click', () => apriProgetto(pr.id));
        document.getElementById('tutti-proj-grid').appendChild(card);
      });
      break;

    case 'tutti-studi':
      contenuto.innerHTML = `<h1 class="overlay-titolo">Intervalli</h1><p style="font-size:13px;font-weight:300;color:var(--grigio-testo);margin-bottom:40px;line-height:1.8;">Fotografie che non appartengono a un progetto, ma al mio modo di guardare.</p><div class="tutti-studi-griglia" id="tutti-studi-grid"></div>`;
      overlay.classList.add('aperta');
      overlay.scrollTop = 0;
      stato.intervalli.flatMap(iv => iv.immagini).forEach((src, i) => {
        const cell = crea('div'); cell.className = 'tutti-studio-img';
        cell.appendChild(creaImg(src, `Studio ${i+1}`));
        document.getElementById('tutti-studi-grid').appendChild(cell);
      });
      break;

    case 'chi-sono-pagina':
      contenuto.innerHTML = `
        <h1 class="overlay-titolo">Chi sono</h1>
        <div class="chi-sono-esteso">
          <div class="chi-sono-esteso-testo">
            <h2>Francesco Martolini</h2>
            <p>Fotografo italiano. Il mio lavoro esplora il rapporto tra spazio, tempo e memoria — cercando nelle immagini le tracce di ciò che resta.</p>
            <p>Sono interessato alla fotografia come strumento di indagine, non di rappresentazione. Ogni progetto nasce da una domanda che il tempo continua a restituirmi.</p>
            <p>Basato tra Roma e Milano, lavoro su progetti a lungo termine alternati a commissioni commerciali selezionate.</p>
            <div class="chi-sono-contatti-esteso">
              <p class="contatti-label" style="margin-bottom:4px;">Contatti</p>
              <p style="font-size:12px;font-weight:300;line-height:1.7;color:var(--grigio-testo);font-style:italic;margin-bottom:16px;">Non offro servizi di shooting su richiesta. Scrivimi se sei interessato a un'opera o vuoi costruire qualcosa insieme.</p>
              <a class="contatto-btn" href="mailto:info@francescomartolini.art"><svg viewBox="0 0 24 24" style="width:15px;height:15px;stroke:currentColor;fill:none;stroke-width:1.5;stroke-linecap:round;flex-shrink:0;"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/></svg>info@francescomartolini.art</a>
              <a class="contatto-btn" href="https://instagram.com/francescomartolini" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" style="width:15px;height:15px;stroke:currentColor;fill:none;stroke-width:1.5;stroke-linecap:round;flex-shrink:0;"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/></svg>@francescomartolini</a>
              <a class="contatto-btn" href="tel:+39XXXXXXXXXX"><svg viewBox="0 0 24 24" style="width:15px;height:15px;stroke:currentColor;fill:none;stroke-width:1.5;stroke-linecap:round;flex-shrink:0;"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.09 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7a2 2 0 011.72 2.03z"/></svg>+39 XXX XXX XXXX</a>
            </div>
          </div>
          <div class="chi-sono-esteso-img" id="chi-sono-overlay-img"></div>
        </div>
      `;
      overlay.classList.add('aperta');
      overlay.scrollTop = 0;
      // Immagine placeholder o dal primo progetto
      const imgWrap = $('chi-sono-overlay-img');
      if (imgWrap && stato.progetti[0]) {
        imgWrap.appendChild(creaImg(stato.progetti[0].immagine_copertina, 'Francesco Martolini'));
      }
      break;

    case 'collaborazioni-pagina':
      contenuto.innerHTML = `
        <h1 class="overlay-titolo">Collaborazioni fotografiche</h1>
        <p class="collab-intro">Lavoro su progetti commerciali ed editoriali in ambiti diversi — architettura, ritratto, still life, reportage aziendale. Ogni collaborazione è un progetto su misura.</p>
        <div class="collab-griglia" id="collab-grid"></div>
        <div style="border-top:1px solid var(--grigio-chiaro);padding-top:40px;">
          <p style="font-size:13px;font-weight:300;color:var(--grigio-testo);margin-bottom:20px;">Per collaborazioni e commissioni:</p>
          <a href="mailto:info@francescomartolini.art" class="section-link">info@francescomartolini.art →</a>
        </div>
      `;
      overlay.classList.add('aperta');
      overlay.scrollTop = 0;
      // Placeholder collaborazioni (da riempire con dati reali)
      const grid = $('collab-grid');
      if (grid) {
        stato.collaborazioni.forEach(v => {
          const item = crea('div'); item.className = 'collab-item';
          item.innerHTML = `
            <div class="collab-img"></div>
            <p class="collab-cliente">${v.titolo}</p>
            <p class="collab-anno">${v.anno}</p>
          `;
          item.querySelector('.collab-img').appendChild(creaImg(v.foto, v.titolo));
          grid.appendChild(item);
        });
      }
      break;
  }
}

function chiudiPagina() {
  $('overlay-pagina').classList.remove('aperta');
}

// ── Progetto dettaglio ──
const _cacheProgetti = {};

function apriProgetto(id) {
  const pr = stato.progetti.find(p => p.id === id);
  if (!pr) return;

  const el = $('pagina-progetto');
  const interno = el.querySelector('.progetto-interno');

  // Costruisce una sola volta, poi riusa
  if (!_cacheProgetti[id]) {
    const linkEsterno = pr.link_esterno
      ? `<a class="link-esterno-btn" href="${pr.link_esterno}" target="_blank" rel="noopener">Vedi online</a>` : '';

    const mappaHTML = pr.mappa ? `
      <div class="progetto-mappa-wrap">
        <p class="progetto-mappa-label">${pr.mappa.label || 'Luogo'}</p>
        <iframe class="progetto-mappa"
          src="https://maps.google.com/maps?q=${pr.mappa.lat},${pr.mappa.lng}&z=${pr.mappa.zoom||13}&output=embed"
          allowfullscreen loading="lazy"></iframe>
      </div>` : '';

    const galleriaHTML = pr.galleria.map(src =>
      `<div class="progetto-galleria-img">
        <img src="${src}" alt="${pr.titolo}" draggable="false"
          loading="lazy" oncontextmenu="return false">
      </div>`
    ).join('');

    _cacheProgetti[id] = `
      <button class="progetto-torna" onclick="chiudiProgetto()">Torna</button>
      <div class="progetto-interno-header">
        <div><h1 class="progetto-interno-titolo">${pr.titolo}</h1>
        <p class="progetto-interno-anno">${pr.anno}</p></div>
        <div class="progetto-interno-azioni">${linkEsterno}</div>
      </div>
      <p class="progetto-interno-testo">${pr.testo_lungo}</p>
      ${mappaHTML}
      <div class="progetto-galleria">${galleriaHTML}</div>
    `;
  }

  interno.innerHTML = _cacheProgetti[id];

  // Aggiunge listener lightbox sulle immagini appena inserite
  interno.querySelectorAll('.progetto-galleria-img img').forEach(img => {
    img.addEventListener('click', () => {
      if (!isMobile()) apriLightbox(img.src, img.alt);
    });
  });

  el.classList.add('aperta');
  el.scrollTop = 0;
}

function chiudiProgetto() { $('pagina-progetto').classList.remove('aperta'); }

// ── Taccuino archivio ──
function apriTaccuino() {
  const el = $('pagina-taccuino-archivio');
  const interno = el.querySelector('.taccuino-archivio-interno');

  const voci = stato.taccuino.map(v => {
    const foto = v.foto ? `<div class="taccuino-voce-foto"><img src="${v.foto}" alt="" draggable="false"></div>` : '';
    return `<div class="taccuino-voce" data-testo="${v.testo.toLowerCase()}">${foto}<p class="taccuino-voce-frase">${v.testo}</p><p class="taccuino-voce-data">${formatData(v.data)}</p></div>`;
  }).join('');

  interno.innerHTML = `
    <button class="progetto-torna" onclick="chiudiTaccuino()">Chiudi</button>
    <h1>Taccuino</h1>
    <div class="taccuino-cerca-wrap">
      <input type="search" id="taccuino-cerca" class="taccuino-cerca" placeholder="Cerca nel taccuino..." autocomplete="off" spellcheck="false">
      <span id="taccuino-risultati" class="taccuino-risultati"></span>
    </div>
    <div id="taccuino-lista">${voci}</div>
  `;

  const input = $('taccuino-cerca'), lista = $('taccuino-lista'), risultati = $('taccuino-risultati');
  input.addEventListener('input', () => {
    const q = input.value.toLowerCase().trim(); let vis = 0;
    lista.querySelectorAll('.taccuino-voce').forEach(v => {
      const match = !q || v.dataset.testo.includes(q);
      v.style.display = match ? '' : 'none'; if (match) vis++;
    });
    risultati.textContent = q ? `${vis} risultat${vis === 1 ? 'o' : 'i'}` : '';
  });

  setTimeout(() => input.focus(), 300);
  el.classList.add('aperta'); el.scrollTop = 0;
}

function chiudiTaccuino() { $('pagina-taccuino-archivio').classList.remove('aperta'); }

// ════════════════════════════════
// MOBILE — Costruisci pagine
// ════════════════════════════════
function costruisciMobile() {
  // Taccuino prima frase
  const taccuinoFrase = $('taccuino-mobile-frase');
  if (taccuinoFrase && stato.taccuino[0]) {
    taccuinoFrase.innerHTML = `<p class="taccuino-frase">${stato.taccuino[0].testo}</p><p class="taccuino-data">${formatData(stato.taccuino[0].data)}</p>`;
  }

  const containerProgetti = $('mobile-progetti-container');
  let tIdx = 0;

  stato.progetti.forEach(pr => {
    const p = crea('div'); p.className = 'page pagina-progetto-mobile';
    p.dataset.favicon = pr.titolo[0].toUpperCase(); p.dataset.titolo = pr.titolo;

    const wrap = crea('div'); wrap.className = 'progetto-mobile-wrap';
    const imgDiv = crea('div'); imgDiv.className = 'progetto-mobile-img';
    imgDiv.appendChild(creaImg(pr.immagine_copertina, pr.titolo));

    const testo = crea('div'); testo.className = 'progetto-mobile-testo';
    const linkEsterno = pr.link_esterno ? `<a class="link-esterno-btn" href="${pr.link_esterno}" target="_blank" rel="noopener" style="pointer-events:all;">Vedi online</a>` : '';
    testo.innerHTML = `<p class="progetto-anno">${pr.anno}</p><h2 class="progetto-titolo">${pr.titolo}</h2><button class="link-progetto" data-id="${pr.id}" style="pointer-events:all;">Entra nel progetto</button>${linkEsterno}`;
    testo.querySelector('.link-progetto').addEventListener('click', () => apriProgetto(pr.id));

    wrap.appendChild(imgDiv); wrap.appendChild(testo); p.appendChild(wrap);
    containerProgetti.appendChild(p);

    if (stato.taccuino[tIdx]) {
      const v = stato.taccuino[tIdx++];
      const pt = crea('div'); pt.className = 'page pagina-progetto-mobile';
      pt.dataset.favicon = 'T'; pt.dataset.titolo = 'Taccuino';
      const mpc = crea('div'); mpc.className = 'mobile-page-content';
      const ph = crea('div'); ph.className = 'pagina-header';
      ph.innerHTML = `<div class="data-ora"><div class="data-live"></div><div class="ora-live"></div><div class="ora-label">ORA CORRENTE</div></div>`;
      const pc = crea('div'); pc.className = 'pagina-corpo';
      const tw = crea('div'); tw.className = 'taccuino-wrap';
      if (v.foto) { const fw = crea('div'); fw.className = 'taccuino-foto'; const img = crea('img'); img.src = v.foto; img.alt = ''; img.draggable = false; fw.appendChild(img); tw.appendChild(fw); }
      tw.innerHTML += `<p class="taccuino-frase">${v.testo}</p><p class="taccuino-data">${formatData(v.data)}</p>`;
      pc.appendChild(tw); mpc.appendChild(ph); mpc.appendChild(pc); pt.appendChild(mpc);
      containerProgetti.appendChild(pt);
    }
  });

  const containerIntervalli = $('mobile-intervalli-container');
  stato.intervalli.forEach(iv => {
    const p = crea('div'); p.className = 'page pagina-progetto-mobile';
    p.dataset.favicon = 'I'; p.dataset.titolo = iv.titolo;
    const mpc = crea('div'); mpc.className = 'mobile-page-content';
    const ph = crea('div'); ph.className = 'pagina-header';
    ph.innerHTML = `<div class="data-ora"><div class="data-live"></div><div class="ora-live"></div><div class="ora-label">ORA CORRENTE</div></div>`;
    const pc = crea('div'); pc.className = 'pagina-corpo';
    const wrap = crea('div'); wrap.style.cssText = 'width:100%;max-width:680px;';
    wrap.innerHTML = `<p class="capitolo-label">Studi</p><h2 class="capitolo-titolo" style="margin-bottom:6px;">${iv.titolo}</h2><p class="capitolo-descrizione" style="margin-bottom:14px;">${iv.descrizione}</p>`;
    const gr = crea('div'); gr.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:8px;';
    iv.immagini.forEach((src, i) => { const cell = crea('div'); cell.style.cssText = 'aspect-ratio:2/3;background:var(--grigio-chiaro);overflow:hidden;'; cell.appendChild(creaImg(src, `${iv.titolo} ${i+1}`)); gr.appendChild(cell); });
    wrap.appendChild(gr); pc.appendChild(wrap); mpc.appendChild(ph); mpc.appendChild(pc); p.appendChild(mpc);
    containerIntervalli.appendChild(p);

    if (stato.taccuino[tIdx]) {
      const v = stato.taccuino[tIdx++];
      const pt = crea('div'); pt.className = 'page pagina-progetto-mobile';
      pt.dataset.favicon = 'T'; pt.dataset.titolo = 'Taccuino';
      const mpc2 = crea('div'); mpc2.className = 'mobile-page-content';
      const ph2 = crea('div'); ph2.className = 'pagina-header';
      ph2.innerHTML = `<div class="data-ora"><div class="data-live"></div><div class="ora-live"></div><div class="ora-label">ORA CORRENTE</div></div>`;
      const pc2 = crea('div'); pc2.className = 'pagina-corpo';
      pc2.innerHTML = `<div class="taccuino-wrap"><p class="taccuino-frase">${v.testo}</p><p class="taccuino-data">${formatData(v.data)}</p></div>`;
      mpc2.appendChild(ph2); mpc2.appendChild(pc2); pt.appendChild(mpc2);
      containerIntervalli.appendChild(pt);
    }
  });

  raccogliPagine();
}

function raccogliPagine() {
  const tutte = document.querySelectorAll('.page, .pagina-progetto-mobile');
  stato.totPagine = tutte.length;
  costruisciIndicatore(tutte.length);
}

function costruisciIndicatore(tot) {
  const ind = $('indicatore'); if (!ind) return;
  ind.innerHTML = '';
  for (let i = 0; i < tot; i++) {
    const dot = crea('div'); dot.className = 'indicatore-dot' + (i === 0 ? ' attivo' : '');
    dot.addEventListener('click', () => navigaA(i)); ind.appendChild(dot);
  }
}

// ── Nav mobile ──
function navigaA(idx) {
  if (!isMobile()) return;
  if (stato.inTransizione || idx < 0 || idx >= stato.totPagine || idx === stato.paginaCorrente) return;

  stato.inTransizione = true;
  const pagine = document.querySelectorAll('.page, .pagina-progetto-mobile');
  pagine[stato.paginaCorrente].classList.remove('attiva');
  pagine[stato.paginaCorrente].classList.add('uscita-sinistra');
  setTimeout(() => pagine[stato.paginaCorrente]?.classList.remove('uscita-sinistra'), 450);
  stato.paginaCorrente = idx;
  pagine[idx].classList.add('attiva');
  aggiornaUI();
  setTimeout(() => { stato.inTransizione = false; }, 450);
}

function paginaSuccessiva() { navigaA(stato.paginaCorrente + 1); }
function paginaPrecedente() { navigaA(stato.paginaCorrente - 1); }

function aggiornaUI() {
  if (!isMobile()) return;
  const pagine = document.querySelectorAll('.page, .pagina-progetto-mobile');
  const pCorrente = pagine[stato.paginaCorrente];
  document.querySelectorAll('.indicatore-dot').forEach((d, i) => d.classList.toggle('attivo', i === stato.paginaCorrente));
  const elNum = $('numero-nav');
  if (elNum) elNum.textContent = `${formatNum(stato.paginaCorrente + 1)} / ${formatNum(stato.totPagine)}`;
  const sx = $('freccia-sx'), dx = $('freccia-dx');
  const isUltima = stato.paginaCorrente === stato.totPagine - 1;
  if (sx) sx.toggleAttribute('disabled', stato.paginaCorrente === 0);
  if (dx) { dx.style.display = isUltima ? 'none' : ''; dx.toggleAttribute('disabled', isUltima); }
  let tornaBtn = $('torna-inizio-nav');
  if (isUltima) {
    if (!tornaBtn) { tornaBtn = crea('button'); tornaBtn.id = 'torna-inizio-nav'; tornaBtn.textContent = '← Inizio'; tornaBtn.addEventListener('click', () => navigaA(0)); $('mobile-nav').appendChild(tornaBtn); }
    tornaBtn.style.display = '';
  } else { if (tornaBtn) tornaBtn.style.display = 'none'; }
  if (pCorrente) {
    aggiorneFavicon(pCorrente.dataset.favicon || 'f');
    document.title = `${pCorrente.dataset.titolo || 'Francesco Martolini .art'} — Francesco Martolini .art`;
  }
}

// ── Tema ──
function avviaTema() {
  if (localStorage.getItem('tema') === 'scuro') document.body.classList.add('tema-scuro');
  $('tema-toggle')?.addEventListener('click', () => {
    document.body.classList.toggle('tema-scuro');
    localStorage.setItem('tema', document.body.classList.contains('tema-scuro') ? 'scuro' : 'chiaro');
  });
}

// ── Cookie ──
function avviaCookie() {
  if (localStorage.getItem('cookie-consenso')) return;
  const banner = $('cookie-banner');
  setTimeout(() => banner?.classList.add('visibile'), 1400);
  $('cookie-accetta')?.addEventListener('click', () => { localStorage.setItem('cookie-consenso', '1'); banner.classList.remove('visibile'); });
  $('cookie-rifiuta')?.addEventListener('click', () => { localStorage.setItem('cookie-consenso', '0'); banner.classList.remove('visibile'); });
}

// ── Protezione ──
function protezioneImmagini() {
  document.addEventListener('contextmenu', e => { if (e.target.tagName === 'IMG') e.preventDefault(); });
  document.addEventListener('dragstart', e => { if (e.target.tagName === 'IMG') e.preventDefault(); });
  document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && ['s','u','p'].includes(e.key)) e.preventDefault(); });

    // Lightbox globale su desktop
  document.addEventListener('click', e => {
    if (isMobile()) return;
    const img = e.target.closest('img');
    if (!img) return;
    // Escludi immagini di interfaccia (copertine card, hero)
    if (img.closest('#lightbox')) return;
    if (img.closest('.progetto-card-img')) return;
    if (img.closest('.hero-immagine')) return;
    if (img.closest('.tutti-card-img')) return;
    if (img.closest('.chi-sono-desktop-img')) return;
    const src = img.src;
    const alt = img.alt || '';
    if (src) apriLightbox(src, alt);
  });
}

// ── Input ──
function gestisciTastiera(e) {
  if (!isMobile()) return;
  if ($('pagina-progetto').classList.contains('aperta')) { if (e.key === 'Escape') chiudiProgetto(); return; }
  if ($('pagina-taccuino-archivio').classList.contains('aperta')) { if (e.key === 'Escape') chiudiTaccuino(); return; }
  if ($('overlay-pagina').classList.contains('aperta')) { if (e.key === 'Escape') chiudiPagina(); return; }
  const isUltima = stato.paginaCorrente === stato.totPagine - 1;
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') paginaSuccessiva();
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { if (isUltima) navigaA(0); else paginaPrecedente(); }
}

let tx = 0, ty = 0;
function gestisciTouchStart(e) { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }
function gestisciTouchEnd(e) {
  if (!isMobile()) return;
  if ($('pagina-progetto').classList.contains('aperta')) return;
  if ($('pagina-taccuino-archivio').classList.contains('aperta')) return;
  const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
  if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
    const isUltima = stato.paginaCorrente === stato.totPagine - 1;
    if (dx < 0) paginaSuccessiva();
    else if (isUltima) navigaA(0);
    else paginaPrecedente();
  }
}

function gestisciTap(e) {
  if (!isMobile()) return;
  if ($('pagina-progetto').classList.contains('aperta')) return;
  if ($('pagina-taccuino-archivio').classList.contains('aperta')) return;
  if (e.target.closest('button, a, input')) return;
  const x = e.clientX, w = window.innerWidth;
  if (x > w * 0.65) paginaSuccessiva();
  else if (x < w * 0.35) paginaPrecedente();
}

// ── Scroll desktop ──
function inizializzaScrollDesktop() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      if (isMobile()) return;
      const target = document.querySelector(a.getAttribute('href'));
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
    });
  });
}

function apriLightbox(src, alt) {
  let lb = $('lightbox');
  if (!lb) {
    lb = crea('div'); lb.id = 'lightbox';
    lb.innerHTML = `
      <div id="lightbox-overlay"></div>
      <div id="lightbox-wrap">
        <img id="lightbox-img" src="" alt="">
        <button id="lightbox-chiudi">
          <svg viewBox="0 0 24 24" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    `;
    document.body.appendChild(lb);
    $('lightbox-overlay').addEventListener('click', chiudiLightbox);
    $('lightbox-chiudi').addEventListener('click', chiudiLightbox);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') chiudiLightbox(); });
  }
  $('lightbox-img').src = src;
  $('lightbox-img').alt = alt || '';
  lb.classList.add('aperto');
  document.body.style.overflow = 'hidden';
}

function chiudiLightbox() {
  $('lightbox')?.classList.remove('aperto');
  document.body.style.overflow = '';
}

// ── Esponi globali ──
window.navigaA = navigaA;
window.chiudiProgetto = chiudiProgetto;
window.chiudiTaccuino = chiudiTaccuino;
window.apriTaccuino = apriTaccuino;
window.apriPagina = apriPagina;
window.chiudiPagina = chiudiPagina;
window.apriLightbox = apriLightbox;
window.chiudiLightbox = chiudiLightbox;

// ── Init ──
async function init() {
  protezioneImmagini();
  await caricaDati();

  if (isMobile()) {
    costruisciMobile();
    document.querySelector('.page')?.classList.add('attiva');
    aggiornaUI();
    document.addEventListener('keydown', gestisciTastiera);
    document.addEventListener('touchstart', gestisciTouchStart, { passive: true });
    document.addEventListener('touchend', gestisciTouchEnd, { passive: true });
    document.addEventListener('click', gestisciTap);
    $('freccia-sx')?.addEventListener('click', paginaPrecedente);
    $('freccia-dx')?.addEventListener('click', paginaSuccessiva);
    $('freccia-sx')?.setAttribute('disabled', '');
  } else {
    popolaDesktop();
    inizializzaScrollDesktop();
    avviaOrologioSticky();
  }

  avviaOrologio();
  avviaTema();
  avviaCookie();
  avviaCursore();
}

document.addEventListener('DOMContentLoaded', init);
