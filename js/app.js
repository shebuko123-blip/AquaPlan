/* =========================================================
   AquaPlan · app.js
   Interfaz de la demo: navegación entre pantallas, controles
   del cuestionario y resultado de la HU01.
   ========================================================= */
(function () {
  'use strict';

  const AP = window.AquaPlan;
  const config = AP.config;
  const calculo = AP.calculo;
  const estado = AP.estado;

  let datos = estado.cargar();

  const PASOS = ['hogar', 'ducha', 'bano', 'cocina', 'casa'];   // cuestionario (HU01)
  const FASE_DE = { resultado: 1, recibo: 2, habito: 3, gracias: 3 };                 // etapa de las demás pantallas

  const $ = (selector, raiz) => (raiz || document).querySelector(selector);
  const $$ = (selector, raiz) => Array.from((raiz || document).querySelectorAll(selector));

  const sinDecimales = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 });
  const unDecimal = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  const guardar = () => estado.guardar(datos);
  const ruta = id => '#/' + id;


  /* =========================================================
     1. NAVEGACIÓN (una sola página, una pantalla por ruta)
     Las rutas son del tipo #/hogar. Como no coinciden con
     ningún id, el navegador no salta de posición al cambiar.
     ========================================================= */
  function mostrarPantalla() {
    // Otros enlaces internos (por ejemplo "Saltar al contenido") no cambian de pantalla
    if (location.hash && !location.hash.startsWith('#/')) return;

    let id = location.hash.slice(2) || 'inicio';
    let actual = document.getElementById(id);
    if (!actual || !actual.classList.contains('screen')) {
      id = 'inicio';
      actual = $('#inicio');
    }

    // Sin resultado todavía no hay recibo que mostrar
    if ((id === 'recibo' || id === 'habito') && !datos.hu01Completo) {
      location.replace(ruta('hogar'));
      return;
    }
    // Sin plan elegido todavía no hay hábito que seguir
    if (id === 'habito' && !datos.plan.length) {
      location.replace(ruta('recibo'));
      return;
    }

    $$('.screen').forEach(p => p.classList.toggle('is-active', p === actual));

    const paso = PASOS.indexOf(id) + 1;
    document.body.dataset.modo = paso ? 'pasos' : 'app';
    if (paso) pintarProgreso(paso);

    if (id === 'resultado') {
      datos.hu01Completo = true;
      pintarResultado();
    }
    if (id === 'recibo') AP.recibo.pintar(datos);
    if (id === 'habito') AP.habito.pintar(datos);

    if (id === 'inicio') {
      pintarInicio();
    } else {
      datos.iniciado = true;
      datos.pantalla = id;
      guardar();
    }

    pintarFases(paso ? 1 : (FASE_DE[id] || 0));

    window.scrollTo(0, 0);
    const titulo = $('h1', actual);
    if (titulo) titulo.focus({ preventScroll: true });
  }

  function pintarProgreso(paso) {
    const total = PASOS.length;
    $('#paso-texto').textContent = `Paso ${paso} de ${total}`;
    $('#paso-porcentaje').textContent = Math.round(paso / total * 100) + '%';
    $('#paso-barra').style.width = (paso / total * 100) + '%';
    $$('.step').forEach(s => {
      const n = Number(s.dataset.step);
      s.classList.toggle('step--active', n === paso);
      s.classList.toggle('step--done', n < paso);
    });
  }

  /* Indicador "1. Calcula · 2. Planifica · 3. Hazlo hábito" */
  function pintarFases(activa) {
    const destinos = {
      1: ruta(datos.hu01Completo ? 'resultado' : (PASOS.includes(datos.pantalla) ? datos.pantalla : 'hogar')),
      2: datos.hu01Completo ? ruta('recibo') : null,
      3: datos.plan.length ? ruta('habito') : null
    };
    $$('.fase').forEach(fase => {
      const n = Number(fase.dataset.fase);
      fase.classList.toggle('is-active', n === activa);
      fase.classList.toggle('is-done', n < activa);
      if (destinos[n]) {
        fase.setAttribute('href', destinos[n]);
        fase.removeAttribute('aria-disabled');
      } else {
        fase.removeAttribute('href');
        fase.setAttribute('aria-disabled', 'true');
      }
      if (n === activa) fase.setAttribute('aria-current', 'step');
      else fase.removeAttribute('aria-current');
    });
  }

  function pintarInicio() {
    $('#inicio-nuevo').hidden = datos.iniciado;
    $('#inicio-continuar').hidden = !datos.iniciado;
    $('#continuar').setAttribute('href', ruta(datos.pantalla));
  }


  /* =========================================================
     2. CONTROLES DEL CUESTIONARIO
     Cada control declara en el HTML qué respuesta modifica:
       data-campo     grupo de opciones (se elige una)
       data-contador  número con botones − y +
       data-si        solo se muestra si otra respuesta coincide
     ========================================================= */
  const ICONO_MENOS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg>';
  const ICONO_MAS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M12 5v14"/></svg>';

  // Los contadores se arman aquí para no repetir su HTML
  function crearContadores() {
    $$('[data-contador]').forEach(c => {
      const campo = c.dataset.contador;
      const etiqueta = c.dataset.etiqueta;
      c.innerHTML = `
        <span class="stepper__label" id="l-${campo}">${etiqueta}</span>
        <div class="stepper__ctrl" role="group" aria-labelledby="l-${campo}">
          <button type="button" class="counter__btn counter__btn--minus" data-delta="-1" aria-label="Menos: ${etiqueta}">${ICONO_MENOS}</button>
          <span class="stepper__value" aria-live="polite"></span>
          <button type="button" class="counter__btn counter__btn--plus" data-delta="1" aria-label="Más: ${etiqueta}">${ICONO_MAS}</button>
        </div>`;
    });
  }

  // "5" → 5, "lima" → "lima"
  const leerValor = texto => (texto !== '' && !isNaN(texto) ? Number(texto) : texto);

  function fijar(campo, valor) {
    datos.respuestas[campo] = valor;
    guardar();
    pintarControles();
  }

  function pintarControles() {
    const r = datos.respuestas;

    $$('[data-campo]').forEach(grupo => {
      $$('[data-valor]', grupo).forEach(opcion => {
        const activa = leerValor(opcion.dataset.valor) === r[grupo.dataset.campo];
        opcion.classList.toggle('is-active', activa);
        opcion.setAttribute('aria-checked', String(activa));
      });
    });

    $$('[data-contador]').forEach(c => {
      const valor = r[c.dataset.contador];
      $('.stepper__value', c).textContent = valor;
      $('[data-delta="-1"]', c).disabled = valor <= Number(c.dataset.min);
      $('[data-delta="1"]', c).disabled = valor >= Number(c.dataset.max);
    });

    // data-si="campo=valor1|valor2"
    $$('[data-si]').forEach(el => {
      const [campo, valores] = el.dataset.si.split('=');
      el.hidden = !valores.split('|').includes(String(r[campo]));
    });
  }

  document.addEventListener('click', evento => {
    const opcion = evento.target.closest('[data-campo] [data-valor]');
    if (opcion) {
      fijar(opcion.closest('[data-campo]').dataset.campo, leerValor(opcion.dataset.valor));
      return;
    }

    const boton = evento.target.closest('[data-delta]');
    if (boton) {
      const c = boton.closest('[data-contador]');
      const nuevo = datos.respuestas[c.dataset.contador] + Number(boton.dataset.delta);
      const limitado = Math.min(Number(c.dataset.max), Math.max(Number(c.dataset.min), nuevo));
      fijar(c.dataset.contador, limitado);
      $('#error-hogar').hidden = true;
      return;
    }

    // "Continuar" del paso 1: no se avanza con datos inválidos
    const validar = evento.target.closest('[data-validar="hogar"]');
    if (validar) {
      const error = validarHogar();
      $('#error-hogar').textContent = error;
      $('#error-hogar').hidden = !error;
      if (error) evento.preventDefault();
    }
  });

  function validarHogar() {
    const r = datos.respuestas;
    if (r.adultos < 1) return 'Indica al menos un adulto en el hogar.';
    if (r.adultos + r.ninos > 20) return 'Revisa el número de personas: el máximo es 20.';
    return '';
  }

  const distrito = $('#distrito');
  distrito.addEventListener('input', () => {
    datos.respuestas.distrito = distrito.value.trim().slice(0, 40);
    guardar();
  });


  /* =========================================================
     3. RESULTADO DE LA HU01
     ========================================================= */
  function pintarResultado() {
    const r = datos.respuestas;
    const consumo = calculo.calcularConsumo(r);
    const referencia = config.referencia.m3MesLima;

    $('[data-res="litrosDia"]').textContent = sinDecimales.format(consumo.litrosDia) + ' L';
    $('[data-res="litrosPersona"]').textContent = sinDecimales.format(consumo.litrosPersona) + ' L';
    $('[data-res="m3Mes"]').textContent = unDecimal.format(consumo.m3Mes) + ' m³';

    const lugar = r.distrito || config.ciudades[r.ciudad];
    $('#res-subtitulo').textContent =
      `${consumo.personas} ${consumo.personas === 1 ? 'persona' : 'personas'} · ${config.viviendas[r.vivienda]} · ${lugar}`;

    // Barras: la mayor ocupa todo el ancho y las demás van en proporción
    const mayor = consumo.actividades[0];
    $('#barras').innerHTML = consumo.actividades.map((a, i) => {
      const esTop = i < 3;
      return `
        <li class="chart__row${esTop ? ' chart__row--top' : ''}">
          <span class="chart__name">${esTop ? `<span class="top-badge">Top ${i + 1}</span>` : ''}${a.nombre}</span>
          <span class="bar"><span class="bar__fill bar__fill--${esTop ? 'top' : 'other'}" style="width:${a.litrosDia / mayor.litrosDia * 100}%">${Math.round(a.porcentaje)}%</span></span>
          <span class="chart__liters">${sinDecimales.format(a.litrosDia)} L</span>
        </li>`;
    }).join('');

    $('#res-insight').textContent =
      `${mayor.nombre} es tu mayor consumo: ${Math.round(mayor.porcentaje)}% del agua de tu hogar.`;
    const top = consumo.actividades.slice(0, 3);
    const sumaTop = Math.round(top.reduce((s, a) => s + a.porcentaje, 0));
    $('#res-top3').textContent =
      `Tus ${top.length} mayores consumos (${top.map(a => a.nombre.toLowerCase()).join(', ')}) suman el ${sumaTop}% del total. Ahí está tu mayor oportunidad de ahorro.`;

    // Comparación con el hogar promedio de Lima
    const maximo = Math.max(consumo.m3Mes, referencia);
    $('#cmp-hogar').style.width = (consumo.m3Mes / maximo * 100) + '%';
    $('#cmp-lima').style.width = (referencia / maximo * 100) + '%';
    $('#cmp-hogar-valor').textContent = unDecimal.format(consumo.m3Mes) + ' m³';
    $('#cmp-lima-valor').textContent = sinDecimales.format(referencia) + ' m³';

    const diferencia = Math.round((consumo.m3Mes - referencia) / referencia * 100);
    let texto;
    if (Math.abs(diferencia) <= 5) texto = 'Tu hogar usa casi lo mismo que un hogar promedio de Lima.';
    else if (diferencia > 0) texto = `Tu hogar usa un ${diferencia}% más que un hogar promedio de Lima. Hay espacio para ahorrar.`;
    else texto = `Tu hogar usa un ${-diferencia}% menos que un hogar promedio de Lima. ¡Buen punto de partida!`;
    $('#cmp-texto').textContent = texto;

    guardar();
  }


  /* =========================================================
     4. REINICIAR Y AVISOS
     ========================================================= */
  function avisar(mensaje) {
    const toast = $('#toast');
    toast.textContent = mensaje;
    toast.hidden = false;
    clearTimeout(avisar.reloj);
    avisar.reloj = setTimeout(() => { toast.hidden = true; }, 2600);
  }
  AP.avisar = avisar;   // lo usan las demás pantallas (recibo.js)

  function reiniciar() {
    datos = estado.reiniciar();
    distrito.value = '';
    pintarControles();
    $('#error-hogar').hidden = true;
  }

  // Deja la demo en blanco para el siguiente participante
  $('#reiniciar-demo').addEventListener('click', () => {
    if (!confirm('¿Reiniciar la demo? Se borrarán todas las respuestas guardadas.')) return;
    reiniciar();
    if (location.hash === ruta('inicio')) mostrarPantalla();
    else location.hash = ruta('inicio');
    avisar('Demo reiniciada');
  });

  $('#empezar-de-nuevo').addEventListener('click', () => {
    reiniciar();
    location.hash = ruta('hogar');
  });


  /* =========================================================
     INICIO
     ========================================================= */
  crearContadores();
  distrito.value = datos.respuestas.distrito;
  pintarControles();
  window.addEventListener('hashchange', mostrarPantalla);
  mostrarPantalla();
})();
