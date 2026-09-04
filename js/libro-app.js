/* ============================================
   LIBRO ENGINE — app
Bootstrap: init() collega dati, DOM mobile/desktop, routing e interazioni,
poi si avvia su DOMContentLoaded. API pubblica esposta su window per gli
onclick inline nei template. Ultimo file del gruppo libro-*.js: deve essere
caricato dopo tutti gli altri.
   ============================================ */

'use strict';



// Esponi globale se necessario
window.chiudiLightbox = lightbox.chiudi;

// ── Esponi globali ──
window.navigaA = navigaA;
window.chiudiProgetto = chiudiProgetto;
window.chiudiTaccuino = chiudiTaccuino;
window.apriTaccuino = apriTaccuino;
window.apriPagina = apriPagina;
window.chiudiPagina = chiudiPagina;

// ── Init ──
async function init() {
  // Aspetta che i18n.js abbia finito di caricare json/ui.json, così le
  // stringhe di interfaccia (tu()) sono pronte prima di costruire indice,
  // pagine progetto ecc. Se i18n.js non è presente per qualche motivo,
  // non blocca comunque il resto del sito.
  if (window.i18nReady) await window.i18nReady;

  await caricaDati();

  // Segnalibro: leggiamo il valore salvato PRIMA che aggiornaUI() lo
  // sovrascriva con la pagina 0 (il frontespizio resta comunque la pagina
  // di apertura predefinita: proponiamo solo di riprendere da lì).
  let paginaSalvata = -1;
  try {
    const v = parseInt(localStorage.getItem(SEGNALIBRO_KEY), 10);
    if (!Number.isNaN(v)) paginaSalvata = v;
  } catch (e) {}

  if (isMobile()) {
    costruisciMobile();
    document.querySelector('.page')?.classList.add('attiva');
    aggiornaUI();
    if (paginaSalvata > 0 && !leggiRoute()) mostraSegnalibro(paginaSalvata);
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
  lightbox.init();
  inizializzaFin();

  // Link diretto a una pagina precisa (es. condivisa via messaggio): apri
  // subito quella. replaceState (non pushState) così il tasto "indietro"
  // torna alla home.
  // Link diretto a una pagina precisa (es. condivisa via messaggio): apri
  // subito quella. Poi nascondi il percorso: la barra degli indirizzi non
  // deve mostrare nulla dopo il dominio, né ora né durante la navigazione.
  const route = leggiRoute();
  if (route?.tipo === 'progetto') {
    const pr = stato.progetti.find(p => p.id === route.id && p.pubblicato !== false);
    if (pr) apriProgetto(route.id);
  } else if (route?.tipo === 'taccuino') {
    apriTaccuino();
  } else if (route?.tipo === 'taccuino-voce') {
    apriTaccuino(route.id);
  } else if (route?.tipo === 'sezione' && route.pagina === 'playlist-pagina') {
    apriProgetto(ID_CARD_PLAYLIST);
  } else if (route?.tipo === 'sezione') {
    apriPagina(route.pagina);
  }
  if (route) history.replaceState(null, '', `${BASE_PATH}/`);
}

document.addEventListener('DOMContentLoaded', init);
