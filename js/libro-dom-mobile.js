/* ============================================
   LIBRO ENGINE — dom-mobile
Costruzione delle pagine del libro mobile (intro, indice, progetti, taccuino
intercalato, intervalli...), idratazione lazy, indicatore di pagina, segnalibro.
Dipende da libro-nucleo.js.
   ============================================ */

'use strict';



// ── Favicon dinamica ──
function aggiorneFavicon(lettera) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#0a0a0a" rx="6"/><text x="16" y="24" font-family="Georgia,serif" font-size="20" font-style="italic" fill="#fafaf8" text-anchor="middle">${lettera}</text></svg>`;
  let link = document.querySelector("link[rel='icon']");
  if (!link) { link = crea('link'); link.rel = 'icon'; document.head.appendChild(link); }
  link.href = 'data:image/svg+xml,' + encodeURIComponent(svg);
}

// ── Header data/ora mobile (riutilizzato ovunque) ──
function creaHeader() {
  const ph = crea('div'); ph.className = 'pagina-header';
  ph.innerHTML = `<div class="data-ora"><div class="data-live"></div><div class="ora-live"></div><div class="ora-label">ORA CORRENTE</div></div>
    <button class="tema-toggle-btn tema-toggle-mobile" aria-label="${tu('nav.temaChiaroScuro') || 'Tema chiaro/scuro'}" data-i18n-attr="aria-label:nav.temaChiaroScuro">
      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
    </button>`;
  return ph;
}

// ── Pagina mobile generica con header ──
function creaPaginaMobile(favicon, titolo) {
  const p = crea('div'); p.className = 'page pagina-progetto-mobile';
  p.dataset.favicon = favicon; p.dataset.titolo = titolo;
  return p;
}

// ── Wrapper mobile-page-content con header ──
function creaMobilePageContent() {
  const mpc = crea('div'); mpc.className = 'mobile-page-content';
  mpc.appendChild(creaHeader());
  const pc = crea('div'); pc.className = 'pagina-corpo';
  mpc.appendChild(pc);
  return { mpc, pc };
}

// ── Media (foto o video) di una voce taccuino ──
// Se la voce ha un video, ha priorità sulla foto (che può comunque
// diventarne il poster). Nessun autoplay: coerente col ritmo lento
// e silenzioso del libro — parte solo se il visitatore lo avvia.
function creaMediaTaccuino(v, wrapClass) {
  if (v.video) {
    const fw = crea('div'); fw.className = wrapClass;
    const video = crea('video');
    video.src = v.video;
    video.controls = true;
    video.playsInline = true;
    video.preload = 'metadata';
    if (v.foto) video.poster = v.foto;
    fw.appendChild(video);
    return fw;
  }
  if (v.foto) {
    const fw = crea('div'); fw.className = wrapClass;
    const img = crea('img'); img.src = v.foto; img.alt = ''; img.draggable = false;
    fw.appendChild(img);
    return fw;
  }
  return null;
}

// ── Voce taccuino mobile ──
// Guscio subito, contenuto (foto/video/testo) idratato quando serve:
// il Taccuino è pensato per crescere continuamente nel tempo, quindi
// è il punto dove il costo di costruzione eager si sente di più.
function creaPaginaTaccuinoMobile(v) {
  const pt = creaPaginaMobile('T', 'Taccuino');

  registraIdratazione(pt, () => {
    const { mpc, pc } = creaMobilePageContent();
    const tw = crea('div'); tw.className = 'taccuino-wrap';
      tw.style.overflowY = 'auto';
      tw.style.maxHeight = '80vh';
    const media = creaMediaTaccuino(v, 'taccuino-foto');
    if (media) tw.appendChild(media);
    tw.innerHTML += `<p class="taccuino-frase">${t(v.testo)}</p>${v.camera ? `<p class="taccuino-voce-camera"> ${v.camera}</p><p class="taccuino-data">${formatData(v.data)}</p>` : ''}`;
    pc.appendChild(tw); pt.appendChild(mpc);
  });

  return pt;
}

// ── Inserisci voce taccuino intercalata ──
function inserisciTaccuinoSeDisponibile(container, tIdx) {
  if (stato.taccuino[tIdx]) {
    container.appendChild(creaPaginaTaccuinoMobile(stato.taccuino[tIdx]));
    return tIdx + 1;
  }
  return tIdx;
}

