import { z } from "zod";

/**
 * HU-17 — Gestión de estados generales del cliente (contrato G14).
 *
 * Resuelve la **incompatibilidad #1** del spec de INC-04
 * (`docs/incrementos/INC-04-estados-cliente/spec.md`): contrato importable
 * para el RED de INC-04 (criterios `INC04-EST-02..06` e `INC04-CLI-03/04/08`).
 * Historial: borrador G14 previo al INC-04 (2026-10-08) -> versión ratificada
 * con las decisiones ya resueltas (2026-10-14).
 *
 * Fuente de verdad: `HU-17-criterios-aceptacion.md` + `HU-08-criterios-aceptacion.md`
 * (ambos G14) y `docs/producto/decisiones.md`:
 *   - DEC-034: cliente INACTIVO -> 401 `AUTH_CLIENTE_INACTIVO` tras validar PIN.
 *   - DEC-035: `motivo` OBLIGATORIO (3-200) en todo PATCH que traiga `estado`.
 *   - DEC-036: historial en el modelo nuevo `ClienteEstadoCambio` (patrón
 *     `MembresiaGymCambio`).
 *   - DEC-037: `DUENO` y `RECEPCIONISTA` cambian estados (preHandler de la ruta).
 *   - DEC-038: matriz de transiciones; `RETIRADO` terminal; fuera de matriz -> 409.
 *   - DEC-041: el `motivo` se expone **solo a staff** (nunca al rol CLIENTE).
 *   - CONF-03 (orden de validación del PATCH), CONF-04 (3 mensajes exactos de
 *     `motivo`; fuente `HU-08-schemas.ts:28-31`), CONF-05 (historial observable
 *     vía `ultimoCambio` + lectura directa en BD; sin endpoint nuevo),
 *     CONF-07 (`motivo` sin `estado` se ignora).
 *
 * Uso: los tests (Vitest / steps Gherkin) importan estos exports directamente
 * (precedente `tests/integration/membresia-congelacion.test.ts:44`). `src/` NO
 * puede importar G14 (`rootDir: "./src"`): en `src/schemas/` se declara el
 * equivalente. Solo depende de `zod` (patrón HU-04/HU-08-schemas.ts).
 *
 * Compatibilidad con HU-08: `motivoCambioEstadoSchema`,
 * `cambioEstadoClienteSchema`, `updateClienteConMotivoSchema`,
 * `clienteEstadoCambioSchema`, `respuestaCambioEstadoSchema` y
 * `loginClienteInactivoResponseSchema` replican el contrato de
 * `HU-08-schemas.ts` (CLI-03/04/08 y EST-02/03 comparten PATCH y login).
 * Exclusivos de HU-17: la matriz de transiciones (EST-05), la ficha con
 * `motivo` (DEC-041, endpoint #2) y `transicionErrorSchema`.
 */

/** Espejo de `src/schemas/common.schema.ts:48` (enum de estados del cliente). */
export const clienteEstadoEnum = z.enum([
  "NUEVO",
  "ACTIVO",
  "SUSPENDIDO",
  "RETIRADO",
  "INACTIVO",
]);

export type ClienteEstado = z.infer<typeof clienteEstadoEnum>;

/**
 * Motivo del cambio de estado (HU17-C02a/C02b, HU08-C03; DEC-035).
 * Límites 3..200 (CONF-04) con los 3 mensajes exactos del contrato:
 *   - campo ausente (undefined) -> "Motivo es requerido cuando cambia el estado"
 *   - 1..2 caracteres           -> "Motivo debe tener al menos 3 caracteres"
 *   - 201+ caracteres           -> "Motivo no puede exceder 200 caracteres"
 * Réplica exacta de `HU-08-schemas.ts:28-31` (fuente citada por CONF-04).
 *
 * Nota (materialización Gherkin): el Example vacío del borrador de los
 * criterios (`| | Motivo es requerido...`) se cumle **omitiento el campo**
 * en el body; una cadena `""` enviada literalmente cae en `min(3)`
 * ("...al menos 3 caracteres"). Si Producto quiere que `""` emita el mensaje
 * de "requerido", hay que enmendar juntos `HU-08-schemas.ts`, este archivo y
 * el backend (cambio de contrato coordinado, patrón DEC-035).
 */
export const motivoCambioEstadoSchema = z
  .string({ required_error: "Motivo es requerido cuando cambia el estado" })
  .min(3, "Motivo debe tener al menos 3 caracteres")
  .max(200, "Motivo no puede exceder 200 caracteres");

