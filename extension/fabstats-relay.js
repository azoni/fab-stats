(function () {
  "use strict";

  // Runs only on the FaB Stats import page. Bridges the page → extension storage:
  // when a Quick Sync import is confirmed (matches saved to the account), the
  // page posts the newest synced GEM event. We persist it as the "sync
  // watermark" so the GEM-side content script (content.js) can Smart-Sync only
  // matches newer than this next time, instead of guessing a page count.
  var store = (typeof browser !== "undefined" ? browser : chrome).storage.local;

  window.addEventListener("message", function (e) {
    // Only trust messages from this same page (not iframes / other origins).
    if (e.source !== window) return;
    var d = e.data;
    if (!d || d.__fabstats !== "sync-confirmed" || !d.eventId) return;
    try {
      store.set({
        fabStatsSyncWatermark: {
          eventId: String(d.eventId),
          date: String(d.date || ""),
          at: Date.now(),
        },
      });
    } catch (err) {
      /* storage unavailable — Smart Sync will fall back to a full fetch */
    }
  });
})();
