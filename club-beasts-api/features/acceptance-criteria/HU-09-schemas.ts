import { z } from "zod";

/**
 * Contrato propuesto de validación — HU-09: Registro de anamnesis deportiva.
 * Generado por acceptance-criteria-analyst (modo CREAR, INC-09-anamnesis-deportiva).
 *
 * FUENTE CANÓNICA DE CAMPOS: **Anexo DEC-052 (2026-11-04)** — formulario real
 * "ANALISIS PRE ENTRENAMIENTO / ANAMNESIS DEPORTIVA": 23 campos en 4 secciones.
 * Los literales de enum son EXACTOS del Anexo (no normalizar mayúsculas ni
 * acentos: "miercoles", "dia", "fisico", "cirugias", "Ninguno", "Alergias").
 *
 * Modelado de campos compuestos (PROPUESTA, sin inventar ni eliminar campos):
 *   - Campo 6 "Fecha y lugar de nacimiento" [fecha + texto] -> `fechaNacimiento`
 *     + `lugarNacimiento` (6a/6b, ambos obligatorios).
 *   - Campo 18 "Enfermedad relevante?" [SI|NO] + "cual?" -> `enfermedadRelevante`
 *     + `cualEnfermedad` (18a obligatoria, 18b condicional si 18a = "SI").
 * En total 25 propiedades para 23 campos del formulario.
 *
 * Reconciliación HU-11 vs obligatorios (*) — regla propuesta por Producto:
 * los `*` definen "anamnesis completa", NO impiden el guardado progresivo.
 * `registrarAnamnesisSchema` valida la entrega COMPLETA; el guardado parcial
 * (HU-11-schemas.ts) permite ausencias y deriva el estado PENDIENTE/COMPLETA.
 *
 * Reglas de negocio aplicadas:
 * - DEC-052/Anexo: contrato cerrado de 23 campos (no inventar ni eliminar).
 * - DEC-016: los campos 1-10 se solapan con Cliente (HU-04/HU-05); las reglas
 *   de formato aquí replican los regex ya aceptados sin cobrar punto doble
 *   (ver PEND-ANX-02 en HU-09-criterios-aceptacion.md).
 * - HU-10/HU-28 consumen este módulo (HU-10-schemas.ts, HU-28-schemas.ts):
 *   fuente única de verdad de los campos; los schemas de visibilidad se
 *   construyen por `.omit()`/`.pick()` sobre estos.
 *
 * Autónomo: solo depende de `zod` (patrón de HU-04/HU-05/HU-13-schemas.ts).
 * No importa nada de `src/` para no crear dependencias inexistentes.
 *
 * IMPORTANTE: contrato PROPUESTO — pendiente de ratificación por
 * backend-developer en el spec de INC-09 (no decide rutas HTTP ni Prisma).
 */

// ---------------------------------------------------------------------------
// Literales EXACTOS del Anexo DEC-052 (no editar sin cambio de Producto)
// ---------------------------------------------------------------------------

/** Campo 3 — Sexo. */
export const SEXO = ["FEMENINO", "MASCULINO"] as const;

/** Campos 11 y 18 — preguntas SI/NO. */
export const SI_NO = ["SI", "NO"] as const;

/**
 * Campo 16 — Antecedentes Médicos (multi-select, 8 opciones exactas).
 * La capitalización irregular es literal del formulario: "Alergias" y
 * "Ninguno" con mayúscula inicial; "cirugias", "medicamentos", etc. sin ella.
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
// Utilidades
// ---------------------------------------------------------------------------

const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Copia local de la validación de fecha real de calendario (patrón de
 * `src/schemas/membresia.schema.ts` / HU-13-schemas.ts). Se duplica a
 * propósito: este archivo debe ser importable sin el código de `src/`.
 */
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

