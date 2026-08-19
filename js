// ============================================================
// ui.js · Renderizado de la interfaz
// ============================================================

import {
  calcularNoches, calcularTotal, sumarAbonos, calcularSaldo,
  formatearCOP, formatearFechaCorta
} from './calculations.js';
import { FECHA_INICIO_EVENTO, FECHA_FIN_EVENTO } from './config.js';

const $ = (id) => document.getElementById(id);

// ---------- Lista de noches del evento (23 dic … 31 dic + 1 ene = 9 noches) ----------
export function nochesDelEvento() {
  const noches = [];
  const cursor = new Date(FECHA_INICIO_EVENTO + 'T12:00:00Z');
  const fin = new Date(FECHA_FIN_EVENTO + 'T12:00:00Z');
  while (cursor < fin) {
    noches.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return noches; // cada elemento es la FECHA en que inicia esa noche
}

// ---------- Franja de brasas (elemento firma) ----------
export function construirFranjaNoches(contenedor, alTocarNoche) {
  contenedor.innerHTML = '';
  const meses = { 11: 'dic', 0: 'ene' };
  nochesDelEvento().forEach((fechaISO) => {
    const f = new Date(fechaISO + 'T12:00:00Z');
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'brasa';
    boton.dataset.fecha = fechaISO;
    boton.setAttribute('aria-label', `Noche del ${formatearFechaCorta(fechaISO)}`);
    boton.innerHTML = `
      <span class="brasa__punto" aria-hidden="true"></span>
      <span class="brasa__dia">${f.getUTCDate()}</span>
      <span class="brasa__mes">${meses[f.getUTCMonth()] || ''}</span>
    `;
    boton.addEventListener('click', () => alTocarNoche(fechaISO));
    contenedor.appendChild(boton);
  });
}

/** Enciende las brasas comprendidas entre entrada y salida. */
export function encenderBrasas(contenedor, fechaEntrada, fechaSalida) {
  const noches = calcularNoches(fechaEntrada, fechaSalida);
  contenedor.querySelectorAll('.brasa').forEach((brasa) => {
    const fecha = brasa.dataset.fecha;
    const dentro = noches !== null && fecha >= fechaEntrada && fecha < fechaSalida;
    brasa.classList.toggle('brasa--encendida', dentro);
    brasa.setAttribute('aria-pressed', dentro ? 'true' : 'false');
  });
}

// ---------- Selector de deudores ----------
export function poblarSelectDeudores(select, deudores, seleccionado = '') {
  select.innerHTML = '<option value="">Seleccione un deudor…</option>';
  deudores.forEach((d) => {
    const opcion = document.createElement('option');
    opcion.value = d.nombre;
    opcion.textContent = d.nombre;
    if (d.nombre === seleccionado) opcion.selected = true;
    select.appendChild(opcion);
  });
}

// ---------- Cálculo en vivo (noches × tarifa = total) ----------
export function pintarCalculoVivo(fechaEntrada, fechaSalida, precioNoche) {
  const noches = calcularNoches(fechaEntrada, fechaSalida);
  const caja = $('calculoVivo');
  if (noches === null) { caja.hidden = true; return; }
  caja.hidden = false;
  $('nochesCalc').textContent = noches;
  $('tarifaCalc').textContent = formatearCOP(precioNoche);
  $('totalCalc').textContent = formatearCOP(calcularTotal(noches, precioNoche));
}

// ---------- Panel resumen (RF04) ----------
export function pintarResumen(deudor, precioNoche) {
  const panel = $('panelResumen');
  const vacio = $('panelVacio');

  if (!deudor) {
    panel.hidden = true;
    vacio.hidden = false;
    return;
  }
  panel.hidden = false;
  vacio.hidden = true;

  const noches = calcularNoches(deudor.fechaEntrada, deudor.fechaSalida);
  const total = calcularTotal(noches, precioNoche);
  const abonado = sumarAbonos(deudor.historial);
  const saldo = calcularSaldo(total, abonado);

  $('resumenNombre').textContent = deudor.nombre;
  $('resTotal').textContent = formatearCOP(total);
  $('resAbonado').textContent = formatearCOP(abonado);
  $('resSaldo').textContent = formatearCOP(Math.max(saldo, 0));

  const filaSaldo = $('filaSaldo');
  const estado = $('estadoPago');
  const porcentaje = total > 0 ? Math.min((abonado / total) * 100, 100) : 0;
  $('barraProgreso').style.width = porcentaje.toFixed(1) + '%';

  if (total === 0) {
    filaSaldo.classList.remove('pagado');
    estado.textContent = 'Registra las fechas de estadía para calcular el total.';
  } else if (saldo <= 0) {
    filaSaldo.classList.add('pagado');
    estado.textContent = saldo < 0
      ? `✅ Pagado en su totalidad (excedente de ${formatearCOP(Math.abs(saldo))}).`
      : '✅ Pagado en su totalidad.';
  } else {
    filaSaldo.classList.remove('pagado');
    estado.textContent = `⚠️ Abonado el ${porcentaje.toFixed(0)}% del total.`;
  }

  pintarHistorial(deudor.historial);
}

function pintarHistorial(historial) {
  const lista = $('listaHistorial');
  lista.innerHTML = '';
  if (!Array.isArray(historial) || historial.length === 0) {
    lista.innerHTML = '<li class="historial__vacio">Sin abonos registrados todavía.</li>';
    return;
  }
  historial.forEach((abono, i) => {
    const item = document.createElement('li');
    item.innerHTML = `
      <span class="historial__fecha">${i + 1}. ${formatearFechaCorta(abono.fecha)}</span>
      <span class="historial__monto">${formatearCOP(abono.monto)} ✅</span>
    `;
    lista.appendChild(item);
  });
}

// ---------- Toast ----------
let temporizadorToast = null;

export function mostrarToast(mensaje, tipo = 'exito') {
  const toast = $('toast');
  toast.textContent = mensaje;
  toast.className = `toast toast--visible toast--${tipo}`;
  clearTimeout(temporizadorToast);
  temporizadorToast = setTimeout(() => {
    toast.className = 'toast';
  }, 3800);
}

// ---------- Estado de carga en botones ----------
export function conCarga(boton, textoCargando, fn) {
  return async (...args) => {
    const textoOriginal = boton.textContent;
    boton.disabled = true;
    boton.textContent = textoCargando;
    try {
      return await fn(...args);
    } finally {
      boton.disabled = false;
      boton.textContent = textoOriginal;
    }
  };
}
