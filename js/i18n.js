/* ══════════════════════════════════════════════
   i18n.js — gestisce SOLO il testo di interfaccia
   (menu, bottoni, footer, cookie, ecc.)
   Il testo dei contenuti (progetti, taccuino...) è
   gestito dalla funzione t() già presente in libro.js.
   ══════════════════════════════════════════════ */
(function () {
  var LANG_KEY = 'lang';
  var lang = localStorage.getItem(LANG_KEY) || 'it';
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
      return;
    }
    applyI18n();
    initToggle();
  }

  window.getCurrentLang = function () { return lang; };
  window.t_ui = function (path) { return getField(path, ui || {}); };

  document.addEventListener('DOMContentLoaded', init);
})();
