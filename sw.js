/* ============================================
   Service Worker - Cache offline + excepciones
   v11: network-first para HTML/CSS/JS
   ============================================ */

// ⚠️ IMPORTANTE: Cada vez que edites este archivo, subí el número de versión
const CACHE = "novia-v11";

const ASSETS = [
  "./",
  "./login.html",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./css/animations.css",
  "./css/responsive.css",
  "./css/arte.css",
  "./js/script.js",
  "./js/contador.js",
  "./js/confeti.js",
  "./js/auth.js",
  "./js/galeria.js",
  "./js/musica-global.js",
  "./js/video-musica.js",
  "./js/pwa.js",
  "./js/diario.js",
  "./js/arte.js",
  "./pages/historia.html",
  "./pages/recuerdos.html",
  "./pages/cartas.html",
  "./pages/razones.html",
  "./pages/juego.html",
  "./pages/cuponera.html",
  "./pages/diario.html",
  "./pages/arte.html"
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

  // 🛡️ EXCEPCIÓN 1: No interceptar peticiones de OneSignal
  if (url.includes("onesignal.com") || url.includes("OneSignalSDK")) {
    return;
  }

  // 🛡️ EXCEPCIÓN 2: No interceptar requests externos (ImgBB, Cloudinary, JSONBin, etc.)
  const esDeNuestroSitio = url.startsWith(self.location.origin);
  if (!esDeNuestroSitio) {
    return;
  }

  // 🛡️ Solo interceptar GET
  if (e.request.method !== "GET") {
    return;
  }

  const path = new URL(url).pathname;

  // ========== HTML, CSS y JS → NETWORK FIRST ==========
  // (así siempre se ve la última versión, pero si no hay red, usa caché)
  const esHTML = e.request.headers.get("accept")?.includes("text/html");
  const esCSS = path.endsWith(".css");
  const esJS = path.endsWith(".js");

  if (esHTML || esCSS || esJS) {
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

  // ========== Imágenes, fuentes, etc. → CACHE FIRST ==========
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

// ========== PUSH NOTIFICATIONS ==========
self.addEventListener("push", (event) => {
  console.log("📬 Push recibido");

  let data = {
    title: "Nuestro Diario 💜",
    body: "Hay algo nuevo en el diario",
    url: "/pages/diario.html"
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: "/assets/images/icons/icon-192.png",
    badge: "/assets/images/icons/icon-192.png",
    vibrate: [200, 100, 200],
    data: { url: data.url },
    actions: [
      { action: "abrir", title: "Abrir diario" }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Cuando el usuario toca la notificación
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/pages/diario.html";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes("/pages/diario.html") && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});