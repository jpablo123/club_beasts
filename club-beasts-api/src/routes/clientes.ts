import { FastifyInstance, FastifyRequest } from "fastify";
import {
  createCliente,
  updateCliente,
  getClienteById,
  searchClientes,
  SEDE_INEXISTENTE,
} from "../services/cliente.service.js";
import {
  createClienteSchema,
  updateClienteSchema,
  searchClientesSchema,
  clienteParamsSchema,
} from "../schemas/cliente.schema.js";
import {
  esErrorPrismaClient,
  internalPrismaErrorBody,
  mapPrismaError,
  type ApiErrorBody,
} from "../lib/errors.js";

/**
 * Mapea un error de negocio (o de Prisma) a status + cuerpo para /clientes.
 * Devuelve null si el error no es reconocido y debe propagarse al caller.
 *
 * Reglas:
 * - sedeId inexistente -> 400 VALIDATION_ERROR con mensaje claro.
 * - cedula duplicada (P2002) -> 409 DUPLICATE (contrato existente).
 * - cualquier otro error de Prisma se responde con un cuerpo generico:
 *   jamas se expone el objeto de error de Prisma (P2003, rutas, stack).
 */
function responderErrorCliente(
  error: unknown,
  request: FastifyRequest
): { status: number; body: ApiErrorBody } | null {
  const message =
    typeof error === "object" && error !== null
      ? (error as { message?: unknown }).message
      : undefined;

  if (message === SEDE_INEXISTENTE) {
    return {
      status: 400,
      body: {
        error: "La sede indicada no existe. Verifique el identificador enviado.",
        code: "VALIDATION_ERROR",
      },
    };
  }

  const code =
    typeof error === "object" && error !== null
      ? (error as { code?: unknown }).code
      : undefined;

  if (code === "P2002") {
    return {
      status: 409,
      body: { error: "Ya existe un cliente con esa cédula", code: "DUPLICATE" },
    };
  }

  const prismaError = mapPrismaError(error);
  if (prismaError) return prismaError;

  if (esErrorPrismaClient(error)) {
    request.log.error({ err: error }, "Error de Prisma sin mapeo en clientes");
    return { status: 500, body: internalPrismaErrorBody() };
  }

  return null;
}

export default async function clienteRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/clientes",
    { preHandler: [fastify.authenticateRoles(["DUENO", "RECEPCIONISTA"])] },
    async (request, reply) => {
      const result = searchClientesSchema.safeParse(request.query);
      if (!result.success) {
        const message = result.error.errors[0].message;
        return reply.status(400).send({ error: message, code: "VALIDATION_ERROR" });
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
        return reply.status(400).send({ error: message, code: "VALIDATION_ERROR" });
      }

      const { id } = paramsResult.data;
      const user = request.user as any;
      const rol = user?.rol;

      if (rol === "CLIENTE" && user?.id !== id) {
        return reply.status(403).send({
          error: "No tienes permisos para consultar esta ficha.",
          code: "AUTH_FORBIDDEN",
        });
      }

      if (rol !== "CLIENTE" && !["DUENO", "RECEPCIONISTA"].includes(rol)) {
        return reply.status(403).send({
          error: "No tienes permisos para consultar esta ficha.",
          code: "AUTH_FORBIDDEN",
        });
      }

      const cliente = await getClienteById(id);
      if (!cliente) {
        return reply.status(404).send({ error: "Cliente no encontrado", code: "NOT_FOUND" });
      }
      return cliente;
    }
  );

  fastify.post(
    "/clientes",
    { preHandler: [fastify.authenticateRoles(["DUENO", "RECEPCIONISTA"])] },
    async (request, reply) => {
      const result = createClienteSchema.safeParse(request.body);
      if (!result.success) {
        const errors = result.error.errors.map((e) => e.message);
        return reply.status(400).send({ error: errors.join(", "), code: "VALIDATION_ERROR" });
      }

      const { cedula, nombres, apellidos, telefono, email, sedeId, observaciones } =
        result.data;

      try {
        const actorId = (request.user as any).id;
        const cliente = await createCliente({
          cedula,
          nombres,
          apellidos,
          telefono,
          email: email || undefined,
          sedeId,
          observaciones: observaciones || undefined,
        }, actorId);
        return reply.status(201).send(cliente);
      } catch (error: any) {
        const respuesta = responderErrorCliente(error, request);
        if (respuesta) {
          return reply.status(respuesta.status).send(respuesta.body);
        }
        throw error;
      }
    }
  );

  fastify.patch(
    "/clientes/:id",
    { preHandler: [fastify.authenticateRoles(["DUENO", "RECEPCIONISTA"])] },
    async (request, reply) => {
      const paramsResult = clienteParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        const message = paramsResult.error.errors[0].message;
        return reply.status(400).send({ error: message, code: "VALIDATION_ERROR" });
      }

      const { id } = paramsResult.data;

      const bodyResult = updateClienteSchema.safeParse(request.body);
      if (!bodyResult.success) {
        const errors = bodyResult.error.errors.map((e) => e.message);
        return reply.status(400).send({ error: errors.join(", "), code: "VALIDATION_ERROR" });
      }

      const cliente = await getClienteById(id);
      if (!cliente) {
        return reply.status(404).send({ error: "Cliente no encontrado", code: "NOT_FOUND" });
      }

      try {
        const actorId = (request.user as any).id;
        const updated = await updateCliente(id, bodyResult.data, actorId);
        return updated;
      } catch (error: any) {
        const respuesta = responderErrorCliente(error, request);
        if (respuesta) {
          return reply.status(respuesta.status).send(respuesta.body);
        }
        throw error;
      }
    }
  );
}
