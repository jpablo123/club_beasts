import { z } from "zod";

/**
 * Contrato propuesto de validación — HU-19: Creación de rutina personalizada
 * estructurada. Generado por acceptance-criteria-analyst (modo CREAR,
 * INC-10-rutinas, 2026-11-05).
 *
 * **FUENTE ÚNICA DE LITERALES Y CONTENIDO DEL BLOQUE 6** (patrón
 * `HU-09-schemas.ts` de INC-09): HU-18, HU-20, HU-21 y HU-26 importan de este
 * archivo; los literales no se duplican en los demás archivos del bloque.
 *
 * Reglas de negocio aplicadas:
 * - **DEC-018**: la rutina personalizada usa la estructura COMPLETA
 *   macro-meso-micro (macrociclo -> mesociclo -> microciclo -> sesión). La
 *   estructura completa es SOLO para personalizada; genérica/inducción usan
 *   secciones simples (PEND-RUT-03 (a) en HU-18-schemas.ts).
 * - HU-19 c1: información general + diagnóstico -> PEND-RUT-01 (rec (a),
 *   campos fijos, ver HU-19-criterios-aceptacion.md).
 * - HU-19 c3: sesiones -> ejercicios -> series con intensidad, descanso y
 *   observaciones (modelo anidado; orden implícito por posición en el arreglo,
 *   sin campos `orden`).
 * - HU-19 c4: tests, antropometría y análisis anatómico biomecánico en
 *   "formato estructurado simple" -> PEND-RUT-02 (rec (a): arreglos de
 *   registros tipados con enum de medidas/zonas + valor + fecha).
 * - DEC-016: sin doble cobro con HU-07/HU-13; los puntos de asignación
 *   (HU-20/21) y portal (HU-26) se acreditan en sus propias HU.
 *
 * Modelado de fechas (propuesta, precedente DEC-005/006 de HU-13): cada ciclo
 * lleva `fechaInicio`/`fechaFin` con `fechaFin >= fechaInicio`; la contención
 * del rango hijo dentro del rango padre es recomendación de este contrato
 * (`validarContencionCiclos`).
 *
 * Autónomo: solo depende de `zod` (patrón HU-04/HU-05/HU-09/HU-13). No importa
 * nada de `src/` (tsconfig `rootDir: ./src` impide importar `features/` desde
 * producto; estas copias son el contrato canónico de referencia).
 *
 * IMPORTANTE: contrato PROPUESTO — pendiente de ratificación por
 * backend-developer/database-admin en el spec de INC-10 (no decide rutas HTTP
 * ni Prisma). Los PEND-RUT-01/02 quedan abiertos para Producto.
 */

// ---------------------------------------------------------------------------
// Literales del bloque (no editar sin decisión de Producto)
// ---------------------------------------------------------------------------

/**
 * Tipo de rutina (HU-18 c1 "definir si es genérica o de inducción" +
 * HU-19 personalizada + HU-20 c2 "genéricas, de inducción o personalizadas").
 */
export const TIPO_RUTINA = ["GENERICA", "INDUCCION", "PERSONALIZADA"] as const;

/** PEND-RUT-01 (a): nivel de experiencia del cliente para la rutina. */
export const NIVEL_EXPERIENCIA = ["PRINCIPIANTE", "INTERMEDIO", "AVANZADO"] as const;

/** Día de la semana de la sesión (literal estilo HU-09: sin acentos). */
export const DIA_SEMANA = [
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
  "domingo",
] as const;

/** Grupo muscular del ejercicio (propuesta; sinónimos se normalizan a mano). */
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

/** PEND-RUT-02 (a) — Unidad de la medida antropométrica. */
export const UNIDAD_MEDIDA = ["kg", "cm", "%", "unidad"] as const;

/**
 * PEND-RUT-02 (a) — Medidas antropométricas (enum de medidas; alternativas en
 * HU-19-criterios-aceptacion.md: campos fijos o texto estructurado).
 */
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

/** PEND-RUT-02 (a) — Zona anatómica del análisis biomecánico. */
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

/** PEND-RUT-02 (a) — Grado del hallazgo biomecánico. */
export const HALLAZGO_BIOMECANICO = ["NORMAL", "LEVE", "MODERADO", "SEVERO"] as const;

