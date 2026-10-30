import { Given, When, Then } from "@cucumber/cucumber";
import { expect } from "vitest";
import prisma from "../../src/lib/prisma";
import {
  Inc05World,
  adminToken,
  authHeaders,
  body,
  congelarVigenciaFixture,
  crearVigenciaGymFixture,
  getInc05App,
  resolverFecha,
} from "./inc05-soporte";

/**
 * INC-05 (tarea 12, RED Gherkin) - steps de los features
 * `servicio-personalizado.feature` (HU-13) y `servicio-nutricion.feature`
 * (HU-14). Todos los textos son UNICOS frente a `auth.steps.ts`,
 * `clientes.steps.ts`, `comunes.steps.ts`, `inc03-fixtures.steps.ts`,
 * `inc03-portal.steps.ts`, `inc03-recepcion-*.steps.ts` e
 * `inc04-estados.steps.ts`.
 *
 * Steps reutilizados de otros ficheros (no se redefinen aqui):
 *  - "soy un usuario autenticado como DUENO" (clientes.steps.ts)
 *  - "existe un cliente de prueba con cédula {string}" (inc03-fixtures.steps.ts)
 *  - "el cliente de prueba tiene estado {string}" (inc03-fixtures.steps.ts)
 *  - "la vigencia gym del cliente de prueba va de {string} a {string}"
 *    (inc03-fixtures.steps.ts)
 *  - "el recepcionista está autenticado" (inc03-fixtures.steps.ts)
 *  - "el cliente de prueba está autenticado en el portal"
 *    (inc03-fixtures.steps.ts)
 *  - "consulto la ficha del cliente de prueba como staff" (inc04-estados.steps.ts)
 *  - "el sistema retorna estado {int}" (comunes.steps.ts)
 *  - "el sistema muestra error {string}" (auth.steps.ts, contains)
 *  - "el sistema responde con el código de error {string}" (inc04-estados.steps.ts)
 *  - "el mensaje de error es exactamente {string}" (inc04-estados.steps.ts)
 *
 * Contrato ratificado (spec.md 2026-10-20): POST/GET
 * `/clientes/:clienteId/servicios-personalizado` y
 * `/clientes/:clienteId/servicios-nutricion`, PATCH `.../:servicioId`,
 * solape POR TIPO (DEC-004, inclusivo, DEC-005/006), renovacion = periodo
 * nuevo (DEC-007), estados PROGRAMADA/ACTIVA/VENCIDA/CONGELADO/NO_CONTRATADO
 * (DEC-043), codes SERVICIO_SOLAPADA/SERVICIO_CONFLICTO (DEC-044),
 * concurrencia optimista + desplazamiento de fechaFin (DEC-046/047, orden C2).
 *
 * En RED las rutas nuevas no existen: las peticiones responden 404 de
 * Fastify y la mayoria de los escenarios quedan rojos por diseño. Los unicos
 * que pueden pasar en RED son los guards de regresion GYM (REG-03/C1) porque
 * usan rutas ya aceptadas de INC-02.
 */

/** Token del staff del escenario (DUENO por defecto, o el ya autenticado). */
async function staffToken(world: Inc05World): Promise<string> {
  return world.token ?? (await adminToken());
}

function requireCliente(world: Inc05World): string {
  if (!world.clienteId) throw new Error("falta el cliente de prueba");
  return world.clienteId;
}

function requireVigenciaPersonalizado(world: Inc05World): string {
  if (!world.vigenciaPersonalizadoId) {
    throw new Error("falta la vigencia de personalizado del cliente de prueba");
  }
  return world.vigenciaPersonalizadoId;
}

function requireVigenciaNutricion(world: Inc05World): string {
  if (!world.vigenciaNutricionId) {
    throw new Error("falta la vigencia de nutricion del cliente de prueba");
  }
  return world.vigenciaNutricionId;
}

// ─── Givens: fixtures de vigencias por tipo (DEC-004) ───────────────────────