/**
 * Body mínimo para un cambio de estado (HU17-C02a, HU08-C01/C03):
 * `estado` y `motivo` van juntos siempre (DEC-035).
 */
export const cambioEstadoClienteSchema = z.object({
  estado: clienteEstadoEnum,
  motivo: motivoCambioEstadoSchema,
});

/**
 * PATCH /clientes/:id (edición de datos + cambio de estado) — HU17-C02,
 * HU08-C03, criterios INC04-CLI-03 / EST-03.
 *
 * DEC-035 (opción (a), aprobada 2026-10-14): si el body trae `estado`,
 * `motivo` es **obligatorio** (lectura literal de HU-17 b2). El
 * `.superRefine` se evalúa en el 400 de body; los tests aceptados de
 * HU-05/Gherkin/UI que cambiaban estado sin motivo se **actualizan** como
 * cambio de contrato documentado (RED antes que GREEN; ningún test se
 * elimina — DEC-035 / riesgo INC04-R01).
 *
 * - CONF-07: `{ motivo }` sin `estado` NO dispara el refine (no se persiste,
 *   no se registra, sin error nuevo); el servicio lo ignora.
 * - CONF-02 / EST-05: el no-op (estado = actual) se prueba CON motivo
 *   presente: el schema no conoce el estado vigente, el servicio decide el
 *   no-op y no escribe registro de historial.
 * - CONF-03 (orden del endpoint #1): 401/403 (preHandler) -> 400 (params id)
 *   -> 400 (body: campos, enum, motivo) -> 404 -> 409 TRANSICION_INVALIDA
 *   -> 400 (sedeId) / 409 (DUPLICATE) -> 200. Sin escritura en 400/404/409.
 * - Roles: `DUENO`/`RECEPCIONISTA` vía preHandler (DEC-037); el schema no
 *   evalúa permisos.
 */
export const updateClienteConMotivoSchema = z
  .object({
    nombres: z
      .string()
      .max(100, "Nombres no pueden exceder 100 caracteres")
      .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, "Nombres solo pueden contener letras y espacios")
      .optional(),
    apellidos: z
      .string()
      .max(100, "Apellidos no pueden exceder 100 caracteres")
      .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, "Apellidos solo pueden contener letras y espacios")
      .optional(),
    telefono: z
      .string()
      .regex(/^3\d{9}$/, "Teléfono debe ser móvil colombiano (3XXXXXXXXX)")
      .optional(),
    email: z
      .string()
      .max(254, "Email no puede exceder 254 caracteres")
      .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Email tiene formato inválido")
      .optional()
      .or(z.literal("")),
    sedeId: z.string().max(36, "sedeId excede longitud máxima").optional(),
    observaciones: z
      .string()
      .max(500, "Observaciones no pueden exceder 500 caracteres")
      .optional()
      .or(z.literal("")),
    estado: clienteEstadoEnum.optional(),
    motivo: motivoCambioEstadoSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.estado !== undefined && data.motivo === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["motivo"],
        message: "Motivo es requerido cuando cambia el estado",
      });
    }
  });

/**
 * Registro del historial de cambios de estado (HU17-C02a/C03, HU08-C02;
 * criterios INC04-CLI-02/03, EST-02/04).
 *
 * DEC-036 (opción (a), aprobada): modelo nuevo `ClienteEstadoCambio`
 * (patrón `MembresiaGymCambio`, `prisma/schema.prisma:92-118`):
 * `clienteId`, `estadoAnterior` (null solo si no hubo estado previo
 * conocido), `estadoNuevo`, `motivo` (3-200, requerido), actor y `createdAt`;
 * back-relations obligatorias en `Cliente` y `User`. El nombre exacto de la
 * columna de actor (`actorId` en el patrón / `creadoPorId` en DEC-036) lo
 * fija database-admin en la migración.
 *
 * `id` y `clienteId` son **opcionales** aquí: la respuesta del PATCH expone
 * el subconjunto fijado por los criterios
 * (`estadoAnterior, estadoNuevo, motivo, actor, createdAt`) — incompatibilidad
 * #2 del spec (Zod ignora campos extra y no exige los no fijados). Para la
 * lectura directa en BD (CONF-05) los steps pueden validar la fila con este
 * schema serializando `createdAt` a ISO.
 */