// ---------------------------------------------------------------------------
// Utilidades (patrón HU-09: copias locales autónomas, mensajes en español)
// ---------------------------------------------------------------------------

const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;

/** Copia local de la validación de fecha real de calendario (patrón HU-09/HU-13). */
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

/** Enum con mensaje de error específico en español (patrón HU-09). */
export function enumConMensaje<U extends string, T extends Readonly<[U, ...U[]]>>(
  valores: T,
  mensaje: string
) {
  return z.enum(valores, { errorMap: () => ({ message: mensaje }) });
}

/** Campo de fecha obligatorio: no vacío y día de calendario existente. */
export function fechaRequerida(mensajeVacia: string, mensajeInvalida: string) {
  return z
    .string({ required_error: mensajeVacia })
    .min(1, mensajeVacia)
    .refine(isValidDate, { message: mensajeInvalida });
}

/**
 * Texto opcional que acepta `null` explícito además de ausencia (patrón C3a
 * "null explícito = vacía" de INC-09). El texto presente sí valida rango.
 */
export function opcionalTexto<T extends z.ZodTypeAny>(campo: T) {
  return campo.nullish();
}

// ---------------------------------------------------------------------------
// Validadores base por campo (exportados para pruebas de valores límite)
// ---------------------------------------------------------------------------

/** `nombre` de la rutina. */
export const nombreRutinaBase = z
  .string()
  .min(3, "Nombre debe tener entre 3 y 100 caracteres")
  .max(100, "Nombre debe tener entre 3 y 100 caracteres")
  .regex(
    /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s.,#()-]+$/,
    "Nombre contiene caracteres no permitidos"
  );

/** `nombre` de ciclo/sesión/ejercicio/test. */
export const nombreItemBase = z
  .string()
  .min(3, "Nombre debe tener entre 3 y 120 caracteres")
  .max(120, "Nombre debe tener entre 3 y 120 caracteres")
  .regex(
    /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s.,#()-]+$/,
    "Nombre contiene caracteres no permitidos"
  );

/** Texto largo de objetivo/observación (0..500 al ser opcional). */
export const textoLargoBase = z
  .string()
  .min(1, "El texto debe tener entre 1 y 500 caracteres")
  .max(500, "El texto debe tener entre 1 y 500 caracteres");

/** PEND-RUT-01 (a) — Objetivo general (texto largo, requerido). */
export const objetivoGeneralBase = z
  .string()
  .min(10, "Objetivo general debe tener entre 10 y 1000 caracteres")
  .max(1000, "Objetivo general debe tener entre 10 y 1000 caracteres");

/** PEND-RUT-01 (a) — Diagnóstico (texto largo, requerido). */
export const diagnosticoBase = z
  .string()
  .min(5, "Diagnóstico debe tener entre 5 y 2000 caracteres")
  .max(2000, "Diagnóstico debe tener entre 5 y 2000 caracteres");

/** PEND-RUT-01 (a) — Restricciones médicas / lesiones / observaciones (0..1000). */
export const textoDiagnosticoBase = z
  .string()
  .min(1, "El texto debe tener entre 1 y 1000 caracteres")
  .max(1000, "El texto debe tener entre 1 y 1000 caracteres");

/** PEND-RUT-01 (a) — Fecha de evaluación (válida, no futura). */
export const fechaEvaluacionBase = z
  .string()
  .min(1, "Fecha de evaluación es requerida")
  .superRefine((valor, ctx) => {
    if (!isValidDate(valor)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Fecha de evaluación debe ser una fecha válida (YYYY-MM-DD)",
      });
      return;
    }
    const hoy = new Date().toISOString().slice(0, 10);
    if (valor > hoy) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Fecha de evaluación no puede ser futura",
      });
    }
  });

/** Nombre del ejercicio. */
export const ejercicioNombreBase = nombreItemBase;

/**
 * Repeticiones de la serie ("10", "8-12", "6-8"). Formato estructurado simple:
 * número único o rango; sin texto libre (para poder listar/comparar).
 */
