import { z } from "zod";
import {
  cedulaSchema,
  emailSchema,
  namesSchemaFor,
  telefonoSchema,
} from "./common.schema.js";

/**
 * INC-03 (HU-29 / HU-30 / HU-31) — schemas de validacion de las rutas de
 * recepcion. Mismos criterios que los contratos G14
 * (`features/acceptance-criteria/HU-{29,30,31}-schemas.ts`), sin importar
 * desde `features/`.
 */

/** Cedula en query/body: distingue el mensaje de "requerida" del de regex. */
const cedulaRequeridaSchema = z
  .string({ required_error: "Cédula es requerida" })
  .min(1, "Cédula es requerida")
  .regex(/^\d{6,10}$/, "Cédula debe ser numérica de 6 a 10 dígitos");

const sedeIdRequeridoSchema = z
  .string({ required_error: "sedeId es requerido" })
  .min(1, "sedeId es requerido")
  .max(36, "sedeId excede longitud máxima");

// GET /recepcion/consulta?cedula=<cedula>
export const consultaQuerySchema = z.object({
  cedula: cedulaRequeridaSchema,
});

// POST /recepcion/ingresos
export const crearIngresoSchema = z.object({
  cedula: cedulaRequeridaSchema,
  sedeId: sedeIdRequeridoSchema,
});

// GET /recepcion/ingresos?cedula=<cedula>[&fecha=YYYY-MM-DD]
export const listarIngresosQuerySchema = z.object({
  cedula: cedulaRequeridaSchema,
  fecha: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha debe tener formato YYYY-MM-DD")
    .optional(),
});

/**
 * POST /recepcion/clientes-rapidos (DEC-031): `sedeId` OPCIONAL — cuando no
 * viaja, la sede default se deriva del usuario del token en la ruta.
 */
export const crearClienteRapidoSchema = z.object({
  cedula: cedulaSchema,
  nombres: namesSchemaFor("Nombres"),
  apellidos: namesSchemaFor("Apellidos"),
  telefono: telefonoSchema,
  sedeId: z.string().max(36, "sedeId excede longitud máxima").optional(),
  email: emailSchema,
  observaciones: z
    .string()
    .max(500, "Observaciones no pueden exceder 500 caracteres")
    .optional()
    .or(z.literal("")),
});

/**
 * Mensaje deterministico del 400 de validacion de las rutas de recepcion.
 *
 * `?cedula=` (string vacio) produce DOS issues de Zod para el mismo campo
 * (`too_small` + `invalid_string`) y `errors[0]` devolveria "Cédula es
 * requerida" en lugar del mensaje de regex que exige el contrato (#4/#7): se
 * prioriza el issue `invalid_string` del path `cedula`.
 */
export function mensajeErrorValidacion(error: z.ZodError): string {
  const issueCedula = error.errors.find(
    (issue) => issue.path.includes("cedula") && issue.code === "invalid_string"
  );
  if (issueCedula) return "Cédula debe ser numérica de 6 a 10 dígitos";
  return error.errors[0].message;
}
