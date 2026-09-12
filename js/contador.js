/* =========================================
   CONTADOR DE TIEMPO JUNTOS
   ⚠️ EDITA esta fecha con la tuya real
   ========================================= */

const FECHA_INICIO = new Date("2026-06-26T18:00:00"); // 👈 CAMBIA ESTO

function actualizarContador() {
  const ahora = new Date();
  const diff = ahora - FECHA_INICIO;
  if (diff < 0) return;

  const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
  const horas = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutos = Math.floor((diff / (1000 * 60)) % 60);
  const segundos = Math.floor((diff / 1000) % 60);

  const d = document.getElementById("dias");
  const h = document.getElementById("horas");
  const m = document.getElementById("minutos");
  const s = document.getElementById("segundos");

  if (d) d.textContent = dias;
  if (h) h.textContent = String(horas).padStart(2, "0");
  if (m) m.textContent = String(minutos).padStart(2, "0");
  if (s) s.textContent = String(segundos).padStart(2, "0");

  const label = document.getElementById("fecha-inicio");
  if (label) {
    label.textContent = FECHA_INICIO.toLocaleDateString("es-ES", {
      day: "numeric", month: "long", year: "numeric"
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  actualizarContador();
  setInterval(actualizarContador, 1000);
});