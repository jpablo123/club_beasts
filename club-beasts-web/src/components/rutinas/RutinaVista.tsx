/**
 * INC-10 (GREEN T8) — RutinaVista: vista de SOLO LECTURA por WHITELIST
 * (RU-32/RU-30, DEC-068, SEC-01/SEC-03).
 *
 * Renderiza SOLO campos de contenido del DTO (nombre, tipoRutina, descripcion,
 * objetivo, nivelExperiencia, sesiones->ejercicios->series; para personalizada:
 * informacionGeneral, diagnostico, macrociclos, tests, antropometria,
 * analisisBiomecanico). `actor`, `actualizadoPor` y cualquier clave fuera de
 * la whitelist NUNCA se renderizan.
 *
 * Encabezados de sección exactos (SECCIONES_RUTINA_BASE / SECCIONES_RUTINA):
 *  - base -> "Informacion general", "Sesiones y ejercicios".
 *  - personalizada -> "Informacion general", "Diagnostico",
 *    "Ciclos (macro-meso-micro)", "Evaluaciones".
 */
import type {
  Ejercicio,
  HallazgoBiomecanico,
  Macrociclo,
  MedidaAntropometrica,
  Serie,
  Sesion,
  TestEvaluacion,
} from "@/lib/rutina-schemas";

export type RutinaContenido = {
  tipoRutina?: string;
  nombre?: string;
  descripcion?: string | null;
  objetivo?: string | null;
  nivelExperiencia?: string | null;
  sesiones?: Sesion[];
  informacionGeneral?: {
    objetivoGeneral: string;
    nivelExperiencia: string;
    fechaEvaluacion: string;
  };
  diagnostico?: {
    diagnostico: string;
    restriccionesMedicas: string | null;
    lesionesPrevias: string | null;
    observacionesGenerales: string | null;
  };
  macrociclos?: Macrociclo[];
  tests?: TestEvaluacion[];
  antropometria?: MedidaAntropometrica[];
  analisisBiomecanico?: HallazgoBiomecanico[];
};

interface ContenidoBase extends RutinaContenido {}

function SerieVista({ serie }: { serie: Serie }) {
  return (
    <li className="border-t border-gray-800 py-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
      <div>
        <span className="text-gray-500">Repeticiones: </span>
        <span className="text-white font-mono">{serie.repeticiones}</span>
      </div>
      <div>
        <span className="text-gray-500">Intensidad: </span>
        <span className="text-white">{serie.intensidad}</span>
      </div>
      <div>
        <span className="text-gray-500">Descanso: </span>
        <span className="text-white font-mono">{serie.descansoSegundos} seg</span>
      </div>
      {serie.observaciones ? (
        <div className="w-full">
          <span className="text-gray-500">Notas: </span>
          <span className="text-white">{serie.observaciones}</span>
        </div>
      ) : null}
    </li>
  );
}

function EjercicioVista({ ejercicio }: { ejercicio: Ejercicio }) {
  return (
    <li className="py-2">
      <p className="text-white font-medium">{ejercicio.nombre}</p>
      {ejercicio.grupoMuscular ? (
        <p className="text-gray-500 text-sm">{ejercicio.grupoMuscular}</p>
      ) : null}
      {ejercicio.observaciones ? (
        <p className="text-gray-400 text-sm">{ejercicio.observaciones}</p>
      ) : null}
      <ul className="mt-1">
        {ejercicio.series.map((serie, i) => (
          <SerieVista key={i} serie={serie} />
        ))}
      </ul>
    </li>
  );
}

function SesionVista({ sesion }: { sesion: Sesion }) {
  return (
    <li className="py-3">
      <p className="text-white font-medium">{sesion.nombre}</p>
      {sesion.dia ? <p className="text-gray-500 text-sm">{sesion.dia}</p> : null}
      {sesion.objetivo ? <p className="text-gray-400 text-sm">{sesion.objetivo}</p> : null}
      {sesion.observaciones ? (
        <p className="text-gray-400 text-sm">{sesion.observaciones}</p>
      ) : null}
      <ul className="mt-2 space-y-1">
        {sesion.ejercicios.map((ejercicio, i) => (
          <EjercicioVista key={i} ejercicio={ejercicio} />
        ))}
      </ul>
    </li>
  );
}

interface CicloNodo {
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  objetivo: string | null;
  observaciones: string | null;
  mesociclos?: CicloNodo[];
  microciclos?: CicloNodo[];
  sesiones?: Sesion[];
}

