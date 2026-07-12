const CACHE_VERSION = 'kaisse-v21';
const ASSETS = [
  './index.html',
  './styles.css',
  './app.js',
  './db.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      // Chaque fichier est mis en cache individuellement : si l'un échoue,
      // les autres restent quand même disponibles hors ligne.
      await Promise.all(
        ASSETS.map(async (url) => {
          try {
            const response = await fetch(url, { cache: 'no-store' });
            if (response.ok) await cache.put(url, response);
          } catch (e) {
            // Ignore silencieusement : ce fichier sera re-tenté à la prochaine requête
          }
        })
      );
      // Force ce nouveau Service Worker à prendre le relais immédiatement,
      // sans attendre la fermeture complète des anciens onglets.
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)));
      // Prend le contrôle de toutes les pages ouvertes immédiatement.
      await self.clients.claim();
    })()
  );
});

// Stratégie : cache d'abord (rapide, fiable hors ligne), avec mise à jour en arrière-plan si en ligne.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Toute navigation (ouverture de l'app, changement de page) renvoie index.html si hors ligne.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(event.request);
          return fresh;
        } catch (e) {
          const cached = await caches.match('./index.html');
          return cached || Response.error();
        }
      })()
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(event.request, { ignoreSearch: true });
      if (cached) {
        // Rafraîchit le cache en arrière-plan si une connexion est disponible, sans bloquer l'affichage.
        fetch(event.request).then((response) => {
          if (response && response.ok) {
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, response));
          }
        }).catch(() => {});
        return cached;
      }
      try {
        const response = await fetch(event.request);
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
        }
        return response;
      } catch (e) {
        return Response.error();
      }
    })()
  );
});

// Permet à la page de forcer l'activation immédiate du nouveau Service Worker
// (utilisé lors des mises à jour, voir app.js).
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
