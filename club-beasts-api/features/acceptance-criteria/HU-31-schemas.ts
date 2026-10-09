import { z } from "zod";

/**
 * HU-31 - Esquemas de la creacion rapida de cliente desde recepcion.
 * Contrato propuesto:
 *   POST  /recepcion/clientes-rapidos -> 201 clienteRapidoResponseSchema
 *          preHandler: authenticateRoles(["DUENO", "RECEPCIONISTA"])  (DEC-001)
 *   PATCH /clientes/:id (ruta existente de HU-05) -> 200 con completitud
 * Solo depende de `zod` (patron HU-04-schemas.ts).
 * Pendiente de spec en docs/incrementos/INC-03/spec.md (DEC-016).
 */

// Mismos criterios de validacion que HU-04 (DEC-015 / common.schema.ts)
const cedulaSchema = z
  .string({ required_error: "Cédula es requerida" })
  .min(1, "Cédula es requerida")
  .regex(/^\d{6,10}$/, "Cédula debe ser numérica de 6 a 10 dígitos");

const namesSchemaFor = (label: "Nombres" | "Apellidos") =>
  z
    .string({ required_error: `${label} son requeridos` })
    .min(1, "Campo requerido")
    .max(100, `${label} no pueden exceder 100 caracteres`)
    .regex(
      /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/,
      `${label} solo pueden contener letras y espacios`
    );

const telefonoSchema = z
  .string({ required_error: "Teléfono es requerido" })
  .min(1, "Teléfono es requerido")
  .regex(/^3\d{9}$/, "Teléfono debe ser móvil colombiano (3XXXXXXXXX)");

const emailSchema = z
  .string()
  .max(254, "Email no puede exceder 254 caracteres")
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Email tiene formato inválido")
  .optional()
  .or(z.literal(""));

const sedeIdSchema = z
  .string({ required_error: "sedeId es requerido" })
  .min(1, "sedeId es requerido")
  .max(36, "sedeId excede longitud máxima");

// ---------------------------------------------------------------------------
// POST /recepcion/clientes-rapidos
// Conjunto MINIMO derivado de los NOT NULL de prisma/schema.prisma:35-44:
// cedula, nombres, apellidos, telefono, sedeId  (email y observaciones opcionales).
// Si Producto aprueba HU31-AB-01 (sede por defecto), sedeId pasa a opcional.
// ---------------------------------------------------------------------------
export const crearClienteRapidoSchema = z.object({
  cedula: cedulaSchema,
  nombres: namesSchemaFor("Nombres"),
  apellidos: namesSchemaFor("Apellidos"),
  telefono: telefonoSchema,
  sedeId: sedeIdSchema,
  email: emailSchema,
  observaciones: z
    .string()
    .max(500, "Observaciones no pueden exceder 500 caracteres")
    .optional()
    .or(z.literal("")),
});

// Respuesta 201 de la creacion rapida
export const clienteRapidoResponseSchema = z.object({
  id: z.string().min(1).max(36),
  cedula: cedulaSchema,
  nombres: namesSchemaFor("Nombres"),
  apellidos: namesSchemaFor("Apellidos"),
  telefono: z.string().regex(/^3\d{9}$/, "Teléfono debe ser móvil colombiano (3XXXXXXXXX)"),
  email: z.string().nullable(),
  sede: z.object({
    id: z.string().min(1).max(36),
    nombre: z.string().min(1).max(100),
  }),
  estado: z.literal("NUEVO"),
  // HU31-C02: marca de perfil a completar; exige Cliente.perfilPendiente (HU31-AB-02).
  perfilPendiente: z.boolean(),
  observaciones: z.string().nullable(),
  // Trazabilidad de HU-04/HU31-C06.
  creadoPor: z
    .object({
      id: z.string().min(1).max(36),
      nombre: z.string().min(1).max(100),
    })
    .nullable(),
});

// ---------------------------------------------------------------------------
// PATCH /clientes/:id  (completitud del perfil rapido - HU31-C03)
// Base: updateClienteSchema de HU-05. No se expone `perfilPendiente` aqui:
// la limpieza de la marca depende de HU31-AB-03 (decision de Producto).
// ---------------------------------------------------------------------------
export const completarPerfilSchema = z.object({
  nombres: namesSchemaFor("Nombres").optional(),
  apellidos: namesSchemaFor("Apellidos").optional(),
  telefono: z
    .string()
    .regex(/^3\d{9}$/, "Teléfono debe ser móvil colombiano (3XXXXXXXXX)")
    .optional(),
  email: emailSchema,
  sedeId: sedeIdSchema.optional(),
  observaciones: z
    .string()
    .max(500, "Observaciones no pueden exceder 500 caracteres")
    .optional()
    .or(z.literal("")),
});

export const clienteParamsSchema = z.object({
  id: z
    .string({ required_error: "id es requerido" })
    .min(1, "id es requerido")
    .max(36, "id excede longitud máxima"),
});

// Cuerpo de error estandar ({ error, code } - src/lib/errors.ts)
export const clienteRapidoErrorSchema = z.object({
  error: z.string(),
  code: z.enum([
    "VALIDATION_ERROR",
    "DUPLICATE",
    "NOT_FOUND",
    "AUTH_FORBIDDEN",
    "AUTH_TOKEN_MISSING",
    "AUTH_TOKEN_INVALID",
    "AUTH_TOKEN_EXPIRED",
  ]),
});

export type CrearClienteRapido = z.infer<typeof crearClienteRapidoSchema>;
export type ClienteRapidoResponse = z.infer<typeof clienteRapidoResponseSchema>;
export type CompletarPerfil = z.infer<typeof completarPerfilSchema>;
export type ClienteParams = z.infer<typeof clienteParamsSchema>;
export type ClienteRapidoError = z.infer<typeof clienteRapidoErrorSchema>;
