// THE LORD OF CRYPTO — Service Worker for PWA Notifications & Background Sync
const CACHE_NAME = 'thelord-cp-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming Web Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const title = data.title || '🦁 THE LORD C.P — تنبيه تنفيذي';
    const options = {
      body: data.message || data.body || 'لديك تحديث جديد في المنظومة',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      vibrate: [200, 100, 200],
      data: {
        url: data.url || '/dashboard'
      },
      tag: data.tag || 'thelord-notification',
      renotify: true
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('🦁 THE LORD C.P', {
        body: text,
        icon: '/favicon.ico'
      })
    );
  }
});

// Handle local broadcast from client page
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, icon, url } = event.data;
    event.waitUntil(
      self.registration.showNotification(title || '🦁 THE LORD C.P', {
        body: body || 'لديك تحديث جديد في المنظومة',
        icon: icon || '/favicon.ico',
        badge: '/favicon.ico',
        vibrate: [200, 100, 200],
        data: { url: url || '/' },
        tag: 'thelord-immediate-notification',
        renotify: true
      })
    );
  }
});

// Handle clicking on a notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