export const repeticionesBase = z
  .string()
  .min(1, "Repeticiones debe tener formato '8' o '8-12'")
  .max(7, "Repeticiones debe tener formato '8' o '8-12'")
  .regex(
    /^\d{1,3}(-\d{1,3})?$/,
    "Repeticiones debe tener formato '8' o '8-12'"
  )
  .superRefine((valor, ctx) => {
    const partes = valor.split("-").map(Number);
    if (partes.length === 2 && partes[0] > partes[1]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Repeticiones: el valor inicial no puede superar al final",
      });
    }
    for (const n of partes) {
      if (n < 1 || n > 999) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Repeticiones debe estar entre 1 y 999",
        });
      }
    }
  });

/** Intensidad de la serie (texto corto: "70% 1RM", "20 kg", "RPE 7"). */
export const intensidadBase = z
  .string()
  .min(1, "Intensidad debe tener entre 1 y 50 caracteres")
  .max(50, "Intensidad debe tener entre 1 y 50 caracteres");

/** Descanso entre series en segundos (0..3600). */
export const descansoSegundosBase = z
  .number({ invalid_type_error: "Descanso debe ser un número entero de segundos" })
  .int("Descanso debe ser un número entero de segundos")
  .min(0, "Descanso debe estar entre 0 y 3600 segundos")
  .max(3600, "Descanso debe estar entre 0 y 3600 segundos");

/** PEND-RUT-02 (a) — Resultado de un test (texto/numérico simple 1..200). */
export const resultadoTestBase = z
  .string()
  .min(1, "Resultado debe tener entre 1 y 200 caracteres")
  .max(200, "Resultado debe tener entre 1 y 200 caracteres");

/** PEND-RUT-02 (a) — Valor numérico de la medida antropométrica (0.1..500). */
export const valorMedidaBase = z
  .number({ invalid_type_error: "Valor debe ser un número" })
  .min(0.1, "Valor debe estar entre 0.1 y 500")
  .max(500, "Valor debe estar entre 0.1 y 500");

/** PEND-RUT-02 (a) — Descripción del hallazgo biomecánico (0..500). */
export const descripcionHallazgoBase = z
  .string()
  .min(1, "La descripción debe tener entre 1 y 500 caracteres")
  .max(500, "La descripción debe tener entre 1 y 500 caracteres");

// ---------------------------------------------------------------------------
// Contenido compartido: serie -> ejercicio -> sesión (HU-19 c3 / HU-18 PEND-03)
// ---------------------------------------------------------------------------

/** Serie con intensidad, descanso y observaciones (HU-19 c3). */
export const serieSchema = z
  .object({
    repeticiones: repeticionesBase,
    intensidad: intensidadBase,
    descansoSegundos: descansoSegundosBase,
    observaciones: opcionalTexto(textoLargoBase),
  })
  .strict(); // contrato cerrado: campos desconocidos -> 400

export type Serie = z.infer<typeof serieSchema>;

/** Ejercicio con sus series (HU-19 c3). */
export const ejercicioSchema = z
  .object({
    nombre: ejercicioNombreBase,
    grupoMuscular: opcionalTexto(
      enumConMensaje(GRUPO_MUSCULAR, "Grupo muscular contiene un valor no permitido")
    ),
    series: z
      .array(serieSchema)
      .min(1, "Cada ejercicio debe tener al menos 1 serie")
      .max(30, "Cada ejercicio puede tener máximo 30 series"),
    observaciones: opcionalTexto(textoLargoBase),
  })
  .strict();

export type Ejercicio = z.infer<typeof ejercicioSchema>;

/**
 * Sesión con sus ejercicios (HU-19 c3). En la personalizada la sesión vive
 * dentro del microciclo; en genérica/inducción vive al nivel raíz
 * (PEND-RUT-03 (a), HU-18-schemas.ts).
 */
export const sesionSchema = z
  .object({
    nombre: nombreItemBase,
    dia: opcionalTexto(
      enumConMensaje(DIA_SEMANA, "Día debe ser un día de la semana válido")
    ),
    objetivo: opcionalTexto(textoLargoBase),
    ejercicios: z
      .array(ejercicioSchema)
      .min(1, "Cada sesión debe tener al menos 1 ejercicio")
      .max(30, "Cada sesión puede tener máximo 30 ejercicios"),
    observaciones: opcionalTexto(textoLargoBase),
  })
  .strict();

