// ============================================================
// calculations.js · Lógica de negocio pura (testeable con Node)
// ============================================================

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/**
 * Noches = Fecha de salida - Fecha de entrada (en días).
 * Retorna null si las fechas son inválidas o salida <= entrada.
 * Usa mediodía UTC para evitar corrimientos por zona horaria.
 */
export function calcularNoches(fechaEntrada, fechaSalida) {
  if (!fechaEntrada || !fechaSalida) return null;
  const entrada = new Date(fechaEntrada + 'T12:00:00Z');
  const salida = new Date(fechaSalida + 'T12:00:00Z');
  if (isNaN(entrada) || isNaN(salida)) return null;
  const noches = Math.round((salida - entrada) / MS_POR_DIA);
  return noches > 0 ? noches : null;
}

/** Total a pagar = noches × tarifa parametrizada. */
export function calcularTotal(noches, precioNoche) {
  if (!noches || noches <= 0 || !precioNoche || precioNoche <= 0) return 0;
  return noches * precioNoche;
}

/** Suma de todos los abonos del historial. */
export function sumarAbonos(historial) {
  if (!Array.isArray(historial)) return 0;
  return historial.reduce((acum, abono) => acum + (Number(abono.monto) || 0), 0);
}

/** Saldo a la fecha = Total a pagar - Total abonos. */
export function calcularSaldo(totalPagar, totalAbonos) {
  return (Number(totalPagar) || 0) - (Number(totalAbonos) || 0);
}

/** Formatea un número como pesos colombianos: $ 24.000 */
export function formatearCOP(valor) {
  const n = Number(valor) || 0;
  return '$ ' + n.toLocaleString('es-CO', { maximumFractionDigits: 0 });
}

/**
 * Convierte texto con separadores de miles ("24.000") a número entero.
 * Retorna null si no es un valor válido positivo.
 */
export function parsearValorCOP(texto) {
  if (!texto) return null;
  const limpio = String(texto).replace(/[^\d]/g, '');
  if (!limpio) return null;
  const n = parseInt(limpio, 10);
  return n > 0 ? n : null;
}

/** Aplica separador de miles mientras se escribe: 24000 -> "24.000" */
export function formatearMilesEnVivo(texto) {
  const limpio = String(texto).replace(/[^\d]/g, '');
  if (!limpio) return '';
  return parseInt(limpio, 10).toLocaleString('es-CO');
}

/** Fecha de hoy en formato YYYY-MM-DD (hora local). */
export function fechaHoyISO() {
  const hoy = new Date();
  const y = hoy.getFullYear();
  const m = String(hoy.getMonth() + 1).padStart(2, '0');
  const d = String(hoy.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Formatea YYYY-MM-DD como "24 dic 2026" para mostrar en pantalla. */
export function formatearFechaCorta(fechaISO) {
  if (!fechaISO) return '—';
  const f = new Date(fechaISO + 'T12:00:00Z');
  if (isNaN(f)) return fechaISO;
  return f.toLocaleDateString('es-CO', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC'
  });
}
