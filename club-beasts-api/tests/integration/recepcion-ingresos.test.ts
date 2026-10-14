/**
 * INC-03 (HU-30 + HU-16 b4) — RED del registro de ingresos en recepcion.
 *
 * Criterios: `INC03-ING-01..11` (HU30-C01..C11) con DEC-030 (SUSPENDIDO/
 * RETIRADO -> 403), DEC-025/CONF-02 (CONGELADO -> 201), CONF-03 (varios
 * ingresos por dia, tambien entre sedes), DEC-005/006 (America/Bogota y
 * extremos inclusivos), CONF-06 (hora `HH:mm:ss`) y la guarda
 * `INC03-VEN-04`: con la vigencia `VENCIDA` el ingreso responde
 * `403 INGRESO_NO_PERMITIDO` (mensaje exacto por motivo).
 *
 * Estado RED (2026-10-13): **no existen** `POST /recepcion/ingresos` ni
 * `GET /recepcion/ingresos` en `src/routes/` (solo `auth.ts`, `clientes.ts`,
 * `membresia.ts`), por lo que toda peticion cae en el 404 de Fastify
 * (`Route ... not found`, cuerpo sin `code`) en lugar de 201/200/400/401/403/
 * 404: todos los tests de este archivo fallan (RED) y ninguno puede pasar por
 * accidente (los 400/403/404 exigen `code` y mensaje exactos; los 201 exigen
 * el schema G14 `ingresoResponseSchema`).
 *
 * GREEN (backend-developer): crear `src/routes/recepcion.ts` (alta + listado)
 * y agregar `await app.register(recepcionRoutes)` al app de este archivo (un
 * import + una linea; ninguna asercion cambia). Los fixtures de historial se
 * escriben directamente en la BD (`prisma.ingreso`), asi no dependen del alta.
 *
 * Fixtures (spec INC-03 F1/F2/F3/F4/F5/F6/F7/F9/F11/F12/F13/F14): fechas
 * dinamicas relativas a `getTodayBogota()` (DEC-013); sedes reales del seed
 * (`sede-1`/`sede-2`); aislamiento por prefijo de cedula 9934 (DEC-012).
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
  ingresoResponseSchema,
  ingresosListResponseSchema,
} from "../../features/acceptance-criteria/HU-30-schemas";

const cedulaPrefix = "9934";
const pin = "1234";
const SEDE_PRINCIPAL = "sede-1";
const SEDE_SECUNDARIA = "sede-2";
const CEDULA_INEXISTENTE = "99999999";
const SEDE_INEXISTENTE = "sede-inexistente-000";

/** DEC-013: todo el archivo se calcula sobre la fecha real de Bogota. */
const HOY = getTodayBogota();

let app: any;
let tokenOwner = "";
let tokenRecep = "";
let tokenCliente = "";
let ownerUserId = "";
let ownerNombre = "";
let recepUserId = "";
let clienteSeq = 0;

let activaCedula = "";
let congeladoId = "";
let sinVigenciaCedula = "";
let vencidaCedula = "";
let programadaCedula = "";
let finHoyCedula = "";

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

