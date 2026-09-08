import { FastifyInstance } from "fastify";
import {
  createCliente,
  updateCliente,
  getClienteById,
  searchClientes,
} from "../services/cliente.service.js";
import {
  createClienteSchema,
  updateClienteSchema,
  searchClientesSchema,
  clienteParamsSchema,
} from "../schemas/cliente.schema.js";

export default async function clienteRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/clientes",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const result = searchClientesSchema.safeParse(request.query);
      if (!result.success) {
        const message = result.error.errors[0].message;
        return reply.status(400).send({ error: message });
      }

      const { search, sedeId, estado, page: rawPage, limit: rawLimit } =
        result.data;
      const page = rawPage ? parseInt(rawPage, 10) : undefined;
      const limit = rawLimit ? parseInt(rawLimit, 10) : undefined;
      const response = await searchClientes({
        search,
        sedeId,
        estado,
        page,
        limit,
      });
      return response;
    }
  );

  fastify.get(
    "/clientes/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsResult = clienteParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        const message = paramsResult.error.errors[0].message;
        return reply.status(400).send({ error: message });
      }

      const { id } = paramsResult.data;
      const cliente = await getClienteById(id);
      if (!cliente) {
        return reply.status(404).send({ error: "Cliente no encontrado" });
      }
      return cliente;
    }
  );

  fastify.post(
    "/clientes",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const result = createClienteSchema.safeParse(request.body);
      if (!result.success) {
        const errors = result.error.errors.map((e) => e.message);
        return reply.status(400).send({ error: errors.join(", ") });
      }

      const { cedula, nombres, apellidos, telefono, email, sedeId, observaciones } =
        result.data;

      try {
        const cliente = await createCliente({
          cedula,
          nombres,
          apellidos,
          telefono,
          email: email || undefined,
          sedeId,
          observaciones: observaciones || undefined,
        });
        return reply.status(201).send(cliente);
      } catch (error: any) {
        if (error.code === "P2002") {
          return reply
            .status(409)
            .send({ error: "Ya existe un cliente con esa cédula" });
        }
        throw error;
      }
    }
  );

  fastify.patch(
    "/clientes/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsResult = clienteParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        const message = paramsResult.error.errors[0].message;
        return reply.status(400).send({ error: message });
      }

      const { id } = paramsResult.data;

      const bodyResult = updateClienteSchema.safeParse(request.body);
      if (!bodyResult.success) {
        const errors = bodyResult.error.errors.map((e) => e.message);
        return reply.status(400).send({ error: errors.join(", ") });
      }

      const cliente = await getClienteById(id);
      if (!cliente) {
        return reply.status(404).send({ error: "Cliente no encontrado" });
      }

      const updated = await updateCliente(id, bodyResult.data);
      return updated;
    }
  );
}
