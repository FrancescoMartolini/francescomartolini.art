/* ══════════════════════════════════════════════
   i18n.js — gestisce SOLO il testo di interfaccia
   (menu, bottoni, footer, cookie, ecc.)
   Il testo dei contenuti (progetti, taccuino...) è
   gestito dalla funzione t() già presente in libro.js.
   ══════════════════════════════════════════════ */
(function () {
  var LANG_KEY = 'lang';
  var SUPPORTED_LANGS = ['it', 'en'];

  // Rileva la lingua del browser (navigator.languages ha priorità,
  // navigator.language come fallback). Se la lingua rilevata non è
  // supportata (né it né en), il default è l'inglese.
  function detectBrowserLang() {
    var candidates = (navigator.languages && navigator.languages.length)
      ? navigator.languages
      : [navigator.language || navigator.userLanguage || 'it'];

    for (var i = 0; i < candidates.length; i++) {
      var code = (candidates[i] || '').toLowerCase().slice(0, 2);
      if (SUPPORTED_LANGS.indexOf(code) !== -1) return code;
    }
    // Lingua del browser non supportata (né it né en): default inglese.
    return 'en';
  }

  // Lingua esplicitata nell'URL (?lang=it / ?lang=en) — è così che i motori
  // di ricerca raggiungono una variante linguistica precisa tramite i link
  // hreflang dichiarati più sotto. Se presente e valida ha priorità su
  // tutto e diventa anche la preferenza salvata, così un link condiviso in
  // una lingua resta quella lingua anche alla visita successiva.
  function detectUrlLang() {
    var value = (new URLSearchParams(location.search).get(LANG_KEY) || '').toLowerCase();
    return SUPPORTED_LANGS.indexOf(value) !== -1 ? value : null;
  }

  // Priorità: lingua esplicita in URL > preferenza salvata > lingua del
  // browser (italiano se it, inglese in ogni altro caso).
  var langDaUrl = detectUrlLang();
  var lang = langDaUrl || localStorage.getItem(LANG_KEY) || detectBrowserLang();
  if (langDaUrl) localStorage.setItem(LANG_KEY, langDaUrl);
  var ui = null;

  // ── SEO: canonical + hreflang per lingua ──
  // Il sito è bilingue su un solo URL fisico (nessuna cartella /en/): la
  // variante linguistica viene dichiarata ai motori di ricerca tramite
  // ?lang=it / ?lang=en, con hreflang reciproci fra le due varianti e un
  // canonical auto-referenziale per ciascuna — lo schema che Google
  // richiede per contenuti multilingua serviti su URL alternativi invece
  // che su sottocartelle. location.pathname va letto qui, PRIMA che
  // libro-app.js "ripulisca" la barra degli indirizzi dopo un link diretto
  // (vedi commento in js/libro-app.js), altrimenti ogni pagina profonda
  // risulterebbe canonicalizzata sulla home.
  function impostaLinkHead(rel, hreflang, href) {
    var selettore = hreflang
      ? 'link[rel="' + rel + '"][hreflang="' + hreflang + '"]'
      : 'link[rel="' + rel + '"]:not([hreflang])';
    var el = document.head.querySelector(selettore);
    if (!el) {
      el = document.createElement('link');
      el.setAttribute('rel', rel);
      if (hreflang) el.setAttribute('hreflang', hreflang);
      document.head.appendChild(el);
    }
    el.setAttribute('href', href);
  }

  function aggiornaTagLingua() {
    var percorso = location.pathname.replace(/\/+$/, '') || '/';
    var base = location.origin + percorso;
    impostaLinkHead('canonical', null, base + '?lang=' + lang);
    impostaLinkHead('alternate', 'it', base + '?lang=it');
    impostaLinkHead('alternate', 'en', base + '?lang=en');
    impostaLinkHead('alternate', 'x-default', base);
  }
  aggiornaTagLingua();

  // ── SEO: og:image / og:url (anteprime social) ──
  // Immagine e URL generici di default, usati per l'anteprima social del
  // sito nel suo complesso. js/libro-routing.js (che conosce i dati dei
  // singoli progetti) può sovrascriverli quando si apre un progetto/nota
  // specifici, e li ripristina qui sopra alla chiusura.
  // IMPORTANTE: questo aggiornamento è via JS e serve al rendering di
  // Google e a eventuali funzioni di condivisione interne al sito — NON
  // produce anteprime per-progetto su Facebook/WhatsApp/Twitter/Slack,
  // che leggono l'HTML grezzo senza eseguire JavaScript. Per quelle
  // servirebbe generare pagine statiche per progetto (fuori scope qui).
  var DEFAULT_OG_IMAGE = 'https://res.cloudinary.com/dgo7tnyv6/image/upload/w_1200,h_630,c_fill,g_auto,q_auto,f_auto/v1778416462/LaPelleDellaCitta40_ppttqh.jpg';
  var DEFAULT_OG_TITOLO = 'francescomartolini.art';
  var DEFAULT_OG_DESCRIZIONE = 'Il tempo lascia tracce. Io le cerco.';

  function impostaMeta(attr, key, value) {
    if (!value) return;
    var el = document.head.querySelector('meta[' + attr + '="' + key + '"]');
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.setAttribute('content', value);
  }

  window.aggiornaMetaSociale = function (opts) {
    opts = opts || {};
    var percorso = location.pathname.replace(/\/+$/, '') || '/';
    var url = opts.url || (location.origin + percorso);
    var titolo = opts.titolo || DEFAULT_OG_TITOLO;
    var descrizione = opts.descrizione || DEFAULT_OG_DESCRIZIONE;
    var immagine = opts.immagine || DEFAULT_OG_IMAGE;

    impostaMeta('property', 'og:title', titolo);
    impostaMeta('property', 'og:description', descrizione);
    impostaMeta('property', 'og:url', url);
    impostaMeta('property', 'og:image', immagine);
    impostaMeta('name', 'twitter:title', titolo);
    impostaMeta('name', 'twitter:description', descrizione);
    impostaMeta('name', 'twitter:image', immagine);
  };
  window.aggiornaMetaSociale();

  // ── SEO: JSON-LD del singolo progetto/nota ──
  // I dati strutturati di Persona e WebSite sono statici (nel markup di
  // index.html, sempre presenti). Questo invece è il tag aggiuntivo per
  // il progetto/nota aperti in un dato momento — un <script type=
  // "application/ld+json"> creato e rimosso dinamicamente, così un
  // motore di ricerca che esegue il rendering (Google, Bing) trova un
  // CreativeWork distinto per ciascun contenuto, non sempre lo stesso.
  var ID_LD_PROGETTO = 'ld-progetto-corrente';

  window.aggiornaJsonLdProgetto = function (dati) {
    var el = document.getElementById(ID_LD_PROGETTO);
    if (!dati) {
      if (el) el.remove();
      return;
    }
    if (!el) {
      el = document.createElement('script');
      el.type = 'application/ld+json';
      el.id = ID_LD_PROGETTO;
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'CreativeWork',
      genre: 'Photography',
      name: dati.nome,
      description: dati.descrizione || undefined,
      image: dati.immagine || undefined,
      url: dati.url,
      dateCreated: dati.anno || undefined,
      creator: { '@type': 'Person', name: 'Francesco Martolini', url: 'https://francescomartolini.art/' },
      isPartOf: { '@type': 'WebSite', name: 'francescomartolini.art', url: 'https://francescomartolini.art/' }
    });
  };

  function getField(path, dict) {
    var parts = path.split('.');
    var node = dict;
    for (var i = 0; i < parts.length; i++) {
      if (node == null) return '';
      node = node[parts[i]];
    }
    if (node == null) return '';
    if (typeof node === 'string') return node;
    return node[lang] || node.it || '';
  }

  function applyI18n() {
    if (!ui) return;

    document.documentElement.lang = lang;

    // Testo semplice (textContent)
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var value = getField(el.getAttribute('data-i18n'), ui);
      if (value) el.textContent = value;
    });

    // Testo con markup interno (<br>, <em>...) — innerHTML
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var value = getField(el.getAttribute('data-i18n-html'), ui);
      if (value) el.innerHTML = value;
    });

    // Attributi (es. aria-label="chiave")
    document.querySelectorAll('[data-i18n-attr]').forEach(function (el) {
      var spec = el.getAttribute('data-i18n-attr'); // formato "attributo:chiave"
      var idx = spec.indexOf(':');
      if (idx === -1) return;
      var attr = spec.slice(0, idx);
      var key = spec.slice(idx + 1);
      var value = getField(key, ui);
      if (value) el.setAttribute(attr, value);
    });

    // Toggle: evidenzia la lingua attiva
    document.querySelectorAll('.lang-option').forEach(function (el) {
      el.classList.toggle('active', el.dataset.lang === lang);
    });

    // Meta description (SEO)
    var metaDesc = document.querySelector('meta[name="description"]');
    var metaValue = getField('meta.description', ui);
    if (metaDesc && metaValue) metaDesc.setAttribute('content', metaValue);
  }

  function setLang(newLang) {
    if (newLang === lang) return;
    localStorage.setItem(LANG_KEY, newLang);
    var url = new URL(location.href);
    url.searchParams.set(LANG_KEY, newLang);
    location.href = url.toString(); // naviga: ricarica pagina e contenuti dinamici, ora con la lingua anche nell'URL
  }

  function initToggle() {
    document.querySelectorAll('.lang-option').forEach(function (el) {
      el.addEventListener('click', function () {
        setLang(el.dataset.lang);
      });
    });
  }

  async function init() {
    try {
      var res = await fetch('json/ui.json');
      ui = await res.json();
    } catch (e) {
      console.error('i18n: impossibile caricare json/ui.json', e);
    }
    applyI18n();
    initToggle();
  }

  window.getCurrentLang = function () { return lang; };
  window.t_ui = function (path) { return getField(path, ui || {}); };

  // Promessa che libro.js può attendere prima di costruire le parti
  // che usano tu()/t_ui() — evita la race condition tra i due script,
  // che caricano i rispettivi JSON in modo indipendente e asincrono.
  window.i18nReady = new Promise(function (resolve) {
    document.addEventListener('DOMContentLoaded', function () {
      init().then(resolve).catch(resolve); // risolve comunque, anche in caso di errore di rete
    });
  });
})();
