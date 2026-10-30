/**
 * INC-02 (ampliacion DEC-024) — RED de descongelar: `POST
 * /clientes/:clienteId/vigencias/:vigenciaId/descongelar` (sin prefijo `/api`).
 *
 * Criterio: `HU15-C07` con la cobertura **D1..D20** de
 * `features/acceptance-criteria/HU-15-criterios-aceptacion.md` (0 puntos HU-15,
 * se prueba igual que el resto).
 * Formula obligatoria (DEC-024, ratificada):
 * `diasDevueltos = max(0, finRango - max(hoy, inicioRango) + 1)` y
 * `fechaFin' = fechaFin - diasDevueltos`; los dias ya consumidos permanecen
 * descontados. Si `diasDevueltos = 0` -> `409 CONGELACION_INEXISTENTE`.
 *
 * Orden de evaluacion (spec INC-02): 401/403 -> 400 (Zod; `motivo` solo si
 * viaja, sin post-Zod de fechas) -> 404 -> 409 `MEMBRESIA_CONFLICTO` ->
 * `CONGELACION_NO_PERMITIDA` (tipo) -> `MEMBRESIA_VENCIDA` ->
 * `CONGELACION_INEXISTENTE`. **No existe rama `MEMBRESIA_SOLAPADA`** (D19):
 * decrementar `fechaFin` nunca crea un solape (DEC-008).
 *
 * Estado RED (2026-10-08): la ruta no existe, asi que las peticiones caen en el
 * 404 de Fastify (cuerpo sin `code`); las aserciones sobre `code`/`error` evitan
 * que ese 404 pase por accidente.
 *
 * Fixtures: la doble llamada a la API del spec (F8/F9) no puede ejecutarse en
 * RED, asi que F8/F9/F10/F11 se montan con filas directas en BD que producen el
 * **mismo estado final** que la receta del spec; F1 se crea por API y F3/F4 son
 * directas. Fechas dinamicas relativas a `getTodayBogota()` (DEC-013).
 * Aislamiento: prefijo de cedula 9916.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import bcrypt from "bcryptjs";
import prisma from "../../src/lib/prisma";
import authRoutes from "../../src/routes/auth";
import membresiaRoutes from "../../src/routes/membresia";
import prismaPlugin from "../../src/plugins/prisma";
import authPlugin from "../../src/plugins/auth";
import { getTodayBogota } from "../../src/services/membresia.service";
import { descongelarResponseSchema } from "../../features/acceptance-criteria/HU-15-schemas";

const prefix = "inc02_desc";
const cedulaPrefix = "9916";
const ownerEmail = `${prefix}_dueno@clubbeasts.test`;
const recepEmail = `${prefix}_recep@clubbeasts.test`;
const pin = "1234";

const HOY = getTodayBogota();

const CLIENTE_DUMMY = "cliente-sin-recurso-0001";
const VIGENCIA_DUMMY = "vigencia-sin-recurso-0001";

let app: any;
let tokenOwner = "";
let tokenRecep = "";
let tokenCliente = "";
let ownerUserId = "";
let clienteSeq = 0;

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

function sumarDias(fecha: string, cantidad: number): string {
  const [anio, mes, diaMes] = fecha.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, diaMes + cantidad))
    .toISOString()
    .slice(0, 10);
}

function diasInclusivos(inicio: string, fin: string): number {
  const [y1, m1, d1] = inicio.split("-").map(Number);
  const [y2, m2, d2] = fin.split("-").map(Number);
  const diferencia = Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1);
  return Math.round(diferencia / 86_400_000) + 1;
}

/** diasRestantes de la formula DEC-024 sobre los tres estados de la pausa. */
function diasRestantes(rango: { inicio: string; fin: string }): number {
  if (HOY > rango.fin) return 0;
  const desde = HOY < rango.inicio ? rango.inicio : HOY;
  return diasInclusivos(desde, rango.fin);
}

