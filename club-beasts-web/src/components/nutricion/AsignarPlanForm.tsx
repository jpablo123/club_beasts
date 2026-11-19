"use client";
import { useState } from "react";
import type { PlanNutricional } from "@/lib/plan-nutricional-schemas";

export interface AsignarPlanFormProps {
  clienteId: string;
  onAsignado: (plan: PlanNutricional) => void;
}

export default function AsignarPlanForm({ clienteId, onAsignado }: AsignarPlanFormProps) {
  const [gateAceptado, setGateAceptado] = useState(false);
  const [plan, setPlan] = useState<PlanNutricional>({
    datosBiometricos: { pesoKg: 70, tallaCm: 170 },
    objetivosCaloricos: 2000,
    tiemposComida: [{ nombre: "Desayuno", alimentos: [{ nombre: "Avena", cantidad: 50, unidad: "g" }] }],
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (gateAceptado) onAsignado(plan); }} className="space-y-4">
      <label className="flex items-center gap-2 text-sm text-gray-300">
        <input type="checkbox" checked={gateAceptado} onChange={(e) => setGateAceptado(e.target.checked)} />
        Acepto la asignación (DEC-079)
      </label>
      <p className="text-xs text-gray-500">Cliente: {clienteId}</p>
      <button type="submit" disabled={!gateAceptado} className="px-5 py-2.5 text-white bg-royal hover:bg-royal-dark rounded-card disabled:opacity-50">
        Asignar plan
      </button>
    </form>
  );
}