/**
 * INC-03 (HU-16 b1/b2/b3) — guardas de vencimiento en las superficies
 * existentes y la fuente unica de estado.
 *
 * Criterios: `INC03-VEN-01` (HU16-C01: deteccion en cada lectura, bordes
 * inclusivos DEC-006 y fechaFin extendida por congelacion), `INC03-VEN-02`
 * (HU16-C02: el estado pasa a VENCIDA y vuelve a ACTIVA/PROGRAMADA al
 * postergar fechaFin, sin flag persistido) e `INC03-VEN-05` (HU16-C03
 * "fuente unica": ficha, listado, portal y recepcion devuelven el MISMO
 * estado calculado por la misma regla). DEC-005/006 (America/Bogota,
 * extremos inclusivos), DEC-007 (renovar = periodo nuevo), DEC-013.
 *
 * Estado RED/GREEN mixto (2026-10-13), deliberado:
 * - `VEN-01` y `VEN-02` se verifican hoy sobre las lecturas **existentes**
 *   (`GET /clientes/:id` ficha y `GET /clientes/:clienteId/membresias-gym`
 *   listado, spec endpoint #8 "sin cambio de contrato"): deben quedar en
 *   VERDE y actuan como red de seguridad para el refactor de GREEN.
 * - `VEN-05` es la RED: exige la fuente unica. Falla por dos motivos
 *   verificables hoy: (1) `getClienteById` (`src/services/cliente.service.ts:
 *   144-149`) calcula el estado SIN pasar las pausas a `calcularEstado`, por lo
 *   que una vigencia CONGELADO se lee `ACTIVA` en ficha y `CONGELADO` en
 *   listado (divergencia que el spec manda cerrar exportando
 *   `pausasActivas`/`pausaVigente` y usando un unico `resolverEstadoAcceso`);
 *   (2) `GET /portal/resumen` y `GET /recepcion/consulta` aun no existen en
 *   `src/routes/` (404 de Fastify) — el GREEN que las registre debe usar el
 *   MISMO helper para que VEN-05 pase sin tocar el test.
 *
 * GREEN (backend-developer): ninguna asercion de este archivo cambia; el
 * camino es el spec "Fuente unica de estado" (exportar los helpers de pausa,
 * helper `resolverEstadoAcceso`, corregir `cliente.service.ts` y registrar
 * `portalRoutes`/`recepcionRoutes` en sus app files — en este archivo solo se
 * agrega el `register` de esas rutas cuando existan).
 *
 * Fixtures (spec INC-03 F1/F2/F6/F7/F9): fechas dinamicas relativas a
 * `getTodayBogota()` (DEC-013); aislamiento por prefijo de cedula 9931
 * (DEC-012).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import bcrypt from "bcryptjs";
import prisma from "../../src/lib/prisma";
import authRoutes from "../../src/routes/auth";
import clienteRoutes from "../../src/routes/clientes";
import membresiaRoutes from "../../src/routes/membresia";
import portalRoutes from "../../src/routes/portal";
import recepcionRoutes from "../../src/routes/recepcion";
import prismaPlugin from "../../src/plugins/prisma";
import authPlugin from "../../src/plugins/auth";
import { getTodayBogota } from "../../src/services/membresia.service";

const cedulaPrefix = "9931";
const pin = "1234";
const SEDE_PRINCIPAL = "sede-1";

/** DEC-013: todo el archivo se calcula sobre la fecha real de Bogota. */
const HOY = getTodayBogota();

let app: any;
let tokenOwner = "";
let tokenRecep = "";
let clienteSeq = 0;

/** Fixtures de vigencia (se crean en beforeAll sobre la BD y la API). */
let finHoyCedula = "";
let finHoyVigenciaId = "";
let vencidaCedula = "";
let vencidaVigenciaId = "";
let congeladoCedula = "";
let congeladoVigenciaId = "";

function parseBody(res: { body: string }) {
  return JSON.parse(res.body);
}

function headers(token: string) {
  return { authorization: `Bearer ${token}` };
}

function dia(offset: number): string {
  const [anio, mes, diaMes] = HOY.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, diaMes + offset))
    .toISOString()
    .slice(0, 10);
}

async function cleanupFixtures() {
  const clientes = await prisma.cliente.findMany({
    where: { cedula: { startsWith: cedulaPrefix } },
    select: { id: true },
  });
  const clienteIds = clientes.map((cliente) => cliente.id);
  const membresias = await prisma.membresiaGym.findMany({
    where: { clienteId: { in: clienteIds } },
    select: { id: true },
  });
  const membresiaIds = membresias.map((membresia) => membresia.id);

  await prisma.ingreso.deleteMany({ where: { clienteId: { in: clienteIds } } });
  await prisma.membresiaGymCambio.deleteMany({
    where: { membresiaId: { in: membresiaIds } },
  });
  await prisma.membresiaGym.deleteMany({ where: { id: { in: membresiaIds } } });
  await prisma.cliente.deleteMany({
    where: { cedula: { startsWith: cedulaPrefix } },
  });
}

