'use strict';

// OpenObject display — rotation engine.
//
// Renders the Rotation (v1 = the whole Library, in upload order) edge-to-edge on the
// black stage: Fit/Fill per clip, one global equal-time duration for every piece, and
// video/animation loops to fill it (a video longer than the duration is cut off when
// the timer advances). Order: Sequence / Shuffle (HANDOFF §7). New uploads,
// deletions, Fit/Fill flips, and duration/order changes fold in live without restarting
// the loop (polled). Always muted (§12).

const idle = document.getElementById('idle');
const layers = [document.getElementById('layer0'), document.getElementById('layer1')];

let items = [];
let durationMs = 8000;
let mode = 'sequence';

let pos = -1; // index in `items` of the piece on screen
let currentId = null; // its library id — survives reordering as the library changes
let currentSig = null; // fit+filename of the on-screen piece — detects a live restyle
let front = 0; // which layer is currently visible
let timer = null;
let started = false;
let shuffleQueue = [];

const sig = (item) => item.fit + '|' + item.filename;
const once = (fn) => {
  let done = false;
  return () => { if (!done) { done = true; fn(); } };
};
const shuffle = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function pickNext() {
  const n = items.length;
  if (n <= 1) return 0;
  if (mode === 'shuffle') {
    if (shuffleQueue.length === 0) {
      shuffleQueue = shuffle(items.map((_, i) => i));
      if (shuffleQueue[0] === pos && shuffleQueue.length > 1) shuffleQueue.push(shuffleQueue.shift());
    }
    return shuffleQueue.shift();
  }
  return (pos + 1) % n; // sequence
}

function render(layer, item, onReady) {
  layer.className = 'layer fit-' + (item.fit === 'fill' ? 'fill' : 'fit');
  const src = '/uploads/' + item.filename;
  let el;
  if (item.kind === 'video') {
    el = document.createElement('video');
    el.muted = true;          // silent art on a wall (§12)
    el.loop = true;           // loop to fill the duration
    el.playsInline = true;
    el.autoplay = true;
    el.addEventListener('loadeddata', onReady, { once: true });
    el.src = src;
    el.play().catch(() => {});
  } else {
    el = document.createElement('img'); // stills + animated (GIF/WebP/AVIF) hold/loop
    el.addEventListener('load', onReady, { once: true });
    el.addEventListener('error', onReady, { once: true });
    el.src = src;
  }
  layer.replaceChildren(el);
  setTimeout(onReady, 500); // fallback if the media event never fires
}

// Render + crossfade to a specific piece.
function show(item) {
  pos = items.indexOf(item);
  currentId = item.id;
  currentSig = sig(item);
  const back = 1 - front;
  const reveal = once(() => {
    layers[back].classList.add('show');
    layers[front].classList.remove('show');
    front = back;
  });
  render(layers[back], item, reveal);
  idle.classList.add('hidden');
  started = true;
}

function advance() {
  clearTimeout(timer);
  timer = null;
  if (items.length === 0) return showIdle();
  pos = pickNext();
  const item = items[pos];
  if (item.id !== currentId) show(item); // same single piece → keep showing, no reload/flicker
  if (items.length > 1) timer = setTimeout(advance, durationMs);
}

function showIdle() {
  clearTimeout(timer);
  timer = null;
  started = false;
  pos = -1;
  currentId = null;
  currentSig = null;
  shuffleQueue = [];
  layers.forEach((l) => { l.classList.remove('show'); l.replaceChildren(); });
  idle.classList.remove('hidden');
}

function apply(state) {
  durationMs = state.durationMs;
  mode = state.mode;
  // A pinned piece collapses the rotation to just itself — held permanently (HANDOFF §7).
  const pinned = state.pinnedId != null ? state.items.find((i) => i.id === state.pinnedId) : null;
  items = pinned ? [pinned] : state.items;
  shuffleQueue = [];

  if (items.length === 0) return showIdle();

  if (currentId != null) pos = items.findIndex((i) => i.id === currentId);
  if (!started || pos < 0) return advance();             // (re)start, or skip a deleted current
  if (sig(items[pos]) !== currentSig) show(items[pos]);  // current piece restyled (Fit/Fill) → re-render
  if (items.length > 1 && timer === null) timer = setTimeout(advance, durationMs); // 1→many: resume cadence
}

async function tick() {
  try {
    apply(await fetch('/api/display').then((r) => r.json()));
  } catch {
    /* offline or restarting — keep showing what's up; playback is local (§9) */
  }
}

tick();
setInterval(tick, 5000); // fold in library/settings changes without restarting the loop