async function crearCliente(
  opciones: { estado?: string } = {}
): Promise<{ id: string; cedula: string }> {
  clienteSeq += 1;
  const cedula = `${cedulaPrefix}${String(clienteSeq).padStart(6, "0")}`;
  const cliente = await prisma.cliente.create({
    data: {
      cedula,
      nombres: "Ingreso",
      apellidos: `Cliente${clienteSeq}`,
      telefono: "3000000000",
      sedeId: SEDE_PRINCIPAL,
      pin: await bcrypt.hash(pin, 4),
      estado: opciones.estado ?? "ACTIVO",
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

async function crearIngresoDirecto(
  clienteId: string,
  datos: { fecha: string; hora: string; sedeId?: string }
) {
  return prisma.ingreso.create({
    data: {
      clienteId,
      sedeId: datos.sedeId ?? SEDE_PRINCIPAL,
      registradoPorId: recepUserId,
      fecha: datos.fecha,
      hora: datos.hora,
    },
  });
}

async function loginStaff(
  email: string,
  password: string
): Promise<{ token: string; id: string; nombre: string }> {
  const res = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email, password },
  });
  expect(res.statusCode).toBe(200);
  const body = parseBody(res);
  return { token: body.token, id: body.user.id, nombre: body.user.nombre };
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

function postIngreso(
  payload: Record<string, unknown>,
  token?: string
) {
  return app.inject({
    method: "POST",
    url: "/recepcion/ingresos",
    headers: token ? headers(token) : undefined,
    payload,
  });
}

function getIngresos(query: string, token?: string) {
  return app.inject({
    method: "GET",
    url: `/recepcion/ingresos${query}`,
    headers: token ? headers(token) : undefined,
  });
}

async function contarIngresos(cedula: string): Promise<number> {
  const cliente = await prisma.cliente.findUnique({ where: { cedula } });
  if (!cliente) return 0;
  return prisma.ingreso.count({ where: { clienteId: cliente.id } });
}

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? "inc03-ingresos-secret";

  await cleanupFixtures();

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
  ownerUserId = owner.id;
  ownerNombre = owner.nombre;
  const recep = await loginStaff("recep@clubbeasts.com", "recep123");
  tokenRecep = recep.token;
  recepUserId = recep.id;

  // F1: ACTIVA que abarca hoy.
  const activa = await crearCliente();
  activaCedula = activa.cedula;
  await crearVigencia(activa.id, dia(-30), dia(30));
  tokenCliente = await loginCliente(activaCedula);

  // F6: frontera `hoy == fechaFin` -> 201.
  const finHoy = await crearCliente();
  finHoyCedula = finHoy.cedula;
  await crearVigencia(finHoy.id, dia(-5), dia(0));

  // F2/F7: frontera `hoy == fechaFin + 1` -> 403 vencida.
  const vencida = await crearCliente();
  vencidaCedula = vencida.cedula;
  await crearVigencia(vencida.id, dia(-30), dia(-1));

  // F3: `hoy == fechaInicio - 1` -> 403 programada.
  const programada = await crearCliente();
  programadaCedula = programada.cedula;
  await crearVigencia(programada.id, dia(1), dia(30));

  // F4: sin ninguna vigencia GYM -> 403 sin vigencia.
  const sinVigencia = await crearCliente();
  sinVigenciaCedula = sinVigencia.cedula;

  // F5: CONGELADO (pausa que cubre hoy) -> 201 por DEC-025.
  const congelado = await crearCliente();
  congeladoId = congelado.id;
  const vigenciaCongelada = await crearVigencia(congelado.id, dia(-30), dia(30));
  const pausa = await app.inject({
    method: "POST",
    url: `/clientes/${congelado.id}/vigencias/${vigenciaCongelada}/congelar`,
    headers: headers(tokenOwner),
    payload: {
      fechaInicio: dia(-1),
      fechaFin: dia(1),
      motivo: "Vacaciones ingresos",
      version: 1,
    },
  });
  expect(pausa.statusCode).toBe(200);
});

afterAll(async () => {
  await app.close();
  await cleanupFixtures();
});

// ─── INC03-ING-01 / ING-03 ───────────────────────────────────────────────────