function bodyValido(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { version: 2, ...overrides };
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

  await prisma.membresiaGymCambio.deleteMany({
    where: { membresiaId: { in: membresiaIds } },
  });
  await prisma.membresiaGym.deleteMany({ where: { id: { in: membresiaIds } } });
  await prisma.cliente.deleteMany({
    where: { cedula: { startsWith: cedulaPrefix } },
  });
  await prisma.user.deleteMany({
    where: { email: { in: [ownerEmail, recepEmail] } },
  });
  await prisma.sede.deleteMany({ where: { id: `${prefix}_sede` } });
}

async function crearCliente(): Promise<{ id: string; cedula: string }> {
  clienteSeq += 1;
  const cedula = `${cedulaPrefix}${String(clienteSeq).padStart(6, "0")}`;
  const cliente = await prisma.cliente.create({
    data: {
      cedula,
      nombres: "Cliente",
      apellidos: "Descongelar",
      telefono: "3000000000",
      sedeId: `${prefix}_sede`,
      pin: await bcrypt.hash(pin, 4),
      estado: "ACTIVO",
    },
  });
  return { id: cliente.id, cedula };
}

async function crearVigenciaActiva(clienteId: string): Promise<string> {
  const res = await app.inject({
    method: "POST",
    url: `/clientes/${clienteId}/membresias-gym`,
    headers: headers(tokenOwner),
    payload: { fechaInicio: dia(-30), fechaFin: dia(30) },
  });
  expect(res.statusCode).toBe(201);
  return parseBody(res).id;
}

async function crearVigenciaDirecta(
  clienteId: string,
  opciones: { fechaInicio: string; fechaFin: string; tipoServicio?: string }
): Promise<string> {
  const creada = await prisma.membresiaGym.create({
    data: {
      clienteId,
      fechaInicio: opciones.fechaInicio,
      fechaFin: opciones.fechaFin,
      tipoServicio: opciones.tipoServicio ?? "GYM",
      creadoPorId: ownerUserId,
      actualizadoPorId: ownerUserId,
      version: 1,
    },
  });
  await prisma.membresiaGymCambio.create({
    data: {
      membresiaId: creada.id,
      actorId: ownerUserId,
      accion: "CREACION",
      version: 1,
      fechaInicioNueva: opciones.fechaInicio,
      fechaFinNueva: opciones.fechaFin,
    },
  });
  return creada.id;
}

/**
 * Fila `CONGELACION` directa en BD con la extension ya aplicada (estado
 * identico al de una llamada 200 a `congelar`, receta de F8/F9/F11 del spec).
 */
async function aplicarPausaDirecta(
  vigenciaId: string,
  rango: { inicio: string; fin: string },
  motivo = "Pausa directa de fixture"
): Promise<{ version: number; fechaFin: string; dias: number }> {
  const vigencia = await prisma.membresiaGym.findUniqueOrThrow({
    where: { id: vigenciaId },
  });
  const dias = diasInclusivos(rango.inicio, rango.fin);
  const fechaFinNueva = sumarDias(vigencia.fechaFin, dias);
  const nuevaVersion = vigencia.version + 1;

  await prisma.membresiaGymCambio.create({
    data: {
      membresiaId: vigenciaId,
      actorId: ownerUserId,
      accion: "CONGELACION",
      version: nuevaVersion,
      motivo,
      congelacionInicio: rango.inicio,
      congelacionFin: rango.fin,
      fechaInicioAnterior: vigencia.fechaInicio,
      fechaFinAnterior: vigencia.fechaFin,
      fechaInicioNueva: vigencia.fechaInicio,
      fechaFinNueva,
    },
  });
  await prisma.membresiaGym.update({
    where: { id: vigenciaId },
    data: { fechaFin: fechaFinNueva, version: nuevaVersion, actualizadoPorId: ownerUserId },
  });

  return { version: nuevaVersion, fechaFin: fechaFinNueva, dias };
}

