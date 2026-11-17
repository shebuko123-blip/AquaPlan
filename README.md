# AquaPlan

Calculadora de huella hídrica para hogares peruanos (ODS 6): entiende tu recibo de agua, ahorra con un plan hecho para tu familia y vuélvelo un hábito.

Sitio 100% estático (HTML, CSS y JS sin frameworks ni build). Los datos del usuario se guardan solo en su navegador (`localStorage`).

## Estructura

| Archivo | Qué es |
|---|---|
| `index.html`, `styles.css`, `script.js` | Landing |
| `solucion.html`, `solucion.css` | Demo (las 3 historias de usuario) |
| `js/config.js` | Todas las constantes: consumos, tarifas, acciones y `SUS_FORM_URL` |
| `js/calculo.js` | Lógica de cálculo (funciones puras) |
| `js/estado.js`, `js/recibo.js`, `js/habito.js`, `js/app.js` | Estado y pantallas de la demo |

## Probar en local

Abre `index.html` en el navegador. Para correr las pruebas del cálculo:

```
node js/calculo.test.js
```

## Cuestionario SUS

El botón "Responder la encuesta" de la pantalla final usa `SUS_FORM_URL` en `js/config.js`. Si está vacío, el botón se oculta.

## Despliegue en GitHub Pages

1. Sube los cambios a la rama `main`: `git add -A && git commit -m "mensaje" && git push`.
2. En GitHub: **Settings → Pages → Source: Deploy from a branch → `main` / `(root)` → Save**.
3. En 1 o 2 minutos el sitio queda en `https://<usuario>.github.io/<repositorio>/`.

Cada `git push` a `main` vuelve a publicar el sitio.

> Los montos y consumos son estimaciones referenciales para una demo académica.
