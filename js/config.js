// ============================================================
// config.js · Conexión con Google Apps Script
// La URL se guarda SOLO en localStorage, nunca en el código.
// ============================================================

const CLAVE_URL = 'campamento_url_script';

// ---------- Rango del evento (parametrizable desde Google Sheets) ----------
// Valores por defecto según el DRS; se sobreescriben con Configuración!B3 y B4.
const RANGO_POR_DEFECTO = { inicio: '2026-12-23', fin: '2027-01-01' };
const rangoEvento = { ...RANGO_POR_DEFECTO };

const ES_FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Actualiza el rango con lo leído del Sheets; ignora valores inválidos. */
export function establecerRangoEvento(inicio, fin) {
  if (ES_FECHA_ISO.test(inicio || '') && ES_FECHA_ISO.test(fin || '') && fin > inicio) {
    rangoEvento.inicio = inicio;
    rangoEvento.fin = fin;
  } else {
    rangoEvento.inicio = RANGO_POR_DEFECTO.inicio;
    rangoEvento.fin = RANGO_POR_DEFECTO.fin;
  }
}

export function obtenerRangoEvento() {
  return { ...rangoEvento };
}

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
