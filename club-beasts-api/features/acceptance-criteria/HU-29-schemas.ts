import { z } from "zod";

/**
 * HU-29 - Esquemas de la consulta de recepcion por cedula.
 * Contrato propuesto: GET /recepcion/consulta?cedula=<cedula>
 *   preHandler: authenticateRoles(["DUENO", "RECEPCIONISTA"])  (DEC-001)
 * Solo depende de `zod` (patron HU-04-schemas.ts).
 * Pendiente de spec en docs/incrementos/INC-03/spec.md (DEC-016).
 */

const fechaDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha debe tener formato YYYY-MM-DD");

const horaTime = z
  .string()
  .regex(
    /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/,
    "Hora debe tener formato HH:mm o HH:mm:ss"
  );

// Mismo criterio de cedula que HU-04 / DEC-002 (src/schemas/common.schema.ts:3-6)
const cedulaSchema = z
  .string({ required_error: "Cédula es requerida" })
  .min(1, "Cédula es requerida")
  .regex(/^\d{6,10}$/, "Cédula debe ser numérica de 6 a 10 dígitos");

// Query de la consulta
export const consultaCedulaQuerySchema = z.object({
  cedula: cedulaSchema,
});

/**
 * Estado de acceso al gym (mismo enum que HU-25).
 * CONGELADO habilitado (INC-02 ACEPTADO 2026-10-08); SIN_VIGENCIA = sin filas MembresiaGym.
 */
export const estadoAccesoGymEnum = z.enum([
  "PROGRAMADA",
  "ACTIVA",
  "VENCIDA",
  "CONGELADO",
  "SIN_VIGENCIA",
]);

// Respuesta 200 de la consulta de recepcion
export const consultaRecepcionResponseSchema = z.object({
  id: z.string().min(1).max(36),
  nombreCompleto: z
    .string()
    .min(2)
    .max(201)
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, "Nombre completo solo contiene letras y espacios"),
  cedula: cedulaSchema,
  sede: z.object({
    id: z.string().min(1).max(36),
    nombre: z.string().min(1).max(100),
  }),
  // Foto opcional (HU29-AB-02): hoy siempre null porque Cliente.foto no existe.
  foto: z.string().url("Foto debe ser una URL válida").nullable(),
  estadoAccesoGym: estadoAccesoGymEnum,
  fechaVencimiento: fechaDate.nullable(),
  congelacion: z
    .object({
      fechaInicio: fechaDate,
      fechaFin: fechaDate,
    })
    .nullable(),
  // Ultimo ingreso: depende de la entidad Ingreso creada por HU-30 (HU29-C04).
  ultimoIngreso: z
    .object({
      fecha: fechaDate,
      hora: horaTime,
      sede: z.object({
        id: z.string().min(1).max(36),
        nombre: z.string().min(1).max(100),
      }),
    })
    .nullable(),
  // HU29-C05: BLOQUEADO por HU29-AB-01 (definicion de alerta operativa).
  // Forma provisional: [] hasta que Producto apruebe las reglas.
  alertas: z.array(
    z.object({
      codigo: z.enum(["ESTADO_CLIENTE", "MEMBRESIA_VENCIDA"]),
      mensaje: z.string().min(1).max(200),
    })
  ),
  fechaActual: fechaDate,
});

// Cuerpo de error estandar ({ error, code } - src/lib/errors.ts)
export const consultaRecepcionErrorSchema = z.object({
  error: z.string(),
  code: z.enum([
    "VALIDATION_ERROR",
    "NOT_FOUND",
    "AUTH_FORBIDDEN",
    "AUTH_TOKEN_MISSING",
    "AUTH_TOKEN_INVALID",
    "AUTH_TOKEN_EXPIRED",
  ]),
});

export type ConsultaCedulaQuery = z.infer<typeof consultaCedulaQuerySchema>;
export type EstadoAccesoGym = z.infer<typeof estadoAccesoGymEnum>;
export type ConsultaRecepcionResponse = z.infer<
  typeof consultaRecepcionResponseSchema
>;
export type ConsultaRecepcionError = z.infer<
  typeof consultaRecepcionErrorSchema
>;
