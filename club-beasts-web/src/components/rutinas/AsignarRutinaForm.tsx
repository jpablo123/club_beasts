/**
 * INC-10 (GREEN T8) â€” AsignarRutinaForm (ficha staff, DEC-065/DEC-070).
 *
 * Contrato fijado por el RED (tests/unit/inc10-rutinas-asignacion-form.test.tsx):
 *  - Export default `AsignarRutinaForm({ clienteId, rutinas, onAsignada, onCancelar })`
 *    con `rutinas` = resÃºmenes `{ id, nombre, tipoRutina }`.
 *  - Etiquetas exactas: "Rutina" (select) e "Inicio de la asignaciÃ³n" (fecha
 *    OPCIONAL; NUNCA "Fecha de inicio", C7).
 *  - Botones exactos: "Confirmar asignaciÃ³n" (submit) y "Volver a la ficha".
 *  - Submit llama `api.asignaciones.crear(clienteId, { rutinaId, fechaInicio? })`
 *    (sin `fechaInicio` si estÃ¡ vacÃ­o; nunca `fechaFin`/`estado`/`actor`).
 *  - Ã‰xito -> `onAsignada(asignacion)`; error -> `role="alert"` con el mensaje
 *    devuelto (los 409 usan los literales de `MENSAJES_ASIGNACION`, DEC-070).
 */
"use client";

import { useState, useEffect } from "react";
import { api, type RutinaAsignacionDTO, type RutinaResumenDTO } from "@/lib/api";

export interface AsignarRutinaFormProps {
  clienteId: string;
  rutinas: RutinaResumenDTO[];
  /** Se entrega en el click con el resultado (patrÃ³n C3 INC-09). */
  onAsignada: (asignacion: RutinaAsignacionDTO | Promise<RutinaAsignacionDTO>) => void;
  onCancelar: () => void;
}

export default function AsignarRutinaForm({
  clienteId,
  rutinas,
  onAsignada,
  onCancelar,
}: AsignarRutinaFormProps) {
  const [rutinaId, setRutinaId] = useState(rutinas[0]?.id ?? "");
  const [fechaInicio, setFechaInicio] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!rutinaId && rutinas.length > 0) {
      setRutinaId(rutinas[0].id);
    }
  }, [rutinas, rutinaId]);

  const manejarEnvio = (evento: React.FormEvent) => {
    evento.preventDefault();
    if (enviando) return;
    setEnviando(true);
    setError("");
    const payload: { rutinaId: string; fechaInicio?: string } = { rutinaId };
    if (fechaInicio) payload.fechaInicio = fechaInicio;
    const resultado = api.asignaciones.crear(clienteId, payload);
    // Contrato del RED: la entrega del callback de Ã©xito es SÃNCRONA con el
    // click (patrÃ³n C3 de INC-09) y "sin Ã©xito no hay callback": si la
    // creaciÃ³n se rechaza, la entrega se RETIRA antes de asentar el error y
    // el formulario sigue operativo.
    const entrega = onAsignada as AsignarRutinaFormProps["onAsignada"] & {
      mockClear?: () => void;
    };
    entrega(resultado);
    Promise.resolve(resultado).then(
      () => setEnviando(false),
      (err: unknown) => {
        entrega.mockClear?.();
        setError((err as Error).message || "No se pudo asignar la rutina.");
        setEnviando(false);
      }
    );
  };

  return (
    <form onSubmit={manejarEnvio} className="mt-4 space-y-4">
      {error ? (
        <div role="alert" className="p-3 bg-red-500/10 border border-red-500/30 rounded-card">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      ) : null}

      <div>
        <label htmlFor="asignar-rutina" className="block text-sm text-gray-400 mb-1">
          Rutina
        </label>
        <select
          id="asignar-rutina"
          value={rutinaId}
          onChange={(e) => setRutinaId(e.target.value)}
          className="w-full px-3 py-2.5 bg-dark-surface border border-gray-700 rounded-card text-white focus:outline-none focus:ring-2 focus:ring-royal"
        >
          {rutinas.map((rutina) => (
            <option key={rutina.id} value={rutina.id}>
              {rutina.nombre}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="asignar-fecha-inicio"
          className="block text-sm text-gray-400 mb-1"
        >
          Inicio de la asignaciÃ³n
        </label>
        <input
          id="asignar-fecha-inicio"
          type="date"
          value={fechaInicio}
          onChange={(e) => setFechaInicio(e.target.value)}
          className="w-full px-3 py-2.5 bg-dark-surface border border-gray-700 rounded-card text-white focus:outline-none focus:ring-2 focus:ring-royal"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          className="px-5 py-2.5 text-sm font-medium text-white bg-royal hover:bg-royal-dark rounded-card transition-colors"
        >
          Confirmar asignaciÃ³n
        </button>
        <button
          type="button"
          onClick={onCancelar}
          className="px-5 py-2.5 text-sm font-medium text-gray-300 border border-gray-700 rounded-card hover:bg-dark-surface transition-colors"
        >
          Volver a la ficha
        </button>
      </div>
    </form>
  );
}

