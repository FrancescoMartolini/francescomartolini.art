/* ============================================
   LIBRO ENGINE — dom-desktop
Costruzione dell'archivio desktop (hero, slider progetti, colonne taccuino),
scroll reveal, orologio sticky.
Dipende da libro-nucleo.js.
   ============================================ */

'use strict';



// ── Orologio sticky desktop ──
function avviaOrologioSticky() {
  if (isMobile()) return;
  const wrap = crea('div'); wrap.id = 'orologio-sticky';
  wrap.innerHTML = `<div class="data-live"></div><div class="ora-live"></div><span class="ora-label-small">ora corrente</span>`;
  document.body.appendChild(wrap);
  const hero = document.querySelector('.desktop-hero');
  if (!hero) return;
  const obs = new IntersectionObserver(entries => {
    wrap.style.opacity = entries[0].isIntersecting ? '0' : '1';
  }, { threshold: 0.3 });
  obs.observe(hero);
}

// ════════════════════════════════
// DESKTOP — Popola sezioni
// ════════════════════════════════
function popolaDesktop() {
  // Hero image
  const heroImg = $('hero-img');
  const primoProgetto = progettiPrincipali()[0];
  if (heroImg && primoProgetto) {
    heroImg.appendChild(creaImg(primoProgetto.immagine_copertina, t(primoProgetto.titolo), true));
  }

  popolaSliderProgetti();

  // Taccuino colonne
  const colonne = $('taccuino-colonne-desktop');
  if (colonne) {
    stato.taccuino.slice(0, 3).forEach(v => {
      const col = crea('div'); col.className = 'taccuino-col-voce';
      col.setAttribute('role', 'button');
      col.setAttribute('tabindex', '0');
      col.addEventListener('click', () => apriTaccuino(v.id));
      col.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); apriTaccuino(v.id); } });
      col.innerHTML = `
        <p class="taccuino-col-data">${formatData(v.data)}</p>
        <p class="section-desc">${t(v.testo)}</p>
        ${v.foto ? `<div class="taccuino-col-foto"><img src="${v.foto}" alt="" loading="lazy" draggable="false"></div>` : ''}
        ${v.camera ? `<p class="taccuino-col-camera">${v.camera}</p>` : ''}
      `;
      colonne.appendChild(col);
    });
  }

  // Studi griglia
  /*const studiGriglia = $('studi-griglia-desktop');
  if (studiGriglia) {
    stato.intervalli.flatMap(iv => iv.immagini).slice(0, 5).forEach((src, i) => {
      const cell = crea('div'); cell.className = 'studio-img';
      cell.appendChild(creaImg(src, `Studio ${i + 1}`, false, '20vw'));
      studiGriglia.appendChild(cell);
    });
  }*/

  // Studi griglia - invertito in modo da mostrare le immagini più recenti per prime
  const studiGriglia = $('studi-griglia-desktop');
  if (studiGriglia) {
  stato.intervalli
    .flatMap(iv => iv.immagini)
    .slice(-5)
    .forEach((src, i) => {
      const cell = crea('div');
      cell.className = 'studio-img';
      cell.appendChild(creaImg(src, `Studio ${i + 1}`, false, '20vw'));
      studiGriglia.appendChild(cell);
    });
  }

  // Pubblicazioni desktop
  const pubWrap = $('pub-desktop-wrap');
  const pubLista = $('pub-desktop-lista');
  if (pubWrap && pubLista && stato.pubblicazioni.length > 0) {
    pubWrap.style.display = '';
    stato.pubblicazioni.forEach(pub => {
      const item = crea('div'); item.className = 'pub-desktop-item';
      item.innerHTML = `
        ${pub.immagine ? '<div class="pub-desktop-img"></div>' : ''}
        <div class="pub-desktop-info">
          <p class="pub-desktop-titolo">${pub.titolo}</p>
          <p class="pub-desktop-anno">${pub.anno} ${labelFotoProgetto(pub)}</p>
          ${pub.link ? `<a class="pub-desktop-link" href="${pub.link}" target="_blank" rel="noopener">Vedi →</a>` : ''}
        </div>
      `;
      if (pub.immagine) item.querySelector('.pub-desktop-img').appendChild(creaImg(pub.immagine, pub.titolo));
      pubLista.appendChild(item);
    });
  }

  const annoEl = $('footer-anno');
  if (annoEl) annoEl.textContent = new Date().getFullYear();
}

