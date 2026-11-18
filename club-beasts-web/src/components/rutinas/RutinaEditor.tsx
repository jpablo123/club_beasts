/**
 * INC-10 (GREEN T8) — RutinaEditor: editor del árbol de rutinas (Corte A, C4).
 *
 * Contrato fijado por el RED (tests/unit/inc10-rutinas-editor.test.tsx):
 *  - Export default `RutinaEditor({ tipoRutina, inicial, onAplicar, onDescartar })`.
 *  - Borrador ÚNICO por ruta de índice: cada acción muta solo su subárbol.
 *  - Cada ejercicio se renderiza `role="group"` con `aria-label` = nombre.
 *  - Etiquetas exactas C3: "Nombre de la rutina", "Repeticiones", "Intensidad",
 *    "Descanso (segundos)", "Notas de la serie" (NUNCA "Observaciones"),
 *    "Objetivo general", "Fecha de evaluación", "Inicio del ciclo",
 *    "Fin del ciclo" (NUNCA "Fecha de inicio"/"Fecha de fin").
 *  - Límites C4: al máximo, el botón "Agregar X" queda `disabled`.
 *  - "Aplicar cambios" valida con el espejo `src/lib/rutina-schemas.ts`; en
 *    error renderiza `role="alert"` con los mensajes canónicos y enfoca el
 *    primer campo inválido; válido llama `onAplicar(payload)`.
 *  - "Descartar cambios" llama `onDescartar` (si hay cambios sin guardar abre
 *    el alertdialog C5 "Cambios sin guardar" + "Si, descartar"/"Seguir
 *    editando" + banner + `beforeunload`, patrón INC-09).
 */
"use client";

import { useEffect, useRef, useState } from "react";
import {
  LIMITES_RUTINA,
  borradorScaffold,
  ejercicioScaffold,
  macrocicloScaffold,
  mesocicloScaffold,
  microcicloScaffold,
  normalizarPayload,
  serieScaffold,
  sesionScaffold,
  validarBorrador,
  type BorradorBase,
  type BorradorPersonalizada,
  type BorradorRutina,
  type Ejercicio,
  type ErrorValidacion,
  type HallazgoBiomecanico,
  type Macrociclo,
  type MedidaAntropometrica,
  type Mesociclo,
  type Microciclo,
  type Serie,
  type Sesion,
  type TestEvaluacion,
  type TipoRutina,
} from "@/lib/rutina-schemas";
import {
  DIA_SEMANA,
  NIVEL_EXPERIENCIA,
} from "@/lib/rutina-schemas";
import CicloAccordion from "./CicloAccordion";
import SesionEditor from "./SesionEditor";
import EvaluacionesEditor from "./EvaluacionesEditor";

export interface RutinaEditorProps {
  tipoRutina: TipoRutina;
  inicial: BorradorRutina | null;
  onAplicar: (payload: BorradorRutina) => void;
  onDescartar: () => void;
  /** "Volver al listado" (C3); solo se pinta si la página lo provee. */
  onVolver?: () => void;
}

// ─── Inicialización del borrador (scaffold = 1 cadena válida, no sucia) ─────

function normalizarSesion(sesion: Partial<Sesion>): Sesion {
  return {
    nombre: sesion.nombre ?? "",
    dia: sesion.dia ?? null,
    objetivo: sesion.objetivo ?? null,
    ejercicios: (sesion.ejercicios ?? []).map((ejercicio) => ({
      nombre: ejercicio.nombre ?? "",
      grupoMuscular: ejercicio.grupoMuscular ?? null,
      series: (ejercicio.series ?? []).map((serie) => ({
        repeticiones: serie.repeticiones ?? "",
        intensidad: serie.intensidad ?? "",
        descansoSegundos:
          typeof serie.descansoSegundos === "number" ? serie.descansoSegundos : 0,
        observaciones: serie.observaciones ?? null,
      })),
      observaciones: ejercicio.observaciones ?? null,
    })),
    observaciones: sesion.observaciones ?? null,
  };
}

function normalizarCiclo<T extends Macrociclo | Mesociclo | Microciclo>(
  ciclo: Partial<T>
): T {
  return {
    ...(ciclo as T),
    nombre: ciclo.nombre ?? "",
    fechaInicio: ciclo.fechaInicio ?? "",
    fechaFin: ciclo.fechaFin ?? "",
    objetivo: ciclo.objetivo ?? null,
    observaciones: ciclo.observaciones ?? null,
  } as T;
}

