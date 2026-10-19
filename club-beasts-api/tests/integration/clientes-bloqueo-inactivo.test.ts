/**
 * INC-04 (HU-08 b4 / HU08-C04b) — RED del bloqueo de servicios nuevos y del
 * ingreso fisico para clientes INACTIVO.
 *
 * Criterios: `INC04-CLI-05` (HU08-C04b): `POST
 * /clientes/:clienteId/membresias-gym` con cliente `INACTIVO` -> 409
 * `CLIENTE_INACTIVO` sin fila creada, guarda ANTES del solape (`CONF-06`);
 * cliente no inactivo -> 201 (regresion HU-12); inexistente -> 404.
 * `INC04-CLI-07` (DEC-039): `POST /recepcion/ingresos` con cliente
 * `INACTIVO` -> 403 `INGRESO_NO_PERMITIDO` (mensaje exacto), sin fila; la
 * rama `SUSPENDIDO`/`RETIRADO` (DEC-030, `INC03-ING-10`) es regresion ya
 * aceptada, aqui solo se protege su no-regresion.
 *
 * Estado RED (2026-10-19): `crearMembresia` (`src/services/membresia.service.ts`)
 * no mira `cliente.estado` (la ruta solo busca `{ id }`, `routes/membresia.ts:
 * 149-158`) y `recepcion.ts:229` solo bloquea SUSPENDIDO/RETIRADO (DEC-030
 * de INC-03); el INACTIVO sigue pasando al solape/201 y al ingreso 201. Por
 * eso:
 *  - el 409 `CLIENTE_INACTIVO` con literal G14 no existe hoy;
 *  - el 403 del ingreso INACTIVO tampoco (cae en el calculo de vigencia);
 *  - los tests de regresion (201 ACTIVO, 404, rama DEC-030) si pasan hoy y
 *    fijan el contrato que el GREEN no puede romper.
 * GREEN (backend-developer): guarda `409 CLIENTE_INACTIVO` en el SERVICIO
 * `crearMembresia` antes del solape (mensaje literal G14 `HU08-C04b`) y
 * condicion `INACTIVO` en el `if` de estado de `recepcion.ts` (mismo
 * `INGRESO_NO_PERMITIDO` del template existente).
 *
 * Fixtures: aislamiento por prefijo de cedula `9924` (DEC-012); fechas
 * relativas a `getTodayBogota()` (DEC-013); sedes reales `sede-1`/`sede-2`.
 * La limpieza borra `ClienteEstadoCambio` antes que `Cliente` (FK RESTRICT).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import bcrypt from "bcryptjs";
import prisma from "../../src/lib/prisma";
import authRoutes from "../../src/routes/auth";
import clienteRoutes from "../../src/routes/clientes";
import membresiaRoutes from "../../src/routes/membresia";
import recepcionRoutes from "../../src/routes/recepcion";
import prismaPlugin from "../../src/plugins/prisma";
import authPlugin from "../../src/plugins/auth";
import { getTodayBogota } from "../../src/services/membresia.service";
import {
  clienteInactivoResponseSchema,
  errorResponseSchema,
} from "../../features/acceptance-criteria/HU-08-schemas";

const cedulaPrefix = "9924";
const PIN = "1234";
const SEDE_PRINCIPAL = "sede-1";

const MOTIVO_INACTIVO = "El cliente ceso su plan";

const HOY = getTodayBogota();

let app: any;
let tokenOwner = "";
let tokenRecep = "";
let tokenCliente = "";
let clienteSeq = 0;

function dia(offset: number): string {
  const [anio, mes, diaMes] = HOY.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, diaMes + offset))
    .toISOString()
    .slice(0, 10);
}

function headers(token: string) {
  return { authorization: `Bearer ${token}` };
}

function parseBody(res: { body: string }) {
  return JSON.parse(res.body);
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

/** Cliente con estado arbitrario escrito directo en BD (fixture F5/F6/F10). */
async function crearCliente(
  estado: string
): Promise<{ id: string; cedula: string }> {
  clienteSeq += 1;
  const cedula = `${cedulaPrefix}${String(clienteSeq).padStart(6, "0")}`;
  const cliente = await prisma.cliente.create({
    data: {
      cedula,
      nombres: "Bloqueo",
      apellidos: `Cliente${clienteSeq}`,
      telefono: "3000000000",
      sedeId: SEDE_PRINCIPAL,
      pin: await bcrypt.hash(PIN, 4),
      estado,
    },
  });
  return { id: cliente.id, cedula };
}

async function crearVigencia(
  clienteId: string,
  fechaInicio: string,
  fechaFin: string
): Promise<string> {
  const admin = await prisma.user.findUnique({
    where: { email: "admin@clubbeasts.com" },
    select: { id: true },
  });
  const membresia = await prisma.membresiaGym.create({
    data: {
      clienteId,
      fechaInicio,
      fechaFin,
      tipoServicio: "GYM",
      creadoPorId: admin!.id,
      actualizadoPorId: admin!.id,
    },
  });
  return membresia.id;
}

