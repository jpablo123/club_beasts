import { z } from "zod";
import { anamnesisDatosSchema, type AnamnesisDatos } from "./HU-09-schemas";
import { estadoAnamnesisSchema } from "./HU-11-schemas";

/**
 * Contrato propuesto de validación — HU-10: Control de acceso a datos sensibles
 * de la anamnesis. Generado por acceptance-criteria-analyst (modo CREAR,
 * INC-09-anamnesis-deportiva).
 *
 * FUENTE: HU-10 (historias-usuario-gimnasio.md 4.3) + Anexo DEC-052 (2026-11-04).
 *
 * Permisos base (literal HU-10 + precedentes SEC-01/SEC-03):
 *   - DUENO: ve y edita la anamnesis completa (25 propiedades / 23 campos).
 *   - RECEPCIONISTA: NO ve los campos sensibles (ni en la respuesta de la API:
 *     defensa en profundidad, no solo UI) y NO edita (rec (a) de PEND-ANX-04).
 *   - CLIENTE: solo lectura de la SUYA (HU-28-schemas.ts); jamás la de otro
 *     cliente (GAP-001/SEC-01/SEC-03: consulta ajena -> 403/404).
 *
 * PARTICIÓN SENSIBLE/OPERATIVA — **DEC-055 (2026-11-04) RESUELVE PEND-ANX-01**
 * con la alternativa (b) ampliada:
 *   - SENSIBLE (solo DUENO): **5 campos** — 4 `rh` + 16 `antecedentesMedicos`,
 *     17 `antecedentesFamiliares`, 18a/18b `enfermedadRelevante`/`cualEnfermedad`.
 *     `rh` es dato de salud y pasa a SENSIBLE (DEC-055, opción (b) sobre la
 *     recomendación (a) del analista).
 *   - OPERATIVA (staff: DUENO + RECEPCIONISTA): los 20 restantes de las 25
 *     propiedades (**19/23 campos**), incluidos 14 `contactoEmergencia` y
 *     15 `eps` (datos vitales para emergencias).
 *   El mapa `CLASIFICACION_CAMPOS` materializa DEC-055 (5 SENSIBLE / 20
 *   OPERATIVA).
 *
 * ── ENMIENDA C4 (patrón C4) — INC-09-anamnesis-deportiva, ciclo RED 2026-11-04 ──
 * Contrato de enmienda: cambios documentados header + inline, nunca edición
 * silenciosa (ref. ratificación backend R1..R8 / DEC-055):
 *   (1) `CAMPOS_SENSIBLES`: 4 -> 5 (se agrega `rh`) — DEC-055.
 *   (2) `CLASIFICACION_CAMPOS.rh`: "OPERATIVA" -> "SENSIBLE" — DEC-055.
 *   (3) `anamnesisRecepcionSchema`: `.omit` de 4 -> 5 claves (incluye `rh`) —
 *       DEC-055 / INC09-R01 / INC09-R05. Conteo corregido: la vista de
 *       RECEPCIONISTA expone 20/25 propiedades (19/23 campos).
 * Ninguna otra cláusula de este archivo cambia.
 *
 * Trazabilidad expuesta a staff: `fechaActualizacion` + `actualizadoPorId`
 * (precedentes `ClienteEstadoCambio.actorId` / `pinResetPorId`, HU-09 bullet 4).
 *
 * Autónomo: solo depende de `zod` y de los schemas de campos de este directorio
 * (`./HU-09-schemas`, `./HU-11-schemas`) — fuente única de verdad de los campos.
 *
 * IMPORTANTE: contrato PROPUESTO — pendiente de ratificación por backend-developer
 * en el spec de INC-09 (no decide rutas HTTP ni Prisma).
 */

// ---------------------------------------------------------------------------
// Clasificación campo -> sensible | operativa (DEC-055: PEND-ANX-01 RESUELTA)
// ---------------------------------------------------------------------------

export type ClasificacionCampo = "SENSIBLE" | "OPERATIVA";

/**
 * ENMIENDA C4 (INC-09, 2026-11-04) — DEC-055: los **5** campos sensibles
 * (la recomendación (a) traía 4; DEC-055 amplía con `rh`, opción (b)).
 * Orden literal de DEC-055: `rh, antecedentesMedicos, antecedentesFamiliares,
 * enfermedadRelevante, cualEnfermedad`.
 */
export const CAMPOS_SENSIBLES = [
  "rh",
  "antecedentesMedicos",
  "antecedentesFamiliares",
  "enfermedadRelevante",
  "cualEnfermedad",
] as const;

