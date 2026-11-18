/**
 * INC-10 (GREEN T8) — SerieFilas: filas-tabla de series del editor (C4).
 *
 * Etiquetas EXACTAS C3: "Repeticiones", "Intensidad", "Descanso (segundos)",
 * "Notas de la serie" (NUNCA "Observaciones") + botón "Quitar serie".
 */
import type { Serie } from "@/lib/rutina-schemas";

export interface SerieFilasProps {
  series: Serie[];
  /** Prefijo de ids (ruta por índice del ejercicio, C4). */
  ruta: string;
  onCambio: (indice: number, campo: keyof Serie, valor: string) => void;
  onQuitar: (indice: number) => void;
  onAgregar: () => void;
  puedeAgregar: boolean;
}

export default function SerieFilas({
  series,
  ruta,
  onCambio,
  onQuitar,
  onAgregar,
  puedeAgregar,
}: SerieFilasProps) {
  return (
    <div className="mt-2">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-400">
            <th className="py-1 pr-2 font-medium">Repeticiones</th>
            <th className="py-1 pr-2 font-medium">Intensidad</th>
            <th className="py-1 pr-2 font-medium">Descanso (segundos)</th>
            <th className="py-1 pr-2 font-medium">Notas de la serie</th>
            <th className="py-1" />
          </tr>
        </thead>
        <tbody>
          {series.map((serie, indice) => (
            <tr key={indice} className="align-top">
              <td className="py-1 pr-2">
                <label className="sr-only" htmlFor={`serie-${ruta}-${indice}-repeticiones`}>
                  Repeticiones
                </label>
                <input
                  id={`serie-${ruta}-${indice}-repeticiones`}
                  type="text"
                  value={serie.repeticiones}
                  onChange={(e) => onCambio(indice, "repeticiones", e.target.value)}
                  className="w-24 px-2 py-1.5 bg-dark-surface border border-gray-700 rounded-card text-white focus:outline-none focus:ring-2 focus:ring-royal"
                />
              </td>
              <td className="py-1 pr-2">
                <label className="sr-only" htmlFor={`serie-${ruta}-${indice}-intensidad`}>
                  Intensidad
                </label>
                <input
                  id={`serie-${ruta}-${indice}-intensidad`}
                  type="text"
                  value={serie.intensidad}
                  onChange={(e) => onCambio(indice, "intensidad", e.target.value)}
                  className="w-28 px-2 py-1.5 bg-dark-surface border border-gray-700 rounded-card text-white focus:outline-none focus:ring-2 focus:ring-royal"
                />
              </td>
              <td className="py-1 pr-2">
                <label className="sr-only" htmlFor={`serie-${ruta}-${indice}-descansoSegundos`}>
                  Descanso (segundos)
                </label>
                <input
                  id={`serie-${ruta}-${indice}-descansoSegundos`}
                  type="number"
                  value={serie.descansoSegundos}
                  onChange={(e) => onCambio(indice, "descansoSegundos", e.target.value)}
                  className="w-24 px-2 py-1.5 bg-dark-surface border border-gray-700 rounded-card text-white focus:outline-none focus:ring-2 focus:ring-royal"
                />
              </td>
              <td className="py-1 pr-2">
                <label className="sr-only" htmlFor={`serie-${ruta}-${indice}-notas`}>
                  Notas de la serie
                </label>
                <input
                  id={`serie-${ruta}-${indice}-notas`}
                  type="text"
                  value={serie.observaciones ?? ""}
                  onChange={(e) => onCambio(indice, "observaciones", e.target.value)}
                  className="w-full px-2 py-1.5 bg-dark-surface border border-gray-700 rounded-card text-white focus:outline-none focus:ring-2 focus:ring-royal"
                />
              </td>
              <td className="py-1">
                <button
                  type="button"
                  onClick={() => onQuitar(indice)}
                  className="px-3 py-1.5 text-sm text-red-400 border border-red-500/40 rounded-card hover:bg-red-500/10 transition-colors"
                >
                  Quitar serie
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        onClick={onAgregar}
        disabled={!puedeAgregar}
        className="mt-2 px-4 py-2 text-sm text-royal border border-royal/40 rounded-card hover:bg-royal/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Agregar serie
      </button>
    </div>
  );
}
