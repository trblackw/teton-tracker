const CACHE_NAME = 'teton-tracker-v2'; // Increment version
const RUNTIME_CACHE = 'teton-tracker-runtime-v2';
const API_CACHE = 'teton-tracker-api-v2';
const STATIC_CACHE = 'teton-tracker-static-v2';
const IMAGE_CACHE = 'teton-tracker-images-v2';

// Detect development mode
const isDevelopment =
  self.location.hostname === 'localhost' ||
  self.location.hostname === '127.0.0.1';

// Enhanced caching strategy with longer TTLs for low connectivity
const CACHE_STRATEGIES = {
  API_TTL: 30 * 60 * 1000, // 30 minutes for API responses
  STATIC_TTL: 7 * 24 * 60 * 60 * 1000, // 7 days for static assets
  IMAGE_TTL: 24 * 60 * 60 * 1000, // 24 hours for images
  FALLBACK_TTL: 60 * 60 * 1000, // 1 hour for fallback responses
};

// Resources to cache immediately - expanded for offline functionality
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/logo.svg',
  '/manifest.json',
  '/favicon.ico',
  // Add critical routes for offline access
  '/settings',
  '/runs',
  '/flights',
  '/notifications',
  // Add static assets
  '/styles/globals.css',
];

// API endpoints to cache with enhanced patterns
const CACHEABLE_APIS = [
  // TomTom APIs
  /^https:\/\/api\.tomtom\.com\/routing/,
  /^https:\/\/api\.tomtom\.com\/traffic/,

  // AviationStack APIs
  /^https:\/\/api\.aviationstack\.com/,

  // Your app's API endpoints
  /\/api\/runs/,
  /\/api\/preferences/,
  /\/api\/notifications/,
  /\/api\/flights/,
  /\/api\/organizations/,

  // Configuration endpoints
  /\/api\/config/,
];

// Network-first strategies for critical data
const NETWORK_FIRST_PATTERNS = [
  /\/api\/runs$/,
  /\/api\/notifications$/,
  /\/api\/auth\//,
];

// Cache-first strategies for static assets
const CACHE_FIRST_PATTERNS = [
  /\.(?:js|css|woff2?|ttf|eot)$/,
  /\/logo\./,
  /\/favicon\./,
  /\/manifest\.json$/,
];

// Install event - cache app shell with better error handling
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker v2...');

  event.waitUntil(
    Promise.all([
      // Cache app shell
      caches.open(CACHE_NAME).then(cache => {
        console.log('[SW] Caching app shell');
        return cache.addAll(PRECACHE_URLS).catch(error => {
          console.warn('[SW] Failed to cache some resources:', error);
          // Continue installation even if some resources fail to cache
        });
      }),

      // Pre-cache critical static assets
      caches.open(STATIC_CACHE).then(cache => {
        console.log('[SW] Setting up static cache');
        return cache.addAll(['/styles/globals.css']).catch(error => {
          console.warn('[SW] Failed to cache static assets:', error);
        });
      }),
    ])
      .then(() => {
        console.log('[SW] App shell cached successfully');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[SW] Error during installation:', error);
      })
  );
});

// Activate event - cleanup old caches with better version management
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker v2...');

  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        const validCaches = [
          CACHE_NAME,
          RUNTIME_CACHE,
          API_CACHE,
          STATIC_CACHE,
          IMAGE_CACHE,
        ];

        return Promise.all(
          cacheNames.map(cacheName => {
            if (!validCaches.includes(cacheName)) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),

      // Take control of all pages immediately
      self.clients.claim(),
    ])
      .then(() => {
        console.log('[SW] Service worker activated and ready');
      })
      .catch(error => {
        console.error('[SW] Error during activation:', error);
      })
  );
});

// Enhanced fetch event with smart caching strategies
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and chrome-extension requests
  if (request.method !== 'GET' || url.protocol.startsWith('chrome-extension')) {
    return;
  }

  // Handle different types of requests with appropriate strategies
  event.respondWith(handleFetch(request));
});

// Smart fetch handler with multiple caching strategies
async function handleFetch(request) {
  const url = new URL(request.url);

  try {
    // Strategy 1: Cache-first for static assets
    if (isCacheFirstResource(url)) {
      return await cacheFirstStrategy(request);
    }

    // Strategy 2: Network-first for critical API calls
    if (isNetworkFirstResource(url)) {
      return await networkFirstStrategy(request);
    }

    // Strategy 3: API caching with stale-while-revalidate
    if (isApiRequest(url)) {
      return await apiCacheStrategy(request);
    }

    // Strategy 4: Image caching
    if (isImageRequest(request)) {
      return await imageCacheStrategy(request);
    }

    // Strategy 5: Default stale-while-revalidate for everything else
    return await staleWhileRevalidateStrategy(request);
  } catch (error) {
    console.error('[SW] Fetch error:', error);
    return await fallbackStrategy(request);
  }
}

