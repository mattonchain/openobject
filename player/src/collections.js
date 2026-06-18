'use strict';

// Connected collections (experimental) — the curated registry of supported web/on-chain art
// collections, plus the add-time resolver and the local mirror of each collection's shared
// render bundle.
//
// Model: the owner never authors a collection. Each entry below is a hand-coded, vetted
// collection. Adding a piece = pick the collection + enter its Token ID; we read the token's
// on-chain `tokenURI` to find its canonical metadata, take the official `animation_url`
// VERBATIM (never a marketplace render), mirror the shared bundle locally, and from then on it
// plays offline like any other Library piece. New collections arrive as code, not from users.

const path = require('path');
const fs = require('fs');
const db = require('./db');

const COLLECTIONS_DIR = path.join(db.DATA_DIR, 'collections');

// ── The supported list (shipped in code; grows as more are hand-coded) ──
const REGISTRY = [
  {
    slug: 'azulejo-galo',
    artist: 'Bryan Brinkman',
    name: 'Azulejo Galo',
    chain: 'Ethereum',
    contract: '0x61d115f1a3b08f871A1171041C9AF5bb5f747e47',
    // One free read call (tokenURI) goes through a public Ethereum node. Swappable; many exist.
    rpc: 'https://ethereum-rpc.publicnode.com',
    // This collection animates on load via its global toggleRotation() (its "Toggle Rotation" menu).
    animateDefault: true,
  },
  {
    slug: 'as-the-days-go-by',
    artist: 'Alex Kittoe',
    name: 'As the Days Go By',
    chain: 'Ethereum',
    contract: '0x9a9b9b14581136cb2f0f53e2b65ba6c74fd660b4',
    rpc: 'https://ethereum-rpc.publicnode.com',
    // A time-aware still, not a generative sketch: the bundle itself swaps a day or night photo
    // from the viewer's local clock (day = 6am-6pm), rechecking each minute. Nothing to engage on
    // load, so this collection has no Animate control (animatable: false).
    animateDefault: false,
    animatable: false,
  },
  {
    slug: 'send-receive',
    artist: 'Erick Calderon (Snowfro)',
    name: 'send/receive',
    chain: 'Ethereum',
    contract: '0xababababab20053426ad1c782de9ea8444358070',
    rpc: 'https://ethereum-rpc.publicnode.com',
    // A LIVE, networked artwork (Art Blocks Flex on-chain). Unlike the self-contained pieces above,
    // each token's generator HTML reads the global on-chain state of the whole collection at display
    // time (block by block, the send/receive balance across all tokens) and animates from it. So:
    //  • perToken: the generator returns a different fully-inlined HTML per token (token id in the
    //    path, no query seed), so each token gets its own mirrored bundle, not a shared one.
    //  • liveRpc: the piece needs a reachable Ethereum RPC to animate. We override its embedded
    //    endpoint with our own swappable public node (display.js appends ?rpc_url=) and scope a
    //    connect-src exception to just this collection's bundle path (server.js). Offline it falls
    //    back to a static sprite with the artist's own network-error badge, so this is the one
    //    collection that is not fully offline. It self-animates with live data, so no Animate toggle.
    perToken: true,
    liveRpc: true,
    animateDefault: false,
    animatable: false,
    // The generator composes the artwork in the centered 60% of the panel with a 20% black margin
    // on every side. We want it edge to edge (HANDOFF §6, no border), so the display zooms the iframe
    // to crop that margin out. `crop` is the centered fraction the art occupies; 0.6 -> 1/0.6 zoom.
    // Measured off the static "white version" of the sprite card, constant across this collection.
    crop: 0.6,
  },
];

const bySlug = (slug) => REGISTRY.find((c) => c.slug === slug) || null;

