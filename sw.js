const CACHE_NAME = 'element-quest-v4';
const ASSETS_TO_CACHE = [
  '/index.html',
  '/css/style.css',
  '/data/elements-part1.js',
  '/data/elements-part2.js',
  '/data/elements-part3.js',
  '/data/elements.js',
  '/js/storage.js',
  '/js/quiz.js',
  '/js/ui.js',
  '/manifest.json'
];

// Install: cache all essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Fetch: cache-first strategy, falling back to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      });
    })
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
});
