"use client";

import { useState } from "react";
import { api } from "@/lib/api";

export default function CancelarVigenciaButton({
  clienteId,
  membresiaId,
  onCanceled,
}: {
  clienteId: string;
  membresiaId: string;
  onCanceled?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const handle = async () => {
    if (!window.confirm("¿Cancelar vigencia?")) return;
    setLoading(true);
    setMsg("");
    try {
      await api.membresias.cancelar(clienteId, membresiaId);
      setMsg("Vigencia cancelada.");
      onCanceled?.();
    } catch (e) {
      setMsg((e as Error).message || "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handle}
        disabled={loading}
        className="px-5 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-card transition-colors disabled:opacity-50"
      >
        Cancelar vigencia
      </button>
      {msg ? <p className="text-sm text-gray-300 mt-2">{msg}</p> : null}
    </div>
  );
}