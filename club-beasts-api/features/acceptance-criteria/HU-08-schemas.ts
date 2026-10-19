import { z } from "zod";

/**
 * Contrato propuesto para HU-08 — Inactivación de clientes sin borrado físico.
 * Generado por acceptance-criteria-analyst (modo CREAR, G14).
 *
 * Fuente: `HU-08-criterios-aceptacion.md` + DEC-001 (roles), DEC-002 (cédula),
 * DEC-020 (reactivación por DUENO/RECEPCIONISTA).
 *
 * Autónomo: solo depende de `zod` (mismo patrón que HU-04-schemas.ts /
 * HU-05-schemas.ts). Hoy NO está importado por `src/`; es el contrato previsto
 * para el incremento INC-04.
 */

/** Espejo de `src/schemas/common.schema.ts:48` (enum de estados del cliente). */
export const clienteEstadoEnum = z.enum([
  "NUEVO",
  "ACTIVO",
  "SUSPENDIDO",
  "RETIRADO",
  "INACTIVO",
]);

/**
 * Motivo del cambio de estado (HU08-C03, HU17-C02).
 * Límites: 3 (mín aceptado) .. 200 (máx aceptado); 2 y 201 fallan.
 */
export const motivoCambioEstadoSchema = z
  .string({ required_error: "Motivo es requerido cuando cambia el estado" })
  .min(3, "Motivo debe tener al menos 3 caracteres")
  .max(200, "Motivo no puede exceder 200 caracteres");

/**
 * Body mínimo para un cambio de estado (HU08-C01/C03).
 * Uso directo: PATCH /clientes/:id cuando el único objetivo es cambiar estado.
 */
export const cambioEstadoClienteSchema = z.object({
  estado: clienteEstadoEnum,
  motivo: motivoCambioEstadoSchema,
});

/**
 * PATCH /clientes/:id completo: edición de datos + cambio de estado.
 *
 * Regla HU08-C03 / HU17-C02: si el request trae `estado`, `motivo` es
 * obligatorio (incluso si el estado resultara igual al actual: el servicio,
 * que conoce el estado vigente, decide si el cambio es no-op).
 *
 * DEC-035 aplicada (opción (a), 2026-10-14): la obligatoriedad universal del
 * motivo (este `.superRefine`) es **contrato decidido**, no una duda abierta.
 * Impacto documentado como cambio de contrato (no regresión): afecta tests ya
 * aceptados de HU-05 que cambian estado sin motivo
 * (`tests/unit/cliente.schema.test.ts:150-155`,
 * `tests/integration/clientes.test.ts:426/456`,
 * `tests/integration/features.test.ts:339` — runner Gherkin 63/63) y el
 * formulario web (`club-beasts-web/src/lib/cliente-payload.ts:41`): se
 * **actualizan** en el RED, nunca se eliminan (riesgo `INC04-R01`;
 * enmienda D3 — antes: "P-01 PENDIENTE DE CONFIRMACIÓN").
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
 * Registro del historial de cambios de estado (HU08-C02, HU17-C03).
 * Modelo de datos a definir por database-admin (no existe hoy en
 * `prisma/schema.prisma`; solo existe `MembresiaGymCambio` como patrón).
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

/**
 * Respuesta de PATCH /clientes/:id cuando cambia el estado (HU08-C03).
 * Amplía la respuesta actual (que no expone motivo) de forma aditiva.
 */
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
 * Respuesta de POST /auth/login-cliente cuando el cliente está INACTIVO
 * (HU08-C04a). Se valida primero cédula+PIN; solo con credenciales correctas
 * se emite este código (evita enumerar cédulas).
 */
export const loginClienteInactivoResponseSchema = z.object({
  error: z.string(),
  code: z.literal("AUTH_CLIENTE_INACTIVO"),
});

/**
 * Respuesta cuando se intenta asignar un servicio nuevo (p. ej. vigencia gym)
 * a un cliente INACTIVO (HU08-C04b).
 */
export const clienteInactivoResponseSchema = z.object({
  error: z.string(),
  code: z.literal("CLIENTE_INACTIVO"),
});

/** Cuerpo de error genérico del API (contrato existente `{ error, code }`). */
export const errorResponseSchema = z.object({
  error: z.string(),
  code: z.string(),
});

// Tipos inferidos
export type ClienteEstado = z.infer<typeof clienteEstadoEnum>;
export type MotivoCambioEstado = z.infer<typeof motivoCambioEstadoSchema>;
export type CambioEstadoCliente = z.infer<typeof cambioEstadoClienteSchema>;
export type UpdateClienteConMotivo = z.infer<typeof updateClienteConMotivoSchema>;
export type ClienteEstadoCambio = z.infer<typeof clienteEstadoCambioSchema>;
export type RespuestaCambioEstado = z.infer<typeof respuestaCambioEstadoSchema>;
export type LoginClienteInactivoResponse = z.infer<
  typeof loginClienteInactivoResponseSchema
>;
export type ClienteInactivoResponse = z.infer<typeof clienteInactivoResponseSchema>;
