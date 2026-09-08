import { z } from "zod";

// Schema de login de cliente
export const loginClientSchema = z.object({
  cedula: z
    .string({ required_error: "Cédula es requerida" })
    .min(1, "Cédula es requerida")
    .regex(/^\d{6,10}$/, "Cédula debe ser numérica de 6 a 10 dígitos"),
  pin: z
    .string({ required_error: "PIN es requerido" })
    .min(1, "PIN es requerido")
    .regex(/^\d{4}$/, "PIN debe ser de 4 dígitos"),
});

// Tipos inferidos
export type LoginClient = z.infer<typeof loginClientSchema>;
