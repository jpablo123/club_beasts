/**
 * INC-10 (GREEN T8) — EvaluacionesEditor: P5 de la personalizada (DEC-063).
 * Registros tipados: tests, antropometría y análisis biomecánico. Botones
 * exactos C3: "Agregar test", "Agregar medida", "Agregar hallazgo"
 * (evaluaciones 50 por sección, C4).
 */
import type {
  HallazgoBiomecanico,
  MedidaAntropometrica,
  TestEvaluacion,
} from "@/lib/rutina-schemas";
import {
  HALLAZGO_BIOMECANICO,
  MEDIDA_ANTROPOMETRICA,
  UNIDAD_MEDIDA,
  ZONA_BIOMECANICA,
} from "@/lib/rutina-schemas";

export interface EvaluacionesEditorProps {
  tests: TestEvaluacion[];
  antropometria: MedidaAntropometrica[];
  analisisBiomecanico: HallazgoBiomecanico[];
  onCambioTest: (indice: number, campo: keyof TestEvaluacion, valor: string) => void;
  onCambioMedida: (
    indice: number,
    campo: keyof MedidaAntropometrica,
    valor: string
  ) => void;
  onCambioHallazgo: (
    indice: number,
    campo: keyof HallazgoBiomecanico,
    valor: string
  ) => void;
  onQuitarTest: (indice: number) => void;
  onQuitarMedida: (indice: number) => void;
  onQuitarHallazgo: (indice: number) => void;
  onAgregarTest: () => void;
  onAgregarMedida: () => void;
  onAgregarHallazgo: () => void;
  puedeAgregarTest: boolean;
  puedeAgregarMedida: boolean;
  puedeAgregarHallazgo: boolean;
}

