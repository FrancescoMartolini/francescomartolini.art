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

  // Priorità: preferenza salvata dall'utente > lingua del browser
  // (italiano se it, inglese in ogni altro caso).
  var lang = localStorage.getItem(LANG_KEY) || detectBrowserLang();
  var ui = null;

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
    location.reload(); // ricarica per rigenerare anche i contenuti dinamici (progetti, taccuino...)
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
