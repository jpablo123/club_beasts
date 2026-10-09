import { Given, When, Then } from "@cucumber/cucumber";
import { expect } from "vitest";
import bcrypt from "bcryptjs";
import type { ApiWorld } from "../support/world";
import prisma from "../../src/lib/prisma";

let app: any = null;

async function getApp() {
  if (!app) {
    const Fastify = (await import("fastify")).default;
    const { default: prismaPlugin } = await import("../../src/plugins/prisma");
    const { default: authPlugin } = await import("../../src/plugins/auth");
    const { default: authRoutes } = await import("../../src/routes/auth");
    const { default: clienteRoutes } = await import("../../src/routes/clientes");

    app = Fastify();
    await app.register(prismaPlugin);
    await app.register(authPlugin);
    await app.register(authRoutes);
    await app.register(clienteRoutes);
    await app.ready();
  }
  return app;
}

Given(
  "un usuario registrado con email {string} y contraseña {string}",
  async function (this: ApiWorld, email: string, password: string) {
    this.email = email;
    this.password = password;
  }
);

When(
  "el usuario ingresa email {string} y contraseña {string}",
  async function (this: ApiWorld, email: string, password: string) {
    const server = await getApp();
    this.response = await server.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email, password },
    });
  }
);

Then("el sistema muestra un token JWT válido", function (this: ApiWorld) {
  expect(this.response.statusCode).toBe(200);
  const body = JSON.parse(this.response.body);
  expect(body.token).toBeDefined();
  expect(typeof body.token).toBe("string");
  this.token = body.token;
});

Then("el rol del usuario es {string}", function (this: ApiWorld, rol: string) {
  const body = JSON.parse(this.response.body);
  expect(body.user.rol).toBe(rol);
});

Then("el sistema muestra error {string}", function (this: ApiWorld, errorMsg: string) {
  expect(this.response.statusCode).toBeGreaterThanOrEqual(400);
  const body = JSON.parse(this.response.body);
  expect(body.error).toContain(errorMsg);
});

// Client login steps
Given(
  "un cliente registrado con cédula {string} y PIN {string}",
  async function (this: ApiWorld, cedula: string, pin: string) {
    this.cedula = cedula;
    this.pin = pin;
  }
);

When(
  "el cliente ingresa cédula {string} y PIN {string}",
  async function (this: ApiWorld, cedula: string, pin: string) {
    const server = await getApp();
    this.response = await server.inject({
      method: "POST",
      url: "/auth/login-cliente",
      payload: { cedula, pin },
    });
  }
);

Then("el sistema retorna los datos del cliente", function (this: ApiWorld) {
  const body = JSON.parse(this.response.body);
  expect(body.cliente).toBeDefined();
  expect(body.cliente.cedula).toBeDefined();
});

/**
 * R7/A13 - el paso original solo guardaba el id, asi que `POST /auth/reset-pin`
 * respondia 404 y el escenario fallaba aunque el runner arrancara. Ahora se
 * crea el cliente real con ese id exacto (fixture deterministico DEC-013); los
 * hooks `Before`/`After` de `world.ts` lo eliminan al terminar el escenario.
 */
Given("existe un cliente con id {string}", async function (this: ApiWorld, clienteId: string) {
  this.clienteId = clienteId;

  const hashedPin = await bcrypt.hash("1234", 10);
  await prisma.cliente.upsert({
    where: { id: clienteId },
    update: { pin: hashedPin, estado: "NUEVO" },
    create: {
      id: clienteId,
      cedula: "9999999999",
      nombres: "Cliente",
      apellidos: "Reset",
      telefono: "3001111111",
      sedeId: "sede-1",
      pin: hashedPin,
      estado: "NUEVO",
    },
  });
});

When(
  "restablezco el PIN del cliente {string} a {string}",
  async function (this: ApiWorld, clienteId: string, newPin: string) {
    const server = await getApp();
    this.response = await server.inject({
      method: "POST",
      url: "/auth/reset-pin",
      headers: { authorization: `Bearer ${this.token}` },
      payload: { clienteId, newPin },
    });
  }
);

Then(
  "el sistema muestra mensaje {string}",
  function (this: ApiWorld, message: string) {
    expect(this.response.statusCode).toBe(200);
    const body = JSON.parse(this.response.body);
    expect(body.message).toContain(message);
  }
);

When("intento restablecer PIN sin autenticación", async function (this: ApiWorld) {
  const server = await getApp();
  this.response = await server.inject({
    method: "POST",
    url: "/auth/reset-pin",
    payload: { clienteId: "cliente-1", newPin: "5678" },
  });
});
