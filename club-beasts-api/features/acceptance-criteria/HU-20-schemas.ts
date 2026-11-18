import { z } from "zod";
import { servicioPersonalizadoEstadoEnum } from "./HU-13-schemas";
import { crearRutinaBaseSchema } from "./HU-18-schemas";
import {
  crearRutinaPersonalizadaSchema,
  enumConMensaje,
  rutinaResumenSchema,
  TIPO_RUTINA,
} from "./HU-19-schemas";

/**
 * Contrato propuesto de validación — HU-20: Asignación de rutina activa.
 * Generado por acceptance-criteria-analyst (modo CREAR, INC-10-rutinas,
 * 2026-11-05).
 *
 * Reglas de negocio aplicadas:
 * - HU-20 c1: UNA sola rutina activa por cliente (supuesto §2 del historial de
 *   HU). Al asignar una nueva, la anterior se cierra (`fechaFin`) — regla de
 *   reemplazo fijada por HU-21 c3 (RU-21/RU-31). Invariante: nunca 2 activas.
 * - HU-20 c2: asignables GENERICA | INDUCCION | PERSONALIZADA.
 * - HU-20 c3 + HU-13 b4 (`HU13-C04`, INC05-PER-05): una rutina PERSONALIZADA
 *   solo se activa si el servicio personalizado está **vigente**. Estados
 *   permitidos -> PEND-RUT-05 (rec (a): solo `ACTIVA` al momento del cambio;
 *   `CONGELADO`/`VENCIDA`/`PROGRAMADA`/`NO_CONTRATADO` -> rechazo). Los
 *   literales de estado son los de `HU-13-schemas.ts` (fuente única, DEC-043:
 *   `CONGELADO`, nunca "CONGELADA").
 * - Genérica/inducción NO exige vigencia (HU-26 c3 "sin personalizado vigente
 *   puede mostrar una genérica o de inducción asignada").
 * - Trazabilidad (HU-21 c2): `actor` = usuario autenticado real (precedentes
 *   `ClienteEstadoCambio.actorId` / `Anamnesis.actualizadoPorId`), nunca un
 *   valor libre del cliente.
 * - Permisos: PEND-RUT-04 (rec (a) solo DUENO; supuesto §2 "la recepción ...
 *   no gestiona rutinas").
 *
 * Modelo del registro de asignación: `rutinaAsignacionSchema` (creado aquí,
 * consultado como historial en HU-21). PEND-RUT-06 (rec (a)) lleva
 * `contenidoSnapshot` = copia del contenido al asignar (precedente DEC-056).
 *
 * Autónomo: `zod` + módulos hermanos del bloque + literales de vigencia de
 * `HU-13-schemas` (import de fuente única, sin duplicar literales).
 * IMPORTANTE: contrato PROPUESTO — pendiente de ratificación por
 * backend-developer en el spec de INC-10.
 *
 * ── ENMIENDA C4 (patrón C4) — INC-10-rutinas, ciclo GREEN 2026-11-05 ──
 * Contrato de enmienda: cambios documentados header + inline, nunca edición
 * silenciosa (INC10-R08-GAP-02 / DEC-070):
 *   (1) `CODIGO_ASIGNACION_CONFLICTO` / `MENSAJE_ASIGNACION_CONFLICTO`:
 *       literales del 409 de concurrencia (arbitro `activaClave` -> P2002).
 *   (2) `asignacionErrorSchema.code`: el contrato de error acepta
 *       `ASIGNACION_CONFLICTO` además de los 5 códigos base.
 *   (3) `CODIGOS_ERROR_ASIGNACION` / `MENSAJES_ASIGNACION` NO se amplían: los
 *       tests unitarios `tests/unit/inc10-rutinas-schemas.test.ts:1117,1128`
 *       fijan exactamente 5 códigos/5 mensajes (INC00-QA-01: los tests no se
 *       editan sin contrato del orquestador). La adición literal a esos
 *       exports queda pendiente del re-escopo de esos tests. Mismo contenido
 *       en la copia `src/schemas/rutina.schema.ts`.
 * Ninguna otra cláusula de este archivo cambia.
 */

// ---------------------------------------------------------------------------
// Estados derivados de la asignación (HU-21 c1/c3)
// ---------------------------------------------------------------------------

/**
 * Estado de la asignación, derivado de `fechaFin` (sin columna persistida,
 * patrón del estado derivado de HU-11/Anamnesis):
 * - ACTIVA: `fechaFin === null` (la rutina vigente del cliente).
 * - CERRADA: `fechaFin` con fecha (dejó de estar activa al asignar otra).
 */
export const rutinaAsignacionEstadoEnum = z.enum(["ACTIVA", "CERRADA"]);

export type RutinaAsignacionEstado = z.infer<typeof rutinaAsignacionEstadoEnum>;

