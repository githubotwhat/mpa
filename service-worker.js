// ============================================================
// MPA REGISTRO MÓVIL - SERVICE WORKER
// Versión 1.0
// ============================================================

const CACHE_NAME = 'mpa-registro-movil-v3';

const APP_SHELL = [
  '/mpa/',
  '/mpa/index.html',
  '/mpa/manifest.json',
  '/mpa/icon-192.png',
  '/mpa/icon-512.png',
  '/mpa/tractor.png'
];

// ------------------------------------------------------------
// INSTALACIÓN
// ------------------------------------------------------------
self.addEventListener('install', event => {
  console.log('[MPA] Instalando Service Worker...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(APP_SHELL);
      })
      .then(() => {
        console.log('[MPA] Archivos principales guardados.');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[MPA] Error durante instalación:', error);
      })
  );
});

// ------------------------------------------------------------
// ACTIVACIÓN
// ------------------------------------------------------------
self.addEventListener('activate', event => {
  console.log('[MPA] Activando Service Worker...');

  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => cacheName !== CACHE_NAME)
            .map(cacheName => caches.delete(cacheName))
        );
      })
      .then(() => {
        console.log('[MPA] Caché anterior eliminada.');
        return self.clients.claim();
      })
  );
});

// ------------------------------------------------------------
// PETICIONES
// ------------------------------------------------------------
self.addEventListener('fetch', event => {

  const request = event.request;
  const url = new URL(request.url);

  // ----------------------------------------------------------
  // NO INTERCEPTAR GOOGLE APPS SCRIPT
  // ----------------------------------------------------------
  // Las consultas de tu aplicación a Google Sheets necesitan
  // conexión directa a Internet.
  // ----------------------------------------------------------

  if (
    url.hostname.includes('script.google.com') ||
    url.hostname.includes('googleusercontent.com') ||
    url.hostname.includes('googleapis.com')
  ) {
    return;
  }

  // ----------------------------------------------------------
  // NO INTERCEPTAR PETICIONES POST
  // ----------------------------------------------------------

  if (request.method !== 'GET') {
    return;
  }

  // ----------------------------------------------------------
  // ARCHIVOS DE LA PROPIA APLICACIÓN
  // ----------------------------------------------------------

  if (url.origin === self.location.origin) {

    event.respondWith(
      caches.match(request)
        .then(cachedResponse => {

          if (cachedResponse) {
            return cachedResponse;
          }

          return fetch(request)
            .then(networkResponse => {

              if (
                !networkResponse ||
                networkResponse.status !== 200 ||
                networkResponse.type === 'opaque'
              ) {
                return networkResponse;
              }

              const responseClone = networkResponse.clone();

              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(request, responseClone);
                });

              return networkResponse;
            })
            .catch(() => {

              // Si no hay Internet y no existe en caché,
              // intentamos cargar la página principal.

              return caches.match('/mpa/index.html');
            });

        })
    );

    return;
  }

  // ----------------------------------------------------------
  // RECURSOS EXTERNOS
  // ----------------------------------------------------------
  // Por ejemplo Chart.js o Google Fonts.
  // Primero intenta Internet y, si falla, usa caché.
  // ----------------------------------------------------------

  event.respondWith(

    fetch(request)
      .then(networkResponse => {

        if (
          !networkResponse ||
          networkResponse.status !== 200
        ) {
          return networkResponse;
        }

        const responseClone = networkResponse.clone();

        caches.open(CACHE_NAME)
          .then(cache => {
            cache.put(request, responseClone);
          });

        return networkResponse;
      })

      .catch(() => {
        return caches.match(request);
      })

  );

});

// ------------------------------------------------------------
// MENSAJE PARA FORZAR ACTUALIZACIÓN
// ------------------------------------------------------------

self.addEventListener('message', event => {

  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }

});
