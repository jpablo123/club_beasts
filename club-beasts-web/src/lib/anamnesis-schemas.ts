/**
 * INC-09 (GREEN T10) — ESPEJO web de validación de la anamnesis deportiva.
 * Criterio C3 / INC09-R06: la validación de UI es un ESPEJO manual (sin zod)
 * del contrato canónico `club-beasts-api/features/acceptance-criteria/
 * HU-09-schemas.ts` (+ `HU-11-schemas.ts` para AN-26 y el estado derivado).
 *
 * El web NO importa `features/` en producto ni tiene zod como dependencia:
 * los literales, regex y mensajes de este módulo son copias EXACTAS del
 * canónico (mismo orden de comprobaciones = mismo primer error). La barrera
 * anti-drift es `tests/unit/inc09-anamnesis-schemas-paridad.test.ts`, que
 * compara este espejo contra el canónico en runtime.
 *
 * Reglas espejo (tabla canónica HU-09):
 *  - "Sin diligenciar" (`null`, `""`, `undefined`) nunca produce error.
 *  - `validarCampo` devuelve el MISMO mensaje del canónico (primer error).
 *  - Las contradicciones SI/NO son multi-campo y las valida la API; el editor
 *    las evita limpiando los condicionales 12/18b (AN-07).
 *  - Estado derivado (HU-11): `derivarEstado` = PENDIENTE/COMPLETA según la
 *    completitud de obligatorios (*) + condicionales aplicables.
 */

// ---------------------------------------------------------------------------
// Literales EXACTOS del Anexo DEC-052 (idénticos al canónico, mismo orden)
// ---------------------------------------------------------------------------

/** Campo 3 — Sexo. */
export const SEXO = ["FEMENINO", "MASCULINO"] as const;

/** Campos 11 y 18 — preguntas SI/NO. */
export const SI_NO = ["SI", "NO"] as const;

/**
 * Campo 16 — Antecedentes Médicos (multi-select, 8 opciones exactas).
 * La capitalización irregular es literal del formulario.
 */
export const ANTECEDENTES_MEDICOS = [
  "Alergias",
  "Fracturas o desgarros",
  "cirugias",
  "medicamentos",
  "ingiere alcohol",
  "consume psicoactivos",
  "fuma",
  "Ninguno",
] as const;

/** Campo 21 — Días que no puede entrenar (multi, lunes..viernes exactos). */
export const DIAS_NO_ENTRENAMIENTO = [
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
] as const;

/** Campo 20 — Nivel de actividad (4 literales exactos del formulario). */
export const NIVEL_ACTIVIDAD = [
  "suelo estar gran parte del dia sentado",
  "suelo caminar y permanecer de pie",
  "estoy bastante activo durante mi dia",
  "mi trabajo es demandante tengo bastante esfuerzo fisico",
] as const;

// ---------------------------------------------------------------------------
// Estado derivado (HU-11) y guarda de body (AN-26)
// ---------------------------------------------------------------------------

/** Estados derivados de la completitud (HU-11 bullet 2). */
export const ESTADO_ANAMNESIS = ["PENDIENTE", "COMPLETA"] as const;

export type EstadoAnamnesis = (typeof ESTADO_ANAMNESIS)[number];

/** Guarda AN-26 (HU-11): al menos un campo diligenciado por guardado. */
export const MENSAJE_AN26 = "La anamnesis debe tener al menos un campo diligenciado";

// ---------------------------------------------------------------------------
// Utilidades de formato (copias del canónico)
// ---------------------------------------------------------------------------

const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;

/** Validación de fecha real de calendario (patrón del canónico HU-09). */
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

/** "Sin diligenciar" = `null`, `""` o ausente (guardado progresivo HU-11). */
export function esSinDiligenciar(valor: unknown): boolean {
  return valor === null || valor === undefined || valor === "";
}

// ---------------------------------------------------------------------------
// Mensajes EXACTOS del canónico (primer error por campo)
// ---------------------------------------------------------------------------

