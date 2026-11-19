"use client";
import PlanNutricionalEditor from "@/components/nutricion/PlanNutricionalEditor";
import type { PlanNutricional } from "@/lib/plan-nutricional-schemas";

export default function NutricionEditarPage() {
  return (
    <main className="p-6">
      <PlanNutricionalEditor onSave={() => {}} />
    </main>
  );
}