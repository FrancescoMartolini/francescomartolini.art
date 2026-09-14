'use strict';

const form = document.getElementById('qchv-form');
const fileInput = document.getElementById('qchv-input-file');
const previews = document.getElementById('qchv-anteprime');
const error = document.getElementById('qchv-form-errore');
const submit = document.getElementById('qchv-form-invia');
const success = document.getElementById('qchv-form-success');
const maxFiles = 3;
const maxBytes = 8 * 1024 * 1024;

fileInput.addEventListener('change', () => {
  previews.innerHTML = '';
  error.hidden = true;
  const files = Array.from(fileInput.files || []);
  if (files.length > maxFiles || files.some(file => file.size > maxBytes)) {
    error.textContent = 'Puoi caricare fino a 3 foto, massimo 8MB ciascuna.';
    error.hidden = false;
  }
  files.slice(0, maxFiles).forEach(file => {
    const image = document.createElement('img');
    image.className = 'qchv-anteprima-img';
    image.src = URL.createObjectURL(file);
    image.alt = '';
    previews.appendChild(image);
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