/** Fila `DESCONGELACION` directa en BD (estado F10: pausa ya descongelada). */
async function aplicarDescongelacionDirecta(
  vigenciaId: string,
  rango: { inicio: string; fin: string },
  restantes: number
): Promise<{ version: number; fechaFin: string }> {
  const vigencia = await prisma.membresiaGym.findUniqueOrThrow({
    where: { id: vigenciaId },
  });
  const fechaFinNueva = sumarDias(vigencia.fechaFin, -restantes);
  const nuevaVersion = vigencia.version + 1;

  await prisma.membresiaGymCambio.create({
    data: {
      membresiaId: vigenciaId,
      actorId: ownerUserId,
      accion: "DESCONGELACION",
      version: nuevaVersion,
      congelacionInicio: rango.inicio,
      congelacionFin: rango.fin,
      fechaInicioAnterior: vigencia.fechaInicio,
      fechaFinAnterior: vigencia.fechaFin,
      fechaInicioNueva: vigencia.fechaInicio,
      fechaFinNueva,
    },
  });
  await prisma.membresiaGym.update({
    where: { id: vigenciaId },
    data: { fechaFin: fechaFinNueva, version: nuevaVersion, actualizadoPorId: ownerUserId },
  });

  return { version: nuevaVersion, fechaFin: fechaFinNueva };
}

async function descongelar(
  clienteId: string,
  vigenciaId: string,
  payload: Record<string, unknown>,
  token: string = tokenOwner
) {
  return app.inject({
    method: "POST",
    url: `/clientes/${clienteId}/vigencias/${vigenciaId}/descongelar`,
    headers: headers(token),
    payload,
  });
}

async function listarMembresias(clienteId: string) {
  const res = await app.inject({
    method: "GET",
    url: `/clientes/${clienteId}/membresias-gym`,
    headers: headers(tokenOwner),
  });
  expect(res.statusCode).toBe(200);
  return parseBody(res);
}

function buscarMembresia(body: any, vigenciaId: string) {
  const membresia = body.membresias.find(
    (membresia: { id: string }) => membresia.id === vigenciaId
  );
  expect(membresia).toBeDefined();
  return membresia;
}

function tokenExpirado(): string {
  return app.jwt.sign({
    id: ownerUserId,
    email: ownerEmail,
    nombre: "Dueño Descongelar",
    rol: "DUENO",
    exp: Math.floor(Date.now() / 1000) - 120,
  });
}

/** F1 + pausa `hoy-2..hoy+7` (N = 10, fechaFin = hoy+40, version 2). */
async function fixturePausaEnCurso(): Promise<{
  clienteId: string;
  vigenciaId: string;
  rango: { inicio: string; fin: string };
}> {
  const cliente = await crearCliente();
  const vigenciaId = await crearVigenciaActiva(cliente.id);
  const rango = { inicio: dia(-2), fin: dia(7) };
  await aplicarPausaDirecta(vigenciaId, rango);
  return { clienteId: cliente.id, vigenciaId, rango };
}

/** F1 + pausa futura `hoy+5..hoy+14` (N = 10, fechaFin = hoy+40, version 2). */
async function fixturePausaFutura(): Promise<{
  clienteId: string;
  vigenciaId: string;
  rango: { inicio: string; fin: string };
}> {
  const cliente = await crearCliente();
  const vigenciaId = await crearVigenciaActiva(cliente.id);
  const rango = { inicio: dia(5), fin: dia(14) };
  await aplicarPausaDirecta(vigenciaId, rango);
  return { clienteId: cliente.id, vigenciaId, rango };
}

/** F11: pausa terminada por calendario `hoy-20..hoy-10` (N = 11). */
async function fixturePausaTerminada(): Promise<{ clienteId: string; vigenciaId: string }> {
  const cliente = await crearCliente();
  const vigenciaId = await crearVigenciaActiva(cliente.id);
  await aplicarPausaDirecta(vigenciaId, { inicio: dia(-20), fin: dia(-10) });
  return { clienteId: cliente.id, vigenciaId };
}

