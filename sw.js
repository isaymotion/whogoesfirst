/* Who Goes First? offline app shell. Keep CACHE_VERSION in sync with releases. */
'use strict';

const CACHE_PREFIX = 'who-goes-first-shell-';
const CACHE_VERSION = 'v7';
const CACHE_NAME = CACHE_PREFIX + CACHE_VERSION;
const APP_SHELL_FILES = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.webmanifest',
  './favicon.svg',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const scopeURL = self.registration.scope;
    const urls = APP_SHELL_FILES.map(path => new URL(path, scopeURL).href);
    await cache.addAll(urls);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const requestURL = new URL(request.url);
  const scopeURL = new URL(self.registration.scope);
  // Never intercept other origins or URLs outside this app's GitHub Pages path.
  if (requestURL.origin !== scopeURL.origin || !requestURL.href.startsWith(scopeURL.href)) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(new URL('./index.html', scopeURL).href, response.clone());
          return response;
        }
        // If the network returns an error page (for example, a transient 404/5xx
        // during a deployment), prefer the last known-good app shell.
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(request)) ||
          (await cache.match(new URL('./index.html', scopeURL).href)) || response ||
          new Response('This app is not available offline yet. Open it online once, then try again.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
      } catch (_) {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(request)) ||
          (await cache.match(new URL('./index.html', scopeURL).href)) ||
          new Response('This app is not available offline yet. Open it online once, then try again.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response && response.ok && response.type === 'basic') {
        await cache.put(request, response.clone());
      }
      return response;
    } catch (_) {
      return new Response('', { status: 504, statusText: 'Offline and resource not cached' });
    }
  })());
});