// Cache-first strategy for static assets
async function cacheFirstStrategy(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    // Optionally update cache in background
    updateCacheInBackground(request, cache);
    return cachedResponse;
  }

  const networkResponse = await fetch(request);
  if (networkResponse.ok) {
    cache.put(request, networkResponse.clone());
  }
  return networkResponse;
}

// Network-first strategy for critical data
async function networkFirstStrategy(request) {
  const cache = await caches.open(API_CACHE);

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.warn('[SW] Network failed, trying cache:', error);
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// API caching with intelligent TTL
async function apiCacheStrategy(request) {
  const cache = await caches.open(API_CACHE);
  const cachedResponse = await cache.match(request);

  // Check if cached response is still fresh
  if (
    cachedResponse &&
    (await isCacheFresh(cachedResponse, CACHE_STRATEGIES.API_TTL))
  ) {
    // Update cache in background
    updateCacheInBackground(request, cache);
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // Add timestamp header for cache freshness checking
      const responseWithTimestamp = new Response(networkResponse.body, {
        status: networkResponse.status,
        statusText: networkResponse.statusText,
        headers: {
          ...Object.fromEntries(networkResponse.headers.entries()),
          'sw-cached-at': Date.now().toString(),
        },
      });

      cache.put(request, responseWithTimestamp.clone());
      return responseWithTimestamp;
    }
    return networkResponse;
  } catch (error) {
    // Return stale cache if available
    if (cachedResponse) {
      console.log('[SW] Returning stale cache due to network error');
      return cachedResponse;
    }
    throw error;
  }
}

// Image caching strategy
async function imageCacheStrategy(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (
      networkResponse.ok &&
      networkResponse.headers.get('content-type')?.startsWith('image/')
    ) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Return placeholder or cached version if available
    return cachedResponse || new Response('', { status: 503 });
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidateStrategy(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cachedResponse = await cache.match(request);

  // Always try to update cache in background
  const networkUpdate = fetch(request)
    .then(response => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => {
      // Silently fail background updates
    });

  // Return cached response immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }

  // Wait for network if no cache available
  return networkUpdate;
}

// Fallback strategy when all else fails
async function fallbackStrategy(request) {
  const url = new URL(request.url);

  // Return cached app shell for navigation requests
  if (request.mode === 'navigate') {
    const cache = await caches.open(CACHE_NAME);
    return (await cache.match('/')) || new Response('', { status: 503 });
  }

  // Return empty response for other requests
  return new Response('', { status: 503, statusText: 'Service Unavailable' });
}

// Helper functions for resource classification
function isCacheFirstResource(url) {
  return CACHE_FIRST_PATTERNS.some(pattern => pattern.test(url.pathname));
}

function isNetworkFirstResource(url) {
  return NETWORK_FIRST_PATTERNS.some(pattern => pattern.test(url.pathname));
}

function isApiRequest(url) {
  return (
    url.pathname.startsWith('/api/') ||
    CACHEABLE_APIS.some(pattern => pattern.test(url.href))
  );
}

function isImageRequest(request) {
  const acceptHeader = request.headers.get('accept') || '';
  return (
    acceptHeader.includes('image/') ||
    /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(new URL(request.url).pathname)
  );
}

// Check if cached response is still fresh
async function isCacheFresh(response, ttl) {
  const cachedAt = response.headers.get('sw-cached-at');
  if (!cachedAt) return false;

  const age = Date.now() - parseInt(cachedAt);
  return age < ttl;
}

// Update cache in background without blocking response
async function updateCacheInBackground(request, cache) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
  } catch (error) {
    // Silently fail background updates
    console.warn('[SW] Background cache update failed:', error);
  }
}

// Background sync for when connectivity returns
self.addEventListener('sync', event => {
  console.log('[SW] Background sync triggered:', event.tag);

  if (event.tag === 'background-sync') {
    event.waitUntil(handleBackgroundSync());
  }
});

// Handle background sync
async function handleBackgroundSync() {
  try {
    // Invalidate all caches to force fresh data
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => {
        if (cacheName.includes('api')) {
          return caches.delete(cacheName);
        }
      })
    );

    console.log('[SW] Background sync completed - caches refreshed');
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Listen for messages from the app
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(clearAllCaches());
  }
});

// Clear all caches
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(name => caches.delete(name)));
  console.log('[SW] All caches cleared');
}