export type Sesion = z.infer<typeof sesionSchema>;

// ---------------------------------------------------------------------------
// Ciclos macro-meso-micro (DEC-018, solo personalizada)
// ---------------------------------------------------------------------------

const nombreCicloBase = nombreItemBase;

/** Microciclo: contiene las sesiones (DEC-018). */
export const microcicloSchema = z
  .object({
    nombre: nombreCicloBase,
    fechaInicio: fechaRequerida(
      "Fecha de inicio es requerida",
      "Fecha de inicio debe ser una fecha válida (YYYY-MM-DD)"
    ),
    fechaFin: fechaRequerida(
      "Fecha de fin es requerida",
      "Fecha de fin debe ser una fecha válida (YYYY-MM-DD)"
    ),
    objetivo: opcionalTexto(textoLargoBase),
    observaciones: opcionalTexto(textoLargoBase),
    sesiones: z
      .array(sesionSchema)
      .min(1, "Cada microciclo debe tener al menos 1 sesión")
      .max(30, "Cada microciclo puede tener máximo 30 sesiones"),
  })
  .strict()
  .superRefine((valor, ctx) => {
    if (valor.fechaFin < valor.fechaInicio) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fechaFin"],
        message: "Fecha de fin no puede ser anterior a la fecha de inicio",
      });
    }
  });

export type Microciclo = z.infer<typeof microcicloSchema>;

/** Mesociclo: contiene microciclos (DEC-018). */
export const mesocicloSchema = z
  .object({
    nombre: nombreCicloBase,
    fechaInicio: fechaRequerida(
      "Fecha de inicio es requerida",
      "Fecha de inicio debe ser una fecha válida (YYYY-MM-DD)"
    ),
    fechaFin: fechaRequerida(
      "Fecha de fin es requerida",
      "Fecha de fin debe ser una fecha válida (YYYY-MM-DD)"
    ),
    objetivo: opcionalTexto(textoLargoBase),
    observaciones: opcionalTexto(textoLargoBase),
    microciclos: z
      .array(microcicloSchema)
      .min(1, "Cada mesociclo debe tener al menos 1 microciclo")
      .max(20, "Cada mesociclo puede tener máximo 20 microciclos"),
  })
  .strict()
  .superRefine((valor, ctx) => {
    if (valor.fechaFin < valor.fechaInicio) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fechaFin"],
        message: "Fecha de fin no puede ser anterior a la fecha de inicio",
      });
    }
  });

export type Mesociclo = z.infer<typeof mesocicloSchema>;

/** Macrociclo: contiene mesociclos (DEC-018). */
export const macrocicloSchema = z
  .object({
    nombre: nombreCicloBase,
    fechaInicio: fechaRequerida(
      "Fecha de inicio es requerida",
      "Fecha de inicio debe ser una fecha válida (YYYY-MM-DD)"
    ),
    fechaFin: fechaRequerida(
      "Fecha de fin es requerida",
      "Fecha de fin debe ser una fecha válida (YYYY-MM-DD)"
    ),
    objetivo: opcionalTexto(textoLargoBase),
    observaciones: opcionalTexto(textoLargoBase),
    mesociclos: z
      .array(mesocicloSchema)
      .min(1, "Cada macrociclo debe tener al menos 1 mesociclo")
      .max(20, "Cada macrociclo puede tener máximo 20 mesociclos"),
  })
  .strict()
  .superRefine((valor, ctx) => {
    if (valor.fechaFin < valor.fechaInicio) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fechaFin"],
        message: "Fecha de fin no puede ser anterior a la fecha de inicio",
      });
    }
  });

export type Macrociclo = z.infer<typeof macrocicloSchema>;

