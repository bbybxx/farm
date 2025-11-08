/* eslint-disable no-restricted-globals */

const CACHE_NAME = 'craft-calculator-v3';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png'
];

// Cache names for different types of content
const STATIC_CACHE = 'craft-calculator-static-v3';
const IMAGES_CACHE = 'craft-calculator-images-v3';
const API_CACHE = 'craft-calculator-api-v3';

// All location images to pre-cache
const LOCATION_IMAGES = [
  '/locations_img/Black_Rock_Canyon.png',
  '/locations_img/Cane_Pole_Ridge.png',
  '/locations_img/Ember_Lagoon.png',
  '/locations_img/Forest.png',
  '/locations_img/Garys_Crushroom.png',
  '/locations_img/Haunted_House.png',
  '/locations_img/Highland_Hills.png',
  '/locations_img/Jundland_Desert.png',
  '/locations_img/Misty_Forest.png',
  '/locations_img/Mount_Banon.png',
  '/locations_img/Santas_Workshop.png',
  '/locations_img/Small_Cave.png',
  '/locations_img/Small_Spring.png',
  '/locations_img/Whispering_Creek.png'
];

// Common item images to pre-cache (subset of most used)
const COMMON_ITEM_IMAGES = [
  '/img/items/feathers.png',
  '/img/items/duckfeather.png',
  '/img/items/ducky.png',
  '/img/items/eggsandwich.png',
  '/img/items/steak.png',
  '/img/items/bacon.png',
  '/img/items/cornbread.png',
  '/img/items/applepie2.png',
  '/img/items/goldapple2.png',
  '/img/items/king_apple3.png',
  '/img/items/king_apple_gold.png',
  '/img/items/coal.png',
  '/img/items/ironring.png',
  '/img/items/goldring.png',
  '/img/items/silver.png',
  '/img/items/goldbar.png',
  '/img/items/silverbar.png',
  '/img/items/emerald.png',
  '/img/items/ruby.png',
  '/img/items/diamond.png',
  '/img/items/pearl.png',
  '/img/items/coral.png',
  '/img/items/shell.png',
  '/img/items/fish.png',
  '/img/items/lobster.png',
  '/img/items/crab.png',
  '/img/items/shrimp.png',
  '/img/items/octopus.png',
  '/img/items/squid.png',
  '/img/items/seahorse.png',
  '/img/items/starfish.png',
  '/img/items/jellyfish.png',
  '/img/items/turtle.png',
  '/img/items/dolphin.png',
  '/img/items/shark.png',
  '/img/items/whale.png',
  '/img/items/clam.png',
  '/img/items/oyster.png',
  '/img/items/mussel.png',
  '/img/items/scallop.png',
  '/img/items/abalone.png',
  '/img/items/conch.png',
  '/img/items/whelk.png',
  '/img/items/periwinkle.png',
  '/img/items/limpet.png',
  '/img/items/barnacle.png',
  '/img/items/urchin.png',
  '/img/items/anemone.png',
  '/img/items/sponge.png',
  '/img/items/seaweed.png',
  '/img/items/kelp.png',
  '/img/items/algae.png'
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE)
        .then((cache) => {
          console.log('[ServiceWorker] Caching app shell');
          return cache.addAll(urlsToCache);
        }),
      caches.open(IMAGES_CACHE)
        .then((cache) => {
          console.log('[ServiceWorker] Pre-caching location images');
          return cache.addAll(LOCATION_IMAGES);
        })
        .then(() => {
          console.log('[ServiceWorker] Pre-caching common item images');
          return caches.open(IMAGES_CACHE).then(cache => cache.addAll(COMMON_ITEM_IMAGES));
        })
    ]).then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== IMAGES_CACHE && cacheName !== API_CACHE) {
            console.log('[ServiceWorker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Handle navigation requests (PWA pages) - always serve from cache first
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html')
        .then((response) => {
          if (response) {
            return response;
          }
          // If not cached, try to fetch from network
          return fetch(event.request);
        })
        .catch(() => {
          // If both cache and network fail, return cached index.html
          return caches.match('/index.html');
        })
    );
    return;
  }

  // Handle images - cache them aggressively
  if (event.request.destination === 'image' ||
      url.pathname.includes('/locations_img/') ||
      url.pathname.includes('/img/')) {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            return response;
          }

          return fetch(event.request).then((response) => {
            if (response.status === 200) {
              const responseClone = response.clone();
              caches.open(IMAGES_CACHE).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
            return response;
          });
        })
    );
    return;
  }

  // Handle API requests - cache with shorter TTL
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            return response;
          }

          return fetch(event.request).then((response) => {
            if (response.status === 200) {
              const responseClone = response.clone();
              caches.open(API_CACHE).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
            return response;
          });
        })
    );
    return;
  }

  // Handle static assets and pages
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }

        return fetch(event.request).then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        }).catch(() => {
          // Network failed, return cached version if available
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
  );
});

// Listen for messages from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_IMAGES') {
    const imageUrls = event.data.urls;
    event.waitUntil(
      caches.open(IMAGES_CACHE).then((cache) => {
        return cache.addAll(imageUrls);
      })
    );
  }

  if (event.data && event.data.type === 'CACHE_ALL_IMAGES') {
    // Cache all location images and common items for instant access
    const allImagesToCache = [
      ...LOCATION_IMAGES,
      ...COMMON_ITEM_IMAGES,
      // Add more images as needed
      '/img/items/wine.png',
      '/img/items/bread.png',
      '/img/items/cheese.png',
      '/img/items/milk.png',
      '/img/items/egg.png',
      '/img/items/flour.png',
      '/img/items/honey.png'
    ];

    event.waitUntil(
      caches.open(IMAGES_CACHE).then((cache) => {
        console.log('[ServiceWorker] Caching all images for instant access');
        return Promise.allSettled(
          allImagesToCache.map(url =>
            fetch(url).then(response => {
              if (response.ok) {
                return cache.put(url, response);
              }
            }).catch(() => {
              // Ignore failed fetches
            })
          )
        ).then(() => {
          console.log('[ServiceWorker] All images cached');
        });
      })
    );
  }
});
