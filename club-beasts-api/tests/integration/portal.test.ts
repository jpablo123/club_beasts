/**
 * INC-03 (HU-25 + HU-16 b3/b4) — RED del portal del cliente.
 *
 * Criterios: `INC03-POR-01..07` (HU25-C01..C07), la superficie **portal** de
 * `INC03-VEN-03` (estado real, fin del hardcode `"Activo"`) y la guarda
 * `INC03-VEN-04`/DEC-026 (**el login no cambia**: identidad/PIN, HU-02 intacta).
 * Decisiones: DEC-001 (roles), DEC-005/006 (America/Bogota, extremos
 * inclusivos), DEC-025 (CONGELADO conserva acceso), DEC-026/027, DEC-012/013.
 *
 * Estado RED (2026-10-13): `src/routes/` solo registra `auth.ts`,
 * `clientes.ts` y `membresia.ts`; **no existe** `GET /portal/resumen`, por lo
 * que toda peticion cae en el 404 de Fastify (`Route ... not found`, cuerpo
 * sin `code`) en lugar de los 200/401/403 del contrato. Los tests fallan por
 * eso (RED) y no "pasan por accidente": las aserciones exigen 200 + schema G14
 * `portalResumenResponseSchema` y los `code` exactos.
 * El unico test que ya pasa hoy es la guarda DEC-026 del login (`VEN-04`).
 *
 * GREEN (backend-developer): crear `src/routes/portal.ts` con
 * `preHandler: [fastify.authenticateRoles(["CLIENTE"])]` y agregar
 * `await app.register(portalRoutes)` al app de este archivo (un import + una
 * linea; ninguna asercion cambia).
 *
 * Fixtures (spec INC-03 F1/F2/F3/F4/F5/F6/F7/F13/F14): fechas dinamicas
 * relativas a `getTodayBogota()` (DEC-013, nunca fechas de calendario
 * fijas); sedes reales del seed (`sede-1`/`sede-2`); aislamiento por prefijo
 * de cedula 9932 (DEC-012).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import bcrypt from "bcryptjs";
import prisma from "../../src/lib/prisma";
import authRoutes from "../../src/routes/auth";
import clienteRoutes from "../../src/routes/clientes";
import membresiaRoutes from "../../src/routes/membresia";
import portalRoutes from "../../src/routes/portal";
import prismaPlugin from "../../src/plugins/prisma";
import authPlugin from "../../src/plugins/auth";
import { getTodayBogota } from "../../src/services/membresia.service";
import { portalResumenResponseSchema } from "../../features/acceptance-criteria/HU-25-schemas";

const cedulaPrefix = "9932";
const pin = "1234";
const SEDE_PRINCIPAL = "sede-1";
const SEDE_SECUNDARIA = "sede-2";

/** DEC-013: todo el archivo se calcula sobre la fecha real de Bogota. */
const HOY = getTodayBogota();

let app: any;
let tokenOwner = "";
let tokenRecep = "";
let clienteSeq = 0;

/** Clientes fixture (se crean en beforeAll). */
let clienteActivaId = "";
let clienteActivaCedula = "";
let clienteFinHoyId = "";
let clienteVencidaId = "";
let clienteVencidaCedula = "";
let clienteProgramadaId = "";
let clienteSinVigenciaId = "";
let clienteCongeladoId = "";

function parseBody(res: { body: string }) {
  return JSON.parse(res.body);
}

/**
 * Apellidos fixture validos por el schema G14 `namesSchema` (solo letras y
 * espacios, sin digitos): el correlativo del cliente se escribe con LETRAS
 * (`Cliente A`, `Cliente B`, ...) para conservar la unicidad por fixture sin
 * romper el regex `^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$`. Precedente INC-01: el dato de
 * prueba es el que se corrige, nunca el schema ni la implementacion.
 */
const LETRAS_CORRELATIVO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function apellidosFixture(secuencia: number): string {
  let resto = secuencia;
  let sufijo = "";
  do {
    sufijo = LETRAS_CORRELATIVO[(resto - 1) % 26] + sufijo;
    resto = Math.floor((resto - 1) / 26);
  } while (resto > 0);
  return `Cliente ${sufijo}`;
}

function headers(token: string) {
  return { authorization: `Bearer ${token}` };
}

/** Fecha YYYY-MM-DD con `offset` dias respecto de HOY (nunca fechas fijas). */
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
  await prisma.membresiaGym.deleteMany({
    where: { id: { in: membresiaIds } },
  });
  await prisma.cliente.deleteMany({
    where: { cedula: { startsWith: cedulaPrefix } },
  });
}

async function crearCliente(
  opciones: { estado?: string } = {}
): Promise<{ id: string; cedula: string }> {
  clienteSeq += 1;
  const cedula = `${cedulaPrefix}${String(clienteSeq).padStart(6, "0")}`;
  const cliente = await prisma.cliente.create({
    data: {
      cedula,
      nombres: "Portal",
      apellidos: apellidosFixture(clienteSeq),
      telefono: "3000000000",
      sedeId: SEDE_PRINCIPAL,
      pin: await bcrypt.hash(pin, 4),
      estado: opciones.estado ?? "ACTIVO",
    },
  });
  return { id: cliente.id, cedula };
}

