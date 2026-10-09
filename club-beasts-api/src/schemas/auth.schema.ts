import { z } from "zod";

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

export const changePinSchema = z.object({
  currentPin: z
    .string({ required_error: "PIN actual es requerido" })
    .min(1, "PIN actual es requerido")
    .regex(/^\d{4}$/, "PIN debe ser de 4 dígitos"),
  newPin: z
    .string({ required_error: "Nuevo PIN es requerido" })
    .min(1, "Nuevo PIN es requerido")
    .regex(/^\d{4}$/, "PIN debe ser de 4 dígitos"),
});

export type LoginUser = z.infer<typeof loginUserSchema>;
export type LoginClient = z.infer<typeof loginClientSchema>;
export type ResetPin = z.infer<typeof resetPinSchema>;
export type ChangePin = z.infer<typeof changePinSchema>;
