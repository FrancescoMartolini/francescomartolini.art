'use strict';

const form = document.getElementById('qchv-form');
const fileInput = document.getElementById('qchv-input-file');
const previews = document.getElementById('qchv-anteprime');
const error = document.getElementById('qchv-form-errore');
const submit = document.getElementById('qchv-form-invia');
const success = document.getElementById('qchv-form-success');
const latInput = document.getElementById('qchv-lat');
const lngInput = document.getElementById('qchv-lng');
const luogoInput = form.elements.luogo;
const maxFiles = 3;
const maxBytes = 8 * 1024 * 1024;

function normalizzaLuogo(value) {
  return (value || '').trim().replace(/\s+/g, ' ');
}

async function risolviCoordinateLuogo() {
  const luogo = normalizzaLuogo(luogoInput.value);
  if (!luogo) return;
  if (latInput.value && lngInput.value) return;

  try {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('limit', '1');
    url.searchParams.set('q', luogo);
    url.searchParams.set('accept-language', 'it');

    const response = await fetch(url, {
      headers: { 'Accept-Language': 'it' }
    });
    if (!response.ok) return;

    const risultati = await response.json();
    if (!Array.isArray(risultati) || !risultati.length) return;

    const lat = Number(risultati[0].lat);
    const lng = Number(risultati[0].lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    latInput.value = lat.toFixed(5);
    lngInput.value = lng.toFixed(5);
  } catch (e) {
    // Se la geocodifica fallisce, il modulo invia comunque il luogo testuale.
  }
}

function aggiornaInputFileDaAnteprime() {
  const dt = new DataTransfer();
  const selected = Array.from(previews.querySelectorAll('[data-file-index]'));
  selected.forEach(item => {
    const index = Number(item.dataset.fileIndex);
    const file = fileInput.files && fileInput.files[index];
    if (file) dt.items.add(file);
  });
  fileInput.files = dt.files;
}

fileInput.addEventListener('change', () => {
  previews.innerHTML = '';
  error.hidden = true;
  const files = Array.from(fileInput.files || []);
  if (files.length > maxFiles || files.some(file => file.size > maxBytes)) {
    error.textContent = 'Puoi caricare fino a 3 foto, massimo 8MB ciascuna.';
    error.hidden = false;
  }
  files.slice(0, maxFiles).forEach((file, index) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'qchv-anteprima-wrap';

    const image = document.createElement('img');
    image.className = 'qchv-anteprima-img';
    image.src = URL.createObjectURL(file);
    image.alt = '';

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'qchv-anteprima-rimuovi';
    remove.textContent = '×';
    remove.setAttribute('aria-label', 'Rimuovi foto');
    remove.addEventListener('click', () => {
      const current = Array.from(fileInput.files || []);
      const filtered = current.filter((_, i) => i !== index);
      const dt = new DataTransfer();
      filtered.forEach(f => dt.items.add(f));
      fileInput.files = dt.files;
      fileInput.dispatchEvent(new Event('change'));
    });

    wrapper.appendChild(image);
    wrapper.appendChild(remove);
    wrapper.dataset.fileIndex = String(index);
    previews.appendChild(wrapper);
  });
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  error.hidden = true;

  if (!form.checkValidity()) {
    error.textContent = 'Controlla i campi obbligatori.';
    error.hidden = false;
    form.reportValidity();
    return;
  }

  const files = Array.from(fileInput.files || []);
  if (files.length > maxFiles || files.some(file => file.size > maxBytes)) {
    error.textContent = 'Puoi caricare fino a 3 foto, massimo 8MB ciascuna.';
    error.hidden = false;
    return;
  }

  submit.disabled = true;
  try {
    await risolviCoordinateLuogo();
    const response = await fetch('/mostralo', { method: 'POST', body: new FormData(form) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    form.hidden = true;
    success.hidden = false;
  } catch (requestError) {
    error.textContent = 'Non è stato possibile inviare il modulo. Riprova.';
    error.hidden = false;
  } finally {
    submit.disabled = false;
  }
});
