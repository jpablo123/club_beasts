import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import prisma from "../../src/lib/prisma";
import authRoutes from "../../src/routes/auth";
import clienteRoutes from "../../src/routes/clientes";
import prismaPlugin from "../../src/plugins/prisma";
import authPlugin from "../../src/plugins/auth";

let app: any;
let cedulaCounter = 0;

function uniqueCedula(): string {
  cedulaCounter++;
  const base = `${Date.now()}`.slice(-6);
  return `${base}${cedulaCounter}`.slice(0, 10);
}

beforeAll(async () => {
  app = Fastify();
  await app.register(prismaPlugin);
  await app.register(authPlugin);
  await app.register(authRoutes);
  await app.register(clienteRoutes);
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe("Auth - Login Dueño/Recepcionista", () => {
  it("login exitoso retorna token y usuario", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "admin@clubbeasts.com", password: "admin123" },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.token).toBeDefined();
    expect(body.user.email).toBe("admin@clubbeasts.com");
    expect(body.user.rol).toBe("DUENO");
  });

  it("login fallido con contraseña incorrecta retorna 401", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "admin@clubbeasts.com", password: "wrongpassword" },
    });
    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.error).toBe("Credenciales inválidas");
  });

  it("login fallido con email inexistente retorna 401", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "noexiste@test.com", password: "123456" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("login sin campos retorna 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "admin@clubbeasts.com" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("login con email formato inválido retorna 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "sinformato", password: "admin123" },
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error).toContain("Email");
  });
});

describe("Auth - Login Cliente", () => {
  it("login exitoso con cédula y PIN retorna token", async () => {
    const cedula = uniqueCedula();

    const tokenRes = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "admin@clubbeasts.com", password: "admin123" },
    });
    const token = JSON.parse(tokenRes.body).token;

    const createRes = await app.inject({
      method: "POST",
      url: "/clientes",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        cedula,
        nombres: "Test",
        apellidos: "Cliente",
        telefono: "3000000000",
        sedeId: "sede-1",
      },
    });
    expect(createRes.statusCode).toBe(201);

    const res = await app.inject({
      method: "POST",
      url: "/auth/login-cliente",
      payload: { cedula, pin: "1234" },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.token).toBeDefined();
    expect(body.cliente.cedula).toBe(cedula);
  });

  it("login fallido con PIN incorrecto retorna 401", async () => {
    const cedula = uniqueCedula();

    const tokenRes = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "admin@clubbeasts.com", password: "admin123" },
    });
    const token = JSON.parse(tokenRes.body).token;

    await app.inject({
      method: "POST",
      url: "/clientes",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        cedula,
        nombres: "Test",
        apellidos: "Cliente",
        telefono: "3000000000",
        sedeId: "sede-1",
      },
    });

    const res = await app.inject({
      method: "POST",
      url: "/auth/login-cliente",
      payload: { cedula, pin: "9999" },
    });
    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.error).toBe("Cédula o PIN inválido");
  });

  it("login fallido con cédula inexistente retorna 401", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login-cliente",
      payload: { cedula: "9999999999", pin: "1234" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("login con PIN no numérico retorna 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login-cliente",
      payload: { cedula: "1234567890", pin: "abcd" },
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error).toContain("PIN");
  });

  it("login sin campos retorna 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login-cliente",
      payload: { cedula: "1234567890" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("login con cédula formato inválido retorna 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login-cliente",
      payload: { cedula: "abc123", pin: "1234" },
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error).toContain("Cédula");
  });
});

describe("Auth - Reset PIN", () => {
  it("reset PIN exitoso", async () => {
    const cedula = uniqueCedula();

    const tokenRes = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "admin@clubbeasts.com", password: "admin123" },
    });
    const token = JSON.parse(tokenRes.body).token;

    const clienteRes = await app.inject({
      method: "POST",
      url: "/clientes",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        cedula,
        nombres: "Reset",
        apellidos: "Test",
        telefono: "3000000000",
        sedeId: "sede-1",
      },
    });
    expect(clienteRes.statusCode).toBe(201);
    const clienteId = JSON.parse(clienteRes.body).id;

    const res = await app.inject({
      method: "POST",
      url: "/auth/reset-pin",
      headers: { authorization: `Bearer ${token}` },
      payload: { clienteId, newPin: "5678" },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.message).toContain("actualizado");
  });

  it("reset PIN sin autenticar retorna 401", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/reset-pin",
      payload: { clienteId: "cliente-1", newPin: "5678" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("reset PIN con PIN inválido retorna 400", async () => {
    const tokenRes = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "admin@clubbeasts.com", password: "admin123" },
    });
    const token = JSON.parse(tokenRes.body).token;

    const res = await app.inject({
      method: "POST",
      url: "/auth/reset-pin",
      headers: { authorization: `Bearer ${token}` },
      payload: { clienteId: "cliente-1", newPin: "abcd" },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("Auth - Endpoints protegidos", () => {
  it("acceder a clientes sin token retorna 401", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/clientes",
    });
    expect(res.statusCode).toBe(401);
  });

  it("acceder a clientes con token inválido retorna 401", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/clientes",
      headers: { authorization: "Bearer invalidtoken123" },
    });
    expect(res.statusCode).toBe(401);
  });
});
