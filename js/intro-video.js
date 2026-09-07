/* ============================================
   INTRO CINEMATOGRAFICA — Francesco Martolini .art
   Apertura video a schermo intero della Home, come apertura di un
   progetto editoriale. Vanilla JS, nessuna dipendenza nuova, stessa
   convenzione Cloudinary già usata per le immagini (vedi docs/images.md).

   Questo script gira PRIMA di libro.js e i18n.js: il markup di cui ha
   bisogno (#intro-cinematica e figli) è già nel DOM sopra il tag
   <script> che lo carica, quindi non aspetta DOMContentLoaded — parte
   subito, così il video comincia a caricare il prima possibile.
   ============================================ */
(function () {
  'use strict';

  // ── CONFIGURAZIONE: incollare qui i due video Cloudinary ──
  // Stessa convenzione delle immagini (docs/images.md → "Video (Cloudinary)"):
  // URL completo, già con la trasformazione desiderata, prefisso
  // "/video/upload/…". Esempio:
  //   'https://res.cloudinary.com/dgo7tnyv6/video/upload/f_auto,q_auto/intro-desktop.mp4'
  // Finché restano vuoti, l'intro non viene mostrata (la Home si apre
  // normalmente, senza schermata nera): nessun URL è stato inventato qui.
  var INTRO_VIDEO_LANDSCAPE = 'https://res.cloudinary.com/dgo7tnyv6/video/upload/v1786719918/TESTVideoSitoOrizzontale_yo56yf.mp4'; // ← video orizzontale (desktop / landscape)
  var INTRO_VIDEO_PORTRAIT  = 'https://res.cloudinary.com/dgo7tnyv6/video/upload/v1786719917/TESTVideoSitoVerticale_j9bi5w.mp4'; // ← video verticale (mobile / portrait)

  // Mostra l'intro una sola volta per sessione di navigazione (sessionStorage,
  // non localStorage): un portfolio fotografico si presta a un'apertura che
  // torna a farsi vedere quando il visitatore riapre il sito in una nuova
  // sessione, ma non ad ogni singolo refresh mentre lo sta già visitando.
  var SESSION_KEY = 'fm-intro-vista';

  // Se il video non è pronto entro questo tempo, si passa alla Home:
  // meglio un'apertura mancata che un'attesa percepita come un preloader.
  var TIMEOUT_MS = 4000;

  // Sezioni con URL profondo (vedi SEZIONI_URL/leggiRoute in js/libro.js):
  // un link condiviso a un progetto o a una sezione precisa deve aprire
  // subito quel contenuto, non essere preceduto dall'apertura della Home.
  var RE_DEEP_LINK = /\/(progetti|taccuino|chi-sono|intervalli|playlist|fotografie-commerciali)(\/|$)/;

  function eDeepLink() {
    var path = location.pathname.replace(/\/+$/, '') || '/';
    return RE_DEEP_LINK.test(path);
  }

  function giaVista() {
    try { return sessionStorage.getItem(SESSION_KEY) === '1'; }
    catch (e) { return true; } // storage non disponibile → non rischiare, salta
  }
  function segnaVista() {
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch (e) {}
  }

  function riduciMovimento() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // Portrait/landscape dal viewport reale, non dallo user-agent: copre
  // desktop, laptop, tablet in entrambi gli orientamenti e smartphone in
  // entrambi gli orientamenti allo stesso modo.
  function scegliVideo() {
    var portrait = window.innerHeight > window.innerWidth;
    var scelto = portrait
      ? (INTRO_VIDEO_PORTRAIT || INTRO_VIDEO_LANDSCAPE)
      : (INTRO_VIDEO_LANDSCAPE || INTRO_VIDEO_PORTRAIT);
    return scelto || '';
  }

  // Poster automatico Cloudinary: stessa trasformazione, estensione .jpg
  // (vedi docs/images.md). Evita un riquadro nero prima che il video sia
  // pronto a riprodursi.
  function posterDa(url) {
    var m = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/video\/upload\/.+)\.[a-zA-Z0-9]+(\?.*)?$/.exec(url);
    return m ? m[1] + '.jpg' : '';
  }

  function avvia() {
    var overlay = document.getElementById('intro-cinematica');
    if (!overlay) return;

    var src = scegliVideo();

    // Casi in cui l'intro non va mostrata affatto (niente schermata nera,
    // niente attesa): rimuoviamo subito l'elemento dal DOM.
    if (!src || giaVista() || riduciMovimento() || eDeepLink()) {
      overlay.parentNode && overlay.parentNode.removeChild(overlay);
      segnaVista();
      return;
    }

    var video = document.getElementById('intro-video');
    var salta = document.getElementById('intro-salta');
    var timeoutId = null;
    var uscita = false;

    var poster = posterDa(src);
    if (poster) video.poster = poster;
    video.src = src;

    document.body.classList.add('intro-attiva');
    overlay.classList.add('attiva');

    function rimuovi() {
      overlay.parentNode && overlay.parentNode.removeChild(overlay);
    }

    function esci() {
      if (uscita) return;
      uscita = true;
      segnaVista();
      if (timeoutId) clearTimeout(timeoutId);
      document.body.classList.remove('intro-attiva');
      overlay.classList.add('intro-cinematica--esci');
      overlay.addEventListener('transitionend', function fine(e) {
        if (e.target !== overlay) return;
        overlay.removeEventListener('transitionend', fine);
        rimuovi();
      });
      // Rete di sicurezza se transitionend non arriva (es. tab in background,
      // prefers-reduced-motion senza durata di transizione).
      setTimeout(rimuovi, 1200);
    }

    // Fine naturale del video: breve sosta editoriale sul frontespizio
    // (lo stesso titolo già presente in Home) prima di lasciare il posto
    // alla Home vera e propria — non un semplice taglio netto.
    function mostraFrontespizio() {
      overlay.classList.add('intro-cinematica--fine');
      setTimeout(esci, 900);
    }

    video.addEventListener('ended', mostraFrontespizio);
    // Video non riproducibile (errore di rete, formato, URL non valido):
    // fallback diretto alla Home.
    video.addEventListener('error', esci);
    video.addEventListener('canplay', function () { if (timeoutId) clearTimeout(timeoutId); }, { once: true });

    timeoutId = setTimeout(esci, TIMEOUT_MS);

    try {
      var playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        // Autoplay bloccato dal browser: l'utente non deve restare bloccato
        // davanti a un video muto e fermo, si passa oltre.
        playPromise.catch(esci);
      }
    } catch (e) {
      esci();
    }

    salta.addEventListener('click', esci);
    document.addEventListener('keydown', function onKey(e) {
      if (!overlay.isConnected) { document.removeEventListener('keydown', onKey); return; }
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); esci(); }
    });

    // Porta il focus sul bottone "Salta": un visitatore da tastiera può
    // uscire dall'intro immediatamente con Invio, senza doverla cercare.
    setTimeout(function () { try { salta.focus({ preventScroll: true }); } catch (e) {} }, 50);

    // ── Blocco interazioni con il libro sotto l'intro ──
    // Le gesture/tastiera del libro mobile (js/libro.js) sono delegate su
    // `document`: senza questo, un tap sul video o una freccia mentre
    // l'intro è ancora visibile sfoglierebbe la pagina sottostante. Le
    // funzioni gestisciTap/gestisciTastiera/gestisciTouchStart/TouchEnd in
    // libro.js si fermano da sole finché #intro-cinematica esiste nel DOM.
  }

  avvia();
})();
