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
      // Credenciales primero, estado despues (HU08-C04a / anti-enumeracion):
      // un PIN mal recibe siempre este 401 generico, sea o no INACTIVO.
      return reply.status(401).send({
        error: "Cédula o PIN inválido",
        code: "AUTH_INVALID_CREDENTIALS",
      });
    }

    // INC-04 (HU-08 b4 / DEC-034): PIN correcto pero cuenta INACTIVA -> 401
    // propio SIN token (no se abre sesion a una cuenta bloqueada). El literal
    // es el del contrato G14 `HU08-C04a`.
    const { estado, ...clienteSesion } = cliente;
    if (estado === "INACTIVO") {
      return reply.status(401).send({
        error: "La cuenta está inactiva. Contacte con recepción.",
        code: "AUTH_CLIENTE_INACTIVO",
      });
    }

    // Regresion HU-02: la respuesta de exito queda IDENTICA (sin `estado`).
    const token = fastify.jwt.sign({ ...clienteSesion, rol: "CLIENTE" });
    const decoded = fastify.jwt.verify(token) as any;
    return {
      token,
      cliente: clienteSesion,
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