/** Enum con mensaje de error específico en español (reemplaza "Invalid enum value"). */
function enumConMensaje<U extends string, T extends Readonly<[U, ...U[]]>>(
  valores: T,
  mensaje: string
) {
  return z.enum(valores, { errorMap: () => ({ message: mensaje }) });
}

/**
 * "Sin diligenciar" = `null`, `""` o campo ausente (guardado progresivo HU-11).
 * Se normaliza a `undefined`: las ausencias marcan incompletitud (estado
 * PENDIENTE), nunca error; una cadena vacía no debe producir 400 en un
 * guardado parcial (patrón de tolerancia `.or(z.literal(""))` de HU-04).
 */
function sinDiligenciar(valor: unknown): unknown {
  return valor === "" || valor === null ? undefined : valor;
}

function opcional<T extends z.ZodTypeAny>(campo: T) {
  return z.preprocess(sinDiligenciar, campo.optional());
}

// ---------------------------------------------------------------------------
// Validadores base por campo (exportados para pruebas de valores límite)
// ---------------------------------------------------------------------------

// S1 — Identificación personal

/** Campo 1 — Nombre completo (regex alineado con HU-04 `nombres`). */
export const nombreCompletoBase = z
  .string()
  .min(3, "Nombre completo debe tener entre 3 y 120 caracteres")
  .max(120, "Nombre completo debe tener entre 3 y 120 caracteres")
  .regex(
    /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/,
    "Nombre completo solo puede contener letras y espacios"
  );

/** Campo 2 — Número de documento (regex alineado con HU-04 `cedula`). */
export const numeroDocumentoBase = z
  .string()
  .min(1, "Número de documento es requerido")
  .regex(
    /^\d{6,10}$/,
    "Número de documento debe ser numérico de 6 a 10 dígitos"
  );

/** Campo 3 — Sexo. */
export const sexoBase = enumConMensaje(SEXO, "Sexo debe ser FEMENINO o MASCULINO");

/**
 * Campo 4 — RH. Recomendación (a) de PEND-ANX-05: regex estricto de tipo de
 * sangre (8 valores reales); alternativa (b) = texto libre moderado 1..20.
 */
export const rhBase = z
  .string()
  .min(1, "RH es requerido")
  .regex(
    /^(A|B|AB|O)[+-]$/i,
    "RH debe ser un tipo de sangre válido (A+, A-, B+, B-, AB+, AB-, O+, O-)"
  );

/** Campo 5 — Edad (rango 13..100 propuesto, PEND-ANX-06). */
export const edadBase = z
  .number({ invalid_type_error: "Edad debe ser un número entero" })
  .int("Edad debe ser un número entero")
  .min(13, "Edad debe estar entre 13 y 100")
  .max(100, "Edad debe estar entre 13 y 100");

/** Campo 6a — Fecha de nacimiento (no futura). */
export const fechaNacimientoBase = z
  .string()
  .min(1, "Fecha de nacimiento es requerida")
  .superRefine((valor, ctx) => {
    if (!isValidDate(valor)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Fecha de nacimiento debe ser una fecha válida (YYYY-MM-DD)",
      });
      return;
    }
    const hoy = new Date().toISOString().slice(0, 10);
    if (valor > hoy) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Fecha de nacimiento no puede ser futura",
      });
    }
  });

/** Campo 6b — Lugar de nacimiento. */
export const lugarNacimientoBase = z
  .string()
  .min(2, "Lugar de nacimiento debe tener entre 2 y 100 caracteres")
  .max(100, "Lugar de nacimiento debe tener entre 2 y 100 caracteres")
  .regex(
    /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s.,-]+$/,
    "Lugar de nacimiento contiene caracteres no permitidos"
  );

/** Campo 7 — Estado civil (opcional). */
export const estadoCivilBase = z
  .string()
  .min(1, "Estado civil debe tener entre 1 y 50 caracteres")
  .max(50, "Estado civil debe tener entre 1 y 50 caracteres")
  .regex(
    /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/,
    "Estado civil solo puede contener letras y espacios"
  );

