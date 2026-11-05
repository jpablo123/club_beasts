import { z } from "zod";

/**
 * INC-09 (HU-09/10/11/28) — validacion de la anamnesis deportiva.
 *
 * Equivalente en `src/` del contrato canonico
 * `features/acceptance-criteria/HU-09-schemas.ts` (+ `HU-10-schemas.ts`,
 * `HU-11-schemas.ts`, `HU-28-schemas.ts`), copiado SIN CAMBIOS (INC09-R08:
 * los tests de integracion parsean respuestas y errores con los schemas
 * canonicos; esta copia debe ser compatible al 1:1 — literales, regex,
 * mensajes, orden de claves e issues). Patron `portal.schema.ts`:
 * `tsconfig rootDir: ./src` impide importar `features/`.
 *
 * Adiciones del GREEN (documentadas, sin alterar la semantica canonica):
 *  - `CAMPOS_ANAMNESIS`: whitelist plana de las 25 propiedades (derivada de
 *    `SECCIONES_ANAMNESIS`) para la serializacion por whitelist del servicio.
 *  - `guardarParcialSinConsistenciaSchema`: guardado parcial SIN las
 *    contradicciones SI/NO (solo campos presentes + AN-26). Es el schema del
 *    body del PATCH (orden de errores R7): las contradicciones se validan
 *    sobre el ESTADO FUSIONADO despues de los 404 (R3/C3a), nunca sobre el
 *    body aislado (una edicion legitima de la condicional puede ser un body
 *    que, aislando, pareceria contradictorio).
 *  - `anamnesisParamsSchema`: params de `/clientes/:clienteId/anamnesis`
 *    (patron `auth.schema.ts`, max 36).
 *  - `mensajePrimerErrorZod`: mensaje del PRIMER error (INC05-CONF-01) con el
 *    formato contractual de claves desconocidas: "Campos no permitidos en el
 *    formulario: <claves>" (AN-11; contrato cerrado `.strict()`).
 *
 * Reglas de negocio (DEC-052 + Anexo, DEC-055, DEC-059, R4):
 *  - Los `*` del Anexo definen "anamnesis COMPLETA" (estado derivado), NO
 *    impiden el guardado parcial (R4: un obligatorio faltante jamas produce
 *    400 en la API -> estado PENDIENTE). El 400 de AN-26 es por body sin
 *    ningun campo diligenciado.
 *  - Contradicciones SI/NO (`cualDeporte` sin `practicaDeporte`=SI,
 *    `cualEnfermedad` sin `enfermedadRelevante`=SI) -> 400 siempre.
 *  - Contrato cerrado: `.strict()` en escritura; el estado jamas viaja como
 *    entrada.
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

/** Validación de fecha real de calendario (patrón `src/schemas/membresia.schema.ts`). */
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
 * Se normaliza a `undefined`.
 */
function sinDiligenciar(valor: unknown): unknown {
  return valor === "" || valor === null ? undefined : valor;
}

function opcional<T extends z.ZodTypeAny>(campo: T) {
  return z.preprocess(sinDiligenciar, campo.optional());
}

// ---------------------------------------------------------------------------
// Validadores base por campo (copia verbatim de HU-09-schemas.ts)
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

/** Campo 4 — RH (DEC-059: regex estricto de tipo de sangre, 8 valores reales). */
export const rhBase = z
  .string()
  .min(1, "RH es requerido")
  .regex(
    /^(A|B|AB|O)[+-]$/i,
    "RH debe ser un tipo de sangre válido (A+, A-, B+, B-, AB+, AB-, O+, O-)"
  );

/** Campo 5 — Edad (rango 13..100, DEC-059). */
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

/** Campo 9 — Número de contacto (teléfono colombiano 7-10 dígitos). */
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

/** Campo 14 — "En caso de emergencia llamar número y nombre" (prose compuesta). */
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

/** Campo 23 — Comidas al día (entero 1..12, DEC-059). */
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
 * Campos obligatorios (*) del Anexo DEC-052 (definen "anamnesis COMPLETA",
 * NO impiden el guardado parcial — R4).
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

/** Mensaje exacto por campo obligatorio faltante (registro completo). */
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
 * Contradicción -> 400 siempre, incluso en guardado parcial. Ausencia del
 * condicional aplicable -> incompletitud (PENDIENTE), nunca error (HU-11).
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
 * 18a = "SI"). Base de la marca PENDIENTE/COMPLETA (HU-11).
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
 * SI/NO. Base compartida del registro completo (HU-09) y del guardado
 * progresivo (HU-11).
 */
export const anamnesisConsistenteSchema = anamnesisCamposSchema.superRefine(
  validarConsistencia
);

/**
 * Registro COMPLETO de la anamnesis (HU-09): consistente + todos los
 * obligatorios (*) y condicionales aplicables diligenciados.
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

/**
 * GREEN INC-09 — whitelist plana de las 25 propiedades (orden canonico del
 * Anexo). Base de la serializacion por whitelist explicita del servicio
 * (jamás `...registro`, INC09-R05).
 */
