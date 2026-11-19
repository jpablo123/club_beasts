import { z } from "zod";
import { isValidDate } from "./membresia.schema.js";

/**
 * INC-05 (HU-13/HU-14, contrato ratificado 2026-10-20) — schemas de las
 * rutas nuevas `POST/GET /clientes/:clienteId/servicios-personalizado` y
 * `.../servicios-nutricion`, y `PATCH .../:servicioId` (DEC-044 paths,
 * DEC-046 PATCH, DEC-047 regla de duracion).
 *
 * Espejo de `membresia.schema.ts` (incompatibilidad #7: `src/` no puede
 * importar los G14; aqui viven los equivalentes y los tests importan
 * `HU-13-schemas.ts` / `HU-14-schemas.ts`). El validador de fecha real de
 * calendario es la FUENTE UNICA de `membresia.schema.ts` (INC00-MEM-07).
 */

/** Campo de fecha obligatorio: no vacia y dia de calendario existente. */
function fechaRequerida(mensajeVacia: string, mensajeInvalida: string) {
  return z
    .string({ required_error: mensajeVacia })
    .min(1, mensajeVacia)
    .refine(isValidDate, { message: mensajeInvalida });
}

/** Body de `POST .../servicios-{personalizado|nutricion}` (mismos mensajes que el espejo gym). */
export const createServicioSchema = z
  .object({
    fechaInicio: fechaRequerida(
      "Fecha de inicio es requerida",
      "Fecha de inicio debe ser una fecha válida (YYYY-MM-DD)"
    ),
    fechaFin: fechaRequerida(
      "Fecha fin es requerida",
      "Fecha fin debe ser una fecha válida (YYYY-MM-DD)"
    ).optional(),
    duracionPreset: z.enum(["1m", "3m", "6m"]).optional(),
  })
  .refine((data) => {
    if (!data.fechaFin) return true;
    return data.fechaInicio <= data.fechaFin;
  }, {
    message: "Fecha fin no puede ser anterior a fecha de inicio",
    path: ["fechaFin"],
  });

/**
 * Body de `PATCH .../servicios-{personalizado|nutricion}/:servicioId`
 * (DEC-046 = (a), concurrencia optimista patron INC00-MEM-03). Las fechas
 * son opcionales, pero si vienen no pueden ser vacias ni invalidas.
 * La regla DEC-047 (desplazar `fechaFin` al mover solo `fechaInicio`) vive
 * en el servicio (`calcularFechasEdicion`), no en Zod.
 */
export const updateServicioSchema = z
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

/**
 * Params de las rutas nuevas (correccion C5: `servicioId` ausente ->
 * 400 `servicioId es requerido`, patron `membresiaId es requerido`).
 */
export const servicioParamsSchema = z.object({
  clienteId: z
    .string({ required_error: "clienteId es requerido" })
    .min(1, "clienteId es requerido"),
  servicioId: z
    .string({ required_error: "servicioId es requerido" })
    .min(1, "servicioId es requerido")
    .optional(),
});

/** Tipo de servicio de las rutas nuevas (DEC-004: servicios separados). */
export const TIPOS_SERVICIO = ["PERSONALIZADO", "NUTRICION"] as const;
export type TipoServicioPropio = (typeof TIPOS_SERVICIO)[number];

export type CreateServicio = z.infer<typeof createServicioSchema>;
export type UpdateServicio = z.infer<typeof updateServicioSchema>;
export type ServicioParams = z.infer<typeof servicioParamsSchema>;
