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

  it("buscar clientes incluye el termino coincidente y excluye el no coincidente", async () => {
    const termino = `Zqfilter${String(Date.now()).split("").map((d) => "abcdefghij"[Number(d)]).join("")}`;
    const cedulaIncluida = uniqueCedula();
    const cedulaExcluida = uniqueCedula();

    const incluidoRes = await app.inject({
      method: "POST",
      url: "/clientes",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        cedula: cedulaIncluida,
        nombres: termino,
        apellidos: "Incluido",
        telefono: "3001234567",
        sedeId: "sede-1",
      },
    });
    expect(incluidoRes.statusCode).toBe(201);

    const excluidoRes = await app.inject({
      method: "POST",
      url: "/clientes",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        cedula: cedulaExcluida,
        nombres: "Otro",
        apellidos: "Excluido",
        telefono: "3001234568",
        sedeId: "sede-1",
      },
    });
    expect(excluidoRes.statusCode).toBe(201);

    const res = await app.inject({
      method: "GET",
      url: `/clientes?search=${termino}&limit=100`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    const ids = body.clientes.map((c: any) => c.id);
    expect(body.clientes.length).toBeGreaterThan(0);
    expect(ids).toContain(JSON.parse(incluidoRes.body).id);
    expect(ids).not.toContain(JSON.parse(excluidoRes.body).id);
  });
});