export const clienteEstadoCambioSchema = z.object({
  id: z.string().optional(),
  clienteId: z.string().optional(),
  estadoAnterior: clienteEstadoEnum.nullable(),
  estadoNuevo: clienteEstadoEnum,
  motivo: motivoCambioEstadoSchema,
  actor: z.object({ id: z.string(), nombre: z.string() }),
  createdAt: z.string(),
});

/**
 * Subconjunto de la respuesta de PATCH /clientes/:id (endpoint #1 del spec;
 * HU17-C02, HU08-C03). Incompatibilidad #2: el DTO real tiene ~15 campos que
 * la web consume; el schema valida el subconjunto fijado por los criterios y
 * Zod ignora los extras (la respuesta **nunca** quita campos).
 */
export const respuestaPatchClienteSchema = z.object({
  id: z.string(),
  cedula: z.string(),
  estado: clienteEstadoEnum,
  // Derivado del ultimo `ClienteEstadoCambio` (una sola fuente, DEC-036) o
  // null si el cliente nunca tuvo un cambio registrado.
  motivo: motivoCambioEstadoSchema.nullable(),
  actualizadoPorId: z.string().nullable(),
  updatedAt: z.string(),
  // Endpoint #1 / CONF-02: presente SOLO cuando hubo cambio de estado; en
  // no-op o ediciones sin `estado` queda ausente.
  ultimoCambio: clienteEstadoCambioSchema.optional(),
});

/**
 * Respuesta cuando el PATCH cambia el estado (HU17-C02a, HU08-C03;
 * criterios INC04-EST-02, CLI-03/08): `ultimoCambio` es **requerido**.
 */
export const respuestaCambioEstadoSchema = respuestaPatchClienteSchema.extend({
  ultimoCambio: clienteEstadoCambioSchema,
});

/**
 * Subconjunto de `GET /clientes/:id` (ficha; endpoint #2 del spec;
 * criterios INC04-CLI-02/03, EST-04).
 *
 * Aditivo sobre el DTO ficha actual (`selectFichaCliente`): agrega `motivo`
 * derivado del ultimo cambio de historial (una sola fuente, CONF-05 +
 * DEC-036); Zod ignora el resto (telefono, email, membresias,
 * estadoAccesoGym, perfilPendiente, ...).
 *
 * DEC-041: `motivo` se expone **solo a staff** (DUENO/RECEPCIONISTA); para el
 * rol CLIENTE (self-only) el campo no se expone (null/ausente) y
 * `/portal/resumen` (HU-25) tampoco lo incluye.
 *
 * Reemplaza al borrador `fichaConHistorialEstadosSchema`: la respuesta NO
 * trae un array de historial (CONF-05; la UI visible del historial es
 * HU-07/HU-32). El historial se observa vía `ultimoCambio` y con lectura
 * directa en BD desde steps/integración (precedente
 * `features/steps/inc03-fixtures.steps.ts`).
 */
export const fichaClienteResponseSchema = z.object({
  id: z.string(),
  cedula: z.string(),
  nombres: z.string(),
  apellidos: z.string(),
  estado: clienteEstadoEnum,
  sede: z.object({ id: z.string(), nombre: z.string() }),
  createdAt: z.string(),
  motivo: motivoCambioEstadoSchema.nullable(),
});

/**
 * 409 de transición no permitida (HU17-C04; criterio INC04-EST-05; DEC-038).
 * `code` desambigua el conflicto (distinto de `DUPLICATE`/`CLIENTE_INACTIVO`).
 * Mensaje **fijado en el spec de INC-04** (tabla de Errores, ratificado
 * 2026-10-14): "Transición de estado no permitida" — texto exacto de
 * `spec.md` y de `HU-17-criterios-aceptacion.md:67,111` (enmienda D1).
 */
export const transicionErrorSchema = z.object({
  error: z.literal("Transición de estado no permitida"),
  code: z.literal("TRANSICION_INVALIDA"),
});

/** Alias histórico del mismo contrato (nombre previo al INC-04). */
export const transicionInvalidaResponseSchema = transicionErrorSchema;

/**
 * 401 de login de cliente INACTIVO (HU08-C04a; criterios INC04-CLI-04/08;
 * DEC-034). Orden del endpoint #3: 400 (cedula/PIN) ->
 * 401 `AUTH_INVALID_CREDENTIALS` -> 401 `AUTH_CLIENTE_INACTIVO` (solo con PIN
 * correcto: anti-enumeracion) -> 200. Mensaje: "La cuenta está inactiva.
 * Contacte con recepción." Compartido con `HU-08-schemas.ts` (mismo contrato).
 */
