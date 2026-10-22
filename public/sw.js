// Offline support. Pages are network-first so new versions show up right
// away; everything else (hashed, immutable build assets) is cache-first.
const CACHE = 'evenly-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      if (request.mode === 'navigate') {
        try {
          const response = await fetch(request)
          cache.put(request, response.clone())
          return response
        } catch {
          return (await cache.match(request)) ?? (await cache.match('./')) ?? Response.error()
        }
      }
      const cached = await cache.match(request)
      if (cached) return cached
      const response = await fetch(request)
      if (response.ok) cache.put(request, response.clone())
      return response
    }),
  )
})
