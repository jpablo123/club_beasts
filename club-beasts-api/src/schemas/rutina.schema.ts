import { z } from "zod";

/**
 * INC-10 (HU-18/19/20/21/26) — validacion de rutinas, asignacion, historial
 * y portal.
 *
 * Equivalente en `src/` del contrato canonico
 * `features/acceptance-criteria/HU-18-schemas.ts` + `HU-19-schemas.ts` +
 * `HU-20-schemas.ts` + `HU-21-schemas.ts` + `HU-26-schemas.ts`, copiado SIN
 * CAMBIOS (INC09-R08: los tests de integracion parsean respuestas y errores
 * con los schemas canonicos; esta copia debe ser compatible al 1:1 — literales,
 * regex, mensajes, orden de claves e issues). Patron `anamnesis.schema.ts`:
 * `tsconfig rootDir: ./src` impide importar `features/`. El bloque canónico se
 * replica aqui con el mismo orden: HU-19 (fuente unica del bloque) -> HU-18 ->
 * HU-20 -> HU-21 -> HU-26. `servicioPersonalizadoEstadoEnum` se copia en linea
 * desde `HU-13-schemas.ts` (fuente unica de literales de vigencia, DEC-043).
 *
 * ── ENMIENDA C4 (patrón C4) — INC-10-rutinas, ciclo GREEN 2026-11-05 ──
 * Contrato de enmienda: cambios documentados header + inline, nunca edicion
 * silenciosa (INC10-R08-GAP-02 / DEC-070):
 *   (1) `CODIGO_ASIGNACION_CONFLICTO` / `MENSAJE_ASIGNACION_CONFLICTO`:
 *       literales del 409 de concurrencia (arbitro `activaClave` -> P2002).
 *   (2) `asignacionErrorSchema.code`: el contrato de error acepta
 *       `ASIGNACION_CONFLICTO` ademas de los 5 codigos base.
 *   (3) `CODIGOS_ERROR_ASIGNACION` / `MENSAJES_ASIGNACION` NO se amplian aqui:
 *       los tests unitarios `tests/unit/inc10-rutinas-schemas.test.ts:1117,1128`
 *       fijan exactamente 5 codigos/5 mensajes (INC00-QA-01: los tests no se
 *       editan en este contrato). La adicion literal queda pendiente del
 *       re-escopo de esos tests (contrato del orquestador). Mismo contenido
 *       en el canonico `HU-20-schemas.ts`.
 * Ninguna otra clausula de este archivo cambia.
 *
 * Adiciones del GREEN (documentadas, sin alterar la semantica canonica):
 *  - `mensajePrimerErrorZod`: mensaje del PRIMER error (INC05-CONF-01) con el
 *    formato contractual de claves desconocidas: "Campos no permitidos en el
 *    formulario: <claves>" (contrato cerrado `.strict()`), patron
 *    `anamnesis.schema.ts`.
 *  - `asignarRutinaBodySchema`: body del endpoint 5 SIN `clienteId` (vive en
 *    params; el canonico `asignarRutinaSchema` lo trae requerido para su
 *    forma completa). Mantiene strict y los mensajes de campo del canonico.
 *  - `asignacionParamsSchema` / `rutinaIdParamsSchema`: params con max 36
 *    (patron `anamnesisParamsSchema` / `auth.schema.ts`) — sostienen el paso
 *    "400 params" del orden de errores del endpoint 5.
 *  - `tipoRutinaQuerySchema`: filtro `tipo=` del listado reutilizando el MISMO
 *    campo del canonico (`rutinaResumenSchema.shape.tipoRutina`) para que el
 *    mensaje 400 sea identico al canónico (INC09-R08).
 */

// ═══════════════════════════════════════════════════════════════════════════
// HU-19-schemas.ts — FUENTE ÚNICA DE LITERALES Y CONTENIDO DEL BLOQUE 6
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Contrato propuesto de validación — HU-19: Creación de rutina personalizada
 * estructurada. Generado por acceptance-criteria-analyst (modo CREAR,
 * INC-10-rutinas, 2026-11-05).
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

