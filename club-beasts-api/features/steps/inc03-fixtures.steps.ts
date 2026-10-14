import { After, Before, Given, When } from "@cucumber/cucumber";
import prisma from "../../src/lib/prisma";
import {
  Inc03World,
  PIN_PRUEBA,
  SEDE_PRINCIPAL,
  SEDE_SECUNDARIA,
  adminToken,
  authHeaders,
  body,
  congelarVigenciaFixture,
  crearClienteFixture,
  crearVigenciaGymFixture,
  getInc03App,
  loginClientePortal,
  loginStaff,
  resolverFecha,
} from "./inc03-soporte";

/**
 * Steps compartidos de fixtures INC-03 (clientes, vigencias, congelaciones,
 * sesiones). Todos los textos son UNICOS frente a `auth.steps.ts`,
 * `clientes.steps.ts` y `comunes.steps.ts`.
 */

/**
 * Limpieza INC-03: los hijos de un cliente (Ingreso, MembresiaGymCambio,
 * MembresiaGym) tienen FK `ON DELETE RESTRICT`. Se vacian las tablas hijas en
 * Before y After de CADA escenario para que el `deleteMany` de clientes de
 * `world.ts` nunca choque con filas huérfanas (el orden de hooks respecto al
 * mundo no es garantizable; el seed no crea membresias ni ingresos).
 */
async function limpiarHijosClientes(): Promise<void> {
  await prisma.ingreso.deleteMany({});
  await prisma.membresiaGymCambio.deleteMany({});
  await prisma.membresiaGym.deleteMany({});
}

Before(async () => {
  await limpiarHijosClientes();
});

After(async () => {
  await limpiarHijosClientes();
});

Given(
  "existe un cliente de prueba con cédula {string}",
  async function (this: Inc03World, cedula: string) {
    this.cedulaFixture = cedula;
    this.clienteId = await crearClienteFixture({
      cedula,
      nombres: "Cliente",
      apellidos: "Prueba",
      telefono: "3000000001",
      sedeId: SEDE_PRINCIPAL.id,
    });
  }
);

Given(
  "existe un cliente de prueba con cédula {string} con nombres {string} y apellidos {string}",
  async function (this: Inc03World, cedula: string, nombres: string, apellidos: string) {
    this.cedulaFixture = cedula;
    this.clienteId = await crearClienteFixture({
      cedula,
      nombres,
      apellidos,
      telefono: "3000000002",
      sedeId: SEDE_PRINCIPAL.id,
    });
  }
);

Given(
  "la vigencia gym del cliente de prueba va de {string} a {string}",
  async function (this: Inc03World, inicioToken: string, finToken: string) {
    if (!this.clienteId) throw new Error("falta el cliente de prueba");
    const fechaInicio = resolverFecha(inicioToken);
    const fechaFin = resolverFecha(finToken);
    this.vigenciaId = await crearVigenciaGymFixture(
      this.clienteId,
      fechaInicio,
      fechaFin
    );
  }
);

Given(
  "la vigencia gym del cliente de prueba está congelada de {string} a {string}",
  async function (this: Inc03World, inicioToken: string, finToken: string) {
    if (!this.clienteId || !this.vigenciaId) {
      throw new Error("falta la vigencia del cliente de prueba");
    }
    await congelarVigenciaFixture(
      this.clienteId,
      this.vigenciaId,
      resolverFecha(inicioToken),
      resolverFecha(finToken)
    );
  }
);

Given("el cliente de prueba no tiene vigencia gym", async function (this: Inc03World) {
  if (!this.clienteId) throw new Error("falta el cliente de prueba");
  // Fixture F4: cliente sin ninguna fila MembresiaGym.
});

Given(
  "el cliente de prueba tiene estado {string}",
  async function (this: Inc03World, estado: string) {
    if (!this.clienteId) throw new Error("falta el cliente de prueba");
    await prisma.cliente.update({
      where: { id: this.clienteId },
      data: { estado },
    });
  }
);

Given("el cliente de prueba está autenticado en el portal", async function (this: Inc03World) {
  if (!this.cedulaFixture) throw new Error("falta la cédula del cliente de prueba");
  this.portalToken = await loginClientePortal(this.cedulaFixture, PIN_PRUEBA);
});

Given("el recepcionista está autenticado", async function (this: Inc03World) {
  const { token, actorId, actorNombre } = await loginStaff(
    "recep@clubbeasts.com",
    "recep123"
  );
  this.token = token;
  this.recepToken = token;
  this.actorId = actorId;
  this.actorNombre = actorNombre;
});

Given(
  "el recepcionista autenticado tiene sede asignada {string}",
  async function (this: Inc03World, sedeId: string) {
    const { token, actorId, actorNombre } = await loginStaff(
      "recep@clubbeasts.com",
      "recep123"
    );
    this.token = token;
    this.recepToken = token;
    this.actorId = actorId;
    this.actorNombre = actorNombre;
    // DEC-031: la sede del recepcionista vive en `User.sedeId` (columna que el
    // DBA agrega en GREEN). Mientras no exista, el prisma client la rechaza y
    // el escenario falla en rojo (dependencia documentada).
    await (prisma.user as any).update({
      where: { id: actorId },
      data: { sedeId },
    });
  }
);

When(
  "postergo la fechaFin de la vigencia del cliente de prueba a {string}",
  async function (this: Inc03World, finToken: string) {
    if (!this.vigenciaId) throw new Error("falta la vigencia del cliente de prueba");
    await prisma.membresiaGym.update({
      where: { id: this.vigenciaId },
      data: { fechaFin: resolverFecha(finToken) },
    });
  }
);

When("consulto la ficha del cliente rápido de prueba", async function (this: Inc03World) {
  const id = this.clienteRapidoId ?? this.clienteId;
  if (!id) throw new Error("falta el cliente rapido de prueba");
  const server = await getInc03App();
  const token = this.token ?? (await adminToken());
  this.response = await server.inject({
    method: "GET",
    url: `/clientes/${id}`,
    headers: authHeaders(token),
  });
});

When(
  "completo el perfil del cliente rápido de prueba con email {string}",
  async function (this: Inc03World, email: string) {
    const id = this.clienteRapidoId ?? this.clienteId;
    if (!id) throw new Error("falta el cliente rapido de prueba");
    const server = await getInc03App();
    const token = this.token ?? (await adminToken());
    this.response = await server.inject({
      method: "PATCH",
      url: `/clientes/${id}`,
      headers: authHeaders(token),
      payload: { email },
    });
  }
);

/** Sedes del seed traducidas a nombre legible (F14 corregido). */
export function nombreSede(sedeId: string): string {
  if (sedeId === SEDE_PRINCIPAL.id) return SEDE_PRINCIPAL.nombre;
  if (sedeId === SEDE_SECUNDARIA.id) return SEDE_SECUNDARIA.nombre;
  return sedeId;
}

export { body, resolverFecha };
