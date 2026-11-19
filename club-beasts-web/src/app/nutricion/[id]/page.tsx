import PlanNutricionalVista from "@/components/nutricion/PlanNutricionalVista";
import type { PlanNutricional } from "@/lib/plan-nutricional-schemas";

export default function NutricionDetallePage() {
  const datos: PlanNutricional = {
    datosBiometricos: { pesoKg: 70, tallaCm: 170 },
    objetivosCaloricos: 2000,
    tiemposComida: [{ nombre: "Desayuno", alimentos: [{ nombre: "Avena", cantidad: 50, unidad: "g" }] }],
  };
  return (
    <main className="p-6">
      <PlanNutricionalVista datos={datos} />
    </main>
  );
}