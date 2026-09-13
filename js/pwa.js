/* =========================================
   PWA - Registro SW + auto-actualización
   ========================================= */

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const enPages = location.pathname.includes("/pages/");
    const swPath = enPages ? "../sw.js" : "./sw.js";
    const swScope = enPages ? "../" : "./";

    navigator.serviceWorker.register(swPath, { scope: swScope })
      .then((reg) => {
        console.log("✅ Service Worker registrado. Scope:", reg.scope);

        // 🔄 Buscar actualizaciones cada 30 segundos
        setInterval(() => {
          reg.update();
        }, 30 * 1000);

        // 🔄 Buscar actualizaciones cuando el usuario vuelve a la pestaña
        document.addEventListener("visibilitychange", () => {
          if (!document.hidden) reg.update();
        });

        // 🔄 Si hay una nueva versión esperando, activarla
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          console.log("🔄 Nueva versión detectada, instalando...");

          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              console.log("✅ Nueva versión lista. Recargando...");
              // Recargar la página automáticamente para usar la nueva versión
              window.location.reload();
            }
          });
        });
      })
      .catch((e) => {
        console.warn("SW no registrado (normal si file://):", e.message);
      });
  });

  // 🔄 Si el SW activo cambia, recargar
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!refreshing) {
      refreshing = true;
      console.log("🔄 Service Worker actualizado, recargando página...");
      window.location.reload();
    }
  });
}

/* =========================================
   BOTÓN DE INSTALAR PWA
   ========================================= */
let deferredPrompt = null;
const btnInstalar = document.createElement("button");
btnInstalar.className = "btn-instalar";
btnInstalar.textContent = "📲 Instalar app";
btnInstalar.style.display = "none";

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  btnInstalar.style.display = "flex";
});

btnInstalar.addEventListener("click", async () => {
  if (!deferredPrompt) {
    alert("Para instalar:\n\n1. Toca el menú ⋮ de Chrome\n2. Elige 'Añadir a pantalla de inicio'");
    return;
  }
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === "accepted") btnInstalar.style.display = "none";
  deferredPrompt = null;
});

window.addEventListener("appinstalled", () => {
  btnInstalar.style.display = "none";
  if (window.lanzarConfeti) window.lanzarConfeti(1500);
});

document.addEventListener("DOMContentLoaded", () => {
  document.body.appendChild(btnInstalar);
});