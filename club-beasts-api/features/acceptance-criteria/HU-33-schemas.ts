import { z } from "zod";

export const conteosQuerySchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const conteosResponseSchema = z.object({
  sedeId: z.string().min(1).max(36),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  clientesActivos: z.number().int().min(0),
  clientesVencidos: z.number().int().min(0),
  clientesCongelados: z.number().int().min(0),
  ingresosHoy: z.number().int().min(0),
});

export type ConteosQuery = z.infer<typeof conteosQuerySchema>;
export type ConteosResponse = z.infer<typeof conteosResponseSchema>;