/** Campo 8 — Dirección de residencia (acepta número, #, punto, coma, guion). */
export const direccionResidenciaBase = z
  .string()
  .min(3, "Dirección de residencia debe tener entre 3 y 200 caracteres")
  .max(200, "Dirección de residencia debe tener entre 3 y 200 caracteres")
  .regex(
    /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s#.,-]+$/,
    "Dirección de residencia contiene caracteres no permitidos"
  );

/**
 * Campo 9 — Número de contacto. "Contacto" no exige ser el móvil del cliente
 * (puede ser un familiar): regex general de teléfono colombiano 7-10 dígitos,
 * distinto del móvil `3XXXXXXXXX` de `Cliente.telefono` (HU-04).
 */
export const numeroContactoBase = z
  .string()
  .min(1, "Número de contacto es requerido")
  .regex(
    /^\d{7,10}$/,
    "Número de contacto debe ser numérico de 7 a 10 dígitos"
  );

/** Campo 10 — Correo electrónico (opcional, regex alineado con HU-04 `email`). */
export const correoElectronicoBase = z
  .string()
  .max(254, "Correo electrónico no puede exceder 254 caracteres")
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Correo electrónico tiene formato inválido");

// S2 — Deporte

/** Campo 11 — ¿Practica algún deporte? (opcional en el Anexo). */
export const practicaDeporteBase = enumConMensaje(
  SI_NO,
  "Practica algún deporte debe ser SI o NO"
);

/** Campo 12 — ¿Cuál deporte? (condicional si campo 11 = "SI"). */
export const cualDeporteBase = z
  .string()
  .min(2, "Cual deporte debe tener entre 2 y 100 caracteres")
  .max(100, "Cual deporte debe tener entre 2 y 100 caracteres")
  .regex(
    /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s.-]+$/,
    "Cual deporte contiene caracteres no permitidos"
  );

/** Campo 13 — Tiempo que practica (opcional; ej. "3 años", "6 meses"). */
export const tiempoQuePracticaBase = z
  .string()
  .min(1, "Tiempo que practica debe tener entre 1 y 100 caracteres")
  .max(100, "Tiempo que practica debe tener entre 1 y 100 caracteres")
  .regex(
    /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s.,-]+$/,
    "Tiempo que practica contiene caracteres no permitidos"
  );

// S3 — Emergencia y salud

/**
 * Campo 14 — "En caso de emergencia llamar número y nombre" (compuesto libre:
 * nombre + número + parentesco en un solo texto; sin regex de teléfono porque
 * el campo es prose compuesta, no un teléfono puro).
 */
export const contactoEmergenciaBase = z
  .string()
  .min(5, "Contacto de emergencia debe tener entre 5 y 200 caracteres")
  .max(200, "Contacto de emergencia debe tener entre 5 y 200 caracteres");

/** Campo 15 — EPS. */
export const epsBase = z
  .string()
  .min(2, "EPS debe tener entre 2 y 100 caracteres")
  .max(100, "EPS debe tener entre 2 y 100 caracteres")
  .regex(
    /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s.,-]+$/,
    "EPS contiene caracteres no permitidos"
  );

/**
 * Campo 16 — Antecedentes Médicos (multi-select).
 * Reglas: sin valores repetidos y "Ninguno" exclusivo (no combina).
 */
export const antecedentesMedicosBase = z
  .array(
    enumConMensaje(
      ANTECEDENTES_MEDICOS,
      "Antecedentes médicos contiene un valor no permitido"
    )
  )
  .superRefine((valor, ctx) => {
    if (new Set(valor).size !== valor.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Antecedentes médicos no puede tener valores repetidos",
      });
    }
    if (valor.includes("Ninguno") && valor.length > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ninguno no se puede combinar con otros antecedentes médicos",
      });
    }
  });

