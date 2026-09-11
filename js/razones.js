/* =========================================
   RAZONES - Sistema para agregar 1000 razones
   Agrega aquí todas las que quieras 💗
   ========================================= */

const RAZONES = [
  "Por cómo dices mi nombre.",
  "Por tu risa, que ilumina cualquier cuarto.",
  "Porque me escuchas de verdad.",
  "Por tu forma de ver el mundo.",
  "Porque haces que lo simple sea especial.",
  "Por tus abrazos que arreglan todo.",
  "Porque contigo el silencio es cómodo.",
  "Por tu manera de cuidarme sin darte cuenta.",
  "Porque me haces querer ser mejor.",
  "Por tus ojos cuando me miras.",
  "Porque eres mi lugar seguro.",
  "Por la forma en que te emocionas con cosas pequeñas.",
  "Porque incluso en tus días difíciles eliges quedarte.",
  "Por cómo hueles.",
  "Por tus mensajes a cualquier hora.",
  "Porque me entiendes sin explicaciones.",
  "Por tu fortaleza.",
  "Por tu ternura.",
  "Porque contigo todo se siente en casa.",
  "Porque eres, simplemente, tú."

  // ➕ Agrega aquí todas las razones que quieras.
  // Cada string es una razón. Puedes poner hasta 1000.
];

function renderRazones(filtro = "") {
  const grid = document.getElementById("razonesGrid");
  if (!grid) return;

  const filtroLower = filtro.toLowerCase();
  const lista = RAZONES.filter(r => r.toLowerCase().includes(filtroLower));

  grid.innerHTML = lista.map((r, i) => `
    <div class="razon-card reveal">
      <span class="razon-num">#${RAZONES.indexOf(r) + 1}</span>
      <p>${r}</p>
    </div>
  `).join("");

  document.getElementById("contadorRazones").textContent = RAZONES.length;
  observarReveals();
}

function observarReveals() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add("visible");
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll(".reveal:not(.visible)").forEach(el => io.observe(el));
}

document.addEventListener("DOMContentLoaded", () => {
  renderRazones();
  const buscador = document.getElementById("buscadorRazones");
  if (buscador) {
    buscador.addEventListener("input", (e) => renderRazones(e.target.value));
  }
});