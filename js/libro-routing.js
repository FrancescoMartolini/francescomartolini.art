/* ============================================
   LIBRO ENGINE — routing
Apertura/chiusura degli overlay (progetto, taccuino, sezioni, archivio playlist),
generazione del contenuto di un progetto, interpretazione dell'URL d'arrivo,
navigazione fra le pagine del libro (navigaA).
Dipende da libro-nucleo.js.
   ============================================ */

'use strict';



// ════════════════════════════════
// FOCUS OVERLAY (accessibilità tastiera)
// ════════════════════════════════
// All'apertura di un overlay il focus si sposta al suo interno (di norma
// il pulsante "chiudi/torna", il primo elemento raggiungibile); alla
// chiusura torna esattamente su chi l'aveva aperto — così chi naviga da
// tastiera non resta "sotto" la pagina che si è aperta sopra di lui.
// Pila anziché singola variabile perché gli overlay possono annidarsi
// (es. apro un progetto da dentro "tutti i progetti").
const _pilaFocusOverlay = [];

function apriOverlayFocus(overlay, elementoDaFocalizzare) {
  _pilaFocusOverlay.push(document.activeElement);
  overlay.setAttribute('aria-hidden', 'false');
  const target = elementoDaFocalizzare || overlay.querySelector(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  if (target) target.focus();
}

function chiudiOverlayFocus(overlay) {
  overlay.setAttribute('aria-hidden', 'true');
  const precedente = _pilaFocusOverlay.pop();
  if (precedente && typeof precedente.focus === 'function' && document.contains(precedente)) {
    precedente.focus();
  }
}

// ════════════════════════════════
// OVERLAY PAGINE
// ════════════════════════════════
function apriPagina(tipo) {
  const overlay = $('overlay-pagina');
  const contenuto = $('overlay-contenuto');
  contenuto.innerHTML = '';

  const infoSezione = SEZIONI_URL[tipo];
  if (infoSezione) document.title = `${infoSezione.titolo} — francescomartolini.art`;

  switch (tipo) {

    case 'tutti-progetti':
      contenuto.innerHTML = `<h1 class="overlay-titolo">${tu('overlay.tuttiProgetti')}</h1><div class="tutti-progetti-griglia" id="tutti-proj-grid"></div>`;
      progettiVisualizzati().forEach((pr, i) => {
        const inLavorazione = pr.pubblicato === false;
        const card = crea('div'); card.className = 'tutti-card' + (inLavorazione ? ' in-lavorazione' : '');
        card.innerHTML = `
          <div class="tutti-card-img"></div>
          <p class="tutti-card-num">0${i + 1}</p>
          <h2 class="tutti-card-titolo">${t(pr.titolo)}</h2>
          <p class="tutti-card-anno">${t(pr.anno)} ${labelFotoProgetto(pr)}</p>
          <p class="tutti-card-desc">${t(pr.descrizione)}</p>
          ${inLavorazione ? `<p class="tutti-card-wip">${tu('overlay.inLavorazione')}</p>` : ''}
        `;
        card.querySelector('.tutti-card-img').appendChild(creaImg(pr.immagine_copertina, t(pr.titolo), false, '(max-width:900px) 50vw, 33vw'));
        if (pr.id === ID_CARD_PLAYLIST) {
          card.addEventListener('click', () => apriProgetto(ID_CARD_PLAYLIST));
        } else if (!inLavorazione) {
          card.addEventListener('click', () => apriProgetto(pr.id));
        }
        $('tutti-proj-grid').appendChild(card);
      });
      break;

    case 'tutti-studi':
      contenuto.innerHTML = `
        <h1 class="overlay-titolo">${tu('menu.intervalli')}</h1>
        <p class="overlay-sottotitolo">${tu('intervalli.descrizione')}</p>
        <div class="studi-gruppi" id="tutti-studi-grid"></div>
      `;
      // Apri subito l'overlay, poi inserisci i gruppi (ogni intervallo è un
      // capitolo: etichetta + titolo + descrizione, seguiti dalla sua griglia)
      // uno alla volta, così la pagina resta fluida anche con molte immagini.
      overlay.classList.add('aperta');
      overlay.scrollTop = 0;
      apriOverlayFocus(overlay, overlay.querySelector('.overlay-chiudi'));
      (function inserisciGruppi() {
        const contenitore = $('tutti-studi-grid');
        const gruppi = stato.intervalli;
        let g = 0;
        function step() {
          if (g >= gruppi.length) return;
          const iv = gruppi[g];
          const gruppo = crea('div'); gruppo.className = 'studio-gruppo';
          gruppo.innerHTML = `
            <div class="studio-gruppo-testo">
              <h2 class="studio-gruppo-titolo">${t(iv.titolo)}</h2>
              <p class="studio-gruppo-descrizione">${t(iv.descrizione)}</p>
            </div>
            <div class="studio-gruppo-griglia"></div>
          `;
          const grid = gruppo.querySelector('.studio-gruppo-griglia');
          iv.immagini.forEach((src, i) => {
            const cell = crea('div'); cell.className = 'tutti-studio-img';
            cell.appendChild(creaImg(src, `${t(iv.titolo)} ${i + 1}`, false, '30vw'));
            grid.appendChild(cell);
          });
          contenitore.appendChild(gruppo);
          g++;
          requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      })();
      return; // già aperto sopra, salta il codice finale
      break;

    case 'come-funziona':
      contenuto.innerHTML = `
        <h1 class="overlay-titolo overlay-titolo-nota">${tu('overlay.note.titolo')}</h1>
        <div class="nota-testo">
          <p>${tu('overlay.note.p1')}</p>
          <p>${tu('overlay.note.p2')}</p>
          <p>${tu('overlay.note.p3')}</p>
        </div>
      `;
      break;

    case 'chi-sono-pagina': {
      const SVG_MAIL = `<svg viewBox="0 0 24 24" class="contatto-icon"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/></svg>`;
      const SVG_IG = `<svg viewBox="0 0 24 24" class="contatto-icon"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/></svg>`;
      const SVG_TEL = `<svg viewBox="0 0 24 24" class="contatto-icon"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.09 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7a2 2 0 011.72 2.03z"/></svg>`;
      const SVG_WA = `<svg viewBox="0 0 24 24" class="contatto-icon"><circle cx="12" cy="12" r="10"/><path d="M8.5 7.5c.3-.3.8-.3 1.1 0l1.2 1.2c.3.3.3.8 0 1.1l-.6.6c.6 1.2 1.6 2.2 2.8 2.8l.6-.6c.3-.3.8-.3 1.1 0l1.2 1.2c.3.3.3.8 0 1.1-.8.8-2 .9-3 .4-3-1.4-5.4-3.8-6.8-6.8-.5-1-.4-2.2.4-3z"fill="white"/></svg>`;
      contenuto.innerHTML = `
        <h1 class="overlay-titolo">${tu('chiSono.titolo')}</h1>
        <div class="chi-sono-esteso">
          <div class="chi-sono-esteso-testo">
            <!-- <h2>Francesco Martolini</h2> -->
            <h2>${tu('chiSono.doveNasce')}</h2>
              <p class="introduzione-testo">${t(stato.intro.testo).replace(/\n/g, '<br>')}</p>
            <h2>${tu('chiSono.biografia')}</h2>
            <p>${tu('chiSono.overlayP1')}</p>
            <p>${tu('chiSono.overlayP2')}</p>
            <p>${tu('chiSono.overlayP3')}</p>
            <div class="chi-sono-contatti-esteso">
              <p class="contatti-label" style="margin-bottom:4px;">${tu('chiSono.contattiLabel')}</p>
              <p class="overlay-nota-contatti">${tu('chiSono.contattiNota')}</p>
              <a class="contatto-btn" href="mailto:info@francescomartolini.art">${SVG_MAIL}info@francescomartolini.art</a>
              <a class="contatto-btn" href="https://instagram.com/francesco_martolini_ph" target="_blank" rel="noopener">${SVG_IG}francesco_martolini_ph</a>
              <a class="contatto-btn" href="tel:+393930336642">${SVG_TEL}+39 393 033 6642</a>
              <a class="contatto-btn" href="https://wa.me/393930336642?text=Ciao%2C%20vorrei%20collaborare%20con%20te%0AQuesta%20%C3%A8%20la%20mia%20idea%20cosa%20ne%20pensi%3F" aria-label="Chat with us on WhatsApp" target="_blank" rel="noopener noreferrer">${SVG_WA} ${tu('chiSono.chatWhatsapp')}</a>
            </div>
          </div>
          <div class="chi-sono-esteso-img" id="chi-sono-overlay-img"></div>
        </div>
      `;
      const imgWrap = $('chi-sono-overlay-img');
      if (imgWrap && stato.progetti[0]) {
        imgWrap.appendChild(creaImg("./images/chi-sono-img.jpg", 'Francesco Martolini'));
      }
      break;
    }

    case 'collaborazioni-pagina':
      contenuto.innerHTML = `
        <h1 class="overlay-titolo">${tu('collab.titolo')}</h1>
        <p class="collab-intro">${tu('collab.intro')}</p>
        <div class="collab-griglia" id="collab-grid"></div>
        <div class="collab-footer">
          <p class="overlay-sottotitolo">${tu('collab.perCollaborazioni')}</p>
          <a href="mailto:info@francescomartolini.art" class="section-link">info@francescomartolini.art →</a>
        </div>
        ${stato.pubblicazioni.length > 0 ? `
        <!-- div class="pubblicazioni-sezione">
          <h2 class="pubblicazioni-titolo">Publications</h2>
          <div class="pubblicazioni-griglia" id="pubblicazioni-grid"></div>
        </div -->` : ''}
      `;
      overlay.classList.add('aperta');
      overlay.scrollTop = 0;
      apriOverlayFocus(overlay, overlay.querySelector('.overlay-chiudi'));
      (function inserisciCollabABlocchi() {
        const voci = stato.collaborazioni;
        const grid = $('collab-grid');
        let i = 0;
        const BLOCCO = 4;
        function step() {
          const fine = Math.min(i + BLOCCO, voci.length);
          for (; i < fine; i++) {
            const v = voci[i];
            const item = crea('div'); item.className = 'collab-item';
            item.innerHTML = `
              <div class="collab-img"></div>
              <p class="collab-cliente">${v.titolo}</p>
              <p class="collab-anno">${v.anno}</p>
            `;
            item.querySelector('.collab-img').appendChild(creaImg(v.foto, v.titolo, false, '33vw'));
            grid.appendChild(item);

            // Foto della collaborazione: la sezione si apre solo se la galleria è popolata
            const fotoCollab = Array.isArray(v.galleria) ? v.galleria : [];

            if (fotoCollab.length > 0) {
              const nomeBtn = item.querySelector('.collab-cliente');
              nomeBtn.setAttribute('tabindex', '0');
              nomeBtn.setAttribute('role', 'button');
              nomeBtn.setAttribute('aria-expanded', 'false');
              const pannello = crea('div'); pannello.className = 'collab-espansione';
              const inner = crea('div'); inner.className = 'collab-espansione-inner';
              const striscia = crea('div'); striscia.className = 'collab-espansione-striscia';
              fotoCollab.forEach(src => {
                const cell = crea('div'); cell.className = 'collab-espansione-cella';
                cell.appendChild(creaImg(src, v.titolo, false, '50vw'));
                striscia.appendChild(cell);
              });
              inner.appendChild(striscia);
              pannello.appendChild(inner);
              // Esce dalla card e occupa tutta la larghezza della griglia;
              // grid-auto-flow:dense su .collab-griglia ricompatta le card successive.
              item.insertAdjacentElement('afterend', pannello);

              const toggle = () => {
                const apri = !pannello.classList.contains('aperta');
                // Chiude eventuali altri pannelli aperti nella griglia (un solo pannello alla volta)
                grid.querySelectorAll('.collab-espansione.aperta').forEach(p => {
                  if (p !== pannello) p.classList.remove('aperta');
                });
                grid.querySelectorAll('.collab-cliente[aria-expanded="true"]').forEach(b => {
                  if (b !== nomeBtn) b.setAttribute('aria-expanded', 'false');
                });
                pannello.classList.toggle('aperta', apri);
                nomeBtn.setAttribute('aria-expanded', String(apri));
              };

              nomeBtn.addEventListener('click', toggle);
              nomeBtn.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
              });
            }
          }
          if (i < voci.length) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      })();

      // Pubblicazioni
      const pubGrid = $('pubblicazioni-grid');
      if (pubGrid) {
        stato.pubblicazioni.forEach(pub => {
          const item = crea('div'); item.className = 'pub-item';
          item.innerHTML = `
            <div class="pub-img"></div>
            <div class="pub-info">
              <p class="pub-titolo">${pub.titolo}</p>
              <p class="pub-anno">${pub.anno}</p>
              ${pub.link ? `<a class="pub-link" href="${pub.link}" target="_blank" rel="noopener">${tu('common.vedi')}</a>` : ''}
            </div>
          `;
          if (pub.immagine) item.querySelector('.pub-img').appendChild(creaImg(pub.immagine, pub.titolo));
          pubGrid.appendChild(item);
        });
      }
      return;
      break;
  }

  overlay.classList.add('aperta');
  overlay.scrollTop = 0;
  apriOverlayFocus(overlay, overlay.querySelector('.overlay-chiudi'));
}

function chiudiPagina() {
  const overlay = $('overlay-pagina');
  overlay.classList.remove('aperta');
  chiudiOverlayFocus(overlay);
  document.title = TITOLO_DEFAULT;
}

// ── Progetto dettaglio ──
const _cacheProgetti = {};

// ── Routing "silenzioso": link diretti funzionanti, URL sempre nascosto ──
// L'utente non vede MAI un URL diverso dal dominio base mentre naviga:
// aprire/chiudere un progetto o una sezione non tocca la barra degli
// indirizzi (a differenza di una webapp normale). Serve solo per poter
// condividere un link diretto a una pagina precisa (es. via messaggio):
// all'avvio, se l'URL con cui si è arrivati corrisponde a una pagina
// nota, quella pagina si apre subito — poi l'URL viene silenziosamente
// riportato alla radice (vedi fondo di init()), così anche durante la
// visualizzazione di quel contenuto la barra resta pulita.
//
// Escluse volutamente: 'tutti-progetti' (indice, ridondante con la home)
// e 'come-funziona' (nota di supporto, non una pagina a sé).
//
// BASE_PATH gestisce automaticamente i due scenari di hosting:
// - github.io (Project Page): il sito vive sotto /nome-repo/ (es.
//   francescomartolini.github.io/francescomartolini.art/) → il primo
//   segmento del path è il prefisso da mantenere in ogni URL.
// - dominio personalizzato (es. francescomartolini.art): il sito vive
//   alla radice → nessun prefisso.
// Se in futuro si collega il dominio personalizzato, questo codice si
// adatta da solo, senza bisogno di modifiche.
const BASE_PATH = (() => {
  if (!location.hostname.endsWith('github.io') || !location.pathname.startsWith('francescomartolini.art') || !location.pathname.startsWith('localhost:8000')) return '';
  const primoSegmento = location.pathname.split('/').filter(Boolean)[0];
  return primoSegmento ? `/${primoSegmento}` : '';
})();

const TITOLO_DEFAULT = document.title;

// tipo passato ad apriPagina() → { slug URL, titolo pagina }
const SEZIONI_URL = {
  'chi-sono-pagina':       { slug: 'chi-sono',               titolo: 'Chi sono' },
  'collaborazioni-pagina': { slug: 'fotografie-commerciali', titolo: 'Fotografie Commerciali' },
  'tutti-studi':           { slug: 'intervalli',             titolo: 'Intervalli' },
  'playlist-pagina':       { slug: 'playlist',                titolo: 'Playlist' },
};

// Legge l'URL corrente (al netto di BASE_PATH) e dice a quale pagina
// corrisponde, se corrisponde a qualcosa. Unica fonte di verità usata
// sia all'avvio sia dal tasto indietro/avanti del browser.
function leggiRoute() {
  const base = BASE_PATH.replace(/\/$/, '');
  let path = location.pathname;
  if (base && path.startsWith(base)) path = path.slice(base.length);
  path = path.replace(/\/+$/, '') || '/';

  if (path === '/taccuino') return { tipo: 'taccuino' };

  const mVoceTaccuino = path.match(/^\/taccuino\/([^/?#]+)$/);
  if (mVoceTaccuino) return { tipo: 'taccuino-voce', id: decodeURIComponent(mVoceTaccuino[1]) };

  const mProgetto = path.match(/^\/progetti\/([^/?#]+)$/);
  if (mProgetto) return { tipo: 'progetto', id: decodeURIComponent(mProgetto[1]) };

  for (const [pagina, info] of Object.entries(SEZIONI_URL)) {
    if (path === `/${info.slug}`) return { tipo: 'sezione', pagina };
  }

  return null; // home
}

// Blocco "Acquista il volume" + navigazione tra i volumi della collana PLAYLIST
function generaBloccoVolumePlaylist(pr) {
  const volumi = volumiPlaylist();
  const idx = volumi.findIndex(v => v.id === pr.id);
  const prec = idx > 0 ? volumi[idx - 1] : null;
  const succ = idx > -1 && idx < volumi.length - 1 ? volumi[idx + 1] : null;

  const shopUrl = pr.shop_url || '';
  const shopLabel = t(pr.shop_label) || tu('playlist.acquista');

  return `
    <div class="pl-acquista">
      <p class="pl-eyebrow">${tu('playlist.acquistaEyebrow')}</p>
      <div class="pl-acquista-riga">
        <div class="pl-acquista-mockup">
          <img src="${pr.immagine_copertina}" alt="${t(pr.titolo)}" draggable="false" loading="lazy">
        </div>
        <div class="pl-acquista-info">
          <p class="pl-acquista-titolo"> ${t(pr.titolo)}</p>
          ${shopUrl
            ? `<a class="pl-acquista-btn" href="${shopUrl}" target="_blank" rel="noopener">${shopLabel}</a>`
            : `<p class="pl-acquista-presto">${tu('playlist.prossimamente')}</p>`}
        </div>
      </div>
    </div>

    <div class="progetto-nav">
      ${prec
        ? `<button class="progetto-nav-link" onclick="apriProgetto('${prec.id}')"><span>${tu('playlist.volumePrecedente')}</span><strong>PLAYLIST.${numeroVolume(prec.id)}</strong></button>`
        : `<span class="progetto-nav-link progetto-nav-link--vuoto" aria-hidden="true"></span>`}
      <button class="progetto-nav-indice" onclick="apriProgetto('${ID_CARD_PLAYLIST}')">${tu('playlist.indice')}</button>
      ${succ
        ? `<button class="progetto-nav-link progetto-nav-link--dx" onclick="apriProgetto('${succ.id}')"><span>${tu('playlist.volumeSuccessivo')}</span><strong>PLAYLIST.${numeroVolume(succ.id)}</strong></button>`
        : `<span class="progetto-nav-link progetto-nav-link--vuoto" aria-hidden="true"></span>`}
    </div>`;
}

// Navigazione di fine capitolo per i progetti principali (non-PLAYLIST):
// stesso pattern "Precedente / Indice / Successivo" dei volumi PLAYLIST,
// ma scorre l'elenco così com'è mostrato in Progetti (progettiVisualizzati,
// che include anche la card PLAYLIST nella sua posizione).
function generaBloccoNavigazioneProgetto(pr) {
  const elenco = progettiVisualizzati().filter(p => progettoPubblicato(p));
  const idx = elenco.findIndex(p => p.id === pr.id);
  if (idx === -1) return '';
  const prec = idx > 0 ? elenco[idx - 1] : null;
  const succ = idx < elenco.length - 1 ? elenco[idx + 1] : null;

  const linkHTML = (voce, extraClass) => {
    if (!voce) return `<span class="progetto-nav-link progetto-nav-link--vuoto" aria-hidden="true"></span>`;
    const titolo = voce.id === ID_CARD_PLAYLIST ? 'PLAYLIST' : t(voce.titolo);
    const label = extraClass ? tu('progetti_extra.progettoSuccessivo') : tu('progetti_extra.progettoPrecedente');
    return `<button class="progetto-nav-link${extraClass ? ' progetto-nav-link--dx' : ''}" onclick="apriProgetto('${voce.id}')">
      <span>${label}</span><strong>${titolo}</strong>
    </button>`;
  };

  return `
    <div class="progetto-nav">
      ${linkHTML(prec, false)}
      <button class="progetto-nav-indice" onclick="chiudiProgetto()">${tu('indice.titolo')}</button>
      ${linkHTML(succ, true)}
    </div>`;
}

// Contenuto della pagina archivio PLAYLIST: Hero, Manifesto, Come funziona,
// Filosofia, La serie. Si apre dentro #pagina-progetto, esattamente come un
// progetto qualunque — non è più un'area a parte.
function generaHTMLArchivioPlaylist() {
  const pl = stato.playlist || {};
  const hero = pl.hero || {};
  const manifesto = pl.manifesto || {};
  const processo = pl.processo || {};
  const filosofia = pl.filosofia || {};

  const manifestoParagrafi = t(manifesto.testo)
    .split(/\n\s*\n/)
    .filter(Boolean)
    .map(par => `<p>${par.replace(/\n/g, '<br>')}</p>`)
    .join('');

  const filosofiaParagrafi = (t(filosofia.paragrafi) || [])
    .map(par => `<p>${par}</p>`)
    .join('');

  const fasi = processo.fasi || [];
  const stepsHTML = fasi.map((f, i) => `
    <li class="pl-step">
      <span class="pl-step-num">${formatNum(i + 1)}</span>
      <span class="pl-step-label">${t(f)}</span>
    </li>${i < fasi.length - 1 ? '<li class="pl-step-arrow" aria-hidden="true">&#8595;</li>' : ''}
  `).join('');

  return `
    <div class="pl-hero">
      <p class="pl-eyebrow">${t(hero.kicker)}</p>
      <h1 class="pl-hero-titolo">${hero.titolo || 'PLAYLIST'}</h1>
      <p class="pl-hero-sottotitolo">${t(hero.sottotitolo).replace(/\n/g, '<br>')}</p>
    </div>

    <div class="pl-sezione pl-serie">
      <p class="pl-eyebrow">${tu('playlist.laSerie')}${labelVolumiPlaylist()}</p>
      <div class="pl-volumi" id="pl-volumi-grid"></div>
    </div>

    <div class="pl-arrow">↓</div>

    <div class="pl-sezione pl-manifesto">
      <p class="pl-eyebrow">${t(manifesto.eyebrow)}</p>
      <div class="pl-manifesto-testo">${manifestoParagrafi}</div>
    </div>

    <div class="pl-sezione pl-processo">
      <p class="pl-eyebrow">${t(processo.eyebrow)}</p>
      <h2 class="pl-processo-titolo">${t(processo.titolo)}</h2>
      <ol class="pl-processo-steps">${stepsHTML}</ol>
    </div>

    <div class="pl-sezione pl-filosofia">
      <p class="pl-eyebrow">${t(filosofia.eyebrow)}</p>
      <blockquote class="pl-filosofia-citazione">${t(filosofia.citazione)}</blockquote>
      <div class="pl-filosofia-testo">${filosofiaParagrafi}</div>
    </div>
  `;
}

function popolaGrigliaVolumiPlaylist(root) {
  const grid = root.querySelector('#pl-volumi-grid');
  if (!grid) return;
  volumiPlaylist().forEach(pr => {
    const inLavorazione = pr.pubblicato === false;
    const card = crea('div'); card.className = 'pl-volume' + (inLavorazione ? ' in-lavorazione' : '');
    card.innerHTML = `
      <div class="pl-volume-cover"></div>
      <p class="pl-volume-num">PLAYLIST.${numeroVolume(pr.id)} </p>
      <p class="pl-volume-titolo">${t(pr.sottotitolo) || t(pr.titolo)}</p>
      ${inLavorazione ? `<p class="pl-volume-wip">${tu('overlay.inLavorazione')}</p>` : ''}
    `;
    card.querySelector('.pl-volume-cover').appendChild(creaImg(pr.immagine_copertina, t(pr.titolo), false, '(max-width:600px) 50vw, 25vw'));
    if (!inLavorazione) card.addEventListener('click', () => apriProgetto(pr.id));
    grid.appendChild(card);
  });
}

function apriArchivioPlaylist() {
  document.title = `PLAYLIST — francescomartolini.art`;
  window.aggiornaMetaSociale({
    titolo: `PLAYLIST — francescomartolini.art`,
    url: location.origin + '/playlist'
  });
  window.aggiornaJsonLdProgetto(null); // è un indice di volumi, non un'opera singola
  const el = $('pagina-progetto');
  const interno = el.querySelector('.progetto-interno');

  el.style.removeProperty('--pr-bg');
  el.style.removeProperty('--pr-text');
  el.style.removeProperty('--pr-accent');

  if (!_cacheProgetti[ID_CARD_PLAYLIST]) {
    _cacheProgetti[ID_CARD_PLAYLIST] = `
      <button class="progetto-torna" onclick="chiudiProgetto()">${tu('common.torna')}</button>
      <div class="layout-editorial">
        <div class="progetto-body">
          ${generaHTMLArchivioPlaylist()}
        </div>
      </div>`;
  }

  interno.innerHTML = _cacheProgetti[ID_CARD_PLAYLIST];
  el.classList.add('aperta');
  el.scrollTop = 0;
  apriOverlayFocus(el, el.querySelector('.progetto-torna'));

  popolaGrigliaVolumiPlaylist(el);
  rivelaAlloScroll(el, '.pl-sezione, .pl-step');
}

function apriProgetto(id) {
  if (id === ID_CARD_PLAYLIST) { apriArchivioPlaylist(); return; }
  if (id === ID_QCHV) { apriQuelloCheHaiVisto(); return; }
  const pr = stato.progetti.find(p => p.id === id);
  if (!pr || pr.pubblicato === false) return;

  document.title = `${t(pr.titolo)} — francescomartolini.art`;
  window.aggiornaMetaSociale({
    titolo: `${t(pr.titolo)} — francescomartolini.art`,
    descrizione: t(pr.descrizione) || '',
    immagine: pr.immagine_copertina,
    url: location.origin + '/progetti/' + pr.id
  });
  window.aggiornaJsonLdProgetto({
    nome: t(pr.titolo),
    descrizione: t(pr.descrizione) || '',
    immagine: pr.immagine_copertina,
    url: location.origin + '/progetti/' + pr.id,
    anno: (t(pr.anno).match(/\d{4}/) || [])[0]
  });
  const el = $('pagina-progetto');
  const interno = el.querySelector('.progetto-interno');

  // Applica tema colori solo se definito nel JSON (solo desktop)
  const th = pr.theme;
  if (!isMobile() && th) {
    el.style.setProperty('--pr-bg',     th.background || '');
    el.style.setProperty('--pr-text',   th.text       || '');
    el.style.setProperty('--pr-accent', th.accent     || '');
  }

  if (!_cacheProgetti[id]) {
    const layout = pr.layoutType || 'base';
    const hasNamedLayout = ['editorial','magazine','column','archivio','panoramico'].includes(layout);

    // Cover a due colonne solo per i layout con identità visiva definita
    // Per layout base: header semplice come l'originale
    const coverHTML = (hasNamedLayout && pr.immagine_copertina) ? `
      <div class="progetto-cover">
        <div class="progetto-cover-img">
          <img src="${pr.immagine_copertina}" alt="${t(pr.titolo)}" draggable="false" loading="eager">
        </div>
        <div class="progetto-cover-testo">
          <h1 class="progetto-cover-titolo">${t(pr.titolo)}</h1>
          <p class="progetto-cover-anno">${t(pr.anno)}${labelFotoProgetto(pr)}</p>
          <p class="progetto-cover-desc">${t(pr.descrizione)}</p>
          ${pr.link_esterno
            ? `<p style="margin-top:32px;"><a class="link-esterno-btn" href="${pr.link_esterno}" target="_blank" rel="noopener">${t(pr.label_link) || tu('common.vediOnline')}</a></p>`
            : ''}
        </div>
      </div>` : `
      <div class="progetto-interno-header">
        <div>
          <h1 class="progetto-interno-titolo">${t(pr.titolo)}</h1>
          <p class="progetto-interno-anno">${t(pr.anno)}${labelFotoProgetto(pr)}</p>
        </div>
        ${pr.link_esterno ? `<a class="link-esterno-btn" href="${pr.link_esterno}" target="_blank" rel="noopener">${t(pr.label_link) || tu('common.vediOnline')}</a>` : ''}
      </div>`;

    _cacheProgetti[id] = `
      <button class="progetto-torna" onclick="chiudiProgetto()">${tu('common.torna')}</button>
      ${coverHTML}
      <div class="layout-${layout}">
        <div class="progetto-body">
          ${generaContenutoProgetto(pr)}
        </div>
      </div>
      ${isVolumePlaylist(pr) ? generaBloccoVolumePlaylist(pr) : generaBloccoNavigazioneProgetto(pr)}`;
  }

  interno.innerHTML = _cacheProgetti[id];
  el.classList.add('aperta');
  el.scrollTop = 0;
  apriOverlayFocus(el, el.querySelector('.progetto-torna'));

  // Scroll reveal
  avviaReveal(el);
  if (isVolumePlaylist(pr)) rivelaAlloScroll(el, '.pl-acquista, .progetto-nav');
  else rivelaAlloScroll(el, '.progetto-nav');

  // Immagine sticky per layout archivio
  if ((pr.layoutType || '') === 'archivio') {
    avviaScrollArchivio(el, pr);
  }

  // Sezioni Spotify: embed + carosello foto legato al brano in play
  avviaSpotifySections(el);
}

function generaImgHTML(item, altFallback) {
  const { src, alt } = normalizzaImg(item, altFallback);
  return `<div class="progetto-galleria-img"><img src="${src}" alt="${escapeAttr(alt)}" draggable="false" loading="lazy"></div>`;
}

function generaContenutoProgetto(pr) {
  // Supporta sia il vecchio schema (contenuto[]) sia il nuovo (sections[])
  const usaSections = Array.isArray(pr.sections) && pr.sections.length > 0;

  if (usaSections) {
    // ── Schema nuovo: sections[] ──
    return pr.sections.map(s => {
      switch (s.type) {
        case 'text':
          return `<div class="section-text">${
            (s.content || '').split('\n\n').map(p =>
              p.trim() ? `<p>${p.replace(/\n/g, '<br>')}</p>` : ''
            ).join('')
          }</div>`;
        case 'image':
          return `<div class="section-image${s.fullscreen ? ' fullscreen' : ''}" ${pr.layoutType === 'archivio' ? `data-archivio-img="${s.src}"` : ''}>
            <img src="${t(s.src)}" alt="${escapeAttr(t(s.alt) || t(pr.titolo))}" draggable="false" loading="lazy">
          </div>`;
        case 'imageText':
          return `<div class="section-imagetext ${s.position === 'right' ? 'position-right' : 'position-left'}">
            <img src="${t(s.image)}" alt="${escapeAttr(t(s.alt) || t(pr.titolo))}" draggable="false" loading="lazy">
            <div class="section-imagetext-content">${(s.content || '').replace(/\n/g, '<br>')}</div>
          </div>`;
        case 'gallery':
          return `<div class="section-gallery">${
            (s.images || []).map(item => {
              const { src, alt } = normalizzaImg(item, t(pr.titolo));
              return `<div class="gallery-img"><img src="${src}" alt="${escapeAttr(alt)}" draggable="false" loading="lazy"></div>`;
            }).join('')
          }</div>`;
        case 'quote':
          return `<blockquote class="section-quote">${t(s.content) || ''}</blockquote>`;
        case 'embed':
          return generaEmbedHTML(s);
        case 'map': {
          const msrc = s.url || (s.lat && s.lng ? `https://maps.google.com/maps?q=${s.lat},${s.lng}&z=${s.zoom || 13}&output=embed` : '');
          if (!msrc) return '';
          return `<div class="section-map">
            ${s.label ? `<p class="section-map-label">${t(s.label)}</p>` : ''}
            <iframe src="${t(msrc)}" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
          </div>`;
        }
        default: return '';
      }
    }).join('');
  }

  // ── Schema vecchio: contenuto[] ──
  const layout = pr.layoutType || 'base';

  // Per layout archivio: prima immagine va nella colonna sticky, le altre come marker
  if (layout === 'archivio') {
    const immagini = [pr.immagine_copertina, ...(pr.galleria || [])].filter(Boolean);
    const primaImg = immagini[0] || '';
    let html = '';

    if (!pr.contenuto) {
      html += `<div class="archivio-colonna-testo">
        <div class="section-text"><p>${(t(pr.testo_lungo) || '').replace(/\n/g, '<br>')}</p></div>
        ${generaMappaHTML(pr)}
        ${(pr.galleria || []).slice(1).map(item => {
          const { src, alt } = normalizzaImg(item, t(pr.titolo));
          return `<div class="section-image" data-archivio-img="${src}">
            <img src="${src}" alt="${escapeAttr(alt)}" draggable="false" loading="lazy">
          </div>`;
        }).join('')}
      </div>
      <div class="archivio-colonna-img">
        <img id="archivio-sticky-img" class="archivio-img-principale" src="${primaImg}" alt="${t(pr.titolo)}" draggable="false">
      </div>
      <div class="archivio-footer-tipografico">
        <span>francescomartolini.art</span>
        <span>${t(pr.titolo).toUpperCase()}</span>
        <span>${t(pr.anno)}</span>
      </div>`;
      return html;
    }

    // Ha contenuto[]
    let colonnaHTML = '';
    pr.contenuto.forEach(b => {
      switch (b.tipo) {
        case 'titolo':
          colonnaHTML += `<h3 class="section-titolo-interno">${t(b.valore)}</h3>`; break;
        case 'testo':
          colonnaHTML += `<div class="section-text">${
            t(b.valore).split('\n\n').map(p => p.trim() ? `<p>${p.replace(/\n/g, '<br>')}</p>` : '').join('')
          }</div>`; break;
        case 'immagine': {
          const { src, alt } = normalizzaImg(b.valore, t(pr.titolo));
          colonnaHTML += `<div class="section-image" data-archivio-img="${src}">
            <img src="${src}" alt="${escapeAttr(alt)}" draggable="false" loading="lazy">
          </div>`; break;
        }
        case 'mappa':
          colonnaHTML += generaMappaHTML(pr); break;
        case 'spotify':
          colonnaHTML += generaSpotifyHTML(b.valore); break;
        case 'embed':
          colonnaHTML += generaEmbedHTML(b.valore); break;
        case 'nota':
          colonnaHTML += `<p class="section-nota">${t(b.valore)}</p>`; break;
        case 'separatore':
          colonnaHTML += `<hr class="progetto-separatore">`; break;
      }
    });
    if (pr.galleria?.length) {
      pr.galleria.forEach(item => {
        const { src, alt } = normalizzaImg(item, t(pr.titolo));
        colonnaHTML += `<div class="section-image" data-archivio-img="${src}">
          <img src="${src}" alt="${escapeAttr(alt)}" draggable="false" loading="lazy">
        </div>`;
      });
    }

    return `<div class="archivio-colonna-testo">${colonnaHTML}</div>
      <div class="archivio-colonna-img">
        <img id="archivio-sticky-img" class="archivio-img-principale" src="${primaImg}" alt="${t(pr.titolo)}" draggable="false">
      </div>
      <div class="archivio-footer-tipografico">
        <span>francescomartolini.art</span>
        <span>${t(pr.titolo).toUpperCase()}</span>
        <span>${t(pr.anno)}</span>
      </div>`;
  }

  // Per tutti gli altri layout: mappa blocchi al sistema section-*
  if (!pr.contenuto) {
    const galleria = (pr.galleria || []).map(item =>
      `<div class="gallery-img">${generaImgHTML(item, t(pr.titolo))}</div>`
    ).join('');
    return `
      <div class="section-text"><p>${(t(pr.testo_lungo) || '').replace(/\n/g, '<br>')}</p></div>
      ${generaMappaHTML(pr)}
      ${galleria ? `<div class="section-gallery">${galleria}</div>` : ''}`;
  }

  const blocchi = pr.contenuto.map(b => {
    switch (b.tipo) {
      case 'titolo':
        return `<h3 class="section-titolo-interno">${t(b.valore)}</h3>`;
      case 'testo':
        return `<div class="section-text">${
          t(b.valore).split('\n\n').map(p => p.trim() ? `<p>${p.replace(/\n/g, '<br>')}</p>` : '').join('')
        }</div>`;
      case 'immagine': {
        const { src, alt } = normalizzaImg(b.valore, t(pr.titolo));
        return `<div class="section-image"><img src="${src}" alt="${escapeAttr(alt)}" draggable="false" loading="lazy"></div>`;
      }
      case 'galleria': {
        const imgs = (Array.isArray(b.valore) ? b.valore : [b.valore])
          .map(item => `<div class="gallery-img">${generaImgHTML(item, t(pr.titolo))}</div>`).join('');
        return `<div class="section-gallery">${imgs}</div>`;
      }
      case 'mappa': return generaMappaHTML(pr);
      case 'spotify': return generaSpotifyHTML(b.valore);
      case 'embed': return generaEmbedHTML(b.valore);
      case 'nota': return `<p class="section-nota">${t(b.valore)}</p>`;
      case 'separatore': return `<hr class="progetto-separatore">`;
      default: return '';
    }
  }).join('');

  const galleriaExtra = pr.galleria?.length
    ? `<div class="section-gallery">${pr.galleria.map(item => `<div class="gallery-img">${generaImgHTML(item, t(pr.titolo))}</div>`).join('')}</div>`
    : '';

  return blocchi + galleriaExtra;
}

function generaMappaHTML(pr) {
  if (!pr.mappa) return '';
  const label = t(pr.mappa.label) || tu('common.luogo');
  let src = pr.mappa.url || '';
  if (!src && pr.mappa.lat && pr.mappa.lng)
    src = `https://maps.google.com/maps?q=${pr.mappa.lat},${pr.mappa.lng}&z=${pr.mappa.zoom || 13}&output=embed`;
  if (!src) return '';
  return `<div class="section-map">
    <p class="section-map-label">${label}</p>
    <iframe src="${src}" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
  </div>`;
}

function generaEmbedHTML(v) {
  // Blocco iframe generico: YouTube, Vimeo, SoundCloud, o qualsiasi embed esterno.
  // Schema: { url, label?, ratio? } — ratio tipo "16:9", "4:3", "1:1" (default vuoto)
  if (!v || !v.url) return '';
  const src = t(v.url);
  const label = t(v.label) || '';
  const ratio = (v.ratio || '').replace(':', '/');
  return `<div class="section-embed">
    ${label ? `<p class="section-embed-label">${label}</p>` : ''}
    <div class="section-embed-frame" style="aspect-ratio:${ratio};">
      <iframe src="${src}" title="${label || 'Contenuto incorporato'}" loading="lazy" allow="fullscreen; autoplay; encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="no-referrer-when-downgrade"></iframe>
    </div>
  </div>`;
}

function generaSpotifyHTML(v) {
  if (!v || !v.playlistId) return '';
  const tracksJSON = JSON.stringify(v.tracks || []).replace(/"/g, '&quot;');
  const embedId = 'spotify-embed-' + Math.random().toString(36).slice(2, 9);
  return `<div class="section-spotify" data-tracks="${tracksJSON}">
    <div class="spotify-carosello" hidden>
      <img class="spotify-carosello-img" alt="">
    </div>
    <div class="spotify-embed-holder" id="${embedId}" data-spotify-playlist="${t(v.playlistId)}"></div>
  </div>`;
}

function chiudiProgetto() {
  const el = $('pagina-progetto');
  el.classList.remove('aperta');
  chiudiOverlayFocus(el);
  el.style.removeProperty('--pr-bg');
  el.style.removeProperty('--pr-text');
  el.style.removeProperty('--pr-accent');
  if (el._scrollHandler) {
    el.removeEventListener('scroll', el._scrollHandler);
    el._scrollHandler = null;
  }
  document.title = TITOLO_DEFAULT;
  window.aggiornaMetaSociale();
  window.aggiornaJsonLdProgetto(null);
}

// ════════════════════════════════
// "QUELLO CHE HAI VISTO" — archivio di sguardi
// Vive dentro #pagina-progetto come un progetto qualunque (vedi
// apriProgetto/ID_QCHV in libro-nucleo.js) ma con rendering interamente
// dedicato: hero tipografico → archivio di frammenti (json/quello-che-
// hai-visto.json) → dettaglio contributo → invito a partecipare → form
// "Mostralo" → conferma. Nessun URL profondo per singolo contributo in
// questa versione (V1): si naviga solo dentro l'overlay del progetto.
// ════════════════════════════════

const QCHV_ENDPOINT = '/mostralo';
const QCHV_MAX_FOTO = 3;
const QCHV_MAX_MB = 8;

let _qchvContributoIdx = -1;
let _qchvFotoIdx = 0;
let _qchvUltimoFocus = null;

// Scorciatoia dal footer/fin: per chi arriva già sapendo di voler
// partecipare, salta la cerimonia dell'hero e va dritto al form. Riusa la
// stessa transizione "Mostramelo" (click simulato) invece di duplicarne
// la logica.
function vaiAMostraloQCHV() {
  apriQuelloCheHaiVisto();
  requestAnimationFrame(() => {
    $('qchv-btn-invito')?.click();
    setTimeout(apriFormQCHV, 550);
  });
}

function apriQuelloCheHaiVisto() {
  const pr = stato.progetti.find(p => p.id === ID_QCHV) || { titolo: 'Quello che Hai Visto', descrizione: '' };

  document.title = `${t(pr.titolo)} — francescomartolini.art`;
  window.aggiornaMetaSociale({
    titolo: `${t(pr.titolo)} — francescomartolini.art`,
    descrizione: t(pr.descrizione) || '',
    immagine: pr.immagine_copertina,
    url: location.origin + '/progetti/' + ID_QCHV
  });
  window.aggiornaJsonLdProgetto({
    nome: t(pr.titolo),
    descrizione: t(pr.descrizione) || '',
    immagine: pr.immagine_copertina,
    url: location.origin + '/progetti/' + ID_QCHV
  });

  const el = $('pagina-progetto');
  const interno = el.querySelector('.progetto-interno');
  el.style.removeProperty('--pr-bg');
  el.style.removeProperty('--pr-text');
  el.style.removeProperty('--pr-accent');

  interno.innerHTML = `
    <button class="progetto-torna" onclick="chiudiProgetto()">${tu('common.torna')}</button>
    <div class="qchv-pagina" id="qchv-pagina">

      <section class="qchv-hero" id="qchv-hero">
        <p class="qchv-hero-riga">${tu('qchv.heroRigo1')}</p>
        <p class="qchv-hero-riga">${tu('qchv.heroRigo2')}</p>
        <p class="qchv-hero-riga">${tu('qchv.heroRigo3')}</p>
        <p class="qchv-hero-nota">${tu('qchv.heroNota')}</p>
        <button type="button" class="qchv-hero-invito" id="qchv-btn-invito">${tu('qchv.heroInvito')}</button>
      </section>

      <section class="qchv-archivio" id="qchv-archivio" hidden>
        <div class="qchv-griglia" id="qchv-griglia"></div>
        <div class="qchv-cta">
          <h2 class="qchv-cta-titolo">${tu('qchv.invitoTitolo')}</h2>
          <p class="qchv-cta-sottotitolo">${tu('qchv.invitoSottotitolo')}</p>
          <button type="button" class="qchv-cta-btn" id="qchv-btn-form">${tu('qchv.mostralo')}</button>
        </div>
      </section>

      <div class="qchv-dettaglio" id="qchv-dettaglio" aria-hidden="true">
        <button type="button" class="qchv-dettaglio-chiudi" id="qchv-dettaglio-chiudi" aria-label="${tu('qchv.chiudi')}">×</button>
        <div class="qchv-dettaglio-corpo" id="qchv-dettaglio-corpo"></div>
      </div>

      <div class="qchv-form-overlay" id="qchv-form-overlay" aria-hidden="true">
        <button type="button" class="qchv-form-chiudi" id="qchv-form-chiudi" aria-label="${tu('qchv.chiudi')}">×</button>
        <div class="qchv-form-corpo">
          <p class="qchv-form-intro">${tu('qchv.formIntro')}</p>
          <form id="qchv-form" novalidate>
            <p class="qchv-form-sezione">${tu('qchv.formChiSezione')}</p>
            <label class="qchv-campo">
              <span>${tu('qchv.formNome')}</span>
              <input type="text" name="nome" required maxlength="80">
            </label>
            <label class="qchv-campo">
              <span>${tu('qchv.formInstagram')}</span>
              <input type="text" name="instagram" maxlength="80">
            </label>
            <label class="qchv-campo">
              <span>${tu('qchv.formEmail')}</span>
              <input type="email" name="email" required maxlength="200">
            </label>

            <p class="qchv-form-sezione">${tu('qchv.formDoveSezione')}</p>
            <label class="qchv-campo">
              <span>${tu('qchv.formLuogo')}</span>
              <input type="text" name="luogo" required maxlength="80">
            </label>
            <label class="qchv-campo">
              <span>${tu('qchv.formAnno')}</span>
              <input type="text" name="anno" required inputmode="numeric" pattern="[0-9]{4}" maxlength="4">
            </label>

            <p class="qchv-form-sezione">${tu('qchv.formCosaSezione')}</p>
            <label class="qchv-campo">
              <textarea name="testo" required maxlength="500" rows="4" placeholder="${tu('qchv.formCosaPlaceholder')}"></textarea>
            </label>

            <p class="qchv-form-sezione">${tu('qchv.formFotoSezione')}</p>
            <p class="qchv-form-foto-nota">${tu('qchv.formFotoNota')}</p>
            <label class="qchv-campo-file" id="qchv-campo-file">
              <input type="file" name="foto" accept="image/png,image/jpeg,image/webp" multiple id="qchv-input-file">
              <span id="qchv-input-file-label">${tu('qchv.formFotoAggiungi')}</span>
            </label>
            <div class="qchv-anteprime" id="qchv-anteprime"></div>

            <!-- honeypot anti-spam: invisibile agli utenti reali, mai valorizzato -->
            <label class="qchv-honeypot" aria-hidden="true">
              Sito web
              <input type="text" name="sito_web" tabindex="-1" autocomplete="off">
            </label>

            <label class="qchv-consenso">
              <input type="checkbox" name="consenso" required>
              <span>${tu('qchv.formConsenso')}</span>
            </label>

            <p class="qchv-form-errore" id="qchv-form-errore" hidden></p>

            <button type="submit" class="qchv-form-invia" id="qchv-form-invia">${tu('qchv.formInvia')}</button>
          </form>
        </div>
      </div>

      <div class="qchv-conferma" id="qchv-conferma" aria-hidden="true">
        <h2 class="qchv-conferma-titolo">${tu('qchv.confermaTitolo')}</h2>
        <p class="qchv-conferma-testo">${tu('qchv.confermaTesto')}</p>
        <button type="button" class="qchv-conferma-torna" id="qchv-conferma-torna">${tu('qchv.confermaTorna')}</button>
      </div>

    </div>`;

  el.classList.add('aperta');
  el.scrollTop = 0;
  apriOverlayFocus(el, el.querySelector('.progetto-torna'));

  popolaGrigliaQCHV();
  avviaInterazioniQCHV(el);
}

function popolaGrigliaQCHV() {
  const griglia = $('qchv-griglia');
  griglia.innerHTML = '';
  const contributi = stato.qchv || [];

  if (!contributi.length) {
    griglia.innerHTML = `<p class="qchv-griglia-vuota">${tu('qchv.archivioVuoto')}</p>`;
    return;
  }

  contributi.forEach((c, i) => {
    const frammento = crea('div');
    frammento.className = 'qchv-frammento qchv-frammento--' + String.fromCharCode(97 + (i % 5));
    frammento.setAttribute('role', 'button');
    frammento.setAttribute('tabindex', '0');
    const primaFoto = (c.images && c.images[0]) || '';
    const alt = `${tu('qchv.vistoDa')} ${escapeAttr(c.author || '')}`;
    const wrap = crea('div'); wrap.className = 'qchv-frammento-img';
    wrap.appendChild(creaImg(primaFoto, alt, false, '(max-width:900px) 50vw, 25vw'));
    frammento.appendChild(wrap);

    const meta = crea('div'); meta.className = 'qchv-frammento-meta';
    meta.innerHTML = `<span>${escapeAttr(c.location || '')}</span><span>${escapeAttr(c.year || '')}</span>`;
    frammento.appendChild(meta);

    const apri = () => apriDettaglioQCHV(i);
    frammento.addEventListener('click', apri);
    frammento.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); apri(); } });

    griglia.appendChild(frammento);
  });
}

function avviaInterazioniQCHV(overlayEl) {
  // Hero → rivela l'archivio (una tantum, animazione lenta e non ripetuta)
  const btnInvito = $('qchv-btn-invito');
  btnInvito.addEventListener('click', () => {
    $('qchv-hero').classList.add('qchv-hero--uscita');
    const archivio = $('qchv-archivio');
    archivio.hidden = false;
    requestAnimationFrame(() => archivio.classList.add('qchv-archivio--visibile'));
    setTimeout(() => { $('qchv-hero').hidden = true; }, 500);
  });

  // Dettaglio contributo
  $('qchv-dettaglio-chiudi').addEventListener('click', chiudiDettaglioQCHV);
  overlayEl.removeEventListener('keydown', escQCHV); // evita accumulo tra aperture ripetute
  overlayEl.addEventListener('keydown', escQCHV);

  // Form
  $('qchv-btn-form').addEventListener('click', apriFormQCHV);
  $('qchv-form-chiudi').addEventListener('click', chiudiFormQCHV);
  $('qchv-form').addEventListener('submit', inviaFormQCHV);
  $('qchv-input-file').addEventListener('change', anteprimaFotoQCHV);
  $('qchv-conferma-torna').addEventListener('click', () => {
    $('qchv-conferma').classList.remove('qchv-conferma--visibile');
    $('qchv-conferma').setAttribute('aria-hidden', 'true');
  });
}

function escQCHV(e) {
  if (e.key !== 'Escape') return;
  if ($('qchv-dettaglio').classList.contains('qchv-dettaglio--aperto')) chiudiDettaglioQCHV();
  else if ($('qchv-form-overlay').classList.contains('qchv-form-overlay--aperto')) chiudiFormQCHV();
}

// ── Dettaglio di un contributo (fino a 3 foto, navigazione interna) ──
function apriDettaglioQCHV(i) {
  const c = (stato.qchv || [])[i];
  if (!c) return;
  _qchvContributoIdx = i;
  _qchvFotoIdx = 0;
  _qchvUltimoFocus = document.activeElement;
  renderDettaglioQCHV();
  const el = $('qchv-dettaglio');
  el.classList.add('qchv-dettaglio--aperto');
  el.setAttribute('aria-hidden', 'false');
  el.querySelector('.qchv-dettaglio-chiudi').focus();
}

function renderDettaglioQCHV() {
  const c = (stato.qchv || [])[_qchvContributoIdx];
  if (!c) return;
  const foto = (c.images && c.images.length) ? c.images : [''];
  if (_qchvFotoIdx >= foto.length) _qchvFotoIdx = foto.length - 1;
  if (_qchvFotoIdx < 0) _qchvFotoIdx = 0;

  const corpo = $('qchv-dettaglio-corpo');
  corpo.innerHTML = '';
  corpo.appendChild(creaImg(foto[_qchvFotoIdx], `${tu('qchv.vistoDa')} ${escapeAttr(c.author || '')}`, true));

  const testo = crea('div'); testo.className = 'qchv-dettaglio-testo';
  testo.innerHTML = `
    <p class="qchv-dettaglio-eyebrow">${tu('qchv.eyebrow')}</p>
    <p class="qchv-dettaglio-luogo">${escapeAttr(c.location || '')}${c.year ? ', ' + escapeAttr(c.year) : ''}</p>
    <p class="qchv-dettaglio-autore">${escapeAttr(c.author || '')}</p>
    ${c.text ? `<p class="qchv-dettaglio-citazione">“${escapeAttr(c.text)}”</p>` : ''}
  `;
  corpo.appendChild(testo);

  if (foto.length > 1) {
    const nav = crea('div'); nav.className = 'qchv-dettaglio-nav';
    const prec = crea('button'); prec.type = 'button'; prec.className = 'qchv-dettaglio-prec';
    prec.textContent = tu('qchv.precedente'); prec.disabled = _qchvFotoIdx === 0;
    prec.addEventListener('click', () => { _qchvFotoIdx--; renderDettaglioQCHV(); });
    const succ = crea('button'); succ.type = 'button'; succ.className = 'qchv-dettaglio-succ';
    succ.textContent = tu('qchv.successiva'); succ.disabled = _qchvFotoIdx === foto.length - 1;
    succ.addEventListener('click', () => { _qchvFotoIdx++; renderDettaglioQCHV(); });
    nav.appendChild(prec); nav.appendChild(succ);
    corpo.appendChild(nav);
  }
}

function chiudiDettaglioQCHV() {
  const el = $('qchv-dettaglio');
  el.classList.remove('qchv-dettaglio--aperto');
  el.setAttribute('aria-hidden', 'true');
  if (_qchvUltimoFocus && document.contains(_qchvUltimoFocus)) _qchvUltimoFocus.focus();
}

// ── Form "Mostralo" ──
function apriFormQCHV() {
  _qchvUltimoFocus = document.activeElement;
  const el = $('qchv-form-overlay');
  el.classList.add('qchv-form-overlay--aperto');
  el.setAttribute('aria-hidden', 'false');
  el.querySelector('.qchv-form-chiudi').focus();
}

function chiudiFormQCHV() {
  const el = $('qchv-form-overlay');
  el.classList.remove('qchv-form-overlay--aperto');
  el.setAttribute('aria-hidden', 'true');
  if (_qchvUltimoFocus && document.contains(_qchvUltimoFocus)) _qchvUltimoFocus.focus();
}

function anteprimaFotoQCHV() {
  const input = $('qchv-input-file');
  const anteprime = $('qchv-anteprime');
  const errore = $('qchv-form-errore');
  anteprime.innerHTML = '';
  errore.hidden = true;

  let file = Array.from(input.files || []);
  if (file.length > QCHV_MAX_FOTO) {
    errore.textContent = tu('qchv.formErroreFoto');
    errore.hidden = false;
    file = file.slice(0, QCHV_MAX_FOTO);
  }
  const troppoGrande = file.some(f => f.size > QCHV_MAX_MB * 1024 * 1024);
  if (troppoGrande) {
    errore.textContent = tu('qchv.formErroreFoto');
    errore.hidden = false;
  }

  file.forEach(f => {
    const img = crea('img'); img.className = 'qchv-anteprima-img';
    img.src = URL.createObjectURL(f);
    img.alt = '';
    anteprime.appendChild(img);
  });
}

async function inviaFormQCHV(e) {
  e.preventDefault();
  const form = $('qchv-form');
  const errore = $('qchv-form-errore');
  const bottone = $('qchv-form-invia');
  errore.hidden = true;

  if (!form.checkValidity()) {
    errore.textContent = tu('qchv.formErroreCampi');
    errore.hidden = false;
    form.reportValidity();
    return;
  }

  const fileInput = $('qchv-input-file');
  const file = Array.from(fileInput.files || []);
  if (file.length > QCHV_MAX_FOTO || file.some(f => f.size > QCHV_MAX_MB * 1024 * 1024)) {
    errore.textContent = tu('qchv.formErroreFoto');
    errore.hidden = false;
    return;
  }

  const dati = new FormData(form);
  // Il campo honeypot ("sito_web") viaggia col resto: se valorizzato, il
  // Worker scarta silenziosamente la richiesta (vedi worker/mostralo.js).

  bottone.disabled = true;
  const testoOriginale = bottone.textContent;
  bottone.textContent = tu('qchv.formInvio');

  try {
    const risposta = await fetch(QCHV_ENDPOINT, { method: 'POST', body: dati });
    if (!risposta.ok) throw new Error('HTTP ' + risposta.status);

    form.reset();
    $('qchv-anteprime').innerHTML = '';
    chiudiFormQCHV();
    const conferma = $('qchv-conferma');
    conferma.classList.add('qchv-conferma--visibile');
    conferma.setAttribute('aria-hidden', 'false');
  } catch (err) {
    errore.textContent = tu('qchv.formErroreGenerico');
    errore.hidden = false;
  } finally {
    bottone.disabled = false;
    bottone.textContent = testoOriginale;
  }
}

// ── Taccuino archivio ──
let _cacheTaccuino = null;

function apriTaccuino(idVoce) {
  const el = $('pagina-taccuino-archivio');
  const interno = el.querySelector('.taccuino-archivio-interno');

  document.title = `${tu('menu.taccuino')} — francescomartolini.art`;
  window.aggiornaMetaSociale({
    titolo: `${tu('menu.taccuino')} — francescomartolini.art`,
    url: location.origin + '/taccuino'
  });

  if (!_cacheTaccuino) {
    const voci = stato.taccuino.map(v => {
      const posterAttr = v.foto ? ` poster="${v.foto}"` : '';
      const media = v.video
        ? `<div class="taccuino-voce-foto"><video src="${v.video}" controls playsinline preload="metadata"${posterAttr}></video></div>`
        : (v.foto ? `<div class="taccuino-voce-foto"><img src="${v.foto}" alt="${escapeAttr(altTaccuino(v))}" draggable="false" loading="lazy"></div>` : '');
      const cam = v.camera ? `<p class="taccuino-voce-camera"> ${v.camera}</p>` : '';
      return `<div class="taccuino-voce" data-id="${v.id}" data-testo="${t(v.testo).toLowerCase()}">
        <div class="taccuino-voce-meta">
          <p class="taccuino-voce-data">${formatData(v.data)}</p>
          ${cam}
        </div>
        <div class="taccuino-voce-contenuto">
          <p class="taccuino-voce-frase">${t(v.testo)}</p>
          ${media}
        </div>
      </div>`;
    }).join('');
    _cacheTaccuino = `
      <button class="taccuino-torna" onclick="chiudiTaccuino()">${tu('overlay.chiudi')}</button>
      <h1>${tu('menu.taccuino')}</h1>
      <div class="taccuino-cerca-wrap">
        <input type="search" id="taccuino-cerca" class="taccuino-cerca"
          placeholder="${tu('taccuino_extra.cercaPlaceholder')}" autocomplete="off" spellcheck="false">
        <span id="taccuino-risultati" class="taccuino-risultati"></span>
      </div>
      <div id="taccuino-lista">${voci}</div>
    `;
  }

  interno.innerHTML = _cacheTaccuino;
  const input = $('taccuino-cerca'), lista = $('taccuino-lista'), risultati = $('taccuino-risultati');
  input.addEventListener('input', () => {
    const q = input.value.toLowerCase().trim(); let vis = 0;
    lista.querySelectorAll('.taccuino-voce').forEach(v => {
      const match = !q || v.dataset.testo.includes(q);
      v.style.display = match ? '' : 'none';
      if (match) vis++;
    });
    risultati.textContent = q ? `${vis} ${vis === 1 ? tu('taccuino_extra.risultatoSing') : tu('taccuino_extra.risultatiPlur')}` : '';
  });
  el.classList.add('aperta'); el.scrollTop = 0;
  apriOverlayFocus(el, el.querySelector('.taccuino-torna'));

  // Link diretto a una singola nota (es. da una caption Instagram: si
  // copia/incolla il link, si tocca, si atterra sulla nota, non su un
  // elenco da scorrere). In tal caso non apriamo la tastiera di ricerca:
  // chi arriva da un link vuole leggere quella nota, non cercarne un'altra.
  const voce = idVoce != null
    ? lista.querySelector(`.taccuino-voce[data-id="${CSS.escape(String(idVoce))}"]`)
    : null;

  if (voce) {
    const datiVoce = stato.taccuino.find(v => String(v.id) === String(idVoce));
    if (datiVoce) {
      const testoPiano = t(datiVoce.testo).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      window.aggiornaMetaSociale({
        titolo: `${tu('menu.taccuino')} — francescomartolini.art`,
        descrizione: testoPiano,
        immagine: datiVoce.foto || undefined,
        url: location.origin + '/taccuino/' + datiVoce.id
      });
      window.aggiornaJsonLdProgetto({
        nome: testoPiano.length > 80 ? testoPiano.slice(0, 80) + '…' : testoPiano,
        descrizione: testoPiano,
        immagine: datiVoce.foto || undefined,
        url: location.origin + '/taccuino/' + datiVoce.id,
        anno: (datiVoce.data || '').slice(0, 4) || undefined
      });
    }
    setTimeout(() => {
      voce.scrollIntoView({ block: 'center' });
      voce.classList.add('evidenziata');
      voce.addEventListener('animationend', () => voce.classList.remove('evidenziata'), { once: true });
    }, 300);
  } else {
    setTimeout(() => input.focus(), 300);
  }
}

function chiudiTaccuino() {
  const el = $('pagina-taccuino-archivio');
  el.classList.remove('aperta');
  chiudiOverlayFocus(el);
  document.title = TITOLO_DEFAULT;
  window.aggiornaMetaSociale();
  window.aggiornaJsonLdProgetto(null);
}

// ── Nav mobile ──
function navigaA(idx) {
  if (!isMobile()) return;
  if (stato.inTransizione || idx < 0 || idx >= stato.totPagine || idx === stato.paginaCorrente) return;
  stato.inTransizione = true;
  const pagine = document.querySelectorAll('.page, .pagina-progetto-mobile');
  // Idrata la pagina di destinazione (garanzia, se lo swipe/salto arriva
  // prima che l'idratazione in background l'abbia già coperta) e la
  // successiva, per uno sfogliare in avanti sempre fluido.
  idrata(pagine[idx]);
  idrata(pagine[idx + 1]);
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
