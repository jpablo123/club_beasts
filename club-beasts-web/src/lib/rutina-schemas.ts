/**
 * INC-10 (GREEN T8) — Espejo de validación de UI para rutinas (C4), SIN zod
 * (patrón INC-09 `anamnesis-schemas.ts`). Copia del contrato canónico
 * `club-beasts-api/features/acceptance-criteria/HU-18|HU-19|HU-20|HU-26-schemas`.
 *
 * Anti-deriva (INC10-R04 / INC09-R08): `tests/unit/inc10-rutinas-schemas-paridad.test.ts`
 * compara este espejo contra los schemas canónicos (literales, límites C4,
 * mensajes de `validarCampo` y `validarContencionCiclos`). NO editar mensajes
 * sin actualizar el canónico.
 *
 * El producto web NO importa `features/` (tsconfig/dependencias propias) ni
 * usa zod: la validación de UI es un espejo manual que reproduce el PRIMER
 * error de cada validador hoja del canónico, en el mismo orden de checks.
 */

// ---------------------------------------------------------------------------
// Literales del bloque 6 (mismo orden y capitalización que HU-19/HU-18)
// ---------------------------------------------------------------------------

export const TIPO_RUTINA = ["GENERICA", "INDUCCION", "PERSONALIZADA"] as const;

export const TIPO_RUTINA_BASE = ["GENERICA", "INDUCCION"] as const;

export const NIVEL_EXPERIENCIA = ["PRINCIPIANTE", "INTERMEDIO", "AVANZADO"] as const;

export const DIA_SEMANA = [
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
  "domingo",
] as const;

export const GRUPO_MUSCULAR = [
  "PECHO",
  "ESPALDA",
  "HOMBRO",
  "BICEPS",
  "TRICEPS",
  "CORE",
  "CUADRICEPS",
  "ISQUIOTIBIALES",
  "GLUTEOS",
  "PANTORRILLA",
  "CUERPO_COMPLETO",
] as const;

export const UNIDAD_MEDIDA = ["kg", "cm", "%", "unidad"] as const;

export const MEDIDA_ANTROPOMETRICA = [
  "peso",
  "estatura",
  "porcentajeGrasa",
  "masaMuscular",
  "perimetroBrazo",
  "perimetroCintura",
  "perimetroCadera",
  "perimetroMuslo",
  "perimetroPantorrilla",
  "pliegueTricipal",
  "pliegueSubescapular",
  "pliegueSuprailiaco",
  "pliegueAbdominal",
] as const;

export const ZONA_BIOMECANICA = [
  "CERVICAL",
  "TORACICA",
  "LUMBAR",
  "HOMBRO",
  "CODO",
  "MUNECA",
  "CADERA",
  "RODILLA",
  "TOBILLO",
  "PIE",
] as const;

export const HALLAZGO_BIOMECANICO = ["NORMAL", "LEVE", "MODERADO", "SEVERO"] as const;

/** Límites exactos C4 (contrato frontend C4 / DEC-064). */
export const LIMITES_RUTINA = {
  macrociclos: 20,
  mesociclos: 20,
  microciclos: 20,
  sesiones: 30,
  ejercicios: 30,
  series: 30,
  evaluaciones: 50,
} as const;

/** Literal del portal (HU-26 / DEC-068). */
export const SIN_RUTINA_MENSAJE = "No tienes una rutina activa";

/** Literales DEC-070 (idénticos al canónico HU-20-schemas). */
export const MENSAJES_ASIGNACION = {
  CLIENTE_NO_ENCONTRADO: "Cliente no encontrado",
  RUTINA_NO_ENCONTRADA: "Rutina no encontrada",
  SIN_VIGENCIA_PERSONALIZADA:
    "El cliente no tiene el servicio personalizado vigente: no se puede activar una rutina personalizada",
  RUTINA_YA_ACTIVA: "La rutina ya está activa para este cliente",
  CLIENTE_INACTIVO:
    "Cliente sin estado activo: no se le pueden asignar rutinas",
} as const;