describe("INC03-ING-01 y INC03-ING-03 registro exitoso y trazabilidad", () => {
  it("INC03-ING-01/03 POST con membresia ACTIVA responde 201 con fecha, hora, sede y registradoPor (schema G14)", async () => {
    const cliente = await crearCliente();
    await crearVigencia(cliente.id, dia(-30), dia(30));

    const res = await postIngreso(
      { cedula: cliente.cedula, sedeId: SEDE_PRINCIPAL },
      tokenRecep
    );

    expect(res.statusCode).toBe(201);
    const body = parseBody(res);
    expect(ingresoResponseSchema.parse(body)).toBeTruthy();
    expect(body.clienteId).toBe(cliente.id);
    expect(body.cedula).toBe(cliente.cedula);
    expect(body.fecha).toBe(HOY);
    expect(body.hora).toMatch(/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/);
    expect(body.sede.id).toBe(SEDE_PRINCIPAL);
    expect(body.sede.nombre).toBe("Sede Principal");
    // registradoPor = request.user.id del token usado (HU30-C03).
    expect(body.registradoPor.id).toBe(recepUserId);
    expect(body.registradoPor.nombre).toBeTruthy();
    expect(typeof body.createdAt).toBe("string");
  });

  it("INC03-ING-03 registradoPor refleja al DUENO cuando el token es del dueno", async () => {
    const cliente = await crearCliente();
    await crearVigencia(cliente.id, dia(-30), dia(30));

    const res = await postIngreso(
      { cedula: cliente.cedula, sedeId: SEDE_PRINCIPAL },
      tokenOwner
    );

    expect(res.statusCode).toBe(201);
    const body = parseBody(res);
    expect(body.registradoPor.id).toBe(ownerUserId);
    expect(body.registradoPor.nombre).toBe(ownerNombre);
  });
});

// ─── INC03-ING-02 (CONF-03) ──────────────────────────────────────────────────

describe("INC03-ING-02 multiples ingresos por dia sin dedupe", () => {
  it("INC03-ING-02 el 2do y 3er ingreso del dia responden 201 con fila nueva (tambien en otra sede)", async () => {
    const cliente = await crearCliente();
    await crearVigencia(cliente.id, dia(-30), dia(30));

    const primero = await postIngreso(
      { cedula: cliente.cedula, sedeId: SEDE_PRINCIPAL },
      tokenRecep
    );
    const segundo = await postIngreso(
      { cedula: cliente.cedula, sedeId: SEDE_PRINCIPAL },
      tokenRecep
    );
    const tercero = await postIngreso(
      { cedula: cliente.cedula, sedeId: SEDE_SECUNDARIA },
      tokenRecep
    );

    expect(primero.statusCode).toBe(201);
    expect(segundo.statusCode).toBe(201);
    expect(tercero.statusCode).toBe(201);

    const ids = [
      parseBody(primero).id,
      parseBody(segundo).id,
      parseBody(tercero).id,
    ];
    expect(new Set(ids).size).toBe(3);
    expect(parseBody(tercero).sede.id).toBe(SEDE_SECUNDARIA);
    expect(await contarIngresos(cliente.cedula)).toBe(3);
  });
});

// ─── INC03-ING-04 / ING-11 (+ INC03-VEN-04) ──────────────────────────────────

describe("INC03-ING-04 y INC03-ING-11 guardas de membresia habilitada", () => {
  it("INC03-ING-04 CONGELADO permite ingresar (201, DEC-025 / CONF-02)", async () => {
    const cliente = await prisma.cliente.findUniqueOrThrow({
      where: { id: congeladoId },
    });

    const res = await postIngreso(
      { cedula: cliente.cedula, sedeId: SEDE_PRINCIPAL },
      tokenRecep
    );

    expect(res.statusCode).toBe(201);
    expect(parseBody(res).cedula).toBe(cliente.cedula);
  });

  it("INC03-ING-04/11 hoy == fechaFin permite ingresar (201, extremo inclusivo)", async () => {
    const res = await postIngreso(
      { cedula: finHoyCedula, sedeId: SEDE_PRINCIPAL },
      tokenRecep
    );
    expect(res.statusCode).toBe(201);
  });

  it("INC03-ING-04/VEN-04 hoy == fechaFin + 1 -> 403 INGRESO_NO_PERMITIDO con el mensaje de vencida", async () => {
    const res = await postIngreso(
      { cedula: vencidaCedula, sedeId: SEDE_PRINCIPAL },
      tokenRecep
    );

    expect(res.statusCode).toBe(403);
    const body = parseBody(res);
    expect(body.code).toBe("INGRESO_NO_PERMITIDO");
    expect(body.error).toBe(
      `La membresía no está habilitada para ingresar (vencida el ${dia(-1)})`
    );
    expect(await contarIngresos(vencidaCedula)).toBe(0);
  });

  it("INC03-ING-04/11 hoy == fechaInicio - 1 -> 403 con el mensaje de programada", async () => {
    const res = await postIngreso(
      { cedula: programadaCedula, sedeId: SEDE_PRINCIPAL },
      tokenRecep
    );

    expect(res.statusCode).toBe(403);
    const body = parseBody(res);
    expect(body.code).toBe("INGRESO_NO_PERMITIDO");
    expect(body.error).toBe(
      `La membresía no está habilitada para ingresar (aún no inicia desde ${dia(1)})`
    );
    expect(await contarIngresos(programadaCedula)).toBe(0);
  });

  it("INC03-ING-04 sin ninguna vigencia GYM -> 403 con el mensaje de sin vigencia", async () => {
    const res = await postIngreso(
      { cedula: sinVigenciaCedula, sedeId: SEDE_PRINCIPAL },
      tokenRecep
    );

    expect(res.statusCode).toBe(403);
    const body = parseBody(res);
    expect(body.code).toBe("INGRESO_NO_PERMITIDO");
    expect(body.error).toBe(
      "La membresía no está habilitada para ingresar (no tiene vigencia activa)"
    );
    expect(await contarIngresos(sinVigenciaCedula)).toBe(0);
  });
});