export const CAMPOS_ANAMNESIS = [
  ...SECCIONES_ANAMNESIS.S1.campos,
  ...SECCIONES_ANAMNESIS.S2.campos,
  ...SECCIONES_ANAMNESIS.S3.campos,
  ...SECCIONES_ANAMNESIS.S4.campos,
] as const;

export type CampoAnamnesis = (typeof CAMPOS_ANAMNESIS)[number];

// ---------------------------------------------------------------------------
// DTO de LECTURA (respuesta) — HU-10 (visibilidad) y HU-28 (portal)
// ---------------------------------------------------------------------------

/**
 * Datos almacenados de la anamnesis en lectura: los 25 campos nulables (lo no
 * diligenciado viaja como `null`). Sin refinamientos: la validación ocurre en
 * escritura.
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

// ---------------------------------------------------------------------------
// Estado derivado (HU-11) — sin columna persistida (R5), sin drift
// ---------------------------------------------------------------------------

/** Igual que `enumConMensaje` de HU-09 (no exportado allá; duplicado mínimo). */
function enumConMensajeLocal<U extends string, T extends Readonly<[U, ...U[]]>>(
  valores: T,
  mensaje: string
) {
  return z.enum(valores, { errorMap: () => ({ message: mensaje }) });
}

/** Estados de la anamnesis derivados de la completitud (HU-11 bullet 2). */
export const ESTADO_ANAMNESIS = ["PENDIENTE", "COMPLETA"] as const;

export type EstadoAnamnesis = (typeof ESTADO_ANAMNESIS)[number];

export const estadoAnamnesisSchema = enumConMensajeLocal(
  ESTADO_ANAMNESIS,
  "Estado de anamnesis debe ser PENDIENTE o COMPLETA"
);

/**
 * Marca derivada del estado (HU-11 bullets 1-2). Se recalcula en CADA
 * guardado/edición; el usuario no la elige.
 */
export function derivarEstadoAnamnesis(data: AnamnesisCampos): EstadoAnamnesis {
  return cumpleCompletitud(data) ? "COMPLETA" : "PENDIENTE";
}

// ---------------------------------------------------------------------------
// Guardado progresivo (HU-11) — schema del body de POST/PATCH
// ---------------------------------------------------------------------------

/**
 * Guardado PROGRESIVO (HU-11): cualquier subconjunto de campos VÁLIDOS.
 * - Ausencias permitidas (null / "" / omitido = sin diligenciar).
 * - Al menos 1 campo diligenciado (HU11-AN-26): "La anamnesis debe tener al
 *   menos un campo diligenciado".
 * - Contradicciones SI/NO rechazadas (hereda `anamnesisConsistenteSchema`).
 * Es el schema del body del POST (R7).
 */
export const guardarParcialAnamnesisSchema = anamnesisConsistenteSchema.refine(
  (data) => {
    return Object.values(data).some(
      (valor) => valor !== undefined && !(Array.isArray(valor) && valor.length === 0)
    );
  },
  {
    message: "La anamnesis debe tener al menos un campo diligenciado",
  }
);

export type GuardarParcialAnamnesis = z.infer<typeof guardarParcialAnamnesisSchema>;

/**
 * GREEN INC-09 (R7/R3) — guardado parcial SIN consistencia cruzada: campos
 * presentes válidos + AN-26. Es el schema del body del PATCH: las
 * contradicciones SI/NO se evaluan sobre el ESTADO FUSIONADO después de los
 * 404 (un body que, aislando, pareciera contradictorio puede ser una edición
 * legítima de la condicional — p. ej. `cualDeporte` con `practicaDeporte`=SI
 * almacenado).
 */
export const guardarParcialSinConsistenciaSchema = anamnesisCamposSchema.refine(
  (data) => {
    return Object.values(data).some(
      (valor) => valor !== undefined && !(Array.isArray(valor) && valor.length === 0)
    );
  },
  {
    message: "La anamnesis debe tener al menos un campo diligenciado",
  }
);

export type GuardarParcialSinConsistencia = z.infer<
  typeof guardarParcialSinConsistenciaSchema
>;

// ---------------------------------------------------------------------------
// Vistas de lectura por rol (la API FILTRA; no basta con ocultar en UI)
// ---------------------------------------------------------------------------

/**
 * DEC-055 (enmienda C4): los 5 campos sensibles (solo DUENO los ve).
 * Orden literal de DEC-055.
 */
export const CAMPOS_SENSIBLES = [
  "rh",
  "antecedentesMedicos",
  "antecedentesFamiliares",
  "enfermedadRelevante",
  "cualEnfermedad",
] as const;