async function crearCliente(): Promise<{ id: string; cedula: string }> {
  clienteSeq += 1;
  const cedula = `${cedulaPrefix}${String(clienteSeq).padStart(6, "0")}`;
  const cliente = await prisma.cliente.create({
    data: {
      cedula,
      nombres: "Vencimiento",
      apellidos: `Cliente${clienteSeq}`,
      telefono: "3000000000",
      sedeId: SEDE_PRINCIPAL,
      pin: await bcrypt.hash(pin, 4),
      estado: "ACTIVO",
    },
  });
  return { id: cliente.id, cedula };
}

async function crearVigencia(
  clienteId: string,
  fechaInicio: string,
  fechaFin: string
): Promise<string> {
  const res = await app.inject({
    method: "POST",
    url: `/clientes/${clienteId}/membresias-gym`,
    headers: headers(tokenOwner),
    payload: { fechaInicio, fechaFin },
  });
  expect(res.statusCode).toBe(201);
  return parseBody(res).id;
}

async function loginStaff(
  email: string,
  password: string
): Promise<{ token: string }> {
  const res = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email, password },
  });
  expect(res.statusCode).toBe(200);
  return { token: parseBody(res).token };
}

async function loginCliente(cedula: string): Promise<string> {
  const res = await app.inject({
    method: "POST",
    url: "/auth/login-cliente",
    payload: { cedula, pin },
  });
  expect(res.statusCode).toBe(200);
  return parseBody(res).token;
}

/** Estado que expone el LISTADO (`GET /clientes/:clienteId/membresias-gym`). */
async function estadoListado(
  clienteId: string,
  membresiaId: string
): Promise<{ estado: string; fechaFin: string; version: number }> {
  const res = await app.inject({
    method: "GET",
    url: `/clientes/${clienteId}/membresias-gym`,
    headers: headers(tokenOwner),
  });
  expect(res.statusCode).toBe(200);
  const body = parseBody(res);
  const membresia = body.membresias.find(
    (m: { id: string }) => m.id === membresiaId
  );
  expect(membresia).toBeTruthy();
  return membresia;
}

/** Estado que expone la FICHA (`GET /clientes/:id`). */
async function estadoFicha(
  clienteId: string,
  membresiaId: string
): Promise<{ estado: string; fechaFin: string }> {
  const res = await app.inject({
    method: "GET",
    url: `/clientes/${clienteId}`,
    headers: headers(tokenOwner),
  });
  expect(res.statusCode).toBe(200);
  const body = parseBody(res);
  const membresia = body.membresias.find(
    (m: { id: string }) => m.id === membresiaId
  );
  expect(membresia).toBeTruthy();
  return membresia;
}

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? "inc03-vencimiento-secret";

  await cleanupFixtures();

  app = Fastify();
  await app.register(prismaPlugin);
  await app.register(authPlugin);
  await app.register(authRoutes);
  await app.register(clienteRoutes);
  await app.register(membresiaRoutes);
  await app.register(portalRoutes);
  await app.register(recepcionRoutes);
  await app.ready();

  tokenOwner = (await loginStaff("admin@clubbeasts.com", "admin123")).token;
  tokenRecep = (await loginStaff("recep@clubbeasts.com", "recep123")).token;

  // F6: frontera `hoy == fechaFin` (dia final inclusivo, DEC-006).
  const finHoy = await crearCliente();
  finHoyCedula = finHoy.cedula;
  finHoyVigenciaId = await crearVigencia(finHoy.id, dia(-5), dia(0));

  // F2/F7: frontera `hoy == fechaFin + 1` -> VENCIDA.
  const vencida = await crearCliente();
  vencidaCedula = vencida.cedula;
  vencidaVigenciaId = await crearVigencia(vencida.id, dia(-30), dia(-1));

  // F5: CONGELADO (pausa que cubre hoy) -> fixture de la divergencia VEN-05.
  const congelado = await crearCliente();
  congeladoCedula = congelado.cedula;
  congeladoVigenciaId = await crearVigencia(congelado.id, dia(-30), dia(30));
  const pausa = await app.inject({
    method: "POST",
    url: `/clientes/${congelado.id}/vigencias/${congeladoVigenciaId}/congelar`,
    headers: headers(tokenOwner),
    payload: {
      fechaInicio: dia(-1),
      fechaFin: dia(1),
      motivo: "Vacaciones vencimiento",
      version: 1,
    },
  });
  expect(pausa.statusCode).toBe(200);
});

