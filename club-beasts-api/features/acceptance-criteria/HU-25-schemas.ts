import { z } from "zod";

/**
 * HU-25 - Esquemas del resumen del portal del cliente.
 * Contrato propuesto: GET /portal/resumen (sin parametros; identidad desde el token).
 * Sin dependencias propias del proyecto: solo `zod` (patron HU-04-schemas.ts).
 * Pendiente de spec en docs/incrementos/INC-03/spec.md (DEC-016).
 */

// Constantes compartidas dentro del archivo (no importan de src/ para evitar dependencias inexistentes)
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

/**
 * Estado de acceso al gym calculado por el backend.
 * - PROGRAMADA / ACTIVA / VENCIDA / CONGELADO: salida de `calcularEstado`
 *   (`membresia.service.ts:18-40`; CONGELADO habilitado con INC-02, ACEPTADO 2026-10-08).
 * - SIN_VIGENCIA: cliente sin filas en MembresiaGym (HU25-C06).
 */
export const estadoAccesoGymEnum = z.enum([
  "PROGRAMADA",
  "ACTIVA",
  "VENCIDA",
  "CONGELADO",
  "SIN_VIGENCIA",
]);

// Resumen del portal: respuesta de GET /portal/resumen
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
  estadoAccesoGym: estadoAccesoGymEnum,
  fechaVencimiento: fechaDate.nullable(),
  // Rango de congelacion: persistido en MembresiaGymCambio (schema.prisma:89-91),
  // habilitado por INC-02 (ACEPTADO 2026-10-08). Null cuando el cliente no tiene pausa.
  congelacion: z
    .object({
      fechaInicio: fechaDate,
      fechaFin: fechaDate,
    })
    .nullable(),
  // Dia actual en America/Bogota (DEC-005), para que el cliente vea la base del calculo.
  fechaActual: fechaDate,
});

// Cuerpo de error estandar de la API ({ error, code } - src/lib/errors.ts)
export const portalErrorSchema = z.object({
  error: z.string(),
  code: z.string(),
});

export type EstadoAccesoGym = z.infer<typeof estadoAccesoGymEnum>;
export type PortalResumenResponse = z.infer<typeof portalResumenResponseSchema>;
export type PortalError = z.infer<typeof portalErrorSchema>;
