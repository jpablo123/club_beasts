import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import prisma from "../../src/lib/prisma";
import authRoutes from "../../src/routes/auth";
import clienteRoutes from "../../src/routes/clientes";
import prismaPlugin from "../../src/plugins/prisma";
import authPlugin from "../../src/plugins/auth";

let app: any;
let token: string;
let recepToken: string;
let clienteToken: string;
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

  // INC00-CLI-02: recepcionista con permiso operativo sobre /clientes
  const recepRes = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email: "recep@clubbeasts.com", password: "recep123" },
  });
  expect(recepRes.statusCode).toBe(200);
  recepToken = JSON.parse(recepRes.body).token;

  // INC00-CLI-02: token de rol CLIENTE (no autorizado a editar)
  const clienteRes = await app.inject({
    method: "POST",
    url: "/clientes",
    headers: { authorization: `Bearer ${token}` },
    payload: {
      cedula: uniqueCedula(),
      nombres: "Cliente",
      apellidos: "Permiso",
      telefono: "3001234567",
      sedeId: "sede-1",
    },
  });
  expect(clienteRes.statusCode).toBe(201);
  const clienteCedula = JSON.parse(clienteRes.body).cedula;
  const clienteLoginRes = await app.inject({
    method: "POST",
    url: "/auth/login-cliente",
    payload: { cedula: clienteCedula, pin: "1234" },
  });
  expect(clienteLoginRes.statusCode).toBe(200);
  clienteToken = JSON.parse(clienteLoginRes.body).token;
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
    expect(body.error).toContain("Nombres solo pueden contener letras y espacios");
  });

  it("crear cliente con apellidos inválidos retorna 400 con mensaje de campo", async () => {
    // INC00-CLI-01: validación de apellidos con mensaje propio (HU-04 / C05)
    const res = await app.inject({
      method: "POST",
      url: "/clientes",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        cedula: uniqueCedula(),
        nombres: "Carlos",
        apellidos: "López123",
        telefono: "3000000000",
        sedeId: "sede-1",
      },
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error).toContain("Apellidos solo pueden contener letras y espacios");
  });

  it("crear cliente sin sedeId retorna 400", async () => {
    // INC00-CLI-01: validación de sede
    const res = await app.inject({
      method: "POST",
      url: "/clientes",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        cedula: uniqueCedula(),
        nombres: "Sin",
        apellidos: "Sede",
        telefono: "3000000000",
      },
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error).toContain("sedeId");
  });

  it("crear cliente con cédula con formato inválido retorna 400", async () => {
    // INC00-CLI-01: validación de cédula a nivel de ruta
    const res = await app.inject({
      method: "POST",
      url: "/clientes",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        cedula: "12345",
        nombres: "Cedula",
        apellidos: "Invalida",
        telefono: "3000000000",
        sedeId: "sede-1",
      },
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error).toContain("Cédula");
  });

  it("crear cliente con sedeId vacío retorna 400", async () => {
    // INC00-CLI-01: validación de sede
    const res = await app.inject({
      method: "POST",
      url: "/clientes",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        cedula: uniqueCedula(),
        nombres: "Sede",
        apellidos: "Vacia",
        telefono: "3000000000",
        sedeId: "",
      },
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error).toContain("sedeId");
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

  it("INC00-CLI-02 DUENO puede cambiar sedeId y estado", async () => {
    const cedula = uniqueCedula();
    const createRes = await app.inject({
      method: "POST",
      url: "/clientes",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        cedula,
        nombres: "Cambio",
        apellidos: "Dueño",
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
      payload: { sedeId: "sede-2", estado: "ACTIVO" },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.sedeId).toBe("sede-2");
    expect(body.estado).toBe("ACTIVO");
    expect(body.sede.id).toBe("sede-2");
  });

  it("INC00-CLI-02 RECEPCIONISTA puede cambiar sedeId y estado", async () => {
    const cedula = uniqueCedula();
    const createRes = await app.inject({
      method: "POST",
      url: "/clientes",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        cedula,
        nombres: "Cambio",
        apellidos: "Recepción",
        telefono: "3000000001",
        sedeId: "sede-1",
      },
    });
    expect(createRes.statusCode).toBe(201);
    const clienteId = JSON.parse(createRes.body).id;

    const res = await app.inject({
      method: "PATCH",
      url: `/clientes/${clienteId}`,
      headers: { authorization: `Bearer ${recepToken}` },
      payload: { sedeId: "sede-2", estado: "SUSPENDIDO" },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.sedeId).toBe("sede-2");
    expect(body.estado).toBe("SUSPENDIDO");
    expect(body.sede.id).toBe("sede-2");
  });

  it("INC00-CLI-02 CLIENTE recibe 403 AUTH_FORBIDDEN al editar", async () => {
    const cedula = uniqueCedula();
    const createRes = await app.inject({
      method: "POST",
      url: "/clientes",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        cedula,
        nombres: "Protegido",
        apellidos: "Cliente",
        telefono: "3000000002",
        sedeId: "sede-1",
      },
    });
    expect(createRes.statusCode).toBe(201);
    const clienteId = JSON.parse(createRes.body).id;

    const res = await app.inject({
      method: "PATCH",
      url: `/clientes/${clienteId}`,
      headers: { authorization: `Bearer ${clienteToken}` },
      payload: { sedeId: "sede-2", estado: "ACTIVO" },
    });
    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body);
    expect(body.code).toBe("AUTH_FORBIDDEN");

    const sinCambios = await app.inject({
      method: "GET",
      url: `/clientes/${clienteId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    const ficha = JSON.parse(sinCambios.body);
    expect(ficha.sedeId).toBe("sede-1");
    expect(ficha.estado).toBe("NUEVO");
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
  it("buscar por nombre incluye el cliente que coincide y excluye el que no", async () => {
    // INC00-QA-03: fixture con un resultado incluido y uno excluido
    const cedula = uniqueCedula();
    const excludedCedula = uniqueCedula();

    const includedRes = await app.inject({
      method: "POST",
      url: "/clientes",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        cedula,
        nombres: "Busqueda",
        apellidos: "Fixture",
        telefono: "3000000000",
        sedeId: "sede-1",
      },
    });
    expect(includedRes.statusCode).toBe(201);
    const includedId = JSON.parse(includedRes.body).id;

    const excludedRes = await app.inject({
      method: "POST",
      url: "/clientes",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        cedula: excludedCedula,
        nombres: "Sincoincidencia",
        apellidos: "Fixture",
        telefono: "3000000001",
        sedeId: "sede-1",
      },
    });
    expect(excludedRes.statusCode).toBe(201);
    const excludedId = JSON.parse(excludedRes.body).id;
    expect(excludedId).not.toBe(includedId);

    const res = await app.inject({
      method: "GET",
      url: "/clientes?search=Busqueda&limit=100",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    const ids = body.clientes.map((c: any) => c.id);
    expect(ids).toContain(includedId);
    expect(ids).not.toContain(excludedId);
    expect(body.clientes.length).toBeGreaterThan(0);
    expect(body.total).toBeGreaterThanOrEqual(1);
  });

  it("buscar por cédula incluye el cliente que coincide y excluye el que no", async () => {
    // INC00-CLI-04 / DEC-002: la cédula es el identificador principal del cliente
    const cedula = uniqueCedula();
    const excludedCedula = uniqueCedula();

    const includedRes = await app.inject({
      method: "POST",
      url: "/clientes",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        cedula,
        nombres: "Identidad",
        apellidos: "Fixture",
        telefono: "3000000000",
        sedeId: "sede-1",
      },
    });
    expect(includedRes.statusCode).toBe(201);
    const includedId = JSON.parse(includedRes.body).id;

    const excludedRes = await app.inject({
      method: "POST",
      url: "/clientes",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        cedula: excludedCedula,
        nombres: "Otraidentidad",
        apellidos: "Fixture",
        telefono: "3000000001",
        sedeId: "sede-1",
      },
    });
    expect(excludedRes.statusCode).toBe(201);
    const excludedId = JSON.parse(excludedRes.body).id;
    expect(excludedId).not.toBe(includedId);

    const res = await app.inject({
      method: "GET",
      url: `/clientes?search=${cedula}&limit=100`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    const ids = body.clientes.map((c: any) => c.id);
    expect(ids).toContain(includedId);
    expect(ids).not.toContain(excludedId);
    expect(body.clientes.length).toBeGreaterThan(0);
    body.clientes.forEach((c: any) => {
      expect(c.cedula).toContain(cedula);
    });
  });

  it("filtrar por sede incluye clientes de esa sede y excluye los de otra", async () => {
    // INC00-QA-03: fixture con un cliente en sede-1 (incluido) y uno en sede-2 (excluido)
    const includedRes = await app.inject({
      method: "POST",
      url: "/clientes",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        cedula: uniqueCedula(),
        nombres: "Sedecliente",
        apellidos: "Fixture",
        telefono: "3000000000",
        sedeId: "sede-1",
      },
    });
    expect(includedRes.statusCode).toBe(201);
    const includedId = JSON.parse(includedRes.body).id;

    const excludedRes = await app.inject({
      method: "POST",
      url: "/clientes",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        cedula: uniqueCedula(),
        nombres: "Sedexcluida",
        apellidos: "Fixture",
        telefono: "3000000001",
        sedeId: "sede-2",
      },
    });
    expect(excludedRes.statusCode).toBe(201);
    const excludedBody = JSON.parse(excludedRes.body);
    expect(excludedBody.sedeId).toBe("sede-2");
    const excludedId = excludedBody.id;

    const res = await app.inject({
      method: "GET",
      url: "/clientes?sedeId=sede-1&limit=100",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    const ids = body.clientes.map((c: any) => c.id);
    expect(ids).toContain(includedId);
    expect(ids).not.toContain(excludedId);
    expect(body.clientes.length).toBeGreaterThan(0);
    body.clientes.forEach((c: any) => {
      expect(c.sedeId).toBe("sede-1");
    });
  });

  it("filtrar por estado incluye clientes NUEVO y excluye los que no lo son", async () => {
    // INC00-QA-03: fixture con un cliente NUEVO (incluido) y uno ACTIVO (excluido)
    const includedRes = await app.inject({
      method: "POST",
      url: "/clientes",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        cedula: uniqueCedula(),
        nombres: "Estadocliente",
        apellidos: "Fixture",
        telefono: "3000000000",
        sedeId: "sede-1",
      },
    });
    expect(includedRes.statusCode).toBe(201);
    const includedBody = JSON.parse(includedRes.body);
    expect(includedBody.estado).toBe("NUEVO");
    const includedId = includedBody.id;

    const excludedRes = await app.inject({
      method: "POST",
      url: "/clientes",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        cedula: uniqueCedula(),
        nombres: "Estadoexcluido",
        apellidos: "Fixture",
        telefono: "3000000001",
        sedeId: "sede-1",
      },
    });
    expect(excludedRes.statusCode).toBe(201);
    const excludedId = JSON.parse(excludedRes.body).id;

    const patchRes = await app.inject({
      method: "PATCH",
      url: `/clientes/${excludedId}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { estado: "ACTIVO" },
    });
    expect(patchRes.statusCode).toBe(200);
    expect(JSON.parse(patchRes.body).estado).toBe("ACTIVO");

    const res = await app.inject({
      method: "GET",
      url: "/clientes?estado=NUEVO&limit=100",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    const ids = body.clientes.map((c: any) => c.id);
    expect(ids).toContain(includedId);
    expect(ids).not.toContain(excludedId);
    expect(body.clientes.length).toBeGreaterThan(0);
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

/**
 * INC00-CLI-01: la sede referenciada debe existir.
 * Regla: un sedeId inexistente responde 400 VALIDATION_ERROR con mensaje claro
 * y sin ningun detalle interno de Prisma (codigo P2003, rutas de archivo, stack).
 */
describe("Clientes - Validación de sede inexistente", () => {
  const SEDE_INEXISTENTE = "sede-que-no-existe";

  /** Ningún error de negocio puede filtrar detalles internos del motor. */
  function expectSinDetalleInterno(body: { error?: unknown; code?: unknown }) {
    expect(typeof body.error).toBe("string");
    expect((body.error as string).length).toBeGreaterThan(0);

    const texto = JSON.stringify(body);
    // codigo interno de Prisma (FK) y cualquier referencia al cliente de Prisma
    expect(texto).not.toMatch(/P20\d\d/);
    expect(texto).not.toMatch(/prisma/i);
    // rutas absolutas o rutas del proyecto
    expect(texto).not.toMatch(/[A-Za-z]:[\\/]/);
    expect(texto).not.toMatch(/[\\/]src[\\/]/);
    expect(texto).not.toMatch(/node_modules/);
    expect(texto).not.toMatch(/\.ts[:\d]/);
    // stack trace
    expect(texto).not.toMatch(/\bat\s+\S+\s+\(/);
    expect(texto).not.toMatch(/invoke|Foreign key constraint|Unique constraint/i);
  }

  it("POST /clientes con sedeId inexistente retorna 400 VALIDATION_ERROR sin detalle interno", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/clientes",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        cedula: uniqueCedula(),
        nombres: "Sin",
        apellidos: "Sede",
        telefono: "3000000000",
        sedeId: SEDE_INEXISTENTE,
      },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.code).toBe("VALIDATION_ERROR");
    expect(String(body.error)).toMatch(/sede/i);
    expectSinDetalleInterno(body);
  });

  it("PATCH /clientes/:id con sedeId inexistente retorna 400 VALIDATION_ERROR y no modifica el cliente", async () => {
    const cedula = uniqueCedula();
    const createRes = await app.inject({
      method: "POST",
      url: "/clientes",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        cedula,
        nombres: "Conservado",
        apellidos: "Intacto",
        telefono: "3001112222",
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
        nombres: "IntentoCambio",
        telefono: "3009998888",
        sedeId: SEDE_INEXISTENTE,
      },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.code).toBe("VALIDATION_ERROR");
    expect(String(body.error)).toMatch(/sede/i);
    expectSinDetalleInterno(body);

    // los demas campos del cliente quedan sin cambios
    const fichaRes = await app.inject({
      method: "GET",
      url: `/clientes/${clienteId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(fichaRes.statusCode).toBe(200);
    const ficha = JSON.parse(fichaRes.body);
    expect(ficha.sedeId).toBe("sede-1");
    expect(ficha.sede.id).toBe("sede-1");
    expect(ficha.nombres).toBe("Conservado");
    expect(ficha.apellidos).toBe("Intacto");
    expect(ficha.telefono).toBe("3001112222");
  });
});