// ════════════════════════════════
// IDRATAZIONE PROGRESSIVA DELLE PAGINE MOBILE
// ════════════════════════════════
// Problema: costruisciMobile() creava subito nel DOM il contenuto
// completo (immagini, testo, bottoni, listener) di ogni pagina del
// libro. Corretto finché i "capitoli" sono pochi, ma il lavoro JS
// cresce linearmente con ogni nuovo progetto/intervallo/voce di
// taccuino aggiunta — con 30+ capitoli diventerebbe un caricamento
// pesante fin dal primo avvio, anche se il lettore sfoglia solo le
// prime pagine.
//
// Soluzione: separare GUSCIO da CONTENUTO.
// - Il guscio (creaPaginaMobile: div.page con favicon/titolo in
//   dataset) resta sempre sincrono e completo per TUTTE le pagine,
//   nell'ordine giusto — perché indicatore, scrub, conteggio totale
//   pagine e i salti diretti dall'indice/segnalibro dipendono da un
//   DOM con l'esatto numero di pagine, in ordine, fin da subito.
// - Il contenuto pesante (immagini, testo, bottoni) viene costruito
//   da una funzione "idratante" registrata qui, ed eseguita solo:
//     1) subito per le prime pagine del libro (lettura istantanea);
//     2) in background, un po' alla volta, nei momenti di inattività
//        del browser (requestIdleCallback), per tutte le altre;
//     3) immediatamente, appena richiesto, se il lettore salta con
//        lo swipe/frecce/scrub/indice/segnalibro su una pagina non
//        ancora idratata — così non si vede mai una pagina vuota.
const _idratazione = new Map(); // elemento pagina → funzione che ne costruisce il contenuto

// Registra una pagina-guscio con la sua funzione di idratazione.
function registraIdratazione(pagina, costruisciContenuto) {
  _idratazione.set(pagina, costruisciContenuto);
}

// Costruisce il contenuto di una pagina, se non l'ha già fatto.
function idrata(pagina) {
  if (!pagina || pagina.dataset.idratata === '1') return;
  const fn = _idratazione.get(pagina);
  if (fn) fn();
  pagina.dataset.idratata = '1';
  _idratazione.delete(pagina);
}

const _richiediInattivita = window.requestIdleCallback
  ? window.requestIdleCallback.bind(window)
  : (cb) => setTimeout(() => cb({ timeRemaining: () => 8, didTimeout: true }), 80);

// Idrata in background le pagine rimaste, poche alla volta, senza
// bloccare mai il thread principale (e quindi lo scroll/lo swipe).
function idrataInBackground() {
  if (_idratazione.size === 0) return;
  _richiediInattivita((deadline) => {
    for (const [pagina] of _idratazione) {
      if (!deadline.didTimeout && deadline.timeRemaining() <= 0) break;
      idrata(pagina);
    }
    if (_idratazione.size > 0) idrataInBackground();
  });
}

// Idrata subito le prime N pagine (apertura del libro) + un margine
// di sicurezza attorno a un indice dato, così le prime sfogliate
// sono sempre pronte senza dover attendere l'inattività del browser.
function idrataSubito(pagine, daIdx = 0, margine = 2) {
  const fine = Math.min(pagine.length, daIdx + margine + 1);
  const inizio = Math.max(0, daIdx - margine);
  for (let i = inizio; i < fine; i++) idrata(pagine[i]);
}

