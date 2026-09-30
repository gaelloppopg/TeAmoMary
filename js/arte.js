/* =========================================
   TALLER DE ARTE
   - Canvas apilados: fondo + dibujo
   - Fondo: color / opacidad / imagen (subida)
   - Guardado en localStorage
   - Descarga como PNG fusionado
   - Galería minimalista moderna
   ========================================= */

const STORAGE_OBRAS = "obras_arte";
let obras = [];

// Config subida (igual que tu galería)
const IMGBB_API_KEY = "e612807706852fdf6efbcaab6e66de43";
const CLOUDINARY_CLOUD_NAME = "sjlitdwr";
const CLOUDINARY_UPLOAD_PRESET = "PaginaNovia";

// Canvas
let canvasFondo, ctxFondo;
let canvas, ctx;

// Estado dibujo
let dibujando = false;
let herramienta = "pincel";
let color = "#1a1a1a";
let grosor = 8;
let ultimoX = 0, ultimoY = 0;
let historial = [];
let sprayInterval = null;
let editandoIdx = null;

// Estado fondo
let fondoImagen = null;
let fondoImagenURL = "";
let fondoColor = "#ffffff";
let fondoOpacidad = 100;

// =========================================
// CARGAR / GUARDAR OBRAS
// =========================================
function cargarObras() {
  try {
    obras = JSON.parse(localStorage.getItem(STORAGE_OBRAS) || "[]");
  } catch { obras = []; }
}

function guardarObras() {
  try {
    localStorage.setItem(STORAGE_OBRAS, JSON.stringify(obras));
  } catch (e) {
    alert("No se pudo guardar (espacio lleno). Intenta descargar y borrar algunas obras.");
  }
}

// =========================================
// GALERÍA
// =========================================
function renderGaleria() {
  const cont = document.getElementById("galeriaArte");
  const vacia = document.getElementById("galeriaVacia");
  if (!cont) return;

  if (obras.length === 0) {
    cont.innerHTML = "";
    vacia.style.display = "block";
    return;
  }
  vacia.style.display = "none";

  cont.innerHTML = obras.map((o, i) => `
    <div class="obra-card" data-index="${i}" style="animation-delay: ${i * 0.08}s">
      <div class="obra-marco">
        <img src="${o.imagen}" alt="${o.titulo || 'Obra'}" />
      </div>
      <div class="obra-info">
        <h3>${o.titulo || "Sin título"}</h3>
        <small>${new Date(o.fecha).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}</small>
      </div>
      <div class="obra-acciones">
        <button class="btn-obra" data-action="descargar" data-index="${i}" title="Descargar">⬇</button>
        <button class="btn-obra" data-action="editar" data-index="${i}" title="Editar">✎</button>
        <button class="btn-obra" data-action="borrar" data-index="${i}" title="Borrar">✕</button>
      </div>
    </div>
  `).join("");

  cont.querySelectorAll(".obra-card img").forEach(img => {
    img.addEventListener("click", (e) => {
      const idx = parseInt(e.target.closest(".obra-card").dataset.index, 10);
      verObra(idx);
    });
  });

  cont.querySelectorAll(".btn-obra").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.index, 10);
      const action = btn.dataset.action;
      if (action === "descargar") descargarObra(idx);
      if (action === "editar") abrirEstudio(idx);
      if (action === "borrar") borrarObra(idx);
    });
  });
}

function verObra(idx) {
  const o = obras[idx];
  if (!o) return;
  const modal = document.createElement("div");
  modal.className = "modal-carta";
  modal.innerHTML = `
    <div class="modal-content" style="max-width:900px;">
      <button class="modal-close">✕</button>
      <h2 style="text-align:center;color:#1a1a1a;margin-bottom:20px;font-weight:400;font-style:italic;font-family:'Playfair Display',serif;">${o.titulo || "Sin título"}</h2>
      <img src="${o.imagen}" style="width:100%;display:block;" />
      <p style="text-align:center;margin-top:20px;color:#999;font-size:.75rem;letter-spacing:1.5px;text-transform:uppercase;">
        ${new Date(o.fecha).toLocaleDateString("es-ES", { day:"numeric", month:"long", year:"numeric" })}
      </p>
    </div>
  `;
  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add("show"));
  const cerrar = () => { modal.classList.remove("show"); setTimeout(() => modal.remove(), 300); };
  modal.querySelector(".modal-close").addEventListener("click", cerrar);
  modal.addEventListener("click", (e) => { if (e.target === modal) cerrar(); });
}

