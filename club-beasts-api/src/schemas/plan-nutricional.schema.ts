import { z } from "zod";

const comidaSchema = z.object({
  nombre: z.string().min(1),
  alimentos: z.array(z.string().min(1)).min(1),
}).strict();

const datosBiometricosSchema = z.object({
  pesoKg: z.number(),
  tallaCm: z.number(),
  objetivoCaloricoKcal: z.number(),
  objetivo: z.string().min(1),
}).strict();

const macronutrientesSchema = z.object({}).passthrough().optional();

export const crearPlanNutricionalSchema = z.object({
  nombre: z.string().min(1).optional(),
  datosBiometricos: datosBiometricosSchema,
  macronutrientes: macronutrientesSchema.optional(),
  comidas: z.array(comidaSchema).min(1),
  recomendaciones: z.string().optional().nullable(),
  suplementacion: z.string().optional().nullable(),
  observacionesGenerales: z.string().optional().nullable(),
}).strict();

export type CrearPlanNutricional = z.infer<typeof crearPlanNutricionalSchema>;

export const actualizarPlanNutricionalSchema = crearPlanNutricionalSchema.partial().strict();
export type ActualizarPlanNutricional = z.infer<typeof actualizarPlanNutricionalSchema>;

export const planNutricionalDatosSchema = z.object({
  id: z.string(),
  nombre: z.string().nullable(),
  datosBiometricos: datosBiometricosSchema,
  macronutrientes: macronutrientesSchema.nullable(),
  comidas: z.array(comidaSchema),
  recomendaciones: z.string().nullable(),
  suplementacion: z.string().nullable(),
  observacionesGenerales: z.string().nullable(),
  fechaActualizacion: z.string(),
  actualizadoPor: z.object({ id: z.string(), nombre: z.string() }).nullable(),
});
export type PlanNutricionalDatos = z.infer<typeof planNutricionalDatosSchema>;