Given(
  "el cliente de prueba tiene una vigencia de personalizado del {string} al {string}",
  async function (this: Inc05World, inicioToken: string, finToken: string) {
    const clienteId = requireCliente(this);
    this.vigenciaPersonalizadoId = await crearVigenciaGymFixture(
      clienteId,
      resolverFecha(inicioToken),
      resolverFecha(finToken),
      "PERSONALIZADO"
    );
  }
);

Given(
  "el cliente de prueba tiene una vigencia de nutricion del {string} al {string}",
  async function (this: Inc05World, inicioToken: string, finToken: string) {
    const clienteId = requireCliente(this);
    this.vigenciaNutricionId = await crearVigenciaGymFixture(
      clienteId,
      resolverFecha(inicioToken),
      resolverFecha(finToken),
      "NUTRICION"
    );
  }
);

Given(
  "el cliente de prueba tiene una vigencia de gym y una de personalizado simultaneas",
  async function (this: Inc05World) {
    const clienteId = requireCliente(this);
    this.vigenciaId = await crearVigenciaGymFixture(
      clienteId,
      resolverFecha("hoy"),
      resolverFecha("hoy+9"),
      "GYM"
    );
    this.vigenciaPersonalizadoId = await crearVigenciaGymFixture(
      clienteId,
      resolverFecha("hoy+4"),
      resolverFecha("hoy+8"),
      "PERSONALIZADO"
    );
  }
);

Given(
  "el cliente de prueba tiene una vigencia de gym y una de nutricion simultaneas",
  async function (this: Inc05World) {
    const clienteId = requireCliente(this);
    this.vigenciaId = await crearVigenciaGymFixture(
      clienteId,
      resolverFecha("hoy"),
      resolverFecha("hoy+19"),
      "GYM"
    );
    this.vigenciaNutricionId = await crearVigenciaGymFixture(
      clienteId,
      resolverFecha("hoy+4"),
      resolverFecha("hoy+8"),
      "NUTRICION"
    );
  }
);

Given(
  "el cliente de prueba tiene una vigencia de personalizado con pausa vigente",
  async function (this: Inc05World) {
    const clienteId = requireCliente(this);
    const inicio = resolverFecha("hoy-10");
    const fin = resolverFecha("hoy+10");
    this.vigenciaPersonalizadoId = await crearVigenciaGymFixture(
      clienteId,
      inicio,
      fin,
      "PERSONALIZADO"
    );
    // PERSONALIZADO es congelable desde INC-02 (DEC-023): la pausa cubre hoy.
    await congelarVigenciaFixture(
      clienteId,
      this.vigenciaPersonalizadoId,
      resolverFecha("hoy"),
      resolverFecha("hoy+2")
    );
  }
);

// ─── Whens: registro de vigencias (POST) ────────────────────────────────────

When(
  "intento registrar el servicio personalizado con inicio {string} y fin {string}",
  async function (this: Inc05World, inicioToken: string, finToken: string) {
    const clienteId = requireCliente(this);
    const server = await getInc05App();
    this.response = await server.inject({
      method: "POST",
      url: `/clientes/${clienteId}/servicios-personalizado`,
      headers: authHeaders(await staffToken(this)),
      payload: {
        fechaInicio: resolverFecha(inicioToken),
        fechaFin: resolverFecha(finToken),
      },
    });
  }
);

When(
  "intento registrar el servicio de nutricion con inicio {string} y fin {string}",
  async function (this: Inc05World, inicioToken: string, finToken: string) {
    const clienteId = requireCliente(this);
    const server = await getInc05App();
    this.response = await server.inject({
      method: "POST",
      url: `/clientes/${clienteId}/servicios-nutricion`,
      headers: authHeaders(await staffToken(this)),
      payload: {
        fechaInicio: resolverFecha(inicioToken),
        fechaFin: resolverFecha(finToken),
      },
    });
  }
);

