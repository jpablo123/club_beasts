"use client";
import { useRouter } from "next/navigation";
import PlanNutricionalEditor from "@/components/nutricion/PlanNutricionalEditor";

export default function NutricionNuevaPage() {
  const router = useRouter();
  return (
    <main className="p-6">
      <PlanNutricionalEditor onGuardado={(plan: any) => {
        const id = plan?.id ?? plan?.planId;
        if (id) router.push(`/nutricion/${id}`);
      }} />
    </main>
  );
}