// ═══════════════════════════════════════════════════════════════════════════
// HU-18-schemas.ts — Creación de rutina genérica o de inducción
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Contrato propuesto de validación — HU-18: Creación de rutina genérica o de
 * inducción. Generado por acceptance-criteria-analyst (modo CREAR,
 * INC-10-rutinas, 2026-11-05).
 *
 * Reglas de negocio aplicadas:
 * - HU-18 c1: `tipoRutina` explícito `GENERICA | INDUCCION` (cerrado: una
 *   rutina de este contrato NUNCA es `PERSONALIZADA`).
 * - HU-18 c2 "estructura organizada para su consulta" -> secciones simples
 *   (información general + sesiones->ejercicios->series), exportadas en
 *   `SECCIONES_RUTINA_BASE`.
 * - **DEC-018**: la estructura completa macro-meso-micro es SOLO de la
 *   personalizada (HU-19). Aquí NO hay ciclos.
 * - **PEND-RUT-03 (rec (a))**: genéricas/inducción COMPARTEN el modelo
 *   `sesiones -> ejercicios -> series` de HU-19 (importado de HU-19-schemas =
 *   fuente única), pero sin macro-meso-micro.
 * - HU-18 c3 "reutilizable con varios clientes": la rutina NO se consume al
 *   asignarse; N clientes pueden tenerla activa (misma `rutinaId`). La
 *   unicidad es por cliente (1 activa/cliente, HU-20 c1).
 * - HU-18 c4 "activada para un cliente": la activación es la ASIGNACIÓN de
 *   HU-20 (sin doble cobro DEC-016; criterio RU-05 REF).
 */

// ---------------------------------------------------------------------------
// Literales locales (lo demás vive en HU-19-schemas.ts = fuente única)
// ---------------------------------------------------------------------------

/** Tipos que admite este contrato (HU-18 c1). */
export const TIPO_RUTINA_BASE = ["GENERICA", "INDUCCION"] as const;

// ---------------------------------------------------------------------------
// Creación / actualización (HU-18 c1/c2)
// ---------------------------------------------------------------------------

/**
 * Creación de rutina genérica o de inducción (RU-01/RU-02).
 * `sesiones` comparte `sesionSchema` de HU-19 (PEND-RUT-03 rec (a)).
 */
export const crearRutinaBaseSchema = z
  .object({
    tipoRutina: enumConMensaje(
      TIPO_RUTINA_BASE,
      "Tipo de rutina debe ser GENERICA o INDUCCION"
    ),
    nombre: nombreRutinaBase,
    descripcion: opcionalTexto(textoLargoBase),
    objetivo: opcionalTexto(textoLargoBase),
    nivelExperiencia: opcionalTexto(
      enumConMensaje(
        NIVEL_EXPERIENCIA,
        "Nivel de experiencia debe ser PRINCIPIANTE, INTERMEDIO o AVANZADO"
      )
    ),
    sesiones: z
      .array(sesionSchema)
      .min(1, "Debe registrar al menos 1 sesión")
      .max(30, "Puede registrar máximo 30 sesiones"),
  })
  .strict(); // contrato cerrado (RU-08): campos desconocidos -> 400

export type CrearRutinaBase = z.infer<typeof crearRutinaBaseSchema>;

/**
 * Actualización de genérica/inducción (RU-06): PATCH con semántica de sección
 * (presente = reemplaza; ausente = conserva; patrón R3/C3a de INC-09).
 * `tipoRutina` es INMUTABLE tras la creación (no está en el contrato de update).
 */
export const actualizarRutinaBaseSchema = crearRutinaBaseSchema
  .omit({ tipoRutina: true })
  .partial()
  .strict();

export type ActualizarRutinaBase = z.infer<typeof actualizarRutinaBaseSchema>;

// ---------------------------------------------------------------------------
// DTO de LECTURA (respuesta) — listados, ficha y portal
// ---------------------------------------------------------------------------

/** DTO de lectura de genérica/inducción (estructura organizada para consulta). */
export const rutinaBaseDatosSchema = z.object({
  id: z.string(),
  tipoRutina: enumConMensaje(
    TIPO_RUTINA_BASE,
    "Tipo de rutina debe ser GENERICA o INDUCCION"
  ),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  objetivo: z.string().nullable(),
  nivelExperiencia: z.string().nullable(),
  sesiones: z.array(sesionSchema),
  fechaActualizacion: z.string(),
  actualizadoPor: z.object({ id: z.string(), nombre: z.string() }),
});

export type RutinaBaseDatos = z.infer<typeof rutinaBaseDatosSchema>;

