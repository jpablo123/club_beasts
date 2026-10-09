import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import bcrypt from "bcryptjs";
import prisma from "../../src/lib/prisma";
import authRoutes from "../../src/routes/auth";
import clienteRoutes from "../../src/routes/clientes";
import prismaPlugin from "../../src/plugins/prisma";
import authPlugin from "../../src/plugins/auth";

/**
 * INC00-SEC-04 (GAP-002): trazabilidad del reset de PIN.
 *
 * Cubre:
 *  a) DUENO autenticado queda registrado como actor (pinResetPorId) con fecha (pinResetAt).
 *  b) Trazabilidad funcional: el cliente entra con el PIN nuevo; el viejo deja de servir (401).
 *  c) RECEPCIONISTA tambien queda registrado como actor.
 *  d) Ninguna respuesta expone el hash de PIN.
 */

const fixturePrefix = "inc00_reset_trace";
const ownerEmail = `${fixturePrefix}_dueno@clubbeasts.test`;
const receptionistEmail = `${fixturePrefix}_recep@clubbeasts.test`;
const ownerClientCedula = "9300000001";
const receptionistClientCedula = "9300000002";
const oldPin = "1234";
const newPin = "9876";

let app: any;
let ownerToken: string;
let receptionistToken: string;
let ownerUserId: string;
let receptionistUserId: string;
let ownerClientId: string;
let receptionistClientId: string;

const bcryptHashPattern = /\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}/;

function parseBody(res: { body: string }) {
  return JSON.parse(res.body);
}

async function expectNoSensitiveCredentialLeak(body: unknown) {
  const clientes = await prisma.cliente.findMany({
    where: { cedula: { in: [ownerClientCedula, receptionistClientCedula] } },
    select: { pin: true },
  });
  const currentHashes = clientes.map((cliente) => cliente.pin);
  const serialized = JSON.stringify(body);

  expect(currentHashes.length).toBeGreaterThan(0);
  for (const hash of currentHashes) {
    expect(serialized).not.toContain(hash);
  }
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
  await prisma.cliente.deleteMany({
    where: { cedula: { in: [ownerClientCedula, receptionistClientCedula] } },
  });
  await prisma.user.deleteMany({
    where: { email: { in: [ownerEmail, receptionistEmail] } },
  });
  await prisma.sede.deleteMany({ where: { id: `${fixturePrefix}_sede` } });
}

async function loginStaff(email: string, password: string) {
  const res = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email, password },
  });
  expect(res.statusCode).toBe(200);
  return parseBody(res).token as string;
}

async function loginCliente(cedula: string, pin: string) {
  return app.inject({
    method: "POST",
    url: "/auth/login-cliente",
    payload: { cedula, pin },
  });
}

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? "inc00-reset-trace-secret";

  await cleanupFixtures();

  const [hashedOwnerPassword, hashedReceptionistPassword, hashedPin] = await Promise.all([
    bcrypt.hash("owner123", 10),
    bcrypt.hash("recep123", 10),
    bcrypt.hash(oldPin, 10),
  ]);

  await prisma.sede.create({
    data: { id: `${fixturePrefix}_sede`, nombre: "INC00 Reset Trace" },
  });

  const [ownerUser, receptionistUser] = await Promise.all([
    prisma.user.create({
      data: {
        email: ownerEmail,
        contrasena: hashedOwnerPassword,
        nombre: "Dueño Reset",
        rol: "DUENO",
      },
    }),
    prisma.user.create({
      data: {
        email: receptionistEmail,
        contrasena: hashedReceptionistPassword,
        nombre: "Recepción Reset",
        rol: "RECEPCIONISTA",
      },
    }),
  ]);
  ownerUserId = ownerUser.id;
  receptionistUserId = receptionistUser.id;

  const [ownerClient, receptionistClient] = await Promise.all([
    prisma.cliente.create({
      data: {
        cedula: ownerClientCedula,
        nombres: "Cliente",
        apellidos: "Dueño",
        telefono: "3001111111",
        sedeId: `${fixturePrefix}_sede`,
        pin: hashedPin,
        estado: "ACTIVO",
      },
    }),
    prisma.cliente.create({
      data: {
        cedula: receptionistClientCedula,
        nombres: "Cliente",
        apellidos: "Recepción",
        telefono: "3002222222",
        sedeId: `${fixturePrefix}_sede`,
        pin: hashedPin,
        estado: "ACTIVO",
      },
    }),
  ]);
  ownerClientId = ownerClient.id;
  receptionistClientId = receptionistClient.id;

  app = Fastify();
  await app.register(prismaPlugin);
  await app.register(authPlugin);
  await app.register(authRoutes);
  await app.register(clienteRoutes);
  await app.ready();

  ownerToken = await loginStaff(ownerEmail, "owner123");
  receptionistToken = await loginStaff(receptionistEmail, "recep123");
});

