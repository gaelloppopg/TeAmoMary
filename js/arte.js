/* =========================================
   TALLER DE ARTE
   - Dibujo en canvas con varios pinceles
   - Guardado en localStorage
   - Descarga como PNG
   - Galería estilo lienzos colgados
   ========================================= */

const STORAGE_OBRAS = "obras_arte";
let obras = [];

let canvas, ctx;
let dibujando = false;
let herramienta = "pincel";
let color = "#f28ca6";
let grosor = 8;
let ultimoX = 0, ultimoY = 0;
let historial = [];
let sprayInterval = null;
let editandoIdx = null;

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
// GALERÍA (Lienzos colgados)
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
    <div class="obra-card" data-index="${i}" style="animation-delay: ${i * 0.12}s">
      <div class="obra-marco">
        <img src="${o.imagen}" alt="${o.titulo || 'Obra'}" />
      </div>
      <div class="obra-info">
        <h3>${o.titulo || "Sin título"}</h3>
        <small>${new Date(o.fecha).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}</small>
      </div>
      <div class="obra-acciones">
        <button class="btn-obra" data-action="descargar" data-index="${i}" title="Descargar">⬇️</button>
        <button class="btn-obra" data-action="editar" data-index="${i}" title="Editar">✏️</button>
        <button class="btn-obra" data-action="borrar" data-index="${i}" title="Borrar">🗑️</button>
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
    // Ángulo aleatorio sutil para cada lienzo
  cont.querySelectorAll(".obra-card").forEach(card => {
    const angulo = (Math.random() * 2 - 1).toFixed(2);
    card.style.transform = `rotate(${angulo}deg)`;
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
      <h2 style="text-align:center;color:var(--rosa);margin-bottom:15px;">${o.titulo || "Sin título"}</h2>
      <img src="${o.imagen}" style="width:100%;border-radius:16px;display:block;" />
      <p style="text-align:center;margin-top:15px;color:var(--texto-suave);font-size:.9rem;">
        Creado el ${new Date(o.fecha).toLocaleDateString("es-ES", { day:"numeric", month:"long", year:"numeric" })}
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
  a.download = `dibujo-${(o.titulo || "obra").replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.png`;
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

  canvas = document.getElementById("lienzo");
  ctx = canvas.getContext("2d", { willReadFrequently: true });
  conectarEventosCanvas();
  limpiarLienzo();

  if (idx !== null) {
    titulo.value = obras[idx].titulo || "";
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    img.src = obras[idx].imagen;
  } else {
    titulo.value = "";
  }
  guardarHistorial();
}

function cerrarEstudio() {
  if (historial.length > 1) {
    if (!confirm("¿Salir sin guardar? Los cambios no guardados se perderán.")) return;
  }
  document.getElementById("estudioOverlay").classList.remove("activo");
}

function limpiarLienzo() {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function guardarHistorial() {
  if (historial.length > 30) historial.shift();
  historial.push(canvas.toDataURL());
}

function deshacer() {
  if (historial.length <= 1) return;
  historial.pop();
  const img = new Image();
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  };
  img.src = historial[historial.length - 1];
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
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = grosor * 2;
  } else if (herramienta === "pincel") {
    ctx.lineWidth = grosor;
    ctx.globalAlpha = 0.9;
  } else if (herramienta === "lapiz") {
    ctx.lineWidth = Math.max(1, grosor / 3);
  } else if (herramienta === "neon") {
    ctx.lineWidth = grosor;
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
  } else if (herramienta === "spray") {
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
// GUARDAR OBRA
// =========================================
function guardarObra() {
  const titulo = document.getElementById("tituloObra").value.trim();
  const imagen = canvas.toDataURL("image/png");

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

  document.querySelectorAll(".tool-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tool-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      herramienta = btn.dataset.tool;
    });
  });

  const grosorInput = document.getElementById("grosor");
  grosorInput.addEventListener("input", (e) => {
    grosor = parseInt(e.target.value, 10);
    document.getElementById("grosorValor").textContent = grosor;
  });

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

  document.getElementById("btnDeshacer").addEventListener("click", deshacer);
  document.getElementById("btnLimpiar").addEventListener("click", () => {
    if (confirm("¿Limpiar todo el lienzo?")) {
      limpiarLienzo();
      guardarHistorial();
    }
  });
  document.getElementById("btnDescargar").addEventListener("click", () => {
    const a = document.createElement("a");
    const titulo = document.getElementById("tituloObra").value.trim() || "mi-dibujo";
    a.download = `${titulo.replace(/\s+/g, "-").toLowerCase()}.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
  });
  document.getElementById("btnGuardar").addEventListener("click", guardarObra);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") cerrarEstudio();
  });
});