/**
 * Coherencia de rangos (propuesta de contrato, RU-12): el rango de cada ciclo
 * hijo debe estar contenido en el rango de su padre. Puro y testeable.
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
// PEND-RUT-01 (a) — Información general + diagnóstico (HU-19 c1)
// ---------------------------------------------------------------------------

export const informacionGeneralSchema = z
  .object({
    objetivoGeneral: objetivoGeneralBase,
    nivelExperiencia: enumConMensaje(
      NIVEL_EXPERIENCIA,
      "Nivel de experiencia debe ser PRINCIPIANTE, INTERMEDIO o AVANZADO"
    ),
    fechaEvaluacion: fechaEvaluacionBase,
  })
  .strict();

export type InformacionGeneral = z.infer<typeof informacionGeneralSchema>;

export const diagnosticoSchema = z
  .object({
    diagnostico: diagnosticoBase,
    restriccionesMedicas: opcionalTexto(textoDiagnosticoBase),
    lesionesPrevias: opcionalTexto(textoDiagnosticoBase),
    observacionesGenerales: opcionalTexto(textoDiagnosticoBase),
  })
  .strict();

export type Diagnostico = z.infer<typeof diagnosticoSchema>;

// ---------------------------------------------------------------------------
// PEND-RUT-02 (a) — Tests, antropometría y análisis biomecánico (HU-19 c4)
// ---------------------------------------------------------------------------

export const testSchema = z
  .object({
    nombre: nombreItemBase,
    resultado: resultadoTestBase,
    fecha: fechaRequerida(
      "Fecha del test es requerida",
      "Fecha del test debe ser una fecha válida (YYYY-MM-DD)"
    ),
    observaciones: opcionalTexto(textoLargoBase),
  })
  .strict();

export type Test = z.infer<typeof testSchema>;

export const antropometriaItemSchema = z
  .object({
    medida: enumConMensaje(
      MEDIDA_ANTROPOMETRICA,
      "Medida antropométrica contiene un valor no permitido"
    ),
    valor: valorMedidaBase,
    unidad: enumConMensaje(UNIDAD_MEDIDA, "Unidad debe ser kg, cm, % o unidad"),
    fecha: fechaRequerida(
      "Fecha de la medida es requerida",
      "Fecha de la medida debe ser una fecha válida (YYYY-MM-DD)"
    ),
    observaciones: opcionalTexto(textoLargoBase),
  })
  .strict()
  .superRefine((valor, ctx) => {
    // Coherencia simple medida/unidad (propuesta): peso en kg, longitudes en cm,
    // porcentajes en %.
    const esperada: Record<string, string> = {
      peso: "kg",
      porcentajeGrasa: "%",
      masaMuscular: "kg",
    };
    const longitudes = [
      "estatura",
      "perimetroBrazo",
      "perimetroCintura",
      "perimetroCadera",
      "perimetroMuslo",
      "perimetroPantorrilla",
      "pliegueTricipal",
      "pliegueSubescapular",
      "pliegueSuprailiaco",
      "pliegueAbdominal",
    ];
    const unidadEsperada = esperada[valor.medida] ?? (longitudes.includes(valor.medida) ? "cm" : undefined);
    if (unidadEsperada !== undefined && valor.unidad !== unidadEsperada) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["unidad"],
        message: `Unidad debe ser '${unidadEsperada}' para la medida '${valor.medida}'`,
      });
    }
  });

export type AntropometriaItem = z.infer<typeof antropometriaItemSchema>;

export const analisisBiomecanicoItemSchema = z
  .object({
    zona: enumConMensaje(
      ZONA_BIOMECANICA,
      "Zona anatómica contiene un valor no permitido"
    ),
    hallazgo: enumConMensaje(
      HALLAZGO_BIOMECANICO,
      "Hallazgo debe ser NORMAL, LEVE, MODERADO o SEVERO"
    ),
    descripcion: opcionalTexto(descripcionHallazgoBase),
    fecha: fechaRequerida(
      "Fecha del análisis es requerida",
      "Fecha del análisis debe ser una fecha válida (YYYY-MM-DD)"
    ),
  })
  .strict();

export type AnalisisBiomecanicoItem = z.infer<typeof analisisBiomecanicoItemSchema>;

// ---------------------------------------------------------------------------
// Creación / actualización — rutina personalizada (HU-19)
// ---------------------------------------------------------------------------

/**
 * Creación de la rutina personalizada (estructura COMPLETA macro-meso-micro,
 * DEC-018). La validación de contención de rangos (RU-12) es del servicio:
 * `validarContencionCiclos(macrociclos)` -> errores -> 400.
 */
