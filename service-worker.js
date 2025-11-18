// service-worker.js - Safari PWA Cache Fix
const CACHE_NAME = 'life-tracker-safari-v2.0-' + new Date().getTime();
const urlsToCache = [
  '/Proj23_functionUpdates/',
  '/Proj23_functionUpdates/index.html',
  '/Proj23_functionUpdates/style.css',
  '/Proj23_functionUpdates/app.js',
  '/Proj23_functionUpdates/db.js',
  '/Proj23_functionUpdates/manifest.json'
];

// Nuclear option for Safari PWA cache
self.addEventListener('install', (event) => {
  console.log('🔄 Service Worker installing (Safari Fix)');
  
  // Delete ALL existing caches first
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('🗑️ Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      console.log('✅ All caches cleared, creating new cache:', CACHE_NAME);
      return caches.open(CACHE_NAME);
    }).then((cache) => {
      console.log('📦 Caching fresh files');
      return cache.addAll(urlsToCache);
    }).then(() => {
      console.log('🚀 Skipping waiting');
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (event) => {
  console.log('🎯 Service Worker activating (Safari Fix)');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🧹 Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('👑 Claiming clients');
      return self.clients.claim();
    }).then(() => {
      // Send message to all clients to reload
      return self.clients.matchAll();
    }).then((clients) => {
      clients.forEach((client) => {
        console.log('🔄 Telling client to reload:', client.url);
        client.postMessage({ type: 'RELOAD_PAGE' });
      });
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Network-first strategy for HTML to always get fresh version
  if (event.request.url.indexOf('/Proj23_functionUpdates/') !== -1 && 
      event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Update cache with fresh version
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  // Cache-first for other resources
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request).then((response) => {
          // Don't cache external resources
          if (!event.request.url.startsWith('http')) {
            return response;
          }
          
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        });
      })
  );
});

// Handle messages from main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});
