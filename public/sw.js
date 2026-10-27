/*
 * Refetch service worker: makes the site installable and shows an offline
 * page when there's no connection. Pages and data always come from the
 * network (news goes stale fast); only the fingerprinted build assets are
 * cached, since they never change.
 */

const VERSION = 'v1'
const STATIC_CACHE = `refetch-static-${VERSION}`
const OFFLINE_URL = '/offline.html'
const PRECACHE = [OFFLINE_URL, '/icons/icon-192.png', '/favicon.png']
const MAX_ASSETS = 120

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key.startsWith('refetch-') && key !== STATIC_CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  )
})

async function trim(cache) {
  const keys = await cache.keys()
  await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_ASSETS)).map((key) => cache.delete(key)))
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Pages: network first, the offline page when that fails.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)))
    return
  }

  // Build output is content-hashed: cache it on first use.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request)
        if (cached) return cached
        const response = await fetch(request)
        if (response.ok) {
          await cache.put(request, response.clone())
          void trim(cache)
        }
        return response
      }),
    )
  }
})
