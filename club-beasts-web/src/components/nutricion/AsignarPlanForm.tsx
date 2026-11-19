"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { PlanNutricional } from "@/lib/plan-nutricional-schemas";

export interface AsignarPlanFormProps {
  clienteId: string;
  onAsignado: (plan: PlanNutricional) => void;
}

export default function AsignarPlanForm({ clienteId, onAsignado }: AsignarPlanFormProps) {
  const [gateAceptado, setGateAceptado] = useState(false);
  const [planId, setPlanId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!gateAceptado) return;
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await api.asignacionesNutricion.asignar<PlanNutricional>(clienteId, planId);
      setSuccess(true);
      onAsignado(res);
    } catch (e: any) {
      const msg = e?.message || "Error al asignar";
      if (msg.includes("SIN_VIGENCIA_NUTRICION")) {
        setError("No se puede asignar: el cliente no tiene vigencia nutricional activa (DEC-079).");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="flex items-center gap-2 text-sm text-gray-300">
        <input type="checkbox" checked={gateAceptado} onChange={(e) => setGateAceptado(e.target.checked)} />
        Acepto la asignación (DEC-079)
      </label>
      <input
        type="text"
        value={planId}
        onChange={(e) => setPlanId(e.target.value)}
        placeholder="ID del plan"
        className="w-full px-3 py-2 bg-dark-surface border border-gray-700 rounded-card text-white"
      />
      <p className="text-xs text-gray-500">Cliente: {clienteId}</p>
      {error ? <p className="text-red-400 text-sm">{error}</p> : null}
      {success ? <p className="text-green-400 text-sm">Asignado correctamente</p> : null}
      <button type="submit" disabled={!gateAceptado || loading} className="px-5 py-2.5 text-white bg-royal hover:bg-royal-dark rounded-card disabled:opacity-50">
        {loading ? "Asignando..." : "Asignar plan"}
      </button>
    </form>
  );
}