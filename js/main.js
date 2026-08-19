// ============================================================
// main.js · Orquestación de la aplicación
// ============================================================

import { obtenerDatos, registrarAbono, guardarFechas } from './api.js';
import {
  obtenerUrlScript, guardarUrlScript, hayConexionConfigurada,
  establecerRangoEvento, obtenerRangoEvento
} from './config.js';
import {
  formatearCOP, parsearValorCOP, formatearMilesEnVivo, fechaHoyISO
} from './calculations.js';
import {
  construirFranjaNoches, encenderBrasas, poblarSelectDeudores,
  pintarCalculoVivo, pintarResumen, mostrarToast, conCarga
} from './ui.js';

const $ = (id) => document.getElementById(id);

// ---------------- Estado de la aplicación ----------------
const estado = {
  precioNoche: 24000,   // valor por defecto; se sobreescribe con el de Sheets (RF06)
  deudores: [],
  deudorActual: null,
  toqueNoche: null      // primera noche tocada en la franja (selección por rango)
};

// ---------------- Arranque ----------------
document.addEventListener('DOMContentLoaded', iniciar);

async function iniciar() {
  $('fechaPago').value = fechaHoyISO();
  construirFranjaNoches($('franjaNoches'), manejarToqueNoche);
  conectarEventos();

  if (!hayConexionConfigurada()) {
    abrirModalConfig();
    mostrarToast('Configura la URL del Apps Script para empezar.', 'error');
    return;
  }
  await cargarDatos();
}

async function cargarDatos() {
  try {
    $('selectDeudor').innerHTML = '<option value="">Cargando deudores…</option>';
    const datos = await obtenerDatos();
    estado.precioNoche = Number(datos.precioNoche) || estado.precioNoche;
    estado.deudores = datos.deudores || [];

    // Rango del evento parametrizable (Configuración!B3 y B4)
    establecerRangoEvento(datos.fechaInicioEvento, datos.fechaFinEvento);
    aplicarRangoEvento();

    $('tarifaActual').textContent = formatearCOP(estado.precioNoche);
    const nombreActual = estado.deudorActual?.nombre || '';
    poblarSelectDeudores($('selectDeudor'), estado.deudores, nombreActual);

    if (nombreActual) seleccionarDeudor(nombreActual);
    mostrarToast('Datos sincronizados con Google Sheets. ✅');
  } catch (error) {
    manejarError(error);
  }
}

