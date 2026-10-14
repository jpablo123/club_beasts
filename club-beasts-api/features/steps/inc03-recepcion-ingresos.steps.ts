import { When, Then } from "@cucumber/cucumber";
import { expect } from "vitest";
import prisma from "../../src/lib/prisma";
import {
  Inc03World,
  authHeaders,
  body,
  getInc03App,
  resolverFecha,
} from "./inc03-soporte";

/** Steps de ingresos de recepción (INC03-ING-01..11). Textos unicos. */

When(
  "registro un ingreso en recepción para el cliente de prueba en sede {string}",
  async function (this: Inc03World, sedeId: string) {
    if (!this.cedulaFixture) throw new Error("falta la cédula del cliente de prueba");
    const server = await getInc03App();
    this.response = await server.inject({
      method: "POST",
      url: "/recepcion/ingresos",
      headers: authHeaders(this.token),
      payload: { cedula: this.cedulaFixture, sedeId },
    });
  }
);

When(
  "registro un ingreso en recepción con cédula {string} y sede {string}",
  async function (this: Inc03World, cedula: string, sedeId: string) {
    const server = await getInc03App();
    this.response = await server.inject({
      method: "POST",
      url: "/recepcion/ingresos",
      headers: authHeaders(this.token),
      payload: { cedula, sedeId },
    });
  }
);

When(
  "registro un ingreso en recepción con cédula {string} y sede {string} sin token",
  async function (this: Inc03World, cedula: string, sedeId: string) {
    const server = await getInc03App();
    this.response = await server.inject({
      method: "POST",
      url: "/recepcion/ingresos",
      payload: { cedula, sedeId },
    });
  }
);

When(
  "registro un ingreso en recepción con cédula {string} y sede {string} con token de portal",
  async function (this: Inc03World, cedula: string, sedeId: string) {
    const server = await getInc03App();
    this.response = await server.inject({
      method: "POST",
      url: "/recepcion/ingresos",
      headers: authHeaders(this.portalToken),
      payload: { cedula, sedeId },
    });
  }
);

When(
  "registro un ingreso del cliente de prueba en la sede {string}",
  async function (this: Inc03World, sedeId: string) {
    if (!this.cedulaFixture) throw new Error("falta la cédula del cliente de prueba");
    const server = await getInc03App();
    this.response = await server.inject({
      method: "POST",
      url: "/recepcion/ingresos",
      headers: authHeaders(this.token),
      payload: { cedula: this.cedulaFixture, sedeId },
    });
    if (this.response.statusCode !== 201) {
      throw new Error(
        `fixture ingreso fallo: ${this.response.statusCode} ${this.response.body}`
      );
    }
  }
);

When(
  "consulto el historial de ingresos del cliente de prueba",
  async function (this: Inc03World) {
    if (!this.cedulaFixture) throw new Error("falta la cédula del cliente de prueba");
    const server = await getInc03App();
    this.historialFecha = null;
    this.response = await server.inject({
      method: "GET",
      url: `/recepcion/ingresos?cedula=${encodeURIComponent(this.cedulaFixture)}`,
      headers: authHeaders(this.token),
    });
  }
);

When(
  "consulto el historial de ingresos del cliente de prueba en la fecha {string}",
  async function (this: Inc03World, tokenFecha: string) {
    if (!this.cedulaFixture) throw new Error("falta la cédula del cliente de prueba");
    const server = await getInc03App();
    const fecha = resolverFecha(tokenFecha);
    this.historialFecha = fecha;
    this.response = await server.inject({
      method: "GET",
      url: `/recepcion/ingresos?cedula=${encodeURIComponent(this.cedulaFixture)}&fecha=${fecha}`,
      headers: authHeaders(this.token),
    });
  }
);

Then(
  "el ingreso queda registrado en la sede {string} con fecha {string}",
  function (this: Inc03World, sedeId: string, tokenFecha: string) {
    expect(this.response.statusCode).toBe(201);
    const data = body(this.response);
    expect(data.sede.id).toBe(sedeId);
    expect(data.fecha).toBe(resolverFecha(tokenFecha));
    expect(typeof data.hora).toBe("string");
    expect(data.registradoPor).toBeDefined();
    expect(data.registradoPor.id).toBe(this.actorId);
  }
);

/**
 * GAP-RED-02 - el paso describe el ESTADO ACTUAL del historial, asi que SIEMPRE
 * relee `GET /recepcion/ingresos` (con el mismo filtro de fecha de la ultima
 * consulta, si la hubo) en lugar de reutilizar `this.response`: en los
 * escenarios de ingresos multiples la ultima respuesta es el `201` del ultimo
 * `POST /recepcion/ingresos` y el assert de estado 200 reventaba. Mismo
 * patron de "leer el estado real" que usa "no se crea ingreso para el cliente
 * de prueba" (consulta la BD dentro del Then).
 */
Then(
  "el historial de ingresos del cliente de prueba tiene total {int}",
  async function (this: Inc03World, total: number) {
    if (!this.cedulaFixture) throw new Error("falta la cédula del cliente de prueba");
    const server = await getInc03App();
    const filtro = this.historialFecha ? `&fecha=${this.historialFecha}` : "";
    this.response = await server.inject({
      method: "GET",
      url: `/recepcion/ingresos?cedula=${encodeURIComponent(this.cedulaFixture)}${filtro}`,
      headers: authHeaders(this.token),
    });
    expect(this.response.statusCode).toBe(200);
    const data = body(this.response);
    expect(data.total).toBe(total);
    expect(Array.isArray(data.ingresos)).toBe(true);
    expect(data.ingresos.length).toBe(total);
  }
);

Then(
  "no se crea ingreso para el cliente de prueba",
  async function (this: Inc03World) {
    expect(this.response.statusCode).toBe(403);
    if (!this.clienteId) throw new Error("falta el cliente de prueba");
    const count = await prisma.ingreso.count({
      where: { clienteId: this.clienteId },
    });
    expect(count).toBe(0);
  }
);
