/* ============================================
   DIARIO — Mural de post-its sincronizado con JSONBin
   ============================================ */

(function () {
  "use strict";

  // ========== CONFIGURACIÓN JSONBIN ==========
  const JSONBIN_MASTER_KEY = "$2a$10$nSNoABZwoHOkZHHujNKHW.aigQvGa.u22m2BIzXbIqGtKP2cDKzs.";
  const JSONBIN_BIN_ID = "6aa58aecffd5d16053fef5c0";
  const JSONBIN_URL = "https://api.jsonbin.io/v3/b/" + JSONBIN_BIN_ID;

  // Intervalo de auto-sync (30 segundos)
  const SYNC_INTERVAL = 30 * 1000;

  // ========== ESTADO ==========
  let entradas = [];
  let filtroTexto = "";
  let syncIntervalId = null;
  let escribiendo = false;

  // ========== COLORES DE POST-ITS ==========
  const COLORES = ["amarillo", "rosa", "celeste", "verde", "naranja", "lila"];

  // ========== ELEMENTOS DOM ==========
  const muralGrid = document.getElementById("muralGrid");
  const btnNueva = document.getElementById("btnNuevaEntrada");
  const buscador = document.getElementById("buscadorDiario");
  const syncIndicator = document.getElementById("diarioSync");

  // ========== UTILIDADES ==========
  function formatearFecha(iso) {
    const fecha = new Date(iso);
    const ahora = new Date();
    const diffMs = ahora - fecha;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMs / 3600000);
    const diffDias = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return "Ahora mismo";
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffHoras < 24) return `Hace ${diffHoras}h`;
    if (diffDias < 7) return `Hace ${diffDias}d`;

    return fecha.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: fecha.getFullYear() !== ahora.getFullYear() ? "numeric" : undefined
    });
  }

  function formatearFechaCompleta(iso) {
    const fecha = new Date(iso);
    return fecha.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function escaparHTML(texto) {
    const div = document.createElement("div");
    div.textContent = texto;
    return div.innerHTML;
  }

  function generarId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function setSyncEstado(estado) {
    if (!syncIndicator) return;
    syncIndicator.classList.remove("sincronizando", "error");
    if (estado === "sincronizando") {
      syncIndicator.classList.add("sincronizando");
      syncIndicator.textContent = "Sincronizando...";
    } else if (estado === "error") {
      syncIndicator.classList.add("error");
      syncIndicator.textContent = "Sin conexión";
    } else {
      syncIndicator.textContent = "Conectado";
    }
  }

  // ========== CARGAR DESDE JSONBIN ==========
  async function cargarEntradas() {
    setSyncEstado("sincronizando");
    try {
      const response = await fetch(JSONBIN_URL + "/latest", {
        headers: {
          "X-Master-Key": JSONBIN_MASTER_KEY,
          "X-Bin-Meta": "false"
        }
      });

      if (!response.ok) throw new Error("Error al cargar: " + response.status);

      const data = await response.json();
      entradas = Array.isArray(data.entradas) ? data.entradas : [];
      entradas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      setSyncEstado("ok");
      renderizarMural();
    } catch (err) {
      console.error("Error cargando entradas:", err);
      setSyncEstado("error");
    }
  }

  // ========== GUARDAR EN JSONBIN ==========
  async function guardarEntradas() {
    setSyncEstado("sincronizando");
    try {
      const response = await fetch(JSONBIN_URL, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Master-Key": JSONBIN_MASTER_KEY
        },
        body: JSON.stringify({ entradas })
      });

      if (!response.ok) throw new Error("Error al guardar: " + response.status);
      setSyncEstado("ok");
      return true;
    } catch (err) {
      console.error("Error guardando entradas:", err);
      setSyncEstado("error");
      return false;
    }
  }

  // ========== RENDERIZAR MURAL ==========
  function renderizarMural() {
    if (!muralGrid) return;

    const filtro = filtroTexto.trim().toLowerCase();
    const filtradas = filtro
      ? entradas.filter(e =>
          (e.titulo || "").toLowerCase().includes(filtro) ||
          (e.texto || "").toLowerCase().includes(filtro) ||
          (e.autor || "").toLowerCase().includes(filtro)
        )
      : entradas;

    if (filtradas.length === 0) {
      muralGrid.innerHTML = `
        <div class="diario-vacio">
          <strong>${entradas.length === 0 ? "El diario está vacío" : "No encontré nada"}</strong>
          ${entradas.length === 0
            ? "Escribí la primera entrada y empecemos esta historia juntos."
            : "Probá con otra palabra."
          }
        </div>
      `;
      return;
    }

    muralGrid.innerHTML = filtradas.map((entrada, i) => {
      const rot = ((hashCode(entrada.id) % 5) - 2) * 0.7;
      const color = COLORES[Math.abs(hashCode(entrada.id)) % COLORES.length];
      const autorClase = entrada.autor === "Mary" ? "mary" : "gael";
      const autorIcono = entrada.autor === "Mary" ? "✿" : "✎";

      const titulo = escaparHTML(entrada.titulo || "(Sin título)");
      const preview = escaparHTML((entrada.texto || "").slice(0, 200));

      return `
        <article class="post-it color-${color}"
                 data-id="${entrada.id}"
                 style="--rot: ${rot}deg;">
          <div class="post-it-chinche"></div>
          <div class="post-it-meta">
            <span class="post-it-autor ${autorClase}">${autorIcono} ${escaparHTML(entrada.autor || "Anónimo")}</span>
            <span class="post-it-fecha">${formatearFecha(entrada.fecha)}</span>
          </div>
          <h3 class="post-it-titulo">${titulo}</h3>
          <p class="post-it-preview">${preview}</p>
          <div class="post-it-hint">Leer →</div>
        </article>
      `;
    }).join("");

    const postIts = muralGrid.querySelectorAll(".post-it");
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry, idx) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.classList.add("visible");
          }, idx * 60);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    postIts.forEach(p => io.observe(p));

    postIts.forEach(p => {
      p.addEventListener("click", () => {
        const id = p.dataset.id;
        const entrada = entradas.find(e => e.id === id);
        if (entrada) abrirLectura(entrada);
      });
    });
  }

  function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return hash;
  }

  // ========== MODAL: LECTURA ==========
  function abrirLectura(entrada) {
    const modal = document.createElement("div");
    modal.className = "diario-modal";
    modal.innerHTML = `
      <div class="diario-papel">
        <button class="diario-cerrar" aria-label="Cerrar">✕</button>
        <div class="diario-modal-meta">
          <span class="diario-modal-autor ${entrada.autor === "Mary" ? "mary" : "gael"}">
            ${entrada.autor === "Mary" ? "✿" : "✎"} ${escaparHTML(entrada.autor || "Anónimo")}
          </span>
          <span class="diario-modal-fecha">${formatearFechaCompleta(entrada.fecha)}</span>
        </div>
        <h2 class="diario-modal-titulo">${escaparHTML(entrada.titulo || "(Sin título)")}</h2>
        <div class="diario-modal-cuerpo">${escaparHTML(entrada.texto || "")}</div>
        <div class="diario-modal-acciones">
          <button class="btn-diario peligro" data-accion="borrar">Eliminar</button>
          <button class="btn-diario neutro" data-accion="cerrar">Cerrar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => modal.classList.add("activo"));

    const cerrar = () => {
      modal.classList.remove("activo");
      document.body.style.overflow = "";
      setTimeout(() => modal.remove(), 500);
    };

    modal.querySelector(".diario-cerrar").addEventListener("click", cerrar);
    modal.querySelector('[data-accion="cerrar"]').addEventListener("click", cerrar);
    modal.querySelector('[data-accion="borrar"]').addEventListener("click", () => {
      if (confirm("¿Seguro que querés borrar esta entrada? No se puede recuperar.")) {
        borrarEntrada(entrada.id);
        cerrar();
      }
    });
    modal.addEventListener("click", (e) => {
      if (e.target === modal) cerrar();
    });
    document.addEventListener("keydown", function onKey(e) {
      if (e.key === "Escape") {
        cerrar();
        document.removeEventListener("keydown", onKey);
      }
    });
  }

  // ========== MODAL: ESCRITURA ==========
  function abrirEscritura() {
    escribiendo = true;
    let autorSeleccionado = "Gael";

    const modal = document.createElement("div");
    modal.className = "diario-modal";
    modal.innerHTML = `
      <div class="diario-papel">
        <button class="diario-cerrar" aria-label="Cerrar">✕</button>
        <h2 class="diario-modal-titulo" style="margin-bottom:30px;">Nueva entrada</h2>
        <div class="diario-form">
          <div class="diario-campo">
            <label class="diario-label">¿Quién escribe?</label>
            <div class="diario-autores">
              <button type="button" class="diario-autor-btn activo" data-autor="Gael">✎ Gael</button>
              <button type="button" class="diario-autor-btn" data-autor="Mary">✿ Mary</button>
            </div>
          </div>
          <div class="diario-campo">
            <label class="diario-label" for="diarioTitulo">Título</label>
            <input type="text" id="diarioTitulo" class="diario-input" placeholder="¿De qué querés escribir?" maxlength="100" />
          </div>
          <div class="diario-campo">
            <label class="diario-label" for="diarioTexto">Lo que quieras contar</label>
            <textarea id="diarioTexto" class="diario-textarea" placeholder="Escribí libremente..."></textarea>
          </div>
          <div class="diario-form-acciones">
            <button class="btn-diario primario" data-accion="guardar">Publicar entrada</button>
            <button class="btn-diario neutro" data-accion="cancelar">Cancelar</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => modal.classList.add("activo"));

    modal.querySelectorAll(".diario-autor-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        modal.querySelectorAll(".diario-autor-btn").forEach(b => b.classList.remove("activo"));
        btn.classList.add("activo");
        autorSeleccionado = btn.dataset.autor;
      });
    });

    const tituloInput = modal.querySelector("#diarioTitulo");
    const textoInput = modal.querySelector("#diarioTexto");
    setTimeout(() => tituloInput.focus(), 400);

    const cerrar = () => {
      escribiendo = false;
      modal.classList.remove("activo");
      document.body.style.overflow = "";
      setTimeout(() => modal.remove(), 500);
    };

    const guardar = async () => {
      const titulo = tituloInput.value.trim();
      const texto = textoInput.value.trim();

      if (!titulo && !texto) {
        alert("Escribí al menos un título o un texto 💜");
        return;
      }

      const nuevaEntrada = {
        id: generarId(),
        titulo: titulo || "(Sin título)",
        texto: texto,
        autor: autorSeleccionado,
        fecha: new Date().toISOString()
      };

      entradas.unshift(nuevaEntrada);
      renderizarMural();
      cerrar();

      const exito = await guardarEntradas();
      if (!exito) {
        alert("⚠️ Hubo un problema al guardar. Revisá tu conexión.");
      } else {
        if (window.lanzarConfeti) window.lanzarConfeti(1500);
      }
    };

    modal.querySelector(".diario-cerrar").addEventListener("click", cerrar);
    modal.querySelector('[data-accion="cancelar"]').addEventListener("click", cerrar);
    modal.querySelector('[data-accion="guardar"]').addEventListener("click", guardar);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) cerrar();
    });
    document.addEventListener("keydown", function onKey(e) {
      if (e.key === "Escape") {
        cerrar();
        document.removeEventListener("keydown", onKey);
      }
    });
  }

  // ========== BORRAR ENTRADA ==========
  async function borrarEntrada(id) {
    entradas = entradas.filter(e => e.id !== id);
    renderizarMural();
    await guardarEntradas();
  }

  // ========== BUSCADOR ==========
  if (buscador) {
    buscador.addEventListener("input", (e) => {
      filtroTexto = e.target.value;
      renderizarMural();
    });
  }

  // ========== BOTÓN NUEVA ENTRADA ==========
  if (btnNueva) {
    btnNueva.addEventListener("click", abrirEscritura);
  }

  // ========== AUTO-SYNC cada 30 segundos ==========
  function iniciarAutoSync() {
    if (syncIntervalId) clearInterval(syncIntervalId);
    syncIntervalId = setInterval(() => {
      if (!escribiendo && !document.querySelector(".diario-modal")) {
        cargarEntradas();
      }
    }, SYNC_INTERVAL);
  }

  // Sincronizar al volver a la pestaña
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && !escribiendo) {
      cargarEntradas();
    }
  });

  // ========== INIT ==========
  document.addEventListener("DOMContentLoaded", async () => {
    await cargarEntradas();
    iniciarAutoSync();
  });

})();