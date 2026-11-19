"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/lib/api";

export default function HistorialPlanesNutricionales({ clienteId }: { clienteId: string }) {
  const { data: session } = useSession();
  const rol = (session?.user as { role?: string } | undefined)?.role;
  const [planes, setPlanes] = useState<any[] | null>(null);

  useEffect(() => {
    if (rol !== "DUENO" && rol !== "RECEPCIONISTA") return;
    let vivo = true;
    (async () => {
      try {
        const data = await api.asignacionesNutricion.historial(clienteId);
        if (vivo) setPlanes(data?.asignaciones ?? data ?? []);
      } catch {
        if (vivo) setPlanes([]);
      }
    })();
    return () => { vivo = false; };
  }, [clienteId, rol]);

  if (rol !== "DUENO" && rol !== "RECEPCIONISTA") return null;

  return (
    <section role="region" aria-label="Historial de planes nutricionales" className="mt-6 p-5 bg-dark-surface border border-gray-800 rounded-card">
      <h2 className="text-xl font-display font-bold text-white uppercase">Historial de planes nutricionales</h2>
      {planes === null ? (
        <p className="mt-3 text-gray-400">Cargando...</p>
      ) : planes.length === 0 ? (
        <p className="mt-3 text-gray-400">Aun no hay planes asignados</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {planes.map((p: any, i: number) => (
            <li key={p?.id ?? i} className="p-4 bg-near-black border border-gray-800 rounded-card text-white">
              <div className="flex flex-wrap items-center gap-3">
                <span>{p?.plan?.nombre ?? p?.nombre ?? "Plan"}</span>
                {p?.actor?.nombre ? <span className="text-gray-400 text-sm">{p.actor.nombre}</span> : null}
                {p?.fechaInicio ? <span className="text-gray-500 text-sm font-mono">Inicio: {p.fechaInicio}</span> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}