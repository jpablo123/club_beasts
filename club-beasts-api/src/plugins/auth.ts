import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";
import { FastifyInstance } from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: any, reply: any) => Promise<void>;
  }
}

async function authPlugin(fastify: FastifyInstance) {
  fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || "fallback-secret",
    sign: { expiresIn: "24h" },
  });

  fastify.decorate(
    "authenticate",
    async (request: any, reply: any) => {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.status(401).send({ error: "Token inválido o expirado" });
      }
    }
  );
}

export default fp(authPlugin, { name: "auth" });