function descargarObra(idx) {
  const o = obras[idx];
  if (!o) return;
  const a = document.createElement("a");
  a.href = o.imagen;
  a.download = `${(o.titulo || "obra").replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function borrarObra(idx) {
  if (!confirm("¿Borrar esta obra para siempre?")) return;
  obras.splice(idx, 1);
  guardarObras();
  renderGaleria();
}

// =========================================
// ESTUDIO
// =========================================
function abrirEstudio(idx = null) {
  editandoIdx = idx;
  document.getElementById("estudioOverlay").classList.add("activo");

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

  // Pintar fondo inicial
  dibujarFondo();

  // Limpiar capa de dibujo
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (idx !== null) {
    titulo.value = obras[idx].titulo || "";
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      guardarHistorial();
    };
    img.src = obras[idx].imagen;
  } else {
    titulo.value = "";
    guardarHistorial();
  }
}

function cerrarEstudio() {
  if (historial.length > 1) {
    if (!confirm("¿Salir sin guardar? Los cambios no guardados se perderán.")) return;
  }
  document.getElementById("estudioOverlay").classList.remove("activo");
}

// =========================================
// FONDO
// =========================================
function dibujarFondo() {
  if (!ctxFondo || !canvasFondo) return;

  ctxFondo.clearRect(0, 0, canvasFondo.width, canvasFondo.height);

  if (fondoImagen && fondoImagen.complete) {
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

// =========================================
// HISTORIAL
// =========================================
function guardarHistorial() {
  if (historial.length > 30) historial.shift();
  historial.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
}

function deshacer() {
  if (historial.length <= 1) return;
  historial.pop();
  const prev = historial[historial.length - 1];
  ctx.putImageData(prev, 0, 0);
}

// =========================================
// DIBUJO
// =========================================
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
  canvas.addEventListener("mousedown", empezarDibujo);
  canvas.addEventListener("mousemove", dibujar);
  canvas.addEventListener("mouseup", terminarDibujo);
  canvas.addEventListener("mouseleave", terminarDibujo);

  canvas.addEventListener("touchstart", empezarDibujo, { passive: false });
  canvas.addEventListener("touchmove", dibujar, { passive: false });
  canvas.addEventListener("touchend", terminarDibujo);
}

// =========================================
// FUSIONAR FONDO + DIBUJO
// =========================================
function fusionarCapas() {
  const temp = document.createElement("canvas");
  temp.width = canvas.width;
  temp.height = canvas.height;
  const tctx = temp.getContext("2d");
  tctx.drawImage(canvasFondo, 0, 0);
  tctx.drawImage(canvas, 0, 0);
  return temp;
}

// =========================================
// SUBIR IMAGEN DE FONDO
// =========================================
async function subirImagenAImgBB(archivo) {
  const formData = new FormData();
  formData.append("image", archivo);
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
    method: "POST", body: formData
  });
  if (!res.ok) throw new Error("Error subiendo a ImgBB");
  const data = await res.json();
  if (!data.success) throw new Error(data.error?.message || "Error de ImgBB");
  return data.data.url;
}

async function subirImagenACloudinary(archivo) {
  const formData = new FormData();
  formData.append("file", archivo);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
  const res = await fetch(url, { method: "POST", body: formData });
  if (!res.ok) throw new Error("Error subiendo a Cloudinary");
  const data = await res.json();
  return data.secure_url;
}

async function subirImagenFondo(archivo) {
  // Intentar primero ImgBB, si falla usar Cloudinary
  try {
    return await subirImagenAImgBB(archivo);
  } catch (e) {
    console.warn("ImgBB falló, usando Cloudinary...", e);
    return await subirImagenACloudinary(archivo);
  }
}

function cargarImagenFondoDesdeURL(url) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    fondoImagen = img;
    fondoImagenURL = url;
    dibujarFondo();
  };
  img.onerror = () => alert("No se pudo cargar la imagen de fondo. Intenta con otra.");
  img.src = url;
}

// =========================================
// GUARDAR OBRA
// =========================================
function guardarObra() {
  const titulo = document.getElementById("tituloObra").value.trim();
  const fusionado = fusionarCapas();
  const imagen = fusionado.toDataURL("image/png");

  if (editandoIdx !== null) {
    obras[editandoIdx].titulo = titulo || "Sin título";
    obras[editandoIdx].imagen = imagen;
    obras[editandoIdx].fecha = Date.now();
  } else {
    obras.unshift({
      titulo: titulo || "Sin título",
      imagen,
      fecha: Date.now()
    });
  }
  guardarObras();
  renderGaleria();
  document.getElementById("estudioOverlay").classList.remove("activo");
  editandoIdx = null;

  if (window.lanzarConfeti) window.lanzarConfeti(1500);
}

// =========================================
// EVENTOS
// =========================================
document.addEventListener("DOMContentLoaded", () => {
  cargarObras();
  renderGaleria();

  document.getElementById("btnNuevaObra").addEventListener("click", () => abrirEstudio(null));
  document.getElementById("cerrarEstudio").addEventListener("click", cerrarEstudio);

  // Herramientas
  document.querySelectorAll(".tool-btn[data-tool]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tool-btn[data-tool]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      herramienta = btn.dataset.tool;
    });
  });

  // Grosor
  document.getElementById("grosor").addEventListener("input", (e) => {
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
  document.getElementById("colorPicker").addEventListener("input", (e) => {
    color = e.target.value;
    document.querySelectorAll(".color-btn").forEach(b => b.classList.remove("active"));
  });

  // FONDO - Color
  document.getElementById("fondoColor").addEventListener("input", (e) => {
    fondoColor = e.target.value;
    fondoImagen = null;
    fondoImagenURL = "";
    dibujarFondo();
  });

  // FONDO - Subir imagen
  const btnSubirFondo = document.getElementById("btnSubirFondo");
  const inputFondo = document.getElementById("inputFondo");
  btnSubirFondo.addEventListener("click", () => inputFondo.click());
  inputFondo.addEventListener("change", async (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;

    // Validaciones
    if (!archivo.type.startsWith("image/")) {
      alert("Solo se permiten imágenes 💜");
      return;
    }
    if (archivo.size > 32 * 1024 * 1024) {
      alert("La imagen es muy grande (máx 32 MB) 💜");
      return;
    }

    btnSubirFondo.textContent = "⏳";
    btnSubirFondo.disabled = true;

    try {
      const url = await subirImagenFondo(archivo);
      cargarImagenFondoDesdeURL(url);
    } catch (err) {
      alert("Error al subir la imagen: " + err.message);
      console.error(err);
    } finally {
      btnSubirFondo.textContent = "🖼️";
      btnSubirFondo.disabled = false;
      inputFondo.value = "";
    }
  });

  // FONDO - Opacidad
  document.getElementById("fondoOpacidad").addEventListener("input", (e) => {
    fondoOpacidad = parseInt(e.target.value, 10);
    document.getElementById("fondoOpacidadValor").textContent = fondoOpacidad;
    dibujarFondo();
  });

  // FONDO - Quitar
  document.getElementById("btnQuitarFondo").addEventListener("click", () => {
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
  document.getElementById("btnDeshacer").addEventListener("click", deshacer);
  document.getElementById("btnLimpiar").addEventListener("click", () => {
    if (confirm("¿Limpiar todo el dibujo? (El fondo se mantiene)")) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      guardarHistorial();
    }
  });
  document.getElementById("btnDescargar").addEventListener("click", () => {
    const a = document.createElement("a");
    const titulo = document.getElementById("tituloObra").value.trim() || "mi-dibujo";
    a.download = `${titulo.replace(/\s+/g, "-").toLowerCase()}.png`;
    a.href = fusionarCapas().toDataURL("image/png");
    a.click();
  });
  document.getElementById("btnGuardar").addEventListener("click", guardarObra);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") cerrarEstudio();
  });
});