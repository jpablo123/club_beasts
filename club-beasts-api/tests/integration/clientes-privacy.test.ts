import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import bcrypt from "bcryptjs";
import prisma from "../../src/lib/prisma";
import authRoutes from "../../src/routes/auth";
import clienteRoutes from "../../src/routes/clientes";
import membresiaRoutes from "../../src/routes/membresia";
import prismaPlugin from "../../src/plugins/prisma";
import authPlugin from "../../src/plugins/auth";

const fixturePrefix = "inc00_privacy";
const ownerEmail = `${fixturePrefix}_dueno@clubbeasts.test`;
const receptionistEmail = `${fixturePrefix}_recep@clubbeasts.test`;
const clientACedula = "9100000001";
const clientBCedula = "9100000002";
const pin = "1234";

let app: any;
let ownerToken: string;
let receptionistToken: string;
let clientAToken: string;
let clientAId: string;
let clientBId: string;
let hashedPinFixture: string;

const bcryptHashPattern = /\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}/;

function parseBody(res: { body: string }) {
  return JSON.parse(res.body);
}

function expectNoSensitiveCredentialLeak(body: unknown) {
  const serialized = JSON.stringify(body);

  expect(serialized).not.toContain(hashedPinFixture);
  expect(serialized).not.toMatch(bcryptHashPattern);

  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }

    if (value && typeof value === "object") {
      for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
        expect(key).not.toBe("pin");
        expect(key).not.toBe("contrasena");
        visit(child);
      }
    }
  };

  visit(body);
}

async function cleanupFixtures() {
  const clientes = await prisma.cliente.findMany({
    where: { cedula: { in: [clientACedula, clientBCedula] } },
    select: { id: true },
  });
  const clienteIds = clientes.map((cliente) => cliente.id);
  const membresias = await prisma.membresiaGym.findMany({
    where: { clienteId: { in: clienteIds } },
    select: { id: true },
  });
  const membresiaIds = membresias.map((membresia) => membresia.id);

  await prisma.membresiaGymCambio.deleteMany({
    where: { membresiaId: { in: membresiaIds } },
  });
  await prisma.membresiaGym.deleteMany({
    where: { id: { in: membresiaIds } },
  });
  await prisma.cliente.deleteMany({
    where: { cedula: { in: [clientACedula, clientBCedula] } },
  });
  await prisma.user.deleteMany({
    where: { email: { in: [ownerEmail, receptionistEmail] } },
  });
}

async function loginUser(email: string, password: string) {
  const res = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email, password },
  });
  expect(res.statusCode).toBe(200);
  return JSON.parse(res.body).token as string;
}

async function loginClient(cedula: string) {
  const res = await app.inject({
    method: "POST",
    url: "/auth/login-cliente",
    payload: { cedula, pin },
  });
  expect(res.statusCode).toBe(200);
  return parseBody(res).token as string;
}

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? "inc00-client-privacy-secret";

  await cleanupFixtures();

  const [hashedOwnerPassword, hashedReceptionistPassword, hashedPin] = await Promise.all([
    bcrypt.hash("owner123", 10),
    bcrypt.hash("recep123", 10),
    bcrypt.hash(pin, 10),
  ]);
  hashedPinFixture = hashedPin;

  await prisma.sede.upsert({
    where: { id: `${fixturePrefix}_sede` },
    update: { nombre: "INC00 Privacidad" },
    create: { id: `${fixturePrefix}_sede`, nombre: "INC00 Privacidad" },
  });

  await prisma.user.createMany({
    data: [
      {
        email: ownerEmail,
        contrasena: hashedOwnerPassword,
        nombre: "Dueño INC00",
        rol: "DUENO",
      },
      {
        email: receptionistEmail,
        contrasena: hashedReceptionistPassword,
        nombre: "Recepción INC00",
        rol: "RECEPCIONISTA",
      },
    ],
  });

  const [clientA, clientB] = await Promise.all([
    prisma.cliente.create({
      data: {
        cedula: clientACedula,
        nombres: "Cliente A",
        apellidos: "Privado",
        telefono: "3001111111",
        email: "cliente.a.privado@clubbeasts.test",
        observaciones: "Observación privada A",
        sedeId: `${fixturePrefix}_sede`,
        pin: hashedPin,
        estado: "ACTIVO",
      },
    }),
    prisma.cliente.create({
      data: {
        cedula: clientBCedula,
        nombres: "Cliente B",
        apellidos: "Privado",
        telefono: "3002222222",
        email: "cliente.b.privado@clubbeasts.test",
        observaciones: "Observación privada B",
        sedeId: `${fixturePrefix}_sede`,
        pin: hashedPin,
        estado: "ACTIVO",
      },
    }),
  ]);

  clientAId = clientA.id;
  clientBId = clientB.id;

  app = Fastify();
  await app.register(prismaPlugin);
  await app.register(authPlugin);
  await app.register(authRoutes);
  await app.register(clienteRoutes);
  await app.register(membresiaRoutes);
  await app.ready();

  ownerToken = await loginUser(ownerEmail, "owner123");
  receptionistToken = await loginUser(receptionistEmail, "recep123");
  clientAToken = await loginClient(clientACedula);
});

