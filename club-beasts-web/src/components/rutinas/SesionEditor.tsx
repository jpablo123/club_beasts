/**
 * INC-10 (GREEN T8) — SesionEditor: sesión -> ejercicios -> series del editor
 * (C4, DEC-064). Cada ejercicio se renderiza `role="group"` con
 * `aria-label` = nombre del ejercicio (alcance por ruta de índice).
 */
import type { Ejercicio, Serie, Sesion } from "@/lib/rutina-schemas";
import { DIA_SEMANA, GRUPO_MUSCULAR } from "@/lib/rutina-schemas";
import SerieFilas from "./SerieFilas";

export interface SesionEditorProps {
  sesion: Sesion;
  /** Ruta por índice de la sesión (ids de foco, C4). */
  ruta: string;
  onCambioSesion: (campo: keyof Sesion, valor: string) => void;
  onCambioEjercicio: (
    indice: number,
    campo: keyof Ejercicio,
    valor: string
  ) => void;
  onCambioSerie: (
    indiceEjercicio: number,
    indiceSerie: number,
    campo: keyof Serie,
    valor: string
  ) => void;
  onAgregarEjercicio: () => void;
  onAgregarSerie: (indiceEjercicio: number) => void;
  onQuitarSerie: (indiceEjercicio: number, indiceSerie: number) => void;
  puedeAgregarEjercicio: boolean;
  puedeAgregarSerie: (indiceEjercicio: number) => boolean;
}

export default function SesionEditor({
  sesion,
  ruta,
  onCambioSesion,
  onCambioEjercicio,
  onCambioSerie,
  onAgregarEjercicio,
  onAgregarSerie,
  onQuitarSerie,
  puedeAgregarEjercicio,
  puedeAgregarSerie,
}: SesionEditorProps) {
  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor={`sesion-${ruta}-nombre`}
            className="block text-sm text-gray-400 mb-1"
          >
            Nombre de la sesión
          </label>
          <input
            id={`sesion-${ruta}-nombre`}
            type="text"
            value={sesion.nombre}
            onChange={(e) => onCambioSesion("nombre", e.target.value)}
            className="w-full px-3 py-2.5 bg-dark-surface border border-gray-700 rounded-card text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-royal"
          />
        </div>
        <div>
          <label
            htmlFor={`sesion-${ruta}-dia`}
            className="block text-sm text-gray-400 mb-1"
          >
            Día de la sesión
          </label>
          <select
            id={`sesion-${ruta}-dia`}
            value={sesion.dia ?? ""}
            onChange={(e) => onCambioSesion("dia", e.target.value)}
            className="w-full px-3 py-2.5 bg-dark-surface border border-gray-700 rounded-card text-white focus:outline-none focus:ring-2 focus:ring-royal"
          >
            <option value="">Sin día fijo</option>
            {DIA_SEMANA.map((dia) => (
              <option key={dia} value={dia}>
                {dia}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor={`sesion-${ruta}-objetivo`}
            className="block text-sm text-gray-400 mb-1"
          >
            Objetivo de la sesión
          </label>
          <input
            id={`sesion-${ruta}-objetivo`}
            type="text"
            value={sesion.objetivo ?? ""}
            onChange={(e) => onCambioSesion("objetivo", e.target.value)}
            className="w-full px-3 py-2.5 bg-dark-surface border border-gray-700 rounded-card text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-royal"
          />
        </div>
        <div>
          <label
            htmlFor={`sesion-${ruta}-notas`}
            className="block text-sm text-gray-400 mb-1"
          >
            Notas de la sesión
          </label>
          <input
            id={`sesion-${ruta}-notas`}
            type="text"
            value={sesion.observaciones ?? ""}
            onChange={(e) => onCambioSesion("observaciones", e.target.value)}
            className="w-full px-3 py-2.5 bg-dark-surface border border-gray-700 rounded-card text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-royal"
          />
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {sesion.ejercicios.map((ejercicio, indiceEjercicio) => {
          const rutaEjercicio = `${ruta}-${indiceEjercicio}`;
          return (
            <div
              key={indiceEjercicio}
              role="group"
              aria-label={ejercicio.nombre}
              className="p-4 bg-dark-surface/50 border border-gray-800 rounded-card"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label
                    htmlFor={`ejercicio-${rutaEjercicio}-nombre`}
                    className="block text-sm text-gray-400 mb-1"
                  >
                    Nombre del ejercicio
                  </label>
                  <input
                    id={`ejercicio-${rutaEjercicio}-nombre`}
                    type="text"
                    value={ejercicio.nombre}
                    onChange={(e) =>
                      onCambioEjercicio(indiceEjercicio, "nombre", e.target.value)
                    }
                    className="w-full px-3 py-2.5 bg-dark-surface border border-gray-700 rounded-card text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-royal"
                  />
                </div>
                <div>
                  <label
                    htmlFor={`ejercicio-${rutaEjercicio}-grupoMuscular`}
                    className="block text-sm text-gray-400 mb-1"
                  >
                    Grupo muscular
                  </label>
                  <select
                    id={`ejercicio-${rutaEjercicio}-grupoMuscular`}
                    value={ejercicio.grupoMuscular ?? ""}
                    onChange={(e) =>
                      onCambioEjercicio(indiceEjercicio, "grupoMuscular", e.target.value)
                    }
                    className="w-full px-3 py-2.5 bg-dark-surface border border-gray-700 rounded-card text-white focus:outline-none focus:ring-2 focus:ring-royal"
                  >
                    <option value="">Sin grupo muscular</option>
                    {GRUPO_MUSCULAR.map((grupo) => (
                      <option key={grupo} value={grupo}>
                        {grupo}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor={`ejercicio-${rutaEjercicio}-notas`}
                    className="block text-sm text-gray-400 mb-1"
                  >
                    Notas del ejercicio
                  </label>
                  <input
                    id={`ejercicio-${rutaEjercicio}-notas`}
                    type="text"
                    value={ejercicio.observaciones ?? ""}
                    onChange={(e) =>
                      onCambioEjercicio(indiceEjercicio, "observaciones", e.target.value)
                    }
                    className="w-full px-3 py-2.5 bg-dark-surface border border-gray-700 rounded-card text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-royal"
                  />
                </div>
              </div>

              <SerieFilas
                series={ejercicio.series}
                ruta={rutaEjercicio}
                onCambio={(indiceSerie, campo, valor) =>
                  onCambioSerie(indiceEjercicio, indiceSerie, campo, valor)
                }
                onQuitar={(indiceSerie) => onQuitarSerie(indiceEjercicio, indiceSerie)}
                onAgregar={() => onAgregarSerie(indiceEjercicio)}
                puedeAgregar={puedeAgregarSerie(indiceEjercicio)}
              />
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onAgregarEjercicio}
        disabled={!puedeAgregarEjercicio}
        className="mt-3 px-4 py-2 text-sm text-royal border border-royal/40 rounded-card hover:bg-royal/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Agregar ejercicio
      </button>
    </div>
  );
}
