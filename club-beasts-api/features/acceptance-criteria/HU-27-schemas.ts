import { z } from "zod";

export const SIN_PLAN_MENSAJE_NUTRICION = "No tienes un plan nutricional activo";

export const portalPlanNutricionalResponseSchema = z.discriminatedUnion("estado", [
  z.object({
    estado: z.literal("ACTIVO"),
    plan: z.object({
      datosBiometricos: z.any(),
      objetivosCaloricos: z.number(),
      macronutrientes: z.any().nullable().optional(),
      tiemposComida: z.array(z.any()),
      recomendaciones: z.string().nullable().optional(),
      suplementacion: z.string().nullable().optional(),
    }),
  }),
  z.object({ estado: z.literal("SIN_PLAN"), mensaje: z.literal(SIN_PLAN_MENSAJE_NUTRICION) }),
]);

export type PortalPlanNutricionalResponse = z.infer<typeof portalPlanNutricionalResponseSchema>;