/**
 * ENMIENDA C4 (INC-10 GREEN T8, 2026-11-05) — literal de concurrencia fijado
 * por T7 (`ASIGNACION_CONFLICTO`, 409). Se declara APARTE de
 * `MENSAJES_ASIGNACION`, igual que el canónico HU-20-schemas, porque la forma
 * de 5 entradas de `MENSAJES_ASIGNACION` está congelada por los tests
 * (paridad espejo↔canónico INC00-QA-01). Único cambio de src autorizado en
 * esta pasada.
 */
export const CODIGO_ASIGNACION_CONFLICTO = "ASIGNACION_CONFLICTO" as const;

export const MENSAJE_ASIGNACION_CONFLICTO =
  "Otra asignación cambió la rutina activa del cliente: vuelve a intentar" as const;

// ---------------------------------------------------------------------------
// Tipos de contenido (espejo de los schemas canónicos)
// ---------------------------------------------------------------------------

export type TipoRutina = (typeof TIPO_RUTINA)[number];

export interface Serie {
  repeticiones: string;
  intensidad: string;
  descansoSegundos: number;
  observaciones: string | null;
}

export interface Ejercicio {
  nombre: string;
  grupoMuscular: string | null;
  series: Serie[];
  observaciones: string | null;
}

export interface Sesion {
  nombre: string;
  dia: string | null;
  objetivo: string | null;
  ejercicios: Ejercicio[];
  observaciones: string | null;
}

export interface Microciclo {
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  objetivo: string | null;
  observaciones: string | null;
  sesiones: Sesion[];
}

export interface Mesociclo {
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  objetivo: string | null;
  observaciones: string | null;
  microciclos: Microciclo[];
}

export interface Macrociclo {
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  objetivo: string | null;
  observaciones: string | null;
  mesociclos: Mesociclo[];
}

export interface InformacionGeneral {
  objetivoGeneral: string;
  nivelExperiencia: string;
  fechaEvaluacion: string;
}

export interface DiagnosticoPersonalizada {
  diagnostico: string;
  restriccionesMedicas: string | null;
  lesionesPrevias: string | null;
  observacionesGenerales: string | null;
}

export interface TestEvaluacion {
  nombre: string;
  resultado: string;
  fecha: string;
  observaciones: string | null;
}

export interface MedidaAntropometrica {
  medida: string;
  valor: number;
  unidad: string;
  fecha: string;
  observaciones: string | null;
}

export interface HallazgoBiomecanico {
  zona: string;
  hallazgo: string;
  descripcion: string | null;
  fecha: string;
}

/** Borrador de genérica/inducción (payload de creación, DEC-064). */
export interface BorradorBase {
  tipoRutina: "GENERICA" | "INDUCCION";
  nombre: string;
  descripcion: string | null;
  objetivo: string | null;
  nivelExperiencia: string | null;
  sesiones: Sesion[];
}

/** Borrador de personalizada (P1..P5, DEC-062/063/018). */
export interface BorradorPersonalizada {
  tipoRutina: "PERSONALIZADA";
  nombre: string;
  descripcion: string | null;
  informacionGeneral: InformacionGeneral;
  diagnostico: DiagnosticoPersonalizada;
  macrociclos: Macrociclo[];
  tests: TestEvaluacion[];
  antropometria: MedidaAntropometrica[];
  analisisBiomecanico: HallazgoBiomecanico[];
}

export type BorradorRutina = BorradorBase | BorradorPersonalizada;

// ---------------------------------------------------------------------------
// Utilidades (copias del canónico HU-19)
// ---------------------------------------------------------------------------

const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;