/** Deriva el estado de la asignación desde `fechaFin` (puro, testeable). */
export function estadoAsignacionPorFechaFin(
  fechaFin: string | null | undefined
): RutinaAsignacionEstado {
  return fechaFin === null || fechaFin === undefined ? "ACTIVA" : "CERRADA";
}

// ---------------------------------------------------------------------------
// Regla de vigencia del servicio personalizado (HU-20 c3 / HU-13 b4)
// ---------------------------------------------------------------------------

export type EstadoVigenciaPersonalizado = z.infer<typeof servicioPersonalizadoEstadoEnum>;

/**
 * PEND-RUT-05 — rec (a): solo el estado `ACTIVA` de la vigencia del servicio
 * personalizado permite activar (y exponer) una rutina personalizada. Estados
 * evaluados al momento del cambio; sin auto-desactivación (ver PEND-05 para la
 * alternativa (b) evento de vencimiento y (c) híbrida).
 */
export const ESTADOS_VIGENCIA_QUE_PERMITEN_PERSONALIZADA = ["ACTIVA"] as const;

export type ResultadoReglaVigencia =
  | { permitido: true }
  | {
      permitido: false;
      code: "SIN_VIGENCIA_PERSONALIZADA";
      error: string;
    };

/**
 * Regla pura HU-20 c3: ¿puede activarse esta rutina para el cliente?
 * - GENERICA/INDUCCION: siempre permitido (sin requisito de vigencia).
 * - PERSONALIZADA: solo con vigencia personalizada `ACTIVA` (rec (a) PEND-05).
 */
export function puedeActivarRutina(
  tipoRutina: (typeof TIPO_RUTINA)[number],
  estadoVigenciaPersonalizado?: EstadoVigenciaPersonalizado | null
): ResultadoReglaVigencia {
  if (tipoRutina !== "PERSONALIZADA") return { permitido: true };
  if (
    estadoVigenciaPersonalizado !== undefined &&
    estadoVigenciaPersonalizado !== null &&
    (ESTADOS_VIGENCIA_QUE_PERMITEN_PERSONALIZADA as readonly string[]).includes(
      estadoVigenciaPersonalizado
    )
  ) {
    return { permitido: true };
  }
  return {
    permitido: false,
    code: "SIN_VIGENCIA_PERSONALIZADA",
    error: MENSAJES_ASIGNACION.SIN_VIGENCIA_PERSONALIZADA,
  };
}

/**
 * Regla de EXPOSICIÓN (HU-26 c2, literal INC05-PER-05): la rutina personalizada
 * solo se expone cuando la vigencia está `ACTIVA`; con `NO_CONTRATADO`,
 * `VENCIDA`, `PROGRAMADA` o `CONGELADO` -> oculta `null` SIN borrar la
 * asignación.
 */
export function esVisibleRutinaPersonalizada(
  estadoVigenciaPersonalizado?: EstadoVigenciaPersonalizado | null
): boolean {
  return (
    estadoVigenciaPersonalizado !== undefined &&
    estadoVigenciaPersonalizado !== null &&
    (ESTADOS_VIGENCIA_QUE_PERMITEN_PERSONALIZADA as readonly string[]).includes(
      estadoVigenciaPersonalizado
    )
  );
}

// ---------------------------------------------------------------------------
// Códigos y mensajes de rechazo de la asignación (contrato de error)
// ---------------------------------------------------------------------------

/**
 * ENMIENDA C4 (INC-10, 2026-11-05) — DEC-070 añade `ASIGNACION_CONFLICTO`
 * (409 de concurrencia) a este contrato; vive en
 * `CODIGO_ASIGNACION_CONFLICTO` (abajo) porque los tests unitarios fijan esta
 * tupla en su forma de 5 entradas (INC00-QA-01). Ver header (punto 3).
 */
export const CODIGOS_ERROR_ASIGNACION = [
  "CLIENTE_NO_ENCONTRADO",
  "RUTINA_NO_ENCONTRADA",
  "SIN_VIGENCIA_PERSONALIZADA",
  "RUTINA_YA_ACTIVA",
  "CLIENTE_INACTIVO",
] as const;

export const codigoErrorAsignacionSchema = enumConMensaje(
  CODIGOS_ERROR_ASIGNACION,
  "Código de error de asignación no permitido"
);

/** Mensajes exactos (español, específicos) por código de rechazo. */
export const MENSAJES_ASIGNACION: Record<
  (typeof CODIGOS_ERROR_ASIGNACION)[number],
  string
> = {
  CLIENTE_NO_ENCONTRADO: "Cliente no encontrado",
  RUTINA_NO_ENCONTRADA: "Rutina no encontrada",
  SIN_VIGENCIA_PERSONALIZADA:
    "El cliente no tiene el servicio personalizado vigente: no se puede activar una rutina personalizada",
  RUTINA_YA_ACTIVA: "La rutina ya está activa para este cliente",
  CLIENTE_INACTIVO:
    "Cliente sin estado activo: no se le pueden asignar rutinas",
} as const;

