// Deliberately does nothing but make the app installable (Android/Chrome's "add to home screen"
// still generally expects an active service worker with a fetch handler, even though it's not
// required to actually cache anything). No offline mode, no caching, no interception of
// responses — every request is passed straight through to the network exactly as if this file
// didn't exist. iOS Safari doesn't need this at all (installability there comes purely from
// manifest.json + the apple-* meta tags in index.html) — this file only matters for Android/
// desktop Chrome/Edge.
//
// skipWaiting/clients.claim: takes over immediately on install/activate instead of waiting for
// every open tab to close first — safe here specifically because there's no cache to get out of
// sync with; a version of this file that ever adds real caching should reconsider this.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
