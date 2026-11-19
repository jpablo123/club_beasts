"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PlanNutricionalVista from "@/components/nutricion/PlanNutricionalVista";
import { api } from "@/lib/api";

export default function NutricionDetallePage() {
  const params = useParams();
  const id = String(params?.id);
  const router = useRouter();
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await api.planesNutricionales.obtener(id);
        if (mounted) setPlan(data);
      } catch (e: any) {
        if (mounted) setError(e?.message ?? "Error");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  if (loading) return <main className="p-6"><p className="text-gray-400">Cargando...</p></main>;
  if (error) return <main className="p-6"><p className="text-red-400">{error}</p></main>;

  const datos = plan?.datos ?? plan;
  return (
    <main className="p-6">
      <PlanNutricionalVista datos={datos} />
      <div className="mt-4 flex gap-2">
        <button onClick={() => router.push(`/nutricion/${id}/editar`)} className="px-5 py-2.5 text-white bg-royal hover:bg-royal-dark rounded-card">Editar</button>
      </div>
    </main>
  );
}