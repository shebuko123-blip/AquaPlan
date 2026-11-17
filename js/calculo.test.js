/* Comprobación rápida del modelo. Se ejecuta con:  node js/calculo.test.js */
const assert = require('node:assert');
require('./config.js');
require('./calculo.js');

const { config, calculo } = globalThis.AquaPlan;
const base = config.respuestasIniciales;

// Punto de calibración: 16 m³ al mes ≈ S/ 87 en Lima
const recibo16 = calculo.calcularRecibo(16, 'lima');
assert.ok(Math.abs(recibo16.total - 87) < 1, `16 m³ dio S/ ${recibo16.total}`);

// El recibo sube con los m³ y cambia de tramo
assert.ok(calculo.calcularRecibo(25, 'lima').total > calculo.calcularRecibo(20, 'lima').total);

// Las acciones sugeridas ahorran de verdad y van primero las del Top 3
const sugeridas = calculo.sugerirAcciones(base);
assert.ok(sugeridas.length >= 3);
assert.ok(sugeridas.every(a => a.ahorro.solesMes > 0 && a.ahorro.litrosMes > 0));
assert.ok(sugeridas[0].puestoTop > 0);

// Lo que no aplica no se ofrece (el hogar por defecto no tiene auto ni fugas)
assert.ok(!sugeridas.some(a => ['auto_balde', 'reparar_fugas', 'riego_regadera'].includes(a.id)));
const conFugas = calculo.sugerirAcciones(Object.assign({}, base, { fugaInodoro: 'si' }));
assert.ok(conFugas.some(a => a.id === 'reparar_fugas'));

// Dos acciones sobre la ducha no se suman dos veces
const solo = id => calculo.calcularAhorro(base, [id]).litrosMes;
const juntas = calculo.calcularAhorro(base, ['ducha_5min', 'ducha_ahorradora']);
assert.ok(juntas.litrosMes < solo('ducha_5min') + solo('ducha_ahorradora'));
assert.ok(juntas.litrosMes > solo('ducha_5min'));

// Sin acciones no hay ahorro y el recibo es el mismo que el de la HU02
const nada = calculo.calcularAhorro(base, []);
assert.strictEqual(nada.solesMes, 0);
assert.strictEqual(nada.reciboAntes.total, calculo.calcularRecibo(calculo.calcularConsumo(base).m3Mes, 'lima').total);

// Aplicar acciones no modifica las respuestas originales
assert.strictEqual(base.duchaMin, 10);

/* ---------- Hábito (HU03) ---------- */
const plan = ['ducha_5min', 'platos_tina', 'cerrar_cano', 'botella_tanque'];
const vacio = { inicio: '2026-11-16', cumplidos: {}, asignadas: {} };

// Día 1: plan por etapas (2 acciones fáciles activas, la "Media" queda para después)
const dia1 = calculo.calcularHabito(base, plan, vacio, '2026-11-16');
assert.strictEqual(dia1.dia, 1);
assert.strictEqual(dia1.activas.length, 2);
assert.ok(dia1.activas.every(a => a.dificultad === 'Fácil'));
assert.strictEqual(dia1.proximas[dia1.proximas.length - 1].id, 'ducha_5min');
assert.strictEqual(dia1.racha, 0);
assert.strictEqual(dia1.impacto.litros, 0);
assert.ok(dia1.insignias.every(i => !i.ganada));
assert.ok(!dia1.insignias.some(i => i.id === 'cazador_fugas'));

// Un check-in suma racha, litros coherentes con la HU02 e insignia
const id1 = dia1.activas[0].id;
const conUno = calculo.calcularHabito(base, plan,
  Object.assign({}, vacio, { cumplidos: { '2026-11-16': [id1] } }), '2026-11-16');
assert.strictEqual(conUno.racha, 1);
assert.strictEqual(conUno.impacto.litros, Math.round(calculo.calcularAhorro(base, [id1]).litrosMes / 30));
assert.ok(conUno.insignias.find(i => i.id === 'primer_paso').ganada);

// No marcar hoy no corta la racha; saltarse un día completo sí
const ayer = { inicio: '2026-11-14', asignadas: {}, cumplidos: { '2026-11-14': [id1], '2026-11-15': [id1] } };
assert.strictEqual(calculo.calcularHabito(base, plan, ayer, '2026-11-16').racha, 2);
assert.strictEqual(calculo.calcularHabito(base, plan, ayer, '2026-11-17').racha, 0);
assert.strictEqual(calculo.calcularHabito(base, plan, ayer, '2026-11-17').mejorRacha, 2);

// Simular avance: 3 semanas, hoy es el día 22 (semana 4) y aún está por marcar
const sim = calculo.simularAvance(base, plan, '2026-11-16');
const tras = calculo.calcularHabito(base, plan, Object.assign({ asignadas: {} }, sim), '2026-11-16');
assert.strictEqual(tras.dia, 22);
assert.strictEqual(tras.semana, 4);
assert.strictEqual(tras.activas.length, 4);
assert.ok(tras.activas.every(a => !a.hechaHoy));
assert.ok(tras.racha >= 7 && tras.impacto.litros > 100 && tras.impacto.soles > 0);
assert.ok(tras.meta.porcentaje > 0 && tras.meta.porcentaje <= 100);
assert.ok(tras.retosCumplidos >= 1);
// Lo ahorrado en 21 días no puede superar el ahorro del plan completo en ese tiempo
assert.ok(tras.impacto.litros <= tras.meta.litros * 21 / 30);

console.log('Hábito simulado · racha', tras.racha, '· litros', tras.impacto.litros, '· soles', tras.impacto.soles,
  '· meta', tras.meta.porcentaje + '%', '· insignias', tras.insignias.filter(i => i.ganada).map(i => i.id).join(', '));
console.log('OK · 16 m³ =', recibo16.total, '· acciones sugeridas:', sugeridas.map(a => `${a.id} (S/ ${a.ahorro.solesMes})`).join(', '));