afterAll(async () => {
  await app.close();
  await cleanupFixtures();
});

// ─── INC03-VEN-01 (HU16-C01) ─────────────────────────────────────────────────

describe("INC03-VEN-01 deteccion del dia final en listado y ficha (bordes inclusivos)", () => {
  it("INC03-VEN-01 hoy == fechaFin -> ACTIVA en listado y ficha (dia final inclusivo)", async () => {
    const cliente = await prisma.cliente.findUniqueOrThrow({
      where: { cedula: finHoyCedula },
    });

    const listado = await estadoListado(cliente.id, finHoyVigenciaId);
    const ficha = await estadoFicha(cliente.id, finHoyVigenciaId);

    expect(listado.fechaFin).toBe(dia(0));
    expect(listado.estado).toBe("ACTIVA");
    expect(ficha.estado).toBe("ACTIVA");
  });

  it("INC03-VEN-01 hoy == fechaFin + 1 -> VENCIDA en listado y ficha (sin flag persistido)", async () => {
    const cliente = await prisma.cliente.findUniqueOrThrow({
      where: { cedula: vencidaCedula },
    });

    const listado = await estadoListado(cliente.id, vencidaVigenciaId);
    const ficha = await estadoFicha(cliente.id, vencidaVigenciaId);

    expect(listado.fechaFin).toBe(dia(-1));
    expect(listado.estado).toBe("VENCIDA");
    expect(ficha.estado).toBe("VENCIDA");

    // "sin flag persistido": el estado es derivado de la fecha, no una columna.
    const fila = await prisma.membresiaGym.findUniqueOrThrow({
      where: { id: vencidaVigenciaId },
    });
    expect(fila.fechaFin).toBe(dia(-1));
    expect(Object.keys(fila as Record<string, unknown>)).not.toContain("estado");
  });

  it("INC03-VEN-01 la fechaFin extendida por congelacion posterga el vencimiento", async () => {
    const cliente = await crearCliente();
    const vigenciaId = await crearVigencia(cliente.id, dia(-30), dia(0));

    // Pausa minima de 1 dia (hoy) -> la extension mueve fechaFin a manana.
    const pausa = await app.inject({
      method: "POST",
      url: `/clientes/${cliente.id}/vigencias/${vigenciaId}/congelar`,
      headers: headers(tokenOwner),
      payload: {
        fechaInicio: dia(0),
        fechaFin: dia(0),
        motivo: "Extension un dia",
        version: 1,
      },
    });
    expect(pausa.statusCode).toBe(200);
    expect(parseBody(pausa).fechaFinAnterior).toBe(dia(0));

    const listado = await estadoListado(cliente.id, vigenciaId);
    const ficha = await estadoFicha(cliente.id, vigenciaId);

    expect(listado.fechaFin).toBe(dia(1));
    expect(listado.estado).toBe("CONGELADO");
    // Postergado: ninguna superficie existente puede seguir diciendo VENCIDA.
    expect(ficha.fechaFin).toBe(dia(1));
    expect(listado.estado).not.toBe("VENCIDA");
    expect(ficha.estado).not.toBe("VENCIDA");
  });
});

// ─── INC03-VEN-02 (HU16-C02) ─────────────────────────────────────────────────

