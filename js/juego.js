/* =========================================
   JUEGO - Trivia con puntos + confeti
   ========================================= */

const PREGUNTAS = [
  {
    pregunta: "¿Cuál es mi comida favorita?",
    opciones: ["Pizza", "Sushi", "Tacos", "Pasta"],
    correcta: 0,
    puntos: 10
  },
  {
    pregunta: "¿Qué color me recuerda a ti?",
    opciones: ["Azul", "Rosa", "Verde", "Amarillo"],
    correcta: 1,
    puntos: 10
  },
  {
    pregunta: "¿Cuál es mi película favorita?",
    opciones: ["Titanic", "Interstellar", "El Diario de Noah", "Otra"],
    correcta: 2,
    puntos: 15
  },
  {
    pregunta: "¿Dónde fue nuestra primera cita?",
    opciones: ["Cine", "Parque", "Café", "Restaurante"],
    correcta: 2,
    puntos: 20
  },
  {
    pregunta: "¿Qué es lo primero que noté de ti?",
    opciones: ["Tu sonrisa", "Tus ojos", "Tu voz", "Tu forma de ser"],
    correcta: 0,
    puntos: 15
  }
];

const STORAGE_PUNTOS = "puntos_amor";
const STORAGE_PROGRESO = "juego_progreso";

let estado = {
  indice: 0,
  puntos: 0,
  racha: 0,
  respondidas: [],
  finalizado: false
};

function cargarProgreso() {
  const guardado = localStorage.getItem(STORAGE_PROGRESO);
  if (guardado) {
    try { estado = { ...estado, ...JSON.parse(guardado) }; } catch (e) {}
  }
  const puntosGlobales = parseInt(localStorage.getItem(STORAGE_PUNTOS) || "0", 10);
  document.getElementById("puntosJuego").textContent = puntosGlobales;
  document.getElementById("racha").textContent = estado.racha;
  document.getElementById("totalPreguntas").textContent = PREGUNTAS.length;
}

function guardarProgreso() {
  localStorage.setItem(STORAGE_PROGRESO, JSON.stringify(estado));
}

function sumarPuntos(cantidad) {
  const actuales = parseInt(localStorage.getItem(STORAGE_PUNTOS) || "0", 10);
  const nuevos = actuales + cantidad;
  localStorage.setItem(STORAGE_PUNTOS, nuevos);
  document.getElementById("puntosJuego").textContent = nuevos;
  return nuevos;
}

function renderPregunta() {
  const cont = document.getElementById("preguntaContenido");
  document.getElementById("numPregunta").textContent = estado.indice + 1;

  if (estado.indice >= PREGUNTAS.length) {
    cont.innerHTML = `
      <div class="juego-final">
        <h2>🎉 ¡Terminaste!</h2>
        <p>Respondiste correctamente <strong>${estado.respondidas.filter(r => r).length}</strong> de ${PREGUNTAS.length}</p>
        <p>Puntos totales: <strong>${localStorage.getItem(STORAGE_PUNTOS)}</strong> 💗</p>
        <a href="cuponera.html" class="btn btn-primary">Ir a canjear 🎟️</a>
      </div>
    `;
    if (window.lanzarConfeti) window.lanzarConfeti(2500);
    return;
  }

  const p = PREGUNTAS[estado.indice];
  cont.innerHTML = `
    <h2 class="pregunta-texto">${p.pregunta}</h2>
    <div class="opciones-grid">
      ${p.opciones.map((op, i) => `
        <button class="opcion-btn" data-index="${i}">${op}</button>
      `).join("")}
    </div>
    <div class="feedback" id="feedback"></div>
  `;

  cont.querySelectorAll(".opcion-btn").forEach(btn => {
    btn.addEventListener("click", () => responder(parseInt(btn.dataset.index, 10)));
  });
}

function responder(indiceElegido) {
  const p = PREGUNTAS[estado.indice];
  const feedback = document.getElementById("feedback");
  const botones = document.querySelectorAll(".opcion-btn");
  botones.forEach(b => b.disabled = true);

  const correcto = indiceElegido === p.correcta;

  botones[p.correcta].classList.add("correcta");
  if (!correcto) botones[indiceElegido].classList.add("incorrecta");

  if (correcto) {
    estado.racha += 1;
    const bonus = estado.racha >= 3 ? 5 : 0;
    sumarPuntos(p.puntos + bonus);
    feedback.innerHTML = `✅ ¡Correcto! +${p.puntos + bonus} puntos ${bonus ? "(bonus racha 🔥)" : ""}`;
    feedback.className = "feedback ok";

    // 🎉 Confeti
    if (window.lanzarConfeti) window.lanzarConfeti(1200);
  } else {
    estado.racha = 0;
    feedback.innerHTML = `❌ Ups... la respuesta correcta era "<strong>${p.opciones[p.correcta]}</strong>"`;
    feedback.className = "feedback fail";
  }

  estado.respondidas.push(correcto);
  document.getElementById("racha").textContent = estado.racha;
  guardarProgreso();

  setTimeout(() => {
    estado.indice += 1;
    guardarProgreso();
    renderPregunta();
  }, 1800);
}

function reiniciar() {
  estado = { indice: 0, puntos: 0, racha: 0, respondidas: [], finalizado: false };
  guardarProgreso();
  document.getElementById("racha").textContent = 0;
  renderPregunta();
}

document.addEventListener("DOMContentLoaded", () => {
  cargarProgreso();
  renderPregunta();
  const btnReiniciar = document.getElementById("reiniciarJuego");
  if (btnReiniciar) {
    btnReiniciar.addEventListener("click", () => {
      if (confirm("¿Seguro que quieres reiniciar el juego? (No borra tus puntos ganados)")) {
        reiniciar();
      }
    });
  }
});