/** Validación de fecha real de calendario (patrón del canónico HU-19). */
export function isValidDate(dateStr: string): boolean {
  if (!fechaRegex.test(dateStr)) return false;
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/** `null`/ausente = sin diligenciar (el canónico usa `opcionalTexto` = nullish).
 *  NOTA: `""` NO es "sin diligenciar" para el espejo de paridad (igual que el
 *  canónico: `""` pasa por el validador hoja y falla el mínimo). */
export function esNulo(valor: unknown): boolean {
  return valor === null || valor === undefined;
}

// ---------------------------------------------------------------------------
// Mensajes EXACTOS del canónico (primer error por campo)
// ---------------------------------------------------------------------------

const MSG = {
  nombreLongitud: "Nombre debe tener entre 3 y 100 caracteres",
  nombreFormato: "Nombre contiene caracteres no permitidos",
  nombreItemLongitud: "Nombre debe tener entre 3 y 120 caracteres",
  textoLargo: "El texto debe tener entre 1 y 500 caracteres",
  objetivoGeneral: "Objetivo general debe tener entre 10 y 1000 caracteres",
  diagnostico: "Diagnóstico debe tener entre 5 y 2000 caracteres",
  textoDiagnostico: "El texto debe tener entre 1 y 1000 caracteres",
  fechaEvaluacionRequerida: "Fecha de evaluación es requerida",
  fechaEvaluacionFormato:
    "Fecha de evaluación debe ser una fecha válida (YYYY-MM-DD)",
  fechaEvaluacionFutura: "Fecha de evaluación no puede ser futura",
  repeticionesFormato: "Repeticiones debe tener formato '8' o '8-12'",
  repeticionesRango: "Repeticiones: el valor inicial no puede superar al final",
  repeticionesLimite: "Repeticiones debe estar entre 1 y 999",
  intensidad: "Intensidad debe tener entre 1 y 50 caracteres",
  descansoTipo: "Descanso debe ser un número entero de segundos",
  descansoRango: "Descanso debe estar entre 0 y 3600 segundos",
  resultado: "Resultado debe tener entre 1 y 200 caracteres",
  valorTipo: "Valor debe ser un número",
  valorRango: "Valor debe estar entre 0.1 y 500",
  descripcionHallazgo: "La descripción debe tener entre 1 y 500 caracteres",
} as const;

const NOMBRE_RE = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s.,#()-]+$/;
const REPETICIONES_RE = /^\d{1,3}(-\d{1,3})?$/;

/** Cadena con min/max/regex: primer error en orden de checks del canónico. */
function validarCadena(
  valor: unknown,
  min: number,
  max: number,
  msgLongitud: string,
  regex: RegExp | null,
  msgFormato: string
): string | null {
  const texto = typeof valor === "string" ? valor : "";
  if (typeof valor !== "string" || texto.length < min) return msgLongitud;
  if (texto.length > max) return msgLongitud;
  if (regex && !regex.test(texto)) return msgFormato;
  return null;
}

/**
 * Validador hoja por campo: devuelve el MISMO primer mensaje que el schema
 * canónico (tests de paridad INC10-R04).
 */
export function validarCampo(campo: string, valor: unknown): string | null {
  switch (campo) {
    case "nombre":
      return validarCadena(valor, 3, 100, MSG.nombreLongitud, NOMBRE_RE, MSG.nombreFormato);
    case "nombreItem":
      return validarCadena(valor, 3, 120, MSG.nombreItemLongitud, NOMBRE_RE, MSG.nombreFormato);
    case "textoLargo":
      if (esNulo(valor)) return null;
      return validarCadena(valor, 1, 500, MSG.textoLargo, null, "");
    case "objetivoGeneral":
      return validarCadena(valor, 10, 1000, MSG.objetivoGeneral, null, "");
    case "diagnostico":
      return validarCadena(valor, 5, 2000, MSG.diagnostico, null, "");
    case "textoDiagnostico":
      if (esNulo(valor)) return null;
      return validarCadena(valor, 1, 1000, MSG.textoDiagnostico, null, "");
    case "resultado":
      return validarCadena(valor, 1, 200, MSG.resultado, null, "");
    case "descripcionHallazgo":
      if (esNulo(valor)) return null;
      return validarCadena(valor, 1, 500, MSG.descripcionHallazgo, null, "");
    case "valorMedida": {
      if (typeof valor !== "number" || Number.isNaN(valor)) return MSG.valorTipo;
      if (valor < 0.1) return MSG.valorRango;
      if (valor > 500) return MSG.valorRango;
      return null;
    }
    case "descansoSegundos": {
      if (typeof valor !== "number" || Number.isNaN(valor)) return MSG.descansoTipo;
      if (!Number.isInteger(valor)) return MSG.descansoTipo;
      if (valor < 0) return MSG.descansoRango;
      if (valor > 3600) return MSG.descansoRango;
      return null;
    }
    case "repeticiones": {
      const valido = validarCadena(
        valor,
        1,
        7,
        MSG.repeticionesFormato,
        REPETICIONES_RE,
        MSG.repeticionesFormato
      );
      if (valido) return valido;
      const partes = String(valor).split("-").map(Number);
      if (partes.length === 2 && partes[0] > partes[1]) return MSG.repeticionesRango;
      for (const n of partes) {
        if (n < 1 || n > 999) return MSG.repeticionesLimite;
      }
      return null;
    }
    case "intensidad":
      return validarCadena(valor, 1, 50, MSG.intensidad, null, "");
    case "fechaEvaluacion": {
      const texto = typeof valor === "string" ? valor : "";
      if (texto.length < 1) return MSG.fechaEvaluacionRequerida;
      if (!isValidDate(texto)) return MSG.fechaEvaluacionFormato;
      const hoy = new Date().toISOString().slice(0, 10);
      if (texto > hoy) return MSG.fechaEvaluacionFutura;
      return null;
    }
    default:
      return null;
  }
}

/**
 * Contención de rangos (RU-12): idéntico al canónico `validarContencionCiclos`.
 */
export function validarContencionCiclos(macrociclos: Macrociclo[]): string[] {
  const errores: string[] = [];
  for (const macro of macrociclos) {
    for (const meso of macro.mesociclos) {
      if (meso.fechaInicio < macro.fechaInicio || meso.fechaFin > macro.fechaFin) {
        errores.push(
          `Mesociclo '${meso.nombre}' debe estar contenido en el rango del macrociclo '${macro.nombre}'`
        );
      }
      for (const micro of meso.microciclos) {
        if (micro.fechaInicio < meso.fechaInicio || micro.fechaFin > meso.fechaFin) {
          errores.push(
            `Microciclo '${micro.nombre}' debe estar contenido en el rango del mesociclo '${meso.nombre}'`
          );
        }
      }
    }
  }
  return errores;
}

// ---------------------------------------------------------------------------
// Validación estructural del borrador (mensajes del canónico HU-18/HU-19)
// ---------------------------------------------------------------------------

export interface ErrorValidacion {
  mensaje: string;
  /** id del campo a enfocar (primer error = foco obligatorio C4). */
  foco: string | null;
}

function opcional(valor: string | null): string | null {
  return valor === null || valor === "" ? null : valor;
}

function validarSerie(serie: Serie, ruta: string, errores: ErrorValidacion[]): void {
  const empujar = (campo: string, valor: unknown) => {
    const mensaje = validarCampo(campo, valor);
    if (mensaje) errores.push({ mensaje, foco: `serie-${ruta}-${campo}` });
  };
  empujar("repeticiones", serie.repeticiones);
  empujar("intensidad", serie.intensidad);
  empujar("descansoSegundos", serie.descansoSegundos);
  const notas = validarCampo("textoLargo", opcional(serie.observaciones));
  if (notas) errores.push({ mensaje: notas, foco: `serie-${ruta}-notas` });
}

function validarEjercicio(ejercicio: Ejercicio, ruta: string, errores: ErrorValidacion[]): void {
  const nombre = validarCampo("nombreItem", ejercicio.nombre);
  if (nombre) errores.push({ mensaje: nombre, foco: `ejercicio-${ruta}-nombre` });
  const notas = validarCampo("textoLargo", opcional(ejercicio.observaciones));
  if (notas) errores.push({ mensaje: notas, foco: `ejercicio-${ruta}-notas` });
  if (ejercicio.series.length < 1) {
    errores.push({ mensaje: "Cada ejercicio debe tener al menos 1 serie", foco: null });
    return;
  }
  if (ejercicio.series.length > LIMITES_RUTINA.series) {
    errores.push({ mensaje: "Cada ejercicio puede tener máximo 30 series", foco: null });
  }
  ejercicio.series.forEach((serie, i) => validarSerie(serie, `${ruta}-${i}`, errores));
}

function validarSesion(sesion: Sesion, ruta: string, errores: ErrorValidacion[]): void {
  const nombre = validarCampo("nombreItem", sesion.nombre);
  if (nombre) errores.push({ mensaje: nombre, foco: `sesion-${ruta}-nombre` });
  const objetivo = validarCampo("textoLargo", opcional(sesion.objetivo));
  if (objetivo) errores.push({ mensaje: objetivo, foco: `sesion-${ruta}-objetivo` });
  const notas = validarCampo("textoLargo", opcional(sesion.observaciones));
  if (notas) errores.push({ mensaje: notas, foco: `sesion-${ruta}-notas` });
  if (sesion.ejercicios.length < 1) {
    errores.push({ mensaje: "Cada sesión debe tener al menos 1 ejercicio", foco: null });
    return;
  }
  if (sesion.ejercicios.length > LIMITES_RUTINA.ejercicios) {
    errores.push({ mensaje: "Cada sesión puede tener máximo 30 ejercicios", foco: null });
  }
  sesion.ejercicios.forEach((ejercicio, i) =>
    validarEjercicio(ejercicio, `${ruta}-${i}`, errores)
  );
}

function validarSesiones(sesiones: Sesion[], ruta: string, errores: ErrorValidacion[]): void {
  if (sesiones.length < 1) {
    errores.push({ mensaje: "Debe registrar al menos 1 sesión", foco: null });
    return;
  }
  if (sesiones.length > LIMITES_RUTINA.sesiones) {
    errores.push({ mensaje: "Puede registrar máximo 30 sesiones", foco: null });
  }
  sesiones.forEach((sesion, i) => validarSesion(sesion, `${ruta}-${i}`, errores));
}

function validarCicloFechas(
  ciclo: {
    nombre: string;
    fechaInicio: string;
    fechaFin: string;
    objetivo: string | null;
    observaciones: string | null;
  },
  ruta: string,
  errores: ErrorValidacion[]
): void {
  const nombre = validarCampo("nombreItem", ciclo.nombre);
  if (nombre) errores.push({ mensaje: nombre, foco: `ciclo-${ruta}-nombre` });
  for (const [campo, valor] of [
    ["fechaInicio", ciclo.fechaInicio],
    ["fechaFin", ciclo.fechaFin],
  ] as const) {
    if (!valor) {
      errores.push({
        mensaje: campo === "fechaInicio" ? "Fecha de inicio es requerida" : "Fecha de fin es requerida",
        foco: `ciclo-${ruta}-${campo}`,
      });
    } else if (!isValidDate(valor)) {
      errores.push({
        mensaje:
          campo === "fechaInicio"
            ? "Fecha de inicio debe ser una fecha válida (YYYY-MM-DD)"
            : "Fecha de fin debe ser una fecha válida (YYYY-MM-DD)",
        foco: `ciclo-${ruta}-${campo}`,
      });
    }
  }
  if (
    isValidDate(ciclo.fechaInicio) &&
    isValidDate(ciclo.fechaFin) &&
    ciclo.fechaFin < ciclo.fechaInicio
  ) {
    errores.push({
      mensaje: "Fecha de fin no puede ser anterior a la fecha de inicio",
      foco: `ciclo-${ruta}-fechaFin`,
    });
  }
  const objetivo = validarCampo("textoLargo", opcional(ciclo.objetivo));
  if (objetivo) errores.push({ mensaje: objetivo, foco: `ciclo-${ruta}-objetivo` });
  const notas = validarCampo("textoLargo", opcional(ciclo.observaciones));
  if (notas) errores.push({ mensaje: notas, foco: `ciclo-${ruta}-notas` });
}

/**
 * Validación completa del borrador (espejo de crearRutinaBaseSchema /
 * crearRutinaPersonalizadaSchema + validarContencionCiclos), en orden de
 * documento: el primer error es el que recibe el foco (C4).
 */
export function validarBorrador(borrador: BorradorRutina): ErrorValidacion[] {
  const errores: ErrorValidacion[] = [];
  const nombre = validarCampo("nombre", borrador.nombre);
  if (nombre) errores.push({ mensaje: nombre, foco: "campo-nombre" });
  const descripcion = validarCampo("textoLargo", opcional(borrador.descripcion));
  if (descripcion) errores.push({ mensaje: descripcion, foco: "campo-descripcion" });

  if (borrador.tipoRutina === "PERSONALIZADA") {
    const info = borrador.informacionGeneral;
    const objetivo = validarCampo("objetivoGeneral", info.objetivoGeneral);
    if (objetivo) errores.push({ mensaje: objetivo, foco: "campo-objetivo-general" });
    if (!NIVEL_EXPERIENCIA.includes(info.nivelExperiencia as (typeof NIVEL_EXPERIENCIA)[number])) {
      errores.push({
        mensaje: "Nivel de experiencia debe ser PRINCIPIANTE, INTERMEDIO o AVANZADO",
        foco: "campo-nivel-experiencia",
      });
    }
    const fechaEval = validarCampo("fechaEvaluacion", info.fechaEvaluacion);
    if (fechaEval) errores.push({ mensaje: fechaEval, foco: "campo-fecha-evaluacion" });

    const diag = borrador.diagnostico;
    const diagTexto = validarCampo("diagnostico", diag.diagnostico);
    if (diagTexto) errores.push({ mensaje: diagTexto, foco: "campo-diagnostico" });
    for (const [campo, valor, foco] of [
      ["textoDiagnostico", diag.restriccionesMedicas, "campo-restricciones"],
      ["textoDiagnostico", diag.lesionesPrevias, "campo-lesiones"],
      ["textoDiagnostico", diag.observacionesGenerales, "campo-notas-generales"],
    ] as const) {
      const mensaje = validarCampo(campo, opcional(valor));
      if (mensaje) errores.push({ mensaje, foco });
    }

    if (borrador.macrociclos.length < 1) {
      errores.push({ mensaje: "Debe registrar al menos un macrociclo", foco: null });
    } else if (borrador.macrociclos.length > LIMITES_RUTINA.macrociclos) {
      errores.push({ mensaje: "Puede registrar máximo 20 macrociclos", foco: null });
    }
    borrador.macrociclos.forEach((macro, mi) => {
      validarCicloFechas(macro, `macro-${mi}`, errores);
      if (macro.mesociclos.length < 1) {
        errores.push({ mensaje: "Cada macrociclo debe tener al menos 1 mesociclo", foco: null });
        return;
      }
      if (macro.mesociclos.length > LIMITES_RUTINA.mesociclos) {
        errores.push({ mensaje: "Cada macrociclo puede tener máximo 20 mesociclos", foco: null });
      }
      macro.mesociclos.forEach((meso, mei) => {
        validarCicloFechas(meso, `meso-${mi}-${mei}`, errores);
        if (meso.microciclos.length < 1) {
          errores.push({ mensaje: "Cada mesociclo debe tener al menos 1 microciclo", foco: null });
          return;
        }
        if (meso.microciclos.length > LIMITES_RUTINA.microciclos) {
          errores.push({ mensaje: "Cada mesociclo puede tener máximo 20 microciclos", foco: null });
        }
        meso.microciclos.forEach((micro, mii) => {
          validarCicloFechas(micro, `micro-${mi}-${mei}-${mii}`, errores);
          if (micro.sesiones.length < 1) {
            errores.push({ mensaje: "Cada microciclo debe tener al menos 1 sesión", foco: null });
            return;
          }
          if (micro.sesiones.length > LIMITES_RUTINA.sesiones) {
            errores.push({ mensaje: "Cada microciclo puede tener máximo 30 sesiones", foco: null });
          }
          micro.sesiones.forEach((sesion, si) =>
            validarSesion(sesion, `micro-${mi}-${mei}-${mii}-${si}`, errores)
          );
        });
      });
    });

    for (const erro of validarContencionCiclos(borrador.macrociclos)) {
      errores.push({ mensaje: erro, foco: null });
    }

    if (borrador.tests.length > LIMITES_RUTINA.evaluaciones) {
      errores.push({ mensaje: "Puede registrar máximo 50 tests", foco: null });
    }
    borrador.tests.forEach((test, i) => {
      const n = validarCampo("nombreItem", test.nombre);
      if (n) errores.push({ mensaje: n, foco: `test-${i}-nombre` });
      const r = validarCampo("resultado", test.resultado);
      if (r) errores.push({ mensaje: r, foco: `test-${i}-resultado` });
      if (!isValidDate(test.fecha)) {
        errores.push({
          mensaje: test.fecha
            ? "Fecha del test debe ser una fecha válida (YYYY-MM-DD)"
            : "Fecha del test es requerida",
          foco: `test-${i}-fecha`,
        });
      }
    });
    if (borrador.antropometria.length > LIMITES_RUTINA.evaluaciones) {
      errores.push({ mensaje: "Puede registrar máximo 50 medidas antropométricas", foco: null });
    }
    borrador.antropometria.forEach((medida, i) => {
      const v = validarCampo("valorMedida", medida.valor);
      if (v) errores.push({ mensaje: v, foco: `medida-${i}-valor` });
      if (!isValidDate(medida.fecha)) {
        errores.push({
          mensaje: medida.fecha
            ? "Fecha de la medida debe ser una fecha válida (YYYY-MM-DD)"
            : "Fecha de la medida es requerida",
          foco: `medida-${i}-fecha`,
        });
      }
    });
    if (borrador.analisisBiomecanico.length > LIMITES_RUTINA.evaluaciones) {
      errores.push({ mensaje: "Puede registrar máximo 50 hallazgos biomecánicos", foco: null });
    }
    borrador.analisisBiomecanico.forEach((hallazgo, i) => {
      const d = validarCampo("descripcionHallazgo", opcional(hallazgo.descripcion));
      if (d) errores.push({ mensaje: d, foco: `hallazgo-${i}-descripcion` });
      if (!isValidDate(hallazgo.fecha)) {
        errores.push({
          mensaje: hallazgo.fecha
            ? "Fecha del análisis debe ser una fecha válida (YYYY-MM-DD)"
            : "Fecha del análisis es requerida",
          foco: `hallazgo-${i}-fecha`,
        });
      }
    });
    return errores;
  }

  // Base (GENERICA / INDUCCION, DEC-064)
  const objetivo = validarCampo("textoLargo", opcional(borrador.objetivo));
  if (objetivo) errores.push({ mensaje: objetivo, foco: "campo-objetivo" });
  if (
    borrador.nivelExperiencia !== null &&
    borrador.nivelExperiencia !== "" &&
    !NIVEL_EXPERIENCIA.includes(borrador.nivelExperiencia as (typeof NIVEL_EXPERIENCIA)[number])
  ) {
    errores.push({
      mensaje: "Nivel de experiencia debe ser PRINCIPIANTE, INTERMEDIO o AVANZADO",
      foco: "campo-nivel-experiencia",
    });
  }
  validarSesiones(borrador.sesiones, "raiz", errores);
  return errores;
}

/** Payload normalizado para la API (`""` -> `null` en opcionales). */
export function normalizarPayload(borrador: BorradorRutina): BorradorRutina {
  const serie = (s: Serie): Serie => ({
    repeticiones: s.repeticiones.trim(),
    intensidad: s.intensidad.trim(),
    descansoSegundos: s.descansoSegundos,
    observaciones: opcional(s.observaciones),
  });
  const ejercicio = (e: Ejercicio): Ejercicio => ({
    nombre: e.nombre.trim(),
    grupoMuscular: opcional(e.grupoMuscular),
    series: e.series.map(serie),
    observaciones: opcional(e.observaciones),
  });
  const sesion = (s: Sesion): Sesion => ({
    nombre: s.nombre.trim(),
    dia: opcional(s.dia),
    objetivo: opcional(s.objetivo),
    ejercicios: s.ejercicios.map(ejercicio),
    observaciones: opcional(s.observaciones),
  });
  const ciclo = <T extends { objetivo: string | null; observaciones: string | null }>(
    c: T
  ): T => ({
    ...c,
    objetivo: opcional(c.objetivo),
    observaciones: opcional(c.observaciones),
  });
  if (borrador.tipoRutina === "PERSONALIZADA") {
    return {
      tipoRutina: "PERSONALIZADA",
      nombre: borrador.nombre.trim(),
      descripcion: opcional(borrador.descripcion),
      informacionGeneral: { ...borrador.informacionGeneral },
      diagnostico: {
        diagnostico: borrador.diagnostico.diagnostico.trim(),
        restriccionesMedicas: opcional(borrador.diagnostico.restriccionesMedicas),
        lesionesPrevias: opcional(borrador.diagnostico.lesionesPrevias),
        observacionesGenerales: opcional(borrador.diagnostico.observacionesGenerales),
      },
      macrociclos: borrador.macrociclos.map((macro) => ({
        ...ciclo(macro),
        mesociclos: macro.mesociclos.map((meso) => ({
          ...ciclo(meso),
          microciclos: meso.microciclos.map((micro) => ({
            ...ciclo(micro),
            sesiones: micro.sesiones.map(sesion),
          })),
        })),
      })),
      tests: borrador.tests.map((t) => ({
        nombre: t.nombre.trim(),
        resultado: t.resultado.trim(),
        fecha: t.fecha,
        observaciones: opcional(t.observaciones),
      })),
      antropometria: borrador.antropometria.map((m) => ({ ...m, observaciones: opcional(m.observaciones) })),
      analisisBiomecanico: borrador.analisisBiomecanico.map((h) => ({
        ...h,
        descripcion: opcional(h.descripcion),
      })),
    };
  }
  return {
    tipoRutina: borrador.tipoRutina,
    nombre: borrador.nombre.trim(),
    descripcion: opcional(borrador.descripcion),
    objetivo: opcional(borrador.objetivo),
    nivelExperiencia: opcional(borrador.nivelExperiencia),
    sesiones: borrador.sesiones.map(sesion),
  };
}

// ---------------------------------------------------------------------------
// Scaffolds (C4: "1 cadena válida por defecto que NO marca sucio")
// ---------------------------------------------------------------------------

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function sumarDiasISO(fecha: string, dias: number): string {
  const [y, m, d] = fecha.split("-").map(Number);
  const date = new Date(y, m - 1, d + dias);
  return date.toISOString().slice(0, 10);
}

export function serieScaffold(): Serie {
  return { repeticiones: "8-12", intensidad: "70% 1RM", descansoSegundos: 90, observaciones: null };
}

export function ejercicioScaffold(): Ejercicio {
  return {
    nombre: "Ejercicio 1",
    grupoMuscular: null,
    series: [serieScaffold()],
    observaciones: null,
  };
}

export function sesionScaffold(): Sesion {
  return {
    nombre: "Sesion 1",
    dia: null,
    objetivo: null,
    ejercicios: [ejercicioScaffold()],
    observaciones: null,
  };
}

/** Subárbol mínimo válido con fechas contenidas dentro del rango padre (C4). */
export function microcicloScaffold(
  rango?: { fechaInicio: string; fechaFin: string }
): Microciclo {
  const fechaInicio = rango?.fechaInicio ?? hoyISO();
  const fechaFin = rango?.fechaFin ?? sumarDiasISO(fechaInicio, 6);
  return {
    nombre: "Micro 1",
    fechaInicio,
    fechaFin,
    objetivo: null,
    observaciones: null,
    sesiones: [sesionScaffold()],
  };
}

export function mesocicloScaffold(
  rango?: { fechaInicio: string; fechaFin: string }
): Mesociclo {
  const fechaInicio = rango?.fechaInicio ?? hoyISO();
  const fechaFin = rango?.fechaFin ?? sumarDiasISO(fechaInicio, 29);
  return {
    nombre: "Meso 1",
    fechaInicio,
    fechaFin,
    objetivo: null,
    observaciones: null,
    microciclos: [microcicloScaffold({ fechaInicio, fechaFin })],
  };
}

export function macrocicloScaffold(): Macrociclo {
  const fechaInicio = hoyISO();
  const fechaFin = sumarDiasISO(fechaInicio, 364);
  return {
    nombre: "Macro 1",
    fechaInicio,
    fechaFin,
    objetivo: null,
    observaciones: null,
    mesociclos: [mesocicloScaffold({ fechaInicio, fechaFin })],
  };
}

/** Borrador inicial por tipo (scaffold con 1 cadena válida, no sucio). */
export function borradorScaffold(tipoRutina: TipoRutina): BorradorRutina {
  if (tipoRutina === "PERSONALIZADA") {
    return {
      tipoRutina: "PERSONALIZADA",
      nombre: "",
      descripcion: null,
      informacionGeneral: {
        objetivoGeneral: "",
        nivelExperiencia: "",
        fechaEvaluacion: "",
      },
      diagnostico: {
        diagnostico: "",
        restriccionesMedicas: null,
        lesionesPrevias: null,
        observacionesGenerales: null,
      },
      macrociclos: [macrocicloScaffold()],
      tests: [],
      antropometria: [],
      analisisBiomecanico: [],
    };
  }
  return {
    tipoRutina: tipoRutina === "INDUCCION" ? "INDUCCION" : "GENERICA",
    nombre: "",
    descripcion: null,
    objetivo: null,
    nivelExperiencia: null,
    sesiones: [sesionScaffold()],
  };
}
