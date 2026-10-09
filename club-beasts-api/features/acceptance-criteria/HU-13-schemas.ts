import { z } from "zod";

/**
 * Contrato propuesto para HU-13 — Registro de servicio personalizado.
 * Generado por acceptance-criteria-analyst (modo CREAR, G14).
 *
 * Fuente: `HU-13-criterios-aceptacion.md` + DEC-004 (servicios separados),
 * DEC-005/006 (días America/Bogota, extremos inclusivos), DEC-007 (renovar =
 * periodo nuevo), DEC-008 (solapamientos rechazados), DEC-017 (DUENO y
 * RECEPCIONISTA gestionan vigencias), DEC-018 (rutina con estructura
 * macro-meso-micro: aquí solo la dependencia de vigencia, HU13-C04).
 *
 * Autónomo: solo depende de `zod` (patrón de HU-04/HU-05-schemas.ts).
 * Es la contraparte de `src/schemas/membresia.schema.ts` para el nuevo
 * recurso; NO importa nada de `src/` para no crear dependencias inexistentes.
 */

const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Copia local de la validación de fecha real de calendario (patrón de
 * `src/schemas/membresia.schema.ts:9-18`, INC00-MEM-07). Se duplica a
 * propósito: este archivo debe ser importable sin el código de `src/`.
 */
