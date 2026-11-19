"use client";
import { useState } from "react";
import type { PlanNutricional } from "@/lib/plan-nutricional-schemas";

export interface PlanNutricionalEditorProps {
  plan?: PlanNutricional;
  onSave: (plan: PlanNutricional) => void;
}

export default function PlanNutricionalEditor({ plan, onSave }: PlanNutricionalEditorProps) {
  const [data, setData] = useState<PlanNutricional>(plan ?? {
    datosBiometricos: { pesoKg: 70, tallaCm: 170 },
    objetivosCaloricos: 2000,
    tiemposComida: [{ nombre: "Desayuno", alimentos: [{ nombre: "Avena", cantidad: 50, unidad: "g" }] }],
  });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(data); }} className="space-y-4">
      <h3 className="text-lg font-display font-bold text-white uppercase">Biometricos</h3>
      <input type="number" value={data.datosBiometricos.pesoKg} onChange={(e) => setData({ ...data, datosBiometricos: { ...data.datosBiometricos, pesoKg: Number(e.target.value) } })} className="w-full px-3 py-2 bg-near-black border border-gray-700 rounded-card text-white" />
      <h3 className="text-lg font-display font-bold text-white uppercase">Macros (manual)</h3>
      <input type="number" placeholder="Proteina g" value={data.macronutrientes?.proteinaG ?? ""} onChange={(e) => setData({ ...data, macronutrientes: { ...data.macronutrientes, proteinaG: Number(e.target.value) } })} className="w-full px-3 py-2 bg-near-black border border-gray-700 rounded-card text-white" />
      <h3 className="text-lg font-display font-bold text-white uppercase">Comidas</h3>
      <p className="text-gray-400 text-sm">{data.tiemposComida.length} tiempo(s)</p>
      <h3 className="text-lg font-display font-bold text-white uppercase">Recomendaciones</h3>
      <textarea value={data.recomendaciones ?? ""} onChange={(e) => setData({ ...data, recomendaciones: e.target.value })} className="w-full px-3 py-2 bg-near-black border border-gray-700 rounded-card text-white" />
      <button type="submit" className="px-5 py-2.5 text-white bg-royal hover:bg-royal-dark rounded-card">Guardar</button>
    </form>
  );
}