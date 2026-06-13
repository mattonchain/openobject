'use strict';

// OpenObject control panel — upload, library, rotation settings (this checkpoint).
// Sleep hours, restart/shutdown stubs, and self-update land here next.

const grid = document.getElementById('grid');
const countEl = document.getElementById('count');
const emptyEl = document.getElementById('empty');
const statusEl = document.getElementById('status');
const drop = document.getElementById('drop');
const fileInput = document.getElementById('file');
const durationEl = document.getElementById('duration');
const durationUnitEl = document.getElementById('durationUnit');
const modeEl = document.getElementById('mode');

const UNIT_MS = { seconds: 1000, minutes: 60000, hours: 3600000 };
let pinnedId = null;

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

// ── Library ─────────────────────────────────────────────────────────
function card(item) {
  const el = document.createElement('div');
  el.className = 'card';
  const src = `/uploads/${item.filename}`;
  const isFill = item.fit === 'fill';
  const isPinned = item.id === pinnedId;
  const media =
    item.kind === 'video'
      ? `<video src="${src}" muted playsinline preload="metadata"></video>`
      : `<img src="${src}" alt="" loading="lazy">`;
  el.innerHTML = `
    <div class="thumb fit-${isFill ? 'fill' : 'fit'}">
      ${media}
      <span class="badge">${item.format}</span>
      ${isPinned ? '<span class="pin-badge">📌 Pinned</span>' : ''}
    </div>
    <div class="meta">
      <span class="name" title="${item.original_name}">${item.original_name}</span>
      <span class="sub">${fmtBytes(item.bytes)}</span>
    </div>
    <div class="actions">
      <button class="pin" aria-pressed="${isPinned}" title="Hold this piece on the panel permanently">${isPinned ? 'Pinned' : 'Pin'}</button>
      <button class="fit" aria-pressed="${isFill}" title="How this piece fills the square">${isFill ? 'Fill' : 'Fit'}</button>
      <button class="del">Delete</button>
    </div>`;
  el.querySelector('.pin').addEventListener('click', () => togglePin(item));
  el.querySelector('.fit').addEventListener('click', () => toggleFit(item));
  el.querySelector('.del').addEventListener('click', () => remove(item));
  return el;
}

async function loadLibrary() {
  const items = await fetch('/api/library').then((r) => r.json());
  grid.replaceChildren(...items.map(card));
  countEl.textContent = items.length ? `${items.length} item${items.length > 1 ? 's' : ''}` : '';
  emptyEl.hidden = items.length > 0;
}

async function toggleFit(item) {
  const fit = item.fit === 'fill' ? 'fit' : 'fill';
  await fetch(`/api/library/${item.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fit }),
  });
  await loadLibrary();
}

async function togglePin(item) {
  if (item.id === pinnedId) await fetch('/api/pin', { method: 'DELETE' });
  else await fetch(`/api/pin/${item.id}`, { method: 'PUT' });
  await refresh();
}

async function remove(item) {
  if (!confirm(`Delete "${item.original_name}" from the Library?\nThis removes the file from the frame.`)) return;
  await fetch(`/api/library/${item.id}`, { method: 'DELETE' });
  await refresh();
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
  await loadLibrary();
}

// ── Rotation settings ───────────────────────────────────────────────
// Stored as milliseconds; the UI shows whichever unit divides cleanly (s / m / h).
function fromMs(ms) {
  if (ms % UNIT_MS.hours === 0) return { value: ms / UNIT_MS.hours, unit: 'hours' };
  if (ms % UNIT_MS.minutes === 0) return { value: ms / UNIT_MS.minutes, unit: 'minutes' };
  return { value: Math.max(1, Math.round(ms / 1000)), unit: 'seconds' };
}

async function loadSettings() {
  const s = await fetch('/api/settings').then((r) => r.json());
  const d = fromMs(s.durationMs);
  durationEl.value = d.value;
  durationUnitEl.value = d.unit;
  modeEl.value = s.mode;
  pinnedId = s.pinnedId;
}

const saveSettings = (patch) =>
  fetch('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });

function pushDuration() {
  const value = Math.max(1, Math.round(Number(durationEl.value) || 1));
  durationEl.value = value;
  saveSettings({ durationMs: value * UNIT_MS[durationUnitEl.value] });
}

async function refresh() {
  await loadSettings();
  await loadLibrary();
}

// ── Wiring ──────────────────────────────────────────────────────────
durationEl.addEventListener('change', pushDuration);
durationUnitEl.addEventListener('change', pushDuration);
modeEl.addEventListener('change', () => saveSettings({ mode: modeEl.value }));

drop.addEventListener('click', () => fileInput.click());
drop.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
});
fileInput.addEventListener('change', () => { send(fileInput.files); fileInput.value = ''; });

['dragenter', 'dragover'].forEach((ev) =>
  drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('drag'); })
);
['dragleave', 'drop'].forEach((ev) =>
  drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('drag'); })
);
drop.addEventListener('drop', (e) => send(e.dataTransfer.files));

refresh();
