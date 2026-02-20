const CACHE_NAME = 'animatch-models-v1';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME && cacheName.startsWith('animatch-models')) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Intercept and cache requests for .onnx model files
    if (url.pathname.endsWith('.onnx')) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                // Return from cache if available
                if (cachedResponse) {
                    return cachedResponse;
                }

                // Otherwise fetch from network and cache for next time
                return fetch(event.request).then((networkResponse) => {
                    // Only cache valid responses
                    if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                        return networkResponse;
                    }

                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });

                    return networkResponse;
                });
            })
        );
    }
});