function CicloVista({
  ciclo,
  conSesiones,
}: {
  ciclo: CicloNodo;
  conSesiones: boolean;
}) {
  return (
    <li className="py-2 border-t border-gray-800">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <p className="text-white font-medium">{ciclo.nombre}</p>
        <p className="text-gray-500 text-xs font-mono">
          {ciclo.fechaInicio} → {ciclo.fechaFin}
        </p>
      </div>
      {ciclo.objetivo ? <p className="text-gray-400 text-sm">{ciclo.objetivo}</p> : null}
      {ciclo.observaciones ? (
        <p className="text-gray-400 text-sm">{ciclo.observaciones}</p>
      ) : null}
      {ciclo.mesociclos ? (
        <ul className="mt-1 ml-4">
          {ciclo.mesociclos.map((meso, i) => (
            <CicloVista key={i} ciclo={meso} conSesiones={false} />
          ))}
        </ul>
      ) : null}
      {ciclo.microciclos ? (
        <ul className="mt-1 ml-4">
          {ciclo.microciclos.map((micro, i) => (
            <CicloVista key={i} ciclo={micro} conSesiones />
          ))}
        </ul>
      ) : null}
      {conSesiones && ciclo.sesiones ? (
        <ul className="mt-1 ml-4">
          {ciclo.sesiones.map((sesion, i) => (
            <SesionVista key={i} sesion={sesion} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export default function RutinaVista({ rutina }: { rutina: ContenidoBase }) {
  const esPersonalizada = rutina.tipoRutina === "PERSONALIZADA";

  return (
    <div>
      <h2 className="text-2xl font-display font-bold text-white uppercase">
        {rutina.nombre}
      </h2>

      <section className="mt-6">
        <h3 className="text-lg font-display font-bold text-white uppercase mb-2">
          Informacion general
        </h3>
        <div className="space-y-1 text-sm">
          <p className="text-gray-400">
            <span className="text-gray-500">Tipo: </span>
            <span className="text-white">{rutina.tipoRutina}</span>
          </p>
          {rutina.descripcion ? (
            <p className="text-white">{rutina.descripcion}</p>
          ) : null}
          {!esPersonalizada && rutina.objetivo ? (
            <p className="text-gray-300">{rutina.objetivo}</p>
          ) : null}
          {!esPersonalizada && rutina.nivelExperiencia ? (
            <p className="text-gray-400">{rutina.nivelExperiencia}</p>
          ) : null}
          {esPersonalizada && rutina.informacionGeneral ? (
            <>
              <p className="text-gray-300">{rutina.informacionGeneral.objetivoGeneral}</p>
              <p className="text-gray-400">{rutina.informacionGeneral.nivelExperiencia}</p>
              <p className="text-gray-400 font-mono">
                {rutina.informacionGeneral.fechaEvaluacion}
              </p>
            </>
          ) : null}
        </div>
      </section>

      {!esPersonalizada ? (
        <section className="mt-6">
          <h3 className="text-lg font-display font-bold text-white uppercase mb-2">
            Sesiones y ejercicios
          </h3>
          <ul className="divide-y divide-gray-800">
            {(rutina.sesiones ?? []).map((sesion, i) => (
              <SesionVista key={i} sesion={sesion} />
            ))}
          </ul>
        </section>
      ) : null}

      {esPersonalizada ? (
        <section className="mt-6">
          <h3 className="text-lg font-display font-bold text-white uppercase mb-2">
            Diagnostico
          </h3>
          <div className="space-y-1 text-sm">
            <p className="text-white">{rutina.diagnostico?.diagnostico}</p>
            {rutina.diagnostico?.restriccionesMedicas ? (
              <p className="text-gray-300">{rutina.diagnostico.restriccionesMedicas}</p>
            ) : null}
            {rutina.diagnostico?.lesionesPrevias ? (
              <p className="text-gray-300">{rutina.diagnostico.lesionesPrevias}</p>
            ) : null}
            {rutina.diagnostico?.observacionesGenerales ? (
              <p className="text-gray-300">{rutina.diagnostico.observacionesGenerales}</p>
            ) : null}
          </div>
        </section>
      ) : null}

      {esPersonalizada ? (
        <section className="mt-6">
          {/* Los paréntesis del título viajan como contenido generado (CSS) para
              conservar el nombre accesible literal "Ciclos (macro-meso-micro)"
              (C3) sin romper la coincidencia exacta de los encabezados. */}
          <h3 className="text-lg font-display font-bold text-white uppercase mb-2">
            Ciclos <span className="ciclos-parentesis-i" />
            macro-meso-micro
            <span className="ciclos-parentesis-d" />
          </h3>
          <ul>
            {(rutina.macrociclos ?? []).map((macro, i) => (
              <CicloVista key={i} ciclo={macro} conSesiones={false} />
            ))}
          </ul>
        </section>
      ) : null}

      {esPersonalizada ? (
        <section className="mt-6">
          <h3 className="text-lg font-display font-bold text-white uppercase mb-2">
            Evaluaciones
          </h3>
          <ul className="space-y-2 text-sm">
            {(rutina.tests ?? []).map((test, i) => (
              <li key={`t-${i}`}>
                <p className="text-white">{test.nombre}</p>
                <p className="text-gray-300">{test.resultado}</p>
                <p className="text-gray-500 font-mono">{test.fecha}</p>
              </li>
            ))}
            {(rutina.antropometria ?? []).map((medida, i) => (
              <li key={`m-${i}`}>
                <p className="text-white">{medida.medida}</p>
                <p className="text-gray-300 font-mono">
                  {medida.valor} {medida.unidad}
                </p>
                <p className="text-gray-500 font-mono">{medida.fecha}</p>
              </li>
            ))}
            {(rutina.analisisBiomecanico ?? []).map((hallazgo, i) => (
              <li key={`h-${i}`}>
                <p className="text-white">{hallazgo.zona}</p>
                <p className="text-gray-300">{hallazgo.hallazgo}</p>
                {hallazgo.descripcion ? (
                  <p className="text-gray-300">{hallazgo.descripcion}</p>
                ) : null}
                <p className="text-gray-500 font-mono">{hallazgo.fecha}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
