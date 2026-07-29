/* ══════════════════════════════════════════════
   rss-modal.js — popup "Feed RSS".
   Apre un piccolo popup con i 4 indirizzi dei feed
   (uno per Tutto/Progetti/Taccuino/Istanze), ognuno
   con un tasto "Copia" per gli appunti. Nessun link
   cliccabile verso l'XML grezzo: solo testo da copiare
   e incollare nel proprio lettore di feed.
   ══════════════════════════════════════════════ */
(function () {
  'use strict';

  function testo(chiave) {
    return (window.t_ui && window.t_ui(chiave)) || '';
  }

  document.addEventListener('DOMContentLoaded', function () {
    var backdrop = document.getElementById('rss-modal-backdrop');
    var chiudiBtn = document.getElementById('rss-modal-chiudi');
    if (!backdrop || !chiudiBtn) return;

    var trigger = document.querySelectorAll('.rss-trigger');
    var ultimoElementoFocheggiato = null;

    function apri() {
      ultimoElementoFocheggiato = document.activeElement;
      chiudiBtn.setAttribute('aria-label', testo('rss.chiudi') || 'Chiudi');
      backdrop.hidden = false;
      requestAnimationFrame(function () {
        backdrop.classList.add('aperto');
      });
      chiudiBtn.focus();
      document.addEventListener('keydown', suEscape);
    }

    function chiudi() {
      backdrop.classList.remove('aperto');
      document.removeEventListener('keydown', suEscape);
      setTimeout(function () {
        backdrop.hidden = true;
        if (ultimoElementoFocheggiato) ultimoElementoFocheggiato.focus();
      }, 200);
    }

    function suEscape(e) {
      if (e.key === 'Escape') chiudi();
    }

    trigger.forEach(function (btn) {
      btn.addEventListener('click', apri);
    });

    chiudiBtn.addEventListener('click', chiudi);

    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop) chiudi();
    });

    async function copiaNegliAppunti(testoDaCopiare) {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(testoDaCopiare);
        return;
      }
      // Fallback per contesti non sicuri / browser meno recenti.
      var area = document.createElement('textarea');
      area.value = testoDaCopiare;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.focus();
      area.select();
      document.execCommand('copy');
      document.body.removeChild(area);
    }

    document.querySelectorAll('.rss-modal-copia').forEach(function (bottone) {
      var etichettaOriginale = bottone.textContent;
      bottone.addEventListener('click', async function () {
        var url = bottone.getAttribute('data-url');
        try {
          await copiaNegliAppunti(url);
          bottone.textContent = testo('rss.copiato') || etichettaOriginale;
          bottone.classList.add('copiato');
          setTimeout(function () {
            bottone.textContent = testo('rss.copia') || etichettaOriginale;
            bottone.classList.remove('copiato');
          }, 1600);
        } catch (e) {
          // silenzioso: l'utente può comunque selezionare il testo a mano
        }
      });
    });
  });
})();
