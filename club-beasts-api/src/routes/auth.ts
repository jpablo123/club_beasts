import { FastifyInstance } from "fastify";
import { loginUser, loginClient, resetPin, changePin } from "../services/auth.service.js";
import {
  loginUserSchema,
  loginClientSchema,
  resetPinSchema,
  changePinSchema,
} from "../schemas/auth.schema.js";

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post("/auth/login", async (request, reply) => {
    const result = loginUserSchema.safeParse(request.body);
    if (!result.success) {
      const message = result.error.errors[0].message;
      return reply.status(400).send({ error: message, code: "VALIDATION_ERROR" });
    }

    const { email, password } = result.data;
    const user = await loginUser(email, password);
    if (!user) {
      return reply.status(401).send({
        error: "Credenciales inválidas",
        code: "AUTH_INVALID_CREDENTIALS",
      });
    }

    const token = fastify.jwt.sign(user);
    const decoded = fastify.jwt.verify(token) as any;
    return {
      token,
      user,
      tokenExpiresAt: decoded.exp,
    };
  });

  fastify.post("/auth/login-cliente", async (request, reply) => {
    const result = loginClientSchema.safeParse(request.body);
    if (!result.success) {
      const message = result.error.errors[0].message;
      return reply.status(400).send({ error: message, code: "VALIDATION_ERROR" });
    }

    const { cedula, pin } = result.data;
    const cliente = await loginClient(cedula, pin);
    if (!cliente) {
      return reply.status(401).send({
        error: "Cédula o PIN inválido",
        code: "AUTH_INVALID_CREDENTIALS",
      });
    }

    const token = fastify.jwt.sign({ ...cliente, rol: "CLIENTE" });
    const decoded = fastify.jwt.verify(token) as any;
    return {
      token,
      cliente,
      tokenExpiresAt: decoded.exp,
    };
  });

  fastify.post(
    "/auth/reset-pin",
    { preHandler: [fastify.authenticateRoles(["DUENO", "RECEPCIONISTA"])] },
    async (request, reply) => {
      const result = resetPinSchema.safeParse(request.body);
      if (!result.success) {
        const message = result.error.errors[0].message;
        return reply.status(400).send({ error: message, code: "VALIDATION_ERROR" });
      }

      const { clienteId, newPin } = result.data;
      const actorId = (request.user as any).id;
      try {
        await resetPin(clienteId, newPin, actorId);
        return { message: "PIN actualizado correctamente" };
      } catch (error: any) {
        if (error.code === "P2025") {
          return reply.status(404).send({
            error: "Cliente no encontrado",
            code: "NOT_FOUND",
          });
        }
        throw error;
      }
    }
  );

  fastify.post(
    "/auth/change-pin",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const result = changePinSchema.safeParse(request.body);
      if (!result.success) {
        const message = result.error.errors[0].message;
        return reply.status(400).send({ error: message, code: "VALIDATION_ERROR" });
      }

      const { currentPin, newPin } = result.data;
      const userId = (request.user as any).id;
      const userRole = (request.user as any).rol;

      if (userRole !== "CLIENTE") {
        return reply.status(400).send({
          error: "Este endpoint es solo para clientes",
          code: "INVALID_OPERATION",
        });
      }

      try {
        await changePin(userId, currentPin, newPin);
        return { message: "PIN actualizado correctamente" };
      } catch (error: any) {
        if (error.message === "NOT_FOUND") {
          return reply.status(404).send({
            error: "Cliente no encontrado",
            code: "NOT_FOUND",
          });
        }
        if (error.message === "INVALID_CURRENT_PIN") {
          return reply.status(401).send({
            error: "El PIN actual es incorrecto",
            code: "AUTH_INVALID_CREDENTIALS",
          });
        }
        throw error;
      }
    }
  );
}