/** Campo 17 — Antecedentes familiares (opcional, prose médica libre). */
export const antecedentesFamiliaresBase = z
  .string()
  .min(1, "Antecedentes familiares debe tener entre 1 y 500 caracteres")
  .max(500, "Antecedentes familiares debe tener entre 1 y 500 caracteres");

/** Campo 18a — ¿Tiene alguna enfermedad relevante? (obligatoria). */
export const enfermedadRelevanteBase = enumConMensaje(
  SI_NO,
  "Enfermedad relevante debe ser SI o NO"
);

/** Campo 18b — ¿Cuál enfermedad? (condicional si campo 18a = "SI"). */
export const cualEnfermedadBase = z
  .string()
  .min(2, "Cual enfermedad debe tener entre 2 y 300 caracteres")
  .max(300, "Cual enfermedad debe tener entre 2 y 300 caracteres");

// S4 — Objetivos y estilo de vida

/** Campo 19 — Objetivos al entrenar (texto largo, obligatorio). */
export const objetivosEntrenamientoBase = z
  .string()
  .min(5, "Objetivos de entrenamiento debe tener entre 5 y 1000 caracteres")
  .max(1000, "Objetivos de entrenamiento debe tener entre 5 y 1000 caracteres");

/** Campo 20 — ¿Qué tan activo eres? (4 literales exactos, obligatorio). */
export const nivelActividadBase = enumConMensaje(
  NIVEL_ACTIVIDAD,
  "Nivel de actividad debe ser una de las opciones permitidas"
);

/** Campo 21 — Días que no puede entrenar (multi, sin repetidos). */
export const diasNoEntrenamientoBase = z
  .array(
    enumConMensaje(
      DIAS_NO_ENTRENAMIENTO,
      "Días que no puede entrenar contiene un valor no permitido"
    )
  )
  .superRefine((valor, ctx) => {
    if (new Set(valor).size !== valor.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Días que no puede entrenar no puede tener valores repetidos",
      });
    }
  });

/** Campo 22 — Hora a la que suele acostarse (HH:MM 24h, opcional). */
export const horaAcostarseBase = z
  .string()
  .min(1, "Hora para acostarse debe tener formato HH:MM (24 horas)")
  .regex(
    /^([01]\d|2[0-3]):[0-5]\d$/,
    "Hora para acostarse debe tener formato HH:MM (24 horas)"
  );

/** Campo 23 — Comidas al día (entero 1..12 propuesto, PEND-ANX-06). */
export const comidasPorDiaBase = z
  .number({
    invalid_type_error: "Comidas al día debe ser un número entero entre 1 y 12",
  })
  .int("Comidas al día debe ser un número entero entre 1 y 12")
  .min(1, "Comidas al día debe estar entre 1 y 12")
  .max(12, "Comidas al día debe estar entre 1 y 12");

// ---------------------------------------------------------------------------
// Objeto de campos (25 propiedades / 23 campos del formulario)
// ---------------------------------------------------------------------------

export const anamnesisCamposSchema = z
  .object({
    // S1 — Identificación personal
    nombreCompleto: opcional(nombreCompletoBase),
    numeroDocumento: opcional(numeroDocumentoBase),
    sexo: opcional(sexoBase),
    rh: opcional(rhBase),
    edad: opcional(edadBase),
    fechaNacimiento: opcional(fechaNacimientoBase),
    lugarNacimiento: opcional(lugarNacimientoBase),
    estadoCivil: opcional(estadoCivilBase),
    direccionResidencia: opcional(direccionResidenciaBase),
    numeroContacto: opcional(numeroContactoBase),
    correoElectronico: opcional(correoElectronicoBase),
    // S2 — Deporte
    practicaDeporte: opcional(practicaDeporteBase),
    cualDeporte: opcional(cualDeporteBase),
    tiempoQuePractica: opcional(tiempoQuePracticaBase),
    // S3 — Emergencia y salud
    contactoEmergencia: opcional(contactoEmergenciaBase),
    eps: opcional(epsBase),
    antecedentesMedicos: opcional(antecedentesMedicosBase),
    antecedentesFamiliares: opcional(antecedentesFamiliaresBase),
    enfermedadRelevante: opcional(enfermedadRelevanteBase),
    cualEnfermedad: opcional(cualEnfermedadBase),
    // S4 — Objetivos y estilo de vida
    objetivosEntrenamiento: opcional(objetivosEntrenamientoBase),
    nivelActividad: opcional(nivelActividadBase),
    diasNoEntrenamiento: opcional(diasNoEntrenamientoBase),
    horaAcostarse: opcional(horaAcostarseBase),
    comidasPorDia: opcional(comidasPorDiaBase),
  })
  .strict(); // contrato cerrado (AN-11): campos desconocidos -> 400

