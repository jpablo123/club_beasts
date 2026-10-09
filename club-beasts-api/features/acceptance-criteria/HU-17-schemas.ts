import { z } from "zod";

/**
 * Contrato propuesto para HU-17 — Gestión de estados generales del cliente.
 * Generado por acceptance-criteria-analyst (modo CREAR, G14).
 *
 * Fuente: `HU-17-criterios-aceptacion.md` + DEC-001 (roles), DEC-020
 * (INACTIVO → reactivación), DEC-016 (fraccionable).
 *
 * Autónomo: solo depende de `zod` (patrón de HU-04/HU-05-schemas.ts).
 * Hoy NO está importado por `src/`; es el contrato previsto para INC-04.
 */

/** Espejo de `src/schemas/common.schema.ts:48`. */
export const clienteEstadoEnum = z.enum([
  "NUEVO",
  "ACTIVO",
  "SUSPENDIDO",
  "RETIRADO",
  "INACTIVO",
]);

/** Motivo del cambio de estado (HU17-C02): 3..200 caracteres. */
export const motivoCambioEstadoSchema = z
  .string({ required_error: "Motivo es requerido cuando cambia el estado" })
  .min(3, "Motivo debe tener al menos 3 caracteres")
  .max(200, "Motivo no puede exceder 200 caracteres");

/**
 * Cambio de estado completo (HU17-C02a/C02b):
 * `estado` y `motivo` van juntos siempre.
 */
export const cambioEstadoClienteSchema = z.object({
  estado: clienteEstadoEnum,
  motivo: motivoCambioEstadoSchema,
});

/**
 * PATCH /clientes/:id (edición + cambio de estado) con la regla de motivo.
 *
 * ⚠ P-01 PENDIENTE: el `.superRefine` asume la lectura LITERAL de la HU
 * ("registra motivo cuando el estado cambia" → motivo obligatorio en todo
 * cambio). Si Producto lo restringe a INACTIVO/SUSPENDIDO/RETIRADO, eliminar
 * el refine y exigir el motivo en el servicio solo para esas transiciones.
 * Ver impacto detallado en `HU-17-criterios-aceptacion.md` (P-01).
 */
export const updateClienteConMotivoSchema = z
  .object({
    nombres: z
      .string()
      .max(100, "Nombres no pueden exceder 100 caracteres")
      .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, "Nombres solo pueden contener letras y espacios")
      .optional(),
    apellidos: z
      .string()
      .max(100, "Apellidos no pueden exceder 100 caracteres")
      .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, "Apellidos solo pueden contener letras y espacios")
      .optional(),
    telefono: z
      .string()
      .regex(/^3\d{9}$/, "Teléfono debe ser móvil colombiano (3XXXXXXXXX)")
      .optional(),
    email: z
      .string()
      .max(254, "Email no puede exceder 254 caracteres")
      .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Email tiene formato inválido")
      .optional()
      .or(z.literal("")),
    sedeId: z.string().max(36, "sedeId excede longitud máxima").optional(),
    observaciones: z
      .string()
      .max(500, "Observaciones no pueden exceder 500 caracteres")
      .optional()
      .or(z.literal("")),
    estado: clienteEstadoEnum.optional(),
    motivo: motivoCambioEstadoSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.estado !== undefined && data.motivo === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["motivo"],
        message: "Motivo es requerido cuando cambia el estado",
      });
    }
  });

/**
 * Registro del historial de cambios de estado (HU17-C03).
 * Modelo a definir por database-admin: no existe hoy en `prisma/schema.prisma`;
 * el patrón de referencia es `MembresiaGymCambio` (líneas 78-93).
 */
export const clienteEstadoCambioSchema = z.object({
  id: z.string(),
  clienteId: z.string(),
  estadoAnterior: clienteEstadoEnum.nullable(),
  estadoNuevo: clienteEstadoEnum,
  motivo: motivoCambioEstadoSchema,
  actor: z.object({ id: z.string(), nombre: z.string() }),
  createdAt: z.string(),
});

/** Respuesta de PATCH /clientes/:id cuando cambia el estado (HU17-C02a). */
export const respuestaCambioEstadoSchema = z.object({
  id: z.string(),
  cedula: z.string(),
  estado: clienteEstadoEnum,
  motivo: motivoCambioEstadoSchema.nullable(),
  actualizadoPorId: z.string().nullable(),
  updatedAt: z.string(),
  ultimoCambio: clienteEstadoCambioSchema,
});

/**
 * Respuesta de la ficha con historial de estados visible
 * (HU17-C03: el historial crece y nunca se elimina).
 */
export const fichaConHistorialEstadosSchema = z.object({
  id: z.string(),
  cedula: z.string(),
  estado: clienteEstadoEnum,
  historialEstados: z.array(clienteEstadoCambioSchema),
});

/**
 * Respuesta cuando la transición de estado no está permitida (HU17-C04).
 * ⚠ P-04: la matriz de transiciones requiere aprobación de Producto antes de
 * implementar/probar este caso (ver matriz en `HU-17-criterios-aceptacion.md`).
 */
export const transicionInvalidaResponseSchema = z.object({
  error: z.string(),
  code: z.literal("TRANSICION_INVALIDA"),
});

/** Cuerpo de error genérico del API (contrato existente `{ error, code }`). */
export const errorResponseSchema = z.object({
  error: z.string(),
  code: z.string(),
});

/**
 * Matriz de transiciones aprobadas (HU17-C04). Solo las claves marcadas `true`
 * son implementables hoy; las pendientes de P-04 se excluyen hasta aprobación.
 * Datos de referencia para service + tests; no es un payload HTTP.
 */
export const transicionesAprobadas: Record<string, Record<string, boolean>> = {
  NUEVO: { ACTIVO: true, SUSPENDIDO: true, RETIRADO: true, INACTIVO: true },
  ACTIVO: { SUSPENDIDO: true, RETIRADO: true, INACTIVO: true },
  SUSPENDIDO: { ACTIVO: true, RETIRADO: true, INACTIVO: true },
  RETIRADO: {}, // P-04: ¿terminal o admite reingreso?
  INACTIVO: { ACTIVO: true }, // DEC-020
};

// Tipos inferidos
export type ClienteEstado = z.infer<typeof clienteEstadoEnum>;
export type MotivoCambioEstado = z.infer<typeof motivoCambioEstadoSchema>;
export type CambioEstadoCliente = z.infer<typeof cambioEstadoClienteSchema>;
export type UpdateClienteConMotivo = z.infer<typeof updateClienteConMotivoSchema>;
export type ClienteEstadoCambio = z.infer<typeof clienteEstadoCambioSchema>;
export type RespuestaCambioEstado = z.infer<typeof respuestaCambioEstadoSchema>;
export type FichaConHistorialEstados = z.infer<typeof fichaConHistorialEstadosSchema>;
export type TransicionInvalidaResponse = z.infer<
  typeof transicionInvalidaResponseSchema
>;