// Some collections host metadata/bundles on IPFS, which Node's fetch can't dereference (ipfs:// is
// not http). Map ipfs:// to a public gateway for fetching only; the official ipfs:// URL is still
// what we store verbatim. Plain http(s) (e.g. Arweave) passes through unchanged. Gateway is swappable.
const IPFS_GATEWAY = 'https://ipfs.io/ipfs/';
const toHttp = (url) => {
  const s = String(url || '');
  return s.startsWith('ipfs://') ? IPFS_GATEWAY + s.slice(7).replace(/^ipfs\//, '') : s;
};

// ── On-chain resolve: Token ID → official animation_url (+ title, preview) ──
// tokenURI(uint256) is the ERC-721 standard; reading it is a free `eth_call` (no gas, no wallet)
// that returns the token's canonical metadata location — the source of truth, not a render.
async function ethCallTokenURI(c, tokenId) {
  const data = '0xc87b56dd' + BigInt(tokenId).toString(16).padStart(64, '0'); // tokenURI(uint256)
  const r = await fetch(c.rpc, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to: c.contract, data }, 'latest'] }),
  });
  if (!r.ok) throw new Error(`Ethereum node returned ${r.status}.`);
  const j = await r.json();
  if (j.error) throw new Error(j.error.message || 'Ethereum read failed.');
  const hex = (j.result || '').replace(/^0x/, '');
  if (hex.length < 128) throw new Error("No such token (check the Token ID).");
  const len = parseInt(hex.slice(64, 128), 16);            // ABI string: [offset][length][bytes]
  const str = Buffer.from(hex.slice(128, 128 + len * 2), 'hex').toString('utf8');
  if (!str) throw new Error('That token has no metadata URL.');
  return str;
}

// Returns { tokenId, title, sourceUrl (verbatim official URL), image (preview, may be null) }.
async function resolveToken(slug, tokenId) {
  const c = bySlug(slug);
  if (!c) throw new Error('Unknown collection.');
  const tid = String(tokenId == null ? '' : tokenId).trim();
  if (!/^\d+$/.test(tid)) throw new Error('Token ID must be a number.');
  const metaUrl = await ethCallTokenURI(c, tid);                 // Ethereum → metadata location
  const mr = await fetch(toHttp(metaUrl));                        // metadata may live on IPFS
  if (!mr.ok) throw new Error(`Couldn't read the token metadata (${mr.status}).`);
  const meta = await mr.json();
  const sourceUrl = meta.animation_url;                          // the official long URL
  if (!sourceUrl) throw new Error('This token has no artwork URL in its metadata.');
  return { tokenId: tid, title: meta.name || `${c.name} #${tid}`, sourceUrl, image: meta.image || null };
}

// ── Mirror the shared render bundle once, served same-origin (server CSP allows it to run and
// be framed by the display). Lets us inject the auto-animate hook and play with no network later. ──
function bundleDir(slug) { return path.join(COLLECTIONS_DIR, slug); }

// Where a piece's bundle lives. Most collections share one bundle for the whole collection (the
// per-piece seed rides in the source URL's query string). `perToken` collections (Art Blocks-style)
// return a different fully-inlined HTML per token, so each token gets its own dir under the slug.
function outDir(slug, tokenId) {
  const c = bySlug(slug);
  return c && c.perToken ? path.join(bundleDir(slug), String(tokenId)) : bundleDir(slug);
}
function isMirrored(slug, tokenId) { return fs.existsSync(path.join(outDir(slug, tokenId), 'index.html')); }

// Live (networked) collections read a public RPC at display time (e.g. send/receive reads the
// global on-chain state that drives its animation). We scope a connect-src exception to just that
// collection's bundle path; every other collection stays locked to same-origin. Given a request
// path under /collections (e.g. "/send-receive/5008760/index.html"), return the RPC origin to
// allow, or null. The artwork's embedded endpoint is overridden at render time with our own
// swappable public node, so only this one origin needs allowing (no reliance on the embedded key).
function liveRpcForPath(reqPath) {
  const seg = decodeURIComponent(String(reqPath || '').replace(/^\/+/, '').split('/')[0] || '');
  const c = bySlug(seg);
  if (!c || !c.liveRpc) return null;
  try { return new URL(c.rpc).origin; } catch { return null; }
}

// Injected into the mirrored index.html: when the iframe is opened with ?ooanim=1, wait until the
// sketch has generated, then fire its global animate function ONCE (Azulejo: toggleRotation).
const ANIMATE_HOOK = `
<script>
(function(){
  if (new URLSearchParams(location.search).get('ooanim') !== '1') return;
  var fired = false, n = 0;
  var iv = setInterval(function(){
    if (fired || ++n > 300) { clearInterval(iv); return; }   // ~30s safety
    try {
      if (typeof toggleRotation === 'function'
          && typeof ROT_ACTIVE !== 'undefined' && !ROT_ACTIVE
          && typeof ROT_TILES !== 'undefined' && ROT_TILES
          && ROT_TILES.filter(function(t){ return t.snapshot; }).length > 0) {
        fired = true; clearInterval(iv); toggleRotation();
      }
    } catch (e) {}
  }, 100);
})();
</script>`;

