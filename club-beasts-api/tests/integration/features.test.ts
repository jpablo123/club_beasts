import { describe, it, expect, beforeAll, afterAll } from "vitest";
import bcrypt from "bcryptjs";
import Fastify from "fastify";
import prisma from "../../src/lib/prisma";
import prismaPlugin from "../../src/plugins/prisma";
import authPlugin from "../../src/plugins/auth";
import authRoutes from "../../src/routes/auth";
import clienteRoutes from "../../src/routes/clientes";

let app: any;
let token: string;
let cedulaCounter = 2000;

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

describe("Feature: Autenticación", () => {
  describe("Scenario: Login exitoso del dueño", () => {
    it("Given un usuario registrado con email y contraseña", async () => {
      // INC00-QA-01: aserción real contra la BD de pruebas, no un expect(true)
      const admin = await prisma.user.findUnique({
        where: { email: "admin@clubbeasts.com" },
      });
      expect(admin).not.toBeNull();
      expect(admin?.rol).toBe("DUENO");
      expect(admin?.contrasena).not.toBe("admin123");
      const passwordOk = await bcrypt.compare(
        "admin123",
        admin?.contrasena ?? ""
      );
      expect(passwordOk).toBe(true);
      // El login del beforeAll con esas credenciales produjo un token real
      expect(token).toBeDefined();
    });

    it("When el usuario ingresa credenciales válidas", async () => {
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
  });

  describe("Scenario: Login fallido con contraseña incorrecta", () => {
    it("When el usuario ingresa contraseña incorrecta", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: "admin@clubbeasts.com", password: "wrongpassword" },
      });
      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.body);
      expect(body.error).toContain("Credenciales inválidas");
    });
  });

  describe("Scenario: Login del cliente con cédula y PIN", () => {
    it("When el cliente ingresa cédula y PIN válidos", async () => {
      const cedula = uniqueCedula();

      const createRes = await app.inject({
        method: "POST",
        url: "/clientes",
        headers: { authorization: `Bearer ${token}` },
        payload: {
          cedula,
          nombres: "Cucumber",
          apellidos: "Test",
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
  });

  describe("Scenario: Login del cliente con PIN inválido", () => {
    it("When el cliente ingresa PIN incorrecto", async () => {
      const cedula = uniqueCedula();

      await app.inject({
        method: "POST",
        url: "/clientes",
        headers: { authorization: `Bearer ${token}` },
        payload: {
          cedula,
          nombres: "Cucumber2",
          apellidos: "Test",
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
      expect(body.error).toContain("Cédula o PIN inválido");
    });
  });

  describe("Scenario: Login del cliente con PIN no numérico", () => {
    it("When el cliente ingresa PIN con letras", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/auth/login-cliente",
        payload: { cedula: "1234567890", pin: "abcd" },
      });
      expect(res.statusCode).toBe(400);
    });
  });
});

describe("Feature: Gestión de Clientes", () => {
  describe("Scenario: Crear un cliente nuevo", () => {
    it("When creo un cliente con datos válidos", async () => {
      const cedula = uniqueCedula();
      const res = await app.inject({
        method: "POST",
        url: "/clientes",
        headers: { authorization: `Bearer ${token}` },
        payload: {
          cedula,
          nombres: "Feature",
          apellidos: "Test",
          telefono: "3001234567",
          sedeId: "sede-1",
        },
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.estado).toBe("NUEVO");
      expect(body.pin).toBeUndefined();
    });
  });

  describe("Scenario: No permitir cédula duplicada", () => {
    it("When intento crear cliente con cédula existente", async () => {
      const cedula = uniqueCedula();

      await app.inject({
        method: "POST",
        url: "/clientes",
        headers: { authorization: `Bearer ${token}` },
        payload: {
          cedula,
          nombres: "First",
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
          nombres: "Second",
          apellidos: "Test",
          telefono: "3000000002",
          sedeId: "sede-1",
        },
      });
      expect(res.statusCode).toBe(409);
      const body = JSON.parse(res.body);
      expect(body.error).toContain("cédula");
    });
  });

  describe("Scenario: Editar información de un cliente", () => {
    it("When actualizo el teléfono del cliente", async () => {
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
        payload: { telefono: "3001112233" },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.telefono).toBe("3001112233");
    });
  });

  describe("Scenario: Buscar clientes por nombre", () => {
    it("When busco clientes con término de búsqueda", async () => {
      // INC00-QA-03: fixture con un cliente que SÍ coincide y uno que NO coincide
      const cedula = uniqueCedula();
      const excludedCedula = uniqueCedula();

      const includedRes = await app.inject({
        method: "POST",
        url: "/clientes",
        headers: { authorization: `Bearer ${token}` },
        payload: {
          cedula,
          nombres: "Searchable",
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
          nombres: "Notmatching",
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
        url: "/clientes?search=Searchable&limit=100",
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
  });

  describe("Scenario: Filtrar clientes por estado", () => {
    it("When filtro clientes por estado", async () => {
      // INC00-QA-03: fixture con un cliente NUEVO (incluido) y uno ACTIVO (excluido)
      const includedCedula = uniqueCedula();
      const excludedCedula = uniqueCedula();

      const includedRes = await app.inject({
        method: "POST",
        url: "/clientes",
        headers: { authorization: `Bearer ${token}` },
        payload: {
          cedula: includedCedula,
          nombres: "Filtroestado",
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
          cedula: excludedCedula,
          nombres: "Filtroestadoexcluido",
          apellidos: "Fixture",
          telefono: "3000000001",
          sedeId: "sede-1",
        },
      });
      expect(excludedRes.statusCode).toBe(201);
      const excludedId = JSON.parse(excludedRes.body).id;
      expect(excludedId).not.toBe(includedId);

      const patchRes = await app.inject({
        method: "PATCH",
        url: `/clientes/${excludedId}`,
        headers: { authorization: `Bearer ${token}` },
        // INC-04 / DEC-035: motivo obligatorio en el cambio de estado.
        payload: { estado: "ACTIVO", motivo: "Alta para prueba de filtro" },
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
  });

  describe("Scenario: Ver ficha única del cliente", () => {
    it("When consulto la ficha del cliente", async () => {
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
      expect(body.nombres).toBeDefined();
      expect(body.sede).toBeDefined();
      expect(body.estado).toBeDefined();
    });
  });
});