const MSG = {
  nombreCompletoLongitud:
    "Nombre completo debe tener entre 3 y 120 caracteres",
  nombreCompletoFormato:
    "Nombre completo solo puede contener letras y espacios",
  numeroDocumentoRequerido: "Número de documento es requerido",
  numeroDocumentoFormato:
    "Número de documento debe ser numérico de 6 a 10 dígitos",
  sexo: "Sexo debe ser FEMENINO o MASCULINO",
  rhRequerido: "RH es requerido",
  rhFormato:
    "RH debe ser un tipo de sangre válido (A+, A-, B+, B-, AB+, AB-, O+, O-)",
  edadEntero: "Edad debe ser un número entero",
  edadRango: "Edad debe estar entre 13 y 100",
  fechaNacimientoRequerida: "Fecha de nacimiento es requerida",
  fechaNacimientoFormato:
    "Fecha de nacimiento debe ser una fecha válida (YYYY-MM-DD)",
  fechaNacimientoFutura: "Fecha de nacimiento no puede ser futura",
  lugarNacimientoLongitud:
    "Lugar de nacimiento debe tener entre 2 y 100 caracteres",
  lugarNacimientoFormato: "Lugar de nacimiento contiene caracteres no permitidos",
  estadoCivilLongitud: "Estado civil debe tener entre 1 y 50 caracteres",
  estadoCivilFormato: "Estado civil solo puede contener letras y espacios",
  direccionLongitud:
    "Dirección de residencia debe tener entre 3 y 200 caracteres",
  direccionFormato: "Dirección de residencia contiene caracteres no permitidos",
  numeroContactoRequerido: "Número de contacto es requerido",
  numeroContactoFormato:
    "Número de contacto debe ser numérico de 7 a 10 dígitos",
  correoLongitud: "Correo electrónico no puede exceder 254 caracteres",
  correoFormato: "Correo electrónico tiene formato inválido",
  practicaDeporte: "Practica algún deporte debe ser SI o NO",
  cualDeporteLongitud: "Cual deporte debe tener entre 2 y 100 caracteres",
  cualDeporteFormato: "Cual deporte contiene caracteres no permitidos",
  tiempoQuePracticaLongitud:
    "Tiempo que practica debe tener entre 1 y 100 caracteres",
  tiempoQuePracticaFormato:
    "Tiempo que practica contiene caracteres no permitidos",
  contactoEmergenciaLongitud:
    "Contacto de emergencia debe tener entre 5 y 200 caracteres",
  epsLongitud: "EPS debe tener entre 2 y 100 caracteres",
  epsFormato: "EPS contiene caracteres no permitidos",
  antecedentesMedicosValor:
    "Antecedentes médicos contiene un valor no permitido",
  antecedentesMedicosRepetidos:
    "Antecedentes médicos no puede tener valores repetidos",
  antecedentesMedicosNinguno:
    "Ninguno no se puede combinar con otros antecedentes médicos",
  antecedentesFamiliaresLongitud:
    "Antecedentes familiares debe tener entre 1 y 500 caracteres",
  enfermedadRelevante: "Enfermedad relevante debe ser SI o NO",
  cualEnfermedadLongitud: "Cual enfermedad debe tener entre 2 y 300 caracteres",
  objetivosLongitud:
    "Objetivos de entrenamiento debe tener entre 5 y 1000 caracteres",
  nivelActividad: "Nivel de actividad debe ser una de las opciones permitidas",
  diasValor: "Días que no puede entrenar contiene un valor no permitido",
  diasRepetidos: "Días que no puede entrenar no puede tener valores repetidos",
  horaAcostarseFormato: "Hora para acostarse debe tener formato HH:MM (24 horas)",
  comidasPorDiaEntero:
    "Comidas al día debe ser un número entero entre 1 y 12",
  comidasPorDiaRango: "Comidas al día debe estar entre 1 y 12",
} as const;

// ---------------------------------------------------------------------------
// Validadores base por campo (mismo orden de comprobaciones = mismo primer
// error que el canónico)
// ---------------------------------------------------------------------------

const RE = {
  nombreCompleto: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/,
  numeroDocumento: /^\d{6,10}$/,
  rh: /^(A|B|AB|O)[+-]$/i,
  lugarNacimiento: /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s.,-]+$/,
  estadoCivil: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/,
  direccionResidencia: /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s#.,-]+$/,
  numeroContacto: /^\d{7,10}$/,
  correoElectronico: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  cualDeporte: /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s.-]+$/,
  tiempoQuePractica: /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s.,-]+$/,
  eps: /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s.,-]+$/,
  horaAcostarse: /^([01]\d|2[0-3]):[0-5]\d$/,
} as const;

function enEnum(valor: unknown, valores: readonly string[]): boolean {
  return typeof valor === "string" && (valores as readonly string[]).includes(valor);
}

/** Longitud de cadena; `false` para no-cadenas (tipo inválido). */
function longitud(valor: unknown, min: number, max: number): boolean {
  return typeof valor === "string" && valor.length >= min && valor.length <= max;
}

function validarTexto(
  valor: unknown,
  msgLongitud: string,
  min: number,
  max: number,
  regex: RegExp | null,
  msgFormato: string
): string | null {
  if (!longitud(valor, min, max)) return msgLongitud;
  if (regex && typeof valor === "string" && !regex.test(valor)) return msgFormato;
  return null;
}