async function contarMembresias(clienteId: string): Promise<number> {
  return prisma.membresiaGym.count({ where: { clienteId } });
}

async function contarIngresos(cedula: string): Promise<number> {
  return prisma.ingreso.count({ where: { cliente: { cedula } } });
}

async function postMembresia(
  clienteId: string,
  payload: { fechaInicio: string; fechaFin: string },
  token: string
) {
  return app.inject({
    method: "POST",
    url: `/clientes/${clienteId}/membresias-gym`,
    headers: headers(token),
    payload,
  });
}

async function postIngreso(
  payload: { cedula: string; sedeId: string },
  token: string
) {
  return app.inject({
    method: "POST",
    url: "/recepcion/ingresos",
    headers: headers(token),
    payload,
  });
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
  await prisma.clienteEstadoCambio.deleteMany({
    where: { clienteId: { in: clienteIds } },
  });
  await prisma.membresiaGymCambio.deleteMany({
    where: { membresiaId: { in: membresiaIds } },
  });
  await prisma.membresiaGym.deleteMany({ where: { id: { in: membresiaIds } } });
  await prisma.cliente.deleteMany({
    where: { cedula: { startsWith: cedulaPrefix } },
  });
}

beforeAll(async () => {
  app = Fastify();
  await app.register(prismaPlugin);
  await app.register(authPlugin);
  await app.register(authRoutes);
  await app.register(clienteRoutes);
  await app.register(membresiaRoutes);
  await app.register(recepcionRoutes);
  await app.ready();

  const owner = await loginStaff("admin@clubbeasts.com", "admin123");
  tokenOwner = owner.token;

  const recep = await loginStaff("recep@clubbeasts.com", "recep123");
  tokenRecep = recep.token;

  // Token de rol CLIENTE para asertar el preHandler de las rutas staff.
  const cliente = await crearCliente("ACTIVO");
  const clienteLoginRes = await app.inject({
    method: "POST",
    url: "/auth/login-cliente",
    payload: { cedula: cliente.cedula, pin: PIN },
  });
  expect(clienteLoginRes.statusCode).toBe(200);
  tokenCliente = parseBody(clienteLoginRes).token;
});

afterAll(async () => {
  await cleanupFixtures();
  await app.close();
});

// ─── INC04-CLI-05: sin servicios nuevos para cliente INACTIVO ───────────────

describe("INC04-CLI-05 asignar membresia-gym a cliente INACTIVO retorna 409 CLIENTE_INACTIVO", () => {
  it("CLI-05 INACTIVO -> 409 CLIENTE_INACTIVO con literal G14 y sin fila creada", async () => {
    const cliente = await crearCliente("INACTIVO");
    const antes = await contarMembresias(cliente.id);

    const res = await postMembresia(
      cliente.id,
      { fechaInicio: dia(-3), fechaFin: dia(27) },
      tokenOwner
    );

    expect(res.statusCode).toBe(409);
    const body = parseBody(res);
    const parsed = clienteInactivoResponseSchema.safeParse(body);
    expect(
      parsed.success,
      `respuesta fuera del contrato G14: ${JSON.stringify(
        parsed.success ? null : parsed.error.issues
      )}`
    ).toBe(true);
    expect(body.error).toBe(
      "El cliente está inactivo. Reactíveolo antes de asignar servicios nuevos."
    );
    expect(body.code).toBe("CLIENTE_INACTIVO");
    // Sin escritura: ninguna fila nueva.
    expect(await contarMembresias(cliente.id)).toBe(antes);
  });

  it("CLI-05 la guarda evalua ANTES del solape (CONF-06): INACTIVO con vigencia solapada tambien da 409 CLIENTE_INACTIVO", async () => {
    // El orden de evaluacion ratificado es 404 -> 409 CLIENTE_INACTIVO ->
    // 409 MEMBRESIA_SOLAPADA: una vigencia que ya cubre el rango pedido no
    // convierte la respuesta en MEMBRESIA_SOLAPADA.
    const cliente = await crearCliente("INACTIVO");
    await crearVigencia(cliente.id, dia(-30), dia(30));

    const res = await postMembresia(
      cliente.id,
      { fechaInicio: dia(-3), fechaFin: dia(27) },
      tokenOwner
    );

    expect(res.statusCode).toBe(409);
    const body = parseBody(res);
    expect(body.code).toBe("CLIENTE_INACTIVO");
    expect(await contarMembresias(cliente.id)).toBe(1);
  });

  it("CLI-05 DUENO y RECEPCIONISTA reciben el mismo 409 (roles DEC-001)", async () => {
    const cliente = await crearCliente("INACTIVO");

    const resOwner = await postMembresia(
      cliente.id,
      { fechaInicio: dia(-3), fechaFin: dia(27) },
      tokenOwner
    );
    const resRecep = await postMembresia(
      cliente.id,
      { fechaInicio: dia(-3), fechaFin: dia(27) },
      tokenRecep
    );

    expect(resOwner.statusCode).toBe(409);
    expect(parseBody(resOwner).code).toBe("CLIENTE_INACTIVO");
    expect(resRecep.statusCode).toBe(409);
    expect(parseBody(resRecep).code).toBe("CLIENTE_INACTIVO");
  });

  it("CLI-05 ACTIVO con rango valido sigue retornando 201 (regresion HU-12)", async () => {
    const cliente = await crearCliente("ACTIVO");

    const res = await postMembresia(
      cliente.id,
      { fechaInicio: dia(-3), fechaFin: dia(27) },
      tokenOwner
    );

    expect(res.statusCode).toBe(201);
    expect(await contarMembresias(cliente.id)).toBe(1);
  });

  it("CLI-05 cliente inexistente sigue retornando 404 (regresion, sin cambio de orden)", async () => {
    const res = await postMembresia(
      "cliente-inexistente-inc04",
      { fechaInicio: dia(-3), fechaFin: dia(27) },
      tokenOwner
    );

    expect(res.statusCode).toBe(404);
    const parsed = errorResponseSchema.safeParse(parseBody(res));
    expect(parsed.success).toBe(true);
    expect(parseBody(res).code).toBe("NOT_FOUND");
  });

  it("CLI-05 el rol CLIENTE sigue recibiendo 403 AUTH_FORBIDDEN (preHandler)", async () => {
    const cliente = await crearCliente("INACTIVO");

    const res = await postMembresia(
      cliente.id,
      { fechaInicio: dia(-3), fechaFin: dia(27) },
      tokenCliente
    );

    expect(res.statusCode).toBe(403);
    expect(parseBody(res).code).toBe("AUTH_FORBIDDEN");
    expect(await contarMembresias(cliente.id)).toBe(0);
  });
});

