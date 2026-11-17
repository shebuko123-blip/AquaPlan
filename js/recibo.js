/* =========================================================
   AquaPlan · recibo.js
   Interfaz de la HU02: recibo simulado, plan de ahorro y
   recibo proyectado. Los números salen de calculo.js.
   ========================================================= */
(function () {
  'use strict';

  const AP = window.AquaPlan;
  const config = AP.config;
  const calculo = AP.calculo;

  const $ = selector => document.querySelector(selector);
  const soles = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });
  const sinDecimales = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 });
  const unDecimal = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const m3 = n => unDecimal.format(n) + ' m³';

  let datos;            // estado de la demo; lo entrega app.js cada vez que se muestra la pantalla
  let sugeridas = [];   // acciones que aplican a este hogar
  let totalRecibo = 0;

  const guardar = () => AP.estado.guardar(datos);

  function pintar(estadoActual) {
    datos = estadoActual;
    const r = datos.respuestas;
    const consumo = calculo.calcularConsumo(r);
    const recibo = calculo.calcularRecibo(consumo.m3Mes, r.ciudad);
    totalRecibo = recibo.total;

    pintarRecibo(recibo);

    $('#pago-real').value = datos.pagoReal;
    pintarComparacion();

    // Si cambió sus respuestas, se descartan las acciones que ya no aplican
    sugeridas = calculo.sugerirAcciones(r);
    datos.plan = datos.plan.filter(id => sugeridas.some(a => a.id === id));
    guardar();

    pintarAcciones();
    pintarProyeccion();
  }

  /* ---------- Recibo simulado ---------- */
  function pintarRecibo(recibo) {
    const t = config.tarifa;
    const lineas = recibo.modo === 'tramos'
      ? [
          ['Agua potable', recibo.agua],
          ['Alcantarillado', recibo.alcantarillado],
          ['Cargo fijo', recibo.cargoFijo],
          [`IGV (${Math.round(t.igv * 100)}%)`, recibo.igv]
        ]
      : [
          [`Agua y alcantarillado (${soles.format(t.tarifaMedia)} por m³)`, recibo.total - recibo.cargoFijo],
          ['Cargo fijo', recibo.cargoFijo]
        ];

    $('#recibo-m3').textContent = m3(recibo.m3);
    $('#recibo-lineas').innerHTML = lineas
      .map(([nombre, monto]) => `<div class="recibo__linea"><dt>${nombre}</dt><dd>${soles.format(monto)}</dd></div>`)
      .join('');
    $('#recibo-total').textContent = soles.format(recibo.total);
    $('#recibo-nota').textContent = recibo.modo === 'tramos'
      ? 'Calculado con tarifas domésticas de referencia para Lima y Callao (2026). Tu recibo real puede incluir otros cargos.'
      : 'Estimación basada en tarifas de Lima: usamos una tarifa media como aproximación para tu ciudad.';
  }

  /* ---------- Comparación con el último recibo (opcional) ---------- */
  function pintarComparacion() {
    const texto = $('#pago-real').value.trim();
    const pago = Number(texto.replace(',', '.'));
    const valido = pago > 0 && pago <= 5000;
    const error = $('#pago-error');
    const salida = $('#pago-comparacion');

    error.hidden = texto === '' || valido;
    salida.hidden = !valido;
    if (!valido) return;

    const diferencia = pago - totalRecibo;
    if (Math.abs(diferencia) <= totalRecibo * 0.1) {
      salida.textContent = `Tu recibo y nuestra estimación (${soles.format(totalRecibo)}) son muy parecidos. ¡Buena señal!`;
    } else if (diferencia > 0) {
      salida.textContent = `Pagaste ${soles.format(diferencia)} más que la estimación. Puede deberse a una fuga que no has notado, a otros cargos del recibo o a usos que no preguntamos.`;
    } else {
      salida.textContent = `Pagaste ${soles.format(-diferencia)} menos que la estimación. Es normal: calculamos con promedios y tu hogar puede usar menos agua.`;
    }
  }

  /* ---------- Acciones sugeridas ---------- */
  function pintarAcciones() {
    if (!sugeridas.length) {
      $('#acciones').innerHTML = '<li class="card plan-vacio">Tu hogar ya cuida muy bien el agua: con tus respuestas no encontramos acciones que bajen tu recibo.</li>';
      return;
    }
    $('#acciones').innerHTML = sugeridas.map(a => {
      const actividad = config.actividades[a.actividad];
      const etiqueta = a.puestoTop
        ? `<span class="badge badge--high">Tu consumo n.º ${a.puestoTop} · ${actividad}</span>`
        : `<span class="badge">${actividad}</span>`;
      return `
        <li>
          <label class="action action--plan">
            <input type="checkbox" value="${a.id}"${datos.plan.includes(a.id) ? ' checked' : ''}>
            <span class="checkbox" aria-hidden="true"></span>
            <span class="action__info">
              <span class="action__title">${a.titulo}</span>
              <span class="action__desc">${a.descripcion}</span>
              <span class="action__tags">
                ${etiqueta}
                <span>${a.dificultad}</span>
                <span>${a.costo}</span>
                <span>${sinDecimales.format(a.ahorro.litrosMes)} L (${m3(a.ahorro.m3Mes)}) menos al mes</span>
              </span>
            </span>
            <span class="action__saving">${soles.format(a.ahorro.solesMes)} <small>al mes</small></span>
          </label>
        </li>`;
    }).join('');
  }

  /* ---------- Recibo proyectado con el plan elegido ---------- */
  function pintarProyeccion() {
    const p = calculo.calcularAhorro(datos.respuestas, datos.plan);
    const elegidas = sugeridas.filter(a => datos.plan.includes(a.id));
    const n = elegidas.length;

    $('#proy-hoy').textContent = soles.format(p.reciboAntes.total);
    $('#proy-hoy-m3').textContent = m3(p.reciboAntes.m3);
    $('#proy-plan').textContent = soles.format(p.reciboDespues.total);
    $('#proy-plan-m3').textContent = m3(p.reciboDespues.m3);
    $('#proy-ahorro').textContent = soles.format(p.solesMes);
    $('#proy-anual').textContent = n
      ? `${soles.format(p.solesAnio)} al año · ${sinDecimales.format(p.litrosMes)} litros menos cada mes`
      : 'Marca acciones de la lista y verás aquí cuánto baja tu recibo.';
    $('#proy-lista').innerHTML = elegidas
      .map(a => `<li class="plan-list__item"><span class="plan-list__dot"></span>${a.titulo}</li>`)
      .join('');

    $('#plan-resumen').textContent = n
      ? `${n} ${n === 1 ? 'acción elegida' : 'acciones elegidas'} · ahorras ${soles.format(p.solesMes)} al mes`
      : 'Elige al menos una acción para continuar.';
    $('#plan-guardar').disabled = !n;
  }

  /* ---------- Eventos ---------- */
  $('#acciones').addEventListener('change', () => {
    const marcadas = Array.from(document.querySelectorAll('#acciones input:checked')).map(i => i.value);
    datos.plan = marcadas;
    guardar();
    pintarProyeccion();
  });

  $('#pago-real').addEventListener('input', () => {
    pintarComparacion();
    // Solo se guarda un monto válido
    datos.pagoReal = $('#pago-comparacion').hidden ? '' : $('#pago-real').value.trim();
    guardar();
  });

  $('#plan-guardar').addEventListener('click', () => {
    guardar();
    AP.avisar('¡Plan guardado!');
    location.hash = '#/habito';
  });

  AP.recibo = { pintar };
})();
