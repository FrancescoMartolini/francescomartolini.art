/* ============================================
   LIBRO ENGINE — routing
Apertura/chiusura degli overlay (progetto, taccuino, sezioni, archivio playlist),
generazione del contenuto di un progetto, interpretazione dell'URL d'arrivo,
navigazione fra le pagine del libro (navigaA).
Dipende da libro-nucleo.js.
   ============================================ */

'use strict';



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
}

function chiudiPagina() {
  $('overlay-pagina').classList.remove('aperta');
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

  popolaGrigliaVolumiPlaylist(el);
  rivelaAlloScroll(el, '.pl-sezione, .pl-step');
}

function apriProgetto(id) {
  if (id === ID_CARD_PLAYLIST) { apriArchivioPlaylist(); return; }
  const pr = stato.progetti.find(p => p.id === id);
  if (!pr || pr.pubblicato === false) return;

  document.title = `${t(pr.titolo)} — francescomartolini.art`;
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

function generaImgHTML(src, titolo) {
  return `<div class="progetto-galleria-img"><img src="${src}" alt="${titolo}" draggable="false" loading="lazy"></div>`;
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
            <img src="${t(s.src)}" alt="${t(pr.titolo)}" draggable="false" loading="lazy">
          </div>`;
        case 'imageText':
          return `<div class="section-imagetext ${s.position === 'right' ? 'position-right' : 'position-left'}">
            <img src="${t(s.image)}" alt="${t(pr.titolo)}" draggable="false" loading="lazy">
            <div class="section-imagetext-content">${(s.content || '').replace(/\n/g, '<br>')}</div>
          </div>`;
        case 'gallery':
          return `<div class="section-gallery">${
            (s.images || []).map(src =>
              `<div class="gallery-img"><img src="${t(src)}" alt="${t(pr.titolo)}" draggable="false" loading="lazy"></div>`
            ).join('')
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
        ${(pr.galleria || []).slice(1).map(src =>
          `<div class="section-image" data-archivio-img="${src}">
            <img src="${src}" alt="${t(pr.titolo)}" draggable="false" loading="lazy">
          </div>`).join('')}
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
        case 'immagine':
          colonnaHTML += `<div class="section-image" data-archivio-img="${b.valore}">
            <img src="${b.valore}" alt="${t(pr.titolo)}" draggable="false" loading="lazy">
          </div>`; break;
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
      pr.galleria.forEach(src => {
        colonnaHTML += `<div class="section-image" data-archivio-img="${src}">
          <img src="${src}" alt="${t(pr.titolo)}" draggable="false" loading="lazy">
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
    const galleria = (pr.galleria || []).map(src =>
      `<div class="gallery-img">${generaImgHTML(src, t(pr.titolo))}</div>`
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
      case 'immagine':
        return `<div class="section-image"><img src="${b.valore}" alt="${t(pr.titolo)}" draggable="false" loading="lazy"></div>`;
      case 'galleria': {
        const imgs = (Array.isArray(b.valore) ? b.valore : [b.valore])
          .map(src => `<div class="gallery-img">${generaImgHTML(src, t(pr.titolo))}</div>`).join('');
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
    ? `<div class="section-gallery">${pr.galleria.map(src => `<div class="gallery-img">${generaImgHTML(src, t(pr.titolo))}</div>`).join('')}</div>`
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
  el.style.removeProperty('--pr-bg');
  el.style.removeProperty('--pr-text');
  el.style.removeProperty('--pr-accent');
  if (el._scrollHandler) {
    el.removeEventListener('scroll', el._scrollHandler);
    el._scrollHandler = null;
  }
  document.title = TITOLO_DEFAULT;
}

// ── Taccuino archivio ──
let _cacheTaccuino = null;

function apriTaccuino(idVoce) {
  const el = $('pagina-taccuino-archivio');
  const interno = el.querySelector('.taccuino-archivio-interno');

  document.title = `${tu('menu.taccuino')} — francescomartolini.art`;

  if (!_cacheTaccuino) {
    const voci = stato.taccuino.map(v => {
      const posterAttr = v.foto ? ` poster="${v.foto}"` : '';
      const media = v.video
        ? `<div class="taccuino-voce-foto"><video src="${v.video}" controls playsinline preload="metadata"${posterAttr}></video></div>`
        : (v.foto ? `<div class="taccuino-voce-foto"><img src="${v.foto}" alt="" draggable="false" loading="lazy"></div>` : '');
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

  // Link diretto a una singola nota (es. da una caption Instagram: si
  // copia/incolla il link, si tocca, si atterra sulla nota, non su un
  // elenco da scorrere). In tal caso non apriamo la tastiera di ricerca:
  // chi arriva da un link vuole leggere quella nota, non cercarne un'altra.
  const voce = idVoce != null
    ? lista.querySelector(`.taccuino-voce[data-id="${CSS.escape(String(idVoce))}"]`)
    : null;

  if (voce) {
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
  $('pagina-taccuino-archivio').classList.remove('aperta');
  document.title = TITOLO_DEFAULT;
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
