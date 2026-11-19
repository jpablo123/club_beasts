import { FastifyInstance } from "fastify";
import { responderError } from "../services/rutina.service.js";
import { obtenerPortalPlanNutricional } from "../services/asignacion-nutricion.service.js";

export default async function portalPlanNutricionalRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/portal/plan-nutricional",
    { preHandler: [fastify.authenticateRoles(["CLIENTE"])] },
    async (request, reply) => {
      const query = (request.query ?? {}) as Record<string, unknown>;
      if (query.clienteId !== undefined) {
        return reply.status(403).send({ error: "No tienes permisos para realizar esta acción.", code: "AUTH_FORBIDDEN" });
      }
      const clienteId = (request.user as { id: string }).id;
      try {
        const resultado = await obtenerPortalPlanNutricional(clienteId);
        return reply.status(200).send(resultado);
      } catch (error) {
        return responderError(error, reply);
      }
    }
  );
}