describe("INC03-VEN-02 el estado expuesto vuelve a ACTIVA/PROGRAMADA al postergar fechaFin", () => {
  it("INC03-VEN-02 VENCIDA -> ACTIVA al extender fechaFin, en listado y ficha (recalculo, no flag)", async () => {
    const cliente = await crearCliente();
    const vigenciaId = await crearVigencia(cliente.id, dia(-30), dia(-1));

    const antes = await estadoListado(cliente.id, vigenciaId);
    expect(antes.estado).toBe("VENCIDA");

    const patch = await app.inject({
      method: "PATCH",
      url: `/clientes/${cliente.id}/membresias-gym/${vigenciaId}`,
      headers: headers(tokenOwner),
      payload: { fechaFin: dia(30), version: antes.version },
    });
    expect(patch.statusCode).toBe(200);
    expect(parseBody(patch).estado).toBe("ACTIVA");

    const listado = await estadoListado(cliente.id, vigenciaId);
    const ficha = await estadoFicha(cliente.id, vigenciaId);
    expect(listado.fechaFin).toBe(dia(30));
    expect(listado.estado).toBe("ACTIVA");
    expect(ficha.estado).toBe("ACTIVA");

    // El estado vencido no era una columna: tras la extension no queda rastro.
    const fila = await prisma.membresiaGym.findUniqueOrThrow({
      where: { id: vigenciaId },
    });
    expect(fila.fechaFin).toBe(dia(30));
    expect(Object.keys(fila as Record<string, unknown>)).not.toContain("estado");
  });

  it("INC03-VEN-02 VENCIDA -> PROGRAMADA al mover tambien fechaInicio despues de hoy", async () => {
    const cliente = await crearCliente();
    const vigenciaId = await crearVigencia(cliente.id, dia(-30), dia(-1));

    const listado1 = await estadoListado(cliente.id, vigenciaId);
    expect(listado1.estado).toBe("VENCIDA");

    const patchFin = await app.inject({
      method: "PATCH",
      url: `/clientes/${cliente.id}/membresias-gym/${vigenciaId}`,
      headers: headers(tokenOwner),
      payload: { fechaFin: dia(30), version: listado1.version },
    });
    expect(patchFin.statusCode).toBe(200);

    const listado2 = await estadoListado(cliente.id, vigenciaId);
    const patchInicio = await app.inject({
      method: "PATCH",
      url: `/clientes/${cliente.id}/membresias-gym/${vigenciaId}`,
      headers: headers(tokenOwner),
      payload: { fechaInicio: dia(1), version: listado2.version },
    });
    expect(patchInicio.statusCode).toBe(200);
    expect(parseBody(patchInicio).estado).toBe("PROGRAMADA");

    const listado = await estadoListado(cliente.id, vigenciaId);
    const ficha = await estadoFicha(cliente.id, vigenciaId);
    expect(listado.estado).toBe("PROGRAMADA");
    expect(ficha.estado).toBe("PROGRAMADA");
  });
});

// ─── INC03-VEN-05 (HU16-C03, fuente unica) ───────────────────────────────────

describe("INC03-VEN-05 ficha, listado, portal y recepcion exponen el mismo estado", () => {
  /** Las 4 superficies del spec endpoint #8/#9/#10 para el MISMO cliente. */
  async function superficies(clienteId: string, cedula: string) {
    const cliente = await prisma.cliente.findUniqueOrThrow({
      where: { id: clienteId },
    });

    const listadoRes = await app.inject({
      method: "GET",
      url: `/clientes/${clienteId}/membresias-gym`,
      headers: headers(tokenOwner),
    });
    const listado =
      listadoRes.statusCode === 200
        ? parseBody(listadoRes).membresias[0]?.estado
        : `HTTP ${listadoRes.statusCode}`;

    const fichaRes = await app.inject({
      method: "GET",
      url: `/clientes/${clienteId}`,
      headers: headers(tokenOwner),
    });
    const ficha =
      fichaRes.statusCode === 200
        ? parseBody(fichaRes).membresias[0]?.estado
        : `HTTP ${fichaRes.statusCode}`;

    // Superficie portal (HU-25): requiere sesion CLIENTE del propio cliente.
    const tokenCliente = await loginCliente(cliente.cedula);
    const portalRes = await app.inject({
      method: "GET",
      url: "/portal/resumen",
      headers: headers(tokenCliente),
    });
    const portal =
      portalRes.statusCode === 200
        ? parseBody(portalRes).estadoAccesoGym
        : `HTTP ${portalRes.statusCode}`;

    // Superficie recepcion (HU-29): sesion staff.
    const recepRes = await app.inject({
      method: "GET",
      url: `/recepcion/consulta?cedula=${cedula}`,
      headers: headers(tokenRecep),
    });
    const recepcion =
      recepRes.statusCode === 200
        ? parseBody(recepRes).estadoAccesoGym
        : `HTTP ${recepRes.statusCode}`;

    expect(cliente.id).toBeTruthy();
    return { ficha, listado, portal, recepcion };
  }

  it("INC03-VEN-05 vigencia CONGELADO: las 4 superficies devuelven CONGELADO (la ficha no puede contradecir al listado)", async () => {
    const cliente = await prisma.cliente.findUniqueOrThrow({
      where: { cedula: congeladoCedula },
    });

    const estados = await superficies(cliente.id, congeladoCedula);

    expect(estados).toEqual({
      ficha: "CONGELADO",
      listado: "CONGELADO",
      portal: "CONGELADO",
      recepcion: "CONGELADO",
    });
  });

  it("INC03-VEN-05 vigencia VENCIDA: las 4 superficies devuelven VENCIDA", async () => {
    const cliente = await prisma.cliente.findUniqueOrThrow({
      where: { cedula: vencidaCedula },
    });

    const estados = await superficies(cliente.id, vencidaCedula);

    expect(estados).toEqual({
      ficha: "VENCIDA",
      listado: "VENCIDA",
      portal: "VENCIDA",
      recepcion: "VENCIDA",
    });
  });
});