export type AnamnesisCampos = z.infer<typeof anamnesisCamposSchema>;

/**
 * Campos obligatorios (*) del Anexo DEC-052. El campo 6 compuesto aporta
 * `fechaNacimiento` y `lugarNacimiento`; el campo 18 aporta `enfermedadRelevante`
 * ("cualEnfermedad" es condicional, no está aquí).
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

/** Mensaje exacto por campo obligatorio faltante (español, específico). */
const MENSAJES_REQUERIDO: Record<(typeof CAMPOS_OBLIGATORIOS)[number], string> = {
  nombreCompleto: "Nombre completo es requerido",
  numeroDocumento: "Número de documento es requerido",
  sexo: "Sexo es requerido",
  rh: "RH es requerido",
  edad: "Edad es requerida",
  fechaNacimiento: "Fecha de nacimiento es requerida",
  lugarNacimiento: "Lugar de nacimiento es requerido",
  direccionResidencia: "Dirección de residencia es requerida",
  numeroContacto: "Número de contacto es requerido",
  contactoEmergencia: "Contacto de emergencia es requerido",
  eps: "EPS es requerida",
  enfermedadRelevante: "Enfermedad relevante es requerida",
  objetivosEntrenamiento: "Objetivos de entrenamiento es requerido",
  nivelActividad: "Nivel de actividad es requerido",
};

/**
 * Reglas condicionales del Anexo (campos 12 y 18b):
 * - `cualDeporte` aplica SOLO si `practicaDeporte` = "SI".
 * - `cualEnfermedad` aplica SOLO si `enfermedadRelevante` = "SI".
 * Contradicción (campo diligenciado sin la pregunta en "SI") -> 400 siempre,
 * incluso en guardado parcial. Ausencia del condicional aplicable ->
 * incompletitud (estado PENDIENTE), nunca error (HU-11).
 */
function validarConsistencia(data: AnamnesisCampos, ctx: z.RefinementCtx): void {
  if (data.cualDeporte !== undefined && data.practicaDeporte !== "SI") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["cualDeporte"],
      message: "Cual deporte no aplica cuando no practica algún deporte",
    });
  }
  if (data.cualEnfermedad !== undefined && data.enfermedadRelevante !== "SI") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["cualEnfermedad"],
      message: "Cual enfermedad no aplica cuando no tiene enfermedad relevante",
    });
  }
}

/**
 * Completitud ("anamnesis completa") = todos los obligatorios (*) diligenciados
 * + todos los condicionales aplicables diligenciados (12 si 11 = "SI", 18b si
 * 18a = "SI"). Es la base de la marca PENDIENTE/COMPLETA de HU-11.
 */
export function cumpleCompletitud(data: AnamnesisCampos): boolean {
  for (const campo of CAMPOS_OBLIGATORIOS) {
    if (data[campo] === undefined) return false;
  }
  if (data.practicaDeporte === "SI" && data.cualDeporte === undefined) return false;
  if (data.enfermedadRelevante === "SI" && data.cualEnfermedad === undefined) {
    return false;
  }
  return true;
}

