import { z } from "zod";

export const enviarNotificacionesSchema = z.object({
  diasAntes: z.number().int().min(1).max(30).default(3),
});

export const notificacionEnvioSchema = z.object({
  clienteId: z.string().min(1),
  servicioId: z.string().min(1),
  fechaVencimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tipoAviso: z.enum(["DIAS_ANTES", "DIA_VENCIMIENTO"]),
});

export const notificacionResponseSchema = z.object({
  enviados: z.number().int().min(0),
  omitidos: z.number().int().min(0),
  total: z.number().int().min(0),
});

export type EnviarNotificaciones = z.infer<typeof enviarNotificacionesSchema>;
export type NotificacionEnvio = z.infer<typeof notificacionEnvioSchema>;
export type NotificacionResponse = z.infer<typeof notificacionResponseSchema>;
