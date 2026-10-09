import { z } from "zod";

export const cedulaSchema = z
  .string()
  .min(1, "Cédula es requerida")
  .regex(/^\d{6,10}$/, "Cédula debe ser numérica de 6 a 10 dígitos");

export const telefonoSchema = z
  .string()
  .min(1, "Teléfono es requerido")
  .regex(/^3\d{9}$/, "Teléfono debe ser móvil colombiano (3XXXXXXXXX)");

export const emailSchema = z
  .string()
  .max(254, "Email no puede exceder 254 caracteres")
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Email tiene formato inválido")
  .optional()
  .or(z.literal(""));

export const pinSchema = z
  .string()
  .min(1, "PIN es requerido")
  .regex(/^\d{4}$/, "PIN debe ser de 4 dígitos");

export const namesSchema = z
  .string()
  .min(1, "Campo requerido")
  .max(100, "No puede exceder 100 caracteres")
  .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, "Solo puede contener letras y espacios");

/**
 * Fabrica el schema de nombres/apellidos distinguiendo el mensaje de error por campo
 * (HU-04 / escenario Gherkin C05): "Nombres solo pueden contener letras y espacios" y
 * "Apellidos solo pueden contener letras y espacios". Misma regex y mismos mensajes
 * de requerido/longitud que `namesSchema`.
 */
export function namesSchemaFor(label: "Nombres" | "Apellidos") {
  return z
    .string()
    .min(1, "Campo requerido")
    .max(100, "No puede exceder 100 caracteres")
    .regex(
      /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/,
      `${label} solo pueden contener letras y espacios`
    );
}

export const clienteEstadoEnum = z.enum([
  "NUEVO",
  "ACTIVO",
  "SUSPENDIDO",
  "RETIRADO",
  "INACTIVO",
]);