async function fetchBuf(url) {
  const r = await fetch(toHttp(url));
  if (!r.ok) throw new Error(`fetch ${url} → ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

// Fetch the entry HTML + every relative asset it references (scripts, etc.). For collections that
// expose an Animate control, inject the auto-animate hook; self-animating pieces are left verbatim.
async function mirrorBundle(slug, sourceUrl, tokenId) {
  const c = bySlug(slug);
  const out = outDir(slug, tokenId);                                         // per-token dir, or the shared bundle
  if (fs.existsSync(path.join(out, 'index.html'))) return;                   // already mirrored
  const u = new URL(toHttp(sourceUrl));                                      // ipfs:// → gateway for the fetch
  const dir = u.pathname.slice(0, u.pathname.lastIndexOf('/') + 1);          // .../<txid>/
  const base = u.origin + dir;
  const entry = u.pathname.slice(u.pathname.lastIndexOf('/') + 1) || 'index.html';
  let html = (await fetchBuf(base + entry)).toString('utf8');
  // A public gateway may inject a tracking beacon (e.g. Cloudflare's hidden cdn-cgi <a>) into the
  // served HTML; it is not part of the artist's file, so strip it for a faithful mirror.
  html = html.replace(/<a\b[^>]*cdn-cgi[^>]*><\/a>/gi, '');

  const assets = new Set();
  const re = /(?:src|href)=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    const ref = m[1];
    if (/^(https?:)?\/\//i.test(ref) || ref.startsWith('data:') || ref.startsWith('#')) continue;
    assets.add(ref.replace(/^\.?\//, ''));
  }
  for (const rel of assets) {
    const buf = await fetchBuf(base + rel);
    const dest = path.join(out, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, buf);
  }
  // Only collections with an Animate control (e.g. Azulejo's toggleRotation) get the hook. Pieces
  // that animate on their own (Kittoe's time-still, send/receive's live render) stay verbatim.
  if (c && c.animatable !== false) {
    html = html.includes('</body>') ? html.replace('</body>', ANIMATE_HOOK + '\n</body>') : html + ANIMATE_HOOK;
  }
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'index.html'), html, 'utf8');
}

// Remove a piece's mirrored bundle. perToken collections give each token its own bundle, so it is
// safe to delete on removal; shared-bundle collections keep theirs (other pieces may still use it).
function removeBundle(slug, tokenId) {
  const c = bySlug(slug);
  if (c && c.perToken) fs.rm(path.join(bundleDir(slug), String(tokenId)), { recursive: true, force: true }, () => {});
}

// Cache the preview image locally so the Library card has an offline thumbnail.
async function cacheThumb(slug, tokenId, imageUrl) {
  if (!imageUrl) return null;
  try {
    const rel = path.posix.join('thumbs', `${tokenId}.png`);
    const dest = path.join(bundleDir(slug), rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, await fetchBuf(imageUrl));
    return `/collections/${slug}/${rel}`;
  } catch { return imageUrl; } // fall back to the remote preview if caching fails
}

// Fetch an image and return it as a data: URL. Used for the add-flow preview, which renders under
// the control panel's strict CSP (img-src 'self' data:) before the piece's thumbnail is cached.
async function toDataUrl(url) {
  if (!url) return null;
  try {
    const r = await fetch(toHttp(url));
    if (!r.ok) return null;
    const ct = r.headers.get('content-type') || 'image/png';
    return `data:${ct};base64,${Buffer.from(await r.arrayBuffer()).toString('base64')}`;
  } catch { return null; }
}

// ── Per-frame curation state (hidden / animate), merged over the registry defaults ──
function getState(slug) {
  const c = bySlug(slug);
  if (!c) return null;
  const st = db.getCollectionState(slug);
  return {
    hidden: st ? !!st.hidden : false,
    animate: st && st.animate != null ? !!st.animate : c.animateDefault,
  };
}
function setState(slug, patch) {
  if (!bySlug(slug)) throw new Error('Unknown collection.');
  db.setCollectionState(slug, patch);
  return getState(slug);
}

// Sorted by artist, then collection (HANDOFF / design). Includes piece counts for the UI.
function list() {
  return REGISTRY
    .map((c) => {
      const st = getState(c.slug);
      return { slug: c.slug, artist: c.artist, name: c.name, chain: c.chain, hidden: st.hidden, animate: st.animate, animatable: c.animatable !== false, crop: c.crop || null, pieces: db.countConnected(c.slug) };
    })
    .sort((a, b) => a.artist.localeCompare(b.artist) || a.name.localeCompare(b.name));
}

module.exports = { REGISTRY, COLLECTIONS_DIR, bySlug, resolveToken, mirrorBundle, removeBundle, cacheThumb, toDataUrl, getState, setState, list, isMirrored, liveRpcForPath };
