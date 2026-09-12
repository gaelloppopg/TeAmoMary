/* ============================================
   PUSH NOTIFICATIONS con VAPID
   Sin OneSignal - sistema propio
   ============================================ */

(function () {
  "use strict";

  // ⚠️ REEMPLAZÁ ESTA CLAVE con tu Public Key de VAPID
  const VAPID_PUBLIC_KEY = "TU_CLAVE_PUBLICA_VAPID_ACA";

  // URL del Worker de Cloudflare
  const WORKER_URL = "https://notificaciones-diario.gutierrez-delavega-gael01.workers.dev";

  // URL de JSONBin
  const JSONBIN_MASTER_KEY = "$2a$10$o5/KkktxRiEfoxN33ZQQieN0iUvv/pkvIG8riNohEo5N4I7NCGU2q";
  const JSONBIN_BIN_ID = "6aa58aecffd5d16053fef5c0";
  const JSONBIN_URL = "https://api.jsonbin.io/v3/b/" + JSONBIN_BIN_ID;

  // Detectar autor actual
  function detectarAutor() {
    let autor = localStorage.getItem("diario_autor_actual");
    if (!autor) {
      autor = confirm("¿Sos Gael? (Cancelar = Mary)") ? "Gael" : "Mary";
      localStorage.setItem("diario_autor_actual", autor);
    }
    return autor;
  }

  // Convertir clave pública de base64 a Uint8Array (requerido por la API)
  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Guardar suscripción en JSONBin
  async function guardarSuscripcion(suscripcion) {
    const autor = detectarAutor();
    try {
      // Leer el bin actual
      const res = await fetch(JSONBIN_URL + "/latest", {
        headers: {
          "X-Master-Key": JSONBIN_MASTER_KEY,
          "X-Bin-Meta": "false"
        }
      });
      const data = await res.json();
      const entradas = data.entradas || [];
      let suscripciones = data.suscripciones || [];

      // Eliminar suscripciones viejas del mismo autor
      suscripciones = suscripciones.filter(s => s.autor !== autor);

      // Agregar la nueva
      suscripciones.push({
        autor: autor,
        endpoint: suscripcion.endpoint,
        keys: suscripcion.keys,
        fecha: new Date().toISOString()
      });

      // Guardar en el bin
      await fetch(JSONBIN_URL, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Master-Key": JSONBIN_MASTER_KEY
        },
        body: JSON.stringify({
          entradas: entradas,
          suscripciones: suscripciones
        })
      });

      console.log("✅ Suscripción guardada para:", autor);
    } catch (err) {
      console.error("Error guardando suscripción:", err);
    }
  }

  // Inicializar notificaciones push
  async function iniciarPush() {
    // 1. Verificar soporte
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.warn("Este navegador no soporta notificaciones push");
      return;
    }

    // 2. Verificar permiso
    let permiso = Notification.permission;
    if (permiso === "default") {
      permiso = await Notification.requestPermission();
    }

    if (permiso !== "granted") {
      console.warn("Permiso denegado para notificaciones");
      return;
    }

    // 3. Esperar a que el Service Worker esté listo
    const registro = await navigator.serviceWorker.ready;

    // 4. Verificar si ya hay una suscripción
    let suscripcion = await registro.pushManager.getSubscription();

    // 5. Si no hay, crear una nueva
    if (!suscripcion) {
      try {
        suscripcion = await registro.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
        console.log("✅ Nueva suscripción push creada");
      } catch (err) {
        console.error("Error creando suscripción:", err);
        return;
      }
    } else {
      console.log("✅ Suscripción push ya existía");
    }

    // 6. Guardar la suscripción en JSONBin
    await guardarSuscripcion(suscripcion);

    console.log("🔔 Push notifications configuradas");
  }

  // Exponer función global
  window.iniciarPush = iniciarPush;

  // Iniciar cuando carga el DOM
  document.addEventListener("DOMContentLoaded", () => {
    // Esperar 3 segundos antes de pedir permiso (no ser agresivo)
    setTimeout(() => {
      iniciarPush();
    }, 3000);
  });

})();