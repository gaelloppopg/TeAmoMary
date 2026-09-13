/* ============================================
   GALERÍA DE USUARIO con ÁLBUMES
   - Fotos: ImgBB | Videos: Cloudinary
   - Guardar en JSONBin
   - Álbumes aislados
   - Búsqueda global
   - Eliminar recuerdos y álbumes
   ============================================ */

(function () {
  "use strict";

  const IMGBB_API_KEY = "e612807706852fdf6efbcaab6e66de43";
  const CLOUDINARY_CLOUD_NAME = "sjjtdwr";
  const CLOUDINARY_UPLOAD_PRESET = "PaginaNovia";

  const JSONBIN_MASTER_KEY = "$2a$10$o5/KkktxRiEfoxN33ZQQieN0iUvv/pkvIG8riNohEo5N4I7NCGU2q";
  const JSONBIN_BIN_ID = "6aa58aecffd5d16053fef5c0";
  const JSONBIN_URL = "https://api.jsonbin.io/v3/b/" + JSONBIN_BIN_ID;

  let todosLosRecuerdos = [];
  let albumsDisponibles = [];
  let filtrosActivos = {
    album: "sin-album",
    busqueda: ""
  };

  // ========== UTILIDADES ==========
  function getUltimoAutor() {
    return localStorage.getItem("diario_autor_actual") || "Gael";
  }
  function setUltimoAutor(autor) {
    localStorage.setItem("diario_autor_actual", autor);
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
    return { url: data.data.url, thumb: data.data.thumb?.url || data.data.url };
  }

  async function subirACloudinary(archivo) {
    const formData = new FormData();
    formData.append("file", archivo);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    const resourceType = archivo.type.startsWith("video/") ? "video" : "image";
    const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;

    const res = await fetch(url, { method: "POST", body: formData });
    if (!res.ok) throw new Error("Error subiendo a Cloudinary");
    const data = await res.json();

    let thumb = data.secure_url;
    if (resourceType === "video") {
      thumb = data.secure_url.replace(/\.(mp4|mov|avi|webm)$/i, ".jpg");
    }
    return { url: data.secure_url, thumb: thumb };
  }

  async function guardarEnBin(tipo, item) {
    const res = await fetch(JSONBIN_URL + "/latest", {
      headers: { "X-Master-Key": JSONBIN_MASTER_KEY, "X-Bin-Meta": "false" }
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
      headers: { "Content-Type": "application/json", "X-Master-Key": JSONBIN_MASTER_KEY },
      body: JSON.stringify(nuevoContenido)
    });
    if (!putRes.ok) throw new Error("Error guardando en JSONBin");
    return true;
  }

  async function actualizarEnBin(tipo, item) {
    const res = await fetch(JSONBIN_URL + "/latest", {
      headers: { "X-Master-Key": JSONBIN_MASTER_KEY, "X-Bin-Meta": "false" }
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
    const lista = nuevoContenido[tipo];
    const idx = lista.findIndex(x => x.id === item.id);
    if (idx >= 0) lista[idx] = item;
    const putRes = await fetch(JSONBIN_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Master-Key": JSONBIN_MASTER_KEY },
      body: JSON.stringify(nuevoContenido)
    });
    if (!putRes.ok) throw new Error("Error guardando en JSONBin");
    return true;
  }

  async function eliminarDeBin(tipo, itemId) {
    const res = await fetch(JSONBIN_URL + "/latest", {
      headers: { "X-Master-Key": JSONBIN_MASTER_KEY, "X-Bin-Meta": "false" }
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
    nuevoContenido[tipo] = nuevoContenido[tipo].filter(x => x.id !== itemId);
    const putRes = await fetch(JSONBIN_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Master-Key": JSONBIN_MASTER_KEY },
      body: JSON.stringify(nuevoContenido)
    });
    if (!putRes.ok) throw new Error("Error guardando en JSONBin");
    return true;
  }

  async function cargarDatos() {
    const res = await fetch(JSONBIN_URL + "/latest", {
      headers: { "X-Master-Key": JSONBIN_MASTER_KEY, "X-Bin-Meta": "false" }
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
      day: "2-digit", month: "2-digit", year: "numeric"
    });
  }

  function sincronizarFiltrosGlobales() {
    window.__filtrosRecuerdos = { ...filtrosActivos };
    window.dispatchEvent(new Event("filtrosCambiados"));
  }

  // ========== LÓGICA DE FILTROS ==========
  function filtrarRecuerdos(lista, esVideo = null) {
    let filtrados = [...lista];

    if (esVideo === true) {
      filtrados = filtrados.filter(r => r.tipo === "video");
    } else if (esVideo === false) {
      filtrados = filtrados.filter(r => r.tipo !== "video");
    }

    // Búsqueda global
    if (filtrosActivos.busqueda && filtrosActivos.busqueda.trim()) {
      const q = filtrosActivos.busqueda.trim().toLowerCase();
      filtrados = filtrados.filter(r =>
        (r.titulo || "").toLowerCase().includes(q) ||
        (r.descripcion || "").toLowerCase().includes(q)
      );
      return filtrados;
    }

    // Filtro por álbum
    if (filtrosActivos.album === "sin-album") {
      filtrados = filtrados.filter(r => !r.albumId);
    } else if (filtrosActivos.album && filtrosActivos.album !== "") {
      filtrados = filtrados.filter(r => r.albumId === filtrosActivos.album);
    }

    return filtrados;
  }

  // ========== ELIMINAR RECUERDO ==========
  async function eliminarRecuerdo(itemId) {
    if (!confirm("¿Eliminar este recuerdo? No se puede recuperar 💜")) return;
    try {
      await eliminarDeBin("recuerdos", itemId);
      todosLosRecuerdos = todosLosRecuerdos.filter(r => r.id !== itemId);
      if (window.lanzarConfeti) window.lanzarConfeti(800);
      renderizarRecuerdos();
      if (window.renderizarBurbujasVideos) window.renderizarBurbujasVideos();
      alert("✅ Recuerdo eliminado");
    } catch (err) {
      alert("❌ Error: " + err.message);
    }
  }

  // ========== CREAR ÁLBUM ==========
  async function crearAlbum() {
    const nombre = prompt("Nombre del álbum (ej: Playa, Cumpleaños):");
    if (!nombre || !nombre.trim()) return;

    const emoji = prompt("Un emoji para el álbum (opcional):", "📸") || "📸";
    const autor = getUltimoAutor();

    const album = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      nombre: nombre.trim(),
      emoji: emoji,
      autor: autor,
      recuerdos: [],
      fecha: new Date().toISOString()
    };

    try {
      await guardarEnBin("albums", album);
      albumsDisponibles.push(album);
      if (window.lanzarConfeti) window.lanzarConfeti(1000);
      filtrosActivos.album = album.id; // Seleccionar el álbum recién creado
      renderizarFiltros();
      renderizarRecuerdos();
      if (window.renderizarBurbujasVideos) window.renderizarBurbujasVideos();
      sincronizarFiltrosGlobales();
      alert("✅ Álbum creado: " + album.nombre);
    } catch (err) {
      alert("❌ Error: " + err.message);
    }
  }

  // ========== ELIMINAR ÁLBUM ==========
  async function eliminarAlbum(albumId) {
    const album = albumsDisponibles.find(a => a.id === albumId);
    if (!album) return;

    if (!confirm(`¿Eliminar el álbum "${album.nombre}"?\n\nLos recuerdos NO se borran, solo se quitan del álbum.`)) return;

    for (const recuerdo of todosLosRecuerdos) {
      if (recuerdo.albumId === albumId) {
        recuerdo.albumId = null;
        await actualizarEnBin("recuerdos", recuerdo);
      }
    }

    try {
      await eliminarDeBin("albums", albumId);
      albumsDisponibles = albumsDisponibles.filter(a => a.id !== albumId);
      if (filtrosActivos.album === albumId) filtrosActivos.album = "sin-album";
      renderizarFiltros();
      renderizarRecuerdos();
      if (window.renderizarBurbujasVideos) window.renderizarBurbujasVideos();
      sincronizarFiltrosGlobales();
      alert("✅ Álbum eliminado");
    } catch (err) {
      alert("❌ Error: " + err.message);
    }
  }

  // ========== MODAL PARA AGREGAR RECUERDOS A ÁLBUM ==========
  function abrirModalAlbum(albumId) {
    const album = albumsDisponibles.find(a => a.id === albumId);
    if (!album) return;

    const disponibles = todosLosRecuerdos.filter(r => !r.albumId);

    const modal = document.createElement("div");
    modal.className = "subida-modal";
    modal.innerHTML = `
      <div class="subida-papel" style="max-width: 700px;">
        <button class="subida-cerrar" aria-label="Cerrar">✕</button>
        <h2 class="subida-titulo">${album.emoji} ${album.nombre}</h2>
        <p class="subida-sub">Seleccioná los recuerdos sin álbum que querés agregar.</p>

        <div style="max-height: 400px; overflow-y: auto; padding: 10px 0;">
          ${disponibles.length === 0 ? `
            <p style="text-align:center;color:#a08bb8;font-style:italic;padding:40px;">
              No hay recuerdos sin álbum disponibles.
            </p>
          ` : `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 12px;">
              ${disponibles.map(r => `
                <div class="album-selector-item" data-id="${r.id}" style="
                  position: relative;
                  aspect-ratio: 1;
                  border-radius: 12px;
                  overflow: hidden;
                  cursor: pointer;
                  border: 3px solid transparent;
                  transition: all 0.3s ease;
                ">
                  <img src="${r.thumb || r.url}" alt="${r.titulo}" style="width:100%;height:100%;object-fit:cover;display:block;">
                  <div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(to top, rgba(0,0,0,0.8), transparent);padding:6px 8px;color:#fff;font-size:0.7rem;font-weight:600;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.titulo}</div>
                  <div class="check-overlay" style="
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    background: rgba(255,255,255,0.9);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.8rem;
                    color: #a874e8;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                  ">✓</div>
                </div>
              `).join("")}
            </div>
          `}
        </div>

        <div class="subida-acciones" style="margin-top: 25px;">
          <button class="subida-btn primario" id="btnGuardarAlbum">Agregar seleccionados</button>
          <button class="subida-btn neutro" id="btnCancelarAlbum">Cancelar</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => modal.classList.add("activo"));

    const seleccionados = new Set();

    modal.querySelectorAll(".album-selector-item").forEach(item => {
      item.addEventListener("click", () => {
        const id = item.dataset.id;
        const check = item.querySelector(".check-overlay");
        if (seleccionados.has(id)) {
          seleccionados.delete(id);
          item.style.borderColor = "transparent";
          check.style.opacity = "0";
        } else {
          seleccionados.add(id);
          item.style.borderColor = "#a874e8";
          check.style.opacity = "1";
        }
      });
    });

    const cerrar = () => {
      modal.classList.remove("activo");
      document.body.style.overflow = "";
      setTimeout(() => modal.remove(), 500);
    };

    modal.querySelector(".subida-cerrar").addEventListener("click", cerrar);
    modal.querySelector("#btnCancelarAlbum").addEventListener("click", cerrar);
    modal.addEventListener("click", (e) => { if (e.target === modal) cerrar(); });

    modal.querySelector("#btnGuardarAlbum").addEventListener("click", async () => {
      if (seleccionados.size === 0) {
        alert("Seleccioná al menos un recuerdo 💜");
        return;
      }

      for (const id of seleccionados) {
        const recuerdo = todosLosRecuerdos.find(r => r.id === id);
        if (recuerdo) {
          recuerdo.albumId = albumId;
          album.recuerdos = album.recuerdos || [];
          if (!album.recuerdos.includes(id)) album.recuerdos.push(id);
          await actualizarEnBin("recuerdos", recuerdo);
        }
      }

      await actualizarEnBin("albums", album);

      if (window.lanzarConfeti) window.lanzarConfeti(1500);
      cerrar();
      renderizarFiltros();
      renderizarRecuerdos();
      if (window.renderizarBurbujasVideos) window.renderizarBurbujasVideos();
      sincronizarFiltrosGlobales();
      alert(`✅ ${seleccionados.size} recuerdos agregados a ${album.nombre}`);
    });
  }

  // ========== RENDERIZAR FILTROS ==========
  function renderizarFiltros() {
    const contenedor = document.getElementById("recuerdosFiltros");
    if (!contenedor) return;

    const albumActual = albumsDisponibles.find(a => a.id === filtrosActivos.album);

    contenedor.innerHTML = `
      <div class="filtros-barra">
        <div class="filtro-grupo" style="flex: 2; min-width: 250px;">
          <label class="filtro-label">📁 Álbum</label>
          <select id="filtroAlbum" class="filtro-select">
            <option value="sin-album" ${filtrosActivos.album === "sin-album" ? 'selected' : ''}>📷 Sin álbum</option>
            ${albumsDisponibles.map(a => `
              <option value="${a.id}" ${filtrosActivos.album === a.id ? 'selected' : ''}>${a.emoji} ${a.nombre}</option>
            `).join("")}
          </select>
        </div>

        <div class="filtro-grupo filtro-busqueda" style="flex: 2; min-width: 250px;">
          <label class="filtro-label">🔍 Buscar (en todos)</label>
          <input type="text" id="filtroBusqueda" class="filtro-input" value="${filtrosActivos.busqueda}" placeholder="Buscar por título o descripción...">
        </div>

        <button class="btn-nuevo-album" id="btnNuevoAlbum">➕ Nuevo álbum</button>
        ${albumActual ? `
          <button class="btn-nuevo-album" id="btnAgregarAAlbum" style="background: linear-gradient(135deg, #f28ca6, #a874e8);">📸 Agregar recuerdos</button>
          <button class="btn-nuevo-album" id="btnEliminarAlbum" style="background: linear-gradient(135deg, #d96666, #e85a8a);">🗑️ Eliminar álbum</button>
        ` : ""}
      </div>

      ${albumsDisponibles.length > 0 ? `
        <div class="albums-chips">
          <button class="album-chip ${filtrosActivos.album === "sin-album" ? "activo" : ""}" data-album="sin-album">📷 Sin álbum</button>
          ${albumsDisponibles.map(a => `
            <button class="album-chip ${filtrosActivos.album === a.id ? "activo" : ""}" data-album="${a.id}">
              ${a.emoji} ${a.nombre}
            </button>
          `).join("")}
        </div>
      ` : ""}
    `;

    document.getElementById("filtroAlbum").addEventListener("change", (e) => {
      filtrosActivos.album = e.target.value;
      renderizarRecuerdos();
      if (window.renderizarBurbujasVideos) window.renderizarBurbujasVideos();
      sincronizarFiltrosGlobales();
    });

    document.getElementById("filtroBusqueda").addEventListener("input", (e) => {
      filtrosActivos.busqueda = e.target.value.toLowerCase();
      renderizarRecuerdos();
      if (window.renderizarBurbujasVideos) window.renderizarBurbujasVideos();
      sincronizarFiltrosGlobales();
    });

    document.getElementById("btnNuevoAlbum").addEventListener("click", crearAlbum);

    const btnAgregar = document.getElementById("btnAgregarAAlbum");
    if (btnAgregar) {
      btnAgregar.addEventListener("click", () => abrirModalAlbum(filtrosActivos.album));
    }

    const btnEliminar = document.getElementById("btnEliminarAlbum");
    if (btnEliminar) {
      btnEliminar.addEventListener("click", () => eliminarAlbum(filtrosActivos.album));
    }

    contenedor.querySelectorAll(".album-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        filtrosActivos.album = chip.dataset.album;
        renderizarFiltros();
        renderizarRecuerdos();
        if (window.renderizarBurbujasVideos) window.renderizarBurbujasVideos();
        sincronizarFiltrosGlobales();
      });
    });
  }

  // ========== RENDERIZAR RECUERDOS (FOTOS) ==========
  function renderizarRecuerdos() {
    const contenedor = document.getElementById("galeriaUsuarioRecuerdos");
    const contenedorOriginal = document.getElementById("galeria");
    if (!contenedor) return;

    let filtrados = filtrarRecuerdos(todosLosRecuerdos, false);
    filtrados.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    const contador = document.getElementById("contadorRecuerdos");
    if (contador) {
      contador.textContent = `${filtrados.length} ${filtrados.length === 1 ? 'recuerdo' : 'recuerdos'}`;
    }

    const mostrarOriginales = 
      filtrosActivos.album === "sin-album" && 
      (!filtrosActivos.busqueda || !filtrosActivos.busqueda.trim());

    if (contenedorOriginal) {
      contenedorOriginal.style.display = mostrarOriginales ? "grid" : "none";
    }

    if (filtrados.length === 0) {
      contenedor.innerHTML = "";
      return;
    }

    contenedor.innerHTML = filtrados.map(item => `
      <figure class="galeria-item reveal visible" data-id="${item.id}">
        <img src="${item.url}" alt="${item.titulo || ''}" loading="lazy" 
             onclick="abrirLightboxGaleria('${item.url}', '${(item.descripcion || item.titulo || '').replace(/'/g, "\\'")}', '${item.id}')">
        <figcaption>
          <div class="recuerdo-fecha">${formatearFecha(item.fecha)}</div>
          <p class="recuerdo-texto">${item.descripcion || item.titulo || "Sin descripción"}</p>
          <button class="btn-eliminar-recuerdo" onclick="event.stopPropagation(); eliminarRecuerdoGaleria('${item.id}')" title="Eliminar">🗑️</button>
        </figcaption>
      </figure>
    `).join("");
  }

  // ========== LIGHTBOX con botón eliminar ==========
  window.abrirLightboxGaleria = function(url, titulo, itemId) {
    const lb = document.createElement("div");
    lb.className = "lightbox-galeria";
    lb.innerHTML = `
      <button class="lightbox-cerrar" aria-label="Cerrar">✕</button>
      <div class="lightbox-contenido">
        <img src="${url}" alt="${titulo}">
        ${titulo ? `<div class="lightbox-caption">${titulo}</div>` : ""}
      </div>
      ${itemId ? `<button class="lightbox-eliminar" onclick="event.stopPropagation(); eliminarRecuerdoGaleria('${itemId}'); this.closest('.lightbox-galeria').remove(); document.body.style.overflow='';" title="Eliminar este recuerdo">🗑️ Eliminar</button>` : ""}
    `;
    document.body.appendChild(lb);
    document.body.style.overflow = "hidden";

    const cerrar = () => {
      lb.style.opacity = "0";
      setTimeout(() => { lb.remove(); document.body.style.overflow = ""; }, 300);
    };

    lb.querySelector(".lightbox-cerrar").addEventListener("click", (e) => { e.stopPropagation(); cerrar(); });
    lb.addEventListener("click", (e) => { if (e.target === lb) cerrar(); });
    document.addEventListener("keydown", function onKey(e) {
      if (e.key === "Escape") { cerrar(); document.removeEventListener("keydown", onKey); }
    });
  };

  // Exponer eliminar globalmente
  window.eliminarRecuerdoGaleria = eliminarRecuerdo;

  // ========== MODAL DE SUBIDA ==========
  function crearModalSubida(tipo, tipoForzado = null) {
    const autorDefault = getUltimoAutor();

    let titulo;
    if (tipo === "recuerdos") {
      if (tipoForzado === "video") titulo = "Nuevo video";
      else if (tipoForzado === "imagen") titulo = "Nueva foto";
      else titulo = "Nuevo recuerdo";
    } else {
      titulo = "Nueva razón";
    }

    let accept = "image/*,video/*";
    if (tipoForzado === "video") accept = "video/*";
    else if (tipoForzado === "imagen") accept = "image/*";

    const modal = document.createElement("div");
    modal.className = "subida-modal";
    modal.innerHTML = `
      <div class="subida-papel">
        <button class="subida-cerrar" aria-label="Cerrar">✕</button>
        <h2 class="subida-titulo">${titulo}</h2>
        <p class="subida-sub">Completá los datos y subí tu archivo.</p>

        <div class="subida-campo">
          <label class="subida-label">¿Quién lo sube?</label>
          <div class="subida-autores">
            <button type="button" class="subida-autor-btn ${autorDefault === "Gael" ? "activo" : ""}" data-autor="Gael">✎ Gael</button>
            <button type="button" class="subida-autor-btn ${autorDefault === "Mary" ? "activo" : ""}" data-autor="Mary">✿ Mary</button>
          </div>
        </div>

        <div class="subida-campo">
          <label class="subida-label">Archivo</label>
          <input type="file" id="archivoSubida" accept="${accept}" />
          <small style="font-size:0.75rem;color:#8a6a4a;margin-top:6px;display:block;">
            Máx 32 MB imágenes / 100 MB videos.
          </small>
        </div>

        <div class="subida-campo">
          <label class="subida-label">Título</label>
          <input type="text" id="tituloSubida" class="subida-input" placeholder="¿Qué es?" maxlength="200" />
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
                <option value="${a.id}" ${filtrosActivos.album === a.id ? 'selected' : ''}>${a.emoji} ${a.nombre}</option>
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

    let autorSeleccionado = autorDefault;

    modal.querySelectorAll(".subida-autor-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        modal.querySelectorAll(".subida-autor-btn").forEach(b => b.classList.remove("activo"));
        btn.classList.add("activo");
        autorSeleccionado = btn.dataset.autor;
        setUltimoAutor(autorSeleccionado);
      });
    });

    const cerrar = () => {
      modal.classList.remove("activo");
      document.body.style.overflow = "";
      setTimeout(() => modal.remove(), 500);
    };

    modal.querySelector(".subida-cerrar").addEventListener("click", cerrar);
    modal.querySelector("#btnCancelarSubida").addEventListener("click", cerrar);
    modal.addEventListener("click", (e) => { if (e.target === modal) cerrar(); });

    modal.querySelector("#btnConfirmarSubida").addEventListener("click", async () => {
      const archivo = document.getElementById("archivoSubida").files[0];
      const tituloVal = document.getElementById("tituloSubida").value.trim();
      const descripcion = document.getElementById("descripcionSubida").value.trim();
      const albumId = tipo === "recuerdos" ? (document.getElementById("albumSubida")?.value || "") : "";

      if (!archivo) return alert("Seleccioná un archivo 💜");
      if (!tituloVal) return alert("Escribí un título 💜");

      const esVideo = archivo.type.startsWith("video/");
      const limiteMB = esVideo ? 100 : 32;
      if (archivo.size > limiteMB * 1024 * 1024) {
        return alert(`El archivo es muy grande (máx ${limiteMB} MB) 💜`);
      }

      const progreso = modal.querySelector("#subidaProgreso");
      const mensaje = modal.querySelector("#subidaMensaje");
      progreso.style.display = "block";

      try {
        mensaje.textContent = esVideo ? "Subiendo video a Cloudinary..." : "Subiendo foto a ImgBB...";

        let resultado;
        if (esVideo) {
          resultado = await subirACloudinary(archivo);
        } else {
          resultado = await subirAImgBB(archivo);
        }

        mensaje.textContent = "Guardando...";
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

        if (tipo === "recuerdos") {
          todosLosRecuerdos.push(item);
        }

        mensaje.textContent = "✅ ¡Subido!";
        if (window.lanzarConfeti) window.lanzarConfeti(1500);

        setTimeout(() => {
          cerrar();
          renderizarFiltros();
          renderizarRecuerdos();
          if (window.renderizarBurbujasVideos) window.renderizarBurbujasVideos();
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
    eliminarAlbum,
    abrirModalAlbum,
    renderizarFiltros,
    renderizarRecuerdos,
    cargarDatos,
    filtrarRecuerdos,
    getRecuerdos: () => todosLosRecuerdos,
    getAlbums: () => albumsDisponibles,
    getFiltros: () => filtrosActivos
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

    const btnAgregar = document.getElementById("btnAgregarRecuerdo");
    if (btnAgregar) {
      btnAgregar.addEventListener("click", () => {
        if (window.galeriaUsuario) {
          window.galeriaUsuario.crearModalSubida("recuerdos", "imagen");
        }
      });
    }

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