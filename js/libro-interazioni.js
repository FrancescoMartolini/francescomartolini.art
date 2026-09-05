/* ============================================
   LIBRO ENGINE — interazioni
Gesture (tastiera, touch, tap), lightbox, cursore custom, tema, cookie banner,
protezione immagini, embed Spotify.
Dipende da libro-nucleo.js e libro-routing.js (chiude/apre overlay).
   ============================================ */

'use strict';



// ════════════════════════════════
// CURSORE ADATTIVO
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

// ── Spotify: embed playlist/brano + carosello foto sincronizzato col play ──
let _spotifyAPI = null;
let _spotifyAPIPromise = null;

function caricaSpotifyIframeAPI() {
  if (_spotifyAPIPromise) return _spotifyAPIPromise;
  _spotifyAPIPromise = new Promise(resolve => {
    if (_spotifyAPI) { resolve(_spotifyAPI); return; }
    window.onSpotifyIframeApiReady = IFrameAPI => {
      _spotifyAPI = IFrameAPI;
      resolve(IFrameAPI);
    };
    const script = document.createElement('script');
    script.src = 'https://open.spotify.com/embed/iframe-api/v1';
    script.async = true;
    document.body.appendChild(script);
  });
  return _spotifyAPIPromise;
}

function avviaSpotifySections(overlayEl) {
  const holders = overlayEl.querySelectorAll('.spotify-embed-holder');
  if (!holders.length) return;

  caricaSpotifyIframeAPI().then(IFrameAPI => {
    holders.forEach(holder => {
      if (holder.dataset.spotifyInit === '1') return; // già inizializzato
      holder.dataset.spotifyInit = '1';

      const playlistId = holder.dataset.spotifyPlaylist;
      const wrap = holder.closest('.section-spotify');
      const carosello = wrap.querySelector('.spotify-carosello');
      const img = wrap.querySelector('.spotify-carosello-img');

      let tracce = [];
      try { tracce = JSON.parse(wrap.dataset.tracks || '[]'); } catch (e) { tracce = []; }
      const mappaFoto = {};
      tracce.forEach(tr => { if (tr && tr.uri) mappaFoto[tr.uri] = tr.image; });

      const options = { uri: `spotify:playlist:${playlistId}`, width: '100%', height: 352 };

      IFrameAPI.createController(holder, options, controller => {
        let uriCorrente = null;

        controller.addListener('playback_update', e => {
          const { isPaused, playingURI } = e.data || {};
          if (!playingURI || isPaused) return; // niente foto finché non parte un play

          if (playingURI === uriCorrente) return; // stesso brano, nessun cambio
          uriCorrente = playingURI;

          const src = mappaFoto[playingURI];
          if (!src) { carosello.hidden = true; return; }

          img.classList.remove('visibile');
          setTimeout(() => {
            img.src = src;
            carosello.hidden = false;
            requestAnimationFrame(() => img.classList.add('visibile'));
          }, 180);
        });
      });
    });
  });
}

// ── Tema ──
function avviaTema() {
  if (localStorage.getItem('tema') === 'scuro') document.body.classList.add('tema-scuro');
  // Delegation: copre sia il bottone desktop (#tema-toggle) sia tutte le
  // istanze mobile (.tema-toggle-mobile), incluse quelle generate dinamicamente
  // da creaHeader() dopo l'avvio (progetti, taccuino, intervalli...).
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.tema-toggle-btn')) return;
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
  document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && ['s', 'u', 'p'].includes(e.key)) e.preventDefault(); });
}

// ── Input ──
function gestisciTastiera(e) {
  if (!isMobile()) return;
  if ($('intro-cinematica')) return; // intro video ancora attiva (js/intro-video.js)
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
  if ($('intro-cinematica')) return; // intro video ancora attiva (js/intro-video.js)
  if ($('pagina-progetto').classList.contains('aperta')) return;
  if ($('pagina-taccuino-archivio').classList.contains('aperta')) return;

  const dx = e.changedTouches[0].clientX - tx;
  const dy = e.changedTouches[0].clientY - ty;

  // Se il gesto è prevalentemente verticale, non fare nulla — lascia scrollare
  if (Math.abs(dy) > Math.abs(dx)) return;

  // Controlla se il touch è partito da dentro un elemento scrollabile
  const target = e.target;
  const scrollabile = target.closest('.pagina-corpo, .chi-sono-wrap, .taccuino-wrap');
  if (scrollabile && scrollabile.scrollHeight > scrollabile.clientHeight) return;

  if (Math.abs(dx) > 40) {
    const isUltima = stato.paginaCorrente === stato.totPagine - 1;
    if (dx < 0) paginaSuccessiva();
    else if (isUltima) navigaA(0);
    else paginaPrecedente();
  }
}

function gestisciTap(e) {
  if (!isMobile()) return;
  if ($('intro-cinematica')) return; // intro video ancora attiva (js/intro-video.js)
  if ($('pagina-progetto').classList.contains('aperta')) return;
  if ($('pagina-taccuino-archivio').classList.contains('aperta')) return;
  if (e.target.closest('button, a, input')) return;
  const x = e.clientX, w = window.innerWidth;
  if (x > w * 0.65) paginaSuccessiva();
  else if (x < w * 0.35) paginaPrecedente();
}

