import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import prisma from "../../src/lib/prisma";
import authRoutes from "../../src/routes/auth";
import clienteRoutes from "../../src/routes/clientes";
import prismaPlugin from "../../src/plugins/prisma";
import authPlugin from "../../src/plugins/auth";

let app: any;
let token: string;
let cedulaCounter = 1000;

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

  const res = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email: "admin@clubbeasts.com", password: "admin123" },
  });
  token = JSON.parse(res.body).token;
});

afterAll(async () => {
  await app.close();
});

describe("Clientes - Crear", () => {
  it("crear cliente exitoso retorna 201", async () => {
    const cedula = uniqueCedula();
    const res = await app.inject({
      method: "POST",
      url: "/clientes",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        cedula,
        nombres: "Carlos",
        apellidos: "López",
        telefono: "3001234567",
        sedeId: "sede-1",
      },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.cedula).toBe(cedula);
    expect(body.nombres).toBe("Carlos");
    expect(body.apellidos).toBe("López");
    expect(body.estado).toBe("NUEVO");
    expect(body.sedeId).toBe("sede-1");
  });

  it("crear cliente con cédula duplicada retorna 409", async () => {
    const cedula = uniqueCedula();

    await app.inject({
      method: "POST",
      url: "/clientes",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        cedula,
        nombres: "Primero",
        apellidos: "Test",
        telefono: "3000000001",
        sedeId: "sede-1",
      },
    });

    const res = await app.inject({
      method: "POST",
      url: "/clientes",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        cedula,
        nombres: "Segundo",
        apellidos: "Test",
        telefono: "3000000002",
        sedeId: "sede-1",
      },
    });
    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.body);
    expect(body.error).toContain("cédula");
  });

  it("crear cliente sin campos requeridos retorna 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/clientes",
      headers: { authorization: `Bearer ${token}` },
      payload: { cedula: "1111111111" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("crear cliente sin autenticar retorna 401", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/clientes",
      payload: {
        cedula: uniqueCedula(),
        nombres: "Test",
        apellidos: "Test",
        telefono: "3000000000",
        sedeId: "sede-1",
      },
    });
    expect(res.statusCode).toBe(401);
  });

  it("crear cliente con teléfono inválido retorna 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/clientes",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        cedula: uniqueCedula(),
        nombres: "Test",
        apellidos: "Test",
        telefono: "2001234567",
        sedeId: "sede-1",
      },
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error).toContain("Teléfono");
  });

  it("crear cliente con nombres inválidos retorna 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/clientes",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        cedula: uniqueCedula(),
        nombres: "Carlos123",
        apellidos: "Test",
        telefono: "3000000000",
        sedeId: "sede-1",
      },
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error).toContain("letras");
  });
});

