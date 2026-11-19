import { FastifyInstance } from "fastify";
import { z } from "zod";
import { obtenerConteosSede } from "../services/conteos.service.js";

const paramsSchema = z.object({ sedeId: z.string().min(1) });

export default async function conteosRoutes(fastify: FastifyInstance) {
  fastify.get("/sedes/:sedeId/conteos", { preHandler: [fastify.authenticateRoles(["DUENO", "RECEPCIONISTA"])] }, async (request, reply) => {
    const params = paramsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: "INVALID_PARAMS" });
    const q = z.object({ fecha: z.string().optional() }).safeParse(request.query);
    if (!q.success) return reply.status(400).send({ error: "INVALID_QUERY" });
    try {
      const result = await obtenerConteosSede(params.data.sedeId, q.data.fecha);
      return reply.status(200).send(result);
    } catch (e: any) {
      if (e?.message === "SEDE_INEXISTENTE") return reply.status(404).send({ error: "NOT_FOUND" });
      throw e;
    }
  });
}
