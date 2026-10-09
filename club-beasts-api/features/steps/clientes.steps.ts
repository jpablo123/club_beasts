import { Given, When, Then } from "@cucumber/cucumber";
import { expect } from "vitest";
import type { ApiWorld } from "../support/world";

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

async function getAuthToken(): Promise<string> {
  const server = await getApp();
  const res = await server.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email: "admin@clubbeasts.com", password: "admin123" },
  });
  return JSON.parse(res.body).token;
}

Given("soy un usuario autenticado como DUENO", async function (this: ApiWorld) {
  this.token = await getAuthToken();
});

Given("existe un cliente con cédula {string}", async function (this: ApiWorld, cedula: string) {
  const server = await getApp();
  this.cedula = cedula;

  const res = await server.inject({
    method: "POST",
    url: "/clientes",
    headers: { authorization: `Bearer ${this.token}` },
    payload: {
      cedula,
      nombres: "Test",
      apellidos: "User",
      telefono: "3000000000",
      sedeId: "sede-1",
    },
  });

  if (res.statusCode === 201) {
    this.clienteId = JSON.parse(res.body).id;
  } else if (res.statusCode === 409) {
    const searchRes = await server.inject({
      method: "GET",
      url: `/clientes?search=${cedula}`,
      headers: { authorization: `Bearer ${this.token}` },
    });
    const body = JSON.parse(searchRes.body);
    if (body.clientes && body.clientes.length > 0) {
      this.clienteId = body.clientes[0].id;
    }
  }
});

When(
  "creo un cliente con cédula {string}, nombres {string}, apellidos {string}, teléfono {string} y sede {string}",
  async function (
    this: ApiWorld,
    cedula: string,
    nombres: string,
    apellidos: string,
    telefono: string,
    sedeId: string
  ) {
    const server = await getApp();
    // R7/C01: el escenario "Crear un cliente nuevo" verifica despues el PIN por
    // defecto con `this.cedula`; sin este asignacion el paso leia `undefined`.
    this.cedula = cedula;
    this.response = await server.inject({
      method: "POST",
      url: "/clientes",
      headers: { authorization: `Bearer ${this.token}` },
      payload: { cedula, nombres, apellidos, telefono, sedeId },
    });
  }
);

When(
  "creo un cliente con cédula {string}, nombres {string}, apellidos {string}, teléfono {string}, email {string} y sede {string}",
  async function (
    this: ApiWorld,
    cedula: string,
    nombres: string,
    apellidos: string,
    telefono: string,
    email: string,
    sedeId: string
  ) {
    const server = await getApp();
    this.cedula = cedula;
    this.response = await server.inject({
      method: "POST",
      url: "/clientes",
      headers: { authorization: `Bearer ${this.token}` },
      payload: { cedula, nombres, apellidos, telefono, email, sedeId },
    });
  }
);

Then("el cliente se crea con estado {string}", function (this: ApiWorld, estado: string) {
  expect(this.response.statusCode).toBe(201);
  const body = JSON.parse(this.response.body);
  expect(body.estado).toBe(estado);
  this.clienteId = body.id;
});

Then("el cliente tiene un PIN por defecto {string}", async function (this: ApiWorld, pin: string) {
  const server = await getApp();
  const res = await server.inject({
    method: "POST",
    url: "/auth/login-cliente",
    payload: { cedula: this.cedula, pin },
  });
  expect(res.statusCode).toBe(200);
});

When(
  "intento crear otro cliente con cédula {string}",
  async function (this: ApiWorld, cedula: string) {
    const server = await getApp();
    this.response = await server.inject({
      method: "POST",
      url: "/clientes",
      headers: { authorization: `Bearer ${this.token}` },
      payload: {
        cedula,
        nombres: "Duplicate",
        apellidos: "Test",
        telefono: "3000000000",
        sedeId: "sede-1",
      },
    });
  }
);

