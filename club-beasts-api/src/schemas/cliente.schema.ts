import { z } from "zod";
import {
  cedulaSchema,
  telefonoSchema,
  emailSchema,
  namesSchemaFor,
  clienteEstadoEnum,
} from "./common.schema.js";

export const createClienteSchema = z.object({
  cedula: cedulaSchema,
  nombres: namesSchemaFor("Nombres").describe("Nombres son requeridos"),
  apellidos: namesSchemaFor("Apellidos").describe("Apellidos son requeridos"),
  telefono: telefonoSchema,
  email: emailSchema,
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

/**
 * INC00-CLI-03: limpieza intencional de opcionales en la actualizacion.
 * `""` y strings en blanco se convierten en `null` antes de validar.
 */
const blankToNull = (value: unknown): unknown =>
  typeof value === "string" && value.trim() === "" ? null : value;

export const updateClienteSchema = z.object({
  nombres: namesSchemaFor("Nombres").optional(),
  apellidos: namesSchemaFor("Apellidos").optional(),
  telefono: z
    .string()
    .regex(/^3\d{9}$/, "Teléfono debe ser móvil colombiano (3XXXXXXXXX)")
    .optional(),
  email: z.preprocess(blankToNull, emailSchema.nullable()),
  sedeId: z
    .string()
    .max(36, "sedeId excede longitud máxima")
    .optional(),
  estado: clienteEstadoEnum.optional(),
  observaciones: z.preprocess(
    blankToNull,
    z
      .string()
      .max(500, "Observaciones no pueden exceder 500 caracteres")
      .optional()
      .or(z.literal(""))
      .nullable()
  ),
});

export const searchClientesSchema = z.object({
  search: z
    .string()
    .max(200, "Búsqueda no puede exceder 200 caracteres")
    .optional(),
  sedeId: z
    .string()
    .max(36, "sedeId excede longitud máxima")
    .optional(),
  estado: clienteEstadoEnum.optional(),
  page: z
    .string()
    .optional()
    .refine(
      (val) => !val || (parseInt(val, 10) >= 1 && !isNaN(parseInt(val, 10))),
      { message: "page debe ser un entero mayor o igual a 1" }
    ),
  limit: z
    .string()
    .optional()
    .refine(
      (val) =>
        !val ||
        (parseInt(val, 10) >= 1 &&
          parseInt(val, 10) <= 100 &&
          !isNaN(parseInt(val, 10))),
      { message: "limit debe ser un entero entre 1 y 100" }
    ),
});

export const clienteParamsSchema = z.object({
  id: z
    .string({ required_error: "id es requerido" })
    .min(1, "id es requerido")
    .max(36, "id excede longitud máxima"),
});

export type CreateCliente = z.infer<typeof createClienteSchema>;
export type UpdateCliente = z.infer<typeof updateClienteSchema>;
export type SearchClientesQuery = z.infer<typeof searchClientesSchema>;
export type ClienteParams = z.infer<typeof clienteParamsSchema>;