function validarEnteroRango(
  valor: unknown,
  msgEntero: string,
  min: number,
  max: number,
  msgRango: string
): string | null {
  if (typeof valor !== "number" || !Number.isInteger(valor)) return msgEntero;
  if (valor < min || valor > max) return msgRango;
  return null;
}

/**
 * Multi-select de strings: sin valores fuera del enum, sin repetidos y con
 * "Ninguno" exclusivo cuando pertenece al conjunto (campo 16). El orden de
 * los errores replica el canónico: elementos -> repetidos -> "Ninguno".
 */
function validarMulti(
  valor: unknown,
  valores: readonly string[],
  msgValor: string,
  msgRepetidos: string,
  msgNinguno: string | null
): string | null {
  if (!Array.isArray(valor)) return msgValor;
  for (const item of valor) {
    if (!enEnum(item, valores)) return msgValor;
  }
  if (new Set(valor).size !== valor.length) return msgRepetidos;
  if (msgNinguno && valor.includes("Ninguno") && valor.length > 1) return msgNinguno;
  return null;
}

/**
 * `validarCampo(campo, valor)` — espejo del schema canónico por campo:
 * `null` si el valor es válido o está sin diligenciar; el MISMO mensaje del
 * canónico en caso contrario. Campos desconocidos no producen error (el
 * contrato cerrado de claves lo valida la API).
 */