// ─── INC03-ING-10 (DEC-030) ──────────────────────────────────────────────────

describe("INC03-ING-10 estado general del cliente (DEC-030)", () => {
  it("INC03-ING-10 SUSPENDIDO con membresia ACTIVA -> 403 INGRESO_NO_PERMITIDO sin escritura", async () => {
    const cliente = await crearCliente({ estado: "SUSPENDIDO" });
    await crearVigencia(cliente.id, dia(-30), dia(30));

    const res = await postIngreso(
      { cedula: cliente.cedula, sedeId: SEDE_PRINCIPAL },
      tokenRecep
    );

    expect(res.statusCode).toBe(403);
    const body = parseBody(res);
    expect(body.code).toBe("INGRESO_NO_PERMITIDO");
    expect(body.error).toBe(
      "El cliente está SUSPENDIDO y no puede registrar ingresos"
    );
    expect(await contarIngresos(cliente.cedula)).toBe(0);
  });

  it("INC03-ING-10 RETIRADO con membresia ACTIVA -> 403 INGRESO_NO_PERMITIDO sin escritura", async () => {
    const cliente = await crearCliente({ estado: "RETIRADO" });
    await crearVigencia(cliente.id, dia(-30), dia(30));

    const res = await postIngreso(
      { cedula: cliente.cedula, sedeId: SEDE_PRINCIPAL },
      tokenOwner
    );

    expect(res.statusCode).toBe(403);
    const body = parseBody(res);
    expect(body.code).toBe("INGRESO_NO_PERMITIDO");
    expect(body.error).toBe(
      "El cliente está RETIRADO y no puede registrar ingresos"
    );
    expect(await contarIngresos(cliente.cedula)).toBe(0);
  });
});

// ─── INC03-ING-06 / ING-07 / ING-08 ──────────────────────────────────────────

