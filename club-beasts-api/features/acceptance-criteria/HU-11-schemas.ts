import { z } from "zod";
import {
  anamnesisCamposSchema,
  anamnesisConsistenteSchema,
  cumpleCompletitud,
  registrarAnamnesisSchema,
  type AnamnesisCampos,
} from "./HU-09-schemas";

/**
 * Contrato propuesto de validación — HU-11: Guardado progresivo de anamnesis.
 * Generado por acceptance-criteria-analyst (modo CREAR, INC-09-anamnesis-deportiva).
 *
 * FUENTE: HU-11 (historias-usuario-gimnasio.md 4.3) + Anexo DEC-052 (2026-11-04).
 *
 * RECONCILIACIÓN HU-11 vs obligatorios (*) — regla propuesta por Producto:
 *   - Guardar incompleto ESTÁ PERMITIDO: las ausencias nunca producen 400;
 *     marcan la anamnesis como PENDIENTE (HU-11 bullets 1-2).
 *   - Los `*` del Anexo definen "anamnesis completa" (estado COMPLETA), NO un
 *     impedimento de guardado (HU-11 bullet 3: retomar y completar después).
 *   - "Guardar incompleto" NO significa "aceptar inválido": todo campo
 *     PRESENTE se valida igual que en el registro completo (formato, enums,
 *     límites y contradicciones SI/NO -> 400 con mensaje específico).
 *
 * Contradicciones SI/NO (rechazadas siempre, incluso en guardado parcial):
 *   - `cualDeporte` solo aplica si `practicaDeporte` = "SI".
 *   - `cualEnfermedad` solo aplica si `enfermedadRelevante` = "SI".
 *   - Ausencia del condicional aplicable = incompletitud (PENDIENTE), no error.
 *
 * Estado DERIVADO en cada guardado (no seleccionable a mano):
 *   - COMPLETA: 0 obligatorios/condicionales aplicables faltantes.
 *   - PENDIENTE: falta >= 1.
 *   - Degradación permitida: COMPLETA -> PENDIENTE si una edición borra un
 *     obligatorio (rec (a) de HU11-AN-25; no bloquea el guardado).
 *
 * Consumidores: HU-10-schemas.ts y HU-28-schemas.ts importan `estadoAnamnesisSchema`.
 * Autónomo: solo depende de `zod` y de `./HU-09-schemas` (fuente única de campos;
 * patrón de import relativo de tests/integration/*.test.ts hacia este directorio).
 *
 * IMPORTANTE: contrato PROPUESTO — pendiente de ratificación por backend-developer
 * en el spec de INC-09 (no decide rutas HTTP ni Prisma).
 */

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
 * Guardado PROGRESIVO (HU-11): cualquier subconjunto de campos VÁLIDOS.
 * - Ausencias permitidas (null / "" / omitido = sin diligenciar).
 * - Al menos 1 campo diligenciado (HU11-AN-26): un registro sin contenido no
 *   tiene nada que preservar -> 400 "La anamnesis debe tener al menos un campo diligenciado".
 * - Contradicciones SI/NO rechazadas (hereda `anamnesisConsistenteSchema`).
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
 * Marca derivada del estado (HU-11 bullets 1-2, HU11-AN-22). Se recalcula en
 * CADA guardado/edición; el usuario no la elige.
 */
export function derivarEstadoAnamnesis(data: AnamnesisCampos): EstadoAnamnesis {
  return cumpleCompletitud(data) ? "COMPLETA" : "PENDIENTE";
}

/**
 * Compleción de una anamnesis retomada (HU-11 bullet 3): es el mismo contrato
 * de registro completo de HU-09 — con todos los obligatorios y condicionales
 * aplicables diligenciados el estado pasa a COMPLETA.
 */
export const completarAnamnesisSchema = registrarAnamnesisSchema;

export { anamnesisCamposSchema, type AnamnesisCampos };
