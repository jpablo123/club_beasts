"use client";

import { useState } from "react";
import { api } from "@/lib/api";

export default function AsignarRutinaBulkForm({ rutinaId }: { rutinaId: string }) {
  const [clienteIds, setClienteIds] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const handle = async () => {
    setLoading(true);
    setMsg("");
    const ids = clienteIds
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      const res = await api.rutinas.asignarBulk(rutinaId, { clienteIds: ids });
      setMsg(JSON.stringify(res));
    } catch (e) {
      setMsg((e as Error).message || "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 p-5 bg-dark-surface border border-gray-800 rounded-card">
      <h3 className="text-white font-semibold mb-3">Asignar a clientes</h3>
      <textarea
        value={clienteIds}
        onChange={(e) => setClienteIds(e.target.value)}
        placeholder="IDs de clientes separados por coma"
        className="w-full px-3 py-2.5 bg-dark-surface border border-gray-700 rounded-card text-white focus:outline-none focus:ring-2 focus:ring-royal"
      />
      <button
        type="button"
        onClick={handle}
        disabled={loading}
        className="mt-3 px-5 py-2.5 text-sm font-medium text-white bg-royal hover:bg-royal-dark rounded-card transition-colors disabled:opacity-50"
      >
        Asignar
      </button>
      {msg ? <p className="text-sm text-gray-300 mt-2">{msg}</p> : null}
    </div>
  );
}