/** Vigencia GYM creada por la API existente (HU-12). */
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
): Promise<{ token: string; id: string }> {
  const res = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email, password },
  });
  expect(res.statusCode).toBe(200);
  const body = parseBody(res);
  return { token: body.token, id: body.user.id };
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

function consultarResumen(token?: string) {
  return app.inject({
    method: "GET",
    url: "/portal/resumen",
    headers: token ? headers(token) : undefined,
  });
}

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? "inc03-portal-secret";

  await cleanupFixtures();

  app = Fastify();
  await app.register(prismaPlugin);
  await app.register(authPlugin);
  await app.register(authRoutes);
  await app.register(clienteRoutes);
  await app.register(membresiaRoutes);
  await app.register(portalRoutes);
  await app.ready();

  const owner = await loginStaff("admin@clubbeasts.com", "admin123");
  tokenOwner = owner.token;
  const recep = await loginStaff("recep@clubbeasts.com", "recep123");
  tokenRecep = recep.token;

  // F1: vigencia ACTIVA que abarca hoy.
  const activa = await crearCliente();
  clienteActivaId = activa.id;
  clienteActivaCedula = activa.cedula;
  await crearVigencia(clienteActivaId, dia(-30), dia(30));

  // F6: frontera `hoy == fechaFin` (dia final inclusivo, DEC-006).
  const finHoy = await crearCliente();
  clienteFinHoyId = finHoy.id;
  await crearVigencia(clienteFinHoyId, dia(-5), dia(0));

  // F2/F7: frontera `hoy == fechaFin + 1` -> VENCIDA.
  const vencida = await crearCliente();
  clienteVencidaId = vencida.id;
  clienteVencidaCedula = vencida.cedula;
  await crearVigencia(clienteVencidaId, dia(-30), dia(-1));

  // F3: PROGRAMADA (`hoy == fechaInicio - 1`).
  const programada = await crearCliente();
  clienteProgramadaId = programada.id;
  await crearVigencia(clienteProgramadaId, dia(1), dia(30));

  // F4: cliente sin ninguna fila MembresiaGym.
  const sinVigencia = await crearCliente();
  clienteSinVigenciaId = sinVigencia.id;

  // F5: CONGELADO (pausa que cubre hoy, INC-02) + rango expuesto.
  const congelado = await crearCliente();
  clienteCongeladoId = congelado.id;
  const vigenciaCongelada = await crearVigencia(
    clienteCongeladoId,
    dia(-30),
    dia(30)
  );
  const pausa = await app.inject({
    method: "POST",
    url: `/clientes/${clienteCongeladoId}/vigencias/${vigenciaCongelada}/congelar`,
    headers: headers(tokenOwner),
    payload: {
      fechaInicio: dia(-1),
      fechaFin: dia(1),
      motivo: "Vacaciones portal",
      version: 1,
    },
  });
  expect(pausa.statusCode).toBe(200);
});

afterAll(async () => {
  await app.close();
  await cleanupFixtures();
});

// ─── INC03-POR-01 / POR-02 / POR-03 ──────────────────────────────────────────

describe("INC03-POR-01..03 GET /portal/resumen con datos reales del cliente", () => {
  it("INC03-POR-01 devuelve 200 con nombre, cedula y sede desde la BD (schema G14)", async () => {
    const tokenCliente = await loginCliente(clienteActivaCedula);
    const res = await consultarResumen(tokenCliente);

    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    expect(portalResumenResponseSchema.parse(body)).toBeTruthy();
    // "desde la BD": el portal devuelve la fila real del cliente (G14: nombres
    // y apellidos solo letras y espacios, sin digitos).
    const clienteBD = await prisma.cliente.findUniqueOrThrow({
      where: { id: clienteActivaId },
    });
    expect(body.cliente.cedula).toBe(clienteActivaCedula);
    expect(body.cliente.nombres).toBe(clienteBD.nombres);
    expect(body.cliente.apellidos).toBe(clienteBD.apellidos);
    expect(body.cliente.apellidos).toBe("Cliente A");
    expect(body.cliente.sede.id).toBe(SEDE_PRINCIPAL);
    expect(body.cliente.sede.nombre).toBe("Sede Principal");
  });

  it("INC03-POR-02/03 estadoAccesoGym ACTIVA con fechaVencimiento = fechaFin y congelacion null", async () => {
    const tokenCliente = await loginCliente(clienteActivaCedula);
    const res = await consultarResumen(tokenCliente);

    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.estadoAccesoGym).toBe("ACTIVA");
    expect(body.fechaVencimiento).toBe(dia(30));
    expect(body.congelacion).toBeNull();
    expect(body.fechaActual).toBe(HOY);
  });
});

// ─── INC03-POR-07 (+ VEN-01/VEN-03) ──────────────────────────────────────────

