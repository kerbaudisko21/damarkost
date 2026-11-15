/* Handler push untuk service worker Damar Kost (diimpor oleh sw.js buatan Workbox). */
self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { data = { body: event.data && event.data.text() } }
  const title = data.title || 'Damar Kost'
  const options = {
    body: data.body || '',
    icon: '/pwa-192.png',
    badge: '/pwa-192.png',
    tag: 'damar-reminder',
    renotify: true,
    data: { url: data.url || '/' },
  }
  event.waitUntil((async () => {
    await self.registration.showNotification(title, options)
    if (typeof data.badge === 'number' && self.navigator && self.navigator.setAppBadge) {
      try { await self.navigator.setAppBadge(data.badge) } catch { /* abaikan */ }
    }
  })())
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const c of all) { if ('focus' in c) { await c.navigate(url).catch(() => undefined); return c.focus() } }
    return self.clients.openWindow(url)
  })())
})
