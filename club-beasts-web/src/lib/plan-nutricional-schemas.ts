export const SIN_PLAN_NUTRICIONAL_MENSAJE = "No tienes un plan nutricional activo";

export interface DatosBiometricos {
  pesoKg: number;
  tallaCm: number;
  porcentajeGrasa?: number | null;
}

export interface Macronutrientes {
  proteinaG?: number | null;
  carbohidratosG?: number | null;
  grasasG?: number | null;
}

export interface Alimento {
  nombre: string;
  cantidad: number;
  unidad: string;
}

export interface TiempoComida {
  nombre: string;
  alimentos: Alimento[];
}

export interface PlanNutricional {
  datosBiometricos: DatosBiometricos;
  objetivosCaloricos: number;
  macronutrientes?: Macronutrientes | null;
  tiemposComida: TiempoComida[];
  recomendaciones?: string | null;
  suplementacion?: string | null;
}

export const validatePlanNutricional = (p: PlanNutricional): string[] => {
  const errs: string[] = [];
  if (p.datosBiometricos.pesoKg < 30 || p.datosBiometricos.pesoKg > 300) errs.push("Peso debe estar entre 30 y 300 kg");
  if (!Number.isInteger(p.datosBiometricos.tallaCm) || p.datosBiometricos.tallaCm < 100 || p.datosBiometricos.tallaCm > 250) errs.push("Talla debe estar entre 100 y 250 cm");
  if (p.tiemposComida.length < 1) errs.push("Debe registrar al menos 1 tiempo de comida");
  return errs;
};