const CACHE_VERSION = 'animatch-v3';
const MODELS_CACHE = `${CACHE_VERSION}-models`;
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const APP_CACHE = `${CACHE_VERSION}-app`;

// Resources to pre-cache on install (small, critical files)
const PRECACHE_URLS = [
    '/',
    '/index.html',
];

// Cache-first: large, rarely-changing binaries
function isCacheFirstResource(url) {
    const path = url.pathname;
    return (
        path.endsWith('.onnx') ||
        path.endsWith('.wasm') ||
        path.includes('embeddings.json') ||
        path.endsWith('.tflite')
    );
}

// Stale-while-revalidate: app shell & fonts
function isStaleWhileRevalidate(url) {
    const path = url.pathname;
    const host = url.hostname;
    return (
        path === '/' ||
        path === '/index.html' ||
        path.endsWith('.css') ||
        host.includes('fonts.googleapis.com') ||
        host.includes('fonts.gstatic.com') ||
        host.includes('pretendard')
    );
}

// Install: pre-cache app shell
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(APP_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
    );
    self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
    const currentCaches = [MODELS_CACHE, STATIC_CACHE, APP_CACHE];
    event.waitUntil(
        caches.keys().then((cacheNames) =>
            Promise.all(
                cacheNames
                    .filter((name) => name.startsWith('animatch-') && !currentCaches.includes(name))
                    .map((name) => caches.delete(name))
            )
        ).then(() => self.clients.claim())
    );
});

// Fetch: tiered caching strategy
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip non-GET and API requests
    if (event.request.method !== 'GET' || url.pathname.startsWith('/api/')) {
        return;
    }

    // 1. Cache-First for large binaries (models, WASM, embeddings)
    if (isCacheFirstResource(url)) {
        event.respondWith(
            caches.match(event.request).then((cached) => {
                if (cached) return cached;

                return fetch(event.request).then((response) => {
                    if (!response || response.status !== 200) return response;

                    const clone = response.clone();
                    caches.open(MODELS_CACHE).then((cache) => cache.put(event.request, clone));
                    return response;
                });
            })
        );
        return;
    }

    // 2. Stale-While-Revalidate for app shell & fonts
    if (isStaleWhileRevalidate(url)) {
        event.respondWith(
            caches.match(event.request).then((cached) => {
                const fetchPromise = fetch(event.request)
                    .then((response) => {
                        if (response && response.status === 200) {
                            const clone = response.clone();
                            caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, clone));
                        }
                        return response;
                    })
                    .catch(() => cached); // Offline fallback

                return cached || fetchPromise;
            })
        );
        return;
    }

    // 3. Hashed assets (/assets/*) — cache-first (Vite adds content hashes)
    if (url.pathname.startsWith('/assets/')) {
        event.respondWith(
            caches.match(event.request).then((cached) => {
                if (cached) return cached;

                return fetch(event.request).then((response) => {
                    if (!response || response.status !== 200) return response;

                    const clone = response.clone();
                    caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, clone));
                    return response;
                });
            })
        );
        return;
    }
});
