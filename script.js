// =========================================================
// AquaPlan · script.js
// Menú responsive adaptado del ejemplo ACME.
// =========================================================

// PASO 1. DOM: localizar los elementos del HTML usando sus identificadores.
const botonMenu = document.querySelector('#boton-menu');
const navegacion = document.querySelector('#navegacion');
const textoMenu = document.querySelector('#texto-menu');
const submenu = document.querySelector('#comunidad');           // <details> "Comunidad"
const enlacesMenu = navegacion.querySelectorAll('a:not(.btn)');  // enlaces de secciones
const cabecera = document.querySelector('.header');

// PASO 2. Usar exactamente el mismo límite que la media query del CSS (900 px).
const pantallaMovil = window.matchMedia('(max-width: 900px)');

// PASO 3. Una función concentra los cambios para abrir o cerrar el menú.
function cambiarMenu(abrir) {
  // En escritorio, la navegación siempre está visible.
  navegacion.hidden = pantallaMovil.matches && !abrir;
  botonMenu.setAttribute('aria-expanded', String(abrir));
  botonMenu.setAttribute('aria-label', abrir ? 'Cerrar menú' : 'Abrir menú');
  textoMenu.textContent = abrir ? 'Cerrar' : 'Menú';

  // Si cerramos el menú principal, cerramos también "Comunidad".
  if (!abrir) {
    submenu.open = false;
  }
}

// Marca como activo el enlace de la sección elegida.
function marcarActivo(enlace) {
  enlacesMenu.forEach(function (item) {
    item.classList.remove('activo');
    item.removeAttribute('aria-current');
  });
  enlace.classList.add('activo');
  enlace.setAttribute('aria-current', 'page');
}

// PASO 4. Evento clic: invertir el estado del botón hamburguesa.
// Un button nativo también produce clic al usar Enter o barra espaciadora.
botonMenu.addEventListener('click', function () {
  const estaAbierto = botonMenu.getAttribute('aria-expanded') === 'true';
  cambiarMenu(!estaAbierto);
});

// PASO 5. Cerrar el menú al seleccionar cualquiera de sus enlaces.
navegacion.addEventListener('click', function (evento) {
  const enlace = evento.target.closest('a');
  if (!enlace) return;

  cambiarMenu(false);

  // Resaltar la opción elegida (el botón "Comenzar" no se marca).
  if (!enlace.classList.contains('btn')) {
    marcarActivo(enlace);
  }

  // Llevar el foco al destino. El enlace conserva su navegación normal.
  const ruta = enlace.getAttribute('href');
  const destino = ruta.startsWith('#') ? document.querySelector(ruta) : null;
  if (destino) {
    destino.focus({ preventScroll: true });
  }
});

// La marca (logo) también regresa al inicio y cierra la navegación.
document.querySelector('.header .marca').addEventListener('click', function () {
  cambiarMenu(false);
  marcarActivo(navegacion.querySelector('a[href="#inicio"]'));
  const inicio = document.querySelector('#inicio');
  if (inicio) inicio.focus({ preventScroll: true });
});

// PASO 6. Escape cierra el menú móvil y devuelve el foco al botón.
document.addEventListener('keydown', function (evento) {
  if (evento.key !== 'Escape') return;

  if (pantallaMovil.matches && !navegacion.hidden) {
    cambiarMenu(false);
    botonMenu.focus();
  } else if (submenu.open) {
    // En escritorio solo se cierra el desplegable "Comunidad".
    submenu.open = false;
    submenu.querySelector('summary').focus();
  }
});

// PASO 7. Clic fuera del encabezado: cerrar menú móvil y submenú.
document.addEventListener('click', function (evento) {
  if (cabecera.contains(evento.target)) return;

  if (pantallaMovil.matches && !navegacion.hidden) {
    cambiarMenu(false);
  } else {
    submenu.open = false;
  }
});

// PASO 8. Evitar estados incorrectos al pasar de celular a escritorio.
function ajustarPantalla() {
  const focoEstabaEnNavegacion = navegacion.contains(document.activeElement);
  const focoEstabaEnBoton = document.activeElement === botonMenu;
  cambiarMenu(false);

  if (pantallaMovil.matches && focoEstabaEnNavegacion) {
    botonMenu.focus();
  } else if (!pantallaMovil.matches && focoEstabaEnBoton) {
    navegacion.querySelector('a').focus();
  }
}
pantallaMovil.addEventListener('change', ajustarPantalla);

// PASO 9. Estado inicial: cerrado en celular y visible en escritorio.
ajustarPantalla();


// PASO 10. Resaltar en el menú la sección que se está viendo al hacer scroll.
const secciones = document.querySelectorAll('main section[id]');
const observador = new IntersectionObserver(function (entradas) {
  entradas.forEach(function (entrada) {
    if (!entrada.isIntersecting) return;
    const enlace = navegacion.querySelector('a[href="#' + entrada.target.id + '"]:not(.btn)');
    if (enlace) marcarActivo(enlace);
  });
}, { rootMargin: '-45% 0px -50% 0px' });
secciones.forEach(function (seccion) { observador.observe(seccion); });

// PASO 11. Formulario de contacto: el sitio es estático (sin servidor),
// así que confirmamos la recepción en la misma página.
const formulario = document.querySelector('#formulario-contacto');
const estadoFormulario = document.querySelector('#formulario-estado');
formulario.addEventListener('submit', function (evento) {
  evento.preventDefault(); // los campos required ya fueron validados por el navegador
  const nombre = formulario.elements.nombre.value.trim().split(' ')[0];
  estadoFormulario.textContent = '¡Gracias, ' + nombre + '! Recibimos tu mensaje y te responderemos pronto.';
  estadoFormulario.hidden = false;
  formulario.reset();
});