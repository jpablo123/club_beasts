"use client";
import PlanNutricionalEditor from "@/components/nutricion/PlanNutricionalEditor";

export default function NutricionNuevaPage() {
  return (
    <main className="p-6">
      <PlanNutricionalEditor onSave={() => {}} />
    </main>
  );
}