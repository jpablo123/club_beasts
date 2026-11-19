"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import PlanNutricionalListado from "@/components/nutricion/PlanNutricionalListado";
import type { PlanNutricional } from "@/lib/plan-nutricional-schemas";

export default function NutricionPage() {
  const router = useRouter();
  const [planes, setPlanes] = useState<PlanNutricional[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.planesNutricionales
      .listar()
      .then((d: any) => setPlanes(d?.planes ?? d ?? []))
      .catch((e: any) => setError(e?.message ?? "Error al cargar planes"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="p-6">
      <PlanNutricionalListado
        planes={planes}
        loading={loading}
        error={error}
        onNuevo={() => router.push("/nutricion/nueva")}
        onVer={(p: any) => router.push(`/nutricion/${p?.id ?? ""}`)}
      />
    </main>
  );
}