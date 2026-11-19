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
  return (
    <div>
      <div className="flex gap-2 mb-4">
        {["todos", "rutina", "plan", "ingreso"].map((t) => (
          <button key={t} onClick={() => setTipo(t)} className={`px-3 py-1 rounded ${tipo === t ? "bg-royal-blue text-white" : "bg-gray-200"}`}>
            {t}
          </button>
        ))}
      </div>
      <ul className="space-y-2">
        {filtered.map((i: any) => (
          <li key={i.id} className="border p-3 rounded">
            <p className="font-semibold">{i.tipo}</p>
            <p className="text-sm">{i.fecha}</p>
            {actor && i.actor && <p className="text-xs text-gray-500">{i.actor.nombre}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