function inicializarBorrador(
  tipoRutina: TipoRutina,
  inicial: BorradorRutina | null
): BorradorRutina {
  const scaffold = borradorScaffold(tipoRutina);
  if (!inicial) return scaffold;
  if (tipoRutina === "PERSONALIZADA") {
    const p = inicial as Partial<BorradorPersonalizada>;
    const s = scaffold as BorradorPersonalizada;
    return {
      tipoRutina: "PERSONALIZADA",
      nombre: p.nombre ?? "",
      descripcion: p.descripcion ?? null,
      informacionGeneral: {
        objetivoGeneral: p.informacionGeneral?.objetivoGeneral ?? "",
        nivelExperiencia: p.informacionGeneral?.nivelExperiencia ?? "",
        fechaEvaluacion: p.informacionGeneral?.fechaEvaluacion ?? "",
      },
      diagnostico: {
        diagnostico: p.diagnostico?.diagnostico ?? "",
        restriccionesMedicas: p.diagnostico?.restriccionesMedicas ?? null,
        lesionesPrevias: p.diagnostico?.lesionesPrevias ?? null,
        observacionesGenerales: p.diagnostico?.observacionesGenerales ?? null,
      },
      macrociclos: (p.macrociclos ?? []).map((macro) => ({
        ...normalizarCiclo(macro),
        mesociclos: (macro.mesociclos ?? []).map((meso) => ({
          ...normalizarCiclo(meso),
          microciclos: (meso.microciclos ?? []).map((micro) => ({
            ...normalizarCiclo(micro),
            sesiones: (micro.sesiones ?? []).map(normalizarSesion),
          })),
        })),
      })),
      tests: (p.tests ?? []).map((test) => ({
        nombre: test.nombre ?? "",
        resultado: test.resultado ?? "",
        fecha: test.fecha ?? "",
        observaciones: test.observaciones ?? null,
      })),
      antropometria: (p.antropometria ?? []).map((medida) => ({
        medida: medida.medida ?? "peso",
        valor: typeof medida.valor === "number" ? medida.valor : 0,
        unidad: medida.unidad ?? "kg",
        fecha: medida.fecha ?? "",
        observaciones: medida.observaciones ?? null,
      })),
      analisisBiomecanico: (p.analisisBiomecanico ?? []).map((hallazgo) => ({
        zona: hallazgo.zona ?? "CERVICAL",
        hallazgo: hallazgo.hallazgo ?? "NORMAL",
        descripcion: hallazgo.descripcion ?? null,
        fecha: hallazgo.fecha ?? "",
      })),
      ...(p.macrociclos ? {} : { macrociclos: s.macrociclos }),
    };
  }
  const b = inicial as Partial<BorradorBase>;
  return {
    tipoRutina: tipoRutina === "INDUCCION" ? "INDUCCION" : "GENERICA",
    nombre: b.nombre ?? "",
    descripcion: b.descripcion ?? null,
    objetivo: b.objetivo ?? null,
    nivelExperiencia: b.nivelExperiencia ?? null,
    sesiones: (b.sesiones ?? []).map(normalizarSesion),
  };
}

// ─── Helpers por ruta de índice (borrador único, C4) ────────────────────────
// Ruta de sesión: [i] en base; [macro, meso, micro, i] en personalizada.

function mapSesion(
  draft: BorradorRutina,
  ruta: number[],
  fn: (sesion: Sesion) => Sesion
): BorradorRutina {
  if (ruta.length === 1) {
    const [i] = ruta;
    return {
      ...(draft as { sesiones: Sesion[] }),
      sesiones: (draft as { sesiones: Sesion[] }).sesiones.map((s, k) =>
        k === i ? fn(s) : s
      ),
    } as BorradorRutina;
  }
  const [mi, mei, mii, si] = ruta;
  const p = draft as BorradorPersonalizada;
  return {
    ...p,
    macrociclos: p.macrociclos.map((macro, a) =>
      a !== mi
        ? macro
        : {
            ...macro,
            mesociclos: macro.mesociclos.map((meso, b) =>
              b !== mei
                ? meso
                : {
                    ...meso,
                    microciclos: meso.microciclos.map((micro, c) =>
                      c !== mii
                        ? micro
                        : {
                            ...micro,
                            sesiones: micro.sesiones.map((s, d) =>
                              d === si ? fn(s) : s
                            ),
                          }
                    ),
                  }
            ),
          }
    ),
  };
}

function mapEjercicio(
  draft: BorradorRutina,
  ruta: number[],
  ei: number,
  fn: (ejercicio: Ejercicio) => Ejercicio
): BorradorRutina {
  return mapSesion(draft, ruta, (sesion) => ({
    ...sesion,
    ejercicios: sesion.ejercicios.map((e, k) => (k === ei ? fn(e) : e)),
  }));
}

function mapSerie(
  draft: BorradorRutina,
  ruta: number[],
  ei: number,
  si: number,
  fn: (serie: Serie) => Serie
): BorradorRutina {
  return mapEjercicio(draft, ruta, ei, (ejercicio) => ({
    ...ejercicio,
    series: ejercicio.series.map((s, k) => (k === si ? fn(s) : s)),
  }));
}

// INC10-FIX-04 (REV-01): se eliminan `totalSesiones`/`totalEjercicios`/
// `totalSeries` y `contarMesociclos`/`contarMicrociclos`: sus sumas GLOBALES
// del árbol deshabilitaban botones válidos por C4 (cap por nodo, no global).

// ─── Componente ─────────────────────────────────────────────────────────────

