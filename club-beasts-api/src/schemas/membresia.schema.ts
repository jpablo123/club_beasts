import { z } from "zod";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Valida que la cadena sea una fecha real de calendario en formato YYYY-MM-DD.
 * Vacio ("") y cualquier otro formato invalido devuelven false (INC00-MEM-07).
 */
export function isValidDate(dateStr: string): boolean {
  if (!dateRegex.test(dateStr)) return false;
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/**
 * Campo de fecha obligatorio: rechaza el valor vacio (min 1) y cualquier
 * fecha que no exista en el calendario. Es la fuente unica de verdad de
 * "ninguna membresia con fechas vacias" (INC00-MEM-07).
 */
function fechaRequerida(mensajeVacia: string, mensajeInvalida: string) {
  return z
    .string({ required_error: mensajeVacia })
    .min(1, mensajeVacia)
    .refine(isValidDate, { message: mensajeInvalida });
}

export const createMembresiaSchema = z
  .object({
    fechaInicio: fechaRequerida(
      "Fecha de inicio es requerida",
      "Fecha de inicio debe ser una fecha válida (YYYY-MM-DD)"
    ),
    fechaFin: fechaRequerida(
      "Fecha fin es requerida",
      "Fecha fin debe ser una fecha válida (YYYY-MM-DD)"
    ),
  })
  .refine((data) => data.fechaInicio <= data.fechaFin, {
    message: "Fecha fin no puede ser anterior a fecha de inicio",
    path: ["fechaFin"],
  });

export const updateMembresiaSchema = z
  .object({
    // Las fechas son opcionales en PATCH, pero si vienen no pueden ser vacias
    // ni invalidas: ".optional()" solo omite la validacion cuando el campo
    // ausente, nunca cuando llega "" (INC00-MEM-07).
    fechaInicio: fechaRequerida(
      "Fecha de inicio es requerida",
      "Fecha de inicio debe ser una fecha válida (YYYY-MM-DD)"
    ).optional(),
    fechaFin: fechaRequerida(
      "Fecha fin es requerida",
      "Fecha fin debe ser una fecha válida (YYYY-MM-DD)"
    ).optional(),
    version: z
      .number({ required_error: "Versión es requerida" })
      .int("Versión debe ser un entero")
      .positive("Versión debe ser positiva"),
  })
  .refine(
    (data) => {
      if (!data.fechaInicio || !data.fechaFin) return true;
      return data.fechaInicio <= data.fechaFin;
    },
    {
      message: "Fecha fin no puede ser anterior a fecha de inicio",
      path: ["fechaFin"],
    }
  );

export const membresiaParamsSchema = z.object({
  clienteId: z
    .string({ required_error: "clienteId es requerido" })
    .min(1, "clienteId es requerido"),
  membresiaId: z
    .string({ required_error: "membresiaId es requerido" })
    .min(1, "membresiaId es requerido")
    .optional(),
});

/**
 * Params de las rutas de pausa (INC-02, HU-15):
 * `/clientes/:clienteId/vigencias/:vigenciaId/{congelar|descongelar}` y
 * `/clientes/:clienteId/vigencias/:vigenciaId/congelacion`.
 *
 * `vigenciaId` es el mismo `id` de `MembresiaGym` (el recurso `vigencias` es
 * neutral respecto al tipo de servicio, ver spec INC-02 "Endpoint").
 */
export const vigenciaParamsSchema = z.object({
  clienteId: z
    .string({ required_error: "clienteId es requerido" })
    .min(1, "clienteId es requerido"),
  vigenciaId: z
    .string({ required_error: "vigenciaId es requerido" })
    .min(1, "vigenciaId es requerido"),
});

/**
 * Regla post-Zod de las operaciones de pausa que traen fechas (DEC-022 b):
 * `fechaFin` de la congelacion debe ser hoy o futura en `America/Bogota`.
 * No puede vivir en el schema porque `hoy` es dinamica (`getTodayBogota()`).
 */
export const MENSAJE_FECHA_FIN_NO_ANTERIOR_A_HOY =
  "Fecha fin no puede ser anterior a hoy";

/**
 * Body de `POST .../congelar` (HU-15 bullet 2 + contrato INC-02): los 4 campos
 * requeridos. El cliente **no** envia la nueva `fechaFin` de la vigencia: la
 * calcula el servidor (HU-15 bullet 4).
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
 * Body de `POST .../descongelar` (ampliacion DEC-024): `version` por lock
 * optimista (INC00-MEM-03) y `motivo` **opcional** (DEC-024 no lo exige; si
 * viaja aplica la misma regla 1-500 sin vacio tras trim). Sin fechas en el
 * body: `hoy` y los dias a devolver los calcula el servidor.
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
 * Body de `PATCH .../congelacion` (ampliacion DEC-024): misma forma, campos,
 * mensajes y regla post-Zod que congelar (una sola fuente de validacion del
 * "rango de pausa"). Los 4 campos requeridos: editar redeclara el rango y
 * escribe una fila nueva de auditoria (`EDICION_CONGELACION`).
 */
export const updateCongelacionSchema = createCongelacionSchema;

export type CreateMembresia = z.infer<typeof createMembresiaSchema>;
export type UpdateMembresia = z.infer<typeof updateMembresiaSchema>;
export type MembresiaParams = z.infer<typeof membresiaParamsSchema>;
export type VigenciaParams = z.infer<typeof vigenciaParamsSchema>;
export type CreateCongelacion = z.infer<typeof createCongelacionSchema>;
export type Descongelar = z.infer<typeof descongelarSchema>;
export type UpdateCongelacion = z.infer<typeof updateCongelacionSchema>;
