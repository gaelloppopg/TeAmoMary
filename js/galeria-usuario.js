/* ============================================
   GALERÍA DE USUARIO - Subir fotos y videos
   Usa ImgBB para subir y JSONBin para guardar URLs
   ============================================ */

(function () {
  "use strict";

  // ⚠️ REEMPLAZÁ CON TU API KEY DE IMGBB
  const IMGBB_API_KEY = "e612807706852fdf6efbcaab6e66de43";

  // JSONBin (el mismo de siempre)
  const JSONBIN_MASTER_KEY = "$2a$10$o5/KkktxRiEfoxN33ZQQieN0iUvv/pkvIG8riNohEo5N4I7NCGU2q";
  const JSONBIN_BIN_ID = "6aa58aecffd5d16053fef5c0";
  const JSONBIN_URL = "https://api.jsonbin.io/v3/b/" + JSONBIN_BIN_ID;

  // ========== UTILIDADES ==========
  function detectarAutor() {
    let autor = localStorage.getItem("diario_autor_actual");
    if (!autor) {
      autor = confirm("¿Sos Gael? (Cancelar = Mary)") ? "Gael" : "Mary";
      localStorage.setItem("diario_autor_actual", autor);
    }
    return autor;
  }

  // Subir archivo a ImgBB
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
      thumb: data.data.thumb?.url || data.data.url,
      delete_url: data.data.delete_url
    };
  }

  // Guardar en JSONBin (agregar al array que corresponda)
  async function guardarEnBin(tipo, item) {
    // tipo: "recuerdos" o "razones"
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
      razones: data.razones || []
    };

    // Agregar el nuevo item
    nuevoContenido[tipo].push(item);

    // Guardar todo
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

  // ========== FORMULARIO DE SUBIDA ==========
  function crearModalSubida(tipo) {
    const autor = detectarAutor();
    const titulo = tipo === "recuerdos" ? "Nuevo recuerdo" : "Nueva razón";

    const modal = document.createElement("div");
    modal.className = "subida-modal";
    modal.innerHTML = `
      <div class="subida-papel">
        <button class="subida-cerrar" aria-label="Cerrar">✕</button>
        <h2 class="subida-titulo">${titulo}</h2>
        <p class="subida-sub">Subí una foto o video y agregá una descripción.</p>

        <div class="subida-campo">
          <label class="subida-label">¿Quién lo sube?</label>
          <div class="subida-autores">
            <button type="button" class="subida-autor-btn ${autor === "Gael" ? "activo" : ""}" data-autor="Gael">✎ Gael</button>
            <button type="button" class="subida-autor-btn ${autor === "Mary" ? "activo" : ""}" data-autor="Mary">✿ Mary</button>
          </div>
        </div>

        <div class="subida-campo">
          <label class="subida-label">Archivo (foto o video)</label>
          <input type="file" id="archivoSubida" accept="image/*,video/*" />
          <small style="font-size:0.75rem;color:#8a6a4a;margin-top:6px;display:block;">
            Máximo 32 MB. Si es video pesado, se tarda más.
          </small>
        </div>

        <div class="subida-campo">
          <label class="subida-label">${tipo === "recuerdos" ? "Título" : "La razón"}</label>
          <input type="text" id="tituloSubida" class="subida-input"
                 placeholder="${tipo === "recuerdos" ? "¿Qué recuerdo es?" : "Escribí la razón..."}"
                 maxlength="200" />
        </div>

        <div class="subida-campo">
          <label class="subida-label">Descripción (opcional)</label>
          <textarea id="descripcionSubida" class="subida-textarea" placeholder="Contá un poco más..."></textarea>
        </div>

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

    // Selector de autor
    modal.querySelectorAll(".subida-autor-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        modal.querySelectorAll(".subida-autor-btn").forEach(b => b.classList.remove("activo"));
        btn.classList.add("activo");
        autorSeleccionado = btn.dataset.autor;
        localStorage.setItem("diario_autor_actual", autorSeleccionado);
      });
    });

    // Cerrar
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

    // Confirmar subida
    modal.querySelector("#btnConfirmarSubida").addEventListener("click", async () => {
      const archivo = document.getElementById("archivoSubida").files[0];
      const titulo = document.getElementById("tituloSubida").value.trim();
      const descripcion = document.getElementById("descripcionSubida").value.trim();

      if (!archivo) {
        alert("Seleccioná una foto o video 💜");
        return;
      }
      if (!titulo) {
        alert("Escribí un título 💜");
        return;
      }

      // Verificar tamaño
      if (archivo.size > 32 * 1024 * 1024) {
        alert("El archivo es muy grande. Máximo 32 MB 💜");
        return;
      }

      // Mostrar progreso
      const progreso = modal.querySelector("#subidaProgreso");
      const mensaje = modal.querySelector("#subidaMensaje");
      progreso.style.display = "block";

      try {
        mensaje.textContent = "Subiendo archivo a ImgBB...";
        const resultado = await subirAImgBB(archivo);

        mensaje.textContent = "Guardando en el diario...";
        const esVideo = archivo.type.startsWith("video/");
        const item = {
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          titulo: titulo,
          descripcion: descripcion,
          url: resultado.url,
          thumb: resultado.thumb,
          tipo: esVideo ? "video" : "imagen",
          autor: autorSeleccionado,
          fecha: new Date().toISOString()
        };

        await guardarEnBin(tipo, item);

        mensaje.textContent = "✅ ¡Subido!";
        if (window.lanzarConfeti) window.lanzarConfeti(1500);

        setTimeout(() => {
          cerrar();
          // Recargar la galería
          if (window.recargarGaleria) window.recargarGaleria();
        }, 1200);

      } catch (err) {
        console.error(err);
        mensaje.textContent = "❌ Error: " + err.message;
        setTimeout(() => {
          progreso.style.display = "none";
        }, 3000);
      }
    });
  }

  // ========== RENDERIZAR GALERÍA ==========
  async function renderizarGaleria(tipo, contenedorId) {
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return;

    try {
      const res = await fetch(JSONBIN_URL + "/latest", {
        headers: {
          "X-Master-Key": JSONBIN_MASTER_KEY,
          "X-Bin-Meta": "false"
        }
      });
      if (!res.ok) throw new Error("Error cargando");

      const data = await res.json();
      const items = data[tipo] || [];

      if (items.length === 0) {
        contenedor.innerHTML = `
          <div class="galeria-vacia">
            <strong>Todavía no hay nada acá</strong>
            Presioná "Agregar" para subir el primero 💜
          </div>
        `;
        return;
      }

      // Ordenar más recientes primero
      items.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

      contenedor.innerHTML = items.map(item => {
        const esVideo = item.tipo === "video";
        const autorClase = item.autor === "Mary" ? "mary" : "gael";
        const autorIcono = item.autor === "Mary" ? "✿" : "✎";

        return `
          <article class="galeria-item-usuario" data-id="${item.id}">
            <div class="galeria-media">
              ${esVideo 
                ? `<video controls preload="metadata" poster="${item.thumb}">
                     <source src="${item.url}" type="video/mp4">
                   </video>`
                : `<img src="${item.thumb}" alt="${item.titulo}" loading="lazy">`
              }
            </div>
            <div class="galeria-info">
              <span class="galeria-autor ${autorClase}">${autorIcono} ${item.autor}</span>
              <h3>${item.titulo}</h3>
              ${item.descripcion ? `<p>${item.descripcion}</p>` : ""}
            </div>
          </article>
        `;
      }).join("");

    } catch (err) {
      console.error("Error renderizando galería:", err);
      contenedor.innerHTML = `<p style="color:#d96666;">Error cargando. Intentá recargar.</p>`;
    }
  }

  // ========== API GLOBAL ==========
  window.galeriaUsuario = {
    crearModalSubida,
    renderizarGaleria
  };

  // ========== AUTO-INICIALIZACIÓN ==========
  document.addEventListener("DOMContentLoaded", () => {
    // Si estamos en recuerdos.html
    if (document.getElementById("galeriaUsuarioRecuerdos")) {
      renderizarGaleria("recuerdos", "galeriaUsuarioRecuerdos");
      window.recargarGaleria = () => renderizarGaleria("recuerdos", "galeriaUsuarioRecuerdos");
    }
    // Si estamos en razones.html
    if (document.getElementById("galeriaUsuarioRazones")) {
      renderizarGaleria("razones", "galeriaUsuarioRazones");
      window.recargarGaleria = () => renderizarGaleria("razones", "galeriaUsuarioRazones");
    }
  });

})();