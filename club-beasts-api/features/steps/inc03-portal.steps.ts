import { When, Then } from "@cucumber/cucumber";
import { expect } from "vitest";
import {
  Inc03World,
  authHeaders,
  body,
  getInc03App,
  resolverFecha,
} from "./inc03-soporte";

/** Steps del portal del cliente (INC03-POR-01..07). Textos unicos. */

When("consulto mi resumen del portal", async function (this: Inc03World) {
  const server = await getInc03App();
  this.response = await server.inject({
    method: "GET",
    url: "/portal/resumen",
    headers: authHeaders(this.portalToken ?? this.token),
  });
});

When("consulto mi resumen del portal sin token", async function (this: Inc03World) {
  const server = await getInc03App();
  this.response = await server.inject({
    method: "GET",
    url: "/portal/resumen",
  });
});

When("consulto mi resumen del portal con token de staff", async function (this: Inc03World) {
  const server = await getInc03App();
  this.response = await server.inject({
    method: "GET",
    url: "/portal/resumen",
    headers: authHeaders(this.token),
  });
});

Then(
  "el portal responde con estadoAccesoGym {string}",
  function (this: Inc03World, estado: string) {
    expect(this.response.statusCode).toBe(200);
    const data = body(this.response);
    expect(data.estadoAccesoGym).toBe(estado);
  }
);

Then(
  "el portal responde con nombre completo {string}",
  function (this: Inc03World, nombreCompleto: string) {
    expect(this.response.statusCode).toBe(200);
    const data = body(this.response);
    expect(data.nombreCompleto).toBe(nombreCompleto);
  }
);

Then("el portal responde con la cédula del cliente de prueba", function (this: Inc03World) {
  expect(this.response.statusCode).toBe(200);
  const data = body(this.response);
  expect(data.cedula).toBe(this.cedulaFixture);
});

Then(
  "el portal responde con sede {string}",
  function (this: Inc03World, nombreSede: string) {
    expect(this.response.statusCode).toBe(200);
    const data = body(this.response);
    expect(data.sede).toBeDefined();
    expect(data.sede.nombre).toBe(nombreSede);
  }
);

Then(
  "el portal responde con fechaVencimiento {string}",
  function (this: Inc03World, token: string) {
    expect(this.response.statusCode).toBe(200);
    const data = body(this.response);
    expect(data.fechaVencimiento).toBe(resolverFecha(token));
  }
);

Then("el portal responde con fechaVencimiento nula", function (this: Inc03World) {
  expect(this.response.statusCode).toBe(200);
  const data = body(this.response);
  expect(data.fechaVencimiento).toBeNull();
});

Then(
  "el portal responde con congelacion de {string} a {string}",
  function (this: Inc03World, inicioToken: string, finToken: string) {
    expect(this.response.statusCode).toBe(200);
    const data = body(this.response);
    expect(data.congelacion).toBeDefined();
    expect(data.congelacion.fechaInicio).toBe(resolverFecha(inicioToken));
    expect(data.congelacion.fechaFin).toBe(resolverFecha(finToken));
  }
);
