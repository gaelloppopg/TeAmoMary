/* =========================================
   CUPONERA - Canjea puntos por cupones + confeti
   ========================================= */

const CUPONES = [
  { id: "c1", titulo: "no se", costo: 10, emoji: "🤗" },
  { id: "c2", titulo: "no se", costo: 20, emoji: "🎬" },
  { id: "c3", titulo: "no se", costo: 30, emoji: "🥐" },
  { id: "c4", titulo: "no se", costo: 50, emoji: "🌹" },
  { id: "c5", titulo: "no se", costo: 40, emoji: "😇" },
  { id: "c6", titulo: "no se", costo: 25, emoji: "💆" },
  { id: "c7", titulo: "no se", costo: 45, emoji: "🍝" },
  { id: "c8", titulo: "no se", costo: 100, emoji: "🎁" }
];

const STORAGE_PUNTOS = "puntos_amor";
const STORAGE_CANJEADOS = "cupones_canjeados";

function getPuntos() {
  return parseInt(localStorage.getItem(STORAGE_PUNTOS) || "0", 10);
}

function setPuntos(p) {
  localStorage.setItem(STORAGE_PUNTOS, p);
  actualizarSaldo();
}

function getCanjeados() {
  try { return JSON.parse(localStorage.getItem(STORAGE_CANJEADOS) || "[]"); }
  catch { return []; }
}

function setCanjeados(lista) {
  localStorage.setItem(STORAGE_CANJEADOS, JSON.stringify(lista));
}

function actualizarSaldo() {
  const el = document.getElementById("saldoPuntos");
  if (el) el.textContent = getPuntos();
}

function renderCupones() {
  const grid = document.getElementById("cuponesGrid");
  if (!grid) return;
  const puntos = getPuntos();
  const canjeados = getCanjeados();

  grid.innerHTML = CUPONES.map(c => {
    const yaCanjeado = canjeados.includes(c.id);
    const alcanza = puntos >= c.costo;
    const disabled = yaCanjeado || !alcanza;
    return `
      <div class="cupon ${yaCanjeado ? "canjeado" : ""} reveal">
        <div class="cupon-emoji">${c.emoji}</div>
        <h3>${c.titulo}</h3>
        <p class="cupon-costo">${c.costo} puntos</p>
        <button class="btn ${yaCanjeado ? "btn-locked" : "btn-primary"}"
                data-id="${c.id}" ${disabled ? "disabled" : ""}>
          ${yaCanjeado ? "✅ Canjeado" : (alcanza ? "Canjear" : "Puntos insuficientes")}
        </button>
      </div>
    `;
  }).join("");

  grid.querySelectorAll("button[data-id]").forEach(btn => {
    btn.addEventListener("click", () => canjear(btn.dataset.id));
  });
}

function canjear(id) {
  const cupon = CUPONES.find(c => c.id === id);
  if (!cupon) return;
  const puntos = getPuntos();
  if (puntos < cupon.costo) return;
  if (getCanjeados().includes(id)) return;

  setPuntos(puntos - cupon.costo);
  const canjeados = getCanjeados();
  canjeados.push(id);
  setCanjeados(canjeados);

  // 🎉 Confeti
  if (window.lanzarConfeti) window.lanzarConfeti(2000);

  mostrarModalCupon(cupon);
  renderCupones();
}

function mostrarModalCupon(cupon) {
  const modal = document.createElement("div");
  modal.className = "modal-cupon";
  modal.innerHTML = `
    <div class="modal-content">
      <button class="modal-close">✕</button>
      <div class="cupon-emoji-grande">${cupon.emoji}</div>
      <h2>¡Canjeado!</h2>
      <p>Has canjeado:</p>
      <h3>${cupon.titulo}</h3>
      <p class="cupon-nota">Muéstrale esta pantalla a tu persona especial para reclamarlo 💗</p>
    </div>
  `;
  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add("show"));
  modal.querySelector(".modal-close").addEventListener("click", () => {
    modal.classList.remove("show");
    setTimeout(() => modal.remove(), 300);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  actualizarSaldo();
  renderCupones();
});