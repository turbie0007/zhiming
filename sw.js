const VERSION = 'zhiming-20261150';
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/favicon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-1024.png',
  './assets/icons/apple-touch-icon.png',
  './assets/css/style.css?v=20261150',
  './assets/js/app.js?v=20261150',
  './assets/js/astro.js?v=20261150',
  './assets/js/bazi.js?v=20261150',
  './assets/js/data.js?v=20261150',
  './assets/js/glossary.js?v=20261150',
  './assets/js/learn.js?v=20261150',
  './assets/js/native.js?v=20261150',
  './assets/js/pages.js?v=20261150',
  './assets/js/solar-terms.js?v=20261150',
  './assets/js/ui.js?v=20261150',
];
// Written by scripts/build-web.mjs. Kept best-effort so a dev server that only serves the
// source tree can still install the shell cache.
const CONTENT = [
  './learn/index.html',
  './learn/sizhu/index.html',
  './learn/jieqi/index.html',
  './learn/shishen/index.html',
  './learn/shensha/index.html',
  './learn/yun/index.html',
  './learn/wuxing/index.html',
  './learn/taiyang/index.html',
  './about/index.html',
  './privacy/index.html',
];

const MAX_CACHE_ENTRIES = 80;
const PRECACHE_URLS = new Set([...PRECACHE, ...CONTENT].map((path) => new URL(path, self.location).href));

async function trimCache() {
  const cache = await caches.open(VERSION);
  const keys = await cache.keys();
  if (keys.length <= MAX_CACHE_ENTRIES) return;
  const runtime = keys.filter((request) => !PRECACHE_URLS.has(request.url));
  const excess = Math.min(keys.length - MAX_CACHE_ENTRIES, runtime.length);
  await Promise.all(runtime.slice(0, excess).map((request) => cache.delete(request)));
}

function cachePut(request, response) {
  caches.open(VERSION)
    .then((cache) => cache.put(request, response))
    .then(trimCache);
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then(async (cache) => {
    await cache.addAll(PRECACHE);
    await Promise.allSettled(CONTENT.map((path) => cache.add(path)));
  }));
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          cachePut(request, response.clone());
          return response;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match('./index.html'))),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((hit) => {
      if (hit) return hit;
      return fetch(request).then((response) => {
        if (response.ok) cachePut(request, response.clone());
        return response;
      });
    }),
  );
});