// Handle push notifications
self.addEventListener('push', event => {
  console.log('[SW] Push notification received:', event);

  if (event.data) {
    const data = event.data.json();

    // Create notification options based on notification type
    const options = createNotificationOptions(data);

    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

// Create notification options based on notification type
function createNotificationOptions(data) {
  const baseOptions = {
    body: data.body,
    icon: data.icon || '/logo.svg',
    badge: data.badge || '/favicon.ico',
    vibrate: getVibratePattern(data.type),
    data: {
      ...data.data,
      type: data.type,
      timestamp: data.timestamp,
      notificationId: data.id,
    },
    requireInteraction: shouldRequireInteraction(data.type),
    silent: false,
    tag: data.id,
  };

  // Add type-specific actions
  switch (data.type) {
    case 'flight-status-change':
      baseOptions.actions = [
        { action: 'view', title: 'View Details', icon: '/logo.svg' },
        { action: 'dismiss', title: 'Dismiss', icon: '/logo.svg' },
      ];
      break;

    case 'flight-departure-reminder':
    case 'flight-arrival-reminder':
      baseOptions.actions = [
        { action: 'view', title: 'View Flight', icon: '/logo.svg' },
        { action: 'traffic', title: 'Check Traffic', icon: '/logo.svg' },
        { action: 'dismiss', title: 'Dismiss', icon: '/logo.svg' },
      ];
      break;

    case 'traffic-alert':
      baseOptions.actions = [
        { action: 'view', title: 'View Route', icon: '/logo.svg' },
        { action: 'alternative', title: 'Find Alternative', icon: '/logo.svg' },
        { action: 'dismiss', title: 'Dismiss', icon: '/logo.svg' },
      ];
      break;

    case 'run-reminder':
      baseOptions.actions = [
        { action: 'view', title: 'View Details', icon: '/logo.svg' },
        { action: 'navigate', title: 'Navigate', icon: '/logo.svg' },
        { action: 'dismiss', title: 'Dismiss', icon: '/logo.svg' },
      ];
      break;

    default:
      baseOptions.actions = [
        { action: 'view', title: 'View', icon: '/logo.svg' },
        { action: 'dismiss', title: 'Dismiss', icon: '/logo.svg' },
      ];
  }

  return baseOptions;
}

// Get vibration pattern based on notification type
function getVibratePattern(type) {
  switch (type) {
    case 'flight-status-change':
      return [200, 100, 200, 100, 200]; // Urgent pattern
    case 'traffic-alert':
      return [300, 150, 300]; // Alert pattern
    case 'run-reminder':
      return [200, 100, 200]; // Reminder pattern
    case 'flight-departure-reminder':
    case 'flight-arrival-reminder':
      return [100, 50, 100]; // Gentle reminder
    default:
      return [200, 100, 200];
  }
}

// Determine if notification should require interaction
function shouldRequireInteraction(type) {
  switch (type) {
    case 'flight-status-change':
    case 'traffic-alert':
    case 'run-reminder':
      return true; // Critical notifications require interaction
    default:
      return false;
  }
}

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification clicked:', event);

  event.notification.close();

  const { action } = event;
  const { type, data } = event.notification.data;

  // Handle different actions based on notification type
  event.waitUntil(handleNotificationAction(action, type, data));
});

// Handle notification actions
async function handleNotificationAction(action, type, data) {
  console.log('[SW] Handling notification action:', action, type, data);

  // Get or open the main window
  const windowClient = await getOrOpenWindow('/');

  if (!windowClient) {
    console.error('[SW] Could not open or focus window');
    return;
  }

  // Send message to the main window to handle the action
  windowClient.postMessage({
    type: 'NOTIFICATION_ACTION',
    action,
    notificationType: type,
    data,
  });

  // Focus the window
  windowClient.focus();

  // Handle specific actions
  switch (action) {
    case 'view':
      handleViewAction(type, data, windowClient);
      break;
    case 'traffic':
      handleTrafficAction(data, windowClient);
      break;
    case 'navigate':
      handleNavigateAction(data, windowClient);
      break;
    case 'alternative':
      handleAlternativeRouteAction(data, windowClient);
      break;
    case 'dismiss':
      // Already handled by closing the notification
      break;
    default:
      console.log('[SW] Unknown action:', action);
  }
}

// Handle view action - navigate to appropriate page
function handleViewAction(type, data, windowClient) {
  let targetUrl = '/';

  switch (type) {
    case 'flight-status-change':
    case 'flight-departure-reminder':
    case 'flight-arrival-reminder':
      targetUrl = '/flights';
      break;
    case 'traffic-alert':
      targetUrl = '/runs';
      break;
    case 'run-reminder':
      targetUrl = '/runs';
      break;
  }

  windowClient.postMessage({
    type: 'NAVIGATE',
    url: targetUrl,
    data,
  });
}

// Handle traffic action
function handleTrafficAction(data, windowClient) {
  windowClient.postMessage({
    type: 'CHECK_TRAFFIC',
    flightNumber: data.flightNumber,
    airport: data.airport,
  });
}

// Handle navigate action
function handleNavigateAction(data, windowClient) {
  windowClient.postMessage({
    type: 'NAVIGATE_TO_PICKUP',
    runId: data.runId,
    location: data.location,
  });
}

// Handle alternative route action
function handleAlternativeRouteAction(data, windowClient) {
  windowClient.postMessage({
    type: 'FIND_ALTERNATIVE_ROUTE',
    route: data.route,
  });
}

// Get existing window or open new one
async function getOrOpenWindow(url) {
  const windowClients = await clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });

  // Try to find an existing window
  for (const client of windowClients) {
    if (client.url.includes(url) && 'focus' in client) {
      return client;
    }
  }

  // If no existing window, try to open a new one
  if (clients.openWindow) {
    return clients.openWindow(url);
  }

  return null;
}

console.log('[SW] Service worker script loaded');
