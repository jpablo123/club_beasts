import { FastifyInstance } from "fastify";
import { loginUser, loginClient, resetPin } from "../services/auth.service.js";
import {
  loginUserSchema,
  loginClientSchema,
  resetPinSchema,
} from "../schemas/auth.schema.js";

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post("/auth/login", async (request, reply) => {
    const result = loginUserSchema.safeParse(request.body);
    if (!result.success) {
      const message = result.error.errors[0].message;
      return reply.status(400).send({ error: message });
    }

    const { email, password } = result.data;
    const user = await loginUser(email, password);
    if (!user) {
      return reply.status(401).send({ error: "Credenciales inválidas" });
    }

    const token = fastify.jwt.sign(user);
    return { token, user };
  });

  fastify.post("/auth/login-cliente", async (request, reply) => {
    const result = loginClientSchema.safeParse(request.body);
    if (!result.success) {
      const message = result.error.errors[0].message;
      return reply.status(400).send({ error: message });
    }

    const { cedula, pin } = result.data;
    const cliente = await loginClient(cedula, pin);
    if (!cliente) {
      return reply.status(401).send({ error: "Cédula o PIN inválido" });
    }

    const token = fastify.jwt.sign({ ...cliente, rol: "CLIENTE" });
    return { token, cliente };
  });

  fastify.post(
    "/auth/reset-pin",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const result = resetPinSchema.safeParse(request.body);
      if (!result.success) {
        const message = result.error.errors[0].message;
        return reply.status(400).send({ error: message });
      }

      const { clienteId, newPin } = result.data;
      await resetPin(clienteId, newPin);
      return { message: "PIN actualizado correctamente" };
    }
  );
}
