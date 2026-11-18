import { FastifyInstance } from "fastify";
import {
  actualizarRutinaBaseSchema,
  actualizarRutinaPersonalizadaSchema,
  crearRutinaBaseSchema,
  listarRutinasQuerySchema,
  mensajePrimerErrorZod,
  rutinaIdParamsSchema,
  MENSAJES_ASIGNACION,
} from "../schemas/rutina.schema.js";
import {
  actualizarRutina,
  aDatosRutina,
  crearRutinaBase,
  listarRutinas,
  obtenerFilaRutina,
  responderError,
} from "../services/rutina.service.js";

/**
 * INC-10 (HU-18/19) — rutas de rutinas base (endpoints 1a/2/3/4 del contrato
 * API RATIFICADO, spec INC-10; rutas SIN prefijo /api).
 *
 *  - `POST /rutinas` (solo DUENO, DEC-065): 201 `rutinaBaseDatosSchema`;
 *    400 `{ error: <primer error zod>, code: "VALIDATION_ERROR" }` (`.strict()`).
 *  - `GET /rutinas?tipo=&nombre=` (DUENO/RECEPCIONISTA): 200
 *    `{ rutinas: resumen[], total }`; `tipo` exacto (400 con el mensaje del
 *    campo canonico si sale del enum), `nombre` subcadena insensible; AND.
 *  - `GET /rutinas/:rutinaId` (DUENO/RECEPCIONISTA): 200 detalle por TIPO
 *    PERSISTIDO (+ `actualizadoPor`); 404 `RUTINA_NO_ENCONTRADA`.
 *  - `PATCH /rutinas/:rutinaId` (solo DUENO): 200 merge por secciones
 *    (presente = reemplaza; ausente = conserva; R3/C3a); `tipoRutina`
 *    inmutable (400 strict). Orden: 401 -> 403 -> 400 params -> 404 ->
 *    400 body (el body se valida con el contrato del tipo persistido).
 *  - SIN DELETE en MVP (patron Anamnesis/DEC-057).
 *
 * bodyLimit (R1#3): el arbol C4 maximo (20x20x20x30x30x30) supera con creces
 * el 1MiB por defecto de Fastify; estas rutas de escritura se elevan a 5MiB
 * SOLO aqui (documentado en el reporte de INC-10; el resto del API conserva
 * el default). El teorico C4 sigue siendo superior — riesgo residual
 * INC10-R05 registrado.
 *
 * El rol sale SIEMPRE del token; `plugins/auth.ts` y el PIN obligatorio
 * quedan intactos (solo se consume `authenticateRoles`).
 */

/** R1#3: bodyLimit elevado SOLO en las rutas de escritura de rutinas. */
export const BODY_LIMIT_RUTINAS = 5 * 1024 * 1024;

export default async function rutinasRoutes(fastify: FastifyInstance) {
  // ── POST /rutinas — creacion base (solo DUENO) ────────────────────────────
  fastify.post(
    "/rutinas",
    {
      bodyLimit: BODY_LIMIT_RUTINAS,
      preHandler: [fastify.authenticateRoles(["DUENO"])],
    },
    async (request, reply) => {
      const bodyResult = crearRutinaBaseSchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply.status(400).send({
          error: mensajePrimerErrorZod(bodyResult),
          code: "VALIDATION_ERROR",
        });
      }
      const actorId = (request.user as { id: string }).id;
      try {
        const datos = await crearRutinaBase(bodyResult.data, actorId);
        return reply.status(201).send(datos);
      } catch (error) {
        return responderError(error, reply);
      }
    }
  );

  // ── GET /rutinas — listado con filtros (DUENO/RECEPCIONISTA) ──────────────
  fastify.get(
    "/rutinas",
    { preHandler: [fastify.authenticateRoles(["DUENO", "RECEPCIONISTA"])] },
    async (request, reply) => {
      const queryResult = listarRutinasQuerySchema.safeParse(request.query);
      if (!queryResult.success) {
        return reply.status(400).send({
          error: mensajePrimerErrorZod(queryResult),
          code: "VALIDATION_ERROR",
        });
      }
      const resultado = await listarRutinas(queryResult.data);
      return reply.status(200).send(resultado);
    }
  );

  // ── GET /rutinas/:rutinaId — detalle por tipo persistido ──────────────────
  fastify.get(
    "/rutinas/:rutinaId",
    { preHandler: [fastify.authenticateRoles(["DUENO", "RECEPCIONISTA"])] },
    async (request, reply) => {
      const paramsResult = rutinaIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          error: mensajePrimerErrorZod(paramsResult),
          code: "VALIDATION_ERROR",
        });
      }
      const fila = await obtenerFilaRutina(paramsResult.data.rutinaId);
      if (!fila) {
        return reply.status(404).send({
          error: MENSAJES_ASIGNACION.RUTINA_NO_ENCONTRADA,
          code: "RUTINA_NO_ENCONTRADA",
        });
      }
      return reply.status(200).send(aDatosRutina(fila));
    }
  );

  // ── PATCH /rutinas/:rutinaId — merge por secciones (solo DUENO) ───────────
  fastify.patch(
    "/rutinas/:rutinaId",
    {
      bodyLimit: BODY_LIMIT_RUTINAS,
      preHandler: [fastify.authenticateRoles(["DUENO"])],
    },
    async (request, reply) => {
      const paramsResult = rutinaIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          error: mensajePrimerErrorZod(paramsResult),
          code: "VALIDATION_ERROR",
        });
      }

      // 404 ANTES del body: el contrato de update depende del tipo persistido.
      const fila = await obtenerFilaRutina(paramsResult.data.rutinaId);
      if (!fila) {
        return reply.status(404).send({
          error: MENSAJES_ASIGNACION.RUTINA_NO_ENCONTRADA,
          code: "RUTINA_NO_ENCONTRADA",
        });
      }

      // `tipoRutina` no esta en el contrato de update -> strict 400 (inmutable).
      const schemaActualizacion =
        fila.tipoRutina === "PERSONALIZADA"
          ? actualizarRutinaPersonalizadaSchema
          : actualizarRutinaBaseSchema;
      const bodyResult = schemaActualizacion.safeParse(request.body);
      if (!bodyResult.success) {
        return reply.status(400).send({
          error: mensajePrimerErrorZod(bodyResult),
          code: "VALIDATION_ERROR",
        });
      }

      const clavesPresentes = new Set(Object.keys(request.body ?? {}));
      const actorId = (request.user as { id: string }).id;
      try {
        const datos = await actualizarRutina(
          fila,
          bodyResult.data as Record<string, unknown>,
          clavesPresentes,
          actorId
        );
        return reply.status(200).send(datos);
      } catch (error) {
        return responderError(error, reply);
      }
    }
  );
}

