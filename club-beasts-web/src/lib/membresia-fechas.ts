/**
 * Calculo de vigencias de membresia (DEC-005 + DEC-006).
 *
 * - DEC-005: los periodos se cuentan en dias calendario completos
 *   (America/Bogota); por eso el calculo se hace sobre los componentes de
 *   calendario de un string `YYYY-MM-DD` y no sobre horas locales.
 * - DEC-006: inicio y fin de vigencia son INCLUSIVOS, por lo tanto un
 *   periodo de N dias cumple `fechaFin = fechaInicio + (N - 1)`.
 *
 * El modulo es puro y no depende de la zona horaria del runtime: la
 * aritmetica usa UTC sobre los componentes de fecha ya parseados.
 */

const MS_POR_DIA = 86_400_000;

function aComponentes(fechaISO: string): [number, number, number] {
  const [y, m, d] = fechaISO.split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    throw new Error(`Fecha ISO invalida: "${fechaISO}" (se esperaba YYYY-MM-DD)`);
  }
  return [y, m, d];
}

/** Dias absolutos desde la epoca UTC para comparar/sumar dias calendario. */
function aDiasUTC(fechaISO: string): number {
  const [y, m, d] = aComponentes(fechaISO);
  return Math.round(Date.UTC(y, m - 1, d) / MS_POR_DIA);
}

function desdeDiasUTC(dias: number): string {
  const date = new Date(dias * MS_POR_DIA);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Fecha final de un preset de N dias con extremos inclusivos (DEC-006):
 * `fechaFin = fechaInicio + N - 1`.
 *
 * @param fechaISO Fecha de inicio `YYYY-MM-DD`.
 * @param dias Duracion en dias calendario (entero >= 1).
 */
export function sumarDiasInclusivos(fechaISO: string, dias: number): string {
  if (!Number.isInteger(dias) || dias < 1) {
    throw new Error(`La duracion debe ser un entero de al menos 1 dia (recibido: ${dias})`);
  }
  return desdeDiasUTC(aDiasUTC(fechaISO) + (dias - 1));
}

/**
 * Dias calendario inclusivos entre inicio y fin (inclusive).
 * Devuelve 0 cuando el rango esta invertido (fin anterior al inicio).
 */
export function diasInclusivos(inicioISO: string, finISO: string): number {
  const diferencia = aDiasUTC(finISO) - aDiasUTC(inicioISO);
  return diferencia < 0 ? 0 : diferencia + 1;
}

/**
 * Resta N dias calendario a una fecha `YYYY-MM-DD`.
 *
 * La usa la UI de congelacion para revertir EN MEMORIA la extension que ya
 * aplico `congelar` antes de validar el rango de una edicion (spec INC-02,
 * "Editar congelacion": `fechaFinRev = fechaFin - N_anterior`, DEC-022 a).
 *
 * @param fechaISO Fecha `YYYY-MM-DD`.
 * @param dias Dias calendario a restar (entero >= 0).
 */
export function restarDiasCalendario(fechaISO: string, dias: number): string {
  if (!Number.isInteger(dias) || dias < 0) {
    throw new Error(`La cantidad de dias debe ser un entero >= 0 (recibido: ${dias})`);
  }
  return desdeDiasUTC(aDiasUTC(fechaISO) - dias);
}

/**
 * Fecha de hoy en `America/Bogota` (DEC-005).
 *
 * America/Bogota es UTC-5 fijo (sin horario de verano), por lo que basta
 * desplazar el instante 5 horas atras y leer los componentes UTC. El calculo
 * NO depende de la zona horaria del runtime (el mismo resultado se obtiene
 * en cualquier maquina), y coincide con `getTodayBogota()` del backend.
 *
 * @param ahora Instante a evaluar; solo para tests (por defecto, ahora).
 */
export function hoyBogotaISO(ahora: Date = new Date()): string {
  const bogota = new Date(ahora.getTime() - 5 * 3_600_000);
  const y = bogota.getUTCFullYear();
  const m = String(bogota.getUTCMonth() + 1).padStart(2, "0");
  const d = String(bogota.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ─── Secuencia de pausa de una vigencia (INC-02 / HU-15 / DEC-024) ──────────

/** Fila de auditoria con datos de pausa (`cambios` del DTO de membresia). */
export interface FilaCambioPausa {
  accion: string;
  version: number;
  congelacionInicio?: string | null;
  congelacionFin?: string | null;
  motivo?: string | null;
}

/** Rango de pausa vigente sobre una vigencia. */
export interface RangoCongelacion {
  fechaInicio: string;
  fechaFin: string;
  motivo?: string | null;
}

const ACCIONES_PAUSA = new Set([
  "CONGELACION",
  "DESCONGELACION",
  "EDICION_CONGELACION",
]);

/**
 * Pausa vigente de una vigencia, con la MISMA regla que el backend
 * (spec INC-02, "Determinacion de congelacion vigente"):
 *
 * 1. se toma la ULTIMA fila de la secuencia de pausa ordenada por `version`
 *    (el orden es deterministo, igual que `@@unique([membresiaId, version])`);
 * 2. esa fila debe ser `CONGELACION` o `EDICION_CONGELACION` (una
 *    `DESCONGELACION` cierra la pausa);
 * 3. regla inclusiva DEC-006: la pausa sigue vigente mientras
 *    `hoy <= fechaFin` (incluye pausas futuras, que se pueden descongelar
 *    devolviendo los N dias completos); `hoy > fechaFin` significa que no hay
 *    pausa operable, igual que el `409 CONGELACION_INEXISTENTE` del backend.
 *
 * Devuelve `null` cuando no hay pausa vigente.
 */
export function pausaVigente(
  cambios: FilaCambioPausa[],
  hoyISO: string
): RangoCongelacion | null {
  const secuencia = cambios
    .filter((cambio) => ACCIONES_PAUSA.has(cambio.accion))
    .sort((a, b) => a.version - b.version);
  const ultima = secuencia[secuencia.length - 1];
  if (!ultima) return null;
  if (ultima.accion !== "CONGELACION" && ultima.accion !== "EDICION_CONGELACION") {
    return null;
  }
  if (!ultima.congelacionInicio || !ultima.congelacionFin) return null;
  if (
    ultima.congelacionFin < ultima.congelacionInicio ||
    hoyISO > ultima.congelacionFin
  ) {
    return null;
  }
  return {
    fechaInicio: ultima.congelacionInicio,
    fechaFin: ultima.congelacionFin,
    motivo: ultima.motivo ?? null,
  };
}
