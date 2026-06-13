'use strict';

// OpenObject control panel — upload + library (this checkpoint).
// Rotation, pin, per-clip durations + Fit/Fill, and settings land here next.

const grid = document.getElementById('grid');
const countEl = document.getElementById('count');
const emptyEl = document.getElementById('empty');
const statusEl = document.getElementById('status');
const drop = document.getElementById('drop');
const fileInput = document.getElementById('file');

const fmtBytes = (n) => {
  if (n < 1024) return n + ' B';
  if (n < 1024 ** 2) return (n / 1024).toFixed(0) + ' KB';
  if (n < 1024 ** 3) return (n / 1024 ** 2).toFixed(1) + ' MB';
  return (n / 1024 ** 3).toFixed(2) + ' GB';
};

function setStatus(msg, sticky) {
  statusEl.textContent = msg || '';
  statusEl.hidden = !msg;
  statusEl.classList.toggle('show', !!sticky);
}

function card(item) {
  const el = document.createElement('div');
  el.className = 'card';
  const src = `/uploads/${item.filename}`;
  const media =
    item.kind === 'video'
      ? `<video src="${src}" muted playsinline preload="metadata"></video>`
      : `<img src="${src}" alt="" loading="lazy">`;
  el.innerHTML = `
    <div class="thumb">${media}<span class="badge">${item.format}</span></div>
    <div class="meta">
      <span class="name" title="${item.original_name}">${item.original_name}</span>
      <span class="sub">${fmtBytes(item.bytes)}</span>
    </div>
    <button class="del">Delete</button>`;
  el.querySelector('.del').addEventListener('click', () => remove(item));
  return el;
}

async function load() {
  const items = await fetch('/api/library').then((r) => r.json());
  grid.replaceChildren(...items.map(card));
  countEl.textContent = items.length ? `${items.length} item${items.length > 1 ? 's' : ''}` : '';
  emptyEl.hidden = items.length > 0;
}

async function remove(item) {
  if (!confirm(`Delete "${item.original_name}" from the Library?\nThis removes the file from the frame.`)) return;
  await fetch(`/api/library/${item.id}`, { method: 'DELETE' });
  await load();
}

async function send(files) {
  if (!files || !files.length) return;
  const form = new FormData();
  [...files].forEach((f) => form.append('files', f));
  setStatus(`Uploading ${files.length} file${files.length > 1 ? 's' : ''}…`, true);
  const res = await fetch('/api/upload', { method: 'POST', body: form }).then((r) => r.json());
  const added = res.added?.length || 0;
  const skipped = res.skipped || [];
  setStatus(
    `Added ${added}.` + (skipped.length ? ` Skipped ${skipped.length} unsupported: ${skipped.join(', ')}` : ''),
    true
  );
  await load();
}

// File picker
drop.addEventListener('click', () => fileInput.click());
drop.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
});
fileInput.addEventListener('change', () => { send(fileInput.files); fileInput.value = ''; });

// Drag & drop
['dragenter', 'dragover'].forEach((ev) =>
  drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('drag'); })
);
['dragleave', 'drop'].forEach((ev) =>
  drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('drag'); })
);
drop.addEventListener('drop', (e) => send(e.dataTransfer.files));

load();
