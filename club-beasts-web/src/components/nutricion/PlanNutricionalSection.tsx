"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/lib/api";
import AsignarPlanForm from "./AsignarPlanForm";
import PlanNutricionalVista from "./PlanNutricionalVista";

export default function PlanNutricionalSection({ clienteId }: { clienteId: string }) {
  const { data: session } = useSession();
  const rol = (session?.user as { role?: string } | undefined)?.role;
  const [activo, setActivo] = useState<any>(null);
  const [cargado, setCargado] = useState(false);
  const [formAbierto, setFormAbierto] = useState(false);

  useEffect(() => {
    if (rol !== "DUENO" && rol !== "RECEPCIONISTA") return;
    let vivo = true;
    (async () => {
      try {
        const data = await api.asignacionesNutricion.activa(clienteId);
        if (vivo) setActivo(data);
      } catch {
        if (vivo) setActivo(null);
      } finally {
        if (vivo) setCargado(true);
      }
    })();
    return () => { vivo = false; };
  }, [clienteId, rol]);

  if (rol !== "DUENO" && rol !== "RECEPCIONISTA") return null;

  return (
    <section role="region" aria-label="Plan nutricional activo" className="mt-6 p-5 bg-dark-surface border border-gray-800 rounded-card">
      <h2 className="text-xl font-display font-bold text-white uppercase">Plan nutricional activo</h2>
      {!cargado ? (
        <p className="mt-3 text-gray-400">Cargando...</p>
      ) : (
        <div className="mt-3 space-y-3">
          {activo?.asignacion?.plan || activo?.plan ? (
            <PlanNutricionalVista datos={activo?.asignacion?.plan ?? activo?.plan} />
          ) : (
            <p className="text-gray-400">Sin plan activo</p>
          )}
          {!formAbierto && (rol === "DUENO" || rol === "RECEPCIONISTA") ? (
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
        </div>
      )}
    </section>
  );
}