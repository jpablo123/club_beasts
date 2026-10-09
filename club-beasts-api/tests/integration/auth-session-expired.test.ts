/**
 * INC00-AUTH-01 / INC00-AUTH-04 / INC00-AUTH-05 — contrato de sesion en la API
 * Incremento: INC-00-estabilizacion-fases-1-2 (Tarea 5 - pruebas RED)
 *
 * Cubre la mitad backend de los criterios de sesion:
 *  - AUTH-01: JWT vencido -> 401 AUTH_TOKEN_EXPIRED con el mensaje aprobado
 *    (la segunda mitad del criterio, "una sola recuperacion centralizada", es
 *    responsabilidad del cliente HTTP y se prueba en club-beasts-web).
 *  - AUTH-04: credenciales invalidas -> 401 AUTH_INVALID_CREDENTIALS sin
 *    emitir ningun artefacto de sesion (el "no logout global" es frontend).
 *  - AUTH-05: 403 AUTH_FORBIDDEN que no invalida el token emisor de la peticion
 *    (la sesion sigue autorizada en el servidor).
 *
 * Aislamiento: fixtures propios con cedula unica y limpieza en afterAll
 * (INC00-QA-04). Base SQLite temporal creada por tests/setup-isolated-sqlite.ts.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import bcrypt from "bcryptjs";
import prisma from "../../src/lib/prisma";
import authRoutes from "../../src/routes/auth";
import clienteRoutes from "../../src/routes/clientes";
import prismaPlugin from "../../src/plugins/prisma";
import authPlugin from "../../src/plugins/auth";

const BACKEND_APPROVED_SESSION_MESSAGE =
  "Tu sesión venció por seguridad. Inicia sesión de nuevo para continuar.";
const fixtureCedula = "9300000001";
const fixturePin = "1234";

let app: any;
let clienteId: string;

function parseBody(res: { body: string }) {
  return JSON.parse(res.body);
}

async function cleanupFixture() {
  await prisma.cliente.deleteMany({ where: { cedula: fixtureCedula } });
}

/** Firma un JWT con el mismo secreto de la app pero con exp en el pasado. */
function signExpiredToken(payload: Record<string, unknown>): string {
  const pastExp = Math.floor(Date.now() / 1000) - 120;
  return app.jwt.sign({ ...payload, exp: pastExp });
}

async function loginInternal(): Promise<{ token: string; user: Record<string, unknown> }> {
  const res = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email: "admin@clubbeasts.com", password: "admin123" },
  });
  expect(res.statusCode).toBe(200);
  const body = parseBody(res);
  return { token: body.token, user: body.user };
}

async function loginCliente(): Promise<string> {
  const res = await app.inject({
    method: "POST",
    url: "/auth/login-cliente",
    payload: { cedula: fixtureCedula, pin: fixturePin },
  });
  expect(res.statusCode).toBe(200);
  return parseBody(res).token;
}

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? "inc00-session-expired-secret";

  await cleanupFixture();
  const hashedPin = await bcrypt.hash(fixturePin, 10);
  const cliente = await prisma.cliente.create({
    data: {
      cedula: fixtureCedula,
      nombres: "Sesion",
      apellidos: "Vencida",
      telefono: "3009999999",
      email: "sesion.vencida@clubbeasts.test",
      sedeId: "sede-1",
      pin: hashedPin,
      estado: "ACTIVO",
    },
  });
  clienteId = cliente.id;

  app = Fastify();
  await app.register(prismaPlugin);
  await app.register(authPlugin);
  await app.register(authRoutes);
  await app.register(clienteRoutes);
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await cleanupFixture();
});