When(
  "intento registrar el servicio personalizado para el cliente {string}",
  async function (this: Inc05World, clienteId: string) {
    const server = await getInc05App();
    this.response = await server.inject({
      method: "POST",
      url: `/clientes/${clienteId}/servicios-personalizado`,
      headers: authHeaders(await staffToken(this)),
      payload: {
        fechaInicio: resolverFecha("hoy-5"),
        fechaFin: resolverFecha("hoy+25"),
      },
    });
  }
);

When(
  "intento registrar el servicio de nutricion para el cliente {string}",
  async function (this: Inc05World, clienteId: string) {
    const server = await getInc05App();
    this.response = await server.inject({
      method: "POST",
      url: `/clientes/${clienteId}/servicios-nutricion`,
      headers: authHeaders(await staffToken(this)),
      payload: {
        fechaInicio: resolverFecha("hoy-5"),
        fechaFin: resolverFecha("hoy+25"),
      },
    });
  }
);

When(
  "con la sesión del cliente registro el servicio personalizado con inicio {string} y fin {string}",
  async function (this: Inc05World, inicioToken: string, finToken: string) {
    const clienteId = requireCliente(this);
    if (!this.portalToken) throw new Error("falta la sesión del portal");
    const server = await getInc05App();
    this.response = await server.inject({
      method: "POST",
      url: `/clientes/${clienteId}/servicios-personalizado`,
      headers: authHeaders(this.portalToken),
      payload: {
        fechaInicio: resolverFecha(inicioToken),
        fechaFin: resolverFecha(finToken),
      },
    });
  }
);

When(
  "con la sesión del cliente registro el servicio de nutricion con inicio {string} y fin {string}",
  async function (this: Inc05World, inicioToken: string, finToken: string) {
    const clienteId = requireCliente(this);
    if (!this.portalToken) throw new Error("falta la sesión del portal");
    const server = await getInc05App();
    this.response = await server.inject({
      method: "POST",
      url: `/clientes/${clienteId}/servicios-nutricion`,
      headers: authHeaders(this.portalToken),
      payload: {
        fechaInicio: resolverFecha(inicioToken),
        fechaFin: resolverFecha(finToken),
      },
    });
  }
);

// ─── Whens: listados propios (GET, filtro por tipo) ─────────────────────────

When(
  "consulto las vigencias del servicio personalizado",
  async function (this: Inc05World) {
    const clienteId = requireCliente(this);
    const server = await getInc05App();
    this.response = await server.inject({
      method: "GET",
      url: `/clientes/${clienteId}/servicios-personalizado`,
      headers: authHeaders(await staffToken(this)),
    });
  }
);

When(
  "consulto las vigencias del servicio de nutricion",
  async function (this: Inc05World) {
    const clienteId = requireCliente(this);
    const server = await getInc05App();
    this.response = await server.inject({
      method: "GET",
      url: `/clientes/${clienteId}/servicios-nutricion`,
      headers: authHeaders(await staffToken(this)),
    });
  }
);

When(
  "consulto las vigencias del servicio personalizado para un cliente inexistente",
  async function (this: Inc05World) {
    const server = await getInc05App();
    this.response = await server.inject({
      method: "GET",
      url: "/clientes/cliente-inexistente-inc05/servicios-personalizado",
      headers: authHeaders(await staffToken(this)),
    });
  }
);

When(
  "consulto las vigencias del servicio de nutricion para un cliente inexistente",
  async function (this: Inc05World) {
    const server = await getInc05App();
    this.response = await server.inject({
      method: "GET",
      url: "/clientes/cliente-inexistente-inc05/servicios-nutricion",
      headers: authHeaders(await staffToken(this)),
    });
  }
);

When(
  "con la sesión del cliente consulto las vigencias del servicio personalizado",
  async function (this: Inc05World) {
    const clienteId = requireCliente(this);
    if (!this.portalToken) throw new Error("falta la sesión del portal");
    const server = await getInc05App();
    this.response = await server.inject({
      method: "GET",
      url: `/clientes/${clienteId}/servicios-personalizado`,
      headers: authHeaders(this.portalToken),
    });
  }
);