export const crearRutinaPersonalizadaSchema = z
  .object({
    tipoRutina: enumConMensaje(
      TIPO_RUTINA,
      "Tipo de rutina debe ser GENERICA, INDUCCION o PERSONALIZADA"
    ).refine((v) => v === "PERSONALIZADA", {
      message: "Tipo de rutina debe ser PERSONALIZADA",
    }),
    nombre: nombreRutinaBase,
    descripcion: opcionalTexto(textoLargoBase),
    informacionGeneral: informacionGeneralSchema,
    diagnostico: diagnosticoSchema,
    macrociclos: z
      .array(macrocicloSchema)
      .min(1, "Debe registrar al menos un macrociclo")
      .max(20, "Puede registrar máximo 20 macrociclos"),
    tests: opcionalTexto(
      z
        .array(testSchema)
        .max(50, "Puede registrar máximo 50 tests")
    ),
    antropometria: opcionalTexto(
      z
        .array(antropometriaItemSchema)
        .max(50, "Puede registrar máximo 50 medidas antropométricas")
    ),
    analisisBiomecanico: opcionalTexto(
      z
        .array(analisisBiomecanicoItemSchema)
        .max(50, "Puede registrar máximo 50 hallazgos biomecánicos")
    ),
  })
  .strict();

export type CrearRutinaPersonalizada = z.infer<typeof crearRutinaPersonalizadaSchema>;

/**
 * Actualización de la personalizada (PROPUESTA, RU-17): PATCH con semántica de
 * sección — la sección presente REEMPLAZA el árbol completo de esa sección;
 * la ausente se conserva (patrón R3/C3a de INC-09). `tipoRutina` no cambia.
 */
export const actualizarRutinaPersonalizadaSchema = crearRutinaPersonalizadaSchema
  .omit({ tipoRutina: true })
  .partial()
  .strict();

export type ActualizarRutinaPersonalizada = z.infer<
  typeof actualizarRutinaPersonalizadaSchema
>;

// ---------------------------------------------------------------------------
// DTOs de LECTURA (respuesta) — usados por HU-20/21 (ficha) y HU-26 (portal)
// ---------------------------------------------------------------------------

/** Resumen de la rutina (asignaciones, historial, listados). */
export const rutinaResumenSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  tipoRutina: enumConMensaje(
    TIPO_RUTINA,
    "Tipo de rutina debe ser GENERICA, INDUCCION o PERSONALIZADA"
  ),
  descripcion: z.string().nullable(),
});

export type RutinaResumen = z.infer<typeof rutinaResumenSchema>;

/** DTO de lectura de la personalizada (estructura completa, solo staff/portal). */
export const rutinaPersonalizadaDatosSchema = z.object({
  id: z.string(),
  tipoRutina: z.literal("PERSONALIZADA"),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  informacionGeneral: informacionGeneralSchema,
  diagnostico: diagnosticoSchema,
  macrociclos: z.array(macrocicloSchema),
  tests: z.array(testSchema),
  antropometria: z.array(antropometriaItemSchema),
  analisisBiomecanico: z.array(analisisBiomecanicoItemSchema),
  fechaActualizacion: z.string(),
  actualizadoPor: z.object({ id: z.string(), nombre: z.string() }),
});

export type RutinaPersonalizadaDatos = z.infer<typeof rutinaPersonalizadaDatosSchema>;

// ---------------------------------------------------------------------------
// Agrupación en secciones (HU-18 c2 "estructura organizada" / HU-26 PEND-07)
// ---------------------------------------------------------------------------

export const SECCIONES_RUTINA = {
  P1: {
    titulo: "Informacion general",
    campos: ["objetivoGeneral", "nivelExperiencia", "fechaEvaluacion"],
  },
  P2: {
    titulo: "Diagnostico",
    campos: ["diagnostico", "restriccionesMedicas", "lesionesPrevias", "observacionesGenerales"],
  },
  P3: {
    titulo: "Ciclos (macro-meso-micro)",
    campos: ["macrociclos"],
  },
  P4: {
    titulo: "Sesiones y ejercicios",
    campos: ["sesiones"],
  },
  P5: {
    titulo: "Evaluaciones",
    campos: ["tests", "antropometria", "analisisBiomecanico"],
  },
} as const;
