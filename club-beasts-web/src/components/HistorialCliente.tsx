"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function HistorialCliente({ clienteId, actor }: { clienteId: string; actor?: boolean }) {
  const [data, setData] = useState<any>(null);
  const [tipo, setTipo] = useState("todos");
  useEffect(() => {
    api.clientes.historial(clienteId).then(setData).catch(() => setData(null));
  }, [clienteId]);
  const items = data?.items ?? [];
  const filtered = tipo === "todos" ? items : items.filter((i: any) => i.tipo === tipo);

  const tabs = [
    { key: "todos", label: "Todos" },
    { key: "RUTINA", label: "Rutinas" },
    { key: "PLAN_NUTRICIONAL", label: "Planes" },
    { key: "INGRESO", label: "Ingresos" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTipo(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-card border transition-colors ${
              tipo === t.key
                ? "bg-royal text-white border-royal"
                : "bg-dark-surface text-gray-300 border-gray-700 hover:border-royal/40 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <p className="text-gray-400 text-sm py-4">Sin registros en esta categoría.</p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((i: any) => (
            <li key={i.id} className="border border-gray-800 rounded-card p-4 bg-dark-surface/40">
              <p className="font-display font-bold text-white uppercase text-sm tracking-wide">
                {i.tipo === "RUTINA" ? "Rutina" : i.tipo === "PLAN_NUTRICIONAL" ? "Plan nutricional" : "Ingreso"}
              </p>
              <p className="text-sm text-gray-400 mt-1">{i.fecha}</p>
              {actor && i.actor && (
                <p className="text-xs text-gray-500 mt-1">Por: {i.actor.nombre ?? i.actor}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
