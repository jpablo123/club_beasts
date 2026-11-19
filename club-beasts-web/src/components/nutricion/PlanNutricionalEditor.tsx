"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import type { PlanNutricional } from "@/lib/plan-nutricional-schemas";
import { validatePlanNutricional } from "@/lib/plan-nutricional-schemas";

export interface PlanNutricionalEditorProps {
  plan?: PlanNutricional & { id?: string };
  onGuardado?: (plan: PlanNutricional & { id?: string }) => void;
}

export default function PlanNutricionalEditor({ plan, onGuardado }: PlanNutricionalEditorProps) {
  const [data, setData] = useState<PlanNutricional>(plan ?? {
    datosBiometricos: { pesoKg: 70, tallaCm: 170 },
    objetivosCaloricos: 2000,
    tiemposComida: [{ nombre: "Desayuno", alimentos: [{ nombre: "Avena", cantidad: 50, unidad: "g" }] }],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const errs = validatePlanNutricional(data);
    if (errs.length) { setError(errs.join("; ")); return; }
    setLoading(true);
    try {
      let saved: any;
      if (plan?.id) {
        saved = await api.planesNutricionales.editar(plan.id, data as unknown as Record<string, unknown>);
      } else {
        saved = await api.planesNutricionales.crear(data as unknown as Record<string, unknown>);
      }
      onGuardado?.(saved ?? data);
    } catch (err: any) {
      setError(err?.message ?? "Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <h3 className="text-lg font-display font-bold text-white uppercase">Biometricos</h3>
      <input type="number" value={data.datosBiometricos.pesoKg} onChange={(e) => setData({ ...data, datosBiometricos: { ...data.datosBiometricos, pesoKg: Number(e.target.value) } })} className="w-full px-3 py-2 bg-near-black border border-gray-700 rounded-card text-white" />
      <h3 className="text-lg font-display font-bold text-white uppercase">Macros (manual)</h3>
      <input type="number" placeholder="Proteina g" value={data.macronutrientes?.proteinaG ?? ""} onChange={(e) => setData({ ...data, macronutrientes: { ...data.macronutrientes, proteinaG: Number(e.target.value) } })} className="w-full px-3 py-2 bg-near-black border border-gray-700 rounded-card text-white" />
      <h3 className="text-lg font-display font-bold text-white uppercase">Comidas</h3>
      <p className="text-gray-400 text-sm">{data.tiemposComida.length} tiempo(s)</p>
      <h3 className="text-lg font-display font-bold text-white uppercase">Recomendaciones</h3>
      <textarea value={data.recomendaciones ?? ""} onChange={(e) => setData({ ...data, recomendaciones: e.target.value })} className="w-full px-3 py-2 bg-near-black border border-gray-700 rounded-card text-white" />
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button type="submit" disabled={loading} className="px-5 py-2.5 text-white bg-royal hover:bg-royal-dark rounded-card">{loading ? "Guardando..." : "Guardar"}</button>
    </form>
  );
}