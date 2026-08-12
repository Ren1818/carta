# Carta — Versión básica (sin frameworks)

Este repositorio contiene una versión simplificada y sin herramientas de bundling de la experiencia "Carta". El código está escrito en HTML/CSS/JS básico para que puedas abrir index.html en el navegador sin dependencias.

Cómo ejecutar

- Opción A (recommended): servir con un servidor estático local (recomendado para audio). Desde la carpeta del repo:
  python3 -m http.server 5173
  y luego abrir http://localhost:5173

- Opción B: abrir el archivo index.html directamente en el navegador (file://). Nota: algunas características (audio) pueden requerir servir por HTTP.

Estructura
- index.html — HTML principal
- styles.css — estilos
- app.js — lógica JS en vanilla JS
- /audio — opcional: coloca aquí entre-el-juego-y-la-vida.mp3 para música

Puntos importantes
- No usa Vite, React ni ninguna herramienta de construcción.
- Los recuerdos (mensajes) se muestran en modal y el estado de vistos se guarda en localStorage.
- La ruta y el avión son animados con requestAnimationFrame y un SVG simple.