When(
  "con la sesión del cliente consulto las vigencias del servicio de nutricion",
  async function (this: Inc05World) {
    const clienteId = requireCliente(this);
    if (!this.portalToken) throw new Error("falta la sesión del portal");
    const server = await getInc05App();
    this.response = await server.inject({
      method: "GET",
      url: `/clientes/${clienteId}/servicios-nutricion`,
      headers: authHeaders(this.portalToken),
    });
  }
);

// ─── Whens: edicion (PATCH) con concurrencia optimista y DEC-047 ────────────

When(
  "edito la vigencia de personalizado con inicio {string} y fin {string} y versión {int}",
  async function (
    this: Inc05World,
    inicioToken: string,
    finToken: string,
    version: number
  ) {
    const clienteId = requireCliente(this);
    const servicioId = requireVigenciaPersonalizado(this);
    const server = await getInc05App();
    this.response = await server.inject({
      method: "PATCH",
      url: `/clientes/${clienteId}/servicios-personalizado/${servicioId}`,
      headers: authHeaders(await staffToken(this)),
      payload: {
        fechaInicio: resolverFecha(inicioToken),
        fechaFin: resolverFecha(finToken),
        version,
      },
    });
  }
);

When(
  "edito la vigencia de personalizado moviendo solo el inicio a {string} con versión {int}",
  async function (this: Inc05World, inicioToken: string, version: number) {
    const clienteId = requireCliente(this);
    const servicioId = requireVigenciaPersonalizado(this);
    const server = await getInc05App();
    this.response = await server.inject({
      method: "PATCH",
      url: `/clientes/${clienteId}/servicios-personalizado/${servicioId}`,
      headers: authHeaders(await staffToken(this)),
      payload: { fechaInicio: resolverFecha(inicioToken), version },
    });
  }
);

When(
  "edito la vigencia de personalizado cambiando solo el fin a {string} con versión {int}",
  async function (this: Inc05World, finToken: string, version: number) {
    const clienteId = requireCliente(this);
    const servicioId = requireVigenciaPersonalizado(this);
    const server = await getInc05App();
    this.response = await server.inject({
      method: "PATCH",
      url: `/clientes/${clienteId}/servicios-personalizado/${servicioId}`,
      headers: authHeaders(await staffToken(this)),
      payload: { fechaFin: resolverFecha(finToken), version },
    });
  }
);

When(
  "edito la vigencia de nutricion con inicio {string} y fin {string} y versión {int}",
  async function (
    this: Inc05World,
    inicioToken: string,
    finToken: string,
    version: number
  ) {
    const clienteId = requireCliente(this);
    const servicioId = requireVigenciaNutricion(this);
    const server = await getInc05App();
    this.response = await server.inject({
      method: "PATCH",
      url: `/clientes/${clienteId}/servicios-nutricion/${servicioId}`,
      headers: authHeaders(await staffToken(this)),
      payload: {
        fechaInicio: resolverFecha(inicioToken),
        fechaFin: resolverFecha(finToken),
        version,
      },
    });
  }
);

When(
  "edito la vigencia de nutricion moviendo solo el inicio a {string} con versión {int}",
  async function (this: Inc05World, inicioToken: string, version: number) {
    const clienteId = requireCliente(this);
    const servicioId = requireVigenciaNutricion(this);
    const server = await getInc05App();
    this.response = await server.inject({
      method: "PATCH",
      url: `/clientes/${clienteId}/servicios-nutricion/${servicioId}`,
      headers: authHeaders(await staffToken(this)),
      payload: { fechaInicio: resolverFecha(inicioToken), version },
    });
  }
);

