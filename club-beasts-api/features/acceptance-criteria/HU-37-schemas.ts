import { z } from "zod";

export const servicioPersonalizadoSchema = z.object({
  duracionMeses: z.union([z.literal(1), z.literal(3), z.literal(6)]).optional(),
  fechaInicio: z.string().date("Fecha de inicio inválida"),
  fechaFin: z.string().date("Fecha de fin inválida"),
}).refine((d) => new Date(d.fechaFin) >= new Date(d.fechaInicio), {
  message: "fechaFin debe ser posterior o igual a fechaInicio",
  path: ["fechaFin"],
});

export type ServicioPersonalizado = z.infer<typeof servicioPersonalizadoSchema>;