// ---------------------------------------------------------------------------
// Secciones de consulta (HU-18 c2)
// ---------------------------------------------------------------------------

export const SECCIONES_RUTINA_BASE = {
  B1: {
    titulo: "Informacion general",
    campos: ["nombre", "tipoRutina", "descripcion", "objetivo", "nivelExperiencia"],
  },
  B2: {
    titulo: "Sesiones y ejercicios",
    campos: ["sesiones"],
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// HU-20-schemas.ts — Asignación de rutina activa
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Contrato propuesto de validación — HU-20: Asignación de rutina activa.
 * Generado por acceptance-criteria-analyst (modo CREAR, INC-10-rutinas,
 * 2026-11-05).
 *
 * Reglas de negocio aplicadas:
 * - HU-20 c1: UNA sola rutina activa por cliente (supuesto §2 del historial de
 *   HU). Al asignar una nueva, la anterior se cierra (`fechaFin`) — regla de
 *   reemplazo fijada por HU-21 c3 (RU-21/RU-31). Invariante: nunca 2 activas.
 * - HU-20 c2: asignables GENERICA | INDUCCION | PERSONALIZADA.
 * - HU-20 c3 + HU-13 b4 (`HU13-C04`, INC05-PER-05): una rutina PERSONALIZADA
 *   solo se activa si el servicio personalizado está **vigente**. Estados
 *   permitidos -> PEND-RUT-05 (rec (a): solo `ACTIVA` al momento del cambio;
 *   `CONGELADO`/`VENCIDA`/`PROGRAMADA`/`NO_CONTRATADO` -> rechazo). Los
 *   literales de estado son los de `HU-13-schemas.ts` (fuente única, DEC-043:
 *   `CONGELADO`, nunca "CONGELADA").
 * - Genérica/inducción NO exige vigencia (HU-26 c3 "sin personalizado vigente
 *   puede mostrar una genérica o de inducción asignada").
 * - Trazabilidad (HU-21 c2): `actor` = usuario autenticado real (precedentes
 *   `ClienteEstadoCambio.actorId` / `Anamnesis.actualizadoPorId`), nunca un
 *   valor libre del cliente.
 * - Permisos: PEND-RUT-04 (rec (a) solo DUENO; supuesto §2 "la recepción ...
 *   no gestiona rutinas").
 *
 * Modelo del registro de asignación: `rutinaAsignacionSchema` (creado aquí,
 * consultado como historial en HU-21). PEND-RUT-06 (rec (a)) lleva
 * `contenidoSnapshot` = copia del contenido al asignar (precedente DEC-056).
 */

// ---------------------------------------------------------------------------
// Literales de vigencia — copia en línea de `HU-13-schemas.ts` (fuente única)
// ---------------------------------------------------------------------------

/**
 * Estados de la vigencia del servicio personalizado (HU-13-schemas.ts, DEC-043:
 * literal único `CONGELADO`):
 * - NO_CONTRATADO: sin vigencias.
 * - PROGRAMADA/ACTIVA/VENCIDA: calculados con America/Bogota e inclusivos
 *   (DEC-005/006), igual que `calcularEstado` de gym.
 * - CONGELADO: literal único fijado por DEC-043 (2026-10-20).
 */
export const servicioPersonalizadoEstadoEnum = z.enum([
  "NO_CONTRATADO",
  "PROGRAMADA",
  "CONGELADO",
  "ACTIVA",
  "VENCIDA",
]);

// ---------------------------------------------------------------------------
// Estados derivados de la asignación (HU-21 c1/c3)
// ---------------------------------------------------------------------------

/**
 * Estado de la asignación, derivado de `fechaFin` (sin columna persistida,
 * patrón del estado derivado de HU-11/Anamnesis):
 * - ACTIVA: `fechaFin === null` (la rutina vigente del cliente).
 * - CERRADA: `fechaFin` con fecha (dejó de estar activa al asignar otra).
 */
export const rutinaAsignacionEstadoEnum = z.enum(["ACTIVA", "CERRADA"]);

export type RutinaAsignacionEstado = z.infer<typeof rutinaAsignacionEstadoEnum>;

/** Deriva el estado de la asignación desde `fechaFin` (puro, testeable). */
export function estadoAsignacionPorFechaFin(
  fechaFin: string | null | undefined
): RutinaAsignacionEstado {
  return fechaFin === null || fechaFin === undefined ? "ACTIVA" : "CERRADA";
}

// ---------------------------------------------------------------------------
// Regla de vigencia del servicio personalizado (HU-20 c3 / HU-13 b4)
// ---------------------------------------------------------------------------

export type EstadoVigenciaPersonalizado = z.infer<typeof servicioPersonalizadoEstadoEnum>;

/**
 * PEND-RUT-05 — rec (a): solo el estado `ACTIVA` de la vigencia del servicio
 * personalizado permite activar (y exponer) una rutina personalizada. Estados
 * evaluados al momento del cambio; sin auto-desactivación (ver PEND-05 para la
 * alternativa (b) evento de vencimiento y (c) híbrida).
 */
export const ESTADOS_VIGENCIA_QUE_PERMITEN_PERSONALIZADA = ["ACTIVA"] as const;

export type ResultadoReglaVigencia =
  | { permitido: true }
  | {
      permitido: false;
      code: "SIN_VIGENCIA_PERSONALIZADA";
      error: string;
    };

/**
 * Regla pura HU-20 c3: ¿puede activarse esta rutina para el cliente?
 * - GENERICA/INDUCCION: siempre permitido (sin requisito de vigencia).
 * - PERSONALIZADA: solo con vigencia personalizada `ACTIVA` (rec (a) PEND-05).
 */
export function puedeActivarRutina(
  tipoRutina: (typeof TIPO_RUTINA)[number],
  estadoVigenciaPersonalizado?: EstadoVigenciaPersonalizado | null
): ResultadoReglaVigencia {
  if (tipoRutina !== "PERSONALIZADA") return { permitido: true };
  if (
    estadoVigenciaPersonalizado !== undefined &&
    estadoVigenciaPersonalizado !== null &&
    (ESTADOS_VIGENCIA_QUE_PERMITEN_PERSONALIZADA as readonly string[]).includes(
      estadoVigenciaPersonalizado
    )
  ) {
    return { permitido: true };
  }
  return {
    permitido: false,
    code: "SIN_VIGENCIA_PERSONALIZADA",
    error: MENSAJES_ASIGNACION.SIN_VIGENCIA_PERSONALIZADA,
  };
}

/**
 * Regla de EXPOSICIÓN (HU-26 c2, literal INC05-PER-05): la rutina personalizada
 * solo se expone cuando la vigencia está `ACTIVA`; con `NO_CONTRATADO`,
 * `VENCIDA`, `PROGRAMADA` o `CONGELADO` -> oculta `null` SIN borrar la
 * asignación.
 */
export function esVisibleRutinaPersonalizada(
  estadoVigenciaPersonalizado?: EstadoVigenciaPersonalizado | null
): boolean {
  return (
    estadoVigenciaPersonalizado !== undefined &&
    estadoVigenciaPersonalizado !== null &&
    (ESTADOS_VIGENCIA_QUE_PERMITEN_PERSONALIZADA as readonly string[]).includes(
      estadoVigenciaPersonalizado
    )
  );
}

// ---------------------------------------------------------------------------
// Códigos y mensajes de rechazo de la asignación (contrato de error)
// ---------------------------------------------------------------------------

export const CODIGOS_ERROR_ASIGNACION = [
  "CLIENTE_NO_ENCONTRADO",
  "RUTINA_NO_ENCONTRADA",
  "SIN_VIGENCIA_PERSONALIZADA",
  "RUTINA_YA_ACTIVA",
  "CLIENTE_INACTIVO",
] as const;

export const codigoErrorAsignacionSchema = enumConMensaje(
  CODIGOS_ERROR_ASIGNACION,
  "Código de error de asignación no permitido"
);

/** Mensajes exactos (español, específicos) por código de rechazo. */
export const MENSAJES_ASIGNACION: Record<
  (typeof CODIGOS_ERROR_ASIGNACION)[number],
  string
> = {
  CLIENTE_NO_ENCONTRADO: "Cliente no encontrado",
  RUTINA_NO_ENCONTRADA: "Rutina no encontrada",
  SIN_VIGENCIA_PERSONALIZADA:
    "El cliente no tiene el servicio personalizado vigente: no se puede activar una rutina personalizada",
  RUTINA_YA_ACTIVA: "La rutina ya está activa para este cliente",
  CLIENTE_INACTIVO:
    "Cliente sin estado activo: no se le pueden asignar rutinas",
} as const;

/**
 * ENMIENDA C4 (INC-10, 2026-11-05) — INC10-R08-GAP-02 / DEC-070: el 409 de
 * concurrencia de la asignación (arbitro `activaClave` -> P2002) viaja con el
 * código literal `ASIGNACION_CONFLICTO`. Los mensajes exactos de los 5 codigos
 * base quedan en `MENSAJES_ASIGNACION`; este literal se declara aparte porque
 * los tests unitarios fijan `CODIGOS_ERROR_ASIGNACION`/`MENSAJES_ASIGNACION`
 * en su forma de 5 entradas (INC00-QA-01). Ver header (punto 3).
 */
export const CODIGO_ASIGNACION_CONFLICTO = "ASIGNACION_CONFLICTO" as const;

/** Mensaje del 409 de concurrencia (literal elegido en GREEN; DEC-070 fija solo el código). */
export const MENSAJE_ASIGNACION_CONFLICTO =
  "Otra asignación cambió la rutina activa del cliente: vuelve a intentar" as const;

/**
 * Respuesta de error de la asignación (`{ error, code }`, patrón HU-13).
 * ENMIENDA C4 (INC-10, 2026-11-05) — DEC-070: `code` acepta también
 * `ASIGNACION_CONFLICTO` (concurrencia) ademas de los 5 codigos base.
 */
export const asignacionErrorSchema = z.object({
  error: z.string(),
  code: z.union([
    codigoErrorAsignacionSchema,
    z.literal(CODIGO_ASIGNACION_CONFLICTO),
  ]),
});

// ---------------------------------------------------------------------------
// Solicitud de asignación (HU-20)
// ---------------------------------------------------------------------------

/**
 * POST .../asignaciones (RU-20): `fechaInicio` opcional (por defecto hoy,
 * America/Bogota, precedente DEC-005/006); si se envía debe ser fecha válida y
 * NO futura (una asignación activa empieza hoy o se backfillea al pasado).
 * `fechaFin` NO se recibe: la cierra el sistema al reemplazar (HU-21 c3).
 */
export const asignarRutinaSchema = z
  .object({
    clienteId: z
      .string({ required_error: "clienteId es requerido" })
      .min(1, "clienteId es requerido"),
    rutinaId: z
      .string({ required_error: "rutinaId es requerido" })
      .min(1, "rutinaId es requerido"),
    fechaInicio: z
      .string()
      .refine(
        (v) => /^\d{4}-\d{2}-\d{2}$/.test(v),
        { message: "Fecha de inicio debe ser una fecha válida (YYYY-MM-DD)" }
      )
      .refine(
        (v) => {
          const [y, m, d] = v.split("-").map(Number);
          const fecha = new Date(y, m - 1, d);
          return (
            fecha.getFullYear() === y &&
            fecha.getMonth() === m - 1 &&
            fecha.getDate() === d
          );
        },
        { message: "Fecha de inicio debe ser una fecha válida (YYYY-MM-DD)" }
      )
      .refine(
        (v) => v <= new Date().toISOString().slice(0, 10),
        { message: "Fecha de inicio no puede ser futura" }
      )
      .optional(),
  })
  .strict(); // `fechaFin`, `estado`, `actor` son del sistema -> 400 si llegan

export type AsignarRutina = z.infer<typeof asignarRutinaSchema>;

/** Params de la ruta de asignaciones por cliente. */
export const asignarRutinaParamsSchema = z.object({
  clienteId: z
    .string({ required_error: "clienteId es requerido" })
    .min(1, "clienteId es requerido"),
});

// ---------------------------------------------------------------------------
// Registro de asignación (creado en HU-20; historial en HU-21)
// ---------------------------------------------------------------------------

/**
 * Registro de asignación de rutina (HU-20 c1 + HU-21 c1/c2). Solo puede existir
 * uno con `fechaFin = null` por cliente (invariante RU-21/RU-35).
 *
 * `contenidoSnapshot` (PEND-RUT-06 rec (a)): copia del contenido de la rutina
 * al momento de asignar, para que el historial conserve "la versión del
 * momento" aunque la rutina se edite después (precedente DEC-056 snapshot).
 * Con la alternativa (b) referencia viva este campo viaja `null`.
 */
export const rutinaAsignacionSchema = z.object({
  id: z.string(),
  clienteId: z.string(),
  rutina: rutinaResumenSchema,
  fechaInicio: z.string(),
  fechaFin: z.string().nullable(),
  estado: rutinaAsignacionEstadoEnum,
  actor: z.object({ id: z.string(), nombre: z.string() }),
  contenidoSnapshot: z
    .union([crearRutinaBaseSchema, crearRutinaPersonalizadaSchema])
    .nullable()
    .optional(),
});

export type RutinaAsignacion = z.infer<typeof rutinaAsignacionSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// HU-21-schemas.ts — Historial de cambios de rutina
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Contrato propuesto de validación — HU-21: Historial de cambios de rutina.
 * Generado por acceptance-criteria-analyst (modo CREAR, INC-10-rutinas,
 * 2026-11-05).
 *
 * Reglas de negocio aplicadas:
 * - HU-21 c1: cada asignación guarda `fechaInicio` y `fechaFin` (la activa tiene
 *   `fechaFin = null`; `estado` derivado, sin columna — patrón HU-11).
 * - HU-21 c2: `actor` = quien hizo el cambio (usuario autenticado real;
 *   precedentes `ClienteEstadoCambio.actorId` / `Anamnesis.actualizadoPorId`).
 *   El actor es visible SOLO a staff; HU-26 (portal) lo omite (privacidad).
 * - HU-21 c3: la rutina anterior deja de estar activa al asignar una nueva ->
 *   `fechaFin` de la anterior = `fechaInicio` de la nueva (RU-31). Transiciones:
 *   `[ACTIVA] --asignar otra--> [CERRADA]`; `[CERRADA]` no se reabre (una
 *   re-asignación es un registro nuevo); nunca 2 `ACTIVA` por cliente.
 * - HU-21 c4: historial disponible en la ficha del cliente (staff). El historial
 *   es INMUTABLE por UI (no se edita ni borra; solo se agregan registros al
 *   asignar/cerrar).
 * - PEND-RUT-06: cardinalidad = tabla de asignaciones (`RutinaAsignacion` en
 *   HU-20-schemas) con snapshot opcional del contenido (rec (a)).
 * - Sin doble cobro con HU-07 (DEC-016).
 */

// ---------------------------------------------------------------------------
// Consulta del historial (HU-21 c4)
// ---------------------------------------------------------------------------

/**
 * Historial de asignaciones de rutina del cliente (respuesta de la consulta en
 * la ficha). Orden PROPUESTO: `fechaInicio` DESC (la activa arriba), luego
 * `createdAt` DESC. `total` soporta paginación simple.
 */
export const historialRutinasSchema = z.object({
  clienteId: z.string(),
  asignaciones: z.array(rutinaAsignacionSchema),
  total: z.number().int().min(0),
});

export type HistorialRutinas = z.infer<typeof historialRutinasSchema>;

/**
 * DTO de historial para la ficha del cliente (staff). Idéntico al registro de
 * asignación (incluye `actor` y `contenidoSnapshot` según PEND-RUT-06); el
 * CLIENTE nunca consume este DTO (HU-26 usa `HU-26-schemas.ts`, sin `actor`).
 */
export const rutinaAsignacionFichaSchema = rutinaAsignacionSchema;

// ---------------------------------------------------------------------------
// Reglas del historial (puras, testeables)
// ---------------------------------------------------------------------------

/**
 * Regla de reemplazo (HU-21 c3): al asignar una nueva, la asignación activa
 * previa se cierra con `fechaFin = fechaInicioNueva`. Devuelve el registro
 * cerrado; si no había activa, devuelve `null`. Nunca debe quedar más de una
 * `ACTIVA` por cliente (invariante RU-21/RU-35).
 */
export function cerrarAsignacionActiva(
  asignacionActiva: RutinaAsignacion | null | undefined,
  fechaInicioNueva: string
): RutinaAsignacion | null {
  if (!asignacionActiva) return null;
  return {
    ...asignacionActiva,
    fechaFin: fechaInicioNueva,
    estado: estadoAsignacionPorFechaFin(fechaInicioNueva),
  };
}

/**
 * Invariante (RU-35): valida que a lo sumo una asignación esté activa.
 * Devuelve true si la lista es válida (0 o 1 activas).
 */
export function maxUnaActivaPorCliente(asignaciones: RutinaAsignacion[]): boolean {
  return asignaciones.filter((a) => estadoAsignacionPorFechaFin(a.fechaFin) === "ACTIVA").length <= 1;
}

// ═══════════════════════════════════════════════════════════════════════════
// HU-26-schemas.ts — Visualización de rutina activa (portal del cliente)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Contrato propuesto de validación — HU-26: Visualización de rutina activa
 * (portal del cliente). Generado por acceptance-criteria-analyst (modo CREAR,
 * INC-10-rutinas, 2026-11-05).
 *
 * Reglas de negocio aplicadas:
 * - HU-26 c1: el cliente visualiza SOLO su rutina activa (self-only; privacidad
 *   precedentes SEC-01/SEC-03/GAP-001 de HU-10/HU-28: jamás datos de otro
 *   cliente; respuesta sin `actor` ni datos internos del staff).
 * - HU-26 c2: si es personalizada, muestra "la versión personalizada vigente" =
 *   el contenido de la asignación ACTIVA cuya vigencia del servicio personalizado
 *   está `ACTIVA` (literal INC05-PER-05 de HU13-C04; PEND-RUT-05). Con
 *   `CONGELADO`/`VENCIDA`/`PROGRAMADA`/`NO_CONTRATADO` la personalizada NO se
 *   muestra (la asignación no se borra).
 * - HU-26 c3: sin personalizado vigente, se muestra la genérica/inducción
 *   asignada (no requiere vigencia).
 * - HU-26 c4: el cliente NO puede editar el contenido (solo lectura; cualquier
 *   intento de escritura -> 403; ningún endpoint de escritura accesible a
 *   CLIENTE sobre rutinas).
 * - PEND-RUT-07 (rec (a)): se muestra la estructura COMPLETA de la personalizada
 *   en solo lectura (paridad con HU-28).
 * - Literal de "sin rutina" PROPUESTO: "No tienes una rutina activa".
 */

// ---------------------------------------------------------------------------
// DTOs de lectura del portal (SOLO LECTURA — sin campos de staff)
// ---------------------------------------------------------------------------

/** Tipo visible en el portal (sin PERSONALIZADA fuera de vigencia). */
export const TIPO_RUTINA_PORTAL = ["GENERICA", "INDUCCION"] as const;

/** Rutina genérica/inducción activa en el portal (PEND-RUT-03 (a)). */
export const rutinaPortalBaseSchema = z
  .object({
    tipoRutina: enumConMensaje(
      TIPO_RUTINA_PORTAL,
      "Tipo de rutina debe ser GENERICA o INDUCCION"
    ),
    asignacionId: z.string(),
    fechaInicio: z.string(),
    nombre: nombreRutinaBase,
    descripcion: textoLargoBase.nullable(),
    objetivo: textoLargoBase.nullable(),
    nivelExperiencia: enumConMensaje(
      NIVEL_EXPERIENCIA,
      "Nivel de experiencia debe ser PRINCIPIANTE, INTERMEDIO o AVANZADO"
    ).nullable(),
    sesiones: z.array(sesionSchema),
  })
  .strict(); // sin `actor`, sin `actualizadoPor` (privacidad SEC-01/SEC-03)

export type RutinaPortalBase = z.infer<typeof rutinaPortalBaseSchema>;

/**
 * Rutina personalizada activa en el portal (HU-26 c2). Estructura COMPLETA
 * según PEND-RUT-07 (a); con la alternativa (b) se expone solo
 * `{ nombre, macrociclos }` vía `.pick()`.
 */
export const rutinaPortalPersonalizadaSchema = z
  .object({
    tipoRutina: z.literal("PERSONALIZADA"),
    asignacionId: z.string(),
    fechaInicio: z.string(),
    nombre: nombreRutinaBase,
    descripcion: textoLargoBase.nullable(),
    informacionGeneral: informacionGeneralSchema,
    diagnostico: diagnosticoSchema,
    macrociclos: z.array(macrocicloSchema),
    tests: z.array(testSchema),
    antropometria: z.array(antropometriaItemSchema),
    analisisBiomecanico: z.array(analisisBiomecanicoItemSchema),
  })
  .strict(); // sin `actor`, sin `actualizadoPor` (privacidad SEC-01/SEC-03)

export type RutinaPortalPersonalizada = z.infer<typeof rutinaPortalPersonalizadaSchema>;

/** Discriminado por `tipoRutina` (respuesta de la vista "Mi rutina"). */
export const rutinaPortalSchema = z.discriminatedUnion("tipoRutina", [
  rutinaPortalBaseSchema,
  rutinaPortalPersonalizadaSchema,
]);

export type RutinaPortal = z.infer<typeof rutinaPortalSchema>;

/**
 * Mensaje cuando no hay rutina visible (HU-26 c1: si no hay asignación activa,
 * o la personalizada está fuera de vigencia sin alternativa asignada). Literal
 * PROPUESTO — lo fija el contrato frontend al ratificar.
 */
export const sinRutinaPortalSchema = z
  .object({
    mensaje: z.string(),
  })
  .strict();

export const SIN_RUTINA_MENSAJE = "No tienes una rutina activa";

/** Respuesta completa de la vista de rutina del portal. */
export const respuestaRutinaPortalSchema = z.union([
  rutinaPortalSchema,
  sinRutinaPortalSchema,
]);

export type RespuestaRutinaPortal = z.infer<typeof respuestaRutinaPortalSchema>;

// ---------------------------------------------------------------------------
// Reglas de visibilidad (puras, testeables) — HU-26 c1/c2/c3
// ---------------------------------------------------------------------------

/**
 * ¿Se muestra la asignación activa al cliente? (RU-36..RU-38)
 * - GENERICA/INDUCCION: siempre visible (HU-26 c3).
 * - PERSONALIZADA: solo con vigencia personalizada `ACTIVA`
 *   (INC05-PER-05/HU13-C04; la asignación NO se borra, solo se oculta).
 */
export function visibleEnPortal(
  tipoRutina: (typeof TIPO_RUTINA)[number],
  estadoVigenciaPersonalizado?: EstadoVigenciaPersonalizado | null
): boolean {
  if (tipoRutina !== "PERSONALIZADA") return true;
  return esVisibleRutinaPersonalizada(estadoVigenciaPersonalizado);
}

// ═══════════════════════════════════════════════════════════════════════════
// Adiciones del GREEN (documentadas; no alteran la semántica canónica)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Mensaje del PRIMER error de una validación fallida (INC05-CONF-01), con el
 * formato contractual para claves desconocidas (contrato cerrado `.strict()`):
 * "Campos no permitidos en el formulario: <claves>" (patrón
 * `anamnesis.schema.ts`).
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

/**
 * Params de `/clientes/:clienteId/rutinas/*` (patron `anamnesisParamsSchema` /
 * `auth.schema.ts`, max 36). Sostiene el paso "400 params" del orden de
 * errores del endpoint 5.
 */
export const asignacionParamsSchema = z.object({
  clienteId: z
    .string({ required_error: "clienteId es requerido" })
    .min(1, "clienteId es requerido")
    .max(36, "clienteId excede longitud máxima"),
});

export type AsignacionParams = z.infer<typeof asignacionParamsSchema>;

/** Params de `/rutinas/:rutinaId` (mismo patron que `asignacionParamsSchema`). */
export const rutinaIdParamsSchema = z.object({
  rutinaId: z
    .string({ required_error: "rutinaId es requerido" })
    .min(1, "rutinaId es requerido")
    .max(36, "rutinaId excede longitud máxima"),
});

export type RutinaIdParams = z.infer<typeof rutinaIdParamsSchema>;

/**
 * Body del endpoint 5 (`POST /clientes/:clienteId/rutinas/asignacion`):
 * `asignarRutinaSchema` SIN `clienteId` (vive en params). Mantiene
 * `.strict()` y los MISMOS validadores/mensajes de campo del canónico.
 */
export const asignarRutinaBodySchema = asignarRutinaSchema
  .omit({ clienteId: true })
  .strict();

export type AsignarRutinaBody = z.infer<typeof asignarRutinaBodySchema>;

/**
 * Query de `GET /rutinas?tipo=&nombre=`: reutiliza el MISMO campo del canónico
 * (`rutinaResumenSchema.shape.tipoRutina`) para que el 400 del filtro `tipo`
 * sea identico al canónico (INC09-R08). `nombre` es subcadena libre.
 */
export const listarRutinasQuerySchema = z.object({
  tipo: rutinaResumenSchema.shape.tipoRutina.optional(),
  nombre: z.string().optional(),
});

export type ListarRutinasQuery = z.infer<typeof listarRutinasQuerySchema>;