afterAll(async () => {
  await app.close();
  await cleanupFixtures();
  await prisma.sede.deleteMany({ where: { id: `${fixturePrefix}_sede` } });
});

describe("INC00-SEC-01/02/03 privacidad de ficha de cliente", () => {
  it("INC00-SEC-01 INC00-SEC-03 permite a CLIENTE autenticado consultar solo su propia ficha sin exponer credenciales", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/clientes/${clientAId}`,
      headers: { authorization: `Bearer ${clientAToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.id).toBe(clientAId);
    expectNoSensitiveCredentialLeak(body);
  });

  it("INC00-SEC-02 retorna 403 sin datos privados cuando CLIENTE consulta ficha ajena", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/clientes/${clientBId}`,
      headers: { authorization: `Bearer ${clientAToken}` },
    });

    const body = parseBody(res);
    expect.soft(res.statusCode).toBe(403);
    expect.soft(body).not.toHaveProperty("cedula");
    expect.soft(body).not.toHaveProperty("telefono");
    expect.soft(body).not.toHaveProperty("email");
    expect.soft(body).not.toHaveProperty("observaciones");
    expectNoSensitiveCredentialLeak(body);
  });

  it("INC00-SEC-01 INC00-SEC-03 retorna 403 sin datos privados cuando CLIENTE intenta listar clientes", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/clientes",
      headers: { authorization: `Bearer ${clientAToken}` },
    });

    const body = parseBody(res);
    expect.soft(res.statusCode).toBe(403);
    expect.soft(body).not.toHaveProperty("clientes");
    expect.soft(body).not.toHaveProperty("total");
    expect.soft(body).not.toHaveProperty("cedula");
    expect.soft(body).not.toHaveProperty("telefono");
    expect.soft(body).not.toHaveProperty("email");
    expect.soft(body).not.toHaveProperty("observaciones");
    expectNoSensitiveCredentialLeak(body);
  });

  it("INC00-SEC-02 INC00-SEC-03 permite a DUENO consultar fichas de clientes sin exponer credenciales", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/clientes/${clientBId}`,
      headers: { authorization: `Bearer ${ownerToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.id).toBe(clientBId);
    expectNoSensitiveCredentialLeak(body);
  });

  it("INC00-SEC-02 INC00-SEC-03 permite a RECEPCIONISTA consultar fichas de clientes sin exponer credenciales", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/clientes/${clientBId}`,
      headers: { authorization: `Bearer ${receptionistToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.id).toBe(clientBId);
    expectNoSensitiveCredentialLeak(body);
  });

  it("INC00-SEC-03 no expone pin, hash bcrypt ni contrasena en respuesta exitosa de login-cliente", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login-cliente",
      payload: { cedula: clientACedula, pin },
    });

    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.cliente.id).toBe(clientAId);
    expectNoSensitiveCredentialLeak(body);
  });

  it("INC00-SEC-03 no expone pin, hash bcrypt ni contrasena en respuesta exitosa de membresia", async () => {
    const createRes = await app.inject({
      method: "POST",
      url: `/clientes/${clientAId}/membresias-gym`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { fechaInicio: "2030-01-01", fechaFin: "2030-01-30" },
    });

    expect(createRes.statusCode).toBe(201);
    const createdBody = parseBody(createRes);
    expect(createdBody.clienteId).toBe(clientAId);
    expectNoSensitiveCredentialLeak(createdBody);

    const listRes = await app.inject({
      method: "GET",
      url: `/clientes/${clientAId}/membresias-gym`,
      headers: { authorization: `Bearer ${ownerToken}` },
    });

    expect(listRes.statusCode).toBe(200);
    const listBody = parseBody(listRes);
    expect(listBody.membresias).toHaveLength(1);
    expectNoSensitiveCredentialLeak(listBody);
  });
});
