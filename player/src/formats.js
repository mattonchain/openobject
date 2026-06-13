'use strict';

// Supported upload formats (HANDOFF §6 "Supported formats (v1)"). Files are stored
// byte-for-byte — no conversion on ingest. Anything not in this table is skipped
// silently on upload (no error): HEIC, SVG, PSD, raw, GLB, and OS noise like .DS_Store.

const FORMATS = {
  jpg:  { format: 'jpeg', kind: 'still',    mime: 'image/jpeg' },
  jpeg: { format: 'jpeg', kind: 'still',    mime: 'image/jpeg' },
  png:  { format: 'png',  kind: 'still',    mime: 'image/png' },
  gif:  { format: 'gif',  kind: 'animated', mime: 'image/gif' },
  avif: { format: 'avif', kind: 'animated', mime: 'image/avif' },
  webp: { format: 'webp', kind: 'animated', mime: 'image/webp' },
  mp4:  { format: 'mp4',  kind: 'video',    mime: 'video/mp4' },
  mov:  { format: 'mov',  kind: 'video',    mime: 'video/quicktime' },
  webm: { format: 'webm', kind: 'video',    mime: 'video/webm' },
};

// Returns the format descriptor for a filename, or null if unsupported (→ skip).
function classify(filename) {
  const ext = String(filename).split('.').pop().toLowerCase();
  return FORMATS[ext] || null;
}

module.exports = { FORMATS, classify };
