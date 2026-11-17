/* =========================================================
   AquaPlan · config.js
   Todas las constantes de la demo en un solo lugar.
   Son valores REFERENCIALES para una demo académica:
   se pueden ajustar aquí sin tocar la lógica.
   ========================================================= */
(function (root) {
  const AP = root.AquaPlan = root.AquaPlan || {};

  AP.config = {
    CLAVE_ESTADO: 'aquaplan_state_v1',
    VERSION_ESTADO: 1,

    // Enlace al cuestionario SUS (Google Forms).
    SUS_FORM_URL: 'https://docs.google.com/forms/d/e/1FAIpQLSf1mR5KTwqAXYAXRljEqtBUs8yKpzhCoc4oKzOGj2cKxaiz3g/viewform?usp=header',

    DIAS_MES: 30,

    /* ---------- Consumo por actividad (litros) ---------- */
    consumo: {
      duchaCaudal: { normal: 10, ahorradora: 6, nose: 10 },        // L por minuto
      inodoroDescarga: { antiguo: 13, estandar: 6, doble: 4.5, nose: 6 }, // L por descarga
      botellaAhorro: 1,                                             // L menos por descarga con una botella en el tanque
      canoUsosDia: 4,                                               // manos y dientes, por persona
      canoLitros: { abierto: 7, aveces: 4.5, cerrado: 2 },          // L por uso
      platos: { cano: 50, tina: 18, lavavajillas: 15 },             // L por lavada
      ropa: { lavadoraCompleta: 80, lavadoraMedia: 60, mano: 50 },  // L por lavada
      pisos: 15,                                                    // L por limpieza (balde)
      mascotaDia: 3,                                                // L por mascota al día
      auto: { manguera: 200, balde: 30 },                           // L por lavado
      riego: { manguera: 120, regadera: 10 },                       // L por riego (manguera: 10 min × 12 L)
      fugas: { cano: 25, inodoro: 100 },                            // L al día
      cocinarBeberPersona: 4                                        // L por persona al día
    },

    // Nombres que ve el usuario para cada actividad
    actividades: {
      ducha: 'Ducha',
      inodoro: 'Inodoro',
      cano: 'Manos y dientes',
      platos: 'Lavado de platos',
      ropa: 'Lavado de ropa',
      limpieza: 'Limpieza del hogar',
      auto: 'Lavado de auto',
      riego: 'Riego',
      fugas: 'Fugas',
      cocina: 'Cocinar y beber'
    },

    /* ---------- Referencias ---------- */
    referencia: {
      m3MesLima: 16   // consumo doméstico promedio por hogar en Lima
    },

    /* ---------- Tarifa (Lima y Callao, 2026, categoría doméstica) ---------- */
    tarifa: {
      // Agua potable sin IGV. "hasta" en m³ acumulados.
      tramos: [
        { hasta: 10, precio: 2.20 },
        { hasta: 20, precio: 2.36 },
        { hasta: 50, precio: 4.50 },       // PROVISIONAL: verificar en el portal de SUNASS
        { hasta: Infinity, precio: 8.00 }  // PROVISIONAL: verificar en el portal de SUNASS
      ],
      cargoFijo: 6.32,
      // Calibrado para que 16 m³ al mes den alrededor de S/ 87
      factorAlcantarillado: 0.864,
      igv: 0.18,
      // Aproximación para ciudades fuera de Lima y Callao
      tarifaMedia: 5.00
    },

    ciudades: { lima: 'Lima', callao: 'Callao', otra: 'Otra ciudad' },
    viviendas: { departamento: 'Departamento', casa: 'Casa' },

    /* ---------- Respuestas por defecto del cuestionario ---------- */
    respuestasIniciales: {
      // Hogar
      ciudad: 'lima',
      distrito: '',
      vivienda: 'departamento',
      jardin: 'no',
      adultos: 2,
      ninos: 1,
      mascotas: 0,
      // Ducha
      duchaMin: 10,
      duchasDia: 1,
      duchaTipo: 'normal',
      // Baño
      inodoroTipo: 'estandar',
      descargas: 5,
      cano: 'aveces',
      // Cocina y ropa
      platosMetodo: 'cano',
      platosVeces: 2,
      ropaMetodo: 'lavadora',
      ropaCarga: 'completa',
      ropaVeces: 3,
      // Casa y fugas
      pisosVeces: 3,
      auto: 'no',
      autoVeces: 2,
      riego: 'regadera',
      riegoVeces: 3,
      fugaCano: 'no',
      fugaInodoro: 'no',
      // No se pregunta en el cuestionario: lo activa la acción "botella en el tanque"
      botellaTanque: 'no'
    },

    /* ---------- Catálogo de acciones de ahorro (HU02) ----------
       "habito" es la frase del check-in diario (HU03).
       "cambio" recibe las respuestas y devuelve las que la acción modifica.
       El ahorro NO se escribe aquí: sale de recalcular el consumo con ese
       cambio. Si el cambio no ahorra en un hogar, la acción no se le ofrece. */
    acciones: [
      {
        id: 'ducha_5min', actividad: 'ducha',
        habito: 'Nos duchamos en 5 minutos o menos',
        titulo: 'Duchas de 5 minutos',
        descripcion: 'Pon una canción de 5 minutos: cuando termina, cierras la ducha.',
        dificultad: 'Media', costo: 'Gratis',
        cambio: () => ({ duchaMin: 5 })
      },
      {
        id: 'ducha_ahorradora', actividad: 'ducha',
        habito: 'Usamos la ducha ahorradora',
        titulo: 'Instalar una ducha ahorradora',
        descripcion: 'Un cabezal ahorrador usa casi la mitad de agua por minuto.',
        dificultad: 'Fácil', costo: 'Inversión baja',
        cambio: () => ({ duchaTipo: 'ahorradora' })
      },
      {
        id: 'cerrar_cano', actividad: 'cano',
        habito: 'Cerramos el caño al enjabonarnos y cepillarnos',
        titulo: 'Cerrar el caño al enjabonarse y cepillarse',
        descripcion: 'Abre el caño solo para mojarte y enjuagarte.',
        dificultad: 'Fácil', costo: 'Gratis',
        cambio: () => ({ cano: 'cerrado' })
      },
      {
        id: 'botella_tanque', actividad: 'inodoro',
        habito: 'La botella sigue en el tanque del inodoro',
        titulo: 'Poner una botella en el tanque del inodoro',
        descripcion: 'Una botella llena de 1 litro dentro del tanque ahorra ese litro en cada descarga.',
        dificultad: 'Fácil', costo: 'Gratis',
        cambio: r => (r.inodoroTipo === 'doble' ? {} : { botellaTanque: 'si' })
      },
      {
        id: 'platos_tina', actividad: 'platos',
        habito: 'Lavamos los platos con tina',
        titulo: 'Lavar los platos con tina',
        descripcion: 'Enjabona con el caño cerrado y enjuaga todo junto en una tina.',
        dificultad: 'Fácil', costo: 'Gratis',
        cambio: () => ({ platosMetodo: 'tina' })
      },
      {
        id: 'ropa_cargas', actividad: 'ropa',
        habito: 'No pusimos la lavadora a media carga',
        titulo: 'Juntar ropa para lavar con carga completa',
        descripcion: 'Una lavada menos por semana, con la lavadora llena.',
        dificultad: 'Fácil', costo: 'Gratis',
        cambio: r => (r.ropaMetodo === 'lavadora'
          ? { ropaCarga: 'completa', ropaVeces: Math.max(1, r.ropaVeces - 1) }
          : {})
      },
      {
        id: 'reusar_lavadora', actividad: 'limpieza',
        habito: 'No usamos agua nueva para trapear',
        titulo: 'Reutilizar el agua de la lavadora para los pisos',
        descripcion: 'Junta el agua del último enjuague en un balde y úsala para trapear.',
        dificultad: 'Media', costo: 'Gratis',
        cambio: r => (r.ropaMetodo === 'lavadora' ? { pisosVeces: 0 } : {})
      },
      {
        id: 'auto_balde', actividad: 'auto',
        habito: 'No usamos la manguera para el auto',
        titulo: 'Lavar el auto con balde',
        descripcion: 'Un balde y una esponja en lugar de la manguera.',
        dificultad: 'Fácil', costo: 'Gratis',
        cambio: () => ({ auto: 'balde' })
      },
      {
        id: 'riego_regadera', actividad: 'riego',
        habito: 'No regamos con manguera',
        titulo: 'Regar de noche y con regadera',
        descripcion: 'De noche el agua se evapora menos y la regadera usa solo lo necesario.',
        dificultad: 'Fácil', costo: 'Gratis',
        cambio: () => ({ riego: 'regadera' })
      },
      {
        id: 'reparar_fugas', actividad: 'fugas',
        habito: 'Revisamos que no haya caños ni inodoros goteando',
        titulo: 'Reparar las fugas',
        descripcion: 'Cambiar una empaquetadura o el flotador del tanque suele bastar.',
        dificultad: 'Media', costo: 'Inversión baja',
        cambio: () => ({ fugaCano: 'no', fugaInodoro: 'no' })
      }
    ],

    /* ---------- Hábito (HU03) ---------- */
    habito: {
      accionesIniciales: 2,    // acciones activas la primera semana
      accionesPorSemana: 1,    // cuántas se suman cada semana siguiente
      diasSimulados: 21,       // días que rellena el botón "Simular avance"
      recordatorio: '20:00',   // hora sugerida del recordatorio (simulado)
      litrosBalde: 20,         // equivalencia: un balde
      litrosPersonaDia: 100    // equivalencia: agua de una persona en un día
    },

    // Reto de cada semana: días con todas las acciones activas cumplidas.
    // Desde la última fila en adelante se repite el mismo reto.
    retos: [
      { titulo: 'Arranque con fuerza', dias: 3 },
      { titulo: 'Ritmo constante', dias: 4 },
      { titulo: 'Semana casi perfecta', dias: 5 },
      { titulo: 'Semana completa', dias: 7 }
    ],

    // "cumple" recibe el resumen del hábito (ver calcularHabito)
    insignias: [
      { id: 'primer_paso', titulo: 'Primer paso', descripcion: 'Marca tu primera acción cumplida.', cumple: e => e.checkins >= 1 },
      { id: 'racha_3', titulo: 'Tres al hilo', descripcion: '3 días seguidos con tu plan.', cumple: e => e.mejorRacha >= 3 },
      { id: 'semana_completa', titulo: 'Primera semana completa', descripcion: '7 días seguidos con tu plan.', cumple: e => e.mejorRacha >= 7 },
      { id: 'litros_100', titulo: '100 litros ahorrados', descripcion: 'Ahorra tus primeros 100 litros.', cumple: e => e.impacto.litros >= 100 },
      { id: 'litros_1000', titulo: 'Un metro cúbico', descripcion: 'Ahorra 1,000 litros: 1 m³ menos en tu recibo.', cumple: e => e.impacto.litros >= 1000 },
      { id: 'reto', titulo: 'Reto superado', descripcion: 'Cumple un reto semanal.', cumple: e => e.retosCumplidos >= 1 },
      { id: 'equipo', titulo: 'Trabajo en equipo', descripcion: 'Dos o más integrantes suman puntos.', cumple: e => e.miembrosConPuntos >= 2 },
      { id: 'cazador_fugas', soloCon: 'reparar_fugas', titulo: 'Cazador de fugas', descripcion: 'Mantén tu casa sin fugas.', cumple: e => e.hechas.includes('reparar_fugas') }
    ],

    // Micro-contenido educativo: se muestra uno por día
    tips: [
      'Lima es una de las ciudades más grandes del mundo construidas sobre un desierto: casi no llueve y depende del agua de los ríos Rímac, Chillón y Lurín.',
      'El ODS 6 de las Naciones Unidas busca agua limpia y saneamiento para todas las personas al 2030.',
      'Un caño que gotea puede perder más de 20 litros al día. Revisarlos toma un minuto.',
      'Los hábitos se forman repitiendo: empezar con pocas acciones fáciles ayuda a sostenerlas en el tiempo.',
      'El agua que ahorras en casa queda disponible para otras familias de la ciudad.'
    ]
  };
})(typeof window !== 'undefined' ? window : globalThis);
