import { z } from "zod";

/**
 * Schemas de validación de HU-16 (Cambio de estado por vencimiento).
 *
 * Generados por `acceptance-criteria-analyst` (Modo CREAR, 2026-10-08) como
 * prerequisito G14. Borrador de contrato para INC-03: las superficies portal,
 * recepcion y el bloqueo de acceso (HU16-C04, BLOQUEADO por decision de
 * Producto) se fijan en la puerta LISTO del incremento.
 *
 * Autocontenido: solo depende de `zod`.
 */

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** Fecha real de calendario en formato YYYY-MM-DD (DEC-005). */
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

const fecha = z.string().refine(isValidDate, {
  message: "Debe ser una fecha válida (YYYY-MM-DD)",
});

/** DEC-004: servicios separados. */
export const tipoServicioSchema = z.enum(["GYM", "PERSONALIZADO", "NUTRICION"]);

/**
 * Estados de una vigencia. `CONGELADO` lo introduce HU-15 y prevalece sobre
 * `VENCIDA` cuando el rango congelado cubre hoy (precedencia de HU-15).
 */
export const estadoVigenciaSchema = z.enum([
  "PROGRAMADA",
  "ACTIVA",
  "VENCIDA",
  "CONGELADO",
]);

/**
 * Vigencia con su estado calculado en cada lectura (sin flag persistido):
 * `GET /api/clientes/:clienteId/membresias-gym` y `GET /api/clientes/:id`.
 */
export const vigenciaConEstadoSchema = z.object({
  id: z.string().min(1),
  clienteId: z.string().min(1).optional(),
  tipoServicio: tipoServicioSchema.optional(),
  fechaInicio: fecha,
  fechaFin: fecha,
  estado: estadoVigenciaSchema,
  version: z.number().int().min(1).optional(),
});

/** Seccion de membresias que hoy expone la ficha (`cliente.service.ts`). */
export const fichaMembresiaSchema = z.object({
  id: z.string().min(1),
  fechaInicio: fecha,
  fechaFin: fecha,
  estado: estadoVigenciaSchema,
});

/** Respuesta del listado de membresias (`membresia.service.ts`). */
export const listadoMembresiasResponseSchema = z.object({
  membresias: z.array(vigenciaConEstadoSchema),
  /** `getTodayBogota()`: la referencia de "hoy" usada por el calculo. */
  fechaActual: fecha,
});

/**
 * Contrato previsto para el portal del cliente (HU16-C03): el estado debe ser
 * real, nunca texto fijo (gap: `portal/page.tsx:122` hardcodea "Activo").
 */
export const portalEstadoSchema = z.object({
  cliente: z.object({
    cedula: z.string().min(1),
    nombres: z.string().min(1),
    apellidos: z.string().min(1),
  }),
  fechaActual: fecha,
  servicios: z.array(
    z.object({
      tipoServicio: tipoServicioSchema,
      fechaInicio: fecha,
      fechaFin: fecha,
      estado: estadoVigenciaSchema,
      accesoPermitido: z.boolean(),
    })
  ),
  /** Acceso al portal del cliente (depende de la decision P1/P2 de HU16-C04). */
  accesoConcedido: z.boolean(),
});

/**
 * Contrato previsto para recepcion (HU16-C03 / HU-29): al consultar por cedula,
 * recepcion debe ver el estado real por servicio y si el cliente puede ingresar
 * (ingreso en si es alcance de HU-30).
 */
export const recepcionEstadoClienteSchema = z.object({
  cliente: z.object({
    id: z.string().min(1),
    cedula: z.string().min(1),
    nombres: z.string().min(1),
    apellidos: z.string().min(1),
    estado: z.string().min(1),
  }),
  fechaActual: fecha,
  servicios: z.array(
    z.object({
      tipoServicio: tipoServicioSchema,
      fechaInicio: fecha,
      fechaFin: fecha,
      estado: estadoVigenciaSchema,
    })
  ),
  /** Solo `true` si al menos un servicio esta vigente (DEC-004, ver P2). */
  puedeIngresar: z.boolean(),
});

/**
 * Respuesta de denegacion de acceso por vencimiento (HU16-C04).
 *
 * BLOQUEADO: el codigo y el punto de aplicacion (login / portal / ingreso en
 * recepcion) dependen de la decision P1/P2 de `HU-16-criterios-aceptacion.md`.
 * El enum se mantiene intencionalmente corto: si Producto elige otra opcion, el
 * codigo se fija en el spec de INC-03 y se actualiza este schema.
 */
export const accesoVencimientoDenegadoSchema = z.object({
  error: z.string().min(1),
  code: z.enum(["VIGENCIA_VENCIDA"]),
  /** Fecha de vencimiento que se informa al cliente. */
  fechaVencimiento: fecha.optional(),
});

/** Cuerpo de error estandar de la API (convencion de `src/routes/*.ts`). */
export const vigenciaErrorSchema = z.object({
  error: z.string(),
  code: z.enum([
    "VALIDATION_ERROR",
    "NOT_FOUND",
    "AUTH_TOKEN_MISSING",
    "AUTH_TOKEN_INVALID",
    "AUTH_TOKEN_EXPIRED",
    "AUTH_FORBIDDEN",
    "AUTH_INVALID_CREDENTIALS",
    "VIGENCIA_VENCIDA",
  ]),
});

// Tipos inferidos
export type TipoServicio = z.infer<typeof tipoServicioSchema>;
export type EstadoVigencia = z.infer<typeof estadoVigenciaSchema>;
export type VigenciaConEstado = z.infer<typeof vigenciaConEstadoSchema>;
export type FichaMembresia = z.infer<typeof fichaMembresiaSchema>;
export type ListadoMembresiasResponse = z.infer<
  typeof listadoMembresiasResponseSchema
>;
export type PortalEstado = z.infer<typeof portalEstadoSchema>;
export type RecepcionEstadoCliente = z.infer<
  typeof recepcionEstadoClienteSchema
>;
export type AccesoVencimientoDenegado = z.infer<
  typeof accesoVencimientoDenegadoSchema
>;
export type VigenciaError = z.infer<typeof vigenciaErrorSchema>;
