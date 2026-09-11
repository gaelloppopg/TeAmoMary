/* Service Worker - Cache offline */

const CACHE = "novia-v1";
const ASSETS = [
  "./",
  "./login.html",
  "./index.html",
  "./css/style.css",
  "./css/animations.css",
  "./css/responsive.css",
  "./js/script.js",
  "./js/contador.js",
  "./js/confeti.js",
  "./js/auth.js",
  "./js/cartas.js",
  "./js/razones.js",
  "./js/juego.js",
  "./js/cuponera.js",
  "./js/galeria.js",
  "./js/musica-global.js",
  "./js/pwa.js",
  "./manifest.json"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const network = fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});