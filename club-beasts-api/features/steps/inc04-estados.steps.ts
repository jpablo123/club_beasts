import { When, Then } from "@cucumber/cucumber";
import { expect } from "vitest";
import prisma from "../../src/lib/prisma";
import {
  Inc03World,
  authHeaders,
  body,
  getInc03App,
  adminToken,
  resolverFecha,
} from "./inc03-soporte";

/**
 * INC-04 (tarea RED Gherkin) - steps de cambio de estado con motivo, bloqueos
 * del cliente INACTIVO y reactivacion. Todos los textos son UNICOS frente a
 * `auth.steps.ts`, `clientes.steps.ts`, `comunes.steps.ts` y los steps INC-03.
 *
 * Los steps de fixtures reutilizados de INC-03 (declarados en
 * `inc03-fixtures.steps.ts`):
 *  - "existe un cliente de prueba con cédula {string}"
 *  - "el cliente de prueba tiene estado {string}"
 *  - "la vigencia gym del cliente de prueba va de {string} a {string}"
 *  - "el cliente de prueba está autenticado en el portal"
 *  - "el recepcionista está autenticado"
 * Los steps de respuestas reutilizados:
 *  - "el sistema retorna estado {int}" (comunes.steps.ts)
 *  - "el sistema muestra error {string}" (auth.steps.ts, contains)
 *  - "registro un ingreso en recepción para el cliente de prueba en sede
 *    {string}" y "no se crea ingreso para el cliente de prueba"
 *    (inc03-recepcion-ingresos.steps.ts)
 *  - "consulto mi resumen del portal" (inc03-portal.steps.ts)
 *
 * Materializacion D4 del G14 en el motivo del When principal:
 *  - "(omitido)"  -> el campo NO se envia (da el 400 "requerido");
 *  - "(201 caracteres)" -> "a" * 201 (da el 400 de maximo);
 *  - cualquier otro valor se envia literal.
 */

/** Token del staff del escenario (DUENO por defecto, o el ya autenticado). */
async function staffToken(world: Inc03World): Promise<string> {
  return world.token ?? (await adminToken());
}

/** Ultima fila de historial del cliente de prueba (mas reciente primero). */
async function ultimoCambio(clienteId: string) {
  const filas = await prisma.clienteEstadoCambio.findMany({
    where: { clienteId },
    orderBy: { createdAt: "desc" },
    include: { actor: { select: { id: true, nombre: true } } },
  });
  return filas[0];
}

function materializarMotivo(token: string): string | undefined {
  if (token === "(omitido)") return undefined;
  if (token === "(201 caracteres)") return "a".repeat(201);
  return token;
}

// ─── When: cambios de estado via PATCH /clientes/:id ────────────────────────

When(
  "cambio el estado del cliente de prueba a {string} con motivo {string}",
  async function (this: Inc03World, estado: string, motivoToken: string) {
    if (!this.clienteId) throw new Error("falta el cliente de prueba");
    const server = await getInc03App();
    const motivo = materializarMotivo(motivoToken);
    this.response = await server.inject({
      method: "PATCH",
      url: `/clientes/${this.clienteId}`,
      headers: authHeaders(await staffToken(this)),
      payload: {
        estado,
        ...(motivo !== undefined ? { motivo } : {}),
      },
    });
  }
);

// ─── When: bloqueos del cliente INACTIVO (servicios y acceso) ───────────────

When(
  "intento crear una membresía gym para el cliente de prueba de {string} a {string}",
  async function (this: Inc03World, inicioToken: string, finToken: string) {
    if (!this.clienteId) throw new Error("falta el cliente de prueba");
    const server = await getInc03App();
    this.response = await server.inject({
      method: "POST",
      url: `/clientes/${this.clienteId}/membresias-gym`,
      headers: authHeaders(await staffToken(this)),
      payload: {
        fechaInicio: resolverFecha(inicioToken),
        fechaFin: resolverFecha(finToken),
      },
    });
  }
);

When(
  "intento crear una membresía gym para un cliente inexistente",
  async function (this: Inc03World) {
    const server = await getInc03App();
    this.response = await server.inject({
      method: "POST",
      url: "/clientes/cliente-inexistente-inc04/membresias-gym",
      headers: authHeaders(await staffToken(this)),
      payload: {
        fechaInicio: resolverFecha("hoy-3"),
        fechaFin: resolverFecha("hoy+27"),
      },
    });
  }
);