When("intento crear un cliente sin campos requeridos", async function (this: ApiWorld) {
  const server = await getApp();
  this.response = await server.inject({
    method: "POST",
    url: "/clientes",
    headers: { authorization: `Bearer ${this.token}` },
    payload: { cedula: "1111111111" },
  });
});

Then("el sistema muestra error de validación", function (this: ApiWorld) {
  expect(this.response.statusCode).toBe(400);
  const body = JSON.parse(this.response.body);
  expect(body.error).toBeDefined();
});

When(
  "actualizo el teléfono del cliente a {string}",
  async function (this: ApiWorld, telefono: string) {
    const server = await getApp();
    this.response = await server.inject({
      method: "PATCH",
      url: `/clientes/${this.clienteId}`,
      headers: { authorization: `Bearer ${this.token}` },
      payload: { telefono },
    });
  }
);

When(
  "actualizo el email del cliente a {string}",
  async function (this: ApiWorld, email: string) {
    const server = await getApp();
    this.response = await server.inject({
      method: "PATCH",
      url: `/clientes/${this.clienteId}`,
      headers: { authorization: `Bearer ${this.token}` },
      payload: { email },
    });
  }
);

Then(
  "el cliente tiene el teléfono actualizado {string}",
  function (this: ApiWorld, telefono: string) {
    expect(this.response.statusCode).toBe(200);
    const body = JSON.parse(this.response.body);
    expect(body.telefono).toBe(telefono);
  }
);

When("intento editar un cliente con id {string}", async function (this: ApiWorld, id: string) {
  const server = await getApp();
  this.response = await server.inject({
    method: "PATCH",
    url: `/clientes/${id}`,
    headers: { authorization: `Bearer ${this.token}` },
    payload: { telefono: "3009999999" },
  });
});

// R4: "el sistema retorna estado {int}" vive ahora solo en
// features/steps/comunes.steps.ts (definicion unica, sin ambiguedad).

Given("existen clientes registrados", async function (this: ApiWorld) {
  const server = await getApp();
  const uniqueCedula = `SEARCH${Date.now()}`;

  await server.inject({
    method: "POST",
    url: "/clientes",
    headers: { authorization: `Bearer ${this.token}` },
    payload: {
      cedula: uniqueCedula,
      nombres: "Carlos",
      apellidos: "García",
      telefono: "3000000000",
      sedeId: "sede-1",
    },
  });
});

When("busco clientes con el término {string}", async function (this: ApiWorld, searchTerm: string) {
  const server = await getApp();
  this.response = await server.inject({
    method: "GET",
    url: `/clientes?search=${searchTerm}`,
    headers: { authorization: `Bearer ${this.token}` },
  });
});

Then(
  "el sistema retorna clientes cuyo nombre o apellido contiene {string}",
  function (this: ApiWorld, searchTerm: string) {
    expect(this.response.statusCode).toBe(200);
    const body = JSON.parse(this.response.body);
    expect(body.clientes.length).toBeGreaterThan(0);
    body.clientes.forEach((c: any) => {
      const match =
        c.nombres.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.apellidos.toLowerCase().includes(searchTerm.toLowerCase());
      expect(match).toBe(true);
    });
  }
);

Given("existen clientes con diferentes estados", async function (this: ApiWorld) {
  const server = await getApp();
  const uniqueCedula = `EST${Date.now()}`;

  await server.inject({
    method: "POST",
    url: "/clientes",
    headers: { authorization: `Bearer ${this.token}` },
    payload: {
      cedula: uniqueCedula,
      nombres: "Estado",
      apellidos: "Test",
      telefono: "3000000000",
      sedeId: "sede-1",
    },
  });
});

When("filtro clientes por estado {string}", async function (this: ApiWorld, estado: string) {
  const server = await getApp();
  this.response = await server.inject({
    method: "GET",
    url: `/clientes?estado=${estado}`,
    headers: { authorization: `Bearer ${this.token}` },
  });
});

