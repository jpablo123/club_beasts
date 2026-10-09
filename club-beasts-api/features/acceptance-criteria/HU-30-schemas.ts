import { z } from "zod";

/**
 * HU-30 - Esquemas del registro de ingresos en recepcion.
 * Contrato propuesto:
 *   POST /recepcion/ingresos            -> 201 ingresoResponseSchema
 *   GET  /recepcion/ingresos?cedula=... -> 200 ingresosListResponseSchema
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

const cedulaSchema = z
  .string({ required_error: "Cédula es requerida" })
  .min(1, "Cédula es requerida")
  .regex(/^\d{6,10}$/, "Cédula debe ser numérica de 6 a 10 dígitos");

const sedeIdSchema = z
  .string({ required_error: "sedeId es requerido" })
  .min(1, "sedeId es requerido")
  .max(36, "sedeId excede longitud máxima");

// ---------------------------------------------------------------------------
// POST /recepcion/ingresos
// ---------------------------------------------------------------------------
export const crearIngresoSchema = z.object({
  cedula: cedulaSchema,
  sedeId: sedeIdSchema,
});

export const ingresoResponseSchema = z.object({
  id: z.string().min(1).max(36),
  clienteId: z.string().min(1).max(36),
  cedula: cedulaSchema,
  // Dia y hora en America/Bogota (DEC-005).
  fecha: fechaDate,
  hora: horaTime,
  sede: z.object({
    id: z.string().min(1).max(36),
    nombre: z.string().min(1).max(100),
  }),
  // Usuario autenticado que registro el ingreso (HU30-C03).
  registradoPor: z.object({
    id: z.string().min(1).max(36),
    nombre: z.string().min(1).max(100),
  }),
  createdAt: z.string(),
});

// ---------------------------------------------------------------------------
// GET /recepcion/ingresos?cedula=<cedula>[&fecha=YYYY-MM-DD]
// ---------------------------------------------------------------------------
export const listarIngresosQuerySchema = z.object({
  cedula: cedulaSchema,
  fecha: fechaDate.optional(),
});

export const ingresosListResponseSchema = z.object({
  ingresos: z.array(ingresoResponseSchema),
  total: z.number().int().min(0),
});

// ---------------------------------------------------------------------------
// Errores
// ---------------------------------------------------------------------------
// 403 INGRESO_NO_PERMITIDO: motivo por el que la membresia gym no esta habilitada
// (VENCIDA / PROGRAMADA / SIN_VIGENCIA). CONGELADO permite el ingreso (201) por DEC-025;
// si Producto enmienda DEC-025, CONGELADO vuelve a este motivo (ver HU30-AB-08).
// El efecto "vencido = sin
// acceso" se acredita en HU-16 (regla 3 de no duplicado de la auditoria).
export const ingresoErrorSchema = z.object({
  error: z.string(),
  code: z.enum([
    "VALIDATION_ERROR",
    "NOT_FOUND",
    "INGRESO_NO_PERMITIDO",
    "AUTH_FORBIDDEN",
    "AUTH_TOKEN_MISSING",
    "AUTH_TOKEN_INVALID",
    "AUTH_TOKEN_EXPIRED",
  ]),
});

export type CrearIngreso = z.infer<typeof crearIngresoSchema>;
export type IngresoResponse = z.infer<typeof ingresoResponseSchema>;
export type ListarIngresosQuery = z.infer<typeof listarIngresosQuerySchema>;
export type IngresosListResponse = z.infer<typeof ingresosListResponseSchema>;
export type IngresoError = z.infer<typeof ingresoErrorSchema>;
