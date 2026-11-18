import { z } from "zod";
import {
  diagnosticoSchema,
  enumConMensaje,
  informacionGeneralSchema,
  macrocicloSchema,
  sesionSchema,
  testSchema,
  antropometriaItemSchema,
  analisisBiomecanicoItemSchema,
  textoLargoBase,
  nombreRutinaBase,
  NIVEL_EXPERIENCIA,
  TIPO_RUTINA,
} from "./HU-19-schemas";
import {
  esVisibleRutinaPersonalizada,
  type EstadoVigenciaPersonalizado,
} from "./HU-20-schemas";

/**
 * Contrato propuesto de validación — HU-26: Visualización de rutina activa
 * (portal del cliente). Generado por acceptance-criteria-analyst (modo CREAR,
 * INC-10-rutinas, 2026-11-05).
 *
 * Reglas de negocio aplicadas:
 * - HU-26 c1: el cliente visualiza SOLO su rutina activa (self-only; privacidad
 *   precedentes SEC-01/SEC-03/GAP-001 de HU-10/HU-28: jamás datos de otro
 *   cliente; respuesta sin `actor` ni datos internos del staff).
 * - HU-26 c2: si es personalizada, muestra "la versión personalizada vigente" =
 *   el contenido de la asignación ACTIVA cuya vigencia del servicio personalizado
 *   está `ACTIVA` (literal INC05-PER-05 de HU13-C04; PEND-RUT-05). Con
 *   `CONGELADO`/`VENCIDA`/`PROGRAMADA`/`NO_CONTRATADO` la personalizada NO se
 *   muestra (la asignación no se borra).
 * - HU-26 c3: sin personalizado vigente, se muestra la genérica/inducción
 *   asignada (no requiere vigencia).
 * - HU-26 c4: el cliente NO puede editar el contenido (solo lectura; cualquier
 *   intento de escritura -> 403; ningún endpoint de escritura accesible a
 *   CLIENTE sobre rutinas).
 * - PEND-RUT-07 (rec (a)): se muestra la estructura COMPLETA de la personalizada
 *   en solo lectura (paridad con HU-28, que muestra la anamnesis completa al
 *   cliente). Alternativa (b) solo plan de sesiones en
 *   `HU-26-criterios-aceptacion.md`. Con (b), este DTO se reduce con `.pick()`.
 * - Literal de "sin rutina" PROPUESTO: "No tienes una rutina activa" (paridad
 *   con HU-27 c3 "el portal informa que no hay plan vigente"); lo fija el
 *   contrato frontend al ratificar.
 *
 * Autónomo: `zod` + módulos hermanos del bloque (HU-19/HU-20-schemas).
 * IMPORTANTE: contrato PROPUESTO — pendiente de ratificación por
 * backend-developer/frontend-developer en el spec de INC-10.
 */

// ---------------------------------------------------------------------------
// DTOs de lectura del portal (SOLO LECTURA — sin campos de staff)
// ---------------------------------------------------------------------------

/** Tipo visible en el portal (sin PERSONALIZADA fuera de vigencia). */
export const TIPO_RUTINA_PORTAL = ["GENERICA", "INDUCCION"] as const;

/** Rutina genérica/inducción activa en el portal (PEND-RUT-03 (a)). */
export const rutinaPortalBaseSchema = z
  .object({
    tipoRutina: enumConMensaje(
      TIPO_RUTINA_PORTAL,
      "Tipo de rutina debe ser GENERICA o INDUCCION"
    ),
    asignacionId: z.string(),
    fechaInicio: z.string(),
    nombre: nombreRutinaBase,
    descripcion: textoLargoBase.nullable(),
    objetivo: textoLargoBase.nullable(),
    nivelExperiencia: enumConMensaje(
      NIVEL_EXPERIENCIA,
      "Nivel de experiencia debe ser PRINCIPIANTE, INTERMEDIO o AVANZADO"
    ).nullable(),
    sesiones: z.array(sesionSchema),
  })
  .strict(); // sin `actor`, sin `actualizadoPor` (privacidad SEC-01/SEC-03)

export type RutinaPortalBase = z.infer<typeof rutinaPortalBaseSchema>;

/**
 * Rutina personalizada activa en el portal (HU-26 c2). Estructura COMPLETA
 * según PEND-RUT-07 (a); con la alternativa (b) se expone solo
 * `{ nombre, macrociclos }` vía `.pick()`.
 */
export const rutinaPortalPersonalizadaSchema = z
  .object({
    tipoRutina: z.literal("PERSONALIZADA"),
    asignacionId: z.string(),
    fechaInicio: z.string(),
    nombre: nombreRutinaBase,
    descripcion: textoLargoBase.nullable(),
    informacionGeneral: informacionGeneralSchema,
    diagnostico: diagnosticoSchema,
    macrociclos: z.array(macrocicloSchema),
    tests: z.array(testSchema),
    antropometria: z.array(antropometriaItemSchema),
    analisisBiomecanico: z.array(analisisBiomecanicoItemSchema),
  })
  .strict(); // sin `actor`, sin `actualizadoPor` (privacidad SEC-01/SEC-03)

export type RutinaPortalPersonalizada = z.infer<typeof rutinaPortalPersonalizadaSchema>;

/** Discriminado por `tipoRutina` (respuesta de la vista "Mi rutina"). */
export const rutinaPortalSchema = z.discriminatedUnion("tipoRutina", [
  rutinaPortalBaseSchema,
  rutinaPortalPersonalizadaSchema,
]);

export type RutinaPortal = z.infer<typeof rutinaPortalSchema>;

/**
 * Mensaje cuando no hay rutina visible (HU-26 c1: si no hay asignación activa,
 * o la personalizada está fuera de vigencia sin alternativa asignada). Literal
 * PROPUESTO — lo fija el contrato frontend al ratificar.
 */
export const sinRutinaPortalSchema = z
  .object({
    mensaje: z.string(),
  })
  .strict();

export const SIN_RUTINA_MENSAJE = "No tienes una rutina activa";

/** Respuesta completa de la vista de rutina del portal. */
export const respuestaRutinaPortalSchema = z.union([
  rutinaPortalSchema,
  sinRutinaPortalSchema,
]);

export type RespuestaRutinaPortal = z.infer<typeof respuestaRutinaPortalSchema>;

// ---------------------------------------------------------------------------
// Reglas de visibilidad (puras, testeables) — HU-26 c1/c2/c3
// ---------------------------------------------------------------------------

/**
 * ¿Se muestra la asignación activa al cliente? (RU-36..RU-38)
 * - GENERICA/INDUCCION: siempre visible (HU-26 c3).
 * - PERSONALIZADA: solo con vigencia personalizada `ACTIVA`
 *   (INC05-PER-05/HU13-C04; la asignación NO se borra, solo se oculta).
 */
export function visibleEnPortal(
  tipoRutina: (typeof TIPO_RUTINA)[number],
  estadoVigenciaPersonalizado?: EstadoVigenciaPersonalizado | null
): boolean {
  if (tipoRutina !== "PERSONALIZADA") return true;
  return esVisibleRutinaPersonalizada(estadoVigenciaPersonalizado);
}
