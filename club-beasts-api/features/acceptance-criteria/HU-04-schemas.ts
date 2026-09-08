import { z } from "zod";

// Schema de creación de cliente
export const createClienteSchema = z.object({
  cedula: z
    .string({ required_error: "Cédula es requerida" })
    .min(1, "Cédula es requerida")
    .regex(/^\d{6,10}$/, "Cédula debe ser numérica de 6 a 10 dígitos"),
  nombres: z
    .string({ required_error: "Nombres son requeridos" })
    .min(1, "Nombres son requeridos")
    .max(100, "Nombres no pueden exceder 100 caracteres")
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, "Nombres solo pueden contener letras y espacios"),
  apellidos: z
    .string({ required_error: "Apellidos son requeridos" })
    .min(1, "Apellidos son requeridos")
    .max(100, "Apellidos no pueden exceder 100 caracteres")
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, "Apellidos solo pueden contener letras y espacios"),
  telefono: z
    .string({ required_error: "Teléfono es requerido" })
    .min(1, "Teléfono es requerido")
    .regex(/^3\d{9}$/, "Teléfono debe ser móvil colombiano (3XXXXXXXXX)"),
  email: z
    .string()
    .max(254, "Email no puede exceder 254 caracteres")
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Email tiene formato inválido")
    .optional()
    .or(z.literal("")),
  sedeId: z
    .string({ required_error: "sedeId es requerido" })
    .min(1, "sedeId es requerido")
    .max(36, "sedeId excede longitud máxima"),
  observaciones: z
    .string()
    .max(500, "Observaciones no pueden exceder 500 caracteres")
    .optional()
    .or(z.literal("")),
});

// Schema de actualización (todos opcionales)
export const updateClienteSchema = createClienteSchema.partial();

// Tipos inferidos
export type CreateCliente = z.infer<typeof createClienteSchema>;
export type UpdateCliente = z.infer<typeof updateClienteSchema>;