/** Sincroniza franja de brasas, límites de fechas y subtítulo con el rango vigente. */
function aplicarRangoEvento() {
  const { inicio, fin } = obtenerRangoEvento();
  $('fechaEntrada').min = inicio;
  $('fechaEntrada').max = fin;
  $('fechaSalida').min = inicio;
  $('fechaSalida').max = fin;
  construirFranjaNoches($('franjaNoches'), manejarToqueNoche);

  const sub = document.getElementById('subtituloEvento');
  if (sub) {
    const opciones = { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' };
    const fi = new Date(inicio + 'T12:00:00Z').toLocaleDateString('es-CO', opciones);
    const ff = new Date(fin + 'T12:00:00Z').toLocaleDateString('es-CO', opciones);
    sub.textContent = `Gestor de cartera · ${fi} → ${ff}`;
  }
  refrescarEstadia();
}

// ---------------- Selección de deudor ----------------
function seleccionarDeudor(nombre) {
  estado.deudorActual = estado.deudores.find((d) => d.nombre === nombre) || null;
  estado.toqueNoche = null;

  const hayDeudor = Boolean(estado.deudorActual);
  $('tarjetaEstadia').hidden = !hayDeudor;
  $('tarjetaAbono').hidden = !hayDeudor;

  if (!hayDeudor) {
    pintarResumen(null, estado.precioNoche);
    return;
  }

  const { fechaEntrada = '', fechaSalida = '' } = estado.deudorActual;
  $('fechaEntrada').value = fechaEntrada;
  $('fechaSalida').value = fechaSalida;
  refrescarEstadia();
  pintarResumen(estado.deudorActual, estado.precioNoche);
}

// ---------------- Estadía: franja de brasas + fechas ----------------
function manejarToqueNoche(fechaNoche) {
  if (!estado.deudorActual) return;

  if (estado.toqueNoche === null) {
    // Primer toque: esa noche define entrada y salida (1 noche)
    estado.toqueNoche = fechaNoche;
    $('fechaEntrada').value = fechaNoche;
    $('fechaSalida').value = diaSiguiente(fechaNoche);
  } else {
    // Segundo toque: cierra el rango (en cualquier orden)
    const inicio = estado.toqueNoche <= fechaNoche ? estado.toqueNoche : fechaNoche;
    const fin = estado.toqueNoche <= fechaNoche ? fechaNoche : estado.toqueNoche;
    $('fechaEntrada').value = inicio;
    $('fechaSalida').value = diaSiguiente(fin);
    estado.toqueNoche = null;
  }
  refrescarEstadia();
}

function diaSiguiente(fechaISO) {
  const f = new Date(fechaISO + 'T12:00:00Z');
  f.setUTCDate(f.getUTCDate() + 1);
  return f.toISOString().slice(0, 10);
}

function refrescarEstadia() {
  const entrada = $('fechaEntrada').value;
  const salida = $('fechaSalida').value;
  encenderBrasas($('franjaNoches'), entrada, salida);
  pintarCalculoVivo(entrada, salida, estado.precioNoche);
}

// ---------------- Eventos ----------------
function conectarEventos() {
  $('selectDeudor').addEventListener('change', (e) => seleccionarDeudor(e.target.value));

  $('fechaEntrada').addEventListener('change', () => { estado.toqueNoche = null; refrescarEstadia(); });
  $('fechaSalida').addEventListener('change', () => { estado.toqueNoche = null; refrescarEstadia(); });

  // Separador de miles en vivo (mismo patrón que "Mis Gastos")
  $('valorAbono').addEventListener('input', (e) => {
    e.target.value = formatearMilesEnVivo(e.target.value);
  });

  $('btnGuardarFechas').addEventListener('click',
    conCarga($('btnGuardarFechas'), '⏳ Guardando…', accionGuardarFechas));

  $('btnRegistrarPago').addEventListener('click',
    conCarga($('btnRegistrarPago'), '⏳ Registrando pago…', accionRegistrarPago));

  $('btnRecargar').addEventListener('click', cargarDatos);
  $('btnConfig').addEventListener('click', abrirModalConfig);

  $('btnGuardarConfig').addEventListener('click', (e) => {
    try {
      guardarUrlScript($('inputUrlScript').value);
      mostrarToast('Conexión guardada. Cargando datos…');
      cargarDatos();
    } catch (error) {
      e.preventDefault(); // mantiene el modal abierto si la URL es inválida
      mostrarToast(error.message, 'error');
    }
  });
}

// ---------------- Acciones de escritura (RF02 / RF03 / RF05) ----------------
async function accionGuardarFechas() {
  if (!estado.deudorActual) return;
  const fechaEntrada = $('fechaEntrada').value;
  const fechaSalida = $('fechaSalida').value;

  if (!fechaEntrada || !fechaSalida) {
    mostrarToast('Selecciona la fecha de entrada y de salida.', 'error');
    return;
  }
  if (fechaSalida <= fechaEntrada) {
    mostrarToast('La fecha de salida debe ser posterior a la de entrada.', 'error');
    return;
  }

  try {
    const resultado = await guardarFechas({
      nombre: estado.deudorActual.nombre, fechaEntrada, fechaSalida
    });
    actualizarDeudorLocal(resultado.deudor);
    mostrarToast('Fechas de estadía guardadas en Google Sheets. ✅');
  } catch (error) {
    manejarError(error);
  }
}

async function accionRegistrarPago() {
  if (!estado.deudorActual) return;
  const monto = parsearValorCOP($('valorAbono').value);
  const fechaPago = $('fechaPago').value;

  if (!monto) {
    mostrarToast('Ingresa un valor a abonar válido.', 'error');
    return;
  }
  if (!fechaPago) {
    mostrarToast('Selecciona la fecha de pago.', 'error');
    return;
  }

  try {
    const resultado = await registrarAbono({
      nombre: estado.deudorActual.nombre, fechaPago, monto
    });
    actualizarDeudorLocal(resultado.deudor);
    $('valorAbono').value = '';
    mostrarToast(`Abono de ${formatearCOP(monto)} registrado. ✅`);
  } catch (error) {
    manejarError(error);
  }
}

/** RF04: actualiza el estado local y repinta sin recargar la página. */
function actualizarDeudorLocal(deudorActualizado) {
  if (!deudorActualizado) return;
  const indice = estado.deudores.findIndex((d) => d.nombre === deudorActualizado.nombre);
  if (indice >= 0) estado.deudores[indice] = deudorActualizado;
  estado.deudorActual = deudorActualizado;
  pintarResumen(estado.deudorActual, estado.precioNoche);
  refrescarEstadia();
}

// ---------------- Configuración / errores ----------------
function abrirModalConfig() {
  $('inputUrlScript').value = obtenerUrlScript();
  $('modalConfig').showModal();
}

function manejarError(error) {
  console.error(error);
  if (error.message === 'SIN_CONEXION') {
    abrirModalConfig();
    mostrarToast('Primero configura la URL del Apps Script.', 'error');
    return;
  }
  mostrarToast('⚠️ ' + error.message, 'error');
}
