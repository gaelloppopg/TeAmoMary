/* ============================================
   Service Worker - Cache offline + excepciones
   ============================================ */

// ⚠️ IMPORTANTE: cada vez que hagas cambios grandes en el sitio,
// cambiá el número de la versión (v2, v3, v4...) para forzar la actualización
const CACHE = "novia-v3";

const ASSETS = [
  "./",
  "./login.html",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./css/animations.css",
  "./css/responsive.css",
  "./js/script.js",
  "./js/contador.js",
  "./js/confeti.js",
  "./js/auth.js",
  "./js/galeria.js",
  "./js/musica-global.js",
  "./js/video-musica.js",
  "./js/pwa.js",
  "./js/diario.js",
  "./pages/historia.html",
  "./pages/recuerdos.html",
  "./pages/cartas.html",
  "./pages/razones.html",
  "./pages/juego.html",
  "./pages/cuponera.html",
  "./pages/diario.html"
];

// ========== INSTALACIÓN ==========
self.addEventListener("install", (e) => {
  console.log("📦 Service Worker instalando...");
  e.waitUntil(
    caches.open(CACHE).then((c) => {
      // Cargar cada asset individualmente para que si uno falla, no rompa todo
      return Promise.all(
        ASSETS.map(url =>
          c.add(url).catch(err => {
            console.warn("⚠️ No se pudo cachear:", url, err);
          })
        )
      );
    })
  );
  self.skipWaiting();
});

// ========== ACTIVACIÓN ==========
self.addEventListener("activate", (e) => {
  console.log("✅ Service Worker activando...");
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE)
          .map((k) => {
            console.log("🗑️ Borrando caché viejo:", k);
            return caches.delete(k);
          })
      )
    )
  );
  self.clients.claim();
});

// ========== FETCH ==========
self.addEventListener("fetch", (e) => {
  const url = e.request.url;

  // 🛡️ EXCEPCIÓN 1: No interceptar llamadas a JSONBin (API externa)
  // Estas peticiones van DIRECTO a internet, sin pasar por el caché
  if (url.includes("api.jsonbin.io")) {
    return;
  }

  // 🛡️ EXCEPCIÓN 2: No interceptar llamadas a Google Fonts
  if (url.includes("fonts.googleapis.com") || url.includes("fonts.gstatic.com")) {
    return;
  }

  // 🛡️ EXCEPCIÓN 3: No interceptar CDNs externas
  if (!url.startsWith(self.location.origin) && !url.startsWith("http")) {
    return;
  }

  // 🛡️ EXCEPCIÓN 4: Solo interceptar GET (PUT, POST, DELETE van directo)
  if (e.request.method !== "GET") return;

  // ========== ESTRATEGIA: cache-first con actualización en background ==========
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetchPromise = fetch(e.request)
        .then((res) => {
          // Solo guardar en caché si la respuesta es válida
          if (res && res.status === 200 && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE).then((c) => {
              c.put(e.request, copy).catch(() => {});
            }).catch(() => {});
          }
          return res;
        })
        .catch((err) => {
          console.warn("⚠️ Fetch falló, usando caché:", e.request.url, err);
          return cached;
        });

      // Devolver caché inmediatamente si existe, si no esperar la red
      return cached || fetchPromise;
    })
  );
});

// ========== MENSAJES (para forzar actualización desde el cliente) ==========
self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (e.data && e.data.type === "CLEAR_CACHE") {
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    ).then(() => {
      console.log("🗑️ Todos los cachés fueron borrados");
    });
  }
});