When(
  "intento iniciar sesión en el portal con el cliente de prueba y PIN {string}",
  async function (this: Inc03World, pin: string) {
    if (!this.cedulaFixture) throw new Error("falta la cédula del cliente de prueba");
    const server = await getInc03App();
    this.response = await server.inject({
      method: "POST",
      url: "/auth/login-cliente",
      payload: { cedula: this.cedulaFixture, pin },
    });
  }
);

When("intento eliminar el cliente de prueba", async function (this: Inc03World) {
  if (!this.clienteId) throw new Error("falta el cliente de prueba");
  const server = await getInc03App();
  this.response = await server.inject({
    method: "DELETE",
    url: `/clientes/${this.clienteId}`,
    headers: authHeaders(await staffToken(this)),
  });
});

// ─── When: lecturas de ficha e historial ────────────────────────────────────

When(
  "consulto la ficha del cliente de prueba con la sesión del portal",
  async function (this: Inc03World) {
    if (!this.clienteId) throw new Error("falta el cliente de prueba");
    if (!this.portalToken) throw new Error("falta la sesión del portal");
    const server = await getInc03App();
    this.response = await server.inject({
      method: "GET",
      url: `/clientes/${this.clienteId}`,
      headers: authHeaders(this.portalToken),
    });
  }
);

When(
  "consulto la ficha del cliente de prueba como staff",
  async function (this: Inc03World) {
    if (!this.clienteId) throw new Error("falta el cliente de prueba");
    const server = await getInc03App();
    this.response = await server.inject({
      method: "GET",
      url: `/clientes/${this.clienteId}`,
      headers: authHeaders(await staffToken(this)),
    });
  }
);

When(
  "busco al cliente de prueba por su cédula",
  async function (this: Inc03World) {
    if (!this.cedulaFixture) throw new Error("falta la cédula del cliente de prueba");
    const server = await getInc03App();
    this.response = await server.inject({
      method: "GET",
      url: `/clientes?search=${encodeURIComponent(this.cedulaFixture)}&limit=100`,
      headers: authHeaders(await staffToken(this)),
    });
  }
);

// ─── Then: contrato de errores INC-04 (mensajes y códigos exactos) ──────────

Then(
  "el sistema responde con el código de error {string}",
  function (this: Inc03World, code: string) {
    expect(this.response.statusCode).toBeGreaterThanOrEqual(400);
    expect(body(this.response).code).toBe(code);
  }
);

Then(
  "el mensaje de error es exactamente {string}",
  function (this: Inc03World, mensaje: string) {
    expect(this.response.statusCode).toBeGreaterThanOrEqual(400);
    expect(body(this.response).error).toBe(mensaje);
  }
);

Then("la respuesta no incluye token", function (this: Inc03World) {
  expect(body(this.response).token).toBeUndefined();
});

Then("la respuesta incluye token", function (this: Inc03World) {
  const data = body(this.response);
  expect(data.token).toBeDefined();
  expect(typeof data.token).toBe("string");
});

// ─── Then: estado del cliente y sin escrituras fantasma ─────────────────────

Then(
  "el cliente de prueba conserva el estado {string}",
  async function (this: Inc03World, estado: string) {
    if (!this.clienteId) throw new Error("falta el cliente de prueba");
    const cliente = await prisma.cliente.findUnique({
      where: { id: this.clienteId },
      select: { estado: true },
    });
    expect(cliente?.estado).toBe(estado);
  }
);

Then(
  "el cliente de prueba conserva sus datos con estado {string}",
  async function (this: Inc03World, estado: string) {
    expect(this.response.statusCode).toBe(200);
    const ficha = body(this.response);
    expect(ficha.estado).toBe(estado);
    expect(ficha.cedula).toBe(this.cedulaFixture);
    expect(ficha.nombres).toBeDefined();
    expect(ficha.apellidos).toBeDefined();
    expect(ficha.sede).toBeDefined();
  }
);

Then("el cliente de prueba sigue existiendo en la base", async function (this: Inc03World) {
  if (!this.clienteId) throw new Error("falta el cliente de prueba");
  const cliente = await prisma.cliente.findUnique({
    where: { id: this.clienteId },
    select: { id: true },
  });
  expect(cliente).not.toBeNull();
});

// ─── Then: historial de cambios de estado (ClienteEstadoCambio) ─────────────

