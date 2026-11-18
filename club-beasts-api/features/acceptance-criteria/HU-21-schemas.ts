import { z } from "zod";
import {
  estadoAsignacionPorFechaFin,
  rutinaAsignacionSchema,
  type RutinaAsignacion,
} from "./HU-20-schemas";

/**
 * Contrato propuesto de validación — HU-21: Historial de cambios de rutina.
 * Generado por acceptance-criteria-analyst (modo CREAR, INC-10-rutinas,
 * 2026-11-05).
 *
 * Reglas de negocio aplicadas:
 * - HU-21 c1: cada asignación guarda `fechaInicio` y `fechaFin` (la activa tiene
 *   `fechaFin = null`; `estado` derivado, sin columna — patrón HU-11).
 * - HU-21 c2: `actor` = quien hizo el cambio (usuario autenticado real;
 *   precedentes `ClienteEstadoCambio.actorId` / `Anamnesis.actualizadoPorId`).
 *   El actor es visible SOLO a staff; HU-26 (portal) lo omite (privacidad).
 * - HU-21 c3: la rutina anterior deja de estar activa al asignar una nueva ->
 *   `fechaFin` de la anterior = `fechaInicio` de la nueva (RU-31). Transiciones:
 *   `[ACTIVA] --asignar otra--> [CERRADA]`; `[CERRADA]` no se reabre (una
 *   re-asignación es un registro nuevo); nunca 2 `ACTIVA` por cliente.
 * - HU-21 c4: historial disponible en la ficha del cliente (staff). El historial
 *   es INMUTABLE por UI (no se edita ni borra; solo se agregan registros al
 *   asignar/cerrar).
 * - PEND-RUT-06: cardinalidad = tabla de asignaciones (`RutinaAsignacion` en
 *   HU-20-schemas) con snapshot opcional del contenido (rec (a)); alternativas
 *   (b) referencia viva y (c) `RutinaVersion` en HU-21-criterios-aceptacion.md.
 * - Sin doble cobro con HU-07 (DEC-016): el bullet "ficha muestra rutina activa
 *   e historial" es contexto de visibilidad; los puntos se reparten al cierre.
 *
 * Autónomo: `zod` + módulos hermanos del bloque (HU-20-schemas).
 * IMPORTANTE: contrato PROPUESTO — pendiente de ratificación por
 * backend-developer en el spec de INC-10.
 */

// ---------------------------------------------------------------------------
// Consulta del historial (HU-21 c4)
// ---------------------------------------------------------------------------

/**
 * Historial de asignaciones de rutina del cliente (respuesta de la consulta en
 * la ficha). Orden PROPUESTO: `fechaInicio` DESC (la activa arriba), luego
 * `createdAt` DESC. `total` soporta paginación simple.
 */
export const historialRutinasSchema = z.object({
  clienteId: z.string(),
  asignaciones: z.array(rutinaAsignacionSchema),
  total: z.number().int().min(0),
});

export type HistorialRutinas = z.infer<typeof historialRutinasSchema>;

/**
 * DTO de historial para la ficha del cliente (staff). Idéntico al registro de
 * asignación (incluye `actor` y `contenidoSnapshot` según PEND-RUT-06); el
 * CLIENTE nunca consume este DTO (HU-26 usa `HU-26-schemas.ts`, sin `actor`).
 */
export const rutinaAsignacionFichaSchema = rutinaAsignacionSchema;

// ---------------------------------------------------------------------------
// Reglas del historial (puras, testeables)
// ---------------------------------------------------------------------------

/**
 * Regla de reemplazo (HU-21 c3): al asignar una nueva, la asignación activa
 * previa se cierra con `fechaFin = fechaInicioNueva`. Devuelve el registro
 * cerrado; si no había activa, devuelve `null`. Nunca debe quedar más de una
 * `ACTIVA` por cliente (invariante RU-21/RU-35).
 */
export function cerrarAsignacionActiva(
  asignacionActiva: RutinaAsignacion | null | undefined,
  fechaInicioNueva: string
): RutinaAsignacion | null {
  if (!asignacionActiva) return null;
  return {
    ...asignacionActiva,
    fechaFin: fechaInicioNueva,
    estado: estadoAsignacionPorFechaFin(fechaInicioNueva),
  };
}

/**
 * Invariante (RU-35): valida que a lo sumo una asignación esté activa.
 * Devuelve true si la lista es válida (0 o 1 activas).
 */
export function maxUnaActivaPorCliente(asignaciones: RutinaAsignacion[]): boolean {
  return asignaciones.filter((a) => estadoAsignacionPorFechaFin(a.fechaFin) === "ACTIVA").length <= 1;
}
