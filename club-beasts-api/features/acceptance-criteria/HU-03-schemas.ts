import { z } from "zod";

// Schema de restablecimiento de PIN
export const resetPinSchema = z.object({
  clienteId: z
    .string({ required_error: "clienteId es requerido" })
    .min(1, "clienteId es requerido")
    .max(36, "clienteId excede longitud máxima"),
  newPin: z
    .string({ required_error: "newPin es requerido" })
    .min(1, "newPin es requerido")
    .regex(/^\d{4}$/, "PIN debe ser de 4 dígitos"),
});

// Tipos inferidos
export type ResetPin = z.infer<typeof resetPinSchema>;
