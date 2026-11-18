import { z } from "zod";
import {
  enumConMensaje,
  nombreRutinaBase,
  opcionalTexto,
  sesionSchema,
  textoLargoBase,
  NIVEL_EXPERIENCIA,
} from "./HU-19-schemas";

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
 *   fuente única), pero sin macro-meso-micro. Alternativas en
 *   `HU-18-criterios-aceptacion.md`.
 * - HU-18 c3 "reutilizable con varios clientes": la rutina NO se consume al
 *   asignarse; N clientes pueden tenerla activa (misma `rutinaId`). La
 *   unicidad es por cliente (1 activa/cliente, HU-20 c1).
 * - HU-18 c4 "activada para un cliente": la activación es la ASIGNACIÓN de
 *   HU-20 (sin doble cobro DEC-016; criterio RU-05 REF).
 * - Permisos: PEND-RUT-04 (rec (a) solo DUENO — supuesto §2 "la recepción ...
 *   no gestiona rutinas"); ver matriz en HU-18-criterios-aceptacion.md.
 *
 * Autónomo: solo `zod` + los módulos hermanos del bloque (`HU-19-schemas`).
 * IMPORTANTE: contrato PROPUESTO — pendiente de ratificación por
 * backend-developer en el spec de INC-10.
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
