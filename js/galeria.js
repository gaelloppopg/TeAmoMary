/* Galería - lightbox simple al hacer click en una imagen */
document.addEventListener("DOMContentLoaded", () => {
  const items = document.querySelectorAll(".galeria-item img");
  if (!items.length) return;

  items.forEach(img => {
    img.style.cursor = "pointer";
    img.addEventListener("click", () => abrirLightbox(img.src, img.alt));
  });
});

function abrirLightbox(src, alt) {
  const lb = document.createElement("div");
  lb.className = "modal-carta show";
  lb.innerHTML = `
    <div class="modal-content" style="background:transparent;box-shadow:none;padding:0;max-width:90vw;">
      <button class="modal-close" style="color:#fff;font-size:2rem;top:-40px;right:0;">✕</button>
      <img src="${src}" alt="${alt}" style="max-width:100%;border-radius:16px;display:block;">
    </div>
  `;
  document.body.appendChild(lb);
  const cerrar = () => { lb.remove(); document.removeEventListener("keydown", onKey); };
  const onKey = (e) => { if (e.key === "Escape") cerrar(); };
  lb.addEventListener("click", (e) => { if (e.target === lb || e.target.classList.contains("modal-close")) cerrar(); });
  document.addEventListener("keydown", onKey);
}