describe("Clientes - Editar", () => {
  it("editar cliente exitoso retorna 200", async () => {
    const cedula = uniqueCedula();

    const createRes = await app.inject({
      method: "POST",
      url: "/clientes",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        cedula,
        nombres: "Editable",
        apellidos: "Test",
        telefono: "3000000000",
        sedeId: "sede-1",
      },
    });
    expect(createRes.statusCode).toBe(201);
    const clienteId = JSON.parse(createRes.body).id;

    const res = await app.inject({
      method: "PATCH",
      url: `/clientes/${clienteId}`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        telefono: "3009999999",
        email: "editado@test.com",
      },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.telefono).toBe("3009999999");
    expect(body.email).toBe("editado@test.com");
  });

  it("editar cliente inexistente retorna 404", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/clientes/nonexistent-id",
      headers: { authorization: `Bearer ${token}` },
      payload: { telefono: "3009999999" },
    });
    expect(res.statusCode).toBe(404);
  });

  it("editar cliente con teléfono inválido retorna 400", async () => {
    const cedula = uniqueCedula();

    const createRes = await app.inject({
      method: "POST",
      url: "/clientes",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        cedula,
        nombres: "Test",
        apellidos: "Test",
        telefono: "3000000000",
        sedeId: "sede-1",
      },
    });
    expect(createRes.statusCode).toBe(201);
    const clienteId = JSON.parse(createRes.body).id;

    const res = await app.inject({
      method: "PATCH",
      url: `/clientes/${clienteId}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { telefono: "2001234567" },
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error).toContain("Teléfono");
  });

  it("editar cliente con email null (viene de BD) retorna 200", async () => {
    const cedula = uniqueCedula();

    const createRes = await app.inject({
      method: "POST",
      url: "/clientes",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        cedula,
        nombres: "NullTest",
        apellidos: "Test",
        telefono: "3000000000",
        sedeId: "sede-1",
      },
    });
    expect(createRes.statusCode).toBe(201);
    const clienteId = JSON.parse(createRes.body).id;

    const res = await app.inject({
      method: "PATCH",
      url: `/clientes/${clienteId}`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        telefono: "3009999999",
        email: null,
        observaciones: null,
      },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.telefono).toBe("3009999999");
  });

  it("editar cliente con solo campos obligatorios retorna 200", async () => {
    const cedula = uniqueCedula();

    const createRes = await app.inject({
      method: "POST",
      url: "/clientes",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        cedula,
        nombres: "Minimal",
        apellidos: "Test",
        telefono: "3000000000",
        sedeId: "sede-1",
      },
    });
    expect(createRes.statusCode).toBe(201);
    const clienteId = JSON.parse(createRes.body).id;

    const res = await app.inject({
      method: "PATCH",
      url: `/clientes/${clienteId}`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        nombres: "MinimalUpdated",
      },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.nombres).toBe("MinimalUpdated");
  });
});

describe("Clientes - Ficha", () => {
  it("obtener ficha de cliente retorna 200 con datos", async () => {
    const cedula = uniqueCedula();

    const createRes = await app.inject({
      method: "POST",
      url: "/clientes",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        cedula,
        nombres: "Ficha",
        apellidos: "Test",
        telefono: "3000000000",
        sedeId: "sede-1",
      },
    });
    expect(createRes.statusCode).toBe(201);
    const clienteId = JSON.parse(createRes.body).id;

    const res = await app.inject({
      method: "GET",
      url: `/clientes/${clienteId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.id).toBe(clienteId);
    expect(body.nombres).toBe("Ficha");
    expect(body.sede).toBeDefined();
    expect(body.sede.nombre).toBeDefined();
  });

  it("obtener ficha de cliente inexistente retorna 404", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/clientes/nonexistent-id",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(404);
  });
});

describe("Clientes - Búsqueda y Filtros", () => {
  it("buscar por nombre retorna resultados", async () => {
    const cedula = uniqueCedula();

    await app.inject({
      method: "POST",
      url: "/clientes",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        cedula,
        nombres: "Busqueda",
        apellidos: "Test",
        telefono: "3000000000",
        sedeId: "sede-1",
      },
    });

    const res = await app.inject({
      method: "GET",
      url: "/clientes?search=Busqueda",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.clientes.length).toBeGreaterThan(0);
    expect(body.total).toBeGreaterThan(0);
  });

  it("filtrar por sede retorna solo clientes de esa sede", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/clientes?sedeId=sede-1",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    body.clientes.forEach((c: any) => {
      expect(c.sedeId).toBe("sede-1");
    });
  });

  it("filtrar por estado retorna solo clientes de ese estado", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/clientes?estado=NUEVO",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    body.clientes.forEach((c: any) => {
      expect(c.estado).toBe("NUEVO");
    });
  });

  it("paginación funciona correctamente", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/clientes?page=1&limit=2",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.page).toBe(1);
    expect(body.limit).toBe(2);
    expect(body.clientes.length).toBeLessThanOrEqual(2);
  });

  it("paginación con page inválido retorna 400", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/clientes?page=0",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(400);
  });

  it("filtrar con estado inválido retorna 400", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/clientes?estado=ESTADO_INVALIDO",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(400);
  });
});
