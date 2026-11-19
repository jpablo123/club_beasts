"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import PlanNutricionalListado from "@/components/nutricion/PlanNutricionalListado";
import type { PlanNutricional } from "@/lib/plan-nutricional-schemas";

export default function NutricionPage() {
  const router = useRouter();
  const [planes, setPlanes] = useState<PlanNutricional[]>([]);
  useEffect(() => {
    api.planesNutricionales.listar().then((d: any) => setPlanes(d?.planes ?? d ?? [])).catch(() => {});
  }, []);
  return (
    <main className="p-6">
      <PlanNutricionalListado planes={planes} onNuevo={() => router.push("/nutricion/nueva")} onVer={(p) => router.push("/nutricion/x")} />
    </main>
  );
}