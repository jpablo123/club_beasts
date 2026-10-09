import { z } from "zod";

/**
 * Contrato propuesto para HU-14 — Registro de servicio de nutrición.
 * Generado por acceptance-criteria-analyst (modo CREAR, G14).
 *
 * Fuente: `HU-14-criterios-aceptacion.md` + DEC-004 (servicios separados),
 * DEC-005/006 (días America/Bogota, extremos inclusivos), DEC-007 (renovar =
 * periodo nuevo), DEC-008 (solapamientos rechazados), DEC-017 (DUENO y
 * RECEPCIONISTA gestionan vigencias), DEC-019 (plan nutricional con plantilla
 * simple: aquí solo la dependencia de vigencia, HU14-C04).
 *
 * Autónomo: solo depende de `zod` (patrón de HU-04/HU-05-schemas.ts).
 * Contraparte de `src/schemas/membresia.schema.ts` para el nuevo recurso;
 * NO importa nada de `src/` para no crear dependencias inexistentes.
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
 * POST /clientes/:clienteId/servicios-nutricion (HU14-C01).
 * DEC-006: inicio y fin inclusivos → duración mínima 1 día.
 * DEC-008: solapamientos se rechazan en el servicio (409), gaps permitidos.
 */
export const createServicioNutricionSchema = z
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
 * PATCH /clientes/:clienteId/servicios-nutricion/:servicioId
 * (edición con control de concurrencia optimista, patrón INC00-MEM-03).
 */
export const updateServicioNutricionSchema = z
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
export const servicioNutricionParamsSchema = z.object({
  clienteId: z
    .string({ required_error: "clienteId es requerido" })
    .min(1, "clienteId es requerido"),
  servicioId: z
    .string({ required_error: "servicioId es requerido" })
    .min(1, "servicioId es requerido")
    .optional(),
});

/**
 * Estados del servicio de nutrición (HU14-C02a/C02b).
 * ⚠ P-05: PROGRAMADA no aparece en la letra de la HU (propuesta por
 * consistencia con `calcularEstado` de gym) y CONGELADA depende de HU-15 —
 * confirmar literales antes de fijar pruebas.
 */
export const servicioNutricionEstadoEnum = z.enum([
  "NO_CONTRATADO",
  "PROGRAMADA",
  "CONGELADA",
  "ACTIVA",
  "VENCIDA",
]);

/** DTO de una vigencia (respuesta de POST/GET/PATCH), espejo de MembresiaDTO. */
export const servicioNutricionVigenciaSchema = z.object({
  id: z.string(),
  clienteId: z.string(),
  fechaInicio: z.string(),
  fechaFin: z.string(),
  estado: servicioNutricionEstadoEnum,
  version: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
  creadoPor: z.object({ id: z.string(), nombre: z.string() }),
  actualizadoPor: z.object({ id: z.string(), nombre: z.string() }),
});

/** Respuesta de GET /clientes/:clienteId/servicios-nutricion (HU14-C03). */
export const listarServicioNutricionSchema = z.object({
  servicios: z.array(servicioNutricionVigenciaSchema),
  fechaActual: z.string(),
});

/**
 * `planNutricionalActivo` de la ficha bajo la dependencia HU14-C04
 * (DEC-019: plantilla simple; la estructura llega en el bloque 7).
 * Solo no-null cuando la vigencia del servicio de nutrición está ACTIVA.
 */
export const planNutricionalActivoSchema = z
  .object({
    id: z.string(),
    nombre: z.string(),
  })
  .nullable()
  .describe(
    "Solo no-null si la vigencia del servicio de nutrición está ACTIVA (HU14-C04, DEC-019)"
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
export type CreateServicioNutricion = z.infer<typeof createServicioNutricionSchema>;
export type UpdateServicioNutricion = z.infer<typeof updateServicioNutricionSchema>;
export type ServicioNutricionParams = z.infer<typeof servicioNutricionParamsSchema>;
export type ServicioNutricionEstado = z.infer<typeof servicioNutricionEstadoEnum>;
export type ServicioNutricionVigencia = z.infer<
  typeof servicioNutricionVigenciaSchema
>;
export type ListarServicioNutricion = z.infer<typeof listarServicioNutricionSchema>;
export type PlanNutricionalActivo = z.infer<typeof planNutricionalActivoSchema>;