// ════════════════════════════════
// LIGHTBOX
// ════════════════════════════════
const lightbox = (() => {
  let galleria = [];  // array di src corrente
  let idx = 0;

  const el       = () => $('lightbox');
  const imgEl    = () => $('lightbox-img');
  const counter  = () => $('lightbox-counter');
  const prev     = () => $('lightbox-prev');
  const next     = () => $('lightbox-next');

  // Selettori da cui raccogliere le immagini del gruppo
  const SELETTORI_GRUPPO = [
    '.progetto-galleria',
    '.progetto-galleria-gruppo',
    '.studi-griglia',
    '.studio-gruppo-griglia',
    '.intervallo-mobile-griglia',
    '.collab-griglia',
    '.collab-mobile-corpo',
    '.progetto-mobile-img',   // singola immagine copertina mobile
  ];

  function raccogliGalleria(imgCliccata) {
    // Cerca il contenitore gruppo più vicino
    const contenitore = SELETTORI_GRUPPO
      .map(s => imgCliccata.closest(s))
      .find(Boolean);

    if (contenitore) {
      // Tutte le img nel gruppo (anche dentro .img-wrap)
      return Array.from(contenitore.querySelectorAll('img'))
        .filter(i => !i.classList.contains('img-overlay') && i.src)
        .map(i => ({ src: i.src, alt: i.alt || '' }));
    }

    // Fallback: solo l'immagine cliccata
    return [{ src: imgCliccata.src, alt: imgCliccata.alt || '' }];
  }

  function mostraImg(i) {
    if (!galleria[i]) return;
    idx = i;
    const lb = el(), image = imgEl();

    image.classList.add('caricando');
    const nuova = new Image();
    nuova.onload = () => {
      image.src = nuova.src;
      image.alt = galleria[i].alt;
      image.classList.remove('caricando');
    };
    nuova.src = galleria[i].src;

    // Counter
    if (galleria.length > 1) {
      counter().textContent = `${i + 1} / ${galleria.length}`;
      counter().style.display = '';
    } else {
      counter().style.display = 'none';
    }

    // Frecce
    prev().hidden = i === 0;
    next().hidden = i === galleria.length - 1;
  }

  function apri(imgEl) {
    galleria = raccogliGalleria(imgEl);
    const srcCliccata = imgEl.src;
    idx = galleria.findIndex(g => g.src === srcCliccata);
    if (idx < 0) idx = 0;

    el().classList.add('aperto');
    document.body.style.overflow = 'hidden';
    mostraImg(idx);
  }

  function chiudi() {
    el().classList.remove('aperto');
    document.body.style.overflow = '';
    galleria = [];
  }

  function precedente() { if (idx > 0) mostraImg(idx - 1); }
  function successiva()  { if (idx < galleria.length - 1) mostraImg(idx + 1); }

  // ── Swipe su mobile ──
  let _tx = 0;

  function init() {
    const lb = el();
    if (!lb) return;

    // Chiudi cliccando fuori dall'immagine
    lb.addEventListener('click', e => {
      if (e.target === lb || e.target === $('lightbox-stage')) chiudi();
    });
    $('lightbox-chiudi').addEventListener('click', chiudi);
    prev().addEventListener('click', precedente);
    next().addEventListener('click', successiva);

    // Swipe
    lb.addEventListener('touchstart', e => { _tx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - _tx;
      if (Math.abs(dx) > 40) { dx < 0 ? successiva() : precedente(); }
    }, { passive: true });

    // Tastiera
    document.addEventListener('keydown', e => {
      if (!lb.classList.contains('aperto')) return;
      if (e.key === 'Escape') chiudi();
      if (e.key === 'ArrowRight') successiva();
      if (e.key === 'ArrowLeft') precedente();
    });

    // ── Event delegation: intercetta click su qualsiasi immagine ──
    document.addEventListener('click', e => {
      // Cerca un img dentro un contenitore cliccabile
      // Su mobile escludi .progetto-mobile-img (è la copertina, il tap serve per navigare)
      const selettori = isMobile()
        ? '.img-wrap, .progetto-galleria-img, ' +
          '.intervallo-mobile-cella, ' +
          '.taccuino-voce-foto, .collab-mobile-img'
        : '.img-wrap, .progetto-galleria-img, ' +
          '.tutti-studio-img, .studio-img, ' +
          '.taccuino-voce-foto, .collab-img, ' +
          '.chi-sono-esteso-img, .chi-sono-desktop-img';

      const img = e.target.closest(selettori)?.querySelector('img');

      if (!img || !img.src || img.src.endsWith('favicon.svg')) return;

      // Le card progetto (slider desktop e griglia "tutti i progetti") aprono il progetto, non il lightbox
      if (e.target.closest('.progetto-card, .tutti-card')) return;

      // Non aprire se si sta navigando tra pagine mobile
      if (stato.inTransizione) return;

      e.stopPropagation();
      apri(img);
    });
  }

  return { init, chiudi, apri };
})();
