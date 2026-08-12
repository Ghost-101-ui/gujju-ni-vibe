/**
 * service-worker.js — PWA Service Worker
 *
 * IMPORTANT: This service worker is ONLY for:
 *   - Making the app installable as a PWA
 *   - Caching static assets for offline use
 *
 * It does NOT handle audio keepalive.
 * Background audio playback is provided by:
 *   HTMLAudioElement + Media Session API  (in player.js / media-session.js)
 */

const CACHE_NAME = 'gujju-ni-vibe-v1';

// Static assets to cache on install
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './player.js',
  './songs.js',
  './db.js',
  './storage.js',
  './media-session.js',
  './manifest.json',
  './assets/images/gujarati-bg.jpg',
  './assets/images/garba-bg.jpg'
];

// ─── Install ────────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// ─── Activate ───────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// ─── Fetch ──────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Don't cache audio files — let them stream normally
  if (url.pathname.match(/\.(mp3|wav|m4a|ogg|flac|aac)$/i)) {
    return; // Fall through to network
  }

  // Don't cache blob: URLs (user-uploaded content)
  if (url.protocol === 'blob:') return;

  // Cache-first strategy for static assets
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        // Only cache successful GET responses
        if (
          !response ||
          response.status !== 200 ||
          response.type === 'opaque' ||
          event.request.method !== 'GET'
        ) {
          return response;
        }

        const cloned = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
        return response;
      }).catch(() => {
        // Offline fallback: return cached index.html for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
