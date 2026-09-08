import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import prisma from "../../src/lib/prisma";
import authRoutes from "../../src/routes/auth";
import clienteRoutes from "../../src/routes/clientes";
import prismaPlugin from "../../src/plugins/prisma";
import authPlugin from "../../src/plugins/auth";

let app: any;
let cedulaCounter = 3000;

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

describe("Auth", () => {
  it("login dueño con credenciales válidas", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "admin@clubbeasts.com", password: "admin123" },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.token).toBeDefined();
    expect(body.user.rol).toBe("DUENO");
  });

  it("login fallido con credenciales inválidas", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "admin@clubbeasts.com", password: "wrong" },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe("Clientes", () => {
  let token: string;

  beforeAll(async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "admin@clubbeasts.com", password: "admin123" },
    });
    token = JSON.parse(res.body).token;
  });

  it("crear cliente", async () => {
    const cedula = uniqueCedula();
    const res = await app.inject({
      method: "POST",
      url: "/clientes",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        cedula,
        nombres: "Juan",
        apellidos: "Pérez",
        telefono: "3001234567",
        sedeId: "sede-1",
      },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.cedula).toBe(cedula);
    expect(body.estado).toBe("NUEVO");
  });

  it("buscar clientes", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/clientes",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.clientes.length).toBeGreaterThan(0);
  });
});
