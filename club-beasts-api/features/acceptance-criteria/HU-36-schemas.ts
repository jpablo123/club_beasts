import { z } from "zod";

export const asignarRutinaClientesSchema = z.object({
  clienteIds: z.array(z.string().uuid("ID de cliente inválido")).min(1, "Debe seleccionar al menos un cliente"),
});

export type AsignarRutinaClientes = z.infer<typeof asignarRutinaClientesSchema>;