When(
  "edito la vigencia de nutricion cambiando solo el fin a {string} con versión {int}",
  async function (this: Inc05World, finToken: string, version: number) {
    const clienteId = requireCliente(this);
    const servicioId = requireVigenciaNutricion(this);
    const server = await getInc05App();
    this.response = await server.inject({
      method: "PATCH",
      url: `/clientes/${clienteId}/servicios-nutricion/${servicioId}`,
      headers: authHeaders(await staffToken(this)),
      payload: { fechaFin: resolverFecha(finToken), version },
    });
  }
);

When(
  "edito como personalizado la ultima vigencia de gym con versión {int}",
  async function (this: Inc05World, version: number) {
    const clienteId = requireCliente(this);
    if (!this.vigenciaId) throw new Error("falta la vigencia de gym");
    const server = await getInc05App();
    this.response = await server.inject({
      method: "PATCH",
      url: `/clientes/${clienteId}/servicios-personalizado/${this.vigenciaId}`,
      headers: authHeaders(await staffToken(this)),
      payload: {
        fechaInicio: resolverFecha("hoy-9"),
        fechaFin: resolverFecha("hoy+11"),
        version,
      },
    });
  }
);

When(
  "edito como personalizado una vigencia inexistente con versión {int}",
  async function (this: Inc05World, version: number) {
    const clienteId = requireCliente(this);
    const server = await getInc05App();
    this.response = await server.inject({
      method: "PATCH",
      url: `/clientes/${clienteId}/servicios-personalizado/vigencia-inexistente-inc05`,
      headers: authHeaders(await staffToken(this)),
      payload: {
        fechaInicio: resolverFecha("hoy-9"),
        fechaFin: resolverFecha("hoy+11"),
        version,
      },
    });
  }
);

When(
  "edito como nutricion la ultima vigencia de gym con versión {int}",
  async function (this: Inc05World, version: number) {
    const clienteId = requireCliente(this);
    if (!this.vigenciaId) throw new Error("falta la vigencia de gym");
    const server = await getInc05App();
    this.response = await server.inject({
      method: "PATCH",
      url: `/clientes/${clienteId}/servicios-nutricion/${this.vigenciaId}`,
      headers: authHeaders(await staffToken(this)),
      payload: {
        fechaInicio: resolverFecha("hoy-9"),
        fechaFin: resolverFecha("hoy+11"),
        version,
      },
    });
  }
);

// ─── Whens: pausas aceptadas de INC-02 sobre los nuevos tipos ───────────────

When(
  "congelo la vigencia de personalizado del cliente de prueba con pausa del {string} al {string}",
  async function (this: Inc05World, inicioToken: string, finToken: string) {
    const clienteId = requireCliente(this);
    const vigenciaId = requireVigenciaPersonalizado(this);
    const server = await getInc05App();
    this.response = await server.inject({
      method: "POST",
      url: `/clientes/${clienteId}/vigencias/${vigenciaId}/congelar`,
      headers: authHeaders(await staffToken(this)),
      payload: {
        fechaInicio: resolverFecha(inicioToken),
        fechaFin: resolverFecha(finToken),
        motivo: "Pausa INC-05 personalizado",
        version: 1,
      },
    });
  }
);

When(
  "congelo la vigencia de nutricion del cliente de prueba con pausa del {string} al {string}",
  async function (this: Inc05World, inicioToken: string, finToken: string) {
    const clienteId = requireCliente(this);
    const vigenciaId = requireVigenciaNutricion(this);
    const server = await getInc05App();
    this.response = await server.inject({
      method: "POST",
      url: `/clientes/${clienteId}/vigencias/${vigenciaId}/congelar`,
      headers: authHeaders(await staffToken(this)),
      payload: {
        fechaInicio: resolverFecha(inicioToken),
        fechaFin: resolverFecha(finToken),
        motivo: "Pausa INC-05 nutricion",
        version: 1,
      },
    });
  }
);

