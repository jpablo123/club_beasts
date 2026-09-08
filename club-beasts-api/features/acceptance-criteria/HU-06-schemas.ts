import { z } from "zod";

// Enum de estados de cliente
const clienteEstadoEnum = z.enum(["NUEVO", "ACTIVO", "SUSPENDIDO", "RETIRADO", "INACTIVO"]);

// Schema de query de búsqueda de clientes
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
    .refine((val) => !val || (parseInt(val, 10) >= 1 && !isNaN(parseInt(val, 10))), {
      message: "page debe ser un entero mayor o igual a 1",
    }),
  limit: z
    .string()
    .optional()
    .refine((val) => !val || (parseInt(val, 10) >= 1 && parseInt(val, 10) <= 100 && !isNaN(parseInt(val, 10))), {
      message: "limit debe ser un entero entre 1 y 100",
    }),
});

// Tipos inferidos (parcial, ya que es query string)
export type SearchClientesQuery = z.infer<typeof searchClientesSchema>;