describe("INC03-POR-07 extremos inclusivos al pintar (DEC-005 / DEC-006)", () => {
  it("INC03-POR-07 hoy == fechaFin sigue ACTIVA (dia final inclusivo)", async () => {
    const cliente = await prisma.cliente.findUniqueOrThrow({
      where: { id: clienteFinHoyId },
      include: { membresias: true },
    });
    const tokenCliente = await loginCliente(cliente.cedula);
    const res = await consultarResumen(tokenCliente);

    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.estadoAccesoGym).toBe("ACTIVA");
    expect(body.fechaVencimiento).toBe(dia(0));
  });

  it("INC03-POR-07 hoy == fechaFin + 1 expone VENCIDA (superficie portal de VEN-03)", async () => {
    const tokenCliente = await loginCliente(clienteVencidaCedula);
    const res = await consultarResumen(tokenCliente);

    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.estadoAccesoGym).toBe("VENCIDA");
    expect(body.fechaVencimiento).toBe(dia(-1));
  });

  it("INC03-POR-07 hoy == fechaInicio - 1 expone PROGRAMADA", async () => {
    const cliente = await prisma.cliente.findUniqueOrThrow({
      where: { id: clienteProgramadaId },
      include: { membresias: true },
    });
    const tokenCliente = await loginCliente(cliente.cedula);
    const res = await consultarResumen(tokenCliente);

    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.estadoAccesoGym).toBe("PROGRAMADA");
    expect(body.fechaVencimiento).toBe(dia(30));
  });
});

// ─── INC03-POR-04 / POR-06 ───────────────────────────────────────────────────

describe("INC03-POR-04 y INC03-POR-06 congelacion y sin vigencia", () => {
  it("INC03-POR-04 congelacion vigente -> CONGELADO con el rango de la pausa", async () => {
    const cliente = await prisma.cliente.findUniqueOrThrow({
      where: { id: clienteCongeladoId },
      include: { membresias: true },
    });
    const tokenCliente = await loginCliente(cliente.cedula);
    const res = await consultarResumen(tokenCliente);

    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.estadoAccesoGym).toBe("CONGELADO");
    expect(body.congelacion).toEqual({
      fechaInicio: dia(-1),
      fechaFin: dia(1),
    });
  });

  it("INC03-POR-06 sin membresia -> SIN_VIGENCIA y fechaVencimiento null (nunca 'Activo')", async () => {
    const cliente = await prisma.cliente.findUniqueOrThrow({
      where: { id: clienteSinVigenciaId },
    });
    const tokenCliente = await loginCliente(cliente.cedula);
    const res = await consultarResumen(tokenCliente);

    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.estadoAccesoGym).toBe("SIN_VIGENCIA");
    expect(body.fechaVencimiento).toBeNull();
    expect(body.congelacion).toBeNull();
    expect(portalResumenResponseSchema.parse(body)).toBeTruthy();
  });
});

// ─── INC03-POR-05 ────────────────────────────────────────────────────────────

describe("INC03-POR-05 autorizacion DEC-001 del portal", () => {
  it("INC03-POR-05 sin token responde 401 AUTH_TOKEN_MISSING", async () => {
    const res = await consultarResumen();
    expect(res.statusCode).toBe(401);
    expect(parseBody(res).code).toBe("AUTH_TOKEN_MISSING");
  });

  it("INC03-POR-05 token DUENO responde 403 AUTH_FORBIDDEN", async () => {
    const res = await consultarResumen(tokenOwner);
    expect(res.statusCode).toBe(403);
    expect(parseBody(res).code).toBe("AUTH_FORBIDDEN");
  });

  it("INC03-POR-05 token RECEPCIONISTA responde 403 AUTH_FORBIDDEN", async () => {
    const res = await consultarResumen(tokenRecep);
    expect(res.statusCode).toBe(403);
    expect(parseBody(res).code).toBe("AUTH_FORBIDDEN");
  });

  it("INC03-POR-05 el cliente solo ve sus propios datos (identidad desde el token)", async () => {
    const tokenCliente = await loginCliente(clienteVencidaCedula);
    const res = await consultarResumen(tokenCliente);

    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.cliente.cedula).toBe(clienteVencidaCedula);
    expect(body.cliente.id).toBe(clienteVencidaId);
  });
});

// ─── INC03-VEN-04 / DEC-026 (guarda de regresion) ────────────────────────────

describe("INC03-VEN-04 (DEC-026) el login del cliente no cambia con la membresia vencida", () => {
  it("POST /auth/login-cliente con cedula y PIN validos sigue respondiendo 200 aunque la vigencia este VENCIDA", async () => {
    // DEC-026 (opcion B): el login es solo identidad/cedula+PIN (HU-02 intacta);
    // la denegacion por vencimiento vive en el portal y en recepcion, no aqui.
    const res = await app.inject({
      method: "POST",
      url: "/auth/login-cliente",
      payload: { cedula: clienteVencidaCedula, pin },
    });

    expect(res.statusCode).toBe(200);
    expect(parseBody(res).token).toBeTruthy();
    expect(parseBody(res).cliente.cedula).toBe(clienteVencidaCedula);
  });
});
