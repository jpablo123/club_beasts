import { FastifyInstance } from "fastify";
import { z } from "zod";
import { obtenerHistorialCliente } from "../services/historial.service.js";

const paramsSchema = z.object({ clienteId: z.string().min(1) });

export default async function historialRoutes(fastify: FastifyInstance) {
  fastify.get("/clientes/:clienteId/historial", { preHandler: [fastify.authenticateRoles(["DUENO", "RECEPCIONISTA", "CLIENTE"])] }, async (request, reply) => {
    const params = paramsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: "INVALID_PARAMS" });
    const q = z.object({ tipo: z.string().optional(), limit: z.coerce.number().min(1).max(100).default(20), offset: z.coerce.number().min(0).default(0) }).safeParse(request.query);
    if (!q.success) return reply.status(400).send({ error: "INVALID_QUERY" });
    const user = request.user as { id: string; rol: string };
    const clienteId = user.rol === "CLIENTE" ? user.id : params.data.clienteId;
    const ocultarActor = user.rol === "CLIENTE";
    const result = await obtenerHistorialCliente(clienteId, q.data, ocultarActor);
    return reply.status(200).send(result);
  });
}

