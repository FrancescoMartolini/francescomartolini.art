/* ============================================
   LIBRO ENGINE v3 — Francesco Martolini .art
   Layout: header / libro / footer
   Favicon dinamica, tema scuro, Google Sheets
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
  mappaLettera: [],
  intro: {}
};

const $ = id => document.getElementById(id);
const crea = tag => document.createElement(tag);

function formatData(s) {
  if (!s) return '';
  const d = new Date(s);
  if (isNaN(d)) return s;
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatNum(n) {
  return String(n).padStart(2, '0');
}

// ── Favicon dinamica ──
function aggiorneFavicon(lettera) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
    <rect width="32" height="32" fill="#0a0a0a" rx="6"/>
    <text x="16" y="24" font-family="Georgia,serif" font-size="20" font-style="italic"
      fill="#fafaf8" text-anchor="middle">${lettera}</text>
  </svg>`;

  const encoded = 'data:image/svg+xml,' + encodeURIComponent(svg);
  let link = document.querySelector("link[rel='icon']");
  if (!link) {
    link = crea('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = encoded;
}

// ── Google Sheets CSV parser ──
function parseCsv(csv) {
  return csv.trim().split('\n').slice(1).map((riga, i) => {
    const celle = [];
    let inQ = false, cell = '';
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
  const [progetti, intervalli, intro] = await Promise.all([
    fetch('json/progetti.json').then(r => r.json()),
    fetch('json/intervalli.json').then(r => r.json()),
    fetch('json/intro.json').then(r => r.json())
  ]);
  stato.progetti = progetti;
  stato.intervalli = intervalli;
  stato.intro = intro;

  try {
    const r = await fetch(SHEETS_URL);
    if (!r.ok) throw new Error();
    const csv = await r.text();
    stato.taccuino = parseCsv(csv).sort((a, b) => new Date(b.data) - new Date(a.data));
  } catch {
    try {
      const r = await fetch('json/taccuino.json');
      stato.taccuino = (await r.json()).sort((a, b) => new Date(b.data) - new Date(a.data));
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
  tick();
  setInterval(tick, 1000);
}

// ── Immagine protetta ──
function creaImg(src, alt) {
  const wrap = crea('div');
  wrap.style.cssText = 'width:100%;height:100%;overflow:hidden;position:relative;background:var(--grigio-chiaro);';
  if (src) {
    const img = crea('img');
    img.src = src; img.alt = alt || '';
    img.draggable = false;
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;pointer-events:none;-webkit-user-drag:none;';
    img.onerror = () => { img.remove(); wrap.style.cssText += 'display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--grigio-medio);'; wrap.textContent = alt || ''; };
    const overlay = crea('div');
    overlay.style.cssText = 'position:absolute;inset:0;z-index:1;';
    wrap.appendChild(img);
    wrap.appendChild(overlay);
  } else {
    wrap.style.cssText += 'display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--grigio-medio);';
    wrap.textContent = alt || '';
  }
  return wrap;
}

// ── Header pagina (data/ora) ──
function creaHeaderPagina() {
  const h = crea('div');
  h.className = 'pagina-header';
  h.innerHTML = `<div class="data-ora"><div class="data-live"></div><div class="ora-live"></div><div style="font-size:9px;letter-spacing:.15em;text-transform:uppercase;color:var(--grigio-medio);margin-top:2px;">ORA CORRENTE</div></div>`;
  return h;
}

// ── Costruttori pagine ──

function paginaTitolo() {
  const p = crea('div'); p.className = 'pagina';
  p.appendChild(creaHeaderPagina());
  const corpo = crea('div'); corpo.className = 'pagina-corpo';
  corpo.innerHTML = `<div><p class="capitolo-label">Francesco Martolini</p><h1 class="titolo-principale">Il tempo<br>lascia tracce.<br><em>Io le cerco.</em></h1></div>`;
  p.appendChild(corpo);
  p.dataset.favicon = 'H'; p.dataset.titolo = 'Home';
  return p;
}

// ── Pagina introduttiva ──
function paginaIntroduzione() {
  const p = crea('div'); p.className = 'pagina';
  p.appendChild(creaHeaderPagina());
  const corpo = crea('div'); corpo.className = 'pagina-corpo';
  corpo.innerHTML = `
    <div class="introduzione-wrap">
      <p class="introduzione-occhiello">Introduzione</p>
      <p class="introduzione-testo">${stato.intro.testo.replace(/\n/g, '<br>')}</p>
      <p class="introduzione-firma">${stato.intro.firma}<br><span>${stato.intro.anno}</span></p>
    </div>
  `;
  p.appendChild(corpo);
  p.dataset.favicon = '∙';
  p.dataset.titolo = 'Introduzione';
  return p;
}

function paginaCapitolo(label, titolo, desc, favicon, titoloTab) {
  const p = crea('div'); p.className = 'pagina';
  p.appendChild(creaHeaderPagina());
  const corpo = crea('div'); corpo.className = 'pagina-corpo';
  corpo.innerHTML = `<div><p class="capitolo-label">${label}</p><h2 class="capitolo-titolo">${titolo}</h2><p class="capitolo-descrizione">${desc}</p></div>`;
  p.appendChild(corpo);
  p.dataset.favicon = favicon || titolo[0].toUpperCase();
  p.dataset.titolo = titoloTab || titolo;
  return p;
}

function paginaProgetto(progetto) {
  const p = crea('div'); p.className = 'pagina';

  const wrap = crea('div'); wrap.className = 'pagina-progetto-wrap';

  const imgWrap = crea('div'); imgWrap.className = 'progetto-immagine';
  imgWrap.appendChild(creaImg(progetto.immagine_copertina, progetto.titolo));

  const testo = crea('div'); testo.className = 'progetto-testo';
  const linkEsterno = progetto.link_esterno
    ? `<a class="link-esterno-btn" href="${progetto.link_esterno}" target="_blank" rel="noopener">Vedi online</a>` : '';
  testo.innerHTML = `
    <p class="progetto-anno">${progetto.anno}</p>
    <h2 class="progetto-titolo">${progetto.titolo}</h2>
    <p class="progetto-desc">${progetto.descrizione}</p>
    <button class="link-progetto" data-id="${progetto.id}">Entra nel progetto</button>
    ${linkEsterno}`;
  testo.querySelector('.link-progetto').addEventListener('click', () => apriProgetto(progetto.id));

  wrap.appendChild(imgWrap);
  wrap.appendChild(testo);
  p.appendChild(wrap);

  p.dataset.favicon = progetto.titolo[0].toUpperCase();
  p.dataset.titolo = progetto.titolo;
  return p;
}

function paginaTaccuino(voce) {
  const p = crea('div'); p.className = 'pagina';
  p.appendChild(creaHeaderPagina());
  const corpo = crea('div'); corpo.className = 'pagina-corpo';
  const wrap = crea('div'); wrap.className = 'taccuino-wrap';
  if (voce.foto) {
    const fw = crea('div'); fw.className = 'taccuino-foto';
    const img = crea('img'); img.src = voce.foto; img.alt = ''; img.draggable = false;
    fw.appendChild(img); wrap.appendChild(fw);
  }
  const frase = crea('p'); frase.className = 'taccuino-frase'; frase.textContent = voce.testo;
  const data = crea('p'); data.className = 'taccuino-data'; data.textContent = formatData(voce.data);
  wrap.appendChild(frase); wrap.appendChild(data);
  corpo.appendChild(wrap); p.appendChild(corpo);
  p.dataset.favicon = 'T'; p.dataset.titolo = 'Taccuino';
  return p;
}

function paginaIntervallo(iv) {
  const p = crea('div'); p.className = 'pagina';
  p.appendChild(creaHeaderPagina());
  const corpo = crea('div'); corpo.className = 'pagina-corpo';
  const wrap = crea('div'); wrap.style.cssText = 'width:100%;max-width:680px;';
  wrap.innerHTML = `<p class="capitolo-label">Intervalli</p><h2 class="capitolo-titolo" style="margin-bottom:6px;">${iv.titolo}</h2><p class="capitolo-descrizione" style="margin-bottom:18px;">${iv.descrizione}</p>`;
  const griglia = crea('div'); griglia.className = 'intervalli-griglia';
  iv.immagini.forEach((src, i) => {
    const cell = crea('div'); cell.className = 'intervallo-img';
    cell.appendChild(creaImg(src, `${iv.titolo} ${i+1}`));
    griglia.appendChild(cell);
  });
  wrap.appendChild(griglia); corpo.appendChild(wrap); p.appendChild(corpo);
  p.dataset.favicon = 'I'; p.dataset.titolo = 'Intervalli';
  return p;
}

function paginaChiSono() {
  const p = crea('div'); p.className = 'pagina';
  p.appendChild(creaHeaderPagina());
  const corpo = crea('div'); corpo.className = 'pagina-corpo';
  corpo.innerHTML = `
    <div class="chi-sono-wrap">
      <div class="chi-sono-testo">
        <h2>Un ritratto essenziale.<br><em>Parole e immagini<br>che raccontano il percorso.</em></h2>
        <p>Francesco Martolini è un fotografo italiano. Il suo lavoro esplora il rapporto tra spazio, tempo e memoria — cercando nelle immagini le tracce di ciò che resta.</p>
        <p>Basato tra Roma e Milano, lavora su progetti a lungo termine e commissioni selezionate.</p>
      </div>
      <div class="chi-sono-contatti">
        <p class="contatti-label">Contatti</p>
        <p class="contatti-nota">Non offro servizi di shooting su richiesta. Scrivimi se sei interessato a un'opera o se vuoi costruire qualcosa insieme.</p>
        <a class="contatto-btn" href="mailto:info@francescomartolini.art">
          <svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/></svg>
          info@francescomartolini.art
        </a>
        <a class="contatto-btn" href="https://instagram.com/francescomartolini" target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>
          @francesco_martolini_ph
        </a>
        <a class="contatto-btn" href="tel:+393930336642">
          <svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.09 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7a2 2 0 011.72 2.03z"/></svg>
          +39 3930336642
        </a>
      </div>
    </div>`;
  p.appendChild(corpo);
  p.dataset.favicon = 'C'; p.dataset.titolo = 'Chi sono';
  return p;
}

function paginaCommerciali() {
  const p = crea('div'); p.className = 'pagina';
  p.appendChild(creaHeaderPagina());
  const corpo = crea('div'); corpo.className = 'pagina-corpo';
  const wrap = crea('div'); wrap.style.cssText = 'width:100%;max-width:560px;';
  wrap.innerHTML = `<p class="capitolo-label">Fotografie commerciali</p><h2 class="capitolo-titolo" style="margin-bottom:18px;">Commissioni<br>selezionate</h2>`;
  const griglia = crea('div'); griglia.className = 'commerciale-griglia';
  for (let i = 0; i < 4; i++) {
    const cell = crea('div'); cell.className = 'commerciale-img';
    cell.appendChild(creaImg(null, `commerciale ${i+1}`));
    griglia.appendChild(cell);
  }
  wrap.appendChild(griglia); corpo.appendChild(wrap); p.appendChild(corpo);
  p.dataset.favicon = 'F'; p.dataset.titolo = 'Fotografie commerciali';
  return p;
}

function paginaFin() {
  const p = crea('div'); p.className = 'pagina';
  p.appendChild(creaHeaderPagina());
  const corpo = crea('div'); corpo.className = 'pagina-corpo';
  corpo.innerHTML = `<div class="fin-wrap"><p class="fin-titolo">fin.</p><button class="fin-link" onclick="navigaA(0)">← Torna all'inizio</button></div>`;
  p.appendChild(corpo);
  p.dataset.favicon = '·'; p.dataset.titolo = 'Fine';
  return p;
}

// ── Costruisci libro ──
function costruisciLibro() {
  const libro = $('libro');
  const pagine = [];

  pagine.push(paginaTitolo());
  pagine.push(paginaCapitolo('Capitolo 01', 'Progetti', 'I progetti principali. Un capitolo che racconta il lavoro attraverso serie fotografiche.', 'P', 'Progetti'));

  let tIdx = 0;
  stato.progetti.forEach(pr => {
    pagine.push(paginaProgetto(pr));
    if (stato.taccuino[tIdx]) pagine.push(paginaTaccuino(stato.taccuino[tIdx++]));
  });

  pagine.push(paginaCapitolo('Capitolo 02', 'Intervalli', 'Appunti visivi. Provini. Sequenze brevi.', 'I', 'Intervalli'));
  stato.intervalli.forEach(iv => {
    pagine.push(paginaIntervallo(iv));
    if (stato.taccuino[tIdx]) pagine.push(paginaTaccuino(stato.taccuino[tIdx++]));
  });

  pagine.push(paginaChiSono());
  pagine.push(paginaCommerciali());
  while (stato.taccuino[tIdx]) pagine.push(paginaTaccuino(stato.taccuino[tIdx++]));
  pagine.push(paginaFin());

  pagine.forEach(p => libro.appendChild(p));
  stato.totPagine = pagine.length;
  costruisciIndicatore(pagine.length);
}

// ── Indicatore ──
function costruisciIndicatore(tot) {
  const ind = $('indicatore');
  ind.innerHTML = '';
  for (let i = 0; i < tot; i++) {
    const dot = crea('div');
    dot.className = 'indicatore-dot' + (i === 0 ? ' attivo' : '');
    dot.addEventListener('click', () => navigaA(i));
    ind.appendChild(dot);
  }
}

// ── Navigazione ──
function navigaA(idx) {
  if (stato.inTransizione) return;
  if (idx < 0 || idx >= stato.totPagine) return;
  if (idx === stato.paginaCorrente) return;

  stato.inTransizione = true;
  const pagine = document.querySelectorAll('.pagina');

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
  const pagine = document.querySelectorAll('.pagina');
  const pCorrente = pagine[stato.paginaCorrente];

  // Indicatore
  document.querySelectorAll('.indicatore-dot').forEach((d, i) => d.classList.toggle('attivo', i === stato.paginaCorrente));

  // Numero footer
  const elNum = $('numero-nav');
  if (elNum) elNum.textContent = formatNum(stato.paginaCorrente + 1);

  // Frecce
  const sx = $('freccia-sx'), dx = $('freccia-dx');
  const isUltima = stato.paginaCorrente === stato.totPagine - 1;
  if (sx) sx.toggleAttribute('disabled', stato.paginaCorrente === 0);
  if (dx) { dx.style.display = isUltima ? 'none' : ''; dx.toggleAttribute('disabled', isUltima); }

  // Torna inizio sull'ultima
  let tornaBtn = $('torna-inizio-nav');
  if (isUltima) {
    if (!tornaBtn) {
      tornaBtn = crea('button'); tornaBtn.id = 'torna-inizio-nav'; tornaBtn.className = 'freccia';
      tornaBtn.textContent = 'Inizio';
      tornaBtn.addEventListener('click', () => navigaA(0));
      $('site-footer').appendChild(tornaBtn);
    }
    tornaBtn.style.display = '';
  } else {
    if (tornaBtn) tornaBtn.style.display = 'none';
  }

  // Favicon dinamica + titolo tab
  if (pCorrente) {
    const lettera = pCorrente.dataset.favicon || 'f';
    const titoloTab = pCorrente.dataset.titolo || 'Francesco Martolini .art';
    aggiorneFavicon(lettera);
    document.title = `${titoloTab} — Francesco Martolini .art`;
  }
}

// ── Navigazione da menu ──
function navigaAlCapitolo(nome) {
  const mappa = {
    'progetti':    ['capitolo 01', 'progetti'],
    'intervalli':  ['capitolo 02', 'intervalli'],
    'chi sono':    ['chi sono', 'ritratto'],
    'commerciali': ['commerciali', 'fotografie'],
  };
  const termini = mappa[nome.toLowerCase()] || [nome.toLowerCase()];
  const pagine = document.querySelectorAll('.pagina');
  let target = 0;
  pagine.forEach((p, i) => {
    const t = [
      p.querySelector('.capitolo-label')?.textContent || '',
      p.querySelector('.capitolo-titolo')?.textContent || '',
      p.querySelector('.chi-sono-testo') ? 'chi sono ritratto' : '',
      p.querySelector('.commerciale-griglia') ? 'fotografie commerciali' : '',
    ].join(' ').toLowerCase();
    if (termini.some(k => t.includes(k))) target = i;
  });
  navigaA(target);
}

function toggleTranslate() {
  const sel = document.querySelector('#google_translate_element select');
  if (!sel) return;
  const corrente = sel.value;
  sel.value = corrente === 'en' ? 'it' : 'en';
  sel.dispatchEvent(new Event('change'));
}

// ── Progetto interno ──
function apriProgetto(id) {
  const pr = stato.progetti.find(p => p.id === id);
  if (!pr) return;

  const el = $('pagina-progetto');
  const interno = el.querySelector('.progetto-interno');

  const linkEsterno = pr.link_esterno
    ? `<a class="link-esterno-btn" href="${pr.link_esterno}" target="_blank" rel="noopener">Vedi online</a>` : '';

  const mappaHTML = pr.mappa ? `
    <div class="progetto-mappa-wrap">
      <p class="progetto-mappa-label">${pr.mappa.label || 'Luogo'}</p>
      <iframe class="progetto-mappa"
        src="https://maps.google.com/maps?q=${pr.mappa.lat},${pr.mappa.lng}&z=${pr.mappa.zoom||13}&output=embed"
        allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
    </div>` : '';

  const galleriaHTML = pr.galleria.map(src =>
    `<div class="progetto-galleria-img"><img src="${src}" alt="${pr.titolo}" draggable="false" oncontextmenu="return false"></div>`
  ).join('');

  interno.innerHTML = `
    <button class="progetto-torna" onclick="chiudiProgetto()">Torna al libro</button>
    <div class="progetto-interno-header">
      <div>
        <h1 class="progetto-interno-titolo">${pr.titolo}</h1>
        <p class="progetto-interno-anno">${pr.anno}</p>
      </div>
      <div class="progetto-interno-azioni">${linkEsterno}</div>
    </div>
    <p class="progetto-interno-testo">${pr.testo_lungo}</p>
    ${mappaHTML}
    <div class="progetto-galleria">${galleriaHTML}</div>`;

  el.classList.add('aperta');
  el.scrollTop = 0;
}

function chiudiProgetto() { $('pagina-progetto').classList.remove('aperta'); }

// ── Archivio taccuino ──
function apriTaccuino() {
  const el = $('pagina-taccuino-archivio');
  const interno = el.querySelector('.taccuino-archivio-interno');

  const vociHTML = stato.taccuino.map(v => {
    const foto = v.foto
      ? `<div class="taccuino-voce-foto"><img src="${v.foto}" alt="" draggable="false" oncontextmenu="return false"></div>`
      : '';
    return `
      <div class="taccuino-voce" data-testo="${v.testo.toLowerCase()}">
        ${foto}
        <p class="taccuino-voce-frase">${v.testo}</p>
        <p class="taccuino-voce-data">${formatData(v.data)}</p>
      </div>`;
  }).join('');

  interno.innerHTML = `
    <button class="progetto-torna" onclick="chiudiTaccuino()">Chiudi</button>
    <h1>Taccuino</h1>

    <div class="taccuino-cerca-wrap">
      <input
        type="search"
        id="taccuino-cerca"
        class="taccuino-cerca"
        placeholder="Cerca nel taccuino..."
        autocomplete="off"
        spellcheck="false"
      >
      <span id="taccuino-risultati" class="taccuino-risultati"></span>
    </div>

    <div id="taccuino-lista">
      ${vociHTML}
    </div>
  `;

  // Ricerca in tempo reale
  const input = $('taccuino-cerca');
  const lista = $('taccuino-lista');
  const risultati = $('taccuino-risultati');

  input.addEventListener('input', () => {
    const query = input.value.toLowerCase().trim();
    const voci = lista.querySelectorAll('.taccuino-voce');
    let visibili = 0;

    voci.forEach(voce => {
      const match = !query || voce.dataset.testo.includes(query);
      voce.style.display = match ? '' : 'none';
      if (match) visibili++;
    });

    risultati.textContent = query
      ? `${visibili} risultat${visibili === 1 ? 'o' : 'i'}`
      : '';
  });

  // Focus automatico sulla barra
  setTimeout(() => input.focus(), 300);

  el.classList.add('aperta');
  el.scrollTop = 0;
}

function chiudiTaccuino() { $('pagina-taccuino-archivio').classList.remove('aperta'); }

// ── Tema scuro ──
function avviaTeam() {
  const saved = localStorage.getItem('tema');
  if (saved === 'scuro') document.body.classList.add('tema-scuro');

  $('tema-toggle').addEventListener('click', () => {
    document.body.classList.toggle('tema-scuro');
    localStorage.setItem('tema', document.body.classList.contains('tema-scuro') ? 'scuro' : 'chiaro');
  });
}

// ── Cookie ──
function avviaCookie() {
  if (localStorage.getItem('cookie-consenso')) return;
  const banner = $('cookie-banner');
  setTimeout(() => banner.classList.add('visibile'), 1200);
  $('cookie-accetta').addEventListener('click', () => { localStorage.setItem('cookie-consenso', '1'); banner.classList.remove('visibile'); });
  $('cookie-rifiuta').addEventListener('click', () => { localStorage.setItem('cookie-consenso', '0'); banner.classList.remove('visibile'); });
}

// ── Protezione immagini ──
function protezioneImmagini() {
  document.addEventListener('contextmenu', e => { if (e.target.tagName === 'IMG') e.preventDefault(); });
  document.addEventListener('dragstart', e => { if (e.target.tagName === 'IMG') e.preventDefault(); });
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && ['s','u','p'].includes(e.key)) e.preventDefault();
  });
}

// ── Tastiera ──
function gestisciTastiera(e) {
  if ($('pagina-progetto').classList.contains('aperta')) { if (e.key === 'Escape') chiudiProgetto(); return; }
  if ($('pagina-taccuino-archivio').classList.contains('aperta')) { if (e.key === 'Escape') chiudiTaccuino(); return; }
  const isUltima = stato.paginaCorrente === stato.totPagine - 1;
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') paginaSuccessiva();
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { if (isUltima) navigaA(0); else paginaPrecedente(); }
}

// ── Touch ──
let tx = 0, ty = 0;
function gestisciTouchStart(e) { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }
function gestisciTouchEnd(e) {
  if ($('pagina-progetto').classList.contains('aperta')) return;
  if ($('pagina-taccuino-archivio').classList.contains('aperta')) return;
  const dx = e.changedTouches[0].clientX - tx;
  const dy = e.changedTouches[0].clientY - ty;
  if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
    const isUltima = stato.paginaCorrente === stato.totPagine - 1;
    if (dx < 0) paginaSuccessiva();
    else if (isUltima) navigaA(0);
    else paginaPrecedente();
  }
}

// ── Scroll ──
let scrollT = null;
function gestisciScroll(e) {
  if ($('pagina-progetto').classList.contains('aperta')) return;
  if ($('pagina-taccuino-archivio').classList.contains('aperta')) return;
  clearTimeout(scrollT);
  scrollT = setTimeout(() => { if (e.deltaY > 0) paginaSuccessiva(); else paginaPrecedente(); }, 50);
}

// ── Cursore ──
function avviaCursore() {
  if (!window.matchMedia('(hover: hover)').matches) return;
  const c = crea('div'); c.id = 'cursore';
  const r = crea('div'); r.id = 'cursore-ring';
  document.body.appendChild(c); document.body.appendChild(r);
  let rx = 0, ry = 0;
  document.addEventListener('mousemove', e => {
    c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px';
    rx += (e.clientX - rx) * 0.12; ry += (e.clientY - ry) * 0.12;
    r.style.left = rx + 'px'; r.style.top = ry + 'px';
  });
}

// ── Esponi globali ──
window.navigaA = navigaA;
window.chiudiProgetto = chiudiProgetto;
window.chiudiTaccuino = chiudiTaccuino;
window.apriTaccuino = apriTaccuino;

// ── Init ──
async function init() {
  protezioneImmagini();
  await caricaDati();
  costruisciLibro();

  document.querySelector('.pagina')?.classList.add('attiva');
  avviaOrologio();
  avviaCookie();
  avviaTeam();
  avviaCursore();

  document.addEventListener('keydown', gestisciTastiera);
  document.addEventListener('touchstart', gestisciTouchStart, { passive: true });
  document.addEventListener('touchend', gestisciTouchEnd, { passive: true });
  document.addEventListener('wheel', gestisciScroll, { passive: true });

  $('freccia-sx').addEventListener('click', paginaPrecedente);
  $('freccia-dx').addEventListener('click', paginaSuccessiva);
  $('freccia-sx').setAttribute('disabled', '');

  document.querySelectorAll('[data-capitolo]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const n = link.dataset.capitolo;
      if (n === 'taccuino') apriTaccuino();
      else navigaAlCapitolo(n);
    });
  });

  document.querySelector('.menu-logo')?.addEventListener('click', () => navigaA(0));
  aggiornaUI();
}

document.addEventListener('DOMContentLoaded', init);
