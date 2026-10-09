import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import prisma from "../../src/lib/prisma";
import authRoutes from "../../src/routes/auth";
import clienteRoutes from "../../src/routes/clientes";
import prismaPlugin from "../../src/plugins/prisma";
import authPlugin from "../../src/plugins/auth";

/**
 * INC00-CLI-03: limpieza intencional de opcionales.
 *
 * `email` y `observaciones` se limpian de forma intencional:
 *  - `""` (y string en blanco) -> null
 *  - `null` -> null
 *  - campo omitido -> sin cambio
 */

let app: any;
let token: string;
let cedulaCounter = 7000;

function uniqueCedula(): string {
  cedulaCounter++;
  const base = `${Date.now()}`.slice(-6);
  return `${base}${cedulaCounter}`.slice(0, 10);
}

function parseBody(res: { body: string }) {
  return JSON.parse(res.body);
}

async function crearClienteConOpcionales(email: string, observaciones: string) {
  const res = await app.inject({
    method: "POST",
    url: "/clientes",
    headers: { authorization: `Bearer ${token}` },
    payload: {
      cedula: uniqueCedula(),
      nombres: "Opcional",
      apellidos: "Fixture",
      telefono: "3001234567",
      email,
      observaciones,
      sedeId: "sede-1",
    },
  });
  expect(res.statusCode).toBe(201);
  return parseBody(res).id as string;
}

async function patchCliente(clienteId: string, payload: Record<string, unknown>) {
  return app.inject({
    method: "PATCH",
    url: `/clientes/${clienteId}`,
    headers: { authorization: `Bearer ${token}` },
    payload,
  });
}

async function leerDeBd(clienteId: string) {
  return prisma.cliente.findUnique({
    where: { id: clienteId },
    select: { email: true, observaciones: true },
  });
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
  expect(res.statusCode).toBe(200);
  token = parseBody(res).token;
});

afterAll(async () => {
  await app.close();
});

describe("Clientes - INC00-CLI-03 limpieza intencional de opcionales", () => {
  it("email y observaciones vacios se limpian a null en respuesta y en BD", async () => {
    const clienteId = await crearClienteConOpcionales(
      "limpiar@test.com",
      "Observacion previa"
    );

    const res = await patchCliente(clienteId, {
      email: "",
      observaciones: "",
    });

    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.email).toBeNull();
    expect(body.observaciones).toBeNull();

    const enBd = await leerDeBd(clienteId);
    expect(enBd?.email).toBeNull();
    expect(enBd?.observaciones).toBeNull();
  });

  it("email y observaciones en blanco se limpian a null en respuesta y en BD", async () => {
    const clienteId = await crearClienteConOpcionales(
      "blanco@test.com",
      "Observacion previa en blanco"
    );

    const res = await patchCliente(clienteId, {
      email: "   ",
      observaciones: "   ",
    });

    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.email).toBeNull();
    expect(body.observaciones).toBeNull();

    const enBd = await leerDeBd(clienteId);
    expect(enBd?.email).toBeNull();
    expect(enBd?.observaciones).toBeNull();
  });

  it("email y observaciones null siguen limpiandose a null (comportamiento existente)", async () => {
    const clienteId = await crearClienteConOpcionales(
      "nulo@test.com",
      "Observacion previa nula"
    );

    const res = await patchCliente(clienteId, {
      email: null,
      observaciones: null,
    });

    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.email).toBeNull();
    expect(body.observaciones).toBeNull();

    const enBd = await leerDeBd(clienteId);
    expect(enBd?.email).toBeNull();
    expect(enBd?.observaciones).toBeNull();
  });

  it("un campo omitido no se modifica", async () => {
    const clienteId = await crearClienteConOpcionales(
      "omitido@test.com",
      "Observacion que no cambia"
    );

    const soloEmail = await patchCliente(clienteId, { email: "" });
    expect(soloEmail.statusCode).toBe(200);
    const cuerpoEmail = parseBody(soloEmail);
    expect(cuerpoEmail.email).toBeNull();
    expect(cuerpoEmail.observaciones).toBe("Observacion que no cambia");

    const soloTelefono = await patchCliente(clienteId, { telefono: "3009999999" });
    expect(soloTelefono.statusCode).toBe(200);
    const cuerpoTelefono = parseBody(soloTelefono);
    expect(cuerpoTelefono.telefono).toBe("3009999999");
    expect(cuerpoTelefono.email).toBeNull();
    expect(cuerpoTelefono.observaciones).toBe("Observacion que no cambia");

    const enBd = await leerDeBd(clienteId);
    expect(enBd?.email).toBeNull();
    expect(enBd?.observaciones).toBe("Observacion que no cambia");
  });
});