/**
 * ENMIENDA C4 (INC-10, 2026-11-05) — INC10-R08-GAP-02 / DEC-070: el 409 de
 * concurrencia de la asignación (arbitro `activaClave` -> P2002) viaja con el
 * código literal `ASIGNACION_CONFLICTO`. Los mensajes exactos de los 5
 * códigos base quedan en `MENSAJES_ASIGNACION`; este literal se declara aparte
 * porque los tests unitarios fijan `CODIGOS_ERROR_ASIGNACION`/
 * `MENSAJES_ASIGNACION` en su forma de 5 entradas (INC00-QA-01). Ver header
 * (punto 3).
 */
export const CODIGO_ASIGNACION_CONFLICTO = "ASIGNACION_CONFLICTO" as const;

/** Mensaje del 409 de concurrencia (literal elegido en GREEN; DEC-070 fija solo el código). */
export const MENSAJE_ASIGNACION_CONFLICTO =
  "Otra asignación cambió la rutina activa del cliente: vuelve a intentar" as const;

/**
 * Respuesta de error de la asignación (`{ error, code }`, patrón HU-13).
 * ENMIENDA C4 (INC-10, 2026-11-05) — DEC-070: `code` acepta también
 * `ASIGNACION_CONFLICTO` (concurrencia) además de los 5 códigos base.
 */
export const asignacionErrorSchema = z.object({
  error: z.string(),
  code: z.union([
    codigoErrorAsignacionSchema,
    z.literal(CODIGO_ASIGNACION_CONFLICTO),
  ]),
});

// ---------------------------------------------------------------------------
// Solicitud de asignación (HU-20)
// ---------------------------------------------------------------------------

/**
 * POST .../asignaciones (RU-20): `fechaInicio` opcional (por defecto hoy,
 * America/Bogota, precedente DEC-005/006); si se envía debe ser fecha válida y
 * NO futura (una asignación activa empieza hoy o se backfillea al pasado).
 * `fechaFin` NO se recibe: la cierra el sistema al reemplazar (HU-21 c3).
 */
export const asignarRutinaSchema = z
  .object({
    clienteId: z
      .string({ required_error: "clienteId es requerido" })
      .min(1, "clienteId es requerido"),
    rutinaId: z
      .string({ required_error: "rutinaId es requerido" })
      .min(1, "rutinaId es requerido"),
    fechaInicio: z
      .string()
      .refine(
        (v) => /^\d{4}-\d{2}-\d{2}$/.test(v),
        { message: "Fecha de inicio debe ser una fecha válida (YYYY-MM-DD)" }
      )
      .refine(
        (v) => {
          const [y, m, d] = v.split("-").map(Number);
          const fecha = new Date(y, m - 1, d);
          return (
            fecha.getFullYear() === y &&
            fecha.getMonth() === m - 1 &&
            fecha.getDate() === d
          );
        },
        { message: "Fecha de inicio debe ser una fecha válida (YYYY-MM-DD)" }
      )
      .refine(
        (v) => v <= new Date().toISOString().slice(0, 10),
        { message: "Fecha de inicio no puede ser futura" }
      )
      .optional(),
  })
  .strict(); // `fechaFin`, `estado`, `actor` son del sistema -> 400 si llegan

export type AsignarRutina = z.infer<typeof asignarRutinaSchema>;

/** Params de la ruta de asignaciones por cliente. */
export const asignarRutinaParamsSchema = z.object({
  clienteId: z
    .string({ required_error: "clienteId es requerido" })
    .min(1, "clienteId es requerido"),
});

// ---------------------------------------------------------------------------
// Registro de asignación (creado en HU-20; historial en HU-21)
// ---------------------------------------------------------------------------

/**
 * Registro de asignación de rutina (HU-20 c1 + HU-21 c1/c2). Solo puede existir
 * uno con `fechaFin = null` por cliente (invariante RU-21/RU-35).
 *
 * `contenidoSnapshot` (PEND-RUT-06 rec (a)): copia del contenido de la rutina
 * al momento de asignar, para que el historial conserve "la versión del
 * momento" aunque la rutina se edite después (precedente DEC-056 snapshot).
 * Con la alternativa (b) referencia viva este campo viaja `null`.
 */
export const rutinaAsignacionSchema = z.object({
  id: z.string(),
  clienteId: z.string(),
  rutina: rutinaResumenSchema,
  fechaInicio: z.string(),
  fechaFin: z.string().nullable(),
  estado: rutinaAsignacionEstadoEnum,
  actor: z.object({ id: z.string(), nombre: z.string() }),
  contenidoSnapshot: z
    .union([crearRutinaBaseSchema, crearRutinaPersonalizadaSchema])
    .nullable()
    .optional(),
});

export type RutinaAsignacion = z.infer<typeof rutinaAsignacionSchema>;
