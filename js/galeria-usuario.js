/* ============================================
   GALERÍA DE USUARIO con ÁLBUMES y FILTROS
   - Subir fotos/videos a ImgBB
   - Guardar en JSONBin
   - Filtrar por álbum, fecha, autor, búsqueda
   - Afecta fotos Y videos (burbujas)
   ============================================ */

(function () {
  "use strict";

  // ⚠️ REEMPLAZÁ CON TU API KEY DE IMGBB
  const IMGBB_API_KEY = "e612807706852fdf6efbcaab6e66de43";

  const JSONBIN_MASTER_KEY = "$2a$10$o5/KkktxRiEfoxN33ZQQieN0iUvv/pkvIG8riNohEo5N4I7NCGU2q";
  const JSONBIN_BIN_ID = "6aa58aecffd5d16053fef5c0";
  const JSONBIN_URL = "https://api.jsonbin.io/v3/b/" + JSONBIN_BIN_ID;

  let todosLosRecuerdos = [];
  let albumsDisponibles = [];
  let filtrosActivos = {
    album: "todos",
    fecha: "todas",
    autor: "todos",
    busqueda: ""
  };

  // ========== UTILIDADES ==========
  function detectarAutor() {
    let autor = localStorage.getItem("diario_autor_actual");
    if (!autor) {
      autor = confirm("¿Sos Gael? (Cancelar = Mary)") ? "Gael" : "Mary";
      localStorage.setItem("diario_autor_actual", autor);
    }
    return autor;
  }

  async function subirAImgBB(archivo) {
    const formData = new FormData();
    formData.append("image", archivo);

    const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: "POST",
      body: formData
    });

    if (!res.ok) throw new Error("Error subiendo a ImgBB");
    const data = await res.json();
    if (!data.success) throw new Error(data.error?.message || "Error de ImgBB");

    return {
      url: data.data.url,
      thumb: data.data.thumb?.url || data.data.url
    };
  }

  async function guardarEnBin(tipo, item) {
    const res = await fetch(JSONBIN_URL + "/latest", {
      headers: {
        "X-Master-Key": JSONBIN_MASTER_KEY,
        "X-Bin-Meta": "false"
      }
    });
    if (!res.ok) throw new Error("Error leyendo JSONBin");

    const data = await res.json();
    const nuevoContenido = {
      entradas: data.entradas || [],
      suscripciones: data.suscripciones || [],
      recuerdos: data.recuerdos || [],
      razones: data.razones || [],
      albums: data.albums || []
    };

    nuevoContenido[tipo].push(item);

    const putRes = await fetch(JSONBIN_URL, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Master-Key": JSONBIN_MASTER_KEY
      },
      body: JSON.stringify(nuevoContenido)
    });

    if (!putRes.ok) throw new Error("Error guardando en JSONBin");
    return true;
  }

  async function cargarDatos() {
    const res = await fetch(JSONBIN_URL + "/latest", {
      headers: {
        "X-Master-Key": JSONBIN_MASTER_KEY,
        "X-Bin-Meta": "false"
      }
    });
    if (!res.ok) throw new Error("Error cargando");
    const data = await res.json();
    todosLosRecuerdos = data.recuerdos || [];
    albumsDisponibles = data.albums || [];
    return data;
  }

  function formatearFecha(iso) {
    const fecha = new Date(iso);
    return fecha.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }

  function sincronizarFiltrosGlobales() {
    window.__filtrosRecuerdos = filtrosActivos;
    window.dispatchEvent(new Event("filtrosCambiados"));
  }

  // ========== CREAR ÁLBUM ==========
  async function crearAlbum() {
    const nombre = prompt("Nombre del álbum (ej: Playa, Cumpleaños):");
    if (!nombre || !nombre.trim()) return;

    const emoji = prompt("Un emoji para el álbum (opcional):", "📸") || "📸";
    const autor = detectarAutor();

    const album = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      nombre: nombre.trim(),
      emoji: emoji,
      autor: autor,
      fecha: new Date().toISOString()
    };

    try {
      await guardarEnBin("albums", album);
      albumsDisponibles.push(album);
      if (window.lanzarConfeti) window.lanzarConfeti(1000);
      renderizarFiltros();
      renderizarRecuerdos();
      alert("✅ Álbum creado: " + album.nombre);
    } catch (err) {
      alert("❌ Error: " + err.message);
    }
  }

  // ========== RENDERIZAR FILTROS ==========
  function renderizarFiltros() {
    const contenedor = document.getElementById("recuerdosFiltros");
    if (!contenedor) return;

    // Obtener meses únicos (de fotos Y videos)
    const meses = new Set();
    todosLosRecuerdos.forEach(r => {
      const fecha = new Date(r.fecha);
      const key = fecha.getFullYear() + "-" + String(fecha.getMonth() + 1).padStart(2, "0");
      meses.add(key);
    });
    const mesesOrdenados = [...meses].sort().reverse();

    contenedor.innerHTML = `
      <div class="filtros-barra">
        <div class="filtro-grupo">
          <label class="filtro-label">📁 Álbum</label>
          <select id="filtroAlbum" class="filtro-select">
            <option value="todos">Todos los álbumes</option>
            <option value="sin-album">Sin álbum</option>
            ${albumsDisponibles.map(a => `
              <option value="${a.id}">${a.emoji} ${a.nombre}</option>
            `).join("")}
          </select>
        </div>

        <div class="filtro-grupo">
          <label class="filtro-label">📅 Fecha</label>
          <select id="filtroFecha" class="filtro-select">
            <option value="todas">Todas las fechas</option>
            ${mesesOrdenados.map(m => {
              const [year, month] = m.split("-");
              const nombreMes = new Date(year, month - 1).toLocaleDateString("es-ES", {
                month: "long", year: "numeric"
              });
              return `<option value="${m}">${nombreMes}</option>`;
            }).join("")}
          </select>
        </div>

        <div class="filtro-grupo">
          <label class="filtro-label">👤 Autor</label>
          <select id="filtroAutor" class="filtro-select">
            <option value="todos">Todos</option>
            <option value="Gael">✎ Gael</option>
            <option value="Mary">✿ Mary</option>
          </select>
        </div>

        <div class="filtro-grupo filtro-busqueda">
          <label class="filtro-label">🔍 Buscar</label>
          <input type="text" id="filtroBusqueda" class="filtro-input" placeholder="Buscar por título o descripción...">
        </div>

        <button class="btn-nuevo-album" id="btnNuevoAlbum">➕ Nuevo álbum</button>
      </div>

      ${albumsDisponibles.length > 0 ? `
        <div class="albums-chips">
          <button class="album-chip ${filtrosActivos.album === "todos" ? "activo" : ""}" data-album="todos">Todos</button>
          ${albumsDisponibles.map(a => `
            <button class="album-chip ${filtrosActivos.album === a.id ? "activo" : ""}" data-album="${a.id}">
              ${a.emoji} ${a.nombre}
            </button>
          `).join("")}
        </div>
      ` : ""}
    `;

    // Eventos de filtros
    document.getElementById("filtroAlbum").addEventListener("change", (e) => {
      filtrosActivos.album = e.target.value;
      renderizarRecuerdos();
      sincronizarFiltrosGlobales();
    });

    document.getElementById("filtroFecha").addEventListener("change", (e) => {
      filtrosActivos.fecha = e.target.value;
      renderizarRecuerdos();
      sincronizarFiltrosGlobales();
    });

    document.getElementById("filtroAutor").addEventListener("change", (e) => {
      filtrosActivos.autor = e.target.value;
      renderizarRecuerdos();
      sincronizarFiltrosGlobales();
    });

    document.getElementById("filtroBusqueda").addEventListener("input", (e) => {
      filtrosActivos.busqueda = e.target.value.toLowerCase();
      renderizarRecuerdos();
      sincronizarFiltrosGlobales();
    });

    document.getElementById("btnNuevoAlbum").addEventListener("click", crearAlbum);

    // Chips
    contenedor.querySelectorAll(".album-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        filtrosActivos.album = chip.dataset.album;
        document.getElementById("filtroAlbum").value = chip.dataset.album;
        renderizarFiltros();
        renderizarRecuerdos();
        sincronizarFiltrosGlobales();
      });
    });
  }

  // ========== RENDERIZAR RECUERDOS (FOTOS) ==========
  function renderizarRecuerdos() {
    const contenedor = document.getElementById("galeriaUsuarioRecuerdos");
    if (!contenedor) return;

    let filtrados = [...todosLosRecuerdos];

    // Filtro álbum
    if (filtrosActivos.album === "sin-album") {
      filtrados = filtrados.filter(r => !r.albumId);
    } else if (filtrosActivos.album !== "todos") {
      filtrados = filtrados.filter(r => r.albumId === filtrosActivos.album);
    }

    // Filtro fecha
    if (filtrosActivos.fecha !== "todas") {
      filtrados = filtrados.filter(r => {
        const fecha = new Date(r.fecha);
        const key = fecha.getFullYear() + "-" + String(fecha.getMonth() + 1).padStart(2, "0");
        return key === filtrosActivos.fecha;
      });
    }

    // Filtro autor
    if (filtrosActivos.autor !== "todos") {
      filtrados = filtrados.filter(r => r.autor === filtrosActivos.autor);
    }

    // Filtro búsqueda
    if (filtrosActivos.busqueda) {
      filtrados = filtrados.filter(r =>
        (r.titulo || "").toLowerCase().includes(filtrosActivos.busqueda) ||
        (r.descripcion || "").toLowerCase().includes(filtrosActivos.busqueda)
      );
    }

    // Excluir videos (esos se muestran en las burbujas)
    const soloFotos = filtrados.filter(r => r.tipo !== "video");

    // Ordenar más recientes primero
    soloFotos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    // Contador
    const contador = document.getElementById("contadorRecuerdos");
    if (contador) {
      contador.textContent = `${soloFotos.length} ${soloFotos.length === 1 ? 'recuerdo' : 'recuerdos'}`;
    }

    if (soloFotos.length === 0) {
      contenedor.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:80px 20px;color:#a08bb8;font-family:'Cormorant Garamond',serif;font-style:italic;font-size:1.1rem;">
          <strong style="display:block;font-family:'Playfair Display',serif;font-style:normal;font-size:1.5rem;color:#a874e8;margin-bottom:10px;">No hay fotos con estos filtros</strong>
          Probá con otros filtros o agregá una foto nueva 💜
        </div>
      `;
      return;
    }

    // Render
    contenedor.innerHTML = soloFotos.map(item => {
      return `
        <figure class="galeria-item reveal visible" data-id="${item.id}">
          <img src="${item.url}" alt="${item.titulo || ''}" loading="lazy" 
               onclick="abrirLightboxGaleria('${item.url}', '${(item.descripcion || item.titulo || '').replace(/'/g, "\\'")}')">
          <figcaption>
            <div class="recuerdo-fecha">${formatearFecha(item.fecha)}</div>
            <p class="recuerdo-texto">${item.descripcion || item.titulo || "Sin descripción"}</p>
          </figcaption>
        </figure>
      `;
    }).join("");
  }

  // Lightbox
  window.abrirLightboxGaleria = function(url, titulo) {
    const lb = document.createElement("div");
    lb.className = "lightbox-galeria";
    lb.innerHTML = `
      <button class="lightbox-cerrar" aria-label="Cerrar">✕</button>
      <div class="lightbox-contenido">
        <img src="${url}" alt="${titulo}">
        ${titulo ? `<div class="lightbox-caption">${titulo}</div>` : ""}
      </div>
    `;
    document.body.appendChild(lb);
    document.body.style.overflow = "hidden";

    const cerrar = () => {
      lb.style.opacity = "0";
      setTimeout(() => {
        lb.remove();
        document.body.style.overflow = "";
      }, 300);
    };

    lb.querySelector(".lightbox-cerrar").addEventListener("click", (e) => {
      e.stopPropagation();
      cerrar();
    });
    lb.addEventListener("click", (e) => {
      if (e.target === lb) cerrar();
    });
    document.addEventListener("keydown", function onKey(e) {
      if (e.key === "Escape") {
        cerrar();
        document.removeEventListener("keydown", onKey);
      }
    });
  };

  // ========== MODAL DE SUBIDA ==========
  function crearModalSubida(tipo, tipoForzado = null) {
    const autor = detectarAutor();

    // Título dinámico
    let titulo;
    if (tipo === "recuerdos") {
      if (tipoForzado === "video") titulo = "Nuevo video";
      else if (tipoForzado === "imagen") titulo = "Nueva foto";
      else titulo = "Nuevo recuerdo";
    } else {
      titulo = "Nueva razón";
    }

    // Tipo de archivo aceptado
    let accept = "image/*,video/*";
    if (tipoForzado === "video") accept = "video/*";
    else if (tipoForzado === "imagen") accept = "image/*";

    const modal = document.createElement("div");
    modal.className = "subida-modal";
    modal.innerHTML = `
      <div class="subida-papel">
        <button class="subida-cerrar" aria-label="Cerrar">✕</button>
        <h2 class="subida-titulo">${titulo}</h2>
        <p class="subida-sub">Subí tu archivo y agregá una descripción.</p>

        <div class="subida-campo">
          <label class="subida-label">¿Quién lo sube?</label>
          <div class="subida-autores">
            <button type="button" class="subida-autor-btn ${autor === "Gael" ? "activo" : ""}" data-autor="Gael">✎ Gael</button>
            <button type="button" class="subida-autor-btn ${autor === "Mary" ? "activo" : ""}" data-autor="Mary">✿ Mary</button>
          </div>
        </div>

        <div class="subida-campo">
          <label class="subida-label">Archivo</label>
          <input type="file" id="archivoSubida" accept="${accept}" />
          <small style="font-size:0.75rem;color:#8a6a4a;margin-top:6px;display:block;">
            Máximo 32 MB.
          </small>
        </div>

        <div class="subida-campo">
          <label class="subida-label">Título</label>
          <input type="text" id="tituloSubida" class="subida-input"
                 placeholder="¿Qué es?" maxlength="200" />
        </div>

        <div class="subida-campo">
          <label class="subida-label">Descripción (opcional)</label>
          <textarea id="descripcionSubida" class="subida-textarea" placeholder="Contá un poco más..."></textarea>
        </div>

        ${tipo === "recuerdos" ? `
          <div class="subida-campo">
            <label class="subida-label">Álbum (opcional)</label>
            <select id="albumSubida" class="subida-input">
              <option value="">— Sin álbum —</option>
              ${albumsDisponibles.map(a => `
                <option value="${a.id}">${a.emoji} ${a.nombre}</option>
              `).join("")}
            </select>
          </div>
        ` : ""}

        <div class="subida-acciones">
          <button class="subida-btn primario" id="btnConfirmarSubida">Subir</button>
          <button class="subida-btn neutro" id="btnCancelarSubida">Cancelar</button>
        </div>

        <div class="subida-progreso" id="subidaProgreso" style="display:none;">
          <div class="subida-spinner"></div>
          <p id="subidaMensaje">Subiendo archivo...</p>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => modal.classList.add("activo"));

    let autorSeleccionado = autor;

    modal.querySelectorAll(".subida-autor-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        modal.querySelectorAll(".subida-autor-btn").forEach(b => b.classList.remove("activo"));
        btn.classList.add("activo");
        autorSeleccionado = btn.dataset.autor;
        localStorage.setItem("diario_autor_actual", autorSeleccionado);
      });
    });

    const cerrar = () => {
      modal.classList.remove("activo");
      document.body.style.overflow = "";
      setTimeout(() => modal.remove(), 500);
    };

    modal.querySelector(".subida-cerrar").addEventListener("click", cerrar);
    modal.querySelector("#btnCancelarSubida").addEventListener("click", cerrar);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) cerrar();
    });

    modal.querySelector("#btnConfirmarSubida").addEventListener("click", async () => {
      const archivo = document.getElementById("archivoSubida").files[0];
      const tituloVal = document.getElementById("tituloSubida").value.trim();
      const descripcion = document.getElementById("descripcionSubida").value.trim();
      const albumId = tipo === "recuerdos" ? (document.getElementById("albumSubida")?.value || "") : "";

      if (!archivo) return alert("Seleccioná un archivo 💜");
      if (!tituloVal) return alert("Escribí un título 💜");
      if (archivo.size > 32 * 1024 * 1024) return alert("El archivo es muy grande (máx 32 MB) 💜");

      const progreso = modal.querySelector("#subidaProgreso");
      const mensaje = modal.querySelector("#subidaMensaje");
      progreso.style.display = "block";

      try {
        mensaje.textContent = "Subiendo archivo...";
        const resultado = await subirAImgBB(archivo);

        mensaje.textContent = "Guardando...";
        const esVideo = archivo.type.startsWith("video/");
        const item = {
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          titulo: tituloVal,
          descripcion: descripcion,
          url: resultado.url,
          thumb: resultado.thumb,
          tipo: esVideo ? "video" : "imagen",
          autor: autorSeleccionado,
          albumId: albumId || null,
          fecha: new Date().toISOString()
        };

        await guardarEnBin(tipo, item);

        // Agregar al array local
        if (tipo === "recuerdos") {
          todosLosRecuerdos.push(item);
        }

        mensaje.textContent = "✅ ¡Subido!";
        if (window.lanzarConfeti) window.lanzarConfeti(1500);

        setTimeout(() => {
          cerrar();
          renderizarFiltros();
          renderizarRecuerdos();

          // 🆕 Recargar burbujas de videos
          if (window.renderizarBurbujasVideos) {
            window.renderizarBurbujasVideos();
          }
        }, 1000);

      } catch (err) {
        console.error(err);
        mensaje.textContent = "❌ Error: " + err.message;
        setTimeout(() => { progreso.style.display = "none"; }, 3000);
      }
    });
  }

  // ========== API GLOBAL ==========
  window.galeriaUsuario = {
    crearModalSubida,
    crearAlbum,
    renderizarFiltros,
    renderizarRecuerdos,
    cargarDatos,
    getRecuerdos: () => todosLosRecuerdos,
    getAlbums: () => albumsDisponibles
  };

  // ========== AUTO-INICIALIZACIÓN ==========
  document.addEventListener("DOMContentLoaded", async () => {
    if (document.getElementById("galeriaUsuarioRecuerdos")) {
      try {
        await cargarDatos();
        renderizarFiltros();
        renderizarRecuerdos();
      } catch (err) {
        console.error("Error inicial:", err);
      }
    }

    // Botón agregar recuerdo (foto)
    const btnAgregar = document.getElementById("btnAgregarRecuerdo");
    if (btnAgregar) {
      btnAgregar.addEventListener("click", () => {
        if (window.galeriaUsuario) {
          window.galeriaUsuario.crearModalSubida("recuerdos", "imagen");
        }
      });
    }

    // Botón agregar video (definido en el HTML)
    const btnVideo = document.getElementById("btnAgregarVideo");
    if (btnVideo) {
      btnVideo.addEventListener("click", () => {
        if (window.galeriaUsuario) {
          window.galeriaUsuario.crearModalSubida("recuerdos", "video");
        }
      });
    }
  });

})();