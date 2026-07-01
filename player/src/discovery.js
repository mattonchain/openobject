'use strict';

// Bonjour / mDNS advertisement for the Host role (HANDOFF §20, 2026-07-01; MAC-APP-PLAN §A2).
//
// Announces THIS Host on the local network as an `_openobject._tcp` service so a Display or Control
// client (a Mac app, a future Apple TV) can find it without being told an address. One code path
// runs on both the frame and a Mac. On the frame this sits ALONGSIDE Avahi's existing hostname
// advertisement (openobject.local): Avahi advertises the host A record, we advertise the SERVICE
// record, which are different mDNS record types, so they coexist.
//
// Strictly additive and off the playback path. Advertising is best-effort: any failure to publish
// is logged and swallowed so it can NEVER block startup or take down the player. If the network
// forbids multicast, or the dependency is somehow missing, the Host still serves normally; it just
// isn't auto-discoverable, exactly as it was before this seam existed.
//
// Uses `bonjour-service` (pure JS, no native module, no build step; consistent with node:sqlite and
// the no-build-step ethos). The same library later does the browsing side for the Mac app.

// Published as `_openobject._tcp`. bonjour-service adds the leading underscore and the `_tcp`.
const SERVICE_TYPE = 'openobject';

// Advertise this Host. Returns a handle with .stop() to withdraw the record on shutdown. Never
// throws: on any error it logs and returns a no-op handle so callers need no try/catch.
function advertise({ name, port, id, version }) {
  let bonjour = null;
  try {
    const { Bonjour } = require('bonjour-service');
    // The SECOND constructor argument is the error handler for the underlying mDNS socket. Without
    // it, bonjour-service RE-THROWS async socket errors (e.g. `send EHOSTUNREACH` when the network
    // forbids multicast), which would crash the player. Passing a handler keeps advertising truly
    // best-effort: a network that can't multicast just means "not discoverable", never a crash.
    bonjour = new Bonjour(undefined, (err) => console.warn('[discovery] mDNS socket error (continuing without discovery):', err && err.message));
    const service = bonjour.publish({
      name,
      type: SERVICE_TYPE,
      port,
      // TXT records let a client read who this is straight from discovery, no follow-up call needed.
      // Same fields as /api/identity so the two never disagree.
      txt: { id: String(id), name: String(name), version: String(version), role: 'host' },
    });
    service.on('error', (err) => console.warn('[discovery] advertise error:', err && err.message));
    console.log(`[discovery] advertising "${name}" as _${SERVICE_TYPE}._tcp on port ${port}`);
  } catch (err) {
    console.warn('[discovery] Bonjour advertisement unavailable, continuing without it:', err && err.message);
    bonjour = null;
  }

  return {
    stop() {
      if (!bonjour) return;
      try {
        // Withdraw the record cleanly (a "goodbye") so clients don't briefly see a dead Host.
        bonjour.unpublishAll(() => {
          try { bonjour.destroy(); } catch { /* already gone */ }
        });
      } catch (err) {
        console.warn('[discovery] stop error:', err && err.message);
      }
    },
  };
}

module.exports = { advertise, SERVICE_TYPE };