// ─── INC04-CLI-07: ingreso fisico bloqueado para cliente INACTIVO ───────────

describe("INC04-CLI-07 registrar ingreso fisico de cliente INACTIVO retorna 403 INGRESO_NO_PERMITIDO", () => {
  it("CLI-07 INACTIVO con vigencia activa -> 403 INGRESO_NO_PERMITIDO con mensaje exacto y sin fila", async () => {
    // La vigencia activa es intencional: el unico motivo de bloqueo debe ser
    // el estado INACTIVO (DEC-039), no la guarda de vigencia de INC-03.
    const cliente = await crearCliente("INACTIVO");
    await crearVigencia(cliente.id, dia(-30), dia(30));

    const res = await postIngreso(
      { cedula: cliente.cedula, sedeId: SEDE_PRINCIPAL },
      tokenRecep
    );

    expect(res.statusCode).toBe(403);
    const body = parseBody(res);
    expect(body.code).toBe("INGRESO_NO_PERMITIDO");
    expect(body.error).toBe(
      "El cliente está INACTIVO y no puede registrar ingresos"
    );
    expect(await contarIngresos(cliente.cedula)).toBe(0);
  });

  it("CLI-07 ACTIVO con vigencia activa sigue retornando 201 (regresion INC-03)", async () => {
    const cliente = await crearCliente("ACTIVO");
    await crearVigencia(cliente.id, dia(-30), dia(30));

    const res = await postIngreso(
      { cedula: cliente.cedula, sedeId: SEDE_PRINCIPAL },
      tokenRecep
    );

    expect(res.statusCode).toBe(201);
    expect(await contarIngresos(cliente.cedula)).toBe(1);
  });

  // Regresion DEC-030 / INC03-ING-10 (aceptado en INC-03): no se re-cobra
  // el criterio aqui; solo se protege que el GREEN de INC-04 no rompa la rama
  // SUSPENDIDO/RETIRADO al agregar INACTIVO al `if` de estado.
  it("REGRESION INC03-ING-10 SUSPENDIDO con vigencia activa sigue dando 403 INGRESO_NO_PERMITIDO", async () => {
    const cliente = await crearCliente("SUSPENDIDO");
    await crearVigencia(cliente.id, dia(-30), dia(30));

    const res = await postIngreso(
      { cedula: cliente.cedula, sedeId: SEDE_PRINCIPAL },
      tokenRecep
    );

    expect(res.statusCode).toBe(403);
    expect(parseBody(res).error).toBe(
      "El cliente está SUSPENDIDO y no puede registrar ingresos"
    );
    expect(await contarIngresos(cliente.cedula)).toBe(0);
  });

  it("REGRESION INC03-ING-10 RETIRADO con vigencia activa sigue dando 403 INGRESO_NO_PERMITIDO", async () => {
    const cliente = await crearCliente("RETIRADO");
    await crearVigencia(cliente.id, dia(-30), dia(30));

    const res = await postIngreso(
      { cedula: cliente.cedula, sedeId: SEDE_PRINCIPAL },
      tokenRecep
    );

    expect(res.statusCode).toBe(403);
    expect(parseBody(res).error).toBe(
      "El cliente está RETIRADO y no puede registrar ingresos"
    );
    expect(await contarIngresos(cliente.cedula)).toBe(0);
  });
});