export function validarCampo(campo: string, valor: unknown): string | null {
  if (esSinDiligenciar(valor)) return null;

  switch (campo) {
    case "nombreCompleto":
      return validarTexto(
        valor,
        MSG.nombreCompletoLongitud,
        3,
        120,
        RE.nombreCompleto,
        MSG.nombreCompletoFormato
      );
    case "numeroDocumento":
      if (typeof valor !== "string" || valor.length < 1) {
        return MSG.numeroDocumentoRequerido;
      }
      return RE.numeroDocumento.test(valor) ? null : MSG.numeroDocumentoFormato;
    case "sexo":
      return enEnum(valor, SEXO) ? null : MSG.sexo;
    case "rh":
      if (typeof valor !== "string" || valor.length < 1) return MSG.rhRequerido;
      return RE.rh.test(valor) ? null : MSG.rhFormato;
    case "edad":
      return validarEnteroRango(valor, MSG.edadEntero, 13, 100, MSG.edadRango);
    case "fechaNacimiento": {
      if (typeof valor !== "string" || valor.length < 1) {
        return MSG.fechaNacimientoRequerida;
      }
      if (!isValidDate(valor)) return MSG.fechaNacimientoFormato;
      const hoy = new Date().toISOString().slice(0, 10);
      return valor > hoy ? MSG.fechaNacimientoFutura : null;
    }
    case "lugarNacimiento":
      return validarTexto(
        valor,
        MSG.lugarNacimientoLongitud,
        2,
        100,
        RE.lugarNacimiento,
        MSG.lugarNacimientoFormato
      );
    case "estadoCivil":
      return validarTexto(
        valor,
        MSG.estadoCivilLongitud,
        1,
        50,
        RE.estadoCivil,
        MSG.estadoCivilFormato
      );
    case "direccionResidencia":
      return validarTexto(
        valor,
        MSG.direccionLongitud,
        3,
        200,
        RE.direccionResidencia,
        MSG.direccionFormato
      );
    case "numeroContacto":
      if (typeof valor !== "string" || valor.length < 1) {
        return MSG.numeroContactoRequerido;
      }
      return RE.numeroContacto.test(valor) ? null : MSG.numeroContactoFormato;
    case "correoElectronico": {
      if (typeof valor !== "string" || valor.length > 254) return MSG.correoLongitud;
      return RE.correoElectronico.test(valor) ? null : MSG.correoFormato;
    }
    case "practicaDeporte":
      return enEnum(valor, SI_NO) ? null : MSG.practicaDeporte;
    case "cualDeporte":
      return validarTexto(
        valor,
        MSG.cualDeporteLongitud,
        2,
        100,
        RE.cualDeporte,
        MSG.cualDeporteFormato
      );
    case "tiempoQuePractica":
      return validarTexto(
        valor,
        MSG.tiempoQuePracticaLongitud,
        1,
        100,
        RE.tiempoQuePractica,
        MSG.tiempoQuePracticaFormato
      );
    case "contactoEmergencia":
      return validarTexto(
        valor,
        MSG.contactoEmergenciaLongitud,
        5,
        200,
        null,
        ""
      );
    case "eps":
      return validarTexto(valor, MSG.epsLongitud, 2, 100, RE.eps, MSG.epsFormato);
    case "antecedentesMedicos":
      return validarMulti(
        valor,
        ANTECEDENTES_MEDICOS,
        MSG.antecedentesMedicosValor,
        MSG.antecedentesMedicosRepetidos,
        MSG.antecedentesMedicosNinguno
      );
    case "antecedentesFamiliares":
      return validarTexto(
        valor,
        MSG.antecedentesFamiliaresLongitud,
        1,
        500,
        null,
        ""
      );
    case "enfermedadRelevante":
      return enEnum(valor, SI_NO) ? null : MSG.enfermedadRelevante;
    case "cualEnfermedad":
      return validarTexto(
        valor,
        MSG.cualEnfermedadLongitud,
        2,
        300,
        null,
        ""
      );
    case "objetivosEntrenamiento":
      return validarTexto(valor, MSG.objetivosLongitud, 5, 1000, null, "");
    case "nivelActividad":
      return enEnum(valor, NIVEL_ACTIVIDAD) ? null : MSG.nivelActividad;
    case "diasNoEntrenamiento":
      return validarMulti(
        valor,
        DIAS_NO_ENTRENAMIENTO,
        MSG.diasValor,
        MSG.diasRepetidos,
        null
      );
    case "horaAcostarse":
      if (typeof valor !== "string" || valor.length < 1) {
        return MSG.horaAcostarseFormato;
      }
      return RE.horaAcostarse.test(valor) ? null : MSG.horaAcostarseFormato;
    case "comidasPorDia":
      return validarEnteroRango(
        valor,
        MSG.comidasPorDiaEntero,
        1,
        12,
        MSG.comidasPorDiaRango
      );
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Completitud y estado derivado (HU-11)
// ---------------------------------------------------------------------------

/**
 * Campos obligatorios (*) del Anexo DEC-052. El campo 6 compuesto aporta
 * `fechaNacimiento` y `lugarNacimiento`; el 18 aporta `enfermedadRelevante`.
 */
export const CAMPOS_OBLIGATORIOS = [
  "nombreCompleto",
  "numeroDocumento",
  "sexo",
  "rh",
  "edad",
  "fechaNacimiento",
  "lugarNacimiento",
  "direccionResidencia",
  "numeroContacto",
  "contactoEmergencia",
  "eps",
  "enfermedadRelevante",
  "objetivosEntrenamiento",
  "nivelActividad",
] as const;

/** Datos parciales de la anamnesis (claves del contrato cerrado de 25). */
export type AnamnesisCampos = Record<string, unknown>;

/**
 * Completitud (espejo de `cumpleCompletitud`): todos los obligatorios (*)
 * diligenciados + los condicionales aplicables (12 si 11 = "SI", 18b si
 * 18a = "SI").
 */
export function cumpleCompletitud(data: AnamnesisCampos): boolean {
  for (const campo of CAMPOS_OBLIGATORIOS) {
    if (esSinDiligenciar(data[campo])) return false;
  }
  if (data.practicaDeporte === "SI" && esSinDiligenciar(data.cualDeporte)) {
    return false;
  }
  if (data.enfermedadRelevante === "SI" && esSinDiligenciar(data.cualEnfermedad)) {
    return false;
  }
  return true;
}

/**
 * Marca derivada PENDIENTE/COMPLETA (HU11-AN-22): se recalcula en cada
 * guardado; el usuario no la elige.
 */
export function derivarEstado(data: AnamnesisCampos): EstadoAnamnesis {
  return cumpleCompletitud(data) ? "COMPLETA" : "PENDIENTE";
}

// ---------------------------------------------------------------------------
// Agrupación en secciones (HU-09 bullet 2 / HU-28 bullet 3) — espejo exacto
// ---------------------------------------------------------------------------

export const SECCIONES_ANAMNESIS = {
  S1: {
    titulo: "Identificacion personal",
    campos: [
      "nombreCompleto",
      "numeroDocumento",
      "sexo",
      "rh",
      "edad",
      "fechaNacimiento",
      "lugarNacimiento",
      "estadoCivil",
      "direccionResidencia",
      "numeroContacto",
      "correoElectronico",
    ],
  },
  S2: {
    titulo: "Deporte",
    campos: ["practicaDeporte", "cualDeporte", "tiempoQuePractica"],
  },
  S3: {
    titulo: "Emergencia y salud",
    campos: [
      "contactoEmergencia",
      "eps",
      "antecedentesMedicos",
      "antecedentesFamiliares",
      "enfermedadRelevante",
      "cualEnfermedad",
    ],
  },
  S4: {
    titulo: "Objetivos y estilo de vida",
    campos: [
      "objetivosEntrenamiento",
      "nivelActividad",
      "diasNoEntrenamiento",
      "horaAcostarse",
      "comidasPorDia",
    ],
  },
} as const;

export type SeccionAnamnesis = keyof typeof SECCIONES_ANAMNESIS;