// ════════════════════════════════
// MOBILE — Pagina indice
// ════════════════════════════════
function costruisciIndice() {
  const indice = $('indice-mobile');
  const lista = $('indice-lista');
  if (!indice || !lista) return;

  // Voci statiche + progetti dinamici
  const voci = [
    { num: '—',  label: tu('capitoli.introduzione'),  sub: null,               azione: () => { const p = $('intro-mobile'); if (p) navigaA([...document.querySelectorAll('.page, .pagina-progetto-mobile')].indexOf(p)); } },
  ];

  // Progetti pubblicati (include la card PLAYLIST, che apre l'archivio della collana)
  progettiVisualizzati().forEach((pr, i) => {
    if (pr.pubblicato === false) return;
    voci.push({
      num: formatNum(i + 1),
      label: t(pr.titolo),
      sub: t(pr.anno),
      azione: () => {
        if (pr.id === ID_CARD_PLAYLIST) { apriProgetto(ID_CARD_PLAYLIST); return; }
        // Naviga alla pagina capitolo Progetti e poi apre il progetto
        const progettiSection = $('progetti');
        if (progettiSection) {
          const pagine = [...document.querySelectorAll('.page, .pagina-progetto-mobile')];
          navigaA(pagine.indexOf(progettiSection));
        }
        setTimeout(() => apriProgetto(pr.id), 300);
      }
    });
  });

  // Voci fisse finali
  voci.push(
    { num: '—', label: tu('menu.intervalli'), sub: tu('intervalli.descrizione'), azione: () => { const el = $('intervalli'); if (el) navigaA([...document.querySelectorAll('.page, .pagina-progetto-mobile')].indexOf(el)); } },
    { num: '—', label: tu('chiSono.titolo'),   sub: tu('indice.chiSonoSub'), azione: () => { const el = $('chi-sono-capitolo') || $('chi-sono'); if (el) navigaA([...document.querySelectorAll('.page, .pagina-progetto-mobile')].indexOf(el)); } },
    { num: '—', label: tu('menu.taccuino'),   sub: tu('indice.taccuinoSub'), azione: () => { apriTaccuino(); } },
    { num: '—', label: tu('chiSono.pubblicazioniLabel'), sub: '', azione: () => { const el = document.querySelector('#mobile-pubblicazioni-container .page'); if (el) navigaA([...document.querySelectorAll('.page, .pagina-progetto-mobile')].indexOf(el)); }}
  )

  lista.innerHTML = `<p class="indice-titolo">${tu('indice.titolo')}</p>`;

  voci.forEach((v, i) => {
    const riga = crea('div');
    riga.className = 'indice-voce';
    riga.innerHTML = `
      <span class="indice-voce-num">${v.num}</span>
      <div class="indice-voce-destra">
        <span class="indice-voce-label">${v.label}</span>
        ${v.sub ? `<p class="indice-voce-sub">${v.sub}</p>` : ''}
      </div>
    `;
    riga.addEventListener('click', v.azione);
    lista.appendChild(riga);
  });

  // Posizionamento: dopo l'intro (se esiste), altrimenti dopo #home
  const pIntro = $('intro-mobile');
  const homeSection = $('home');
  const riferimento = pIntro || homeSection;
  if (riferimento) {
    riferimento.after(indice);
  }
}

