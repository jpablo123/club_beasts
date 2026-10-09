import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";
import { FastifyInstance } from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: any, reply: any) => Promise<void>;
    authenticateRoles: (roles: string[]) => (request: any, reply: any) => Promise<void>;
  }
}

async function authPlugin(fastify: FastifyInstance) {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET no está configurado. Define la variable de entorno antes de iniciar.");
  }

  fastify.register(fastifyJwt, {
    secret: jwtSecret,
    sign: { expiresIn: "24h" },
  });

  fastify.decorate(
    "authenticate",
    async (request: any, reply: any) => {
      try {
        await request.jwtVerify();
      } catch (err: any) {
        const code = err?.code ?? "";
        if (code === "FST_JWT_AUTHORIZATION_TOKEN_EXPIRED") {
          reply.status(401).send({
            error: "Tu sesión venció por seguridad. Inicia sesión de nuevo para continuar.",
            code: "AUTH_TOKEN_EXPIRED",
          });
          return;
        }
        if (code === "FST_JWT_NO_AUTHORIZATION_IN_HEADER") {
          reply.status(401).send({
            error: "Token de autenticación requerido.",
            code: "AUTH_TOKEN_MISSING",
          });
          return;
        }
        reply.status(401).send({
          error: "Token de autenticación inválido.",
          code: "AUTH_TOKEN_INVALID",
        });
      }
    }
  );

  fastify.decorate(
    "authenticateRoles",
    (roles: string[]) => async (request: any, reply: any) => {
      await fastify.authenticate(request, reply);
      if (reply.sent) return;
      const rol = (request.user as any)?.rol;
      if (!rol || !roles.includes(rol)) {
        return reply.status(403).send({
          error: "No tienes permisos para realizar esta acción.",
          code: "AUTH_FORBIDDEN",
        });
      }
    }
  );
}

export default fp(authPlugin, { name: "auth" });