/** F10: pausa en curso ya descongelada (ultima fila = DESCONGELACION). */
async function fixtureYaDescongelada(): Promise<{
  clienteId: string;
  vigenciaId: string;
  rango: { inicio: string; fin: string };
}> {
  const fixture = await fixturePausaEnCurso();
  await aplicarDescongelacionDirecta(
    fixture.vigenciaId,
    fixture.rango,
    diasRestantes(fixture.rango)
  );
  return fixture;
}

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? "inc02-descongelar-secret";

  await cleanupFixtures();

  const [hashedOwner, hashedRecep] = await Promise.all([
    bcrypt.hash("owner123", 10),
    bcrypt.hash("recep123", 10),
  ]);
  await prisma.sede.upsert({
    where: { id: `${prefix}_sede` },
    update: { nombre: "Sede INC02 Descongelar" },
    create: { id: `${prefix}_sede`, nombre: "Sede INC02 Descongelar" },
  });
  const owner = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: { contrasena: hashedOwner, nombre: "Dueño Descongelar", rol: "DUENO" },
    create: { email: ownerEmail, contrasena: hashedOwner, nombre: "Dueño Descongelar", rol: "DUENO" },
  });
  await prisma.user.upsert({
    where: { email: recepEmail },
    update: { contrasena: hashedRecep, nombre: "Recepcion Descongelar", rol: "RECEPCIONISTA" },
    create: {
      email: recepEmail,
      contrasena: hashedRecep,
      nombre: "Recepcion Descongelar",
      rol: "RECEPCIONISTA",
    },
  });
  ownerUserId = owner.id;

  app = Fastify();
  await app.register(prismaPlugin);
  await app.register(authPlugin);
  await app.register(authRoutes);
  await app.register(membresiaRoutes);
  await app.ready();

  const loginOwner = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email: ownerEmail, password: "owner123" },
  });
  expect(loginOwner.statusCode).toBe(200);
  tokenOwner = parseBody(loginOwner).token;

  const loginRecep = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email: recepEmail, password: "recep123" },
  });
  expect(loginRecep.statusCode).toBe(200);
  tokenRecep = parseBody(loginRecep).token;

  const cliente = await crearCliente();
  const loginCliente = await app.inject({
    method: "POST",
    url: "/auth/login-cliente",
    payload: { cedula: cliente.cedula, pin },
  });
  expect(loginCliente.statusCode).toBe(200);
  tokenCliente = parseBody(loginCliente).token;
});

afterAll(async () => {
  await app.close();
  await cleanupFixtures();
});

// ─── HU15-C07 — 400 VALIDATION_ERROR (D8, D9) ────────────────────────────────

describe("POST .../descongelar — HU15-C07 validaciones de body (400 VALIDATION_ERROR)", () => {
  const CASOS_400: Array<{
    caso: string;
    payload: Record<string, unknown>;
    mensaje: string;
  }> = [
    {
      caso: "D8 — version ausente",
      payload: {},
      mensaje: "Versión es requerida",
    },
    {
      caso: "D8 — version no entera",
      payload: bodyValido({ version: 1.5 }),
      mensaje: "Versión debe ser un entero",
    },
    {
      caso: "D8 — version no positiva",
      payload: bodyValido({ version: 0 }),
      mensaje: "Versión debe ser positiva",
    },
    {
      caso: "D9 — motivo presente y vacio",
      payload: bodyValido({ motivo: "" }),
      mensaje: "Motivo es requerido",
    },
    {
      caso: "D9 — motivo presente y solo espacios",
      payload: bodyValido({ motivo: "   " }),
      mensaje: "Motivo es requerido",
    },
    {
      caso: "D9 — motivo de 501 caracteres",
      payload: bodyValido({ motivo: "a".repeat(501) }),
      mensaje: "Motivo no puede exceder 500 caracteres",
    },
  ];

  it.each(CASOS_400)(
    "HU15-C07 $caso responde 400 VALIDATION_ERROR con el mensaje exacto: $mensaje",
    async ({ payload, mensaje }) => {
      const res = await descongelar(CLIENTE_DUMMY, VIGENCIA_DUMMY, payload);

      expect(res.statusCode).toBe(400);
      const body = parseBody(res);
      expect(body.code).toBe("VALIDATION_ERROR");
      expect(body.error).toBe(mensaje);
    }
  );
});

// ─── HU15-C07 — permisos (D13, D14; DEC-017) ────────────────────────────────

