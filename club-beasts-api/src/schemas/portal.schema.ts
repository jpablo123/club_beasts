import { z } from "zod";

/**
 * INC-03 (HU-25) — esquema de la respuesta de `GET /portal/resumen`.
 *
 * Equivalente en `src/` del contrato G14
 * (`features/acceptance-criteria/HU-25-schemas.ts`), sin importar desde
 * `features/` (patron de los schemas de `src/schemas/`).
 */

export const estadoAccesoGymSchema = z.enum([
  "PROGRAMADA",
  "ACTIVA",
  "VENCIDA",
  "CONGELADO",
  "SIN_VIGENCIA",
]);

const fechaDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha debe tener formato YYYY-MM-DD");

const cedulaSchema = z
  .string()
  .min(1, "Cédula es requerida")
  .regex(/^\d{6,10}$/, "Cédula debe ser numérica de 6 a 10 dígitos");

const namesSchema = z
  .string()
  .min(1, "Campo requerido")
  .max(100, "No puede exceder 100 caracteres")
  .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, "Solo puede contener letras y espacios");

export const portalResumenResponseSchema = z.object({
  cliente: z.object({
    id: z.string().min(1).max(36),
    nombres: namesSchema,
    apellidos: namesSchema,
    cedula: cedulaSchema,
    sede: z.object({
      id: z.string().min(1).max(36),
      nombre: z.string().min(1).max(100),
    }),
  }),
  estadoAccesoGym: estadoAccesoGymSchema,
  fechaVencimiento: fechaDate.nullable(),
  congelacion: z
    .object({
      fechaInicio: fechaDate,
      fechaFin: fechaDate,
    })
    .nullable(),
  fechaActual: fechaDate,
});

export type EstadoAccesoGym = z.infer<typeof estadoAccesoGymSchema>;
export type PortalResumenResponse = z.infer<typeof portalResumenResponseSchema>;
