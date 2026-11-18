import { FastifyInstance } from "fastify";
import {
  asignacionParamsSchema,
  asignarRutinaBodySchema,
  mensajePrimerErrorZod,
} from "../schemas/rutina.schema.js";
import { responderError } from "../services/rutina.service.js";
import {
  asignarRutina,
  existeCliente,
  obtenerActiva,
  obtenerHistorial,
  obtenerPortalRutina,
} from "../services/asignacion.service.js";

/**
 * INC-10 (HU-20/21/26) — asignacion, historial, activa y portal (endpoints
 * 5/6/7/8 del contrato API RATIFICADO; rutas SIN prefijo /api).
 *
 *  - `POST /clientes/:clienteId/rutinas/asignacion` (solo DUENO, DEC-065):
 *    201 `rutinaAsignacionSchema` (actor + contenidoSnapshot). ORDEN DE
 *    ERRORES EXACTO (R8/DEC-070): 401 -> 403 -> 400 params -> 400 body ->
 *    404 `CLIENTE_NO_ENCONTRADO` -> 404 `RUTINA_NO_ENCONTRADA` -> 409
 *    `CLIENTE_INACTIVO` (DEC-069) -> 409 `SIN_VIGENCIA_PERSONALIZADA`
 *    (DEC-070; precede a RUTINA_YA_ACTIVA — edge fijado RU-28) -> 409
 *    `RUTINA_YA_ACTIVA` -> 409 `ASIGNACION_CONFLICTO` (concurrencia,
 *    arbitro `activaClave`) -> 201.
 *  - `GET /clientes/:clienteId/rutinas/historial` (DUENO/RECEPCIONISTA):
 *    200 `{ clienteId, asignaciones[] (actor + snapshot), total }`,
 *    `fechaInicio` DESC. INMUTABLE: sin rutas de escritura (PUT/DELETE/PATCH
 *    -> 404/405, patron Anamnesis/DEC-057).
 *  - `GET /clientes/:clienteId/rutinas/activa` (DUENO/RECEPCIONISTA): 200
 *    `{ clienteId, asignacion: dto|null, estado: "ACTIVA"|"SIN_RUTINA"|
 *    "OCULTA_POR_VIGENCIA" }` (DEC-066/DEC-070: la ocultacion NO borra).
 *  - `GET /portal/rutina` (CLIENTE por token, self-only): 200
 *    `rutinaPortalSchema` desde `contenidoSnapshot` (`.strict()` SIN
 *    `actor`/`actualizadoPor`, SEC-01/SEC-03) | `{ mensaje: "No tienes una
 *    rutina activa" }`; 403 para staff y para cualquier `clienteId` ajeno en
 *    query (nunca datos de otro cliente). Sin DELETE.
 */
export default async function asignacionesRoutes(fastify: FastifyInstance) {
  // ── POST /clientes/:clienteId/rutinas/asignacion (endpoint 5) ────────────
  fastify.post(
    "/clientes/:clienteId/rutinas/asignacion",
    { preHandler: [fastify.authenticateRoles(["DUENO"])] },
    async (request, reply) => {
      // Orden EXACTO (R8): 400 params ANTES de 400 body.
      const paramsResult = asignacionParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          error: mensajePrimerErrorZod(paramsResult),
          code: "VALIDATION_ERROR",
        });
      }
      const bodyResult = asignarRutinaBodySchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply.status(400).send({
          error: mensajePrimerErrorZod(bodyResult),
          code: "VALIDATION_ERROR",
        });
      }

      const actorId = (request.user as { id: string }).id;
      try {
        const asignacion = await asignarRutina(
          paramsResult.data.clienteId,
          bodyResult.data.rutinaId,
          bodyResult.data.fechaInicio,
          actorId
        );
        return reply.status(201).send(asignacion);
      } catch (error) {
        return responderError(error, reply);
      }
    }
  );

  // ── GET /clientes/:clienteId/rutinas/historial (endpoint 6) ──────────────
  fastify.get(
    "/clientes/:clienteId/rutinas/historial",
    { preHandler: [fastify.authenticateRoles(["DUENO", "RECEPCIONISTA"])] },
    async (request, reply) => {
      const paramsResult = asignacionParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          error: mensajePrimerErrorZod(paramsResult),
          code: "VALIDATION_ERROR",
        });
      }
      try {
        await existeCliente(paramsResult.data.clienteId);
        const historial = await obtenerHistorial(paramsResult.data.clienteId);
        return reply.status(200).send(historial);
      } catch (error) {
        return responderError(error, reply);
      }
    }
  );

  // ── GET /clientes/:clienteId/rutinas/activa (endpoint 7) ─────────────────
  fastify.get(
    "/clientes/:clienteId/rutinas/activa",
    { preHandler: [fastify.authenticateRoles(["DUENO", "RECEPCIONISTA"])] },
    async (request, reply) => {
      const paramsResult = asignacionParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          error: mensajePrimerErrorZod(paramsResult),
          code: "VALIDATION_ERROR",
        });
      }
      try {
        await existeCliente(paramsResult.data.clienteId);
        const activa = await obtenerActiva(paramsResult.data.clienteId);
        return reply.status(200).send(activa);
      } catch (error) {
        return responderError(error, reply);
      }
    }
  );

  // ── GET /portal/rutina (endpoint 8, self-only) ───────────────────────────
  fastify.get(
    "/portal/rutina",
    { preHandler: [fastify.authenticateRoles(["CLIENTE"])] },
    async (request, reply) => {
      // SEC-01/SEC-03 (RU-36): jamás datos de otro cliente; cualquier
      // `clienteId` externo en query se rechaza SIN revelar existencia.
      const query = (request.query ?? {}) as Record<string, unknown>;
      if (query.clienteId !== undefined) {
        return reply.status(403).send({
          error: "No tienes permisos para realizar esta acción.",
          code: "AUTH_FORBIDDEN",
        });
      }
      const clienteId = (request.user as { id: string }).id;
      try {
        const resultado = await obtenerPortalRutina(clienteId);
        return reply.status(200).send(resultado);
      } catch (error) {
        return responderError(error, reply);
      }
    }
  );
}