When(
  "congelo la vigencia de gym del cliente de prueba con pausa del {string} al {string}",
  async function (this: Inc05World, inicioToken: string, finToken: string) {
    const clienteId = requireCliente(this);
    if (!this.vigenciaId) throw new Error("falta la vigencia de gym");
    const server = await getInc05App();
    this.response = await server.inject({
      method: "POST",
      url: `/clientes/${clienteId}/vigencias/${this.vigenciaId}/congelar`,
      headers: authHeaders(await staffToken(this)),
      payload: {
        fechaInicio: resolverFecha(inicioToken),
        fechaFin: resolverFecha(finToken),
        motivo: "Pausa INC-05 regresion gym",
        version: 1,
      },
    });
  }
);

When(
  "edito la pausa de la vigencia de gym del cliente de prueba del {string} al {string}",
  async function (this: Inc05World, inicioToken: string, finToken: string) {
    const clienteId = requireCliente(this);
    if (!this.vigenciaId) throw new Error("falta la vigencia de gym");
    const fila = await prisma.membresiaGym.findUnique({
      where: { id: this.vigenciaId },
      select: { version: true },
    });
    if (!fila) throw new Error("la vigencia de gym ya no existe");
    const server = await getInc05App();
    this.response = await server.inject({
      method: "PATCH",
      url: `/clientes/${clienteId}/vigencias/${this.vigenciaId}/congelacion`,
      headers: authHeaders(await staffToken(this)),
      payload: {
        fechaInicio: resolverFecha(inicioToken),
        fechaFin: resolverFecha(finToken),
        motivo: "Edicion de pausa INC-05",
        version: fila.version,
      },
    });
  }
);

When(
  "hago que la pausa vigente de la vigencia de personalizado termine",
  async function (this: Inc05World) {
    const vigenciaId = requireVigenciaPersonalizado(this);
    // Simula el paso del tiempo: la pausa dejo de cubrir hoy (America/Bogota).
    await prisma.membresiaGymCambio.updateMany({
      where: { membresiaId: vigenciaId, accion: "CONGELACION" },
      data: { congelacionFin: resolverFecha("hoy-1") },
    });
  }
);

When(
  "hago que la pausa vigente de la vigencia de nutricion termine",
  async function (this: Inc05World) {
    const vigenciaId = requireVigenciaNutricion(this);
    await prisma.membresiaGymCambio.updateMany({
      where: { membresiaId: vigenciaId, accion: "CONGELACION" },
      data: { congelacionFin: resolverFecha("hoy-1") },
    });
  }
);

// ─── Thens: contratos de los listados propios ───────────────────────────────

function serviciosDeRespuesta(world: Inc05World): any[] {
  const datos = body(world.response);
  expect(Array.isArray(datos.servicios)).toBe(true);
  return datos.servicios;
}

Then(
  "la lista de personalizado tiene {int} vigencias",
  function (this: Inc05World, total: number) {
    expect(serviciosDeRespuesta(this)).toHaveLength(total);
  }
);

Then(
  "la lista de nutricion tiene {int} vigencias",
  function (this: Inc05World, total: number) {
    expect(serviciosDeRespuesta(this)).toHaveLength(total);
  }
);

Then(
  "la unica vigencia de personalizado tiene estado {string}",
  function (this: Inc05World, estado: string) {
    const servicios = serviciosDeRespuesta(this);
    expect(servicios[0]?.estado).toBe(estado);
  }
);

Then(
  "la unica vigencia de nutricion tiene estado {string}",
  function (this: Inc05World, estado: string) {
    const servicios = serviciosDeRespuesta(this);
    expect(servicios[0]?.estado).toBe(estado);
  }
);

Then(
  "la vigencia de personalizado del {string} al {string} tiene estado {string}",
  function (this: Inc05World, inicioToken: string, finToken: string, estado: string) {
    const inicio = resolverFecha(inicioToken);
    const fin = resolverFecha(finToken);
    const fila = serviciosDeRespuesta(this).find(
      (servicio) => servicio.fechaInicio === inicio && servicio.fechaFin === fin
    );
    expect(fila).toBeDefined();
    expect(fila.estado).toBe(estado);
  }
);

