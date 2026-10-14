import { When, Then } from "@cucumber/cucumber";
import { expect } from "vitest";
import {
  Inc03World,
  authHeaders,
  body,
  getInc03App,
  resolverFecha,
} from "./inc03-soporte";

/** Steps de consulta de recepción (INC03-REC-01..10). Textos unicos. */

When(
  "consulto en recepción la cédula del cliente de prueba",
  async function (this: Inc03World) {
    if (!this.cedulaFixture) throw new Error("falta la cédula del cliente de prueba");
    const server = await getInc03App();
    this.response = await server.inject({
      method: "GET",
      url: `/recepcion/consulta?cedula=${encodeURIComponent(this.cedulaFixture)}`,
      headers: authHeaders(this.token),
    });
  }
);

When(
  "consulto en recepción la cédula {string}",
  async function (this: Inc03World, cedula: string) {
    const server = await getInc03App();
    this.response = await server.inject({
      method: "GET",
      url: `/recepcion/consulta?cedula=${encodeURIComponent(cedula)}`,
      headers: authHeaders(this.token),
    });
  }
);

When(
  "consulto en recepción la cédula {string} sin token",
  async function (this: Inc03World, cedula: string) {
    const server = await getInc03App();
    this.response = await server.inject({
      method: "GET",
      url: `/recepcion/consulta?cedula=${encodeURIComponent(cedula)}`,
    });
  }
);

When(
  "consulto en recepción la cédula del cliente de prueba con token de portal",
  async function (this: Inc03World) {
    if (!this.cedulaFixture) throw new Error("falta la cédula del cliente de prueba");
    const server = await getInc03App();
    this.response = await server.inject({
      method: "GET",
      url: `/recepcion/consulta?cedula=${encodeURIComponent(this.cedulaFixture)}`,
      headers: authHeaders(this.portalToken),
    });
  }
);

Then(
  "la consulta de recepción responde con estadoAccesoGym {string}",
  function (this: Inc03World, estado: string) {
    expect(this.response.statusCode).toBe(200);
    const data = body(this.response);
    expect(data.estadoAccesoGym).toBe(estado);
  }
);

Then(
  "la consulta de recepción responde con nombre completo {string}",
  function (this: Inc03World, nombreCompleto: string) {
    expect(this.response.statusCode).toBe(200);
    const data = body(this.response);
    expect(data.nombreCompleto).toBe(nombreCompleto);
  }
);

Then(
  "la consulta de recepción responde con la cédula del cliente de prueba",
  function (this: Inc03World) {
    expect(this.response.statusCode).toBe(200);
    const data = body(this.response);
    expect(data.cedula).toBe(this.cedulaFixture);
  }
);

Then(
  "la consulta de recepción responde con sede {string}",
  function (this: Inc03World, nombreSede: string) {
    expect(this.response.statusCode).toBe(200);
    const data = body(this.response);
    expect(data.sede).toBeDefined();
    expect(data.sede.nombre).toBe(nombreSede);
  }
);

Then(
  "la consulta de recepción responde con fechaVencimiento {string}",
  function (this: Inc03World, token: string) {
    expect(this.response.statusCode).toBe(200);
    const data = body(this.response);
    expect(data.fechaVencimiento).toBe(resolverFecha(token));
  }
);

Then("la consulta de recepción responde con foto nula", function (this: Inc03World) {
  expect(this.response.statusCode).toBe(200);
  const data = body(this.response);
  expect(data.foto).toBeNull();
});

Then(
  "la consulta de recepción responde con congelacion de {string} a {string}",
  function (this: Inc03World, inicioToken: string, finToken: string) {
    expect(this.response.statusCode).toBe(200);
    const data = body(this.response);
    expect(data.congelacion).toBeDefined();
    expect(data.congelacion.fechaInicio).toBe(resolverFecha(inicioToken));
    expect(data.congelacion.fechaFin).toBe(resolverFecha(finToken));
  }
);

Then(
  "la consulta de recepción responde con último ingreso nulo",
  function (this: Inc03World) {
    expect(this.response.statusCode).toBe(200);
    const data = body(this.response);
    expect(data.ultimoIngreso).toBeNull();
  }
);

Then(
  "la consulta de recepción responde con último ingreso del día {string} en sede {string}",
  function (this: Inc03World, tokenFecha: string, sedeId: string) {
    expect(this.response.statusCode).toBe(200);
    const data = body(this.response);
    expect(data.ultimoIngreso).toBeDefined();
    expect(data.ultimoIngreso.fecha).toBe(resolverFecha(tokenFecha));
    expect(data.ultimoIngreso.sede.id).toBe(sedeId);
  }
);

Then(
  "la consulta de recepción responde con alerta {string}",
  function (this: Inc03World, codigo: string) {
    expect(this.response.statusCode).toBe(200);
    const data = body(this.response);
    expect(Array.isArray(data.alertas)).toBe(true);
    const alerta = data.alertas.find((a: any) => a.codigo === codigo);
    expect(alerta).toBeDefined();
    expect(typeof alerta.mensaje).toBe("string");
    expect(alerta.mensaje.length).toBeGreaterThan(0);
  }
);

Then(
  "la consulta de recepción responde sin alertas",
  function (this: Inc03World) {
    expect(this.response.statusCode).toBe(200);
    const data = body(this.response);
    expect(data.alertas).toEqual([]);
  }
);

Then(
  "la consulta de recepción responde un único objeto cliente",
  function (this: Inc03World) {
    expect(this.response.statusCode).toBe(200);
    const data = body(this.response);
    expect(Array.isArray(data)).toBe(false);
    expect(typeof data).toBe("object");
    expect(data.cedula).toBeDefined();
    expect(data.nombreCompleto).toBeDefined();
  }
);

Then(
  "la consulta de recepción no expone datos sensibles",
  function (this: Inc03World) {
    expect(this.response.statusCode).toBe(200);
    const raw = this.response.body.toLowerCase();
    expect(raw).not.toContain("pin");
    expect(raw).not.toContain("contrasena");
    expect(raw).not.toContain("hash");
    const data = body(this.response);
    expect(data.pin).toBeUndefined();
    expect(data.email).toBeUndefined();
    expect(data.telefono).toBeUndefined();
    expect(data.contrasena).toBeUndefined();
  }
);
