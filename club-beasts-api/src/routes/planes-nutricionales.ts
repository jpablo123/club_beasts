import { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  crearPlanNutricionalSchema,
  actualizarPlanNutricionalSchema,
  planNutricionalDatosSchema,
} from "../schemas/plan-nutricional.schema.js";
import { mensajePrimerErrorZod } from "../schemas/rutina.schema.js";
import { responderError } from "../services/rutina.service.js";
import {
  crearPlanNutricional,
  obtenerFilaPlanNutricional,
  listarPlanesNutricionales,
  actualizarPlanNutricional,
  type FilaPlanNutricional,
} from "../services/plan-nutricional.service.js";

const planIdParamsSchema = z.object({ id: z.string().min(1) });

function serializarFila(fila: FilaPlanNutricional) {
  return {
    id: fila.id,
    nombre: fila.nombre ?? null,
    datosBiometricos: JSON.parse(fila.datosBiometricos as string),
    macronutrientes: fila.macronutrientes ? JSON.parse(fila.macronutrientes as string) : null,
    comidas: JSON.parse(fila.comidas as string),
    recomendaciones: fila.recomendaciones ?? null,
    suplementacion: fila.suplementacion ?? null,
    observacionesGenerales: fila.observacionesGenerales ?? null,
    fechaActualizacion: fila.updatedAt.toISOString(),
    actualizadoPor: fila.actualizadoPor ? { id: fila.actualizadoPor.id, nombre: fila.actualizadoPor.nombre } : null,
  };
}

export default async function planesNutricionalesRoutes(fastify: FastifyInstance) {
  fastify.post(
    "/planes-nutricionales",
    { preHandler: [fastify.authenticateRoles(["DUENO"])] },
    async (request, reply) => {
      const bodyResult = crearPlanNutricionalSchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply.status(400).send({ error: mensajePrimerErrorZod(bodyResult), code: "VALIDATION_ERROR" });
      }
      const actorId = (request.user as { id: string }).id;
      try {
        const datos = await crearPlanNutricional(bodyResult.data as any, actorId);
        return reply.status(201).send(datos);
      } catch (error) {
        return responderError(error, reply);
      }
    }
  );

  fastify.get(
    "/planes-nutricionales",
    { preHandler: [fastify.authenticateRoles(["DUENO", "RECEPCIONISTA"])] },
    async (_request, reply) => {
      const resultado = await listarPlanesNutricionales();
      return reply.status(200).send(resultado);
    }
  );

  fastify.get(
    "/planes-nutricionales/:id",
    { preHandler: [fastify.authenticateRoles(["DUENO", "RECEPCIONISTA"])] },
    async (request, reply) => {
      const paramsResult = planIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({ error: mensajePrimerErrorZod(paramsResult), code: "VALIDATION_ERROR" });
      }
      const fila = await obtenerFilaPlanNutricional(paramsResult.data.id);
      if (!fila) {
        return reply.status(404).send({ error: "PLAN_NO_ENCONTRADO", code: "PLAN_NO_ENCONTRADO" });
      }
      return reply.status(200).send(serializarFila(fila));
    }
  );

  fastify.patch(
    "/planes-nutricionales/:id",
    { preHandler: [fastify.authenticateRoles(["DUENO"])] },
    async (request, reply) => {
      const paramsResult = planIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({ error: mensajePrimerErrorZod(paramsResult), code: "VALIDATION_ERROR" });
      }
      const fila = await obtenerFilaPlanNutricional(paramsResult.data.id);
      if (!fila) {
        return reply.status(404).send({ error: "PLAN_NO_ENCONTRADO", code: "PLAN_NO_ENCONTRADO" });
      }
      const bodyResult = actualizarPlanNutricionalSchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply.status(400).send({ error: mensajePrimerErrorZod(bodyResult), code: "VALIDATION_ERROR" });
      }
      const actorId = (request.user as { id: string }).id;
      try {
        const datos = await actualizarPlanNutricional(fila, bodyResult.data as any, actorId);
        return reply.status(200).send(datos);
      } catch (error) {
        return responderError(error, reply);
      }
    }
  );
}
