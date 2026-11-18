/**
 * INC-10 (GREEN T8) — RutinaSection: sección "Rutina activa" de la ficha staff
 * (C1 montaje bajo demanda, DEC-065/DEC-070, C5/C6).
 *
 * Contrato fijado por el RED (tests/unit/inc10-rutinas-vista.test.tsx):
 *  - Export default `RutinaSection({ clienteId })`: consulta
 *    `api.asignaciones.activa(clienteId)` UNA vez al montar.
 *  - `<section role="region" aria-label="Rutina activa">` (exact).
 *  - Estados DEC-070: badge con el texto exacto "ACTIVA" | "SIN_RUTINA" |
 *    "OCULTA_POR_VIGENCIA" (staff con indicador; ocultación sin borrar).
 *  - Con ACTIVA: botón "Ver versión asignada" (C3) que expande el
 *    `contenidoSnapshot` (DEC-067). El actor es visible a staff (RU-30).
 *  - Solo DUENO ve "Asignar rutina" (DEC-065); RECEPCIONISTA no.
 */
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  api,
  type RutinaActivaDTO,
  type RutinaAsignacionDTO,
  type RutinaResumenDTO,
} from "@/lib/api";
import RutinaVista, { type RutinaContenido } from "./RutinaVista";
import AsignarRutinaForm from "./AsignarRutinaForm";

export default function RutinaSection({ clienteId }: { clienteId: string }) {
  const { data: session } = useSession();
  const rol = (session?.user as { role?: string } | undefined)?.role;
  const [estado, setEstado] = useState<{
    asignacion: RutinaAsignacionDTO | null;
    estado: RutinaActivaDTO["estado"];
  } | null>(null);
  const [verSnapshot, setVerSnapshot] = useState(false);
  const [formAbierto, setFormAbierto] = useState(false);
  const [rutinas, setRutinas] = useState<RutinaResumenDTO[]>([]);

  // Montaje bajo demanda (C1): una consulta por efecto. SIN guarda por ref:
  // con React StrictMode (dev, next.config) el doble efecto descartaba la
  // primera consulta (cleanup) y el segundo montaje era ignorado por la
  // guarda, dejando la sección en "Cargando..." para siempre (INC-10 GREEN
  // T8, cierre E2E). El flag `vivo` por ejecución cubre el desmontaje real.
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const data = await api.asignaciones.activa(clienteId);
        if (vivo) {
          setEstado({ asignacion: data.asignacion, estado: data.estado });
        }
      } catch {
        if (vivo) setEstado({ asignacion: null, estado: "SIN_RUTINA" });
      }
    })();
    return () => {
      vivo = false;
    };
  }, [clienteId]);

  const abrirFormulario = async () => {
    setFormAbierto(true);
    try {
      const data = await api.rutinas.listar();
      setRutinas(data.rutinas ?? []);
    } catch {
      setRutinas([]);
    }
  };

  // El formulario entrega el resultado en el click (patrón C3 INC-09): el
  // payload puede llegar como promesa; se asienta al resolverse y un rechazo
  // no altera la sección (el formulario muestra el error, NAV-RU-13).
  const asignada = (resultado: RutinaAsignacionDTO | Promise<RutinaAsignacionDTO>) => {
    Promise.resolve(resultado).then(
      (asignacion) => {
        setEstado({ asignacion, estado: "ACTIVA" });
        setFormAbierto(false);
        setVerSnapshot(false);
      },
      () => {
        /* el error lo asienta el propio formulario */
      }
    );
  };

  const asignacion = estado?.asignacion ?? null;

  return (
    <section
      role="region"
      aria-label="Rutina activa"
      className="mt-6 p-5 bg-dark-surface border border-gray-800 rounded-card"
    >
      <h2 className="text-xl font-display font-bold text-white uppercase">
        Rutina activa
      </h2>

      {!estado ? (
        <p className="mt-3 text-gray-400">Cargando...</p>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="px-2.5 py-1 text-xs font-mono rounded-card bg-royal/20 text-royal-light">
              {estado.estado}
            </span>
            {asignacion ? (
              <>
                <span className="text-white">{asignacion.rutina?.nombre}</span>
                {asignacion.actor ? (
                  <span className="text-gray-400 text-sm">{asignacion.actor.nombre}</span>
                ) : null}
              </>
            ) : null}
          </div>

          {asignacion && !verSnapshot ? (
            <button
              type="button"
              onClick={() => setVerSnapshot(true)}
              className="px-4 py-2 text-sm text-royal border border-royal/40 rounded-card hover:bg-royal/10 transition-colors"
            >
              Ver versión asignada
            </button>
          ) : null}

          {asignacion && verSnapshot ? (
            <div className="p-4 bg-near-black border border-gray-800 rounded-card">
              <button
                type="button"
                onClick={() => setVerSnapshot(false)}
                className="mb-3 px-4 py-2 text-sm text-gray-300 border border-gray-700 rounded-card hover:bg-dark-surface transition-colors"
              >
                Ocultar versión asignada
              </button>
              <RutinaVista rutina={(asignacion.contenidoSnapshot ?? {}) as RutinaContenido} />
            </div>
          ) : null}

          {!formAbierto && rol === "DUENO" ? (
            <button
              type="button"
              onClick={abrirFormulario}
              className="px-5 py-2.5 text-sm font-medium text-white bg-royal hover:bg-royal-dark rounded-card transition-colors"
            >
              Asignar rutina
            </button>
          ) : null}

          {formAbierto ? (
            <AsignarRutinaForm
              clienteId={clienteId}
              rutinas={rutinas}
              onAsignada={asignada}
              onCancelar={() => setFormAbierto(false)}
            />
          ) : null}
        </div>
      )}
    </section>
  );
}
