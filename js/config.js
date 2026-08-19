// ============================================================
// config.js · Conexión con Google Apps Script
// La URL se guarda SOLO en localStorage, nunca en el código.
// ============================================================

const CLAVE_URL = 'campamento_url_script';

// Rango oficial del evento (según el DRS)
export const FECHA_INICIO_EVENTO = '2026-12-23';
export const FECHA_FIN_EVENTO = '2027-01-01';

export function obtenerUrlScript() {
  return localStorage.getItem(CLAVE_URL) || '';
}

export function guardarUrlScript(url) {
  const limpia = (url || '').trim();
  if (!limpia.startsWith('https://script.google.com/')) {
    throw new Error('La URL debe ser un Web App de Google Apps Script (https://script.google.com/…/exec).');
  }
  localStorage.setItem(CLAVE_URL, limpia);
}

export function hayConexionConfigurada() {
  return Boolean(obtenerUrlScript());
}