Then(
  "la vigencia de nutricion del {string} al {string} tiene estado {string}",
  function (this: Inc05World, inicioToken: string, finToken: string, estado: string) {
    const inicio = resolverFecha(inicioToken);
    const fin = resolverFecha(finToken);
    const fila = serviciosDeRespuesta(this).find(
      (servicio) => servicio.fechaInicio === inicio && servicio.fechaFin === fin
    );
    expect(fila).toBeDefined();
    expect(fila.estado).toBe(estado);
  }
);

Then(
  "la fecha fin de la unica vigencia de personalizado queda {string}",
  function (this: Inc05World, finToken: string) {
    const servicios = serviciosDeRespuesta(this);
    expect(servicios[0]?.fechaFin).toBe(resolverFecha(finToken));
  }
);

Then(
  "la fecha fin de la unica vigencia de nutricion queda {string}",
  function (this: Inc05World, finToken: string) {
    const servicios = serviciosDeRespuesta(this);
    expect(servicios[0]?.fechaFin).toBe(resolverFecha(finToken));
  }
);

Then(
  "la vigencia de personalizado del {string} al {string} conserva la versión {int}",
  function (this: Inc05World, inicioToken: string, finToken: string, version: number) {
    const inicio = resolverFecha(inicioToken);
    const fin = resolverFecha(finToken);
    const fila = serviciosDeRespuesta(this).find(
      (servicio) => servicio.fechaInicio === inicio && servicio.fechaFin === fin
    );
    expect(fila).toBeDefined();
    expect(fila.version).toBe(version);
  }
);

// Espejo NUTRICION del paso anterior (feature servicio-nutricion.feature,
// escenario de renovacion DEC-007: la fila antigua conserva la version 1).
Then(
  "la vigencia de nutricion del {string} al {string} conserva la versión {int}",
  function (this: Inc05World, inicioToken: string, finToken: string, version: number) {
    const inicio = resolverFecha(inicioToken);
    const fin = resolverFecha(finToken);
    const fila = serviciosDeRespuesta(this).find(
      (servicio) => servicio.fechaInicio === inicio && servicio.fechaFin === fin
    );
    expect(fila).toBeDefined();
    expect(fila.version).toBe(version);
  }
);

// ─── Thens: creacion con DTO, version 1 y auditoria ─────────────────────────

Then(
  "la creación del servicio personalizado quedó registrada con versión 1",
  async function (this: Inc05World) {
    expect(this.response.statusCode).toBe(201);
    const dto = body(this.response);
    expect(dto.version).toBe(1);
    expect(dto.tipoServicio).toBe("PERSONALIZADO");
    expect(dto.clienteId).toBe(this.clienteId);
    expect(dto.creadoPor?.id).toBeTruthy();
    expect(dto.actualizadoPor?.id).toBeTruthy();

    const auditoria = await prisma.membresiaGymCambio.findFirst({
      where: { membresiaId: dto.id, accion: "CREACION", version: 1 },
    });
    expect(auditoria).not.toBeNull();
  }
);

Then(
  "la creación del servicio de nutricion quedó registrada con versión 1",
  async function (this: Inc05World) {
    expect(this.response.statusCode).toBe(201);
    const dto = body(this.response);
    expect(dto.version).toBe(1);
    expect(dto.tipoServicio).toBe("NUTRICION");
    expect(dto.clienteId).toBe(this.clienteId);
    expect(dto.creadoPor?.id).toBeTruthy();
    expect(dto.actualizadoPor?.id).toBeTruthy();

    const auditoria = await prisma.membresiaGymCambio.findFirst({
      where: { membresiaId: dto.id, accion: "CREACION", version: 1 },
    });
    expect(auditoria).not.toBeNull();
  }
);