describe("POST .../descongelar — HU15-C07 permisos (DEC-017)", () => {
  it("D13 sin token responde 401 AUTH_TOKEN_MISSING", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/clientes/${CLIENTE_DUMMY}/vigencias/${VIGENCIA_DUMMY}/descongelar`,
      payload: bodyValido(),
    });

    expect(res.statusCode).toBe(401);
    const body = parseBody(res);
    expect(body.code).toBe("AUTH_TOKEN_MISSING");
    expect(body.error).toBe("Token de autenticación requerido.");
  });

  it("D13 token invalido responde 401 AUTH_TOKEN_INVALID", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/clientes/${CLIENTE_DUMMY}/vigencias/${VIGENCIA_DUMMY}/descongelar`,
      headers: { authorization: "Bearer token-no-valido" },
      payload: bodyValido(),
    });

    expect(res.statusCode).toBe(401);
    expect(parseBody(res).code).toBe("AUTH_TOKEN_INVALID");
  });

  it("D13 token expirado responde 401 AUTH_TOKEN_EXPIRED", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/clientes/${CLIENTE_DUMMY}/vigencias/${VIGENCIA_DUMMY}/descongelar`,
      headers: headers(tokenExpirado()),
      payload: bodyValido(),
    });

    expect(res.statusCode).toBe(401);
    expect(parseBody(res).code).toBe("AUTH_TOKEN_EXPIRED");
  });

  it("D14 rol CLIENTE responde 403 AUTH_FORBIDDEN", async () => {
    const res = await descongelar(
      CLIENTE_DUMMY,
      VIGENCIA_DUMMY,
      bodyValido(),
      tokenCliente
    );

    expect(res.statusCode).toBe(403);
    const body = parseBody(res);
    expect(body.code).toBe("AUTH_FORBIDDEN");
    expect(body.error).toBe("No tienes permisos para realizar esta acción.");
  });
});

// ─── HU15-C07 — formula DEC-024 y casos limite (D1..D3, D10, D11, D18..D20) ──

describe("POST .../descongelar — formula DEC-024 y exito (HU15-C07)", () => {
  it("D1 pausa en curso devuelve solo los dias restantes: diasDevueltos = 8, fechaFin = hoy+32, version 3", async () => {
    const fixture = await fixturePausaEnCurso();

    const res = await descongelar(fixture.clienteId, fixture.vigenciaId, bodyValido());
    expect(res.statusCode).toBe(200);

    const body = parseBody(res);
    const validacion = descongelarResponseSchema.safeParse(body);
    expect(
      validacion.success,
      JSON.stringify(validacion.success ? null : validacion.error.issues)
    ).toBe(true);

    expect(diasRestantes(fixture.rango)).toBe(8);
    expect(body.fechaFinAnterior).toBe(dia(40));
    expect(body.diasDevueltos).toBe(8);
    expect(body.fechaFin).toBe(dia(32));
    expect(body.estado).toBe("ACTIVA");
    expect(body.version).toBe(3);
    expect(body.congelacion).toBeNull();
    // Los 2 dias ya consumidos permanecen descontados (no vuelve a hoy+30).
    expect(body.fechaFin).not.toBe(dia(30));

    const fila = await prisma.membresiaGym.findUniqueOrThrow({
      where: { id: fixture.vigenciaId },
    });
    expect(fila.version).toBe(3);
    expect(fila.fechaFin).toBe(dia(32));
  });

  it("D2 rol RECEPCIONISTA recibe 200 (DEC-017)", async () => {
    const fixture = await fixturePausaEnCurso();

    const res = await descongelar(
      fixture.clienteId,
      fixture.vigenciaId,
      bodyValido(),
      tokenRecep
    );

    expect(res.statusCode).toBe(200);
    expect(parseBody(res).version).toBe(3);
  });

  it("D3 pausa futura devuelve los N completos: diasDevueltos = 10 y fechaFin = hoy+30 (caso limite 1)", async () => {
    const fixture = await fixturePausaFutura();

    const res = await descongelar(fixture.clienteId, fixture.vigenciaId, bodyValido());
    expect(res.statusCode).toBe(200);

    const body = parseBody(res);
    expect(diasRestantes(fixture.rango)).toBe(10);
    expect(body.diasDevueltos).toBe(10);
    expect(body.fechaFin).toBe(dia(30));
    expect(body.version).toBe(3);
  });

  it("D10 sin motivo la fila DESCONGELACION queda con motivo null y responde 200", async () => {
    const fixture = await fixturePausaEnCurso();

    const res = await descongelar(fixture.clienteId, fixture.vigenciaId, { version: 2 });
    expect(res.statusCode).toBe(200);

    const cambio = await prisma.membresiaGymCambio.findFirst({
      where: { membresiaId: fixture.vigenciaId, accion: "DESCONGELACION" },
    });
    expect(cambio).not.toBeNull();
    expect(cambio?.motivo).toBeNull();
  });

  it("D11 con motivo el valor viaja persistido a la fila DESCONGELACION", async () => {
    const fixture = await fixturePausaEnCurso();

    const res = await descongelar(
      fixture.clienteId,
      fixture.vigenciaId,
      bodyValido({ motivo: "Retorno anticipado" })
    );
    expect(res.statusCode).toBe(200);

    const cambio = await prisma.membresiaGymCambio.findFirst({
      where: { membresiaId: fixture.vigenciaId, accion: "DESCONGELACION" },
    });
    expect(cambio?.motivo).toBe("Retorno anticipado");
  });

  it("D18 dos descongelar con la misma version dejan exactamente una 200 y una 409 MEMBRESIA_CONFLICTO", async () => {
    const fixture = await fixturePausaEnCurso();

    const ganadora = await descongelar(
      fixture.clienteId,
      fixture.vigenciaId,
      bodyValido()
    );
    expect(ganadora.statusCode).toBe(200);

    const perdedora = await descongelar(
      fixture.clienteId,
      fixture.vigenciaId,
      bodyValido()
    );
    expect(perdedora.statusCode).toBe(409);
    expect(parseBody(perdedora).code).toBe("MEMBRESIA_CONFLICTO");

    const fila = await prisma.membresiaGym.findUniqueOrThrow({
      where: { id: fixture.vigenciaId },
    });
    expect(fila.version).toBe(3);
    expect(fila.fechaFin).toBe(dia(32));

    const descongelaciones = await prisma.membresiaGymCambio.count({
      where: { membresiaId: fixture.vigenciaId, accion: "DESCONGELACION" },
    });
    expect(descongelaciones).toBe(1);
  });

  it("D19 descongelar nunca responde 409 MEMBRESIA_SOLAPADA aunque exista un periodo posterior contiguo", async () => {
    const cliente = await crearCliente();
    const vigenciaId = await crearVigenciaDirecta(cliente.id, {
      fechaInicio: dia(-30),
      fechaFin: dia(30),
    });
    await crearVigenciaDirecta(cliente.id, {
      fechaInicio: dia(40),
      fechaFin: dia(90),
    });
    await aplicarPausaDirecta(vigenciaId, { inicio: dia(-2), fin: dia(7) });

    const res = await descongelar(cliente.id, vigenciaId, bodyValido());

    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.code).toBeUndefined();
    expect(body.fechaFin).toBe(dia(32));
  });

  it("D20 la auditoria DESCONGELACION queda visible en el historial con actor, rango, fechas y version + 1", async () => {
    const fixture = await fixturePausaEnCurso();

    const res = await descongelar(
      fixture.clienteId,
      fixture.vigenciaId,
      bodyValido({ motivo: "Retorno anticipado" })
    );
    expect(res.statusCode).toBe(200);

    const body = parseBody(res);
    const fila = body.cambios[body.cambios.length - 1];
    expect(fila.accion).toBe("DESCONGELACION");
    expect(fila.version).toBe(3);
    expect(fila.motivo).toBe("Retorno anticipado");
    expect(fila.congelacionInicio).toBe(dia(-2));
    expect(fila.congelacionFin).toBe(dia(7));
    expect(fila.fechaFinAnterior).toBe(dia(40));
    expect(fila.fechaFinNueva).toBe(dia(32));
    expect(fila.actor.id).toBe(ownerUserId);

    const lista = await listarMembresias(fixture.clienteId);
    expect(buscarMembresia(lista, fixture.vigenciaId).fechaFin).toBe(dia(32));
  });
});

// ─── HU15-C07 — 404 y 409 en el orden del contrato (D4..D7, D12, D15..D17) ───

describe("POST .../descongelar — 404 y 409 en orden determinista (HU15-C07)", () => {
  it("D12 una vigencia inexistente responde 404 NOT_FOUND", async () => {
    const cliente = await crearCliente();

    const res = await descongelar(cliente.id, "no-existe-vigencia-0001", bodyValido());

    expect(res.statusCode).toBe(404);
    const body = parseBody(res);
    expect(body.code).toBe("NOT_FOUND");
    expect(body.error).toBe("Membresía no encontrada");
  });

  it("D12 una vigencia de otro cliente responde 404 NOT_FOUND (ownership)", async () => {
    const duenio = await crearCliente();
    const ajeno = await crearCliente();
    const vigenciaId = await crearVigenciaActiva(duenio.id);

    const res = await descongelar(ajeno.id, vigenciaId, bodyValido());

    expect(res.statusCode).toBe(404);
    const body = parseBody(res);
    expect(body.code).toBe("NOT_FOUND");
    expect(body.error).toBe("Membresía no encontrada");
  });

  // Enmendado 2026-10-20 por DEC-042 (INC-05 C4): DEC-023 queda enmendada y
  // `TIPOS_CONGELABLES = {GYM, PERSONALIZADO, NUTRICION}`, asi que una
  // vigencia NUTRICION con pausa vigente ya NO recibe 409: `descongelar`
  // devuelve 200, devuelve los dias restantes y deja la fila en version 3
  // (antes: 409 CONGELACION_NO_PERMITIDA). La rama por tipo queda cubierta
  // con un tipo fuera del set en `membresia-congelacion.test.ts`.
  it("D15 una vigencia NUTRICION con pausa vigente responde 200 con los dias devueltos (Enmendado 2026-10-20 por DEC-042 (INC-05 C4))", async () => {
    const cliente = await crearCliente();
    const vigenciaId = await crearVigenciaDirecta(cliente.id, {
      fechaInicio: dia(-30),
      fechaFin: dia(30),
      tipoServicio: "NUTRICION",
    });
    await aplicarPausaDirecta(vigenciaId, { inicio: dia(-2), fin: dia(7) });

    const res = await descongelar(cliente.id, vigenciaId, bodyValido({ version: 2 }));

    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    const validacion = descongelarResponseSchema.safeParse(body);
    expect(
      validacion.success,
      JSON.stringify(validacion.success ? null : validacion.error.issues)
    ).toBe(true);

    expect(body.tipoServicio).toBe("NUTRICION");
    expect(body.fechaFinAnterior).toBe(dia(40));
    // Formula DEC-024: la pausa empezo hace 2 dias, esos dias ya consumidos
    // permanecen descontados -> 8 dias restantes (mismo caso limite que D1).
    expect(body.diasDevueltos).toBe(8);
    expect(body.fechaFin).toBe(dia(32));
    expect(body.estado).toBe("ACTIVA");
    expect(body.version).toBe(3);
    expect(body.congelacion).toBeNull();

    const fila = await prisma.membresiaGym.findUniqueOrThrow({
      where: { id: vigenciaId },
    });
    expect(fila.version).toBe(3);
    expect(fila.fechaFin).toBe(dia(32));

    const descons = await prisma.membresiaGymCambio.count({
      where: { membresiaId: vigenciaId, accion: "DESCONGELACION" },
    });
    expect(descons).toBe(1);
  });

  // Enmendado 2026-10-20 por DEC-042 (INC-05 C4): la rama por TIPO se
  // conserva REENCUADRADA con un `tipoServicio` fuera de
  // `TIPOS_CONGELABLES = {GYM, PERSONALIZADO, NUTRICION}` (el campo es
  // `String` sin constraint en `prisma/schema.prisma`), sin pausa previa, lo
  // que ademas fija el orden tipo -> CONGELACION_INEXISTENTE.
  it("D15 una vigencia con tipoServicio fuera de TIPOS_CONGELABLES responde 409 CONGELACION_NO_PERMITIDA antes de CONGELACION_INEXISTENTE (guarda generica DEC-023)", async () => {
    const cliente = await crearCliente();
    const vigenciaId = await crearVigenciaDirecta(cliente.id, {
      fechaInicio: dia(-30),
      fechaFin: dia(30),
      tipoServicio: "SERVICIO_EXTERNO",
    });

    const res = await descongelar(cliente.id, vigenciaId, bodyValido({ version: 1 }));

    expect(res.statusCode).toBe(409);
    const body = parseBody(res);
    expect(body.code).toBe("CONGELACION_NO_PERMITIDA");
    expect(body.error).toBe("La congelación no está permitida para este tipo de servicio");

    const fila = await prisma.membresiaGym.findUniqueOrThrow({
      where: { id: vigenciaId },
    });
    expect(fila.version).toBe(1);
    expect(fila.fechaFin).toBe(dia(30));
    expect(fila.fechaInicio).toBe(dia(-30));

    const cambios = await prisma.membresiaGymCambio.count({
      where: { membresiaId: vigenciaId },
    });
    expect(cambios).toBe(1);
  });

  it("D16 una vigencia VENCIDA responde 409 MEMBRESIA_VENCIDA antes de CONGELACION_INEXISTENTE (DEC-022)", async () => {
    const cliente = await crearCliente();
    const vigenciaId = await crearVigenciaDirecta(cliente.id, {
      fechaInicio: dia(-60),
      fechaFin: dia(-10),
    });

    const res = await descongelar(cliente.id, vigenciaId, bodyValido({ version: 1 }));

    expect(res.statusCode).toBe(409);
    const body = parseBody(res);
    expect(body.code).toBe("MEMBRESIA_VENCIDA");
    expect(body.error).toBe("No se puede congelar una membresía vencida");
  });

  it("D17 la version desactualizada gana sobre la pausa no vigente: 409 MEMBRESIA_CONFLICTO", async () => {
    const cliente = await crearCliente();
    const vigenciaId = await crearVigenciaActiva(cliente.id);

    const res = await descongelar(cliente.id, vigenciaId, bodyValido({ version: 2 }));

    expect(res.statusCode).toBe(409);
    expect(parseBody(res).code).toBe("MEMBRESIA_CONFLICTO");
  });

  it("D4 una pausa terminada por calendario responde 409 CONGELACION_INEXISTENTE y no modifica nada (caso limite 3)", async () => {
    const fixture = await fixturePausaTerminada();

    const res = await descongelar(fixture.clienteId, fixture.vigenciaId, bodyValido());

    expect(res.statusCode).toBe(409);
    const body = parseBody(res);
    expect(body.code).toBe("CONGELACION_INEXISTENTE");
    expect(body.error).toBe("No hay una congelación vigente en esta membresía");

    const fila = await prisma.membresiaGym.findUniqueOrThrow({
      where: { id: fixture.vigenciaId },
    });
    expect(fila.version).toBe(2);
    expect(fila.fechaFin).toBe(dia(41));
  });

  it("D5 doble descongelar con la version correcta responde 409 CONGELACION_INEXISTENTE (caso limite 4)", async () => {
    const fixture = await fixtureYaDescongelada();

    const res = await descongelar(fixture.clienteId, fixture.vigenciaId, bodyValido({ version: 3 }));

    expect(res.statusCode).toBe(409);
    const body = parseBody(res);
    expect(body.code).toBe("CONGELACION_INEXISTENTE");
    expect(body.error).toBe("No hay una congelación vigente en esta membresía");
  });

  it("D6 doble descongelar sin recargar la version responde 409 MEMBRESIA_CONFLICTO (se evalua antes)", async () => {
    const fixture = await fixtureYaDescongelada();

    const res = await descongelar(fixture.clienteId, fixture.vigenciaId, bodyValido({ version: 2 }));

    expect(res.statusCode).toBe(409);
    expect(parseBody(res).code).toBe("MEMBRESIA_CONFLICTO");
  });

  it("D7 una vigencia nunca congelada responde 409 CONGELACION_INEXISTENTE", async () => {
    const cliente = await crearCliente();
    const vigenciaId = await crearVigenciaActiva(cliente.id);

    const res = await descongelar(cliente.id, vigenciaId, bodyValido({ version: 1 }));

    expect(res.statusCode).toBe(409);
    const body = parseBody(res);
    expect(body.code).toBe("CONGELACION_INEXISTENTE");
    expect(body.error).toBe("No hay una congelación vigente en esta membresía");
  });
});