// ════════════════════════════════
// MOBILE — Costruisci pagine
// ════════════════════════════════
function costruisciMobile() {

  // Pagina introduzione
  if (stato.intro?.testo) {
    const pTitoloIntro = crea('div');
    pTitoloIntro.className = 'page mobile-only';
    pTitoloIntro.dataset.favicon = '∙'; pTitoloIntro.dataset.titolo = tu('capitoli.introduzione');
    const { mpc: mpcT, pc: pcT } = creaMobilePageContent();
    pcT.innerHTML = `<div><p class="capitolo-label">${tu('capitolo')} 0</p><h2 class="capitolo-titolo">${tu('capitoli.introduzione')}</h2></div>`;
    pTitoloIntro.appendChild(mpcT);

    const pIntro = crea('div');
    pIntro.className = 'page mobile-only'; pIntro.id = 'intro-mobile';
    pIntro.dataset.favicon = '∙'; pIntro.dataset.titolo = t(stato.intro.titolo) || tu('capitoli.introduzione');
    const { mpc: mpcIntro, pc: pcIntro } = creaMobilePageContent();
    pcIntro.innerHTML = `
      <p class="introduzione-testo">${t(stato.intro.testo).replace(/\n/g, '<br>')}</p>
      <p class="introduzione-firma">${stato.intro.firma}<br><span>${stato.intro.anno}</span></p>
    `;
    pIntro.appendChild(mpcIntro);

    const homeSection = document.querySelector('#main-content #home');
    if (homeSection) { homeSection.after(pIntro); homeSection.after(pTitoloIntro); }
  }

  // Pagina indice (mobile) — inserita dopo intro (ora già nel DOM)
  costruisciIndice();

  // Taccuino prima frase
  const taccuinoFrase = $('taccuino-mobile-frase');
  if (taccuinoFrase && stato.taccuino[0]) {
    taccuinoFrase.innerHTML = `<p class="taccuino-frase">${t(stato.taccuino[0].testo)}</p><p class="taccuino-data">${formatData(stato.taccuino[0].data)}</p>`;
  }

  let tIdx = 0;
  const containerProgetti = $('mobile-progetti-container');

  // Pagina progetto: guscio subito (favicon/titolo → indicatore, ORA
  // corrente, titolo scheda funzionano da subito), contenuto (foto,
  // testo, bottone, listener) idratato quando serve — vedi sopra.
  progettiVisualizzati().forEach(pr => {
    const inLavorazione = pr.pubblicato === false;
    const isPlaylist = pr.id === ID_CARD_PLAYLIST;
    const p = creaPaginaMobile(t(pr.titolo).charAt(0).toUpperCase(), t(pr.titolo));

    registraIdratazione(p, () => {
      p.appendChild(creaHeader());

      const wrap = crea('div'); wrap.className = 'progetto-mobile-wrap';
      const imgDiv = crea('div');
      imgDiv.className = 'progetto-mobile-img' + (inLavorazione ? ' in-lavorazione' : '');
      imgDiv.appendChild(creaImg(pr.immagine_copertina, t(pr.titolo)));

      const testo = crea('div'); testo.className = 'progetto-mobile-testo';
      const linkEsterno = pr.link_esterno
        ? `<a class="link-esterno-btn" href="${pr.link_esterno}" target="_blank" rel="noopener" style="pointer-events:all;">${t(pr.label_link) || tu('common.vediOnline')}</a>` : '';
      const bottoneEntrata = isPlaylist
        ? `<button class="link-progetto" style="pointer-events:all;">Entra nell'Archivio</button>`
        : inLavorazione
          ? `<p class="progetto-in-lavorazione">${tu('overlay.inLavorazione')}</p>`
          : `<button class="link-progetto" data-id="${pr.id}" style="pointer-events:all;">${tu('progetti_extra.entraNelProgetto')}</button>`;
      testo.innerHTML = `
        <p class="progetto-anno">${t(pr.anno)}${inLavorazione ? '' : labelFotoProgetto(pr)}</p>
        <h2 class="progetto-titolo">${t(pr.titolo)}</h2>
        <p class="progetto-anno">${t(pr.descrizione)}</p>
        ${bottoneEntrata}
        <!-- ${linkEsterno} -->
      `;
      if (isPlaylist) {
        testo.querySelector('.link-progetto').addEventListener('click', () => apriProgetto(ID_CARD_PLAYLIST));
        imgDiv.style.cursor = 'pointer';
        imgDiv.addEventListener('click', () => apriProgetto(ID_CARD_PLAYLIST));
      } else if (!inLavorazione) {
        testo.querySelector('.link-progetto').addEventListener('click', () => apriProgetto(pr.id));
        imgDiv.style.cursor = 'pointer';
        imgDiv.addEventListener('click', () => apriProgetto(pr.id));
      }

      wrap.appendChild(imgDiv); wrap.appendChild(testo); p.appendChild(wrap);
    });

    containerProgetti.appendChild(p);
    tIdx = inserisciTaccuinoSeDisponibile(containerProgetti, tIdx);
  });

  const containerIntervalli = $('mobile-intervalli-container');
  // Idem per gli intervalli: la griglia di immagini è idratata solo
  // quando la pagina viene raggiunta (o all'avvio in background).
  stato.intervalli.forEach(iv => {
    const p = creaPaginaMobile('I', t(iv.titolo));

    registraIdratazione(p, () => {
      const { mpc, pc } = creaMobilePageContent();
      const wrap = crea('div'); wrap.className = 'intervallo-mobile-wrap';
      wrap.innerHTML = `<p class="capitolo-label">${tu('menu.intervalli')}</p><h2 class="capitolo-titolo">${t(iv.titolo)}</h2><p class="capitolo-descrizione">${t(iv.descrizione)}</p>`;
      const gr = crea('div'); gr.className = 'intervallo-mobile-griglia';
      iv.immagini.forEach((src, i) => {
        const cell = crea('div'); cell.className = 'intervallo-mobile-cella';
        cell.appendChild(creaImg(src, `${t(iv.titolo)} ${i + 1}`, false, '50vw'));
        gr.appendChild(cell);
      });
      wrap.appendChild(gr); pc.appendChild(wrap); p.appendChild(mpc);
    });

    containerIntervalli.appendChild(p);
    tIdx = inserisciTaccuinoSeDisponibile(containerIntervalli, tIdx);
  });

  // Collaborazioni commerciali
  const containerCollab = $('mobile-collaborazioni-container');
  if (containerCollab && stato.collaborazioni.length > 0) {
    const p = crea('div'); p.className = 'page';
    p.dataset.favicon = 'F'; p.dataset.titolo = 'commercial';
    p.appendChild(creaHeader());

    const corpo = crea('div'); corpo.className = 'collab-mobile-corpo';
    const label = crea('p'); label.className = 'capitolo-label collab-mobile-label';
    label.textContent = 'Commercial';
    corpo.appendChild(label);

    // Collaborazioni commerciali
    const containerCollab = $('mobile-collaborazioni-container');
    if (containerCollab && stato.collaborazioni.length > 0) {

      // ← PAGINA TITOLO CAPITOLO (mancante)
      const pTitolo = crea('div');
      pTitolo.className = 'page';
      pTitolo.dataset.favicon = 'F';
      pTitolo.dataset.titolo = 'Commercial';
      const { mpc: mpcT, pc: pcT } = creaMobilePageContent();
      pcT.innerHTML = `<div>
        <p class="capitolo-label">${tu('capitolo')} 04</p>
        <h2 class="capitolo-titolo">Commercial</h2>
      </div>`;
      pTitolo.appendChild(mpcT);
      containerCollab.appendChild(pTitolo);  // ← aggiunta prima delle foto

      const p = crea('div'); p.className = 'page';
    }

    stato.collaborazioni.forEach(cl => {
      const item = crea('div'); item.className = 'collab-mobile-item';
      const img = crea('div'); img.className = 'collab-mobile-img';
      const coverImg = creaImg(cl.foto, cl.titolo);
      img.appendChild(coverImg);

      // Se ha una galleria extra, inserisci le immagini nascoste nel DOM
      // così raccogliGalleria() del lightbox le trova nel gruppo collab-mobile-item
      const haGalleria = Array.isArray(cl.galleria) && cl.galleria.length > 0;
      if (haGalleria) {
        const galleriaHidden = crea('div');
        galleriaHidden.className = 'collab-mobile-galleria-hidden';
        galleriaHidden.style.cssText = 'display:none;position:absolute;pointer-events:none;';
        cl.galleria.forEach(url => {
          const gi = crea('img'); gi.src = url; gi.alt = cl.titolo;
          galleriaHidden.appendChild(gi);
        });
        item.appendChild(galleriaHidden);
        img.style.cursor = 'pointer';
        img.addEventListener('click', e => {
          e.stopPropagation();
          galleriaHidden.style.display = '';
          lightbox.apri(coverImg);
          galleriaHidden.style.display = 'none';
        });
      }

      const titolo = crea('h2'); titolo.className = 'collab-mobile-titolo'; titolo.textContent = cl.titolo;
      const anno = crea('p'); anno.className = 'collab-mobile-anno'; anno.textContent = cl.anno;
      item.appendChild(img); item.appendChild(titolo); item.appendChild(anno);
      corpo.appendChild(item);

      // Tap sul nome: apre sotto una striscia con le foto della collaborazione
      // (solo se la galleria è effettivamente popolata)
      const fotoCollab = haGalleria ? cl.galleria : [];
      if (fotoCollab.length > 0) {
        titolo.setAttribute('tabindex', '0');
        titolo.setAttribute('role', 'button');
        titolo.setAttribute('aria-expanded', 'false');

        const pannello = crea('div'); pannello.className = 'collab-mobile-espansione';
        const inner = crea('div'); inner.className = 'collab-mobile-espansione-inner';
        const wrapStriscia = crea('div'); wrapStriscia.className = 'collab-mobile-espansione-wrap';
        const striscia = crea('div'); striscia.className = 'collab-mobile-espansione-striscia';
        fotoCollab.forEach(src => {
          const cell = crea('div'); cell.className = 'collab-mobile-espansione-cella';
          cell.appendChild(creaImg(src, cl.titolo, false, '80vw'));
          striscia.appendChild(cell);
        });
        wrapStriscia.appendChild(striscia);

        // Freccette per scorrere la striscia (solo se c'è più di una foto)
        if (fotoCollab.length > 1) {
          const SVG_FRECCIA = dir => `<svg width="9" height="15" viewBox="0 0 9 15" fill="none" xmlns="http://www.w3.org/2000/svg" style="${dir === 'prev' ? 'transform:scaleX(-1)' : ''}"><path d="M1 1L7.5 7.5L1 14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
          const btnPrev = crea('button'); btnPrev.type = 'button'; btnPrev.className = 'collab-mobile-freccia collab-mobile-freccia--prev';
          btnPrev.innerHTML = SVG_FRECCIA('prev'); btnPrev.setAttribute('aria-label', 'Foto precedente');
          const btnNext = crea('button'); btnNext.type = 'button'; btnNext.className = 'collab-mobile-freccia collab-mobile-freccia--next';
          btnNext.innerHTML = SVG_FRECCIA('next'); btnNext.setAttribute('aria-label', 'Foto successiva');

          const scorri = passo => {
            const cella = striscia.querySelector('.collab-mobile-espansione-cella');
            const salto = cella ? cella.getBoundingClientRect().width + 10 : striscia.clientWidth * 0.8;
            striscia.scrollBy({ left: passo * salto, behavior: 'smooth' });
          };
          btnPrev.addEventListener('click', e => { e.stopPropagation(); scorri(-1); });
          btnNext.addEventListener('click', e => { e.stopPropagation(); scorri(1); });

          const aggiornaFrecce = () => {
            const max = striscia.scrollWidth - striscia.clientWidth - 2;
            btnPrev.classList.toggle('collab-mobile-freccia--nascosta', striscia.scrollLeft <= 2);
            btnNext.classList.toggle('collab-mobile-freccia--nascosta', striscia.scrollLeft >= max);
          };
          striscia.addEventListener('scroll', aggiornaFrecce, { passive: true });
          // Stato iniziale (dopo che il pannello è visibile e la striscia ha una larghezza reale)
          requestAnimationFrame(aggiornaFrecce);

          wrapStriscia.appendChild(btnPrev);
          wrapStriscia.appendChild(btnNext);
        }

        inner.appendChild(wrapStriscia);
        pannello.appendChild(inner);
        item.appendChild(pannello);

        const toggle = e => {
          e.stopPropagation();
          const apri = !pannello.classList.contains('aperta');
          // un solo pannello aperto alla volta in tutta la sezione
          corpo.querySelectorAll('.collab-mobile-espansione.aperta').forEach(p => {
            if (p !== pannello) p.classList.remove('aperta');
          });
          corpo.querySelectorAll('.collab-mobile-titolo[aria-expanded="true"]').forEach(t => {
            if (t !== titolo) t.setAttribute('aria-expanded', 'false');
          });
          pannello.classList.toggle('aperta', apri);
          titolo.setAttribute('aria-expanded', String(apri));
        };

        titolo.addEventListener('click', toggle);
        titolo.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(e); }
        });
      }
    });

    p.appendChild(corpo);
    containerCollab.appendChild(p);
  }

  // Pubblicazioni mobile
  const containerPub = $('mobile-pubblicazioni-container');
  if (containerPub && stato.pubblicazioni.length > 0) {
    // Pagina titolo capitolo
    const pTitoloPub = crea('div');
    pTitoloPub.className = 'page mobile-only';
    pTitoloPub.dataset.favicon = 'P'; pTitoloPub.dataset.titolo = tu('chiSono.pubblicazioniLabel');
    const { mpc: mpcPub, pc: pcPub } = creaMobilePageContent();
    pcPub.innerHTML = `<div>
      <p class="capitolo-label">${tu('capitolo')} 04</p>
      <h2 class="capitolo-titolo">${tu('chiSono.pubblicazioniLabel')}</h2>
      <p class="capitolo-descrizione">${tu('pubblicazioni.descrizione')}</p>
    </div>`;
    pTitoloPub.appendChild(mpcPub);
    containerPub.appendChild(pTitoloPub);

    // Pagina elenco pubblicazioni
    const pListaPub = crea('div');
    pListaPub.className = 'page mobile-only';
    pListaPub.dataset.favicon = 'P'; pListaPub.dataset.titolo = tu('chiSono.pubblicazioniLabel');
    const { mpc: mpcLista, pc: pcLista } = creaMobilePageContent();
    const listaWrap = crea('div'); listaWrap.className = 'pub-mobile-lista';
    stato.pubblicazioni.forEach(pub => {
      const item = crea('div'); item.className = 'pub-mobile-item';
      item.innerHTML = `
        ${pub.immagine ? `<div class="pub-mobile-img"></div>` : ''}
        <div class="pub-mobile-info">
          <p class="pub-mobile-titolo">${pub.titolo}</p>
          <p class="pub-mobile-anno">${pub.anno}</p>
          ${pub.link ? `<a class="pub-mobile-link" href="${pub.link}" target="_blank" rel="noopener" style="pointer-events:all;">${tu('common.vedi')}</a>` : ''}
        </div>
      `;
      if (pub.immagine) item.querySelector('.pub-mobile-img').appendChild(creaImg(pub.immagine, pub.titolo));
      listaWrap.appendChild(item);
    });
    pcLista.appendChild(listaWrap);
    pListaPub.appendChild(mpcLista);
    containerPub.appendChild(pListaPub);
  }

  raccogliPagine();

  // Idrata subito le prime pagine (lettura istantanea dal frontespizio)
  // o quella salvata dal segnalibro se il lettore riprende da lì; il
  // resto del libro si idrata da solo nei momenti di inattività.
  const paginaIniziale = (() => {
    try { return parseInt(localStorage.getItem(SEGNALIBRO_KEY), 10) || 0; } catch (e) { return 0; }
  })();
  idrataSubito([...document.querySelectorAll('.page, .pagina-progetto-mobile')], paginaIniziale);
  idrataInBackground();
}

function raccogliPagine() {
  const tutte = document.querySelectorAll('.page, .pagina-progetto-mobile');
  stato.totPagine = tutte.length;
  costruisciIndicatore(tutte.length);
}

function costruisciIndicatore(tot) {
  const ind = $('indicatore'); if (!ind) return;
  ind.innerHTML = '';
  for (let i = 0; i < tot; i++) {
    const dot = crea('div');
    dot.className = 'indicatore-dot' + (i === 0 ? ' attivo' : '');
    dot.addEventListener('click', () => navigaA(i));
    ind.appendChild(dot);
  }

  // ── Scrub: scorri su/giù sull'indicatore per navigare velocemente ──
  let scrubbing = false;
  let startY = 0;

  function paginaDaY(clientY) {
    const rect = ind.getBoundingClientRect();
    const t = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    return Math.round(t * (stato.totPagine - 1));
  }

  function scrubA(idx) {
    if (idx < 0 || idx >= stato.totPagine || idx === stato.paginaCorrente) return;
    const pagine = document.querySelectorAll('.page, .pagina-progetto-mobile');
    idrata(pagine[idx]); // lo scrub può saltare direttamente su una pagina non ancora costruita
    pagine[stato.paginaCorrente]?.classList.remove('attiva');
    stato.paginaCorrente = idx;
    pagine[idx]?.classList.add('attiva');
    aggiornaUI();
  }

  ind.addEventListener('touchstart', e => {
    e.stopPropagation();
    e.preventDefault();
    startY = e.touches[0].clientY;
    scrubbing = false;
    ind.classList.remove('scrub-attivo');
  }, { passive: false });

  ind.addEventListener('touchmove', e => {
    e.stopPropagation();
    const dy = Math.abs(e.touches[0].clientY - startY);
    if (!scrubbing && dy > 6) {
      scrubbing = true;
      ind.classList.add('scrub-attivo');
    }
    if (scrubbing) {
      e.preventDefault();
      scrubA(paginaDaY(e.touches[0].clientY));
    }
  }, { passive: false });

  ind.addEventListener('touchend', e => {
    e.stopPropagation();
    scrubbing = false;
    ind.classList.remove('scrub-attivo');
  }, { passive: true });

  ind.addEventListener('touchcancel', e => {
    e.stopPropagation();
    scrubbing = false;
    ind.classList.remove('scrub-attivo');
  }, { passive: true });
}

function aggiornaUI() {
  if (!isMobile()) return;
  // Segnalibro: salva la pagina corrente ad ogni spostamento reale nel libro
  // (navigaA e lo scrub sull'indicatore passano entrambi da qui).
  try { localStorage.setItem(SEGNALIBRO_KEY, String(stato.paginaCorrente)); } catch (e) {}
  const pagine = document.querySelectorAll('.page, .pagina-progetto-mobile');
  const pCorrente = pagine[stato.paginaCorrente];
  document.querySelectorAll('.indicatore-dot').forEach((d, i) => d.classList.toggle('attivo', i === stato.paginaCorrente));
  const elNum = $('numero-nav');
  if (elNum) elNum.textContent = `${formatNum(stato.paginaCorrente + 1)} / ${formatNum(stato.totPagine)}`;
  const nota = $('nota-nav');
  if (nota) nota.style.display = stato.paginaCorrente === 0 ? '' : 'none';
  const sx = $('freccia-sx'), dx = $('freccia-dx');
  const isUltima = stato.paginaCorrente === stato.totPagine - 1;
  if (sx) sx.toggleAttribute('disabled', stato.paginaCorrente === 0);
  if (dx) { dx.style.display = isUltima ? 'none' : ''; dx.toggleAttribute('disabled', isUltima); }
  let tornaBtn = $('torna-inizio-nav');
  if (isUltima) {
    if (!tornaBtn) {
      tornaBtn = crea('button'); tornaBtn.id = 'torna-inizio-nav';
      tornaBtn.textContent = tu('nav_extra.inizio');
      tornaBtn.addEventListener('click', () => navigaA(0));
      $('mobile-nav').appendChild(tornaBtn);
    }
    tornaBtn.style.display = '';
  } else {
    if (tornaBtn) tornaBtn.style.display = 'none';
  }
  if (isUltima) {
    const epilogo = document.getElementById('fin-epilogo');
    const footer = document.querySelector('.fin-footer');
    if (epilogo && !epilogo.classList.contains('visibile')) {
      epilogo.style.display = 'block';
      epilogo.style.opacity = '0';
      epilogo.style.transform = 'translateY(6px)';
      requestAnimationFrame(() => requestAnimationFrame(() => {
        epilogo.style.opacity = '';
        epilogo.style.transform = '';
        epilogo.classList.add('visibile');
        if (footer) {
          footer.style.display = 'flex';
          footer.style.opacity = '0';
          setTimeout(() => { footer.style.opacity = ''; footer.classList.add('visibile'); }, 400);
        }
      }));
    }
  }
  if (pCorrente) {
    aggiorneFavicon(pCorrente.dataset.favicon || 'f');
    document.title = `${pCorrente.dataset.titolo || 'Francesco Martolini .art'} — Francesco Martolini .art`;
  }
}

// ── Segnalibro: piccola tab in stile nastro di libro, sul frontespizio.
// Non forza mai il salto di pagina: propone soltanto di riprendere la
// lettura, così il frontespizio resta comunque la pagina di apertura
// predefinita se il lettore ignora la proposta o la chiude.
function mostraSegnalibro(idx) {
  if (!isMobile() || !idx || idx <= 0 || idx >= stato.totPagine) return;
  const home = $('home');
  if (!home || document.getElementById('segnalibro-tab')) return;

  const tab = crea('button');
  tab.id = 'segnalibro-tab';
  tab.className = 'segnalibro-tab';
  tab.innerHTML = `
    <span class="segnalibro-testo">${tu('segnalibro.messaggio')}</span>
    <span class="segnalibro-pagina">${tu('segnalibro.pagina')} ${formatNum(idx + 1)}</span>
  `;
  tab.addEventListener('click', () => {
    tab.remove();
    navigaA(idx);
  });

  const chiudi = crea('button');
  chiudi.className = 'segnalibro-chiudi';
  chiudi.setAttribute('aria-label', tu('segnalibro.ricomincia'));
  chiudi.textContent = '×';
  chiudi.addEventListener('click', (e) => {
    e.stopPropagation();
    tab.remove();
    try { localStorage.setItem(SEGNALIBRO_KEY, '0'); } catch (err) {}
  });
  tab.appendChild(chiudi);

  home.appendChild(tab);
}
