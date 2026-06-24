'use strict';

// First-run seed: every install ships with the Bouncing OpenObject Logo (the sample piece, HANDOFF §20).
// On first boot we copy its committed bundle (player/seed/<slug>/) into the runtime collections dir and add
// a normal Library row, so a fresh install greets the owner with art and needs NO network to do it — the
// bundle is shipped, not fetched, so the install is self-contained (mission: depends on no external service).
// From then on it is an ordinary connected piece (Rotation, Pin, and the bottom-of-Library sort anchor in
// db.listLibrary all apply).
//
// Gated by a setting so it runs once: an install that already has the piece (e.g. a frame where it was added
// by hand) is adopted (flag set, no duplicate), and a piece the owner later deletes is never re-seeded.

const fs = require('fs');
const path = require('path');
const db = require('./db');
const collections = require('./collections');

const SEED_DIR = path.join(__dirname, '..', 'seed'); // committed bundles live here: player/seed/<slug>/
const SAMPLE_SLUG = 'bouncing-openobject-logo';
const SEEDED_KEY = 'sample_seeded';

function seedSampleIfNeeded() {
  if (db.getSetting(SEEDED_KEY)) return; // already seeded / adopted / removed by the owner — leave it be
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(path.join(SEED_DIR, SAMPLE_SLUG, 'seed.json'), 'utf8'));
  } catch {
    return; // no seed bundle shipped — nothing to do
  }
  const { collection, tokenId, title, sourceUrl } = manifest;
  const filename = `oo-connected-${collection}-${tokenId}`;
  // Already in the Library (a normal add, or a hand-added copy on an existing frame)? Adopt it, don't duplicate.
  if (db.getLibraryItemByFilename(filename)) { db.setSetting(SEEDED_KEY, '1'); return; }
  try {
    // Copy the shipped bundle into the runtime collections dir, served same-origin like any mirrored piece.
    const src = path.join(SEED_DIR, collection);
    const dest = path.join(collections.COLLECTIONS_DIR, collection);
    fs.mkdirSync(dest, { recursive: true });
    fs.copyFileSync(path.join(src, 'index.html'), path.join(dest, 'index.html'));
    if (fs.existsSync(path.join(src, 'thumbs'))) {
      fs.cpSync(path.join(src, 'thumbs'), path.join(dest, 'thumbs'), { recursive: true });
    }
    const thumbRel = path.posix.join('thumbs', `${tokenId}.png`);
    const thumb = fs.existsSync(path.join(dest, thumbRel)) ? `/collections/${collection}/${thumbRel}` : null;
    db.addConnectedItem({ filename, title, source_url: sourceUrl, collection, token_id: tokenId, thumb });
    db.setSetting(SEEDED_KEY, '1');
    console.log(`Seeded the sample piece: ${title}`);
  } catch (e) {
    console.log('Sample seed skipped:', e.message); // best-effort; never block startup
  }
}

module.exports = { seedSampleIfNeeded };
