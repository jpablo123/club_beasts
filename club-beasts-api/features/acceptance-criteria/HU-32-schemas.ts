import { z } from "zod";

export const historialQuerySchema = z.object({
  tipo: z.enum(["RUTINA", "PLAN_NUTRICIONAL", "INGRESO"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const historialItemSchema = z.object({
  tipo: z.enum(["RUTINA", "PLAN_NUTRICIONAL", "INGRESO"]),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  createdAt: z.string(),
  actor: z.object({ id: z.string(), nombre: z.string() }).optional(),
  resumen: z.string().optional(),
});

export const historialResponseSchema = z.object({
  items: z.array(historialItemSchema),
  total: z.number().int().min(0),
});

export type HistorialQuery = z.infer<typeof historialQuerySchema>;
export type HistorialItem = z.infer<typeof historialItemSchema>;
export type HistorialResponse = z.infer<typeof historialResponseSchema>;
