import { z } from "zod";

// Enum de estados de cliente
const clienteEstadoEnum = z.enum(["NUEVO", "ACTIVO", "SUSPENDIDO", "RETIRADO", "INACTIVO"]);

// Schema de actualización de cliente (todos opcionales)
export const updateClienteSchema = z.object({
  nombres: z
    .string()
    .min(1, "Nombres no pueden estar vacíos")
    .max(100, "Nombres no pueden exceder 100 caracteres")
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, "Nombres solo pueden contener letras y espacios")
    .optional(),
  apellidos: z
    .string()
    .min(1, "Apellidos no pueden estar vacíos")
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
  sedeId: z
    .string()
    .max(36, "sedeId excede longitud máxima")
    .optional(),
  estado: clienteEstadoEnum.optional(),
  observaciones: z
    .string()
    .max(500, "Observaciones no pueden exceder 500 caracteres")
    .optional()
    .or(z.literal("")),
});

// Tipos inferidos
export type UpdateCliente = z.infer<typeof updateClienteSchema>;
