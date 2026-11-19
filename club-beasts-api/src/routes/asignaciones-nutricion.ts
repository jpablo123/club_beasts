import { FastifyInstance } from "fastify";
import { z } from "zod";
import { asignacionParamsSchema, mensajePrimerErrorZod } from "../schemas/rutina.schema.js";
import { responderError } from "../services/rutina.service.js";
import {
  asignarPlanNutricional,
  existeClienteNutricion,
  obtenerActivaNutricion,
  obtenerHistorialNutricion,
} from "../services/asignacion-nutricion.service.js";

const asignarBodySchema = z.object({ planId: z.string().min(1), fechaInicio: z.string().optional() }).strict();

export default async function asignacionesNutricionRoutes(fastify: FastifyInstance) {
  fastify.post(
    "/clientes/:clienteId/planes-nutricionales/asignacion",
    { preHandler: [fastify.authenticateRoles(["DUENO"])] },
    async (request, reply) => {
      const paramsResult = asignacionParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({ error: mensajePrimerErrorZod(paramsResult), code: "VALIDATION_ERROR" });
      }
      try {
        await existeClienteNutricion(paramsResult.data.clienteId);
      } catch (error) {
        return responderError(error, reply);
      }
      const bodyResult = asignarBodySchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply.status(400).send({ error: mensajePrimerErrorZod(bodyResult), code: "VALIDATION_ERROR" });
      }
      const actorId = (request.user as { id: string }).id;
      try {
        const asignacion = await asignarPlanNutricional(
          paramsResult.data.clienteId,
          bodyResult.data.planId,
          bodyResult.data.fechaInicio,
          actorId
        );
        return reply.status(201).send(asignacion);
      } catch (error) {
        return responderError(error, reply);
      }
    }
  );

  fastify.get(
    "/clientes/:clienteId/planes-nutricionales/historial",
    { preHandler: [fastify.authenticateRoles(["DUENO", "RECEPCIONISTA"])] },
    async (request, reply) => {
      const paramsResult = asignacionParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({ error: mensajePrimerErrorZod(paramsResult), code: "VALIDATION_ERROR" });
      }
      try {
        await existeClienteNutricion(paramsResult.data.clienteId);
        const historial = await obtenerHistorialNutricion(paramsResult.data.clienteId);
        return reply.status(200).send(historial);
      } catch (error) {
        return responderError(error, reply);
      }
    }
  );

  fastify.get(
    "/clientes/:clienteId/planes-nutricionales/activa",
    { preHandler: [fastify.authenticateRoles(["DUENO", "RECEPCIONISTA"])] },
    async (request, reply) => {
      const paramsResult = asignacionParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({ error: mensajePrimerErrorZod(paramsResult), code: "VALIDATION_ERROR" });
      }
      try {
        await existeClienteNutricion(paramsResult.data.clienteId);
        const activa = await obtenerActivaNutricion(paramsResult.data.clienteId);
        return reply.status(200).send(activa);
      } catch (error) {
        return responderError(error, reply);
      }
    }
  );
}
