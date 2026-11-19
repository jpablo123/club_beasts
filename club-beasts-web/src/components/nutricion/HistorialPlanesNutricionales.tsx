"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export default function HistorialPlanesNutricionales({ clienteId }: { clienteId: string }) {
  const { data: session } = useSession();
  const rol = (session?.user as { role?: string } | undefined)?.role;
  const [planes, setPlanes] = useState<any[] | null>(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      if (vivo) setPlanes([]);
    })();
    return () => { vivo = false; };
  }, [clienteId]);

  if (rol !== "DUENO" && rol !== "RECEPCIONISTA") return null;

  return (
    <section role="region" aria-label="Historial de planes nutricionales" className="mt-6 p-5 bg-dark-surface border border-gray-800 rounded-card">
      <h2 className="text-xl font-display font-bold text-white uppercase">Historial de planes nutricionales</h2>
      {planes === null ? (
        <p className="mt-3 text-gray-400">Cargando...</p>
      ) : planes.length === 0 ? (
        <p className="mt-3 text-gray-400">Aun no hay planes asignados</p>
      ) : null}
    </section>
  );
}