// ── Slider progetti ──
function popolaSliderProgetti() {
  const griglia = $('progetti-griglia-desktop');
  if (!griglia) return;

  // Solo i progetti pubblicati compaiono in questa griglia: gli "in
  // lavorazione" restano visibili come anteprima nel libro mobile e
  // nell'overlay "Vedi tutti", ma non nella striscia curata desktop.
  const elenco = progettiVisualizzati().filter(progettoPubblicato);
  elenco.forEach((pr, i) => {
    const card = crea('div');
    card.className = 'progetto-card';

    card.innerHTML = `
      <div class="progetto-card-img">
        ${pr.descrizione ? `<p class="progetto-card-desc">${t(pr.descrizione)}</p>` : ''}
      </div>
      <p class="progetto-card-num">${formatNum(i + 1)}</p>
      <p class="progetto-card-titolo">${t(pr.titolo).toUpperCase()}</p>
      <p class="progetto-card-anno">${t(pr.anno)} ${labelFotoProgetto(pr)}</p>
    `;

    card.querySelector('.progetto-card-img').appendChild(
      creaImg(pr.immagine_copertina, t(pr.titolo))
    );

    if (pr.id === ID_CARD_PLAYLIST) {
      card.addEventListener('click', () => apriProgetto(ID_CARD_PLAYLIST));
    } else {
      card.addEventListener('click', () => apriProgetto(pr.id));
    }

    griglia.appendChild(card);
  });

  const visibili = 4;
  avviaHoverCardProgetti(griglia, visibili);

  const sx = $('proj-sx'), dx = $('proj-dx');
  if (!sx || !dx) return;
  const tot = elenco.length;
  if (tot <= visibili) { sx.hidden = true; dx.hidden = true; return; }
  sx.hidden = true;

  function aggiorna() {
    const larghezzaCard = griglia.querySelector('.progetto-card')?.offsetWidth || 0;
    griglia.style.transform = `translateX(-${stato.sliderIdx * (larghezzaCard + 24)}px)`;
    sx.hidden = stato.sliderIdx === 0;
    dx.hidden = stato.sliderIdx >= tot - visibili;
  }
  sx.addEventListener('click', () => { stato.sliderIdx = Math.max(0, stato.sliderIdx - 1); aggiorna(); });
  dx.addEventListener('click', () => { stato.sliderIdx = Math.min(tot - visibili, stato.sliderIdx + 1); aggiorna(); });
}

// ── Hover card progetti: la card sotto il cursore si allarga, le altre del
// gruppo visibile si restringono in proporzione. La somma delle larghezze
// del gruppo resta invariata, quindi nulla intorno (frecce, sezioni) si
// sposta — cambia solo la proporzione fra le card visibili in quel momento. ──
function avviaHoverCardProgetti(griglia, visibili) {
  const PESO_HOVER = 2.6; // quanto "pesa" la card sotto il cursore rispetto alle altre (peso 1)

  function calcolaLarghezze(n) {
    const percentualeBase = n * 25; // ogni card occupa normalmente il 25% della griglia
    const pesoTotale = PESO_HOVER + (n - 1);
    return {
      hover: percentualeBase * PESO_HOVER / pesoTotale,
      altre: percentualeBase / pesoTotale
    };
  }

  function gruppoVisibile() {
    const carte = Array.from(griglia.querySelectorAll('.progetto-card'));
    return carte.slice(stato.sliderIdx, stato.sliderIdx + visibili);
  }

  function applica(cardHover) {
    const gruppo = gruppoVisibile();
    if (gruppo.length <= 1 || !gruppo.includes(cardHover)) return;
    const { hover, altre } = calcolaLarghezze(gruppo.length);
    gruppo.forEach(c => {
      if (c === cardHover) {
        c.style.width = hover + '%';
        c.classList.add('progetto-card--hover');
        c.classList.remove('progetto-card--dimmed');
      } else {
        c.style.width = altre + '%';
        c.classList.add('progetto-card--dimmed');
        c.classList.remove('progetto-card--hover');
      }
    });
  }

  function ripristina() {
    gruppoVisibile().forEach(c => {
      c.style.width = '';
      c.classList.remove('progetto-card--hover', 'progetto-card--dimmed');
    });
  }

  griglia.querySelectorAll('.progetto-card').forEach(card => {
    card.addEventListener('mouseenter', () => applica(card));
    card.addEventListener('mouseleave', ripristina);
  });
}

// Scroll-reveal per le sezioni
function avviaReveal(overlayEl) {
  const els = overlayEl.querySelectorAll(
    '.section-text, .section-image, .section-imagetext, .section-quote, .section-gallery, .section-map'
  );
  els.forEach(e => e.classList.add('reveal'));
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); obs.unobserve(entry.target); }
    });
  }, { root: overlayEl, threshold: 0.06 });
  els.forEach(e => obs.observe(e));
}

// Scroll-reveal generico riutilizzabile (es. sezioni pagina PLAYLIST)
function rivelaAlloScroll(overlayEl, selector) {
  const els = overlayEl.querySelectorAll(selector);
  els.forEach(e => e.classList.add('reveal'));
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); obs.unobserve(entry.target); }
    });
  }, { root: overlayEl, threshold: 0.12 });
  els.forEach(e => obs.observe(e));
}

// Aggiorna l'immagine sticky nel layout archivio mentre si scorre
function avviaScrollArchivio(overlayEl, pr) {
  const stickyImg = overlayEl.querySelector('#archivio-sticky-img');
  if (!stickyImg) return;
  const markers = overlayEl.querySelectorAll('[data-archivio-img]');
  if (!markers.length) return;
  if (overlayEl._scrollHandler) overlayEl.removeEventListener('scroll', overlayEl._scrollHandler);
  overlayEl._scrollHandler = () => {
    let corrente = null;
    markers.forEach(m => {
      if (m.offsetTop <= overlayEl.scrollTop + overlayEl.clientHeight * 0.55) corrente = m.dataset.archivioImg;
    });
    if (corrente && stickyImg.getAttribute('src') !== corrente) {
      stickyImg.style.opacity = '0';
      setTimeout(() => { stickyImg.src = corrente; stickyImg.style.opacity = '1'; }, 240);
    }
  };
  overlayEl.addEventListener('scroll', overlayEl._scrollHandler, { passive: true });
}

// ── Scroll desktop ──
function inizializzaScrollDesktop() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      if (isMobile()) return;
      const target = document.querySelector(a.getAttribute('href'));
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
    });
  });
}