export default function RutinaEditor({
  tipoRutina,
  inicial,
  onAplicar,
  onDescartar,
  onVolver,
}: RutinaEditorProps) {
  const [draft, setDraft] = useState<BorradorRutina>(() =>
    inicializarBorrador(tipoRutina, inicial)
  );
  const base = useRef<string>(JSON.stringify(inicializarBorrador(tipoRutina, inicial)));
  const [errores, setErrores] = useState<ErrorValidacion[]>([]);
  const [confirmarSalida, setConfirmarSalida] = useState<"descartar" | "volver" | null>(
    null
  );
  const dialogoRef = useRef<HTMLDivElement>(null);
  const disparadorRef = useRef<HTMLButtonElement>(null);

  const sucio = JSON.stringify(draft) !== base.current;

  // C5 (patrón INC-09): aviso nativo al recargar/cerrar con cambios sin guardar.
  useEffect(() => {
    if (!sucio) return;
    const avisar = (evento: BeforeUnloadEvent) => {
      evento.preventDefault();
      evento.returnValue = "";
    };
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [sucio]);

  // C4: foco al primer error tras validar.
  useEffect(() => {
    if (errores.length === 0) return;
    const primero = errores.find((error) => error.foco);
    if (primero?.foco) {
      document.getElementById(primero.foco)?.focus();
    }
  }, [errores]);

  useEffect(() => {
    if (!confirmarSalida) return;
    dialogoRef.current?.focus();
    return () => {
      const disparador = disparadorRef.current;
      if (disparador?.isConnected) disparador.focus();
    };
  }, [confirmarSalida]);

  // ── Mutaciones por ruta de índice ──
  const cambiarSesion = (ruta: number[], campo: keyof Sesion, valor: string) =>
    setDraft((d) => mapSesion(d, ruta, (s) => ({ ...s, [campo]: valor || null })));

  const cambiarNombreSesion = (ruta: number[], valor: string) =>
    setDraft((d) => mapSesion(d, ruta, (s) => ({ ...s, nombre: valor })));

  const cambiarEjercicio = (
    ruta: number[],
    ei: number,
    campo: keyof Ejercicio,
    valor: string
  ) =>
    setDraft((d) =>
      mapEjercicio(d, ruta, ei, (e) =>
        campo === "nombre"
          ? { ...e, nombre: valor }
          : { ...e, [campo]: valor || null }
      )
    );

  const cambiarSerie = (
    ruta: number[],
    ei: number,
    si: number,
    campo: keyof Serie,
    valor: string
  ) =>
    setDraft((d) =>
      mapSerie(d, ruta, ei, si, (s) => {
        if (campo === "repeticiones" || campo === "intensidad") {
          return { ...s, [campo]: valor };
        }
        if (campo === "descansoSegundos") {
          const numero = Number(valor);
          return { ...s, descansoSegundos: Number.isNaN(numero) ? 0 : numero };
        }
        return { ...s, observaciones: valor || null };
      })
    );

  const agregarSerie = (ruta: number[], ei: number) =>
    setDraft((d) =>
      mapEjercicio(d, ruta, ei, (e) =>
        e.series.length >= LIMITES_RUTINA.series
          ? e
          : { ...e, series: [...e.series, serieScaffold()] }
      )
    );

  const quitarSerie = (ruta: number[], ei: number, si: number) =>
    setDraft((d) =>
      mapEjercicio(d, ruta, ei, (e) => ({
        ...e,
        series: e.series.filter((_, k) => k !== si),
      }))
    );

  const agregarEjercicio = (ruta: number[]) =>
    setDraft((d) =>
      mapSesion(d, ruta, (s) =>
        s.ejercicios.length >= LIMITES_RUTINA.ejercicios
          ? s
          : {
              ...s,
              ejercicios: [
                ...s.ejercicios,
                { ...ejercicioScaffold(), nombre: `Ejercicio ${s.ejercicios.length + 1}` },
              ],
            }
      )
    );

  const agregarSesion = (ruta: number[] | null) =>
    setDraft((d) => {
      if (ruta === null) {
        if (d.tipoRutina === "PERSONALIZADA") return d;
        if (d.sesiones.length >= LIMITES_RUTINA.sesiones) return d;
        return {
          ...d,
          sesiones: [
            ...d.sesiones,
            { ...sesionScaffold(), nombre: `Sesion ${d.sesiones.length + 1}` },
          ],
        };
      }
      const [mi, mei, mii] = ruta;
      const p = d as BorradorPersonalizada;
      return {
        ...p,
        macrociclos: p.macrociclos.map((macro, a) =>
          a !== mi
            ? macro
            : {
                ...macro,
                mesociclos: macro.mesociclos.map((meso, b) =>
                  b !== mei
                    ? meso
                    : {
                        ...meso,
                        microciclos: meso.microciclos.map((micro, c) =>
                          c !== mii
                            ? micro
                            : micro.sesiones.length >= LIMITES_RUTINA.sesiones
                            ? micro
                            : {
                                ...micro,
                                sesiones: [
                                  ...micro.sesiones,
                                  {
                                    ...sesionScaffold(),
                                    nombre: `Sesion ${micro.sesiones.length + 1}`,
                                  },
                                ],
                              }
                        ),
                      }
                ),
              }
        ),
      };
    });

  // ── Ciclos (solo personalizada) ──
  const cambiarCiclo = (
    nivel: "macro" | "meso" | "micro",
    ruta: number[],
    campo: string,
    valor: string
  ) =>
    setDraft((d) => {
      const p = d as BorradorPersonalizada;
      const cambios: Record<string, unknown> = {
        [campo]: campo === "nombre" ? valor : valor || null,
      };
      const aplicar = <T extends Macrociclo | Mesociclo | Microciclo>(ciclo: T): T =>
        ({ ...ciclo, ...cambios } as T);
      if (nivel === "macro") {
        const [mi] = ruta;
        return {
          ...p,
          macrociclos: p.macrociclos.map((m, i) => (i === mi ? aplicar(m) : m)),
        };
      }
      if (nivel === "meso") {
        const [mi, mei] = ruta;
        return {
          ...p,
          macrociclos: p.macrociclos.map((m, i) =>
            i !== mi
              ? m
              : {
                  ...m,
                  mesociclos: m.mesociclos.map((x, j) => (j === mei ? aplicar(x) : x)),
                }
          ),
        };
      }
      const [mi, mei, mii] = ruta;
      return {
        ...p,
        macrociclos: p.macrociclos.map((m, i) =>
          i !== mi
            ? m
            : {
                ...m,
                mesociclos: m.mesociclos.map((x, j) =>
                  j !== mei
                    ? x
                    : {
                        ...x,
                        microciclos: x.microciclos.map((y, k) =>
                          k === mii ? aplicar(y) : y
                        ),
                      }
                ),
              }
        ),
      };
    });

  const agregarMacrociclo = () =>
    setDraft((d) => {
      const p = d as BorradorPersonalizada;
      if (p.macrociclos.length >= LIMITES_RUTINA.macrociclos) return d;
      return {
        ...p,
        macrociclos: [
          ...p.macrociclos,
          { ...macrocicloScaffold(), nombre: `Macro ${p.macrociclos.length + 1}` },
        ],
      };
    });

  const agregarMesociclo = (mi: number) =>
    setDraft((d) => {
      const p = d as BorradorPersonalizada;
      return {
        ...p,
        macrociclos: p.macrociclos.map((macro, i) => {
          if (i !== mi) return macro;
          if (macro.mesociclos.length >= LIMITES_RUTINA.mesociclos) return macro;
          return {
            ...macro,
            mesociclos: [
              ...macro.mesociclos,
              {
                ...mesocicloScaffold({
                  fechaInicio: macro.fechaInicio,
                  fechaFin: macro.fechaFin,
                }),
                nombre: `Meso ${macro.mesociclos.length + 1}`,
              },
            ],
          };
        }),
      };
    });

  const agregarMicrociclo = (mi: number, mei: number) =>
    setDraft((d) => {
      const p = d as BorradorPersonalizada;
      return {
        ...p,
        macrociclos: p.macrociclos.map((macro, i) =>
          i !== mi
            ? macro
            : {
                ...macro,
                mesociclos: macro.mesociclos.map((meso, j) => {
                  if (j !== mei) return meso;
                  if (meso.microciclos.length >= LIMITES_RUTINA.microciclos) return meso;
                  return {
                    ...meso,
                    microciclos: [
                      ...meso.microciclos,
                      {
                        ...microcicloScaffold({
                          fechaInicio: meso.fechaInicio,
                          fechaFin: meso.fechaFin,
                        }),
                        nombre: `Micro ${meso.microciclos.length + 1}`,
                      },
                    ],
                  };
                }),
              }
        ),
      };
    });

  // ── Evaluaciones (solo personalizada) ──
  const cambiarEvaluacion = (
    seccion: "tests" | "antropometria" | "analisisBiomecanico",
    indice: number,
    campo: string,
    valor: string
  ) =>
    setDraft((d) => {
      const p = d as BorradorPersonalizada;
      const lista = p[seccion] as unknown as Array<Record<string, unknown>>;
      return {
        ...p,
        [seccion]: lista.map((item, i) =>
          i !== indice
            ? item
            : {
                ...item,
                [campo]:
                  campo === "valor"
                    ? Number.isNaN(Number(valor))
                      ? 0
                      : Number(valor)
                    : valor || null,
              }
        ),
      } as BorradorPersonalizada;
    });

  const quitarEvaluacion = (
    seccion: "tests" | "antropometria" | "analisisBiomecanico",
    indice: number
  ) =>
    setDraft((d) => {
      const p = d as BorradorPersonalizada;
      return {
        ...p,
        [seccion]: (p[seccion] as unknown as Array<unknown>).filter((_, i) => i !== indice),
      } as BorradorPersonalizada;
    });

  const agregarEvaluacion = (
    seccion: "tests" | "antropometria" | "analisisBiomecanico"
  ) =>
    setDraft((d) => {
      const p = d as BorradorPersonalizada;
      const lista = p[seccion] as unknown as Array<unknown>;
      if (lista.length >= LIMITES_RUTINA.evaluaciones) return d;
      const nuevo: Record<string, unknown> =
        seccion === "tests"
          ? { nombre: "", resultado: "", fecha: "", observaciones: null }
          : seccion === "antropometria"
          ? { medida: "peso", valor: 1, unidad: "kg", fecha: "", observaciones: null }
          : { zona: "CERVICAL", hallazgo: "NORMAL", descripcion: null, fecha: "" };
      return { ...p, [seccion]: [...lista, nuevo] } as BorradorPersonalizada;
    });

  // ── Acciones ──
  const manejarAplicar = () => {
    const encontrados = validarBorrador(draft);
    if (encontrados.length > 0) {
      setErrores(encontrados);
      return;
    }
    setErrores([]);
    onAplicar(normalizarPayload(draft));
  };

  const manejarDescartar = () => {
    if (sucio) {
      setConfirmarSalida("descartar");
      return;
    }
    onDescartar();
  };

  const manejarVolver = () => {
    if (!onVolver) return;
    if (sucio) {
      setConfirmarSalida("volver");
      return;
    }
    onVolver();
  };

  const confirmarSalidaPendiente = () => {
    const destino = confirmarSalida;
    setConfirmarSalida(null);
    if (destino === "volver") onVolver?.();
    else onDescartar();
  };

  // ── INC10-FIX-04 (REV-01): los límites C4 se evalúan POR NODO en cada
  // botón/prop (padre = macro/meso/micro/sesión/ejercicio). Se eliminan los
  // contadores globales del árbol (20/20/30 en total), que eran más estrictos
  // que el espejo `rutina-schemas` (validación por nodo, RU-19 intacta). ──

  const renderSesion = (sesion: Sesion, ruta: number[], rutaIds: string) => (
    <SesionEditor
      key={rutaIds}
      sesion={sesion}
      ruta={rutaIds}
      onCambioSesion={(campo, valor) => {
        if (campo === "nombre") cambiarNombreSesion(ruta, valor);
        else cambiarSesion(ruta, campo, valor);
      }}
      onCambioEjercicio={(ei, campo, valor) => cambiarEjercicio(ruta, ei, campo, valor)}
      onCambioSerie={(ei, si, campo, valor) => cambiarSerie(ruta, ei, si, campo, valor)}
      onAgregarEjercicio={() => agregarEjercicio(ruta)}
      onAgregarSerie={(ei) => agregarSerie(ruta, ei)}
      onQuitarSerie={(ei, si) => quitarSerie(ruta, ei, si)}
      // INC10-FIX-04 (REV-01): cap POR NODO por C4 = máximo 30 ejercicios por
      // SESIÓN (espejo rutina-schemas validarSesion), sin suma global.
      puedeAgregarEjercicio={sesion.ejercicios.length < LIMITES_RUTINA.ejercicios}
      puedeAgregarSerie={(ei) => {
        const ejercicio = sesion.ejercicios[ei];
        // INC10-FIX-04 (REV-01): cap POR NODO por C4 = máximo 30 series por
        // EJERCICIO (espejo rutina-schemas validarEjercicio), sin suma global.
        return (
          !!ejercicio && ejercicio.series.length < LIMITES_RUTINA.series
        );
      }}
    />
  );

  const renderCamposCiclo = (
    ciclo: Macrociclo | Mesociclo | Microciclo,
    nivel: "macro" | "meso" | "micro",
    ruta: number[],
    rutaIds: string
  ) => (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor={`ciclo-${rutaIds}-nombre`} className="block text-sm text-gray-400 mb-1">
            Nombre del ciclo
          </label>
          <input
            id={`ciclo-${rutaIds}-nombre`}
            type="text"
            value={ciclo.nombre}
            onChange={(e) => cambiarCiclo(nivel, ruta, "nombre", e.target.value)}
            className="w-full px-3 py-2.5 bg-dark-surface border border-gray-700 rounded-card text-white focus:outline-none focus:ring-2 focus:ring-royal"
          />
        </div>
        <div>
          <label
            htmlFor={`ciclo-${rutaIds}-fechaInicio`}
            className="block text-sm text-gray-400 mb-1"
          >
            Inicio del ciclo
          </label>
          <input
            id={`ciclo-${rutaIds}-fechaInicio`}
            type="date"
            value={ciclo.fechaInicio}
            onChange={(e) => cambiarCiclo(nivel, ruta, "fechaInicio", e.target.value)}
            className="w-full px-3 py-2.5 bg-dark-surface border border-gray-700 rounded-card text-white focus:outline-none focus:ring-2 focus:ring-royal"
          />
        </div>
        <div>
          <label
            htmlFor={`ciclo-${rutaIds}-fechaFin`}
            className="block text-sm text-gray-400 mb-1"
          >
            Fin del ciclo
          </label>
          <input
            id={`ciclo-${rutaIds}-fechaFin`}
            type="date"
            value={ciclo.fechaFin}
            onChange={(e) => cambiarCiclo(nivel, ruta, "fechaFin", e.target.value)}
            className="w-full px-3 py-2.5 bg-dark-surface border border-gray-700 rounded-card text-white focus:outline-none focus:ring-2 focus:ring-royal"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {/* C5: banner de cambios sin guardar (patrón INC-09). */}
      {sucio && (
        <div
          role="status"
          className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-card"
        >
          <p className="text-amber-400 text-sm">Cambios sin guardar</p>
        </div>
      )}

      {/* C4: errores de validación (role=alert) + foco al primer error. */}
      {errores.length > 0 && (
        <div
          role="alert"
          className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-card"
        >
          {errores.map((error, i) => (
            <p key={i} className="text-red-400 text-sm">
              {error.mensaje}
            </p>
          ))}
        </div>
      )}

      {/* Información general */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="campo-nombre" className="block text-sm text-gray-400 mb-1">
            Nombre de la rutina
          </label>
          <input
            id="campo-nombre"
            type="text"
            value={draft.nombre}
            onChange={(e) => setDraft((d) => ({ ...d, nombre: e.target.value }))}
            className="w-full px-3 py-2.5 bg-dark-surface border border-gray-700 rounded-card text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-royal"
          />
        </div>
        <div>
          <label htmlFor="campo-descripcion" className="block text-sm text-gray-400 mb-1">
            Descripción
          </label>
          <input
            id="campo-descripcion"
            type="text"
            value={draft.descripcion ?? ""}
            onChange={(e) =>
              setDraft((d) => ({ ...d, descripcion: e.target.value || null }))
            }
            className="w-full px-3 py-2.5 bg-dark-surface border border-gray-700 rounded-card text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-royal"
          />
        </div>

        {draft.tipoRutina !== "PERSONALIZADA" ? (
          <>
            <div>
              <label htmlFor="campo-objetivo" className="block text-sm text-gray-400 mb-1">
                Objetivo
              </label>
              <input
                id="campo-objetivo"
                type="text"
                value={draft.objetivo ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, objetivo: e.target.value || null }))
                }
                className="w-full px-3 py-2.5 bg-dark-surface border border-gray-700 rounded-card text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-royal"
              />
            </div>
            <div>
              <label
                htmlFor="campo-nivel-experiencia"
                className="block text-sm text-gray-400 mb-1"
              >
                Nivel de experiencia
              </label>
              <select
                id="campo-nivel-experiencia"
                value={draft.nivelExperiencia ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, nivelExperiencia: e.target.value || null }))
                }
                className="w-full px-3 py-2.5 bg-dark-surface border border-gray-700 rounded-card text-white focus:outline-none focus:ring-2 focus:ring-royal"
              >
                <option value="">Sin nivel</option>
                {NIVEL_EXPERIENCIA.map((nivel) => (
                  <option key={nivel} value={nivel}>
                    {nivel}
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : null}
      </div>

      {/* P1/P2 (solo personalizada) */}
      {draft.tipoRutina === "PERSONALIZADA" ? (
        <div className="mt-6 space-y-4">
          <h3 className="text-lg font-display font-bold text-white uppercase">
            Informacion general
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="campo-objetivo-general"
                className="block text-sm text-gray-400 mb-1"
              >
                Objetivo general
              </label>
              <input
                id="campo-objetivo-general"
                type="text"
                value={draft.informacionGeneral.objetivoGeneral}
                onChange={(e) =>
                  setDraft((d) => {
                    const p = d as BorradorPersonalizada;
                    return {
                      ...p,
                      informacionGeneral: {
                        ...p.informacionGeneral,
                        objetivoGeneral: e.target.value,
                      },
                    };
                  })
                }
                className="w-full px-3 py-2.5 bg-dark-surface border border-gray-700 rounded-card text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-royal"
              />
            </div>
            <div>
              <label
                htmlFor="campo-nivel-experiencia"
                className="block text-sm text-gray-400 mb-1"
              >
                Nivel de experiencia
              </label>
              <select
                id="campo-nivel-experiencia"
                value={draft.informacionGeneral.nivelExperiencia}
                onChange={(e) =>
                  setDraft((d) => {
                    const p = d as BorradorPersonalizada;
                    return {
                      ...p,
                      informacionGeneral: {
                        ...p.informacionGeneral,
                        nivelExperiencia: e.target.value,
                      },
                    };
                  })
                }
                className="w-full px-3 py-2.5 bg-dark-surface border border-gray-700 rounded-card text-white focus:outline-none focus:ring-2 focus:ring-royal"
              >
                <option value="">Sin nivel</option>
                {NIVEL_EXPERIENCIA.map((nivel) => (
                  <option key={nivel} value={nivel}>
                    {nivel}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="campo-fecha-evaluacion"
                className="block text-sm text-gray-400 mb-1"
              >
                Fecha de evaluación
              </label>
              <input
                id="campo-fecha-evaluacion"
                type="date"
                value={draft.informacionGeneral.fechaEvaluacion}
                onChange={(e) =>
                  setDraft((d) => {
                    const p = d as BorradorPersonalizada;
                    return {
                      ...p,
                      informacionGeneral: {
                        ...p.informacionGeneral,
                        fechaEvaluacion: e.target.value,
                      },
                    };
                  })
                }
                className="w-full px-3 py-2.5 bg-dark-surface border border-gray-700 rounded-card text-white focus:outline-none focus:ring-2 focus:ring-royal"
              />
            </div>
          </div>

          <h3 className="text-lg font-display font-bold text-white uppercase">Diagnostico</h3>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label htmlFor="campo-diagnostico" className="block text-sm text-gray-400 mb-1">
                Diagnostico
              </label>
              <input
                id="campo-diagnostico"
                type="text"
                value={draft.diagnostico.diagnostico}
                onChange={(e) =>
                  setDraft((d) => {
                    const p = d as BorradorPersonalizada;
                    return {
                      ...p,
                      diagnostico: { ...p.diagnostico, diagnostico: e.target.value },
                    };
                  })
                }
                className="w-full px-3 py-2.5 bg-dark-surface border border-gray-700 rounded-card text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-royal"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="campo-restricciones"
                  className="block text-sm text-gray-400 mb-1"
                >
                  Restricciones médicas
                </label>
                <input
                  id="campo-restricciones"
                  type="text"
                  value={draft.diagnostico.restriccionesMedicas ?? ""}
                  onChange={(e) =>
                    setDraft((d) => {
                      const p = d as BorradorPersonalizada;
                      return {
                        ...p,
                        diagnostico: {
                          ...p.diagnostico,
                          restriccionesMedicas: e.target.value || null,
                        },
                      };
                    })
                  }
                  className="w-full px-3 py-2.5 bg-dark-surface border border-gray-700 rounded-card text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-royal"
                />
              </div>
              <div>
                <label htmlFor="campo-lesiones" className="block text-sm text-gray-400 mb-1">
                  Lesiones previas
                </label>
                <input
                  id="campo-lesiones"
                  type="text"
                  value={draft.diagnostico.lesionesPrevias ?? ""}
                  onChange={(e) =>
                    setDraft((d) => {
                      const p = d as BorradorPersonalizada;
                      return {
                        ...p,
                        diagnostico: {
                          ...p.diagnostico,
                          lesionesPrevias: e.target.value || null,
                        },
                      };
                    })
                  }
                  className="w-full px-3 py-2.5 bg-dark-surface border border-gray-700 rounded-card text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-royal"
                />
              </div>
              <div>
                <label
                  htmlFor="campo-notas-generales"
                  className="block text-sm text-gray-400 mb-1"
                >
                  Notas generales
                </label>
                <input
                  id="campo-notas-generales"
                  type="text"
                  value={draft.diagnostico.observacionesGenerales ?? ""}
                  onChange={(e) =>
                    setDraft((d) => {
                      const p = d as BorradorPersonalizada;
                      return {
                        ...p,
                        diagnostico: {
                          ...p.diagnostico,
                          observacionesGenerales: e.target.value || null,
                        },
                      };
                    })
                  }
                  className="w-full px-3 py-2.5 bg-dark-surface border border-gray-700 rounded-card text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-royal"
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* P3: árbol macro-meso-micro (solo personalizada) */}
      {draft.tipoRutina === "PERSONALIZADA" ? (
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-display font-bold text-white uppercase">
              Ciclos (macro-meso-micro)
            </h3>
            <button
              type="button"
              onClick={agregarMacrociclo}
              disabled={draft.macrociclos.length >= LIMITES_RUTINA.macrociclos}
              className="px-4 py-2 text-sm text-royal border border-royal/40 rounded-card hover:bg-royal/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Agregar macrociclo
            </button>
          </div>
          <div className="mt-3">
            {draft.macrociclos.map((macro, mi) => (
              <CicloAccordion key={mi} nombre={macro.nombre}>
                {renderCamposCiclo(macro, "macro", [mi], `macro-${mi}`)}
                <button
                  type="button"
                  onClick={() => agregarMesociclo(mi)}
                  disabled={
                    // INC10-FIX-04 (REV-01): cap POR NODO (= límite del padre
                    // macro, espejo rutina-schemas), nunca conteo global.
                    macro.mesociclos.length >= LIMITES_RUTINA.mesociclos
                  }
                  className="mt-3 px-4 py-2 text-sm text-royal border border-royal/40 rounded-card hover:bg-royal/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Agregar mesociclo
                </button>
                {macro.mesociclos.map((meso, mei) => (
                  <CicloAccordion key={mei} nombre={meso.nombre}>
                    {renderCamposCiclo(meso, "meso", [mi, mei], `meso-${mi}-${mei}`)}
                    <button
                      type="button"
                      onClick={() => agregarMicrociclo(mi, mei)}
                      disabled={
                        // INC10-FIX-04 (REV-01): cap POR NODO (= límite del
                        // padre meso, espejo rutina-schemas), nunca global.
                        meso.microciclos.length >= LIMITES_RUTINA.microciclos
                      }
                      className="mt-3 px-4 py-2 text-sm text-royal border border-royal/40 rounded-card hover:bg-royal/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Agregar microciclo
                    </button>
                    {meso.microciclos.map((micro, mii) => (
                      <CicloAccordion key={mii} nombre={micro.nombre}>
                        {renderCamposCiclo(
                          micro,
                          "micro",
                          [mi, mei, mii],
                          `micro-${mi}-${mei}-${mii}`
                        )}
                        <button
                          type="button"
                          onClick={() => agregarSesion([mi, mei, mii])}
                          disabled={
                            // INC10-FIX-04 (REV-01): cap POR NODO (= límite
                            // del padre micro, espejo rutina-schemas), nunca
                            // el total global del árbol.
                            micro.sesiones.length >= LIMITES_RUTINA.sesiones
                          }
                          className="mt-3 px-4 py-2 text-sm text-royal border border-royal/40 rounded-card hover:bg-royal/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Agregar sesión
                        </button>
                        <div className="mt-3 space-y-4">
                          {micro.sesiones.map((sesion, si) =>
                            renderSesion(
                              sesion,
                              [mi, mei, mii, si],
                              `micro-${mi}-${mei}-${mii}-${si}`
                            )
                          )}
                        </div>
                      </CicloAccordion>
                    ))}
                  </CicloAccordion>
                ))}
              </CicloAccordion>
            ))}
          </div>
        </div>
      ) : null}

      {/* B2: sesiones raíz (base, DEC-064) */}
      {draft.tipoRutina !== "PERSONALIZADA" ? (
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-display font-bold text-white uppercase">
              Sesiones y ejercicios
            </h3>
            <button
              type="button"
              onClick={() => agregarSesion(null)}
              disabled={draft.sesiones.length >= LIMITES_RUTINA.sesiones}
              className="px-4 py-2 text-sm text-royal border border-royal/40 rounded-card hover:bg-royal/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Agregar sesión
            </button>
          </div>
          <div className="mt-3 space-y-4">
            {draft.sesiones.map((sesion, i) => renderSesion(sesion, [i], `raiz-${i}`))}
          </div>
        </div>
      ) : null}

      {/* P5: evaluaciones (solo personalizada) */}
      {draft.tipoRutina === "PERSONALIZADA" ? (
        <div className="mt-6">
          <h3 className="text-lg font-display font-bold text-white uppercase">
            Evaluaciones
          </h3>
          <div className="mt-3">
            <EvaluacionesEditor
              tests={draft.tests}
              antropometria={draft.antropometria}
              analisisBiomecanico={draft.analisisBiomecanico}
              onCambioTest={(i, campo, valor) =>
                cambiarEvaluacion("tests", i, String(campo), valor)
              }
              onCambioMedida={(i, campo, valor) =>
                cambiarEvaluacion("antropometria", i, String(campo), valor)
              }
              onCambioHallazgo={(i, campo, valor) =>
                cambiarEvaluacion("analisisBiomecanico", i, String(campo), valor)
              }
              onQuitarTest={(i) => quitarEvaluacion("tests", i)}
              onQuitarMedida={(i) => quitarEvaluacion("antropometria", i)}
              onQuitarHallazgo={(i) => quitarEvaluacion("analisisBiomecanico", i)}
              onAgregarTest={() => agregarEvaluacion("tests")}
              onAgregarMedida={() => agregarEvaluacion("antropometria")}
              onAgregarHallazgo={() => agregarEvaluacion("analisisBiomecanico")}
              puedeAgregarTest={draft.tests.length < LIMITES_RUTINA.evaluaciones}
              puedeAgregarMedida={
                draft.antropometria.length < LIMITES_RUTINA.evaluaciones
              }
              puedeAgregarHallazgo={
                draft.analisisBiomecanico.length < LIMITES_RUTINA.evaluaciones
              }
            />
          </div>
        </div>
      ) : null}

      {/* Acciones (C3) */}
      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={manejarAplicar}
          className="px-6 py-2.5 text-sm font-medium text-white bg-royal hover:bg-royal-dark rounded-card transition-colors"
        >
          Aplicar cambios
        </button>
        <button
          type="button"
          ref={disparadorRef}
          onClick={manejarDescartar}
          className="px-6 py-2.5 text-sm font-medium text-gray-300 border border-gray-700 rounded-card hover:bg-dark-surface transition-colors"
        >
          Descartar cambios
        </button>
        {onVolver ? (
          <button
            type="button"
            onClick={manejarVolver}
            className="px-6 py-2.5 text-sm font-medium text-gray-300 border border-gray-700 rounded-card hover:bg-dark-surface transition-colors"
          >
            Volver al listado
          </button>
        ) : null}
      </div>

      {/* C5 (patrón INC-09): confirmación de salida con cambios sin guardar. */}
      {confirmarSalida ? (
        <div
          ref={dialogoRef}
          tabIndex={-1}
          role="alertdialog"
          aria-modal="true"
          aria-label="Descartar cambios"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-5 focus:outline-none"
        >
          <div className="max-w-md w-full bg-dark-surface border border-gray-700 rounded-card p-6">
            <p className="text-white mb-4">Cambios sin guardar</p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={confirmarSalidaPendiente}
                className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-card transition-colors"
              >
                Si, descartar
              </button>
              <button
                type="button"
                onClick={() => setConfirmarSalida(null)}
                className="px-4 py-2 text-sm text-gray-300 border border-gray-700 rounded-card hover:bg-dark-surface/60 transition-colors"
              >
                Seguir editando
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// INC10-FIX-04 (REV-01): aquí termina el componente; los contadores globales
// `contarMesociclos`/`contarMicrociclos` se eliminaron (cap por nodo, ver arriba).
