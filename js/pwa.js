/* =========================================
   PWA - Registro SW + botón instalar
   ========================================= */

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js")
      .then(() => console.log("✅ Service Worker registrado"))
      .catch((e) => console.warn("SW no registrado (normal si file://):", e.message));
  });
}

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