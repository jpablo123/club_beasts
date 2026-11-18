import { z } from "zod";

export const asignarPlanNutricionalSchema = z.object({
  clienteId: z.string().min(1, "Cliente requerido"),
  planId: z.string().min(1, "Plan requerido"),
  fechaInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha de inicio debe tener formato YYYY-MM-DD").optional(),
}).strict();

export const MENSAJES_ASIGNACION_PLAN = {
  SIN_VIGENCIA_NUTRICION: "El cliente no tiene el servicio de nutrición vigente: no se puede activar un plan nutricional",
  CLIENTE_INACTIVO: "Cliente sin estado activo: no se le pueden asignar planes nutricionales",
  PLAN_YA_ACTIVO: "El plan ya está activo para este cliente",
  FECHA_INICIO_FUTURA: "Fecha de inicio no puede ser futura",
} as const;

export function puedeActivarPlan(estadoVigenciaNutricion: string): boolean {
  return estadoVigenciaNutricion === "ACTIVA";
}

export function esVisiblePlanNutricion(estadoVigenciaNutricion: string): boolean {
  return estadoVigenciaNutricion === "ACTIVA" || estadoVigenciaNutricion === "CONGELADO";
}

export type AsignarPlanNutricional = z.infer<typeof asignarPlanNutricionalSchema>;