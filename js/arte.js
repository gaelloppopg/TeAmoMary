/* ============================================
   TALLER DE ARTE — Sincronizado con JSONBin
   Basado en la arquitectura del diario.js
   - Guarda las obras en el mismo bin (campo: obras_arte)
   - Auto-sync cada 30s
   - Sincroniza al volver a la pestaña
   - Sube imágenes a ImgBB (fallback Cloudinary)
   ============================================ */

(function () {
  "use strict";

  // ========== CONFIGURACIÓN JSONBIN ==========
  const JSONBIN_MASTER_KEY = "$2a$10$o5/KkktxRiEfoxN33ZQQieN0iUvv/pkvIG8riNohEo5N4I7NCGU2q";
  const JSONBIN_BIN_ID = "6aa58aecffd5d16053fef5c0";
  const JSONBIN_URL = "https://api.jsonbin.io/v3/b/" + JSONBIN_BIN_ID;

  // ========== CONFIG SUBIDA IMÁGENES ==========
  const IMGBB_API_KEY = "e612807706852fdf6efbcaab6e66de43";
  const CLOUDINARY_CLOUD_NAME = "sjlitdwr";
  const CLOUDINARY_UPLOAD_PRESET = "PaginaNovia";

  // Intervalo de auto-sync (30 segundos)
  const SYNC_INTERVAL = 30 * 1000;

  // ========== ESTADO ==========
  let obras = [];
  let syncIntervalId = null;
  let dibujando = false;
  let herramienta = "pincel";
  let color = "#1a1a1a";
  let grosor = 8;
  let ultimoX = 0, ultimoY = 0;
  let historial = [];
  let sprayInterval = null;
  let editandoId = null;
  let fondoImagen = null;
  let fondoImagenURL = "";
  let fondoColor = "#ffffff";
  let fondoOpacidad = 100;

  // ========== ELEMENTOS DOM ==========
  const galeriaArte = document.getElementById("galeriaArte");
  const galeriaVacia = document.getElementById("galeriaVacia");
  const estadoSync = document.getElementById("estadoSync");
  const estudioOverlay = document.getElementById("estudioOverlay");

  let canvasFondo, ctxFondo, canvas, ctx;

  // ========== UTILIDADES ==========
  function formatearFecha(iso) {
    const fecha = new Date(iso);
    return fecha.toLocaleDateString("es-ES", {
      day: "numeric", month: "long", year: "numeric"
    });
  }

  function generarId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function setSyncEstado(estado, mensaje) {
    if (!estadoSync) return;
    if (estado === "sincronizando") {
      estadoSync.textContent = mensaje || "☁️ Sincronizando...";
      estadoSync.style.color = "#999";
    } else if (estado === "error") {
      estadoSync.textContent = mensaje || "⚠️ Sin conexión";
      estadoSync.style.color = "#d96666";
    } else {
      estadoSync.textContent = mensaje || "";
      estadoSync.style.color = "#999";
    }
  }

  // ========== CARGAR / GUARDAR EN JSONBIN ==========
  async function cargarObras() {
    setSyncEstado("sincronizando", "☁️ Cargando desde la nube...");
    try {
      const res = await fetch(JSONBIN_URL + "/latest", {
        headers: {
          "X-Master-Key": JSONBIN_MASTER_KEY,
          "X-Bin-Meta": "false"
        }
      });

      if (!res.ok) throw new Error("Error al cargar: " + res.status);

      const data = await res.json();
      obras = Array.isArray(data.obras_arte) ? data.obras_arte : [];
      obras.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      setSyncEstado("ok", `✅ ${obras.length} obra${obras.length === 1 ? '' : 's'} sincronizada${obras.length === 1 ? '' : 's'}`);
      setTimeout(() => setSyncEstado("ok", ""), 3000);
      renderizarGaleria();
      return true;
    } catch (err) {
      console.error("Error cargando obras:", err);
      setSyncEstado("error", "⚠️ No se pudo conectar. Mostrando copia local.");
      // Fallback a localStorage
      try {
        obras = JSON.parse(localStorage.getItem("obras_arte_local") || "[]");
        renderizarGaleria();
      } catch {}
      return false;
    }
  }

  async function guardarObras() {
    setSyncEstado("sincronizando", "☁️ Guardando en la nube...");
    try {
      // Primero leer el bin actual para no sobreescribir otros datos
      const resLeer = await fetch(JSONBIN_URL + "/latest", {
        headers: {
          "X-Master-Key": JSONBIN_MASTER_KEY,
          "X-Bin-Meta": "false"
        }
      });
      if (!resLeer.ok) throw new Error("Error leyendo bin: " + resLeer.status);
      const data = await resLeer.json();

      // Actualizar solo el campo obras_arte
      data.obras_arte = obras;

      const jsonString = JSON.stringify(data);
      const tamañoKB = (jsonString.length / 1024).toFixed(1);
      console.log(`📊 Tamaño del bin: ${tamañoKB} KB (límite: 100 KB)`);

      const res = await fetch(JSONBIN_URL, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Master-Key": JSONBIN_MASTER_KEY
        },
        body: jsonString
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("❌ Error JSONBin:", res.status, errText);
        if (res.status === 413) throw new Error("El bin está lleno. Borra algunas obras.");
        throw new Error("Error " + res.status);
      }

      console.log(`✅ Guardado exitoso (${tamañoKB} KB)`);
      setSyncEstado("ok", "✅ Guardado y sincronizado");
      setTimeout(() => setSyncEstado("ok", ""), 3000);
      return true;
    } catch (err) {
      console.error("Error guardando obras:", err);
      setSyncEstado("error", "⚠️ No se pudo sincronizar: " + err.message);
      // Guardar al menos en localStorage
      try {
        localStorage.setItem("obras_arte_local", JSON.stringify(obras));
      } catch {}
      return false;
    }
  }

  // ========== SUBIR IMAGEN A IMGBB / CLOUDINARY ==========
  async function subirAImgBB(archivo) {
    const formData = new FormData();
    formData.append("image", archivo);
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: "POST", body: formData
    });
    if (!res.ok) throw new Error("Error ImgBB");
    const data = await res.json();
    if (!data.success) throw new Error(data.error?.message || "Error ImgBB");
    return data.data.url;
  }

  async function subirACloudinary(archivo) {
    const formData = new FormData();
    formData.append("file", archivo);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
    const res = await fetch(url, { method: "POST", body: formData });
    if (!res.ok) throw new Error("Error Cloudinary");
    const data = await res.json();
    return data.secure_url;
  }

  async function subirImagen(archivo) {
    try {
      return await subirAImgBB(archivo);
    } catch (e) {
      console.warn("ImgBB falló, usando Cloudinary...", e);
      return await subirACloudinary(archivo);
    }
  }

  function dataURLtoBlob(dataURL) {
    const partes = dataURL.split(",");
    const mime = partes[0].match(/:(.*?);/)[1];
    const binario = atob(partes[1]);
    const array = new Uint8Array(binario.length);
    for (let i = 0; i < binario.length; i++) array[i] = binario.charCodeAt(i);
    return new Blob([array], { type: mime });
  }

  // ========== RENDERIZAR GALERÍA ==========
  function renderizarGaleria() {
    if (!galeriaArte) return;

    if (obras.length === 0) {
      galeriaArte.innerHTML = "";
      galeriaVacia.style.display = "block";
      return;
    }
    galeriaVacia.style.display = "none";

    galeriaArte.innerHTML = obras.map((o, i) => `
      <div class="obra-card" data-id="${o.id}" style="animation-delay: ${i * 0.08}s">
        <div class="obra-marco">
          <img src="${o.imagen}" alt="${o.titulo || 'Obra'}" />
        </div>
        <div class="obra-info">
          <h3>${o.titulo || "Sin título"}</h3>
          <small>${formatearFecha(o.fecha)}</small>
        </div>
        <div class="obra-acciones">
          <button type="button" class="btn-obra" data-action="descargar" data-id="${o.id}" title="Descargar">⬇</button>
          <button type="button" class="btn-obra" data-action="editar" data-id="${o.id}" title="Editar">✎</button>
          <button type="button" class="btn-obra" data-action="borrar" data-id="${o.id}" title="Borrar">✕</button>
        </div>
      </div>
    `).join("");

    // Click en la imagen → ver en grande
    galeriaArte.querySelectorAll(".obra-card img").forEach(img => {
      img.addEventListener("click", () => {
        const id = img.closest(".obra-card").dataset.id;
        const obra = obras.find(o => o.id === id);
        if (obra) verObra(obra);
      });
    });

    // Botones de acción
    galeriaArte.querySelectorAll(".btn-obra").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const action = btn.dataset.action;
        const obra = obras.find(o => o.id === id);
        if (!obra) return;
        if (action === "descargar") descargarObra(obra);
        if (action === "editar") abrirEstudio(obra);
        if (action === "borrar") borrarObra(obra);
      });
    });
  }

  function verObra(obra) {
    const modal = document.createElement("div");
    modal.className = "modal-carta";
    modal.innerHTML = `
      <div class="modal-content" style="max-width:900px;">
        <button type="button" class="modal-close">✕</button>
        <h2 style="text-align:center;color:#1a1a1a;margin-bottom:20px;font-weight:400;font-style:italic;font-family:'Playfair Display',serif;">${obra.titulo || "Sin título"}</h2>
        <img src="${obra.imagen}" style="width:100%;display:block;" />
        <p style="text-align:center;margin-top:20px;color:#999;font-size:.75rem;letter-spacing:1.5px;text-transform:uppercase;">
          ${formatearFecha(obra.fecha)}
        </p>
      </div>
    `;
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add("show"));
    const cerrar = () => { modal.classList.remove("show"); setTimeout(() => modal.remove(), 300); };
    modal.querySelector(".modal-close").addEventListener("click", cerrar);
    modal.addEventListener("click", (e) => { if (e.target === modal) cerrar(); });
  }

  function descargarObra(obra) {
    const a = document.createElement("a");
    a.href = obra.imagen;
    a.download = `${(obra.titulo || "obra").replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.png`;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function borrarObra(obra) {
    if (!confirm("¿Borrar esta obra para siempre?")) return;
    obras = obras.filter(o => o.id !== obra.id);
    renderizarGaleria();
    await guardarObras();
  }

  // ========== ESTUDIO ==========
  function abrirEstudio(obraExistente = null) {
    editandoId = obraExistente ? obraExistente.id : null;
    estudioOverlay.classList.add("activo");

    const titulo = document.getElementById("tituloObra");
    historial = [];

    canvasFondo = document.getElementById("lienzoFondo");
    ctxFondo = canvasFondo.getContext("2d");

    canvas = document.getElementById("lienzo");
    ctx = canvas.getContext("2d", { willReadFrequently: true });

    conectarEventosCanvas();

    // Reset fondo
    fondoImagen = null;
    fondoImagenURL = "";
    fondoColor = "#ffffff";
    fondoOpacidad = 100;
    document.getElementById("fondoColor").value = "#ffffff";
    document.getElementById("fondoOpacidad").value = 100;
    document.getElementById("fondoOpacidadValor").textContent = 100;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    dibujarFondo();

    if (obraExistente) {
      titulo.value = obraExistente.titulo || "";
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        guardarHistorial();
      };
      img.src = obraExistente.imagen;
    } else {
      titulo.value = "";
      guardarHistorial();
    }
  }

  function cerrarEstudio() {
    if (historial.length > 1) {
      if (!confirm("¿Salir sin guardar? Los cambios no guardados se perderán.")) return;
    }
    estudioOverlay.classList.remove("activo");
  }

  // ========== FONDO ==========
  function dibujarFondo() {
    if (!ctxFondo || !canvasFondo) return;
    ctxFondo.clearRect(0, 0, canvasFondo.width, canvasFondo.height);

    if (fondoImagen && fondoImagen.complete && fondoImagen.naturalWidth > 0) {
      ctxFondo.save();
      ctxFondo.globalAlpha = fondoOpacidad / 100;
      const escala = Math.max(
        canvasFondo.width / fondoImagen.width,
        canvasFondo.height / fondoImagen.height
      );
      const w = fondoImagen.width * escala;
      const h = fondoImagen.height * escala;
      const x = (canvasFondo.width - w) / 2;
      const y = (canvasFondo.height - h) / 2;
      ctxFondo.drawImage(fondoImagen, x, y, w, h);
      ctxFondo.restore();
    } else {
      ctxFondo.fillStyle = fondoColor;
      ctxFondo.fillRect(0, 0, canvasFondo.width, canvasFondo.height);
    }
  }

  // ========== HISTORIAL ==========
  function guardarHistorial() {
    if (!ctx || !canvas) return;
    if (historial.length > 30) historial.shift();
    historial.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  }

  function deshacer() {
    if (historial.length <= 1) return;
    historial.pop();
    const prev = historial[historial.length - 1];
    ctx.putImageData(prev, 0, 0);
  }

  // ========== DIBUJO ==========
  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  function empezarDibujo(e) {
    e.preventDefault();
    dibujando = true;
    const pos = getPos(e);
    ultimoX = pos.x;
    ultimoY = pos.y;

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    if (herramienta === "borrador") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = grosor * 2;
    } else if (herramienta === "pincel") {
      ctx.globalCompositeOperation = "source-over";
      ctx.lineWidth = grosor;
      ctx.globalAlpha = 0.9;
    } else if (herramienta === "lapiz") {
      ctx.globalCompositeOperation = "source-over";
      ctx.lineWidth = Math.max(1, grosor / 3);
    } else if (herramienta === "neon") {
      ctx.globalCompositeOperation = "source-over";
      ctx.lineWidth = grosor;
      ctx.shadowColor = color;
      ctx.shadowBlur = 20;
    } else if (herramienta === "spray") {
      ctx.globalCompositeOperation = "source-over";
      ctx.lineWidth = 1;
      sprayInterval = setInterval(() => {
        for (let i = 0; i < 8; i++) {
          const ang = Math.random() * Math.PI * 2;
          const rad = Math.random() * grosor * 2;
          const x = ultimoX + Math.cos(ang) * rad;
          const y = ultimoY + Math.sin(ang) * rad;
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }, 30);
    }

    ctx.beginPath();
    ctx.moveTo(ultimoX, ultimoY);
  }

  function dibujar(e) {
    if (!dibujando) return;
    e.preventDefault();
    const pos = getPos(e);

    if (herramienta === "spray") {
      ultimoX = pos.x;
      ultimoY = pos.y;
      return;
    }

    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    ultimoX = pos.x;
    ultimoY = pos.y;
  }

  function terminarDibujo() {
    if (!dibujando) return;
    dibujando = false;
    ctx.closePath();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.shadowBlur = 0;
    if (sprayInterval) { clearInterval(sprayInterval); sprayInterval = null; }
    guardarHistorial();
  }

  function conectarEventosCanvas() {
    // Clonar para remover listeners viejos
    const nuevo = canvas.cloneNode(true);
    canvas.parentNode.replaceChild(nuevo, canvas);
    canvas = nuevo;
    ctx = canvas.getContext("2d", { willReadFrequently: true });

    canvas.addEventListener("mousedown", empezarDibujo);
    canvas.addEventListener("mousemove", dibujar);
    canvas.addEventListener("mouseup", terminarDibujo);
    canvas.addEventListener("mouseleave", terminarDibujo);
    canvas.addEventListener("touchstart", empezarDibujo, { passive: false });
    canvas.addEventListener("touchmove", dibujar, { passive: false });
    canvas.addEventListener("touchend", terminarDibujo);
  }

  // ========== FUSIONAR CAPAS ==========
  function fusionarCapas() {
    const temp = document.createElement("canvas");
    temp.width = canvas.width;
    temp.height = canvas.height;
    const tctx = temp.getContext("2d");
    tctx.drawImage(canvasFondo, 0, 0);
    tctx.drawImage(canvas, 0, 0);
    return temp;
  }

  // ========== GUARDAR OBRA ==========
  async function guardarObra() {
    const titulo = document.getElementById("tituloObra").value.trim();
    const fusionado = fusionarCapas();

    setSyncEstado("sincronizando", "⏳ Preparando imagen...");

    // Convertir a Blob para subir a ImgBB (así no llenamos JSONBin)
    const dataURL = fusionado.toDataURL("image/jpeg", 0.85);
    const blob = dataURLtoBlob(dataURL);

    let imageUrl;
    try {
      setSyncEstado("sincronizando", "⏳ Subiendo imagen...");
      // Crear un File a partir del Blob
      const file = new File([blob], "obra.jpg", { type: "image/jpeg" });
      imageUrl = await subirImagen(file);
    } catch (err) {
      alert("Error subiendo la imagen: " + err.message);
      setSyncEstado("error", "❌ Error al subir");
      return;
    }

    let obraGuardada;
    if (editandoId) {
      const idx = obras.findIndex(o => o.id === editandoId);
      if (idx >= 0) {
        obras[idx].titulo = titulo || "Sin título";
        obras[idx].imagen = imageUrl;
        obras[idx].fecha = new Date().toISOString();
        obraGuardada = obras[idx];
      }
    } else {
      obraGuardada = {
        id: generarId(),
        titulo: titulo || "Sin título",
        imagen: imageUrl,
        fecha: new Date().toISOString()
      };
      obras.unshift(obraGuardada);
    }

    // Ordenar por fecha
    obras.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    renderizarGaleria();
    estudioOverlay.classList.remove("activo");
    editandoId = null;

    if (window.lanzarConfeti) window.lanzarConfeti(1500);

    // Guardar en JSONBin
    await guardarObras();
  }

  // ========== EVENTOS DOM ==========
  document.addEventListener("DOMContentLoaded", async () => {
    // Cargar obras
    await cargarObras();
    iniciarAutoSync();

    // Botones principales
    document.getElementById("btnRecargar")?.addEventListener("click", cargarObras);
    document.getElementById("btnNuevaObra")?.addEventListener("click", () => abrirEstudio(null));
    document.getElementById("cerrarEstudio")?.addEventListener("click", cerrarEstudio);

    // Herramientas
    document.querySelectorAll(".tool-btn[data-tool]").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".tool-btn[data-tool]").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        herramienta = btn.dataset.tool;
      });
    });

    // Grosor
    document.getElementById("grosor")?.addEventListener("input", (e) => {
      grosor = parseInt(e.target.value, 10);
      document.getElementById("grosorValor").textContent = grosor;
    });

    // Colores
    document.querySelectorAll(".color-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".color-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        color = btn.dataset.color;
        document.getElementById("colorPicker").value = color;
      });
    });
    document.getElementById("colorPicker")?.addEventListener("input", (e) => {
      color = e.target.value;
      document.querySelectorAll(".color-btn").forEach(b => b.classList.remove("active"));
    });

    // FONDO - Color
    document.getElementById("fondoColor")?.addEventListener("input", (e) => {
      fondoColor = e.target.value;
      fondoImagen = null;
      fondoImagenURL = "";
      dibujarFondo();
    });

    // FONDO - Subir imagen
    const btnSubirFondo = document.getElementById("btnSubirFondo");
    const inputFondo = document.getElementById("inputFondo");
    btnSubirFondo?.addEventListener("click", () => inputFondo.click());
    inputFondo?.addEventListener("change", async (e) => {
      const archivo = e.target.files[0];
      if (!archivo) return;

      if (!archivo.type.startsWith("image/")) {
        alert("Solo se permiten imágenes 💜");
        return;
      }
      if (archivo.size > 32 * 1024 * 1024) {
        alert("La imagen es muy grande (máx 32 MB) 💜");
        return;
      }

      const textoOriginal = btnSubirFondo.textContent;
      btnSubirFondo.textContent = "⏳";
      btnSubirFondo.disabled = true;

      try {
        const url = await subirImagen(archivo);
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          fondoImagen = img;
          fondoImagenURL = url;
          dibujarFondo();
        };
        img.onerror = () => alert("No se pudo cargar la imagen de fondo.");
        img.src = url;
      } catch (err) {
        alert("Error al subir la imagen: " + err.message);
        console.error(err);
      } finally {
        btnSubirFondo.textContent = textoOriginal;
        btnSubirFondo.disabled = false;
        inputFondo.value = "";
      }
    });

    // FONDO - Opacidad
    document.getElementById("fondoOpacidad")?.addEventListener("input", (e) => {
      fondoOpacidad = parseInt(e.target.value, 10);
      document.getElementById("fondoOpacidadValor").textContent = fondoOpacidad;
      dibujarFondo();
    });

    // FONDO - Quitar
    document.getElementById("btnQuitarFondo")?.addEventListener("click", () => {
      fondoImagen = null;
      fondoImagenURL = "";
      fondoColor = "#ffffff";
      fondoOpacidad = 100;
      document.getElementById("fondoColor").value = "#ffffff";
      document.getElementById("fondoOpacidad").value = 100;
      document.getElementById("fondoOpacidadValor").textContent = 100;
      dibujarFondo();
    });

    // Acciones
    document.getElementById("btnDeshacer")?.addEventListener("click", deshacer);
    document.getElementById("btnLimpiar")?.addEventListener("click", () => {
      if (confirm("¿Limpiar todo el dibujo? (El fondo se mantiene)")) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        guardarHistorial();
      }
    });
    document.getElementById("btnDescargar")?.addEventListener("click", () => {
      const a = document.createElement("a");
      const titulo = document.getElementById("tituloObra").value.trim() || "mi-dibujo";
      a.download = `${titulo.replace(/\s+/g, "-").toLowerCase()}.png`;
      a.href = fusionarCapas().toDataURL("image/png");
      a.click();
    });
    document.getElementById("btnGuardar")?.addEventListener("click", guardarObra);

    // Escape cierra estudio
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && estudioOverlay.classList.contains("activo")) {
        cerrarEstudio();
      }
    });
  });

  // ========== AUTO-SYNC cada 30 segundos ==========
  function iniciarAutoSync() {
    if (syncIntervalId) clearInterval(syncIntervalId);
    syncIntervalId = setInterval(() => {
      // No sincronizar mientras dibuja o está en el estudio
      if (!dibujando && !estudioOverlay.classList.contains("activo")) {
        cargarObras();
      }
    }, SYNC_INTERVAL);
  }

  // Sincronizar al volver a la pestaña
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && !estudioOverlay.classList.contains("activo")) {
      cargarObras();
    }
  });

})();