export const loginClienteInactivoResponseSchema = z.object({
  error: z.string(),
  code: z.literal("AUTH_CLIENTE_INACTIVO"),
});

/** Cuerpo de error genérico del API (contrato existente `{ error, code }`). */
export const errorResponseSchema = z.object({
  error: z.string(),
  code: z.string(),
});

/**
 * Matriz de transiciones aprobadas (HU17-C04; criterio INC04-EST-05;
 * DEC-038, opción (b)):
 *   - NUEVO -> ACTIVO | SUSPENDIDO | RETIRADO | INACTIVO
 *   - ACTIVO <-> SUSPENDIDO
 *   - * -> RETIRADO | INACTIVO (excepto desde RETIRADO)
 *   - INACTIVO -> ACTIVO (DEC-020, reactivación)
 *   - RETIRADO es **terminal**: sin salidas (toda salida -> 409)
 *
 * Semántica al evaluar `desde -> hacia` (ver `clasificarTransicion`):
 *   - diagonal (`desde === hacia`) -> NO_OP: 200 sin registro de historial
 *     (CONF-02 / HU17-C04)
 *   - clave `true`                 -> PERMITIDA: 200 con registro A->B
 *   - clave ausente o `false`      -> INVALIDA: 409 TRANSICION_INVALIDA, sin
 *     escritura
 *
 * Celda sensible a ratificación (#11): INACTIVO -> RETIRADO = `true` por la
 * regla "* -> RETIRADO" de DEC-038; en la matriz del G14 esa celda figuraba
 * como P-04 ("propuesto: rechazar") y DEC-038 es exactamente la aprobación
 * que la resolvió. ACTIVO->NUEVO / SUSPENDIDO->NUEVO / INACTIVO->SUSPENDIDO
 * quedan fuera de la matriz -> 409; **NUEVO->NUEVO es diagonal -> no-op 200**
 * (CONF-02, `spec.md` matriz: misma fila/columna = no-op, nunca 409; enmienda
 * D2 del comentario, `clasificarTransicion` no cambia).
 */
export const transicionesAprobadas: Record<
  ClienteEstado,
  Partial<Record<ClienteEstado, boolean>>
> = {
  NUEVO: { ACTIVO: true, SUSPENDIDO: true, RETIRADO: true, INACTIVO: true },
  ACTIVO: { SUSPENDIDO: true, RETIRADO: true, INACTIVO: true },
  SUSPENDIDO: { ACTIVO: true, RETIRADO: true, INACTIVO: true },
  RETIRADO: {}, // terminal (DEC-038): no se reactiva ni se cambia
  INACTIVO: { ACTIVO: true, RETIRADO: true }, // DEC-020 + "* -> RETIRADO" (DEC-038)
};

/** Resultado de evaluar una transición contra la matriz de DEC-038. */
export type ResultadoTransicion = "NO_OP" | "PERMITIDA" | "INVALIDA";

/**
 * Ejecutable puro de la matriz de DEC-038 (referencia para service y tests;
 * `src/` re-implementa la regla porque no puede importar G14).
 */
export function clasificarTransicion(
  desde: ClienteEstado,
  hacia: ClienteEstado
): ResultadoTransicion {
  if (desde === hacia) return "NO_OP";
  return transicionesAprobadas[desde][hacia] ? "PERMITIDA" : "INVALIDA";
}

// Tipos inferidos
export type MotivoCambioEstado = z.infer<typeof motivoCambioEstadoSchema>;
export type CambioEstadoCliente = z.infer<typeof cambioEstadoClienteSchema>;
export type UpdateClienteConMotivo = z.infer<typeof updateClienteConMotivoSchema>;
export type ClienteEstadoCambio = z.infer<typeof clienteEstadoCambioSchema>;
export type RespuestaPatchCliente = z.infer<typeof respuestaPatchClienteSchema>;
export type RespuestaCambioEstado = z.infer<typeof respuestaCambioEstadoSchema>;
export type FichaClienteResponse = z.infer<typeof fichaClienteResponseSchema>;
export type TransicionError = z.infer<typeof transicionErrorSchema>;
export type TransicionInvalidaResponse = z.infer<
  typeof transicionInvalidaResponseSchema
>;
export type LoginClienteInactivoResponse = z.infer<
  typeof loginClienteInactivoResponseSchema
>;
