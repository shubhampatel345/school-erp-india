const CACHE_NAME = 'shubh-erp-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Some assets may not exist yet — ignore failures
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests for same-origin resources
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;
  // Skip API calls (WhatsApp, etc.)
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request).then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
      // Network-first, cache fallback
      return networkFetch.catch(() => cached ?? caches.match('/'));
    })
  );
});

// ── Push Notifications ──────────────────────────────────────

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : 'You have a new notification' };
  }

  const title = data.title || 'SHUBH SCHOOL ERP';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/' },
    tag: data.type || 'general',
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));

  // Store in IndexedDB for notification history
  event.waitUntil(
    (async () => {
      try {
        const db = await openNotifDB();
        const tx = db.transaction('history', 'readwrite');
        tx.store.add({
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          title,
          body: options.body,
          type: data.type || 'general',
          url: data.url || '/',
          receivedAt: new Date().toISOString(),
          read: false,
        });
        await tx.done;
      } catch {
        // IndexedDB unavailable in older browsers — ignore
      }
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing window if open
      for (const client of windowClients) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Minimal IndexedDB helper for notification history
function openNotifDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('shubh-notif-history', 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('history')) {
        const store = db.createObjectStore('history', { keyPath: 'id' });
        store.createIndex('receivedAt', 'receivedAt', { unique: false });
      }
    };
    req.onsuccess = (e) => {
      const db = e.target.result;
      // Wrap in a minimal transaction API
      resolve({
        transaction: (storeName, mode) => {
          const tx = db.transaction(storeName, mode);
          return {
            store: {
              add: (item) => new Promise((res, rej) => {
                const r = tx.objectStore(storeName).add(item);
                r.onsuccess = () => res(r.result);
                r.onerror = () => rej(r.error);
              }),
            },
            done: new Promise((res, rej) => {
              tx.oncomplete = () => res();
              tx.onerror = () => rej(tx.error);
            }),
          };
        },
      });
    };
    req.onerror = () => reject(req.error);
  });
}