/**
 * Envío CONSISTENTE: campos con formato/enum válidos + sin contradicciones
 * SI/NO. Es la base compartida del registro completo (HU-09) y del guardado
 * progresivo (HU-11).
 */
export const anamnesisConsistenteSchema = anamnesisCamposSchema.superRefine(
  validarConsistencia
);

/**
 * Registro COMPLETO de la anamnesis (HU-09): consistente + todos los
 * obligatorios (*) y condicionales aplicables diligenciados. Un campo
 * obligatorio faltante produce 400 con mensaje específico por campo.
 */
export const registrarAnamnesisSchema = anamnesisConsistenteSchema.superRefine(
  (data, ctx) => {
    for (const campo of CAMPOS_OBLIGATORIOS) {
      if (data[campo] === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [campo],
          message: MENSAJES_REQUERIDO[campo],
        });
      }
    }
    if (data.practicaDeporte === "SI" && data.cualDeporte === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cualDeporte"],
        message: "Cual deporte es requerido cuando practica algún deporte",
      });
    }
    if (data.enfermedadRelevante === "SI" && data.cualEnfermedad === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cualEnfermedad"],
        message: "Cual enfermedad es requerida cuando tiene enfermedad relevante",
      });
    }
  }
);

export type RegistrarAnamnesis = z.infer<typeof registrarAnamnesisSchema>;

// ---------------------------------------------------------------------------
// Agrupación en secciones (HU-09 bullet 2 / HU-28 bullet 3)
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

// ---------------------------------------------------------------------------
// DTO de LECTURA (respuesta) — usado por HU-10 (visibilidad) y HU-28 (portal)
// ---------------------------------------------------------------------------

/**
 * Datos almacenados de la anamnesis en lectura: los 25 campos nulables (lo no
 * diligenciado viaja como `null`). Sin refinamientos: la validación ocurre en
 * escritura. Marca PROPUESTA de contrato de respuesta (ratifica backend).
 */
export const anamnesisDatosSchema = z.object({
  nombreCompleto: nombreCompletoBase.nullable().optional(),
  numeroDocumento: numeroDocumentoBase.nullable().optional(),
  sexo: sexoBase.nullable().optional(),
  rh: rhBase.nullable().optional(),
  edad: edadBase.nullable().optional(),
  fechaNacimiento: fechaNacimientoBase.nullable().optional(),
  lugarNacimiento: lugarNacimientoBase.nullable().optional(),
  estadoCivil: estadoCivilBase.nullable().optional(),
  direccionResidencia: direccionResidenciaBase.nullable().optional(),
  numeroContacto: numeroContactoBase.nullable().optional(),
  correoElectronico: correoElectronicoBase.nullable().optional(),
  practicaDeporte: practicaDeporteBase.nullable().optional(),
  cualDeporte: cualDeporteBase.nullable().optional(),
  tiempoQuePractica: tiempoQuePracticaBase.nullable().optional(),
  contactoEmergencia: contactoEmergenciaBase.nullable().optional(),
  eps: epsBase.nullable().optional(),
  antecedentesMedicos: antecedentesMedicosBase.nullable().optional(),
  antecedentesFamiliares: antecedentesFamiliaresBase.nullable().optional(),
  enfermedadRelevante: enfermedadRelevanteBase.nullable().optional(),
  cualEnfermedad: cualEnfermedadBase.nullable().optional(),
  objetivosEntrenamiento: objetivosEntrenamientoBase.nullable().optional(),
  nivelActividad: nivelActividadBase.nullable().optional(),
  diasNoEntrenamiento: diasNoEntrenamientoBase.nullable().optional(),
  horaAcostarse: horaAcostarseBase.nullable().optional(),
  comidasPorDia: comidasPorDiaBase.nullable().optional(),
});

export type AnamnesisDatos = z.infer<typeof anamnesisDatosSchema>;
