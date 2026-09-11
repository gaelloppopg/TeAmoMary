/* =========================================
   AUTENTICACIÓN - Pregunta de seguridad
   Respuesta: 30/03/2026 | Sesión: 1 hora
   ========================================= */

const RESPUESTA_CORRECTA = "30/03/2026";
const STORAGE_AUTH = "auth_novia_ok";
const STORAGE_AUTH_TIME = "auth_novia_time";
const DURACION_SESION_MS = 60 * 60 * 1000; // 1 hora

function normalizarRespuesta(txt) {
  return txt.trim().replace(/[\s\-\.]/g, "/");
}

function yaEstaAutenticada() {
  const ok = localStorage.getItem(STORAGE_AUTH);
  const cuando = parseInt(localStorage.getItem(STORAGE_AUTH_TIME) || "0", 10);
  if (ok !== "true") return false;
  if (Date.now() - cuando > DURACION_SESION_MS) {
    localStorage.removeItem(STORAGE_AUTH);
    localStorage.removeItem(STORAGE_AUTH_TIME);
    return false;
  }
  return true;
}

function marcarAutenticada() {
  localStorage.setItem(STORAGE_AUTH, "true");
  localStorage.setItem(STORAGE_AUTH_TIME, Date.now().toString());
  sessionStorage.setItem("intentar_autoplay", "1");
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("🔐 login.html cargado");

  if (yaEstaAutenticada()) {
    console.log("✅ Ya autenticada, redirigiendo...");
    window.location.replace("index.html");
    return;
  }

  const form = document.getElementById("loginForm");
  const input = document.getElementById("respuestaLogin");
  const error = document.getElementById("loginError");

  if (!form || !input) {
    console.error("❌ No se encontró el formulario");
    return;
  }

  input.addEventListener("input", (e) => {
    let v = e.target.value.replace(/\D/g, "").slice(0, 8);
    if (v.length >= 5) v = v.slice(0, 2) + "/" + v.slice(2, 4) + "/" + v.slice(4);
    else if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2);
    e.target.value = v;
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const resp = normalizarRespuesta(input.value);
    console.log("Respuesta:", resp);

    if (resp === RESPUESTA_CORRECTA) {
      marcarAutenticada();
      error.textContent = "¡Correcto! Bienvenida mi amor 💖";
      error.className = "login-error ok";

      if (window.lanzarConfeti) window.lanzarConfeti(2500);

      setTimeout(() => {
        window.location.href = "index.html";
      }, 1800);
    } else {
      error.textContent = "Mmm... esa no es. Inténtalo otra vez 🥺";
      error.className = "login-error fail";
      input.classList.add("shake");
      setTimeout(() => input.classList.remove("shake"), 500);
      input.select();
    }
  });
});