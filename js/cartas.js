/* =========================================
   CARTAS - Se desbloquea una cada 48 horas
   ========================================= */

const CARTAS = [
  {
    titulo: "La primera vez que te vi",
    contenido: `Hola mi amor,

Hoy quiero contarte algo que quizá nunca te dije con estas palabras: el día que te vi, algo dentro de mí se movió. No fue dramático ni de película, fue silencioso... como cuando una vela se enciende sin hacer ruido pero empieza a iluminar todo.

No sabía que ibas a ser tú. Ahora lo sé.

Con todo mi corazón,
Yo.`
  },
  {
    titulo: "Lo que pienso cuando no estás",
    contenido: `Mi amor,

Cuando no estás, te pienso en las cosas pequeñas: en la forma en que dices mi nombre, en cómo te ríes antes de terminar la broma, en el silencio cómodo que solo tú sabes crear.

Te pienso, y sonrío sin darme cuenta.

Y eso, para mí, lo es todo.`
  },
  {
    titulo: "Un día difícil y tú",
    contenido: `Amor,

Hoy fue un día largo. Pero pensé en ti y se hizo más corto.

No sé cómo lo haces, pero con solo existir me ordenas el mundo.

Gracias por estar, incluso cuando no estás físicamente.`
  },
  {
    titulo: "Sobre tu risa",
    contenido: `Mi niña,

Tu risa debería ser patrimonio de la humanidad. Lo digo en serio.

Cada vez que te ríes yo pienso: "esto es lo que quiero escuchar el resto de mi vida".

Y luego me la paso buscando formas de hacerte reír otra vez.`
  },
  {
    titulo: "Si algún día dudas",
    contenido: `Si algún día dudas de cuánto te quiero, vuelve a leer esto:

Te quiero en los días buenos y en los malos.
Te quiero cuando estás radiante y cuando estás cansada.
Te quiero en lo simple y en lo complicado.
Te quiero, y eso no cambia.`
  },
  {
    titulo: "Nuestro futuro",
    contenido: `Amor,

A veces me imagino nuestra vida juntos: un lugar pequeño, mucho café, domingos sin prisa, tu mano en la mía.

No necesito nada más grande que eso.

Solo te necesito a ti.`
  },
  {
    titulo: "Gracias",
    contenido: `Gracias por elegirme.
Gracias por quedarte.
Gracias por quererme como soy.
Gracias por existir.

Te amo.`
  }
];

const INTERVALO_HORAS = 48;
const INTERVALO_MS = INTERVALO_HORAS * 60 * 60 * 1000;
const STORAGE_KEY = "cartas_primera_fecha";

function obtenerPrimeraFecha() {
  let fecha = localStorage.getItem(STORAGE_KEY);
  if (!fecha) {
    fecha = Date.now();
    localStorage.setItem(STORAGE_KEY, fecha);
  }
  return parseInt(fecha, 10);
}

function cartasDesbloqueadas() {
  const inicio = obtenerPrimeraFecha();
  const transcurrido = Date.now() - inicio;
  return Math.min(Math.floor(transcurrido / INTERVALO_MS) + 1, CARTAS.length);
}

function renderCartas() {
  const grid = document.getElementById("cartasGrid");
  if (!grid) return;
  const desbloqueadas = cartasDesbloqueadas();

  grid.innerHTML = CARTAS.map((carta, i) => {
    const abierta = i < desbloqueadas;
    return `
      <article class="carta ${abierta ? "abierta" : "bloqueada"} reveal">
        <div class="carta-sello">${abierta ? "💗" : "🔒"}</div>
        <h3>${abierta ? carta.titulo : `Carta #${i + 1}`}</h3>
        <p class="carta-preview">
          ${abierta ? carta.contenido.split("\n")[0].slice(0, 60) + "..." : "Se desbloqueará pronto..."}
        </p>
        <button class="btn ${abierta ? "btn-primary" : "btn-locked"}" ${abierta ? "" : "disabled"} data-index="${i}">
          ${abierta ? "Leer carta" : "Bloqueada"}
        </button>
      </article>
    `;
  }).join("");

  grid.querySelectorAll("button[data-index]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const idx = parseInt(e.target.dataset.index, 10);
      abrirCarta(CARTAS[idx]);
    });
  });
}

function abrirCarta(carta) {
  const modal = document.createElement("div");
  modal.className = "modal-carta";
  modal.innerHTML = `
    <div class="modal-content">
      <button class="modal-close">✕</button>
      <h2>${carta.titulo}</h2>
      <div class="carta-texto">${carta.contenido.replace(/\n/g, "<br>")}</div>
    </div>
  `;
  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add("show"));

  // 🎉 Confeti
  if (window.lanzarConfeti) window.lanzarConfeti(1500);

  modal.querySelector(".modal-close").addEventListener("click", () => {
    modal.classList.remove("show");
    setTimeout(() => modal.remove(), 300);
  });
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.querySelector(".modal-close").click();
  });
}

function actualizarCountdown() {
  const el = document.getElementById("proximaCarta");
  if (!el) return;
  const inicio = obtenerPrimeraFecha();
  const desbloqueadas = cartasDesbloqueadas();

  if (desbloqueadas >= CARTAS.length) {
    el.textContent = "¡Todas desbloqueadas! 💖";
    return;
  }

  const proximaFecha = inicio + desbloqueadas * INTERVALO_MS;
  const diff = proximaFecha - Date.now();

  if (diff <= 0) {
    renderCartas();
    actualizarCountdown();
    return;
  }

  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  el.textContent = `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

document.addEventListener("DOMContentLoaded", () => {
  renderCartas();
  actualizarCountdown();
  setInterval(actualizarCountdown, 1000);
});