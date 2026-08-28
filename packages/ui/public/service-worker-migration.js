/* global caches */

// The previous GenerateSW setup used Workbox's default cache prefix. The new
// worker has a versioned ts3-manager prefix, so these caches are safe to drop.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith("workbox-precache"))
          .map((cacheName) => caches.delete(cacheName))
      )
    )
  );
});