// ─── Thens: visibilidad en la ficha del cliente (HU13-C03 / HU14-C03) ───────

Then(
  "la ficha muestra una vigencia de personalizado con estado {string}",
  function (this: Inc05World, estado: string) {
    expect(this.response.statusCode).toBe(200);
    const ficha = body(this.response);
    const fila = ficha.membresias.find(
      (membresia: { tipoServicio: string }) =>
        membresia.tipoServicio === "PERSONALIZADO"
    );
    expect(fila).toBeDefined();
    expect(fila.estado).toBe(estado);
  }
);

Then(
  "la ficha muestra una vigencia de nutricion con estado {string}",
  function (this: Inc05World, estado: string) {
    expect(this.response.statusCode).toBe(200);
    const ficha = body(this.response);
    const fila = ficha.membresias.find(
      (membresia: { tipoServicio: string }) =>
        membresia.tipoServicio === "NUTRICION"
    );
    expect(fila).toBeDefined();
    expect(fila.estado).toBe(estado);
  }
);

Then(
  "la ficha muestra la vigencia de personalizado del {string} al {string} con estado {string}",
  function (
    this: Inc05World,
    inicioToken: string,
    finToken: string,
    estado: string
  ) {
    expect(this.response.statusCode).toBe(200);
    const ficha = body(this.response);
    const fila = ficha.membresias.find(
      (membresia: { tipoServicio: string }) =>
        membresia.tipoServicio === "PERSONALIZADO"
    );
    expect(fila).toBeDefined();
    expect(fila.fechaInicio).toBe(resolverFecha(inicioToken));
    expect(fila.fechaFin).toBe(resolverFecha(finToken));
    expect(fila.estado).toBe(estado);
  }
);

Then(
  "la ficha muestra la vigencia de nutricion del {string} al {string} con estado {string}",
  function (
    this: Inc05World,
    inicioToken: string,
    finToken: string,
    estado: string
  ) {
    expect(this.response.statusCode).toBe(200);
    const ficha = body(this.response);
    const fila = ficha.membresias.find(
      (membresia: { tipoServicio: string }) =>
        membresia.tipoServicio === "NUTRICION"
    );
    expect(fila).toBeDefined();
    expect(fila.fechaInicio).toBe(resolverFecha(inicioToken));
    expect(fila.fechaFin).toBe(resolverFecha(finToken));
    expect(fila.estado).toBe(estado);
  }
);

// ─── Then: respuesta de la pausa (estado literal DEC-043) ───────────────────

Then(
  "la respuesta de la pausa expone estado {string}",
  function (this: Inc05World, estado: string) {
    expect(body(this.response).estado).toBe(estado);
  }
);

// ─── Thens: respuesta del PATCH (DTO directo) y control de escrituras ───────

Then(
  "la respuesta de la edicion expone la fecha fin {string}",
  function (this: Inc05World, finToken: string) {
    expect(this.response.statusCode).toBe(200);
    expect(body(this.response).fechaFin).toBe(resolverFecha(finToken));
  }
);

Then(
  "la respuesta de la edicion expone la versión {int}",
  function (this: Inc05World, version: number) {
    expect(this.response.statusCode).toBe(200);
    expect(body(this.response).version).toBe(version);
  }
);

Then(
  "el cliente de prueba tiene {int} vigencia de personalizado en la base",
  async function (this: Inc05World, total: number) {
    const clienteId = requireCliente(this);
    const count = await prisma.membresiaGym.count({
      where: { clienteId, tipoServicio: "PERSONALIZADO" },
    });
    expect(count).toBe(total);
  }
);

Then(
  "el cliente de prueba tiene {int} vigencia de nutricion en la base",
  async function (this: Inc05World, total: number) {
    const clienteId = requireCliente(this);
    const count = await prisma.membresiaGym.count({
      where: { clienteId, tipoServicio: "NUTRICION" },
    });
    expect(count).toBe(total);
  }
);
