import { z } from "zod";
import { createPlanNutricionalSchema } from "./HU-22-schemas";

export const planNutricionalHistorialItemSchema = z.object({
  asignacionId: z.string().min(1),
  planId: z.string().min(1),
  fechaInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fechaFin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  estado: z.enum(["ACTIVA", "CERRADA"]),
  actorId: z.string().min(1),
  snapshot: createPlanNutricionalSchema,
});

export const planNutricionalHistorialSchema = z.array(planNutricionalHistorialItemSchema);

export const planNutricionalActivaResponseSchema = z.discriminatedUnion("marcador", [
  z.object({ marcador: z.literal("ACTIVA"), plan: planNutricionalHistorialItemSchema }),
  z.object({ marcador: z.literal("SIN_PLAN") }),
  z.object({ marcador: z.literal("OCULTA_POR_VIGENCIA") }),
]);

export type PlanNutricionalHistorialItem = z.infer<typeof planNutricionalHistorialItemSchema>;