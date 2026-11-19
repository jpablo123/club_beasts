"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PlanNutricionalEditor from "@/components/nutricion/PlanNutricionalEditor";
import { api } from "@/lib/api";

export default function NutricionEditarPage() {
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

  return (
    <main className="p-6">
      <PlanNutricionalEditor plan={plan} onGuardado={() => router.push(`/nutricion/${id}`)} />
    </main>
  );
}