/** Metadatos de trazabilidad visibles a staff (HU-09 bullet 4). */
export const metadatosStaffSchema = z.object({
  clienteId: z.string().min(1),
  estado: estadoAnamnesisSchema,
  fechaActualizacion: z.string().min(1),
  actualizadoPorId: z.string().min(1),
});

/** DUENO: lectura de la anamnesis COMPLETA (25 propiedades, sensibles incluidas). */
export const anamnesisDuenoSchema = anamnesisDatosSchema.extend(
  metadatosStaffSchema.shape
);

export type AnamnesisDueno = z.infer<typeof anamnesisDuenoSchema>;

/**
 * RECEPCIONISTA: lectura SOLO operativa — quedan fuera del DTO los 5 campos
 * sensibles (DEC-055): ni valores ni claves viajan en la respuesta.
 * Conteo: 20/25 propiedades (19/23 campos).
 */
export const anamnesisRecepcionSchema = anamnesisDatosSchema
  .omit({
    rh: true,
    antecedentesMedicos: true,
    antecedentesFamiliares: true,
    enfermedadRelevante: true,
    cualEnfermedad: true,
  })
  .extend(metadatosStaffSchema.shape);

export type AnamnesisRecepcion = z.infer<typeof anamnesisRecepcionSchema>;

/**
 * Vista del cliente: sus datos completos (25 propiedades nulables) + estado
 * derivado + fecha de actualización. SIN `actualizadoPorId` (DEC-041: la
 * identidad del staff no se expone al cliente).
 */
export const anamnesisClienteSchema = anamnesisDatosSchema.extend({
  clienteId: z.string().min(1),
  estado: estadoAnamnesisSchema,
  fechaActualizacion: z.string().min(1),
});

export type AnamnesisCliente = z.infer<typeof anamnesisClienteSchema>;

/**
 * Misma anamnesis agrupada por las 4 secciones exactas del formulario
 * (HU28-AN-30). Cada sección es un `.pick()` del contrato canónico.
 */
export const anamnesisClienteSeccionesSchema = z.object({
  clienteId: z.string().min(1),
  estado: estadoAnamnesisSchema,
  fechaActualizacion: z.string().min(1),
  secciones: z.object({
    S1: anamnesisDatosSchema.pick({
      nombreCompleto: true,
      numeroDocumento: true,
      sexo: true,
      rh: true,
      edad: true,
      fechaNacimiento: true,
      lugarNacimiento: true,
      estadoCivil: true,
      direccionResidencia: true,
      numeroContacto: true,
      correoElectronico: true,
    }),
    S2: anamnesisDatosSchema.pick({
      practicaDeporte: true,
      cualDeporte: true,
      tiempoQuePractica: true,
    }),
    S3: anamnesisDatosSchema.pick({
      contactoEmergencia: true,
      eps: true,
      antecedentesMedicos: true,
      antecedentesFamiliares: true,
      enfermedadRelevante: true,
      cualEnfermedad: true,
    }),
    S4: anamnesisDatosSchema.pick({
      objetivosEntrenamiento: true,
      nivelActividad: true,
      diasNoEntrenamiento: true,
      horaAcostarse: true,
      comidasPorDia: true,
    }),
  }),
});

export type AnamnesisClienteSecciones = z.infer<typeof anamnesisClienteSeccionesSchema>;

/**
 * Sin anamnesis registrada (HU28-AN-32 / R2): mensaje claro, nunca un error
 * 500 ni una pantalla vacía.
 */
export const anamnesisSinRegistroSchema = z.object({
  estado: z.literal("SIN_REGISTRO"),
  mensaje: z.string().min(1),
});

export type AnamnesisSinRegistro = z.infer<typeof anamnesisSinRegistroSchema>;

// ---------------------------------------------------------------------------
// Params y formato de errores (GREEN INC-09)
// ---------------------------------------------------------------------------

/** Params de `/clientes/:clienteId/anamnesis` (patron `auth.schema.ts`). */
export const anamnesisParamsSchema = z.object({
  clienteId: z
    .string({ required_error: "clienteId es requerido" })
    .min(1, "clienteId es requerido")
    .max(36, "clienteId excede longitud máxima"),
});

export type AnamnesisParams = z.infer<typeof anamnesisParamsSchema>;

/**
 * Mensaje del PRIMER error de una validación fallida (INC05-CONF-01), con el
 * formato contractual AN-11 para claves desconocidas (contrato cerrado
 * `.strict()`): "Campos no permitidos en el formulario: <claves>".
 */
export function mensajePrimerErrorZod(
  resultado: { success: boolean; error?: z.ZodError | null }
): string {
  const errores = resultado.error?.errors ?? [];
  const primero = errores[0];
  if (!primero) {
    return "La solicitud no cumple el contrato del formulario";
  }
  if (primero.code === "unrecognized_keys") {
    return `Campos no permitidos en el formulario: ${primero.keys.join(", ")}`;
  }
  return primero.message;
}
