// Tiny bit of flavor, nothing cringe

document.addEventListener("mousemove", (e) => {
  const glow = document.querySelector(".hero-glow");
  if (!glow) return;

  const x = (e.clientX / window.innerWidth) * 100;
  const y = (e.clientY / window.innerHeight) * 100;

  glow.style.background = `
    radial-gradient(circle at ${x}% ${y}%, rgba(124,255,178,0.18), transparent 40%),
    radial-gradient(circle at ${100 - x}% ${y}%, rgba(106,166,255,0.18), transparent 45%)
  `;
});
