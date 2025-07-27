// Service Worker for offline functionality
const CACHE_NAME = 'sportbet-v1';
const STATIC_CACHE = 'sportbet-static-v1';
const API_CACHE = 'sportbet-api-v1';

// Assets to cache for offline use
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/favicon.ico',
];

// API endpoints to cache
const CACHEABLE_APIS = [
  '/api/sports',
  '/api/odds',
  '/api/user/profile',
  '/api/wallet/balance',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      caches.open(API_CACHE) // Just open the API cache
    ]).then(() => {
      console.log('[SW] Installation complete');
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== STATIC_CACHE && cacheName !== API_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Activation complete');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets
  if (request.destination === 'document' || 
      request.destination === 'script' || 
      request.destination === 'style' ||
      request.destination === 'image') {
    event.respondWith(handleStaticRequest(request));
    return;
  }

  // Default: try network first, fallback to cache
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request);
    })
  );
});

// Handle API requests with caching strategy
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const method = request.method.toLowerCase();

  // Only cache GET requests
  if (method !== 'get') {
    try {
      return await fetch(request);
    } catch (error) {
      return new Response(
        JSON.stringify({ 
          error: 'Network unavailable', 
          offline: true,
          message: 'This action requires an internet connection'
        }),
        { 
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }

  // Check if this API should be cached
  const shouldCache = CACHEABLE_APIS.some(api => url.pathname.startsWith(api));

  if (shouldCache) {
    return handleCacheableApi(request);
  }

  // For non-cacheable APIs, try network first
  try {
    const response = await fetch(request);
    return response;
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: 'Network unavailable', 
        offline: true 
      }),
      { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle cacheable API requests
async function handleCacheableApi(request) {
  const cache = await caches.open(API_CACHE);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const responseClone = networkResponse.clone();
      await cache.put(request, responseClone);
      
      // Add cache timestamp
      const response = new Response(await networkResponse.text(), {
        status: networkResponse.status,
        statusText: networkResponse.statusText,
        headers: {
          ...Object.fromEntries(networkResponse.headers.entries()),
          'X-Cache': 'MISS',
          'X-Cache-Date': new Date().toISOString()
        }
      });
      
      return response;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    // Network failed, try cache
    console.log('[SW] Network failed, trying cache for:', request.url);
    
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Add offline indicator to cached response
      const cachedData = await cachedResponse.json();
      const offlineResponse = {
        ...cachedData,
        offline: true,
        cached: true,
        cacheDate: cachedResponse.headers.get('X-Cache-Date')
      };
      
      return new Response(JSON.stringify(offlineResponse), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': 'HIT',
          'X-Offline': 'true'
        }
      });
    }

    // No cache available
    return new Response(
      JSON.stringify({ 
        error: 'Data unavailable offline',
        offline: true,
        message: 'This content is not available offline'
      }),
      { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle static asset requests
async function handleStaticRequest(request) {
  // Try cache first for static assets
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }

  // If not in cache, try network
  try {
    const networkResponse = await fetch(request);
    
    // Cache the response for future use
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Network failed and no cache available
    console.log('[SW] Static asset unavailable:', request.url);
    
    // Return offline page for document requests
    if (request.destination === 'document') {
      const offlineResponse = await caches.match('/offline.html');
      return offlineResponse || new Response('Offline', { status: 503 });
    }
    
    throw error;
  }
}

// Handle background sync
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'pending-bets') {
    event.waitUntil(syncPendingBets());
  } else if (event.tag === 'user-actions') {
    event.waitUntil(syncUserActions());
  }
});

// Sync pending bets when back online
async function syncPendingBets() {
  try {
    console.log('[SW] Syncing pending bets...');
    
    // Get pending bets from IndexedDB or localStorage
    const pendingBets = await getPendingBets();
    
    for (const bet of pendingBets) {
      try {
        const response = await fetch('/api/betting/place-bet', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${bet.token}`
          },
          body: JSON.stringify(bet.data)
        });
        
        if (response.ok) {
          await removePendingBet(bet.id);
          console.log('[SW] Bet synced successfully:', bet.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync bet:', bet.id, error);
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Sync user actions when back online
async function syncUserActions() {
  try {
    console.log('[SW] Syncing user actions...');
    
    const pendingActions = await getPendingUserActions();
    
    for (const action of pendingActions) {
      try {
        const response = await fetch(action.endpoint, {
          method: action.method,
          headers: action.headers,
          body: action.body
        });
        
        if (response.ok) {
          await removePendingUserAction(action.id);
          console.log('[SW] User action synced:', action.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync user action:', action.id, error);
      }
    }
  } catch (error) {
    console.error('[SW] User actions sync failed:', error);
  }
}

// Helper functions for IndexedDB operations
async function getPendingBets() {
  // Implementation would use IndexedDB
  // For now, return empty array
  return [];
}

async function removePendingBet(id) {
  // Implementation would remove from IndexedDB
  console.log('[SW] Removing pending bet:', id);
}

async function getPendingUserActions() {
  // Implementation would use IndexedDB
  return [];
}

async function removePendingUserAction(id) {
  // Implementation would remove from IndexedDB
  console.log('[SW] Removing pending user action:', id);
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const options = {
    body: 'You have a new notification',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View',
        icon: '/view-icon.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/close-icon.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('SportBet', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