Then("el sistema retorna solo clientes con estado {string}", function (this: ApiWorld, estado: string) {
  expect(this.response.statusCode).toBe(200);
  const body = JSON.parse(this.response.body);
  body.clientes.forEach((c: any) => {
    expect(c.estado).toBe(estado);
  });
});

Given("existen clientes en diferentes sedes", async function (this: ApiWorld) {
  const server = await getApp();
  const uniqueCedula = `SEDE${Date.now()}`;

  await server.inject({
    method: "POST",
    url: "/clientes",
    headers: { authorization: `Bearer ${this.token}` },
    payload: {
      cedula: uniqueCedula,
      nombres: "Sede",
      apellidos: "Test",
      telefono: "3000000000",
      sedeId: "sede-1",
    },
  });
});

When("filtro clientes por sede {string}", async function (this: ApiWorld, sedeId: string) {
  const server = await getApp();
  this.response = await server.inject({
    method: "GET",
    url: `/clientes?sedeId=${sedeId}`,
    headers: { authorization: `Bearer ${this.token}` },
  });
});

Then(
  "el sistema retorna solo clientes de la sede {string}",
  function (this: ApiWorld, sedeId: string) {
    expect(this.response.statusCode).toBe(200);
    const body = JSON.parse(this.response.body);
    body.clientes.forEach((c: any) => {
      expect(c.sedeId).toBe(sedeId);
    });
  }
);

Given("existen múltiples clientes registrados", async function (this: ApiWorld) {
  const server = await getApp();
  for (let i = 0; i < 3; i++) {
    await server.inject({
      method: "POST",
      url: "/clientes",
      headers: { authorization: `Bearer ${this.token}` },
      payload: {
        cedula: `MULTI${Date.now()}${i}`,
        nombres: `Cliente${i}`,
        apellidos: "Test",
        telefono: "3000000000",
        sedeId: "sede-1",
      },
    });
  }
});

When(
  "busco clientes con página {string} y límite {string}",
  async function (this: ApiWorld, page: string, limit: string) {
    const server = await getApp();
    this.response = await server.inject({
      method: "GET",
      url: `/clientes?page=${page}&limit=${limit}`,
      headers: { authorization: `Bearer ${this.token}` },
    });
  }
);

Then(
  "el sistema retorna máximo {int} clientes",
  function (this: ApiWorld, limit: number) {
    const body = JSON.parse(this.response.body);
    expect(body.clientes.length).toBeLessThanOrEqual(limit);
  }
);

Then("el sistema indica el total de registros", function (this: ApiWorld) {
  const body = JSON.parse(this.response.body);
  expect(body.total).toBeDefined();
  expect(typeof body.total).toBe("number");
});

When("consulto la ficha del cliente", async function (this: ApiWorld) {
  const server = await getApp();
  this.response = await server.inject({
    method: "GET",
    url: `/clientes/${this.clienteId}`,
    headers: { authorization: `Bearer ${this.token}` },
  });
});

When(
  "consulto la ficha del cliente con id {string}",
  async function (this: ApiWorld, id: string) {
    const server = await getApp();
    this.response = await server.inject({
      method: "GET",
      url: `/clientes/${id}`,
      headers: { authorization: `Bearer ${this.token}` },
    });
  }
);

Then(
  "la ficha muestra datos personales, sede y estado",
  function (this: ApiWorld) {
    expect(this.response.statusCode).toBe(200);
    const body = JSON.parse(this.response.body);
    expect(body.nombres).toBeDefined();
    expect(body.apellidos).toBeDefined();
    expect(body.sede).toBeDefined();
    expect(body.estado).toBeDefined();
  }
);

When("intento consultar ficha sin autenticación", async function (this: ApiWorld) {
  const server = await getApp();
  this.response = await server.inject({
    method: "GET",
    url: `/clientes/cliente-1`,
  });
});
