/* VOLT ALLEY service worker. Cache-first, versioned.
   Bump CACHE when you ship new files so installed phones drop the old set. */
'use strict';

const CACHE = 'volt-alley-v8';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/game.css',
  './js/audio.js',
  './js/game.js',
  './fonts/nunito-latin-800.woff2',
  './fonts/Nunito-OFL.txt',
  './fonts/jersey10-latin.woff2',
  './fonts/OFL.txt',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    self.__voltUpdating = keys.some((key) => key.indexOf('volt-alley-') === 0 && key !== CACHE);
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
    await self.clients.claim();
    if (!self.__voltUpdating) return;
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    await Promise.all(windows.map(async (client) => {
      if (!client.navigate) return;
      try {
        const url = new URL(client.url);
        if (url.searchParams.get('updated') === '1') return;
        url.searchParams.set('updated', '1');
        await client.navigate(url.toString());
      } catch (err) { /* the page listener reloads too */ }
    }));
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.endsWith('/sw.js')) {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }

  event.respondWith(cacheFirst(request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request, { ignoreSearch: true });
  if (cached) return cached;

  const url = new URL(request.url);
  if (url.pathname.endsWith('/')) {
    const indexHit = await caches.match(new URL('index.html', url).toString());
    if (indexHit) return indexHit;
  }

  try {
    const response = await fetch(request);
    if (response && response.status === 200 && response.type === 'basic') {
      const copy = response.clone();
      const cache = await caches.open(CACHE);
      cache.put(request, copy);
    }
    return response;
  } catch (err) {
    if (request.mode === 'navigate') {
      const fallback = await caches.match('./index.html');
      if (fallback) return fallback;
    }
    throw err;
  }
}
