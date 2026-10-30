import { z } from "zod";

/**
 * Schemas de validación de HU-15 (Congelación de vigencias).
 *
 * Generados por `acceptance-criteria-analyst` (Modo CREAR, 2026-10-08) como
 * prerequisito G14 del incremento INC-02 y alineados al **contrato API final**
 * fijado por `backend-developer` el 2026-10-08 en
 * `docs/incrementos/INC-02-congelacion-hu-15/spec.md` (secciones "Contrato API
 * final", "Modelo de datos propuesto" y "Fixtures").
 *
 * Ajustes aplicados (sección "Ajustes pendientes de criterios" del spec, #1..#10):
 * - #1: el endpoint **no lleva prefijo `/api`** (el servidor registra rutas sin
 *   prefijo global, `src/index.ts:23-25`).
 * - #2: **`version` va en el body** (lock optimista INC00-MEM-03, mismo patrón
 *   que `updateMembresiaSchema`): requerida, entero positivo.
 * - #3: no existe `CONGELACION_SOLAPADA`; el solape (entre congelaciones o de la
 *   extensión con un periodo posterior) usa `MEMBRESIA_SOLAPADA`.
 * - #4: rama nueva **`MEMBRESIA_VENCIDA`** (409) para vigencias `VENCIDA`.
 * - #5: orden de evaluación fijado: 401/403 → 400 (Zod y después post-Zod
 *   `fechaFin >= hoy`) → 404 → 409: `MEMBRESIA_CONFLICTO` (`version`) →
 *   `CONGELACION_NO_PERMITIDA` (tipo; guarda genérica — **Enmendado 2026-10-20 por
 *   DEC-042 (INC-05 C4)**: `NUTRICION` ya no cae aquí) → `MEMBRESIA_VENCIDA` →
 *   `CONGELACION_NO_PERMITIDA` (rango) → `MEMBRESIA_SOLAPADA` (solape) →
 *   `MEMBRESIA_SOLAPADA` (choque con periodo posterior).
 * - #6: (texto pre-DEC-042) `GYM` y `PERSONALIZADO` → 200; `NUTRICION` → 409
 *   `CONGELACION_NO_PERMITIDA` (guard exigido y probado en INC-02, DEC-023).
 *   **Enmendado 2026-10-20 por DEC-042 (INC-05 C4)**: DEC-023 queda enmendada →
 *   `TIPOS_CONGELABLES` = {GYM, PERSONALIZADO, NUTRICION}: **los 3 tipos → 200**; la
 *   guarda `CONGELACION_NO_PERMITIDA` por tipo se conserva como guarda genérica de
 *   `src/services/membresia.service.ts` (inalcanzable vía API con el enum actual) y el
 *   409 por rango no contenido (DEC-022 a) **no cambia**. El schema no valida el tipo:
 *   esa regla vive en la ruta/servicio (409).
 * - #7: **`fechaFin < hoy` → 400 `VALIDATION_ERROR`** (regla post-Zod, ver
 *   `MENSAJE_FECHA_FIN_NO_ANTERIOR_A_HOY`); no es un 409.
 * - #8: la respuesta 200 es el DTO completo (`tipoServicio`, `creadoPor`,
 *   `actualizadoPor`, `createdAt`, `updatedAt`, **`cambios`** con la fila
 *   `CONGELACION`) + `fechaFinAnterior` + `diasCongelados` + `congelacion`.
 * - #10: este archivo solo fija mensajes/estructura; las fechas de los tests son
 *   dinámicas relativas a `getTodayBogota()` (DEC-013).
 *
 * Ajustes de la **ampliación DEC-024 + DEC-025** (sección "Ajustes pendientes de
 * criterios (ampliacion DEC-024)" del spec, #1..#8):
 * - #1: endpoints nuevos **sin prefijo `/api`** y con el mismo preHandler
 *   `["DUENO", "RECEPCIONISTA"]` (DEC-017) y ownership 404 que congelar:
 *   `POST /clientes/:clienteId/vigencias/:vigenciaId/descongelar` y
 *   `PATCH /clientes/:clienteId/vigencias/:vigenciaId/congelacion`.
 * - #2: bodies con `version` (lock optimista INC00-MEM-03): descongelar
 *   `{ version, motivo? }` (`motivo` **opcional**, DEC-024) y editar
 *   `{ fechaInicio, fechaFin, motivo, version }` (los 4 requeridos; reutiliza
 *   `createCongelacionSchema`, mismos mensajes + regla post-Zod `fechaFin >= hoy`).
 * - #3: código nuevo **`CONGELACION_INEXISTENTE`** (409, mensaje `No hay una
 *   congelación vigente en esta membresía`) en el enum de errores, y acciones
 *   **`DESCONGELACION`** / **`EDICION_CONGELACION`** en el enum de `cambios`.
 * - #4: orden de evaluación de las dos operaciones: 401/403 → 400 (Zod; en editar
 *   además post-Zod `fechaFin >= hoy`) → 404 → 409: `MEMBRESIA_CONFLICTO` →
 *   `CONGELACION_NO_PERMITIDA` (tipo) → `MEMBRESIA_VENCIDA` →
 *   `CONGELACION_INEXISTENTE` → (solo editar) `CONGELACION_NO_PERMITIDA` (rango en
 *   la fila revertida) → `MEMBRESIA_SOLAPADA` ×2. `MEMBRESIA_SOLAPADA` no aplica a
 *   descongelar.
 * - #5: fórmula DEC-024: `diasDevueltos = max(0, finRango - max(hoy, inicioRango)
 *   + 1)` (0 → 409; pausa futura → N completo) y editar
 *   `fechaFin' = fechaFin - N_anterior + N_nuevo`.
 * - #6: **DEC-025** — la congelación no bloquea acceso/portal; estos endpoints solo
 *   mutan `fechaFin`, el estado calculado y la auditoría.
 * - #7: abiertos #7 (DEC-024) y #8 (DEC-025) cerrados en el documento de criterios.
 * - #8: criterios nuevos `HU15-C07` / `HU15-C08` (**0 puntos HU-15**).
 *
 * Las reglas que dependen de `hoy` (en `America/Bogota`), del estado de la
 * vigencia, de su tipo de servicio o de la "congelación vigente" **no van en el
 * schema**: son de la ruta/servicio y responden 400 (post-Zod) o 409
 * (`MEMBRESIA_VENCIDA`, `CONGELACION_NO_PERMITIDA`, `MEMBRESIA_SOLAPADA`,
 * `MEMBRESIA_CONFLICTO`, **`CONGELACION_INEXISTENTE`**).
 *
 * Autocontenido: solo depende de `zod` (mismos mensajes/convenciones que
 * `src/schemas/membresia.schema.ts`, sin importarlo). Directamente importable
 * desde las rutas Fastify.
 */

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** Fecha real de calendario en formato YYYY-MM-DD (DEC-005: dias completos). */
export function isValidDate(valor: string): boolean {
  if (!DATE_REGEX.test(valor)) return false;
  const [year, month, day] = valor.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/**
 * DEC-004: servicios separados. **Enmendado 2026-10-20 por DEC-042 (INC-05 C4)**: los
 * 3 tipos son congelables — DEC-023 enmendada, `TIPOS_CONGELABLES` = {GYM, PERSONALIZADO,
 * NUTRICION}. Pre-DEC-042 solo GYM/PERSONALIZADO congelaban (`NUTRICION` → 409).
 */
export const tipoServicioSchema = z.enum(["GYM", "PERSONALIZADO", "NUTRICION"]);

/** Estados posibles de una vigencia (CONGELADO se agrega en HU-15). */
export const estadoVigenciaSchema = z.enum([
  "PROGRAMADA",
  "ACTIVA",
  "VENCIDA",
  "CONGELADO",
]);

/**
 * Params del endpoint final
 * `POST /clientes/:clienteId/vigencias/:vigenciaId/congelar` (sin prefijo `/api`).
 */
export const congelarParamsSchema = z.object({
  clienteId: z
    .string({ required_error: "clienteId es requerido" })
    .min(1, "clienteId es requerido")
    .max(36, "clienteId excede longitud máxima"),
  vigenciaId: z
    .string({ required_error: "vigenciaId es requerido" })
    .min(1, "vigenciaId es requerido")
    .max(36, "vigenciaId excede longitud máxima"),
});

/**
 * Params de la ampliación DEC-024: mismo path base que congelar (sin prefijo
 * `/api`, mismo ownership 404), solo cambia el segmento de acción:
 * `POST /clientes/:clienteId/vigencias/:vigenciaId/descongelar`.
 */
export const descongelarParamsSchema = congelarParamsSchema;

/**
 * Params de la ampliación DEC-024: `PATCH
 * /clientes/:clienteId/vigencias/:vigenciaId/congelacion` (recurso único por
 * vigencia → sin `congelacionId`).
 */
export const editarCongelarParamsSchema = congelarParamsSchema;

const fechaRequerida = (mensajeVacia: string, mensajeInvalida: string) =>
  z
    .string({ required_error: mensajeVacia })
    .min(1, mensajeVacia)
    .refine(isValidDate, { message: mensajeInvalida });

/**
 * Body de congelacion (HU-15 bullet 2 + contrato INC-02):
 * `fechaInicio`, `fechaFin`, `motivo` y **`version`** (lock optimista,
 * INC00-MEM-03/ajuste #2). El cliente NO envia la nueva `fechaFin`: la calcula
 * el servidor (HU-15 bullet 4).
 *
 * `fechaFin >= hoy` NO esta aqui porque `hoy` es dinamica (`America/Bogota`);
 * ver `MENSAJE_FECHA_FIN_NO_ANTERIOR_A_HOY` (regla post-Zod, 400).
 */
export const createCongelacionSchema = z
  .object({
    fechaInicio: fechaRequerida(
      "Fecha de inicio es requerida",
      "Fecha de inicio debe ser una fecha válida (YYYY-MM-DD)"
    ),
    fechaFin: fechaRequerida(
      "Fecha fin es requerida",
      "Fecha fin debe ser una fecha válida (YYYY-MM-DD)"
    ),
    motivo: z
      .string({ required_error: "Motivo es requerido" })
      .min(1, "Motivo es requerido")
      .max(500, "Motivo no puede exceder 500 caracteres")
      .refine((valor) => valor.trim().length > 0, {
        message: "Motivo es requerido",
      }),
    version: z
      .number({ required_error: "Versión es requerida" })
      .int("Versión debe ser un entero")
      .positive("Versión debe ser positiva"),
  })
  .refine((data) => data.fechaInicio <= data.fechaFin, {
    message: "Fecha fin no puede ser anterior a fecha de inicio",
    path: ["fechaFin"],
  });

/**
 * Body de **descongelar** (ampliación DEC-024, contrato INC-02):
 * `{ version, motivo? }`.
 *
 * - `version` va en el body por el mismo lock optimista INC00-MEM-03 que
 *   congelar (la pierde → 409 `MEMBRESIA_CONFLICTO`).
 * - **`motivo` es opcional** (DEC-024 no lo exige para descongelar; el bullet b2
 *   de HU-15 habla de *congelar*): si **viaja**, aplica la misma regla que en
 *   congelar (1-500 y no vacío tras trim → si no, 400 `VALIDATION_ERROR` con los
 *   mensajes existentes), patrón de `updateMembresiaSchema`.
 * - **Sin fechas en el body**: `hoy` y los días a devolver (`diasDevueltos =
 *   max(0, finRango - max(hoy, inicioRango) + 1)`) los calcula el servidor.
 * - Sin regla post-Zod de fechas (el body no trae fechas).
 */
export const descongelarSchema = z.object({
  motivo: z
    .string({ required_error: "Motivo es requerido" })
    .min(1, "Motivo es requerido")
    .max(500, "Motivo no puede exceder 500 caracteres")
    .refine((valor) => valor.trim().length > 0, {
      message: "Motivo es requerido",
    })
    .optional(),
  version: z
    .number({ required_error: "Versión es requerida" })
    .int("Versión debe ser un entero")
    .positive("Versión debe ser positiva"),
});

/**
 * Body de **editar congelación** (ampliación DEC-024, contrato INC-02):
 * `{ fechaInicio, fechaFin, motivo, version }` — **los 4 requeridos**.
 *
 * El spec fija `updateCongelacionSchema = createCongelacionSchema`: una sola
 * fuente de validación del "rango de pausa" (mismos mensajes + regla de
 * `fechaFin >= fechaInicio`). La regla post-Zod `fechaFin >= hoy`
 * (`MENSAJE_FECHA_FIN_NO_ANTERIOR_A_HOY`) también aplica, igual que en congelar.
 * El cliente **no** envía `fechaFin` de la vigencia ni el N: el servidor revierte
 * `N_anterior` y aplica `N_nuevo` (`fechaFin' = fechaFin - N_anterior + N_nuevo`).
 *
 * Asimetría justificada: congelar y editar declaran un rango → `motivo`
 * obligatorio; descongelar termina la pausa → `motivo` opcional (DEC-024).
 */
export const updateCongelacionSchema = createCongelacionSchema;

/**
 * Regla post-Zod del contrato INC-02 (ajuste #7): `fechaFin` de la congelacion
 * debe ser hoy o futura en `America/Bogota` (DEC-022 b). Si `fechaFin < hoy`,
 * la ruta/servicio responde **400 `VALIDATION_ERROR`** con este mensaje.
 *
 * No se puede expresar en el schema porque `hoy` es dinamica
 * (`getTodayBogota()` en `src/services/membresia.service.ts`).
 */
export const MENSAJE_FECHA_FIN_NO_ANTERIOR_A_HOY =
  "Fecha fin no puede ser anterior a hoy";

/** `true` cuando `fechaFin >= hoy` (comparacion lexicografica de `YYYY-MM-DD`). */
export function fechaFinNoAnteriorAHoy(fechaFin: string, hoy: string): boolean {
  return fechaFin >= hoy;
}

/** Rango de una congelacion persistida (auditoria HU15-C06). */
export const congelacionSchema = z.object({
  fechaInicio: z.string().refine(isValidDate, {
    message: "Fecha de inicio debe ser una fecha válida (YYYY-MM-DD)",
  }),
  fechaFin: z.string().refine(isValidDate, {
    message: "Fecha fin debe ser una fecha válida (YYYY-MM-DD)",
  }),
  motivo: z.string().min(1, "Motivo es requerido").max(500),
  /** Dias completos inclusivos: (fechaFin - fechaInicio) + 1 (DEC-006). */
  diasCongelados: z
    .number()
    .int("diasCongelados debe ser un entero")
    .min(1, "diasCongelados mínimo 1"),
});

/** Usuario referenciado en el DTO (`creadoPor`, `actualizadoPor`, `actor`). */
export const usuarioRefSchema = z.object({
  id: z.string().min(1),
  nombre: z.string().min(1),
});

/**
 * Fila del historial `cambios` del DTO (mismo estilo que `toDTO` en
 * `src/services/membresia.service.ts`, extendido con los campos de congelacion:
 * `motivo`, `congelacionInicio`, `congelacionFin` — solo en filas de pausa
 * `accion: "CONGELACION" | "DESCONGELACION" | "EDICION_CONGELACION"`, modelo
 * fijado en INC-02).
 */
export const cambioSchema = z.object({
  id: z.string().min(1),
  /** Acciones de la ampliación DEC-024: `DESCONGELACION` y `EDICION_CONGELACION`. */
  accion: z.enum([
    "CREACION",
    "EDICION",
    "CONGELACION",
    "DESCONGELACION",
    "EDICION_CONGELACION",
  ]),
  version: z.number().int().min(1),
  /**
   * Filas de pausa (CONGELACION/EDICION_CONGELACION: 1-500 requerido;
   * DESCONGELACION: opcional, puede ser `null` — DEC-024); `null`/ausente en
   * CREACION y EDICION. `nullish()` cubre el `motivo: null` explícito de la fila
   * `DESCONGELACION` del contrato (ejemplo de respuesta 200).
   */
  motivo: z.string().min(1).max(500).nullish(),
  congelacionInicio: z
    .string()
    .refine(isValidDate, {
      message: "Fecha de inicio debe ser una fecha válida (YYYY-MM-DD)",
    })
    .optional(),
  congelacionFin: z
    .string()
    .refine(isValidDate, {
      message: "Fecha fin debe ser una fecha válida (YYYY-MM-DD)",
    })
    .optional(),
  fechaInicioAnterior: z.string().nullable(),
  fechaFinAnterior: z.string().nullable(),
  fechaInicioNueva: z.string().refine(isValidDate, {
    message: "Fecha de inicio debe ser una fecha válida (YYYY-MM-DD)",
  }),
  fechaFinNueva: z.string().refine(isValidDate, {
    message: "Fecha fin debe ser una fecha válida (YYYY-MM-DD)",
  }),
  actor: usuarioRefSchema,
  createdAt: z.string().min(1),
});

/**
 * Base del DTO de respuesta de las operaciones de pausa (estilo `toDTO` de
 * GET/PATCH, ajuste #8). Cada operación agrega sus campos de días y su bloque
 * `congelacion` en `.extend(...)`.
 */
const vigenciaBaseResponseSchema = z.object({
  id: z.string().min(1),
  clienteId: z.string().min(1),
  tipoServicio: tipoServicioSchema,
  fechaInicio: z.string().refine(isValidDate, {
    message: "Fecha de inicio debe ser una fecha válida (YYYY-MM-DD)",
  }),
  /** Fecha fin vigente (ya extendida por congelaciones previas). */
  fechaFin: z.string().refine(isValidDate, {
    message: "Fecha fin debe ser una fecha válida (YYYY-MM-DD)",
  }),
  /** Valor anterior antes de esta operación (auditoría). */
  fechaFinAnterior: z
    .string()
    .refine(isValidDate, {
      message: "Fecha fin anterior debe ser una fecha válida (YYYY-MM-DD)",
    }),
  estado: estadoVigenciaSchema,
  /** Version incrementada por la operación (N -> N+1). */
  version: z.number().int().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  creadoPor: usuarioRefSchema,
  actualizadoPor: usuarioRefSchema,
  /** Historial visible de la vigencia (HU15-C06). */
  cambios: z.array(cambioSchema).min(1),
});

/**
 * Respuesta 200 de `POST /clientes/:clienteId/vigencias/:vigenciaId/congelar`:
 * el DTO completo de la vigencia (estilo `toDTO` de GET/PATCH) extendido con
 * `fechaFinAnterior`, `diasCongelados` y el bloque `congelacion` (contrato
 * INC-02, ajuste #8).
 */
export const congelacionResponseSchema = vigenciaBaseResponseSchema
  .extend({
    /** Dias completos inclusivos: (cFin - cInicio) + 1 (DEC-005/DEC-006). */
    diasCongelados: z
      .number()
      .int("diasCongelados debe ser un entero")
      .min(1, "diasCongelados mínimo 1"),
    congelacion: congelacionSchema,
  })
  .refine(
    (data) => data.cambios.some((cambio) => cambio.accion === "CONGELACION"),
    {
      message: "El historial debe incluir una acción CONGELACION",
      path: ["cambios"],
    }
  );

/**
 * Respuesta 200 de `POST /clientes/:clienteId/vigencias/:vigenciaId/descongelar`
 * (ampliación DEC-024): DTO completo + `fechaFinAnterior` + **`diasDevueltos`**
 * + **`congelacion: null`** (no queda pausa vigente tras la operación).
 *
 * Fórmula: `diasDevueltos = max(0, finRango - max(hoy, inicioRango) + 1)` y
 * `fechaFin = fechaFinAnterior - diasDevueltos`. Los días ya consumidos
 * (`N - diasDevueltos`) permanecen descontados (DEC-024). En un 200
 * `diasDevueltos >= 1` (0 → la ruta responde 409 `CONGELACION_INEXISTENTE`,
 * caso límite 3 del spec).
 */
export const descongelarResponseSchema = vigenciaBaseResponseSchema
  .extend({
    diasDevueltos: z
      .number()
      .int("diasDevueltos debe ser un entero")
      .min(1, "diasDevueltos mínimo 1 (0 responde 409 CONGELACION_INEXISTENTE)"),
    /** Sin pausa vigente tras descongelar. */
    congelacion: z.null(),
  })
  .refine(
    (data) =>
      data.cambios.some((cambio) => cambio.accion === "DESCONGELACION"),
    {
      message: "El historial debe incluir una acción DESCONGELACION",
      path: ["cambios"],
    }
  );

/**
 * Respuesta 200 de `PATCH /clientes/:clienteId/vigencias/:vigenciaId/congelacion`
 * (ampliación DEC-024): DTO completo + `diasCongelados = N_nuevo` +
 * **`diasCongeladosAnterior = N_anterior`** + `congelacion` con el rango
 * editado.
 *
 * Fórmula: `fechaFin = fechaFinAnterior - N_anterior + N_nuevo` (validando
 * antes, sobre la fila revertida `fechaFin - N_anterior`, las mismas reglas que
 * congelar). Rango idéntico (`N' = N`) → también 200 con `fechaFin` sin cambio
 * (caso límite 7 del spec).
 */
export const editarCongelacionResponseSchema = vigenciaBaseResponseSchema
  .extend({
    diasCongelados: z
      .number()
      .int("diasCongelados debe ser un entero")
      .min(1, "diasCongelados mínimo 1"),
    diasCongeladosAnterior: z
      .number()
      .int("diasCongeladosAnterior debe ser un entero")
      .min(1, "diasCongeladosAnterior mínimo 1"),
    congelacion: congelacionSchema,
  })
  .refine(
    (data) =>
      data.cambios.some((cambio) => cambio.accion === "EDICION_CONGELACION"),
    {
      message: "El historial debe incluir una acción EDICION_CONGELACION",
      path: ["cambios"],
    }
  );

/** Cuerpo de error estandar de la API (convencion de `src/routes/membresia.ts`). */
export const congelacionErrorSchema = z.object({
  error: z.string(),
  code: z.enum([
    "VALIDATION_ERROR",
    "NOT_FOUND",
    "AUTH_TOKEN_MISSING",
    "AUTH_TOKEN_INVALID",
    "AUTH_TOKEN_EXPIRED",
    "AUTH_FORBIDDEN",
    // Nomenclatura 409 fijada en el contrato INC-02 (ajustes #3 y #4):
    // MEMBRESIA_VENCIDA -> vigencia VENCIDA (DEC-022)
    "MEMBRESIA_VENCIDA",
    // CONGELACION_NO_PERMITIDA -> tipo fuera de TIPOS_CONGELABLES o rango no contenido
    // en la vigencia (DEC-022 a). Enmendado 2026-10-20 por DEC-042 (INC-05 C4): DEC-023
    // enmendada -> TIPOS_CONGELABLES = {GYM, PERSONALIZADO, NUTRICION}; la rama por tipo
    // ya no rechaza a NUTRICION (se conserva como guarda generica de src, hoy
    // inalcanzable via API con el enum actual) y el mensaje "La congelación no está
    // permitida para este tipo de servicio" queda sin cambio.
    "CONGELACION_NO_PERMITIDA",
    // MEMBRESIA_SOLAPADA -> solape de congelaciones o choque de la extension con
    // un periodo posterior (DEC-008); unico codigo de solape, sin
    // CONGELACION_SOLAPADA (ajuste #3, abierto #11 resuelto)
    "MEMBRESIA_SOLAPADA",
    // MEMBRESIA_CONFLICTO -> version desactualizada / carrera perdida
    // (lock optimista INC00-MEM-03, primer 409 del orden del contrato)
    "MEMBRESIA_CONFLICTO",
    // CONGELACION_INEXISTENTE -> ampliacion DEC-024 (HU15-C07/HU15-C08): no hay
    // congelacion vigente que operar (nunca se congelo, ya fue descongelada, o
    // hoy > congelacionFin). 409 (no 404): la vigencia existe y supero el
    // ownership; falta un estado del recurso. Mensaje unico:
    // "No hay una congelación vigente en esta membresía"
    "CONGELACION_INEXISTENTE",
  ]),
});

// Tipos inferidos
export type TipoServicio = z.infer<typeof tipoServicioSchema>;
export type EstadoVigencia = z.infer<typeof estadoVigenciaSchema>;
export type CongelarParams = z.infer<typeof congelarParamsSchema>;
export type CreateCongelacion = z.infer<typeof createCongelacionSchema>;
export type Congelacion = z.infer<typeof congelacionSchema>;
export type Cambio = z.infer<typeof cambioSchema>;
export type CongelacionResponse = z.infer<typeof congelacionResponseSchema>;
export type CongelacionError = z.infer<typeof congelacionErrorSchema>;

// Ampliación DEC-024 (descongelar / editar congelación; 0 puntos HU-15)
export type DescongelarParams = z.infer<typeof descongelarParamsSchema>;
export type EditarCongelarParams = z.infer<typeof editarCongelarParamsSchema>;
export type Descongelar = z.infer<typeof descongelarSchema>;
export type UpdateCongelacion = z.infer<typeof updateCongelacionSchema>;
export type DescongelarResponse = z.infer<typeof descongelarResponseSchema>;
export type EditarCongelacionResponse = z.infer<
  typeof editarCongelacionResponseSchema
>;
