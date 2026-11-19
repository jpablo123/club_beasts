import { FastifyInstance } from "fastify";
import { z } from "zod";
import { enviarNotificacionesVencimiento } from "../services/notificacion.service.js";

export default async function notificacionesRoutes(fastify: FastifyInstance) {
  fastify.post("/notificaciones/vencimiento/enviar", { preHandler: [fastify.authenticateRoles(["DUENO"])] }, async (request, reply) => {
    const body = z.object({ dias: z.number().int().min(0).default(0) }).safeParse(request.body ?? {});
    if (!body.success) return reply.status(400).send({ error: "INVALID_BODY" });
    const result = await enviarNotificacionesVencimiento(body.data.dias);
    return reply.status(200).send(result);
  });
}
