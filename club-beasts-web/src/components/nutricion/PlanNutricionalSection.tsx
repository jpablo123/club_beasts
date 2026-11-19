"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import AsignarPlanForm from "./AsignarPlanForm";

export default function PlanNutricionalSection({ clienteId }: { clienteId: string }) {
  const { data: session } = useSession();
  const rol = (session?.user as { role?: string } | undefined)?.role;
  const [formAbierto, setFormAbierto] = useState(false);

  if (rol !== "DUENO" && rol !== "RECEPCIONISTA") return null;

  return (
    <section role="region" aria-label="Plan nutricional activo" className="mt-6 p-5 bg-dark-surface border border-gray-800 rounded-card">
      <h2 className="text-xl font-display font-bold text-white uppercase">Plan nutricional activo</h2>
      <p className="mt-3 text-gray-400">Sin plan asignado</p>
      {!formAbierto && rol === "DUENO" ? (
        <button type="button" onClick={() => setFormAbierto(true)} className="mt-3 px-5 py-2.5 text-sm font-medium text-white bg-royal hover:bg-royal-dark rounded-card transition-colors">
          Asignar plan
        </button>
      ) : null}
      {formAbierto ? (
        <div className="mt-3">
          <AsignarPlanForm clienteId={clienteId} onAsignado={() => setFormAbierto(false)} />
          <button type="button" onClick={() => setFormAbierto(false)} className="mt-2 px-4 py-2 text-sm text-gray-300 border border-gray-700 rounded-card">Cancelar</button>
        </div>
      ) : null}
    </section>
  );
}