export default function EvaluacionesEditor({
  tests,
  antropometria,
  analisisBiomecanico,
  onCambioTest,
  onCambioMedida,
  onCambioHallazgo,
  onQuitarTest,
  onQuitarMedida,
  onQuitarHallazgo,
  onAgregarTest,
  onAgregarMedida,
  onAgregarHallazgo,
  puedeAgregarTest,
  puedeAgregarMedida,
  puedeAgregarHallazgo,
}: EvaluacionesEditorProps) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className="text-white font-medium">Tests</h4>
          <button
            type="button"
            onClick={onAgregarTest}
            disabled={!puedeAgregarTest}
            className="px-4 py-2 text-sm text-royal border border-royal/40 rounded-card hover:bg-royal/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Agregar test
          </button>
        </div>
        <div className="mt-3 space-y-3">
          {tests.map((test, i) => (
            <div
              key={i}
              className="p-3 bg-dark-surface/50 border border-gray-800 rounded-card grid grid-cols-1 sm:grid-cols-4 gap-3"
            >
              <div>
                <label htmlFor={`test-${i}-nombre`} className="block text-sm text-gray-400 mb-1">
                  Nombre del test
                </label>
                <input
                  id={`test-${i}-nombre`}
                  type="text"
                  value={test.nombre}
                  onChange={(e) => onCambioTest(i, "nombre", e.target.value)}
                  className="w-full px-3 py-2.5 bg-dark-surface border border-gray-700 rounded-card text-white focus:outline-none focus:ring-2 focus:ring-royal"
                />
              </div>
              <div>
                <label htmlFor={`test-${i}-resultado`} className="block text-sm text-gray-400 mb-1">
                  Resultado
                </label>
                <input
                  id={`test-${i}-resultado`}
                  type="text"
                  value={test.resultado}
                  onChange={(e) => onCambioTest(i, "resultado", e.target.value)}
                  className="w-full px-3 py-2.5 bg-dark-surface border border-gray-700 rounded-card text-white focus:outline-none focus:ring-2 focus:ring-royal"
                />
              </div>
              <div>
                <label htmlFor={`test-${i}-fecha`} className="block text-sm text-gray-400 mb-1">
                  Fecha del test
                </label>
                <input
                  id={`test-${i}-fecha`}
                  type="date"
                  value={test.fecha}
                  onChange={(e) => onCambioTest(i, "fecha", e.target.value)}
                  className="w-full px-3 py-2.5 bg-dark-surface border border-gray-700 rounded-card text-white focus:outline-none focus:ring-2 focus:ring-royal"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => onQuitarTest(i)}
                  className="px-3 py-2 text-sm text-red-400 border border-red-500/40 rounded-card hover:bg-red-500/10 transition-colors"
                >
                  Quitar test
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className="text-white font-medium">Antropometria</h4>
          <button
            type="button"
            onClick={onAgregarMedida}
            disabled={!puedeAgregarMedida}
            className="px-4 py-2 text-sm text-royal border border-royal/40 rounded-card hover:bg-royal/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Agregar medida
          </button>
        </div>
        <div className="mt-3 space-y-3">
          {antropometria.map((medida, i) => (
            <div
              key={i}
              className="p-3 bg-dark-surface/50 border border-gray-800 rounded-card grid grid-cols-1 sm:grid-cols-5 gap-3"
            >
              <div>
                <label htmlFor={`medida-${i}-medida`} className="block text-sm text-gray-400 mb-1">
                  Medida
                </label>
                <select
                  id={`medida-${i}-medida`}
                  value={medida.medida}
                  onChange={(e) => onCambioMedida(i, "medida", e.target.value)}
                  className="w-full px-3 py-2.5 bg-dark-surface border border-gray-700 rounded-card text-white focus:outline-none focus:ring-2 focus:ring-royal"
                >
                  {MEDIDA_ANTROPOMETRICA.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor={`medida-${i}-valor`} className="block text-sm text-gray-400 mb-1">
                  Valor
                </label>
                <input
                  id={`medida-${i}-valor`}
                  type="number"
                  step="0.1"
                  value={medida.valor}
                  onChange={(e) => onCambioMedida(i, "valor", e.target.value)}
                  className="w-full px-3 py-2.5 bg-dark-surface border border-gray-700 rounded-card text-white focus:outline-none focus:ring-2 focus:ring-royal"
                />
              </div>
              <div>
                <label htmlFor={`medida-${i}-unidad`} className="block text-sm text-gray-400 mb-1">
                  Unidad
                </label>
                <select
                  id={`medida-${i}-unidad`}
                  value={medida.unidad}
                  onChange={(e) => onCambioMedida(i, "unidad", e.target.value)}
                  className="w-full px-3 py-2.5 bg-dark-surface border border-gray-700 rounded-card text-white focus:outline-none focus:ring-2 focus:ring-royal"
                >
                  {UNIDAD_MEDIDA.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor={`medida-${i}-fecha`} className="block text-sm text-gray-400 mb-1">
                  Fecha de la medida
                </label>
                <input
                  id={`medida-${i}-fecha`}
                  type="date"
                  value={medida.fecha}
                  onChange={(e) => onCambioMedida(i, "fecha", e.target.value)}
                  className="w-full px-3 py-2.5 bg-dark-surface border border-gray-700 rounded-card text-white focus:outline-none focus:ring-2 focus:ring-royal"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => onQuitarMedida(i)}
                  className="px-3 py-2 text-sm text-red-400 border border-red-500/40 rounded-card hover:bg-red-500/10 transition-colors"
                >
                  Quitar medida
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className="text-white font-medium">Analisis biomecanico</h4>
          <button
            type="button"
            onClick={onAgregarHallazgo}
            disabled={!puedeAgregarHallazgo}
            className="px-4 py-2 text-sm text-royal border border-royal/40 rounded-card hover:bg-royal/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Agregar hallazgo
          </button>
        </div>
        <div className="mt-3 space-y-3">
          {analisisBiomecanico.map((hallazgo, i) => (
            <div
              key={i}
              className="p-3 bg-dark-surface/50 border border-gray-800 rounded-card grid grid-cols-1 sm:grid-cols-5 gap-3"
            >
              <div>
                <label htmlFor={`hallazgo-${i}-zona`} className="block text-sm text-gray-400 mb-1">
                  Zona
                </label>
                <select
                  id={`hallazgo-${i}-zona`}
                  value={hallazgo.zona}
                  onChange={(e) => onCambioHallazgo(i, "zona", e.target.value)}
                  className="w-full px-3 py-2.5 bg-dark-surface border border-gray-700 rounded-card text-white focus:outline-none focus:ring-2 focus:ring-royal"
                >
                  {ZONA_BIOMECANICA.map((z) => (
                    <option key={z} value={z}>
                      {z}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor={`hallazgo-${i}-hallazgo`} className="block text-sm text-gray-400 mb-1">
                  Hallazgo
                </label>
                <select
                  id={`hallazgo-${i}-hallazgo`}
                  value={hallazgo.hallazgo}
                  onChange={(e) => onCambioHallazgo(i, "hallazgo", e.target.value)}
                  className="w-full px-3 py-2.5 bg-dark-surface border border-gray-700 rounded-card text-white focus:outline-none focus:ring-2 focus:ring-royal"
                >
                  {HALLAZGO_BIOMECANICO.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor={`hallazgo-${i}-descripcion`}
                  className="block text-sm text-gray-400 mb-1"
                >
                  Descripción del hallazgo
                </label>
                <input
                  id={`hallazgo-${i}-descripcion`}
                  type="text"
                  value={hallazgo.descripcion ?? ""}
                  onChange={(e) => onCambioHallazgo(i, "descripcion", e.target.value)}
                  className="w-full px-3 py-2.5 bg-dark-surface border border-gray-700 rounded-card text-white focus:outline-none focus:ring-2 focus:ring-royal"
                />
              </div>
              <div>
                <label htmlFor={`hallazgo-${i}-fecha`} className="block text-sm text-gray-400 mb-1">
                  Fecha del análisis
                </label>
                <input
                  id={`hallazgo-${i}-fecha`}
                  type="date"
                  value={hallazgo.fecha}
                  onChange={(e) => onCambioHallazgo(i, "fecha", e.target.value)}
                  className="w-full px-3 py-2.5 bg-dark-surface border border-gray-700 rounded-card text-white focus:outline-none focus:ring-2 focus:ring-royal"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => onQuitarHallazgo(i)}
                  className="px-3 py-2 text-sm text-red-400 border border-red-500/40 rounded-card hover:bg-red-500/10 transition-colors"
                >
                  Quitar hallazgo
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