describe("INC03-ING-06..08 validacion de cedula y sede", () => {
  it("INC03-ING-06 cedula inexistente -> 404 NOT_FOUND sin crear fila", async () => {
    const res = await postIngreso(
      { cedula: CEDULA_INEXISTENTE, sedeId: SEDE_PRINCIPAL },
      tokenRecep
    );

    expect(res.statusCode).toBe(404);
    const body = parseBody(res);
    expect(body.code).toBe("NOT_FOUND");
    expect(body.error).toBe("Cliente no encontrado");
  });

  const cedulasInvalidas = ["ABC", "12345", "12345678901", ""];
  for (const cedula of cedulasInvalidas) {
    it(`INC03-ING-07 cedula "${cedula}" -> 400 VALIDATION_ERROR con el mensaje exacto`, async () => {
      const res = await postIngreso(
        { cedula, sedeId: SEDE_PRINCIPAL },
        tokenRecep
      );

      expect(res.statusCode).toBe(400);
      const body = parseBody(res);
      expect(body.code).toBe("VALIDATION_ERROR");
      expect(body.error).toBe("Cédula debe ser numérica de 6 a 10 dígitos");
      expect(await contarIngresos(activaCedula)).toBe(0);
    });
  }

  it("INC03-ING-08 sin sedeId -> 400 VALIDATION_ERROR 'sedeId es requerido'", async () => {
    const res = await postIngreso({ cedula: activaCedula }, tokenRecep);

    expect(res.statusCode).toBe(400);
    const body = parseBody(res);
    expect(body.code).toBe("VALIDATION_ERROR");
    expect(body.error).toBe("sedeId es requerido");
  });

  it("INC03-ING-08 sedeId vacio -> 400 VALIDATION_ERROR 'sedeId es requerido'", async () => {
    const res = await postIngreso(
      { cedula: activaCedula, sedeId: "" },
      tokenRecep
    );

    expect(res.statusCode).toBe(400);
    expect(parseBody(res).error).toBe("sedeId es requerido");
  });

  it("INC03-ING-08 sedeId de 37 caracteres -> 400 'sedeId excede longitud máxima'", async () => {
    const res = await postIngreso(
      { cedula: activaCedula, sedeId: "x".repeat(37) },
      tokenRecep
    );

    expect(res.statusCode).toBe(400);
    const body = parseBody(res);
    expect(body.code).toBe("VALIDATION_ERROR");
    expect(body.error).toBe("sedeId excede longitud máxima");
  });

  it("INC03-ING-08 sedeId inexistente -> 400 con el mensaje proprio de sede", async () => {
    const res = await postIngreso(
      { cedula: activaCedula, sedeId: SEDE_INEXISTENTE },
      tokenRecep
    );

    expect(res.statusCode).toBe(400);
    const body = parseBody(res);
    expect(body.code).toBe("VALIDATION_ERROR");
    expect(body.error).toBe(
      "La sede indicada no existe. Verifique el identificador enviado."
    );
    expect(await contarIngresos(activaCedula)).toBe(0);
  });
});

// ─── INC03-ING-09 ────────────────────────────────────────────────────────────

describe("INC03-ING-09 permisos DEC-001 del registro de ingreso", () => {
  it("INC03-ING-09 sin token -> 401 AUTH_TOKEN_MISSING", async () => {
    const res = await postIngreso({
      cedula: activaCedula,
      sedeId: SEDE_PRINCIPAL,
    });

    expect(res.statusCode).toBe(401);
    expect(parseBody(res).code).toBe("AUTH_TOKEN_MISSING");
  });

  it("INC03-ING-09 token CLIENTE (incluso con su propia cedula) -> 403 AUTH_FORBIDDEN", async () => {
    const res = await postIngreso(
      { cedula: activaCedula, sedeId: SEDE_PRINCIPAL },
      tokenCliente
    );

    expect(res.statusCode).toBe(403);
    const body = parseBody(res);
    expect(body.code).toBe("AUTH_FORBIDDEN");
    expect(body.error).toBe("No tienes permisos para realizar esta acción.");
    expect(await contarIngresos(activaCedula)).toBe(0);
  });

  it("INC03-ING-09 token DUENO -> 201", async () => {
    const res = await postIngreso(
      { cedula: activaCedula, sedeId: SEDE_PRINCIPAL },
      tokenOwner
    );
    expect(res.statusCode).toBe(201);
    expect(parseBody(res).registradoPor.id).toBe(ownerUserId);
  });
});

// ─── INC03-ING-05 ────────────────────────────────────────────────────────────

