/* =========================================
   PWA - Registro SW + botón instalar
   ========================================= */

// ========== REGISTRO DEL SERVICE WORKER ==========
// Detecta si estamos en /pages/ o en la raíz para encontrar sw.js
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const enPages = location.pathname.includes("/pages/");
    const swPath = enPages ? "../sw.js" : "./sw.js";
    const swScope = enPages ? "../" : "./";

    navigator.serviceWorker.register(swPath, { scope: swScope })
      .then((reg) => {
        console.log("✅ Service Worker registrado. Scope:", reg.scope);

        // Buscar actualizaciones cada vez que carga la página
        reg.update().catch(() => {});
      })
      .catch((e) => {
        console.warn("SW no registrado (normal si file://):", e.message);
      });
  });

  // Detectar cuando hay una nueva versión del SW disponible
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    console.log("🔄 Nueva versión del Service Worker activa");
  });
}

// ========== BOTÓN DE INSTALAR PWA ==========
let deferredPrompt = null;
const btnInstalar = document.createElement("button");
btnInstalar.className = "btn-instalar";
btnInstalar.textContent = "📲 Instalar app";
btnInstalar.style.display = "none";

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  btnInstalar.style.display = "flex";
  console.log("📲 PWA instalable detectada");
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
  console.log("✅ PWA instalada");
});

document.addEventListener("DOMContentLoaded", () => {
  document.body.appendChild(btnInstalar);
});