describe("INC00-AUTH-01 JWT vencido", () => {
  it("INC00-AUTH-01 GET /clientes con JWT vencido devuelve 401 AUTH_TOKEN_EXPIRED con el mensaje aprobado", async () => {
    const expiredToken = signExpiredToken({
      id: "user-expired-001",
      email: "admin@clubbeasts.com",
      nombre: "David Rozo",
      rol: "DUENO",
    });

    const res = await app.inject({
      method: "GET",
      url: "/clientes",
      headers: { authorization: `Bearer ${expiredToken}` },
    });

    expect(res.statusCode).toBe(401);
    const body = parseBody(res);
    expect(body.code).toBe("AUTH_TOKEN_EXPIRED");
    expect(body.error).toBe(BACKEND_APPROVED_SESSION_MESSAGE);
    expect(body).not.toHaveProperty("clientes");
  });

  it("INC00-AUTH-01 GET /clientes/:id con JWT vencido de CLIENTE devuelve 401 AUTH_TOKEN_EXPIRED sin datos de la ficha", async () => {
    const expiredToken = signExpiredToken({
      id: clienteId,
      cedula: fixtureCedula,
      rol: "CLIENTE",
    });

    const res = await app.inject({
      method: "GET",
      url: `/clientes/${clienteId}`,
      headers: { authorization: `Bearer ${expiredToken}` },
    });

    expect(res.statusCode).toBe(401);
    const body = parseBody(res);
    expect(body.code).toBe("AUTH_TOKEN_EXPIRED");
    expect(body.error).toBe(BACKEND_APPROVED_SESSION_MESSAGE);
    expect(body).not.toHaveProperty("cedula");
    expect(body).not.toHaveProperty("telefono");
  });

  it("INC00-AUTH-01 un intento con JWT vencido no invalida el token vigente en el servidor", async () => {
    const { token: validToken, user } = await loginInternal();
    const expiredToken = signExpiredToken(user as Record<string, unknown>);

    const expiredRes = await app.inject({
      method: "GET",
      url: "/clientes",
      headers: { authorization: `Bearer ${expiredToken}` },
    });
    expect(expiredRes.statusCode).toBe(401);
    expect(parseBody(expiredRes).code).toBe("AUTH_TOKEN_EXPIRED");

    const validRes = await app.inject({
      method: "GET",
      url: "/clientes",
      headers: { authorization: `Bearer ${validToken}` },
    });
    expect(validRes.statusCode).toBe(200);
  });

  it("INC00-AUTH-01 los logins exponen tokenExpiresAt en segundos futuros para que la UI programe la recuperacion", async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);

    const internalRes = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "admin@clubbeasts.com", password: "admin123" },
    });
    const internalBody = parseBody(internalRes);
    expect(typeof internalBody.tokenExpiresAt).toBe("number");
    expect(internalBody.tokenExpiresAt).toBeGreaterThan(nowSeconds);

    const clienteRes = await app.inject({
      method: "POST",
      url: "/auth/login-cliente",
      payload: { cedula: fixtureCedula, pin: fixturePin },
    });
    const clienteBody = parseBody(clienteRes);
    expect(typeof clienteBody.tokenExpiresAt).toBe("number");
    expect(clienteBody.tokenExpiresAt).toBeGreaterThan(nowSeconds);
  });

  it("INC00-AUTH-01 token ausente y token invalido usan sus codigos diferenciados (sin codigo generico)", async () => {
    const missingRes = await app.inject({ method: "GET", url: "/clientes" });
    expect(missingRes.statusCode).toBe(401);
    expect(parseBody(missingRes).code).toBe("AUTH_TOKEN_MISSING");

    const invalidRes = await app.inject({
      method: "GET",
      url: "/clientes",
      headers: { authorization: "Bearer not-a-real-jwt" },
    });
    expect(invalidRes.statusCode).toBe(401);
    expect(parseBody(invalidRes).code).toBe("AUTH_TOKEN_INVALID");
  });
});

describe("INC00-AUTH-04 credenciales invalidas", () => {
  it("INC00-AUTH-04 /auth/login con password incorrecto devuelve 401 AUTH_INVALID_CREDENTIALS sin emitir sesion", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "admin@clubbeasts.com", password: "wrong-password" },
    });

    expect(res.statusCode).toBe(401);
    const body = parseBody(res);
    expect(body.code).toBe("AUTH_INVALID_CREDENTIALS");
    expect(body.error).toBe("Credenciales inválidas");
    expect(body).not.toHaveProperty("token");
    expect(body).not.toHaveProperty("tokenExpiresAt");
    expect(res.headers["set-cookie"]).toBeUndefined();
  });

  it("INC00-AUTH-04 /auth/login-cliente con PIN incorrecto devuelve 401 AUTH_INVALID_CREDENTIALS sin emitir sesion", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login-cliente",
      payload: { cedula: fixtureCedula, pin: "9999" },
    });

    expect(res.statusCode).toBe(401);
    const body = parseBody(res);
    expect(body.code).toBe("AUTH_INVALID_CREDENTIALS");
    expect(body.error).toBe("Cédula o PIN inválido");
    expect(body).not.toHaveProperty("token");
    expect(res.headers["set-cookie"]).toBeUndefined();
  });
});

describe("INC00-AUTH-05 403 conserva la sesion", () => {
  it("INC00-AUTH-05 CLIENTE sobre /auth/reset-pin recibe 403 AUTH_FORBIDDEN y su token sigue autorizado", async () => {
    const clienteToken = await loginCliente();

    const forbiddenRes = await app.inject({
      method: "POST",
      url: "/auth/reset-pin",
      headers: { authorization: `Bearer ${clienteToken}` },
      payload: { clienteId, newPin: "5678" },
    });

    expect(forbiddenRes.statusCode).toBe(403);
    const forbiddenBody = parseBody(forbiddenRes);
    expect(forbiddenBody.code).toBe("AUTH_FORBIDDEN");
    expect(forbiddenBody.error).toContain("No tienes permisos");
    expect(forbiddenBody).not.toHaveProperty("token");

    const stillAuthorized = await app.inject({
      method: "GET",
      url: `/clientes/${clienteId}`,
      headers: { authorization: `Bearer ${clienteToken}` },
    });
    expect(stillAuthorized.statusCode).toBe(200);
    expect(parseBody(stillAuthorized).id).toBe(clienteId);
  });

  it("INC00-AUTH-05 CLIENTE sobre GET /clientes recibe 403 AUTH_FORBIDDEN sin respuesta 401 de sesion vencida", async () => {
    const clienteToken = await loginCliente();

    const res = await app.inject({
      method: "GET",
      url: "/clientes",
      headers: { authorization: `Bearer ${clienteToken}` },
    });

    expect(res.statusCode).toBe(403);
    const body = parseBody(res);
    expect(body.code).toBe("AUTH_FORBIDDEN");
    expect(body.error).not.toBe(BACKEND_APPROVED_SESSION_MESSAGE);

    const ownFicha = await app.inject({
      method: "GET",
      url: `/clientes/${clienteId}`,
      headers: { authorization: `Bearer ${clienteToken}` },
    });
    expect(ownFicha.statusCode).toBe(200);
  });
});
