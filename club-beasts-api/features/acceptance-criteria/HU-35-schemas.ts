import { z } from "zod";

export const cancelarVigenciaSchema = z.object({
  vigenciaId: z.string().uuid("ID de vigencia inválido"),
  confirmar: z.boolean().refine((v) => v === true, "Debe confirmar la cancelación"),
});

export type CancelarVigencia = z.infer<typeof cancelarVigenciaSchema>;
