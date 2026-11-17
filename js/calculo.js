/* =========================================================
   AquaPlan · calculo.js
   Funciones puras: reciben respuestas y devuelven números.
   No tocan el DOM ni el almacenamiento.
   ========================================================= */
(function (root) {
  const AP = root.AquaPlan = root.AquaPlan || {};

  const redondear = (n, decimales) => {
    const f = Math.pow(10, decimales);
    return Math.round(n * f) / f;
  };

  /* Litros al día de cada actividad según las respuestas (r). */
  function litrosPorActividad(r) {
    const c = AP.config.consumo;
    const personas = r.adultos + r.ninos;

    const ropaLitros = r.ropaMetodo === 'mano'
      ? c.ropa.mano
      : (r.ropaCarga === 'media' ? c.ropa.lavadoraMedia : c.ropa.lavadoraCompleta);

    return {
      ducha: personas * r.duchasDia * r.duchaMin * c.duchaCaudal[r.duchaTipo],
      inodoro: personas * r.descargas *
        (c.inodoroDescarga[r.inodoroTipo] - (r.botellaTanque === 'si' ? c.botellaAhorro : 0)),
      cano: personas * c.canoUsosDia * c.canoLitros[r.cano],
      platos: r.platosVeces * c.platos[r.platosMetodo],
      ropa: (r.ropaVeces / 7) * ropaLitros,
      limpieza: (r.pisosVeces / 7) * c.pisos + r.mascotas * c.mascotaDia,
      auto: r.auto === 'no' ? 0 : (r.autoVeces / 30) * c.auto[r.auto],
      riego: r.jardin === 'si' && r.riego !== 'no' ? (r.riegoVeces / 7) * c.riego[r.riego] : 0,
      fugas: (r.fugaCano === 'si' ? c.fugas.cano : 0) + (r.fugaInodoro === 'si' ? c.fugas.inodoro : 0),
      cocina: personas * c.cocinarBeberPersona
    };
  }

  /* Consumo total del hogar con desglose ordenado de mayor a menor. */
  function calcularConsumo(r) {
    const litros = litrosPorActividad(r);
    const personas = r.adultos + r.ninos;
    const total = Object.values(litros).reduce((s, l) => s + l, 0);

    const actividades = Object.keys(litros)
      .filter(id => litros[id] > 0)
      .map(id => ({
        id,
        nombre: AP.config.actividades[id],
        litrosDia: litros[id],
        porcentaje: total ? (litros[id] / total) * 100 : 0
      }))
      .sort((a, b) => b.litrosDia - a.litrosDia);

    return {
      personas,
      actividades,
      top3: actividades.slice(0, 3).map(a => a.id),
      litrosDia: Math.round(total),
      litrosPersona: Math.round(total / personas),
      // Se redondea a 1 decimal para usar el mismo valor en todas las pantallas
      m3Mes: redondear((total * AP.config.DIAS_MES) / 1000, 1)
    };
  }

  /* Recibo estimado en soles para un volumen mensual (m³). */
  function calcularRecibo(m3, ciudad) {
    const t = AP.config.tarifa;

    // Fuera de Lima y Callao: aproximación con la tarifa media
    if (ciudad === 'otra') {
      return {
        modo: 'media', m3,
        cargoFijo: t.cargoFijo,
        total: redondear(m3 * t.tarifaMedia + t.cargoFijo, 2)
      };
    }

    let agua = 0;
    let desde = 0;
    t.tramos.forEach(tramo => {
      const volumen = Math.max(0, Math.min(m3, tramo.hasta) - desde);
      agua += volumen * tramo.precio;
      desde = tramo.hasta;
    });

    const alcantarillado = agua * t.factorAlcantarillado;
    const subtotal = agua + alcantarillado + t.cargoFijo;
    const igv = subtotal * t.igv;

    return {
      modo: 'tramos', m3,
      agua: redondear(agua, 2),
      alcantarillado: redondear(alcantarillado, 2),
      cargoFijo: t.cargoFijo,
      igv: redondear(igv, 2),
      total: redondear(subtotal + igv, 2)
    };
  }

  /* Respuestas tras aplicar las acciones elegidas, una sobre otra. */
  function aplicarAcciones(r, ids) {
    return AP.config.acciones
      .filter(a => ids.includes(a.id))
      .reduce((actual, a) => Object.assign({}, actual, a.cambio(actual)), r);
  }

  /* Ahorro mensual de un conjunto de acciones: se recalcula todo el modelo,
     así dos acciones sobre la misma actividad no se cuentan dos veces. */
  function calcularAhorro(r, ids) {
    const antes = calcularConsumo(r);
    const despues = calcularConsumo(aplicarAcciones(r, ids));
    const reciboAntes = calcularRecibo(antes.m3Mes, r.ciudad);
    const reciboDespues = calcularRecibo(despues.m3Mes, r.ciudad);
    const solesMes = redondear(reciboAntes.total - reciboDespues.total, 2);

    return {
      reciboAntes,
      reciboDespues,
      litrosMes: (antes.litrosDia - despues.litrosDia) * AP.config.DIAS_MES,
      m3Mes: redondear(antes.m3Mes - despues.m3Mes, 1),
      solesMes,
      solesAnio: redondear(solesMes * 12, 2)
    };
  }

  /* Acciones que sí ahorran en este hogar. Primero las que apuntan a su
     Top 3 de consumo y, dentro de cada grupo, de mayor a menor ahorro. */
  function sugerirAcciones(r) {
    const top3 = calcularConsumo(r).top3;
    return AP.config.acciones
      .map(a => Object.assign({}, a, {
        ahorro: calcularAhorro(r, [a.id]),
        puestoTop: top3.indexOf(a.actividad) + 1   // 0 = fuera del Top 3
      }))
      .filter(a => a.ahorro.m3Mes >= 0.1)
      .sort((a, b) => (b.puestoTop > 0) - (a.puestoTop > 0) || b.ahorro.solesMes - a.ahorro.solesMes);
  }


  /* =========================================================
     HÁBITO (HU03)
     Las fechas son claves locales "AAAA-MM-DD". "hoy" siempre
     llega como parámetro para que las funciones sigan siendo puras.
     ========================================================= */
  const aFecha = clave => { const [a, m, d] = clave.split('-').map(Number); return new Date(a, m - 1, d); };
  const fechaClave = f =>
    `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
  const sumarDias = (clave, n) => { const f = aFecha(clave); f.setDate(f.getDate() + n); return fechaClave(f); };
  const diasEntre = (desde, hasta) => Math.round((aFecha(hasta) - aFecha(desde)) / 86400000);

  /* Integrantes del hogar, sin nombres reales. */
  function miembrosDelHogar(r) {
    const lista = [];
    for (let i = 1; i <= r.adultos; i++) lista.push({ id: 'a' + i, nombre: 'Adulto ' + i });
    for (let i = 1; i <= r.ninos; i++) lista.push({ id: 'n' + i, nombre: 'Niño o niña ' + i });
    return lista;
  }

  /* Acciones del plan en el orden en que se activan: primero las fáciles. */
  function ordenarPlan(r, plan) {
    return sugerirAcciones(r)
      .filter(a => plan.includes(a.id))
      .sort((a, b) => (a.dificultad !== 'Fácil') - (b.dificultad !== 'Fácil'));
  }

  // Cuántas acciones están activas en una semana del plan (plan por etapas)
  const activasEnSemana = semana =>
    AP.config.habito.accionesIniciales + (semana - 1) * AP.config.habito.accionesPorSemana;

  /* Resumen completo del hábito al día de hoy: etapas, racha, calendario,
     impacto acumulado, reto semanal, puntos por integrante e insignias. */
  function calcularHabito(r, plan, habito, hoy) {
    const h = AP.config.habito;
    const dias30 = AP.config.DIAS_MES;
    const acciones = ordenarPlan(r, plan);
    const ids = acciones.map(a => a.id);
    const semanaDe = fecha => Math.floor(diasEntre(habito.inicio, fecha) / 7) + 1;
    const dia = diasEntre(habito.inicio, hoy) + 1;   // el día 1 es el de inicio
    const semana = semanaDe(hoy);

    const dias = [];
    const puntos = {};
    const completos = {};          // días con todo cumplido, por semana
    const hechas = new Set();
    const memo = {};
    let corrida = 0, mejorRacha = 0, checkins = 0;
    let litros = 0, soles = 0, litrosMes = 0;

    for (let i = 0; i < dia; i++) {
      const fecha = sumarDias(habito.inicio, i);
      const activas = ids.slice(0, activasEnSemana(semanaDe(fecha)));
      const delDia = (habito.cumplidos[fecha] || []).filter(id => ids.includes(id));
      const nivel = !delDia.length ? 0 : (delDia.length >= activas.length ? 2 : 1);
      dias.push({ fecha, nivel, esHoy: fecha === hoy });

      // Un día sin marcar corta la racha, salvo hoy: todavía hay tiempo
      if (nivel) corrida++;
      else if (fecha !== hoy) corrida = 0;
      mejorRacha = Math.max(mejorRacha, corrida);
      if (nivel === 2) completos[semanaDe(fecha)] = (completos[semanaDe(fecha)] || 0) + 1;

      delDia.forEach(id => {
        checkins++;
        hechas.add(id);
        const quien = habito.asignadas[id] || 'todos';
        puntos[quien] = (puntos[quien] || 0) + 1;
      });

      // Ahorro del día: el mismo modelo de la HU02, repartido entre 30 días
      if (delDia.length) {
        const clave = delDia.slice().sort().join();
        const ahorro = memo[clave] || (memo[clave] = calcularAhorro(r, delDia));
        litros += ahorro.litrosMes / dias30;
        soles += ahorro.solesMes / dias30;
        if (dia - i <= dias30) litrosMes += ahorro.litrosMes / dias30;
      }
    }

    const retos = AP.config.retos;
    const retoDe = s => retos[Math.min(s, retos.length) - 1];
    let retosCumplidos = 0;
    for (let s = 1; s <= semana; s++) if ((completos[s] || 0) >= retoDe(s).dias) retosCumplidos++;
    const retoActual = retoDe(semana);
    const avanceReto = Math.min(completos[semana] || 0, retoActual.dias);

    const proyeccion = calcularAhorro(r, ids);
    const nActivas = activasEnSemana(semana);
    const deHoy = habito.cumplidos[hoy] || [];

    const e = {
      dia, semana, dias,
      acciones,
      activas: acciones.slice(0, nActivas).map(a => Object.assign({}, a, { hechaHoy: deHoy.includes(a.id) })),
      proximas: acciones.slice(nActivas).map((a, i) => Object.assign({}, a, {
        semana: semana + 1 + Math.floor(i / h.accionesPorSemana)
      })),
      racha: corrida, mejorRacha, checkins,
      hechas: Array.from(hechas),
      impacto: { litros: Math.round(litros), m3: redondear(litros / 1000, 1), soles: redondear(soles, 2) },
      meta: {
        litros: proyeccion.litrosMes,
        avance: Math.round(litrosMes),
        porcentaje: proyeccion.litrosMes ? Math.min(100, Math.round(litrosMes / proyeccion.litrosMes * 100)) : 0
      },
      proyeccion,
      reto: { titulo: retoActual.titulo, dias: retoActual.dias, avance: avanceReto, cumplido: avanceReto >= retoActual.dias },
      retosCumplidos,
      puntos,
      miembrosConPuntos: Object.keys(puntos).filter(id => id !== 'todos').length
    };
    e.insignias = AP.config.insignias
      .filter(i => !i.soloCon || ids.includes(i.soloCon))
      .map(i => Object.assign({}, i, { ganada: i.cumple(e) }));
    return e;
  }

  /* Datos semilla para la demo: rellena los días anteriores a hoy. */
  function simularAvance(r, plan, hoy) {
    const n = AP.config.habito.diasSimulados;
    const ids = ordenarPlan(r, plan).map(a => a.id);
    const inicio = sumarDias(hoy, -n);
    const cumplidos = {};
    for (let d = 0; d < n; d++) {
      const activas = ids.slice(0, activasEnSemana(Math.floor(d / 7) + 1));
      // Algunos olvidos al inicio, como en un hogar real; la última semana va completa
      cumplidos[sumarDias(inicio, d)] = activas.filter((id, i) => d >= n - 7 || (d + i * 2) % 5 !== 4);
    }
    return { inicio, cumplidos };
  }

  AP.calculo = {
    litrosPorActividad, calcularConsumo, calcularRecibo, aplicarAcciones, calcularAhorro, sugerirAcciones,
    fechaClave, miembrosDelHogar, calcularHabito, simularAvance
  };
})(typeof window !== 'undefined' ? window : globalThis);
