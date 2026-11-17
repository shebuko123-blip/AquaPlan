/* =========================================================
   AquaPlan · estado.js
   Guarda y recupera el avance en localStorage.
   Un único objeto con versión: aquaplan_state_v1.
   ========================================================= */
(function (root) {
  const AP = root.AquaPlan = root.AquaPlan || {};

  function estadoInicial() {
    return {
      version: AP.config.VERSION_ESTADO,
      iniciado: false,        // ¿ya empezó el cuestionario?
      pantalla: 'hogar',      // última pantalla visitada
      hu01Completo: false,    // ¿ya vio su resultado?
      plan: [],               // ids de las acciones de ahorro elegidas (HU02)
      pagoReal: '',           // monto de su último recibo, si lo quiso indicar
      habito: {               // seguimiento del plan (HU03)
        inicio: '',           // día en que empezó, "AAAA-MM-DD"
        cumplidos: {},        // { "AAAA-MM-DD": [ids de acciones cumplidas ese día] }
        asignadas: {},        // { idAccion: idIntegrante }
        apodos: {},           // { idIntegrante: "Mamá" }
        recibos: [],          // [{ fecha, monto }] recibos reales registrados
        recordatorioActivo: true,
        recordatorio: AP.config.habito.recordatorio
      },
      respuestas: Object.assign({}, AP.config.respuestasIniciales)
    };
  }

  function cargar() {
    const base = estadoInicial();
    try {
      const guardado = JSON.parse(localStorage.getItem(AP.config.CLAVE_ESTADO));
      if (!guardado || guardado.version !== AP.config.VERSION_ESTADO) return base;
      // Se mezclan con los valores por defecto por si falta algún campo
      guardado.respuestas = Object.assign(base.respuestas, guardado.respuestas);
      return Object.assign(base, guardado);
    } catch (error) {
      return base; // almacenamiento bloqueado o datos dañados: se empieza de cero
    }
  }

  function guardar(datos) {
    try {
      localStorage.setItem(AP.config.CLAVE_ESTADO, JSON.stringify(datos));
    } catch (error) {
      /* Sin almacenamiento la demo sigue funcionando, solo no recuerda el avance */
    }
  }

  function reiniciar() {
    try {
      localStorage.removeItem(AP.config.CLAVE_ESTADO);
    } catch (error) { /* nada que borrar */ }
    return estadoInicial();
  }

  AP.estado = { cargar, guardar, reiniciar };
})(typeof window !== 'undefined' ? window : globalThis);
