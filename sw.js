/* ============================================
   Service Worker - Cache offline + excepciones
   ============================================ */

// ⚠️ IMPORTANTE: Cambiá el número de versión cada vez que edites este archivo
const CACHE = "novia-v5";

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

  // 🛡️ EXCEPCIÓN 1: NO interceptar nada que NO sea de nuestro sitio
  // Esto incluye JSONBin, Google Fonts, cualquier API externa, etc.
  const esDeNuestroSitio = url.startsWith(self.location.origin);
  
  if (!esDeNuestroSitio) {
    // Dejar pasar la petición tal cual (sin caché)
    return;
  }

  // 🛡️ EXCEPCIÓN 2: Solo interceptar peticiones GET
  // PUT, POST, DELETE van directo a internet
  if (e.request.method !== "GET") {
    return;
  }

  // ========== ESTRATEGIA: network-first para HTML, cache-first para el resto ==========
  // Si es HTML → siempre buscar lo nuevo primero (para que se actualice)
  // Si es CSS/JS/imagen → usar caché primero (más rápido)
  
  const esHTML = e.request.headers.get("accept")?.includes("text/html");
  
  if (esHTML) {
    // Network-first: intenta traer lo nuevo, si falla usa caché
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }
  
  // Para JS, CSS, imágenes → cache-first
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      
      return fetch(e.request).then((res) => {
        if (res && res.status === 200 && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        }
        return res;
      });
    })
  );
});

// ========== MENSAJES ==========
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