export function isValidDate(dateStr: string): boolean {
  if (!fechaRegex.test(dateStr)) return false;
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/** Campo de fecha obligatorio: no vacío y día de calendario existente. */
function fechaRequerida(mensajeVacia: string, mensajeInvalida: string) {
  return z
    .string({ required_error: mensajeVacia })
    .min(1, mensajeVacia)
    .refine(isValidDate, { message: mensajeInvalida });
}

/**
 * POST /clientes/:clienteId/servicios-personalizado (HU13-C01).
 * DEC-006: inicio y fin son inclusivos → duración mínima 1 día (inicio == fin).
 * DEC-008: solapamientos se rechazan en el servicio (409), gaps permitidos.
 */
export const createServicioPersonalizadoSchema = z
  .object({
    fechaInicio: fechaRequerida(
      "Fecha de inicio es requerida",
      "Fecha de inicio debe ser una fecha válida (YYYY-MM-DD)"
    ),
    fechaFin: fechaRequerida(
      "Fecha fin es requerida",
      "Fecha fin debe ser una fecha válida (YYYY-MM-DD)"
    ),
  })
  .refine((data) => data.fechaInicio <= data.fechaFin, {
    message: "Fecha fin no puede ser anterior a fecha de inicio",
    path: ["fechaFin"],
  });

/**
 * PATCH /clientes/:clienteId/servicios-personalizado/:servicioId
 * (edición con control de concurrencia optimista, patrón INC00-MEM-03).
 * Las fechas son opcionales, pero si vienen no pueden ser vacías ni inválidas.
 */
export const updateServicioPersonalizadoSchema = z
  .object({
    fechaInicio: fechaRequerida(
      "Fecha de inicio es requerida",
      "Fecha de inicio debe ser una fecha válida (YYYY-MM-DD)"
    ).optional(),
    fechaFin: fechaRequerida(
      "Fecha fin es requerida",
      "Fecha fin debe ser una fecha válida (YYYY-MM-DD)"
    ).optional(),
    version: z
      .number({ required_error: "Versión es requerida" })
      .int("Versión debe ser un entero")
      .positive("Versión debe ser positiva"),
  })
  .refine(
    (data) => {
      if (!data.fechaInicio || !data.fechaFin) return true;
      return data.fechaInicio <= data.fechaFin;
    },
    {
      message: "Fecha fin no puede ser anterior a fecha de inicio",
      path: ["fechaFin"],
    }
  );

/** Params de las rutas anidadas bajo un cliente. */
export const servicioPersonalizadoParamsSchema = z.object({
  clienteId: z
    .string({ required_error: "clienteId es requerido" })
    .min(1, "clienteId es requerido"),
  servicioId: z
    .string({ required_error: "servicioId es requerido" })
    .min(1, "servicioId es requerido")
    .optional(),
});

/**
 * Estados del servicio personalizado (HU13-C02a/C02b).
 * - NO_CONTRATADO: sin vigencias.
 * - PROGRAMADA/ACTIVA/VENCIDA: calculados con America/Bogota e inclusivos
 *   (DEC-005/006), igual que `calcularEstado` de gym.
 *   ⚠ P-05: PROGRAMADA no aparece en la letra de la HU (propuesta por
 *   consistencia) y CONGELADA depende de HU-15 — confirmar literal.
 */
export const servicioPersonalizadoEstadoEnum = z.enum([
  "NO_CONTRATADO",
  "PROGRAMADA",
  "CONGELADA",
  "ACTIVA",
  "VENCIDA",
]);

/** DTO de una vigencia (respuesta de POST/GET/PATCH), espejo de MembresiaDTO. */
export const servicioPersonalizadoVigenciaSchema = z.object({
  id: z.string(),
  clienteId: z.string(),
  fechaInicio: z.string(),
  fechaFin: z.string(),
  estado: servicioPersonalizadoEstadoEnum,
  version: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
  creadoPor: z.object({ id: z.string(), nombre: z.string() }),
  actualizadoPor: z.object({ id: z.string(), nombre: z.string() }),
});

/** Respuesta de GET /clientes/:clienteId/servicios-personalizado (HU13-C03). */
export const listarServicioPersonalizadoSchema = z.object({
  servicios: z.array(servicioPersonalizadoVigenciaSchema),
  fechaActual: z.string(),
});

/**
 * `rutinaActiva` de la ficha bajo la dependencia HU13-C04:
 * solo se expone cuando el servicio personalizado está ACTIVO
 * (DEC-018: la estructura de la rutina llega en el bloque 6; este tipo es el
 * mínimo necesario para expresar la condición, sin modelar bloques).
 */
export const rutinaActivaPersonalizadaSchema = z
  .object({
    id: z.string(),
    nombre: z.string(),
  })
  .nullable()
  .describe(
    "Solo no-null si la vigencia del servicio personalizado está ACTIVA (HU13-C04)"
  );

/** Cuerpo de error genérico del API (contrato existente `{ error, code }`). */
export const errorResponseSchema = z.object({
  error: z.string(),
  code: z.string(),
});

/** 409 SERVICIO_SOLAPADA (DEC-008, extremos inclusivos) — ver P-06. */
export const servicioSolapadoResponseSchema = z.object({
  error: z.string(),
  code: z.literal("SERVICIO_SOLAPADA"),
});

/** 409 SERVICIO_CONFLICTO (concurrencia de versiones, patrón MEM-03) — ver P-06. */
export const servicioConflictoResponseSchema = z.object({
  error: z.string(),
  code: z.literal("SERVICIO_CONFLICTO"),
});

/** 409 CLIENTE_INACTIVO: guard de HU-08 sobre servicios nuevos (HU08-C04b). */
export const clienteInactivoResponseSchema = z.object({
  error: z.string(),
  code: z.literal("CLIENTE_INACTIVO"),
});

// Tipos inferidos
export type CreateServicioPersonalizado = z.infer<
  typeof createServicioPersonalizadoSchema
>;
export type UpdateServicioPersonalizado = z.infer<
  typeof updateServicioPersonalizadoSchema
>;
export type ServicioPersonalizadoParams = z.infer<
  typeof servicioPersonalizadoParamsSchema
>;
export type ServicioPersonalizadoEstado = z.infer<
  typeof servicioPersonalizadoEstadoEnum
>;
export type ServicioPersonalizadoVigencia = z.infer<
  typeof servicioPersonalizadoVigenciaSchema
>;
export type ListarServicioPersonalizado = z.infer<
  typeof listarServicioPersonalizadoSchema
>;
export type RutinaActivaPersonalizada = z.infer<
  typeof rutinaActivaPersonalizadaSchema
>;