Then(
  "el historial de cambios de estado del cliente de prueba tiene {int} filas",
  async function (this: Inc03World, total: number) {
    if (!this.clienteId) throw new Error("falta el cliente de prueba");
    const count = await prisma.clienteEstadoCambio.count({
      where: { clienteId: this.clienteId },
    });
    expect(count).toBe(total);
  }
);

Then(
  "el último cambio del cliente de prueba registra {string} a {string}",
  async function (this: Inc03World, estadoAnterior: string, estadoNuevo: string) {
    if (!this.clienteId) throw new Error("falta el cliente de prueba");
    const fila = await ultimoCambio(this.clienteId);
    expect(fila).toBeDefined();
    expect(fila.estadoAnterior).toBe(estadoAnterior);
    expect(fila.estadoNuevo).toBe(estadoNuevo);
    expect(fila.motivo).toBeTruthy();
    expect(typeof fila.actor.nombre).toBe("string");
  }
);

Then(
  "el motivo del último cambio del cliente de prueba es {string}",
  async function (this: Inc03World, motivo: string) {
    if (!this.clienteId) throw new Error("falta el cliente de prueba");
    const fila = await ultimoCambio(this.clienteId);
    expect(fila).toBeDefined();
    expect(fila.motivo).toBe(motivo);
  }
);

Then(
  "el actor del último cambio del cliente de prueba es el usuario autenticado",
  async function (this: Inc03World) {
    if (!this.clienteId) throw new Error("falta el cliente de prueba");
    if (!this.actorId) throw new Error("falta el usuario staff autenticado");
    const fila = await ultimoCambio(this.clienteId);
    expect(fila).toBeDefined();
    expect(fila.actorId).toBe(this.actorId);
  }
);

Then(
  "la respuesta del cambio de estado expone el motivo {string}",
  function (this: Inc03World, motivo: string) {
    expect(this.response.statusCode).toBe(200);
    expect(body(this.response).motivo).toBe(motivo);
  }
);

Then(
  "la ficha del staff expone el motivo {string}",
  function (this: Inc03World, motivo: string) {
    expect(this.response.statusCode).toBe(200);
    expect(body(this.response).motivo).toBe(motivo);
  }
);

// ─── When: edicion de datos con motivo viajero (CONF-07) ────────────────────

When(
  "edito el teléfono del cliente de prueba a {string} con motivo viajero {string}",
  async function (this: Inc03World, telefono: string, motivo: string) {
    if (!this.clienteId) throw new Error("falta el cliente de prueba");
    const server = await getInc03App();
    this.response = await server.inject({
      method: "PATCH",
      url: `/clientes/${this.clienteId}`,
      headers: authHeaders(await staffToken(this)),
      payload: { telefono, motivo },
    });
  }
);

// ─── Then: servicios asignados y acceso al portal ───────────────────────────

Then("no se crea membresía gym para el cliente de prueba", async function (this: Inc03World) {
  if (!this.clienteId) throw new Error("falta el cliente de prueba");
  const count = await prisma.membresiaGym.count({
    where: { clienteId: this.clienteId },
  });
  expect(count).toBe(0);
});

Then(
  "el cliente de prueba tiene {int} membresía gym",
  async function (this: Inc03World, total: number) {
    if (!this.clienteId) throw new Error("falta el cliente de prueba");
    const count = await prisma.membresiaGym.count({
      where: { clienteId: this.clienteId },
    });
    expect(count).toBe(total);
  }
);

Then(
  "el cliente de prueba puede iniciar sesión en el portal",
  async function (this: Inc03World) {
    if (!this.cedulaFixture) throw new Error("falta la cédula del cliente de prueba");
    expect(this.response.statusCode).toBe(200);
    expect(body(this.response).token).toBeDefined();
  }
);

Then(
  "la búsqueda de clientes encuentra al cliente de prueba",
  function (this: Inc03World) {
    expect(this.response.statusCode).toBe(200);
    const ids = body(this.response).clientes.map((c: any) => c.id);
    expect(ids).toContain(this.clienteId);
  }
);

Then(
  "la ficha del portal del cliente de prueba expone el motivo nulo",
  function (this: Inc03World) {
    expect(this.response.statusCode).toBe(200);
    // DEC-041: el motivo es informacion interna del staff; para el cliente va
    // null explicito (no ausente).
    expect(body(this.response).motivo).toBeNull();
  }
);
