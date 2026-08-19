// ============================================================
// api.js · Comunicación con Google Sheets vía Apps Script
//
// IMPORTANTE (CORS): los POST se envían con Content-Type
// text/plain para que el navegador NO dispare preflight
// (Apps Script no responde peticiones OPTIONS). El backend
// parsea e.postData.contents como JSON.
// ============================================================

import { obtenerUrlScript } from './config.js';

/** Lee configuración (tarifa) + lista completa de deudores. */
export async function obtenerDatos() {
  const url = obtenerUrlScript();
  if (!url) throw new Error('SIN_CONEXION');

  const respuesta = await fetch(url, { method: 'GET' });
  if (!respuesta.ok) {
    throw new Error(`Error HTTP ${respuesta.status} al leer Google Sheets.`);
  }
  const datos = await respuesta.json();
  if (datos.error) throw new Error(datos.error);
  return datos; // { precioNoche: 24000, deudores: [...] }
}

/** Envía una acción de escritura al Apps Script. */
async function enviarAccion(cuerpo) {
  const url = obtenerUrlScript();
  if (!url) throw new Error('SIN_CONEXION');

  const respuesta = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // evita preflight CORS
    body: JSON.stringify(cuerpo)
  });
  if (!respuesta.ok) {
    throw new Error(`Error HTTP ${respuesta.status} al escribir en Google Sheets.`);
  }
  const datos = await respuesta.json();
  if (datos.error) throw new Error(datos.error);
  return datos;
}

/** RF05: registra un abono para un deudor. */
export function registrarAbono({ nombre, fechaPago, monto }) {
  return enviarAccion({ accion: 'abono', nombre, fechaPago, monto });
}

/** RF02: guarda o actualiza las fechas de estadía de un deudor. */
export function guardarFechas({ nombre, fechaEntrada, fechaSalida }) {
  return enviarAccion({ accion: 'fechas', nombre, fechaEntrada, fechaSalida });
}
