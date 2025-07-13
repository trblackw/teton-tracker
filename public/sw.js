const CACHE_NAME = 'teton-tracker-v1';
const RUNTIME_CACHE = 'teton-tracker-runtime';
const API_CACHE = 'teton-tracker-api';

// Detect development mode
const isDevelopment =
  self.location.hostname === 'localhost' ||
  self.location.hostname === '127.0.0.1';

// Resources to cache immediately
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/logo.svg',
  '/manifest.json',
  // Note: Add PNG icons when available
  // '/logo-192.png',
  // '/logo-512.png',
];

// API endpoints to cache
const CACHEABLE_APIS = [
  /^https:\/\/api\.tomtom\.com\/routing/,
  /^https:\/\/opensky-network\.org\/api/,
];

// Install event - cache app shell
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching app shell');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        console.log('[SW] App shell cached successfully');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[SW] Error caching app shell:', error);
      })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches
      .keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (
              cacheName !== CACHE_NAME &&
              cacheName !== RUNTIME_CACHE &&
              cacheName !== API_CACHE
            ) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', event => {
  const { request } = event;

  // Skip service worker caching in development mode
  if (isDevelopment) {
    console.log('[SW] Development mode: skipping cache for', request.url);
    return;
  }

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle different types of requests
  if (
    request.url.includes('/api/') ||
    CACHEABLE_APIS.some(pattern => pattern.test(request.url))
  ) {
    // API requests - Network First with Cache Fallback
    event.respondWith(handleApiRequest(request));
  } else if (request.destination === 'document') {
    // HTML documents - Network First with Cache Fallback
    event.respondWith(handleDocumentRequest(request));
  } else {
    // Static assets - Cache First with Network Fallback
    event.respondWith(handleStaticRequest(request));
  }
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  try {
    console.log('[SW] Fetching API request:', request.url);

    // Try network first
    const response = await fetch(request);

    if (response.ok) {
      // Cache successful API responses
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
      console.log('[SW] API response cached:', request.url);
    }

    return response;
  } catch (error) {
    console.error('[SW] Error fetching API request:', error);
    console.log('[SW] trying cache:', request.url);

    // If network fails, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[SW] Serving API request from cache:', request.url);
      return cachedResponse;
    }

    // Return offline fallback for API requests
    console.log(
      '[SW] No cache available for API request, returning offline fallback'
    );
    return createOfflineApiResponse(request);
  }
}

// Handle document requests with network-first strategy
async function handleDocumentRequest(request) {
  try {
    console.log('[SW] Fetching document request:', request.url);

    // Try network first
    const response = await fetch(request);

    if (response.ok) {
      // Cache successful document responses
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.error('[SW] Error fetching document request:', error);
    console.log('[SW] trying cache:', request.url);

    // If network fails, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[SW] Serving document from cache:', request.url);
      return cachedResponse;
    }

    // Return offline page if available
    const offlinePage = await caches.match('/');
    if (offlinePage) {
      console.log('[SW] Serving offline page');
      return offlinePage;
    }

    // Fallback response
    return new Response('Offline - Please check your internet connection', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

// Handle static assets with cache-first strategy
async function handleStaticRequest(request) {
  try {
    console.log('[SW] Checking cache for static request:', request.url);

    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[SW] Serving static asset from cache:', request.url);
      return cachedResponse;
    }

    // If not in cache, fetch from network
    console.log('[SW] Fetching static asset from network:', request.url);
    const response = await fetch(request);

    if (response.ok) {
      // Cache successful static responses
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
      console.log('[SW] Static asset cached:', request.url);
    }

    return response;
  } catch (error) {
    console.log('[SW] Failed to fetch static asset:', request.url, error);

    // Return a generic offline response for static assets
    return new Response('Resource not available offline', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

// Create offline API response with mock data
function createOfflineApiResponse(request) {
  const url = new URL(request.url);

  // Mock TomTom API response
  if (url.hostname.includes('tomtom.com')) {
    const mockTrafficData = {
      routes: [
        {
          summary: {
            lengthInMeters: 25000,
            travelTimeInSeconds: 1800,
            trafficDelayInSeconds: 300,
          },
          legs: [
            {
              summary: {
                lengthInMeters: 25000,
                travelTimeInSeconds: 1800,
                trafficDelayInSeconds: 300,
              },
            },
          ],
        },
      ],
    };

    return new Response(JSON.stringify(mockTrafficData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Mock OpenSky API response
  if (url.hostname.includes('opensky-network.org')) {
    const mockFlightData = {
      time: Math.floor(Date.now() / 1000),
      states: [
        [
          'ABC123  ', // icao24
          'AA1234  ', // callsign
          'United States', // origin_country
          1642680000, // time_position
          1642680000, // last_contact
          -122.4194, // longitude
          37.7749, // latitude
          10000, // baro_altitude
          false, // on_ground
          250, // velocity
          90, // true_track
          5, // vertical_rate
          null, // sensors
          1000, // geo_altitude
          null, // squawk
          false, // spi
          0, // position_source
        ],
      ],
    };

    return new Response(JSON.stringify(mockFlightData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Generic offline API response
  return new Response(
    JSON.stringify({
      error: 'Offline',
      message: 'This request is not available offline',
    }),
    {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

// Background sync for when network is restored
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    console.log('[SW] Background sync triggered');
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  console.log('[SW] Performing background sync...');

  // Clear expired cache entries
  const cacheNames = await caches.keys();
  for (const cacheName of cacheNames) {
    if (cacheName.includes('api')) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();

      for (const request of requests) {
        const response = await cache.match(request);
        if (response) {
          const cacheDate = new Date(response.headers.get('date'));
          const now = new Date();
          const hoursDiff = (now - cacheDate) / (1000 * 60 * 60);

          // Remove cache entries older than 2 hours
          if (hoursDiff > 2) {
            console.log('[SW] Removing expired cache entry:', request.url);
            await cache.delete(request);
          }
        }
      }
    }
  }

  console.log('[SW] Background sync completed');
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

// Log service worker events
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Skipping waiting...');
    self.skipWaiting();
  }
});

console.log('[SW] Service worker script loaded');
