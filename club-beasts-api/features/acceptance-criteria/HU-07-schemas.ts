import { z } from "zod";

// Schema de parámetros para obtener ficha de cliente
export const clienteParamsSchema = z.object({
  id: z
    .string({ required_error: "id es requerido" })
    .min(1, "id es requerido")
    .max(36, "id excede longitud máxima"),
});

// Schema de respuesta de ficha de cliente (validación de salida)
export const clienteFichaSchema = z.object({
  id: z.string(),
  cedula: z.string(),
  nombres: z.string(),
  apellidos: z.string(),
  telefono: z.string(),
  email: z.string().nullable(),
  estado: z.string(),
  observaciones: z.string().nullable(),
  sede: z.object({
    id: z.string(),
    nombre: z.string(),
    direccion: z.string().nullable(),
  }),
  membresias: z.array(
    z.object({
      id: z.string(),
      tipo: z.enum(["GYM", "PERSONALIZADO", "NUTRICION"]),
      fechaInicio: z.string().datetime(),
      fechaFin: z.string().datetime(),
      estado: z.string(),
    })
  ),
  rutinaActiva: z
    .object({
      id: z.string(),
      nombre: z.string(),
    })
    .nullable(),
  planNutricionalActivo: z
    .object({
      id: z.string(),
      nombre: z.string(),
    })
    .nullable(),
  notasInternas: z.array(
    z.object({
      id: z.string(),
      contenido: z.string(),
      createdAt: z.string().datetime(),
    })
  ),
  historial: z.array(
    z.object({
      id: z.string(),
      accion: z.string(),
      fecha: z.string().datetime(),
      usuario: z.string(),
    })
  ),
});

// Tipos inferidos
export type ClienteParams = z.infer<typeof clienteParamsSchema>;
export type ClienteFicha = z.infer<typeof clienteFichaSchema>;
