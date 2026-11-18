/**
 * INC-10 (GREEN T8) — HistorialRutinas (ficha staff, HU-21 / NAV-RU-15..17).
 *
 * Contrato fijado por el RED (tests/unit/inc10-rutinas-historial.test.tsx):
 *  - Export default `HistorialRutinas({ clienteId })`: consulta
 *    `api.asignaciones.historial(clienteId)` UNA vez al montar.
 *  - `<section role="region" aria-label="Historial de rutinas">` (exact).
 *  - Cada asignación = `role="group"` con `aria-label` = nombre de la rutina,
 *    en el MISMO orden que la API (fechaInicio DESC).
 *  - Fila: badge exacto "ACTIVA" | "CERRADA", fechas de la asignación y
 *    `actor.nombre` (RU-30, staff).
 *  - "Ver versión asignada" expande el `contenidoSnapshot` (DEC-067) con
 *    `RutinaVista` (montaje al expandir: el contenido es el del MOMENTO de
 *    asignar).
 *  - Sin controles de escritura (historial inmutable, RU-32).
 */
"use client";

import { useEffect, useState } from "react";
import { api, type RutinaAsignacionDTO } from "@/lib/api";
import RutinaVista, { type RutinaContenido } from "./RutinaVista";

export default function HistorialRutinas({ clienteId }: { clienteId: string }) {
  const [asignaciones, setAsignaciones] = useState<RutinaAsignacionDTO[] | null>(null);
  const [expandida, setExpandida] = useState<Record<string, boolean>>({});

  // SIN guarda por ref (StrictMode dev): ver RutinaSection (INC-10 GREEN T8).
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const data = await api.asignaciones.historial(clienteId);
        if (vivo) setAsignaciones(data.asignaciones ?? []);
      } catch {
        if (vivo) setAsignaciones([]);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [clienteId]);

  return (
    <section
      role="region"
      aria-label="Historial de rutinas"
      className="mt-6 p-5 bg-dark-surface border border-gray-800 rounded-card"
    >
      <h2 className="text-xl font-display font-bold text-white uppercase">
        Historial de rutinas
      </h2>

      {asignaciones === null ? (
        <p className="mt-3 text-gray-400">Cargando...</p>
      ) : asignaciones.length === 0 ? (
        <p className="mt-3 text-gray-400">Aun no hay rutinas asignadas</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {asignaciones.map((asignacion) => {
            const abierto = expandida[asignacion.id] ?? false;
            return (
              <li
                key={asignacion.id}
                role="group"
                aria-label={asignacion.rutina?.nombre ?? asignacion.id}
                className="p-4 bg-near-black border border-gray-800 rounded-card"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="px-2.5 py-1 text-xs font-mono rounded-card bg-royal/20 text-royal-light">
                    {asignacion.estado}
                  </span>
                  <span className="text-white">{asignacion.rutina?.nombre}</span>
                  <span className="text-gray-500 text-sm font-mono">
                    Inicio: {asignacion.fechaInicio}
                  </span>
                  <span className="text-gray-500 text-sm font-mono">
                    Fin: {asignacion.fechaFin ?? "—"}
                  </span>
                  {asignacion.actor ? (
                    <span className="text-gray-400 text-sm">{asignacion.actor.nombre}</span>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setExpandida((prev) => ({ ...prev, [asignacion.id]: !abierto }))
                  }
                  className="mt-3 px-4 py-2 text-sm text-royal border border-royal/40 rounded-card hover:bg-royal/10 transition-colors"
                >
                  Ver versión asignada
                </button>

                {abierto ? (
                  <div className="mt-3 p-4 bg-dark-surface border border-gray-800 rounded-card">
                    <RutinaVista
                      rutina={(asignacion.contenidoSnapshot ?? {}) as RutinaContenido}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