describe("INC03-ING-05 listado de ingresos", () => {
  it("INC03-ING-05 devuelve lista ordenada desc con total (schema G14)", async () => {
    const cliente = await crearCliente();
    await crearVigencia(cliente.id, dia(-30), dia(30));
    await crearIngresoDirecto(cliente.id, {
      fecha: dia(-1),
      hora: "18:30:00",
      sedeId: SEDE_PRINCIPAL,
    });
    await crearIngresoDirecto(cliente.id, {
      fecha: dia(0),
      hora: "07:15:00",
      sedeId: SEDE_SECUNDARIA,
    });

    const res = await getIngresos(`?cedula=${cliente.cedula}`, tokenRecep);

    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    expect(ingresosListResponseSchema.parse(body)).toBeTruthy();
    expect(body.total).toBe(2);
    expect(body.ingresos).toHaveLength(2);
    expect(body.ingresos[0].fecha).toBe(dia(0));
    expect(body.ingresos[0].hora).toBe("07:15:00");
    expect(body.ingresos[0].sede.id).toBe(SEDE_SECUNDARIA);
    expect(body.ingresos[1].fecha).toBe(dia(-1));
    expect(body.ingresos[1].hora).toBe("18:30:00");
    expect(body.ingresos[1].registradoPor.id).toBe(recepUserId);
  });

  it("INC03-ING-05 cliente sin ingresos -> { ingresos: [], total: 0 }", async () => {
    const res = await getIngresos(`?cedula=${sinVigenciaCedula}`, tokenRecep);

    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.ingresos).toEqual([]);
    expect(body.total).toBe(0);
  });

  it("INC03-ING-05 el filtro ?fecha= es exacto y total cuenta solo las filas devueltas", async () => {
    const cliente = await crearCliente();
    await crearVigencia(cliente.id, dia(-30), dia(30));
    await crearIngresoDirecto(cliente.id, {
      fecha: dia(-1),
      hora: "18:30:00",
    });
    await crearIngresoDirecto(cliente.id, { fecha: dia(0), hora: "07:15:00" });
    await crearIngresoDirecto(cliente.id, { fecha: dia(0), hora: "19:00:00" });

    const res = await getIngresos(
      `?cedula=${cliente.cedula}&fecha=${dia(0)}`,
      tokenRecep
    );

    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.total).toBe(2);
    expect(body.ingresos).toHaveLength(2);
    expect(
      body.ingresos.every((ingreso: { fecha: string }) => ingreso.fecha === dia(0))
    ).toBe(true);
  });

  it("INC03-ING-05/06 cedula inexistente en el listado -> 404 NOT_FOUND", async () => {
    const res = await getIngresos(
      `?cedula=${CEDULA_INEXISTENTE}`,
      tokenRecep
    );

    expect(res.statusCode).toBe(404);
    const body = parseBody(res);
    expect(body.code).toBe("NOT_FOUND");
    expect(body.error).toBe("Cliente no encontrado");
  });

  it("INC03-ING-07 cedula invalida en el listado -> 400 con el mensaje exacto", async () => {
    const res = await getIngresos("?cedula=ABC", tokenRecep);

    expect(res.statusCode).toBe(400);
    const body = parseBody(res);
    expect(body.code).toBe("VALIDATION_ERROR");
    expect(body.error).toBe("Cédula debe ser numérica de 6 a 10 dígitos");
  });

  it("INC03-ING-05 fecha mal formada -> 400 'Fecha debe tener formato YYYY-MM-DD'", async () => {
    const res = await getIngresos(
      `?cedula=${activaCedula}&fecha=13-10-2026`,
      tokenRecep
    );

    expect(res.statusCode).toBe(400);
    const body = parseBody(res);
    expect(body.code).toBe("VALIDATION_ERROR");
    expect(body.error).toBe("Fecha debe tener formato YYYY-MM-DD");
  });

  it("INC03-ING-09 el listado sin token -> 401 y con token CLIENTE -> 403", async () => {
    const sinToken = await getIngresos(`?cedula=${activaCedula}`);
    expect(sinToken.statusCode).toBe(401);
    expect(parseBody(sinToken).code).toBe("AUTH_TOKEN_MISSING");

    const cliente = await getIngresos(
      `?cedula=${activaCedula}`,
      tokenCliente
    );
    expect(cliente.statusCode).toBe(403);
    expect(parseBody(cliente).code).toBe("AUTH_FORBIDDEN");
  });
});
