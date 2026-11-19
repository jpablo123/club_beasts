"use client";
import PlanNutricionalListado from "@/components/nutricion/PlanNutricionalListado";
import type { PlanNutricional } from "@/lib/plan-nutricional-schemas";

export default function NutricionPage() {
  const planes: PlanNutricional[] = [];
  return (
    <main className="p-6">
      <PlanNutricionalListado planes={planes} onVer={() => {}} />
    </main>
  );
}