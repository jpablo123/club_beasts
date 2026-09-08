import { z } from "zod";

// Schema de login de usuario interno
export const loginUserSchema = z.object({
  email: z
    .string({ required_error: "Email es requerido" })
    .min(1, "Email es requerido")
    .max(254, "Email no puede exceder 254 caracteres")
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Email tiene formato inválido"),
  password: z
    .string({ required_error: "Contraseña es requerida" })
    .min(1, "Contraseña es requerida")
    .max(128, "Contraseña no puede exceder 128 caracteres"),
});

// Tipos inferidos
export type LoginUser = z.infer<typeof loginUserSchema>;
