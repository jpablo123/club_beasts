import { When, Then } from "@cucumber/cucumber";
import { expect } from "vitest";
import {
  Inc03World,
  SEDE_PRINCIPAL,
  authHeaders,
  body,
  getInc03App,
} from "./inc03-soporte";

/** Steps de creación rápida (INC03-RAP-01..07). Textos unicos. */

async function postClienteRapido(
  world: Inc03World,
  payload: Record<string, string>,
  token: string | null
) {
  const server = await getInc03App();
  world.response = await server.inject({
    method: "POST",
    url: "/recepcion/clientes-rapidos",
    headers: authHeaders(token),
    payload,
  });
  if (world.response.statusCode === 201) {
    world.clienteRapidoId = body(world.response).id;
    world.cedulaFixture = payload.cedula;
  }
}

When(
  "creo un cliente rápido con cédula {string}, nombres {string}, apellidos {string} y teléfono {string}",
  async function (
    this: Inc03World,
    cedula: string,
    nombres: string,
    apellidos: string,
    telefono: string
  ) {
    await postClienteRapido(
      this,
      { cedula, nombres, apellidos, telefono },
      this.token
    );
  }
);

When(
  "creo un cliente rápido con cédula {string}, nombres {string}, apellidos {string} y teléfono {string} y sede {string}",
  async function (
    this: Inc03World,
    cedula: string,
    nombres: string,
    apellidos: string,
    telefono: string,
    sedeId: string
  ) {
    await postClienteRapido(
      this,
      { cedula, nombres, apellidos, telefono, sedeId },
      this.token
    );
  }
);

When(
  "creo un cliente rápido con cédula {string}, nombres {string}, apellidos {string} y teléfono {string} sin token",
  async function (
    this: Inc03World,
    cedula: string,
    nombres: string,
    apellidos: string,
    telefono: string
  ) {
    await postClienteRapido(
      this,
      { cedula, nombres, apellidos, telefono },
      null
    );
  }
);

When(
  "creo un cliente rápido con cédula {string}, nombres {string}, apellidos {string} y teléfono {string} con token de portal",
  async function (
    this: Inc03World,
    cedula: string,
    nombres: string,
    apellidos: string,
    telefono: string
  ) {
    await postClienteRapido(
      this,
      { cedula, nombres, apellidos, telefono },
      this.portalToken
    );
  }
);

Then(
  "el cliente rápido queda creado con estado {string} y perfilPendiente verdadero",
  function (this: Inc03World, estado: string) {
    expect(this.response.statusCode).toBe(201);
    const data = body(this.response);
    expect(data.estado).toBe(estado);
    expect(data.perfilPendiente).toBe(true);
    expect(data.cedula).toBe(this.cedulaFixture);
  }
);

Then(
  "el cliente rápido queda asignado a la sede {string}",
  function (this: Inc03World, nombreSede: string) {
    expect(this.response.statusCode).toBe(201);
    const data = body(this.response);
    expect(data.sede).toBeDefined();
    expect(data.sede.nombre).toBe(nombreSede);
    expect(data.sede.id).toBe(SEDE_PRINCIPAL.id);
  }
);

Then(
  "la ficha del cliente rápido de prueba muestra perfilPendiente verdadero",
  function (this: Inc03World) {
    expect(this.response.statusCode).toBe(200);
    const data = body(this.response);
    expect(data.perfilPendiente).toBe(true);
  }
);

Then(
  "la ficha del cliente rápido de prueba muestra perfilPendiente falso",
  function (this: Inc03World) {
    expect(this.response.statusCode).toBe(200);
    const data = body(this.response);
    expect(data.perfilPendiente).toBe(false);
  }
);

Then(
  "la ficha del cliente rápido de prueba conserva el email {string}",
  function (this: Inc03World, email: string) {
    expect(this.response.statusCode).toBe(200);
    const data = body(this.response);
    expect(data.email).toBe(email);
  }
);

Then(
  "el cliente rápido expone creadoPor con el nombre {string}",
  function (this: Inc03World, nombre: string) {
    expect(this.response.statusCode).toBe(201);
    const data = body(this.response);
    expect(data.creadoPor).toBeDefined();
    expect(data.creadoPor.nombre).toBe(nombre);
    expect(data.creadoPor.id).toBe(this.actorId);
  }
);