export const CLASIFICACION_CAMPOS: Record<keyof AnamnesisDatos, ClasificacionCampo> = {
  // S1 — Identificación personal: operativa (salvo `rh`, SENSIBLE por DEC-055)
  nombreCompleto: "OPERATIVA",
  numeroDocumento: "OPERATIVA",
  sexo: "OPERATIVA",
  // ENMIENDA C4 (INC-09, 2026-11-04) — DEC-055: rh "OPERATIVA" -> "SENSIBLE".
  rh: "SENSIBLE",
  edad: "OPERATIVA",
  fechaNacimiento: "OPERATIVA",
  lugarNacimiento: "OPERATIVA",
  estadoCivil: "OPERATIVA",
  direccionResidencia: "OPERATIVA",
  numeroContacto: "OPERATIVA",
  correoElectronico: "OPERATIVA",
  // S2 — Deporte: operativa
  practicaDeporte: "OPERATIVA",
  cualDeporte: "OPERATIVA",
  tiempoQuePractica: "OPERATIVA",
  // S3 — Emergencia y salud: 14/15 operativos (emergencia), 16-18b SENSIBLES
  contactoEmergencia: "OPERATIVA",
  eps: "OPERATIVA",
  antecedentesMedicos: "SENSIBLE",
  antecedentesFamiliares: "SENSIBLE",
  enfermedadRelevante: "SENSIBLE",
  cualEnfermedad: "SENSIBLE",
  // S4 — Objetivos y estilo de vida: operativa
  objetivosEntrenamiento: "OPERATIVA",
  nivelActividad: "OPERATIVA",
  diasNoEntrenamiento: "OPERATIVA",
  horaAcostarse: "OPERATIVA",
  comidasPorDia: "OPERATIVA",
};

// ---------------------------------------------------------------------------
// Vistas de lectura por rol (la API FILTRA; no basta con ocultar en UI)
// ---------------------------------------------------------------------------

/** Metadatos de trazabilidad visibles a staff (HU-09 bullet 4). */
const metadatosStaffSchema = z.object({
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
 * RECEPCIONISTA: lectura SOLO operativa. ENMIENDA C4 (INC-09, 2026-11-04) —
 * DEC-055: quedan fuera del DTO (`.omit`) los **5** campos sensibles (`rh`,
 * `antecedentesMedicos`, `antecedentesFamiliares`, `enfermedadRelevante`,
 * `cualEnfermedad` — antes 4): ni valores ni claves viajan en la respuesta
 * (HU10-AN-15 / INC09-R05). Conteo: 20/25 propiedades (19/23 campos).
 */
export const anamnesisRecepcionSchema = anamnesisDatosSchema
  .omit({
    rh: true, // ENMIENDA C4 (INC-09) — DEC-055: agregado a la omisión.
    antecedentesMedicos: true,
    antecedentesFamiliares: true,
    enfermedadRelevante: true,
    cualEnfermedad: true,
  })
  .extend(metadatosStaffSchema.shape);

export type AnamnesisRecepcion = z.infer<typeof anamnesisRecepcionSchema>;

// ---------------------------------------------------------------------------
// Matriz de permisos (documento ejecutable de HU10-AN-13..AN-19)
// ---------------------------------------------------------------------------

export const ROLES_ANAMNESIS = ["DUENO", "RECEPCIONISTA", "CLIENTE"] as const;

export type RolAnamnesis = (typeof ROLES_ANAMNESIS)[number];

export interface PermisosAnamnesis {
  /** Ve la anamnesis completa (sensibles incluidos). */
  verCompleta: boolean;
  /** Ve solo la parte operativa (nunca sensibles). */
  verOperativa: boolean;
  /** Puede crear/editar la anamnesis. */
  editar: boolean;
  /** Solo puede consultar la anamnesis asociada a su propia identidad. */
  soloPropia: boolean;
}

/**
 * Recomendación (a) de PEND-ANX-04 (quién diligencia/edita): solo DUENO edita
 * (literal "Como dueno" de HU-09/HU-11 y coherencia con la sensibilidad médica:
 * RECEPCIONISTA no puede diligenciar campos que no puede ver).
 */
export const PERMISOS_ANAMNESIS: Record<RolAnamnesis, PermisosAnamnesis> = {
  DUENO: { verCompleta: true, verOperativa: true, editar: true, soloPropia: false },
  RECEPCIONISTA: {
    verCompleta: false,
    verOperativa: true,
    editar: false,
    soloPropia: false,
  },
  CLIENTE: { verCompleta: true, verOperativa: true, editar: false, soloPropia: true },
};
