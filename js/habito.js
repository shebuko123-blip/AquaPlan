/* =========================================================
   AquaPlan · habito.js
   Interfaz de la HU03: check-in diario, racha, calendario,
   modo familia, logros, impacto y recibo real.
   Los números salen de calculo.calcularHabito.
   ========================================================= */
(function () {
  'use strict';

  const AP = window.AquaPlan;
  const config = AP.config;
  const calculo = AP.calculo;

  const $ = selector => document.querySelector(selector);
  const $$ = selector => Array.from(document.querySelectorAll(selector));
  const soles = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });
  const sinDecimales = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 });
  const unDecimal = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const fechaCorta = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short' });
  const plural = (n, uno, varios) => `${sinDecimales.format(n)} ${n === 1 ? uno : varios}`;
  // Los apodos los escribe el usuario: se escapan antes de insertarlos como HTML
  const esc = texto => String(texto).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

  let datos;   // estado de la demo; lo entrega app.js al mostrar la pantalla
  let e;       // último resumen calculado

  const hoy = () => calculo.fechaClave(new Date());
  const guardar = () => AP.estado.guardar(datos);

  const miembros = () => calculo.miembrosDelHogar(datos.respuestas)
    .map(m => ({ id: m.id, nombre: datos.habito.apodos[m.id] || m.nombre }));
  const nombreDe = id => (miembros().find(m => m.id === id) || { nombre: 'Toda la familia' }).nombre;

  function pintar(estadoActual) {
    datos = estadoActual;
    if (!datos.habito.inicio) {
      datos.habito.inicio = hoy();   // el plan empieza el día en que se abre esta pantalla
      guardar();
    }
    pintarResumen();
    // Si cambió sus respuestas y ninguna acción del plan aplica ya, vuelve a elegir
    if (!e.acciones.length) {
      location.replace('#/recibo');
      return;
    }
    pintarListas();
  }

  /* ---------- Cifras: se actualizan con cada check-in ---------- */
  function pintarResumen() {
    const h = datos.habito;
    e = calculo.calcularHabito(datos.respuestas, datos.plan, h, hoy());

    $('#hab-subtitulo').textContent = `Semana ${e.semana} · día ${e.dia} de tu plan`;

    const pendientes = e.activas.filter(a => !a.hechaHoy).length;
    const recordatorio = h.recordatorioActivo ? ` Tu recordatorio diario es a las ${h.recordatorio}.` : '';
    $('#hab-aviso').textContent = pendientes
      ? `Hoy te falta marcar ${plural(pendientes, 'acción', 'acciones')}.${recordatorio}`
      : '¡Listo por hoy! Cumplieron todas las acciones del día.';

    // Racha e impacto acumulado
    $('#hab-racha').textContent = plural(e.racha, 'día', 'días');
    $('#hab-racha-nota').textContent = e.mejorRacha > e.racha
      ? `Tu mejor racha: ${plural(e.mejorRacha, 'día', 'días')}`
      : (e.racha ? 'seguidos cumpliendo tu plan' : 'Marca una acción hoy para empezar tu racha');
    $('#hab-litros').textContent = sinDecimales.format(e.impacto.litros) + ' L';
    $('#hab-equivalencia').textContent = e.impacto.litros
      ? `= ${plural(Math.round(e.impacto.litros / config.habito.litrosBalde), 'balde', 'baldes')} · ${plural(Math.round(e.impacto.litros / config.habito.litrosPersonaDia), 'día', 'días')} de agua para una persona`
      : 'Aquí verás el agua que vas ahorrando';
    $('#hab-soles').textContent = soles.format(e.impacto.soles);
    $('#hab-m3').textContent = `${unDecimal.format(e.impacto.m3)} m³ menos en tu recibo`;

    // Meta del mes: el ahorro mensual del plan completo (el mismo de la HU02)
    $('#hab-meta-texto').textContent =
      `Llevas ${sinDecimales.format(e.meta.avance)} de ${sinDecimales.format(e.meta.litros)} litros este mes (${e.meta.porcentaje}%)`;
    $('#hab-meta-barra').style.width = e.meta.porcentaje + '%';

    // Calendario: al menos 4 semanas, con los días que faltan en gris
    const celdas = Math.max(28, Math.ceil(e.dia / 7) * 7);
    const estados = ['sin marcar', 'cumplido en parte', 'todo cumplido'];
    let calendario = '';
    for (let i = 0; i < celdas; i++) {
      const d = e.dias[i];
      calendario += d
        ? `<li class="dia dia--${d.nivel}${d.esHoy ? ' dia--hoy' : ''}" title="Día ${i + 1}${d.esHoy ? ' (hoy)' : ''}: ${estados[d.nivel]}">${i + 1}</li>`
        : `<li class="dia dia--futuro" title="Día ${i + 1}: aún no llega">${i + 1}</li>`;
    }
    $('#hab-calendario').innerHTML = calendario;

    // Reto semanal
    $('#hab-reto-titulo').textContent = `Reto de la semana ${e.semana}: ${e.reto.titulo}`;
    $('#hab-reto-texto').textContent = e.reto.cumplido
      ? '¡Reto superado! Mantén el ritmo hasta el fin de semana.'
      : `Cumple todas tus acciones del día en ${plural(e.reto.dias, 'día', 'días')} de esta semana. Llevas ${e.reto.avance}.`;
    $('#hab-reto-barra').style.width = (e.reto.avance / e.reto.dias * 100) + '%';

    // Insignias
    $('#hab-insignias').innerHTML = e.insignias.map(i => `
      <li class="insignia${i.ganada ? ' is-ganada' : ''}">
        <span class="insignia__icono" aria-hidden="true">${i.ganada ? '★' : '☆'}</span>
        <strong>${i.titulo}</strong>
        <span>${i.descripcion}</span>
        <span class="insignia__estado">${i.ganada ? 'Ganada' : 'Por ganar'}</span>
      </li>`).join('');

    // Ranking familiar: 1 punto por cada acción cumplida
    const filas = miembros().concat({ id: 'todos', nombre: 'Toda la familia' })
      .map(m => ({ nombre: m.nombre, puntos: e.puntos[m.id] || 0 }))
      .sort((a, b) => b.puntos - a.puntos);
    $('#hab-ranking').innerHTML = filas.map((f, i) => `
      <li class="ranking__fila">
        <span class="ranking__puesto">${i + 1}</span>
        <span class="ranking__nombre">${esc(f.nombre)}</span>
        <strong>${plural(f.puntos, 'punto', 'puntos')}</strong>
      </li>`).join('');

    // Recibos reales registrados, comparados con la estimación sin plan
    const base = e.proyeccion.reciboAntes.total;
    $('#hab-recibo-referencia').textContent =
      `Tu estimación sin plan es ${soles.format(base)} y con tu plan completo, ${soles.format(e.proyeccion.reciboDespues.total)}.`;
    $('#hab-recibos').innerHTML = h.recibos.map(r => {
      const diferencia = redondo(base - r.monto);
      const comparacion = diferencia > 0 ? `${soles.format(diferencia)} menos que sin plan`
        : diferencia < 0 ? `${soles.format(-diferencia)} más que sin plan`
        : 'igual que sin plan';
      return `<li class="ranking__fila"><span class="ranking__nombre">${fechaCorta.format(new Date(r.fecha + 'T00:00'))} · ${comparacion}</span><strong>${soles.format(r.monto)}</strong></li>`;
    }).join('');

    $('#hab-rec-activo').checked = h.recordatorioActivo;
    $('#hab-rec-hora').value = h.recordatorio;
    $('#hab-rec-hora').disabled = !h.recordatorioActivo;

    $('#hab-tip').textContent = config.tips[(e.dia - 1) % config.tips.length];
  }
  const redondo = n => Math.round(n * 100) / 100;

  /* ---------- Listas con controles: solo se rearman si cambia el plan o la familia ---------- */
  function pintarListas() {
    const h = datos.habito;

    // Check-in de hoy
    $('#hab-hoy').innerHTML = e.activas.map(a => `
      <li>
        <label class="action action--plan">
          <input type="checkbox" value="${a.id}"${a.hechaHoy ? ' checked' : ''}>
          <span class="checkbox" aria-hidden="true"></span>
          <span class="action__info">
            <span class="action__title">${a.habito}</span>
            <span class="action__tags">
              <span class="badge">${esc(nombreDe(h.asignadas[a.id]))}</span>
              <span>${config.actividades[a.actividad]}</span>
            </span>
          </span>
          <span class="action__saving">+${sinDecimales.format(a.ahorro.litrosMes / config.DIAS_MES)} L <small>hoy</small></span>
        </label>
      </li>`).join('');

    // Plan por etapas: lo que se suma después
    $('#hab-proximas-caja').hidden = !e.proximas.length;
    $('#hab-proximas').innerHTML = e.proximas
      .map(a => `<li><span>${a.titulo}</span><span class="muted">Se suma en la semana ${a.semana}</span></li>`)
      .join('');

    // Modo familia: quién se encarga de cada acción
    const opciones = id => [{ id: '', nombre: 'Toda la familia' }].concat(miembros())
      .map(m => `<option value="${m.id}"${(h.asignadas[id] || '') === m.id ? ' selected' : ''}>${esc(m.nombre)}</option>`)
      .join('');
    $('#hab-asignar').innerHTML = e.acciones.map(a => `
      <li class="asignar">
        <label for="as-${a.id}">${a.titulo}</label>
        <select class="input" id="as-${a.id}" data-accion="${a.id}">${opciones(a.id)}</select>
      </li>`).join('');

    $('#hab-apodos').innerHTML = calculo.miembrosDelHogar(datos.respuestas).map(m => `
      <li class="asignar">
        <label for="ap-${m.id}">${m.nombre}</label>
        <input class="input" id="ap-${m.id}" data-apodo="${m.id}" maxlength="12" autocomplete="off"
               placeholder="Ej.: Mamá" value="${esc(h.apodos[m.id] || '')}">
      </li>`).join('');
  }

  /* ---------- Eventos ---------- */

  // Check-in con un toque
  $('#hab-hoy').addEventListener('change', () => {
    const antes = e.insignias.filter(i => i.ganada).map(i => i.id);
    datos.habito.cumplidos[hoy()] = $$('#hab-hoy input:checked').map(i => i.value);
    guardar();
    pintarResumen();
    const nueva = e.insignias.find(i => i.ganada && !antes.includes(i.id));
    if (nueva) AP.avisar(`¡Nueva insignia: ${nueva.titulo}!`);
  });

  $('#hab-asignar').addEventListener('change', evento => {
    const id = evento.target.dataset.accion;
    if (evento.target.value) datos.habito.asignadas[id] = evento.target.value;
    else delete datos.habito.asignadas[id];
    guardar();
    pintarResumen();
    pintarListas();
    $('#as-' + id).focus();   // la lista se rearmó: se devuelve el foco
  });

  $('#hab-apodos').addEventListener('change', evento => {
    const apodo = evento.target.value.trim();
    if (apodo) datos.habito.apodos[evento.target.dataset.apodo] = apodo;
    else delete datos.habito.apodos[evento.target.dataset.apodo];
    guardar();
    pintarResumen();
    pintarListas();
  });

  // Registro opcional del recibo real
  $('#hab-recibo-form').addEventListener('submit', evento => {
    evento.preventDefault();
    const campo = $('#hab-recibo-monto');
    const monto = Number(campo.value.trim().replace(',', '.'));
    const valido = monto > 0 && monto <= 5000;
    $('#hab-recibo-error').hidden = valido;
    if (!valido) return;
    datos.habito.recibos.push({ fecha: hoy(), monto: redondo(monto) });
    campo.value = '';
    guardar();
    pintarResumen();
    AP.avisar('Recibo registrado');
  });

  // Recordatorio simulado: solo se guarda la preferencia
  function guardarRecordatorio() {
    datos.habito.recordatorioActivo = $('#hab-rec-activo').checked;
    datos.habito.recordatorio = $('#hab-rec-hora').value || config.habito.recordatorio;
    guardar();
    pintarResumen();
    AP.avisar('Recordatorio guardado');
  }
  $('#hab-rec-activo').addEventListener('change', guardarRecordatorio);
  $('#hab-rec-hora').addEventListener('change', guardarRecordatorio);

  // Datos semilla para la demo: 3 semanas de avance, hoy queda por marcar
  $('#hab-simular').addEventListener('click', () => {
    const h = datos.habito;
    Object.assign(h, calculo.simularAvance(datos.respuestas, datos.plan, hoy()));
    // Si nadie tiene acciones asignadas, se reparten para que el ranking tenga vida
    if (!Object.keys(h.asignadas).length) {
      const familia = miembros();
      e.acciones.forEach((a, i) => { h.asignadas[a.id] = familia[i % familia.length].id; });
    }
    guardar();
    pintarResumen();
    pintarListas();
    window.scrollTo(0, 0);
    AP.avisar(`Avance simulado: ${config.habito.diasSimulados} días`);
  });

  // Pantalla de agradecimiento: enlace al cuestionario SUS
  if (config.SUS_FORM_URL) $('#sus-enlace').href = config.SUS_FORM_URL;
  else {
    $('#sus-enlace').hidden = true;
    $('#sus-pendiente').hidden = false;
  }

  AP.habito = { pintar };
})();
