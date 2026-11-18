import { z } from "zod";

export const datosBiometricosSchema = z.object({
  pesoKg: z.number().min(30, "Peso debe estar entre 30 y 300 kg").max(300, "Peso debe estar entre 30 y 300 kg"),
  tallaCm: z.number().int("Talla debe ser entera").min(100, "Talla debe estar entre 100 y 250 cm").max(250, "Talla debe estar entre 100 y 250 cm"),
  porcentajeGrasa: z.number().min(0).max(100).optional().nullable(),
});

export const macronutrientesSchema = z.object({
  proteinaG: z.number().min(0).optional().nullable(),
  carbohidratosG: z.number().min(0).optional().nullable(),
  grasasG: z.number().min(0).optional().nullable(),
}).strict();

export const alimentoSchema = z.object({
  nombre: z.string().min(1, "Nombre del alimento requerido").max(120, "Nombre del alimento máximo 120 caracteres"),
  cantidad: z.number().positive("Cantidad debe ser mayor a 0"),
  unidad: z.string().min(1, "Unidad requerida").max(20, "Unidad máximo 20 caracteres"),
});

export const tiempoComidaSchema = z.object({
  nombre: z.string().min(1, "Nombre del tiempo de comida requerido").max(60, "Nombre máximo 60 caracteres"),
  alimentos: z.array(alimentoSchema).min(1, "Debe registrar al menos 1 alimento").max(30, "Máximo 30 alimentos por tiempo"),
});

export const createPlanNutricionalSchema = z.object({
  datosBiometricos: datosBiometricosSchema,
  objetivosCaloricos: z.number().int("Objetivos calóricos deben ser enteros").min(500, "Objetivos calóricos fuera de rango").max(6000, "Objetivos calóricos fuera de rango"),
  macronutrientes: macronutrientesSchema.optional().nullable(),
  tiemposComida: z.array(tiempoComidaSchema).min(1, "Debe registrar al menos 1 tiempo de comida").max(12, "Máximo 12 tiempos de comida"),
  recomendaciones: z.string().min(1, "Recomendaciones mínimo 1 caracter").max(2000, "Recomendaciones máximo 2000 caracteres").optional().nullable(),
  suplementacion: z.string().min(1, "Suplementación mínimo 1 caracter").max(2000, "Suplementación máximo 2000 caracteres").optional().nullable(),
}).strict();

export const updatePlanNutricionalSchema = createPlanNutricionalSchema.partial();

export type CreatePlanNutricional = z.infer<typeof createPlanNutricionalSchema>;
export type UpdatePlanNutricional = z.infer<typeof updatePlanNutricionalSchema>;