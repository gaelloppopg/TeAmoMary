/* =========================================
   MÚSICA GLOBAL PERSISTENTE v3
   - Click en CUALQUIER parte → reproduce (primera vez)
   - Botón #playBtn → play/pausa
   - Persiste entre páginas
   - Autoplay tras login
   ========================================= */

(function () {
  "use strict";

  const STORAGE_KEY = "musica_estado";
  const VOLUMEN = 0.6;

  const EN_PAGES = location.pathname.includes("/pages/");
  const RUTA_AUDIO = EN_PAGES
    ? "../assets/music/nuestra-cancion.mp3"
    : "assets/music/nuestra-cancion.mp3";

  console.log("🎵 musica-global.js cargando. Ruta:", RUTA_AUDIO);

  // ============ ESTADO ============
  let estado = { reproduciendo: false, tiempo: 0 };
  try {
    const guardado = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    estado = { ...estado, ...guardado };
  } catch (e) {}

  function guardarEstado() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        reproduciendo: !audio.paused,
        tiempo: audio.currentTime || 0
      }));
    } catch (e) {}
  }

  // ============ CREAR AUDIO ============
  const audio = new Audio();
  audio.src = RUTA_AUDIO;
  audio.loop = true;
  audio.volume = VOLUMEN;
  audio.preload = "auto";

  audio.addEventListener("canplay", () => {
    console.log("✅ Canción lista:", RUTA_AUDIO);
  });

  audio.addEventListener("playing", () => {
    console.log("🎶 ¡Reproduciendo!");
    actualizarUI(true);
  });

  audio.addEventListener("pause", () => {
    actualizarUI(false);
  });

  window.__audioGlobal = audio;

  // ============ UI ============
  function actualizarUI(sonando) {
    const btn = document.getElementById("playBtn");
    const vinyl = document.getElementById("vinyl");
    if (btn) btn.textContent = sonando ? "⏸ Pausar" : "▶ Reproducir";
    if (vinyl) vinyl.classList.toggle("playing", sonando);
    document.body.classList.toggle("musica-sonando", sonando);
  }

  // ============ CONTROLES ============
  function reproducir(desdeCero = false) {
    if (desdeCero) {
      try { audio.currentTime = 0; } catch (e) {}
    }
    const p = audio.play();
    if (p && p.then) {
      p.then(() => {
        console.log("✅ Play exitoso");
        actualizarUI(true);
        empezarGuardado();
      }).catch((err) => {
        console.warn("⚠️ Play bloqueado:", err.name);
      });
    }
  }

  function pausar() {
    audio.pause();
    actualizarUI(false);
    guardarEstado();
  }

  function toggle() {
    if (audio.paused) reproducir();
    else pausar();
  }

  let saveInterval = null;
  function empezarGuardado() {
    if (saveInterval) return;
    saveInterval = setInterval(() => {
      if (!audio.paused) guardarEstado();
    }, 1000);
  }

  window.addEventListener("beforeunload", guardarEstado);
  window.addEventListener("pagehide", guardarEstado);

  window.musicaGlobal = { play: reproducir, pause: pausar, toggle, audio };

  // ============ AUTOPLAY POR CLICK GLOBAL ============
  // Detecta el PRIMER click/toque/tecla en cualquier parte y arranca la música.
  let autoplayHecho = false;

  function arrancarConGesto() {
    if (autoplayHecho) return;
    autoplayHecho = true;
    if (audio.paused) {
      console.log("👆 Gesto del usuario detectado → arrancando música");
      reproducir();
    }
    // Quitar listeners
    document.removeEventListener("click", arrancarConGesto, true);
    document.removeEventListener("touchstart", arrancarConGesto, true);
    document.removeEventListener("keydown", arrancarConGesto, true);
  }

  // usar capture=true para interceptar incluso si el click es en un <a>
  document.addEventListener("click", arrancarConGesto, true);
  document.addEventListener("touchstart", arrancarConGesto, true);
  document.addEventListener("keydown", arrancarConGesto, true);

  // ============ INIT ============
  function init() {
    console.log("🎵 init musica-global");

    // 1) Botón playBtn
    const btn = document.getElementById("playBtn");
    if (btn) {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log("👆 Click en playBtn");
        // El click en el botón también activa el gesto global
        autoplayHecho = true;
        toggle();
      });
      console.log("🎵 Botón #playBtn conectado");
    }

    // 2) Nombre canción
    const titulo = document.body.dataset.cancionTitulo;
    const artista = document.body.dataset.cancionArtista;
    const nombreEl = document.getElementById("nombreCancion");
    const artistaEl = document.getElementById("artistaCancion");
    if (titulo && nombreEl) nombreEl.textContent = "🎵 " + titulo;
    if (artista && artistaEl) artistaEl.textContent = artista;

    // 3) ¿Viene del login? → autoplay inmediato (sin gesto)
    const vinoDelLogin = sessionStorage.getItem("intentar_autoplay") === "1";
    if (vinoDelLogin) {
      sessionStorage.removeItem("intentar_autoplay");
      console.log("🎵 Viene del login → autoplay directo");
      setTimeout(() => reproducir(true), 400);
      return; // no hace falta listener global
    }

    // 4) ¿Estaba sonando antes? → reanudar (el click global servirá de respaldo)
    if (estado.reproduciendo) {
      console.log("🎵 Reanudando desde", estado.tiempo, "seg");

      const aplicarTiempo = () => {
        try { audio.currentTime = estado.tiempo; } catch (e) {}
        audio.removeEventListener("loadedmetadata", aplicarTiempo);
      };
      if (audio.readyState >= 1) {
        try { audio.currentTime = estado.tiempo; } catch (e) {}
      } else {
        audio.addEventListener("loadedmetadata", aplicarTiempo);
      }

      const intento = audio.play();
      if (intento && intento.then) {
        intento.then(() => {
          actualizarUI(true);
          empezarGuardado();
          autoplayHecho = true;
        }).catch(() => {
          console.warn("⚠️ Reanudación bloqueada. Esperando el primer click/tap en la página...");
          // El listener global ya está activo, arrancará al primer gesto
        });
      }
    }
    // Si no estaba sonando, los listeners globales quedan activos y la música
    // arrancará al primer click/toque/tecla en cualquier parte.
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();