afterAll(async () => {
  await app.close();
  await cleanupFixtures();
});

describe("INC00-SEC-04 trazabilidad del reset de PIN", () => {
  it("INC00-SEC-04 el reset del DUENO persiste pinResetPorId y pinResetAt en la BD", async () => {
    const antes = await prisma.cliente.findUnique({
      where: { id: ownerClientId },
      select: { pinResetPorId: true, pinResetAt: true },
    });
    expect(antes?.pinResetPorId).toBeNull();
    expect(antes?.pinResetAt).toBeNull();

    const res = await app.inject({
      method: "POST",
      url: "/auth/reset-pin",
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { clienteId: ownerClientId, newPin },
    });

    expect(res.statusCode).toBe(200);
    // El contrato HTTP no cambia (escenario Gherkin A13).
    expect(parseBody(res)).toEqual({ message: "PIN actualizado correctamente" });

    const despues = await prisma.cliente.findUnique({
      where: { id: ownerClientId },
      select: { pinResetPorId: true, pinResetAt: true, debeCambiarPin: true },
    });
    expect(despues?.pinResetPorId).toBe(ownerUserId);
    expect(despues?.pinResetAt).not.toBeNull();
    expect(despues?.debeCambiarPin).toBe(false);
  });

  it("INC00-SEC-04 trazabilidad funcional: el cliente entra con el PIN nuevo y el viejo deja de servir", async () => {
    const ok = await loginCliente(ownerClientCedula, newPin);
    expect(ok.statusCode).toBe(200);
    const okBody = parseBody(ok);
    expect(okBody.token).toBeDefined();
    expect(okBody.cliente.cedula).toBe(ownerClientCedula);

    const ko = await loginCliente(ownerClientCedula, oldPin);
    expect(ko.statusCode).toBe(401);
    expect(parseBody(ko).code).toBe("AUTH_INVALID_CREDENTIALS");
  });

  it("INC00-SEC-04 el reset del RECEPCIONISTA persiste su id como actor con fecha", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/reset-pin",
      headers: { authorization: `Bearer ${receptionistToken}` },
      payload: { clienteId: receptionistClientId, newPin },
    });

    expect(res.statusCode).toBe(200);
    expect(parseBody(res)).toEqual({ message: "PIN actualizado correctamente" });

    const despues = await prisma.cliente.findUnique({
      where: { id: receptionistClientId },
      select: { pinResetPorId: true, pinResetAt: true },
    });
    expect(despues?.pinResetPorId).toBe(receptionistUserId);
    expect(despues?.pinResetAt).not.toBeNull();

    const ok = await loginCliente(receptionistClientCedula, newPin);
    expect(ok.statusCode).toBe(200);

    const ko = await loginCliente(receptionistClientCedula, oldPin);
    expect(ko.statusCode).toBe(401);
    expect(parseBody(ko).code).toBe("AUTH_INVALID_CREDENTIALS");
  });

  it("INC00-SEC-03 INC00-SEC-04 ninguna respuesta expone el hash de PIN", async () => {
    const resetRes = await app.inject({
      method: "POST",
      url: "/auth/reset-pin",
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { clienteId: ownerClientId, newPin },
    });
    expect(resetRes.statusCode).toBe(200);
    await expectNoSensitiveCredentialLeak(parseBody(resetRes));

    const loginOkRes = await loginCliente(ownerClientCedula, newPin);
    expect(loginOkRes.statusCode).toBe(200);
    await expectNoSensitiveCredentialLeak(parseBody(loginOkRes));

    const loginKoRes = await loginCliente(ownerClientCedula, oldPin);
    expect(loginKoRes.statusCode).toBe(401);
    await expectNoSensitiveCredentialLeak(parseBody(loginKoRes));
  });
});
