/**
 * INC-02 (ampliacion DEC-024) — RED de edicion de congelacion: `PATCH
 * /clientes/:clienteId/vigencias/:vigenciaId/congelacion` (sin prefijo `/api`).
 *
 * Criterio: `HU15-C08` con la cobertura **E1..E20** de
 * `features/acceptance-criteria/HU-15-criterios-aceptacion.md` (0 puntos HU-15).
 * Formula obligatoria (DEC-024): revertir `N_anterior` completo y aplicar
 * `N_nuevo`, `fechaFin' = fechaFin - N_anterior + N_nuevo`, validando las
 * MISMAS reglas de congelar sobre la **fila revertida**
 * `[fechaInicio, fechaFin - N_anterior]` (E16) y sin solapes con otras pausas
 * (E17). El nuevo rango se declara de nuevo -> `motivo` obligatorio (los 4
 * campos del body).
 *
 * Orden de evaluacion (spec INC-02): 401/403 -> 400 (Zod y despues post-Zod
 * `fechaFin >= hoy`) -> 404 -> 409 `MEMBRESIA_CONFLICTO` ->
 * `CONGELACION_NO_PERMITIDA` (tipo) -> `MEMBRESIA_VENCIDA` ->
 * `CONGELACION_INEXISTENTE` -> `CONGELACION_NO_PERMITIDA` (rango en la fila
 * revertida) -> `MEMBRESIA_SOLAPADA` (solape) -> `MEMBRESIA_SOLAPADA` (choque
 * con periodo posterior, atomico).
 *
 * Estado RED (2026-10-08): la ruta no existe, asi que las peticiones caen en el
 * 404 de Fastify (cuerpo sin `code`); las aserciones sobre `code`/`error`
 * evitan que ese 404 pase por accidente.
 *
 * Fixtures: F8/F9/F10/F11 se montan con filas directas en BD (en RED la doble
 * llamada a `congelar`/`descongelar` del spec no existe) produciendo el mismo
 * estado final; F1 por API; F5/F6 directas. Fechas dinamicas relativas a
 * `getTodayBogota()` (DEC-013). Aislamiento: prefijo de cedula 9917.
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
import { editarCongelacionResponseSchema } from "../../features/acceptance-criteria/HU-15-schemas";

const prefix = "inc02_edit";
const cedulaPrefix = "9917";
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

function diasRestantes(rango: { inicio: string; fin: string }): number {
  if (HOY > rango.fin) return 0;
  const desde = HOY < rango.inicio ? rango.inicio : HOY;
  return diasInclusivos(desde, rango.fin);
}

function bodyValido(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    fechaInicio: dia(-2),
    fechaFin: dia(17),
    motivo: "Cambio de viaje",
    version: 2,
    ...overrides,
  };
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
      apellidos: "Editar Congelacion",
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

async function editar(
  clienteId: string,
  vigenciaId: string,
  payload: Record<string, unknown>,
  token: string = tokenOwner
) {
  return app.inject({
    method: "PATCH",
    url: `/clientes/${clienteId}/vigencias/${vigenciaId}/congelacion`,
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
    nombre: "Dueño Editar Congelacion",
    rol: "DUENO",
    exp: Math.floor(Date.now() / 1000) - 120,
  });
}

/** F8: pausa en curso `hoy-2..hoy+7` (N = 10, fechaFin = hoy+40, version 2). */
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

/** F9: pausa futura `hoy+5..hoy+14` (N = 10, fechaFin = hoy+40, version 2). */
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
async function fixturePausaTerminada(): Promise<{
  clienteId: string;
  vigenciaId: string;
}> {
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

/**
 * F6: dos pausas disjuntas ya aplicadas (`hoy-5..hoy+3` y `hoy+6..hoy+10`);
 * la ultima (version 3) es la pausa vigente editable.
 */
async function fixtureDosPausas(): Promise<{
  clienteId: string;
  vigenciaId: string;
  pausaVigente: { inicio: string; fin: string };
}> {
  const cliente = await crearCliente();
  const vigenciaId = await crearVigenciaActiva(cliente.id);
  await aplicarPausaDirecta(vigenciaId, { inicio: dia(-5), fin: dia(3) });
  const pausaVigente = { inicio: dia(6), fin: dia(10) };
  await aplicarPausaDirecta(vigenciaId, pausaVigente);
  return { clienteId: cliente.id, vigenciaId, pausaVigente };
}

/** F5: dos vigencias del cliente, la segunda empieza donde cae la extension. */
async function fixturePeriodoPosterior(): Promise<{
  clienteId: string;
  vigenciaId: string;
}> {
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
  return { clienteId: cliente.id, vigenciaId };
}

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? "inc02-editar-congelacion-secret";

  await cleanupFixtures();

  const [hashedOwner, hashedRecep] = await Promise.all([
    bcrypt.hash("owner123", 10),
    bcrypt.hash("recep123", 10),
  ]);
  await prisma.sede.upsert({
    where: { id: `${prefix}_sede` },
    update: { nombre: "Sede INC02 Editar Congelacion" },
    create: { id: `${prefix}_sede`, nombre: "Sede INC02 Editar Congelacion" },
  });
  const owner = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: { contrasena: hashedOwner, nombre: "Dueño Editar Congelacion", rol: "DUENO" },
    create: {
      email: ownerEmail,
      contrasena: hashedOwner,
      nombre: "Dueño Editar Congelacion",
      rol: "DUENO",
    },
  });
  await prisma.user.upsert({
    where: { email: recepEmail },
    update: {
      contrasena: hashedRecep,
      nombre: "Recepcion Editar Congelacion",
      rol: "RECEPCIONISTA",
    },
    create: {
      email: recepEmail,
      contrasena: hashedRecep,
      nombre: "Recepcion Editar Congelacion",
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

// ─── HU15-C08 — 400 VALIDATION_ERROR (E9, E10) ───────────────────────────────

describe("PATCH .../congelacion — HU15-C08 validaciones de body (400 VALIDATION_ERROR)", () => {
  const CASOS_400: Array<{
    caso: string;
    payload: Record<string, unknown>;
    mensaje: string;
  }> = [
    {
      caso: "E9 — fechaInicio ausente",
      payload: { fechaFin: dia(17), motivo: "Cambio de viaje", version: 2 },
      mensaje: "Fecha de inicio es requerida",
    },
    {
      caso: "E9 — fechaFin ausente",
      payload: { fechaInicio: dia(-2), motivo: "Cambio de viaje", version: 2 },
      mensaje: "Fecha fin es requerida",
    },
    {
      caso: "E9 — motivo ausente",
      payload: { fechaInicio: dia(-2), fechaFin: dia(17), version: 2 },
      mensaje: "Motivo es requerido",
    },
    {
      caso: "E9 — motivo vacio",
      payload: bodyValido({ motivo: "" }),
      mensaje: "Motivo es requerido",
    },
    {
      caso: "E9 — motivo solo espacios",
      payload: bodyValido({ motivo: "   " }),
      mensaje: "Motivo es requerido",
    },
    {
      caso: "E9 — motivo de 501 caracteres",
      payload: bodyValido({ motivo: "a".repeat(501) }),
      mensaje: "Motivo no puede exceder 500 caracteres",
    },
    {
      caso: "E9 — fechaInicio con formato distinto de YYYY-MM-DD",
      payload: bodyValido({ fechaInicio: "01/02/2026" }),
      mensaje: "Fecha de inicio debe ser una fecha válida (YYYY-MM-DD)",
    },
    {
      caso: "E9 — fechaFin inexistente en calendario",
      payload: bodyValido({ fechaFin: "2026-02-30" }),
      mensaje: "Fecha fin debe ser una fecha válida (YYYY-MM-DD)",
    },
    {
      caso: "E9 — fechaFin anterior a fechaInicio",
      payload: bodyValido({ fechaInicio: dia(10), fechaFin: dia(3) }),
      mensaje: "Fecha fin no puede ser anterior a fecha de inicio",
    },
    {
      caso: "E9 — version ausente",
      payload: { fechaInicio: dia(-2), fechaFin: dia(17), motivo: "Cambio de viaje" },
      mensaje: "Versión es requerida",
    },
    {
      caso: "E9 — version no entera",
      payload: bodyValido({ version: 1.5 }),
      mensaje: "Versión debe ser un entero",
    },
    {
      caso: "E9 — version no positiva",
      payload: bodyValido({ version: 0 }),
      mensaje: "Versión debe ser positiva",
    },
    {
      caso: "E10 — nuevo fechaFin anterior a hoy (post-Zod)",
      payload: bodyValido({ fechaInicio: dia(-10), fechaFin: dia(-5) }),
      mensaje: "Fecha fin no puede ser anterior a hoy",
    },
  ];

  it.each(CASOS_400)(
    "HU15-C08 $caso responde 400 VALIDATION_ERROR con el mensaje exacto: $mensaje",
    async ({ payload, mensaje }) => {
      const res = await editar(CLIENTE_DUMMY, VIGENCIA_DUMMY, payload);

      expect(res.statusCode).toBe(400);
      const body = parseBody(res);
      expect(body.code).toBe("VALIDATION_ERROR");
      expect(body.error).toBe(mensaje);
    }
  );
});

// ─── HU15-C08 — permisos (E12; DEC-017) ─────────────────────────────────────

describe("PATCH .../congelacion — HU15-C08 permisos (DEC-017)", () => {
  it("E12 sin token responde 401 AUTH_TOKEN_MISSING", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/clientes/${CLIENTE_DUMMY}/vigencias/${VIGENCIA_DUMMY}/congelacion`,
      payload: bodyValido(),
    });

    expect(res.statusCode).toBe(401);
    const body = parseBody(res);
    expect(body.code).toBe("AUTH_TOKEN_MISSING");
    expect(body.error).toBe("Token de autenticación requerido.");
  });

  it("E12 token invalido responde 401 AUTH_TOKEN_INVALID", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/clientes/${CLIENTE_DUMMY}/vigencias/${VIGENCIA_DUMMY}/congelacion`,
      headers: { authorization: "Bearer token-no-valido" },
      payload: bodyValido(),
    });

    expect(res.statusCode).toBe(401);
    expect(parseBody(res).code).toBe("AUTH_TOKEN_INVALID");
  });

  it("E12 token expirado responde 401 AUTH_TOKEN_EXPIRED", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/clientes/${CLIENTE_DUMMY}/vigencias/${VIGENCIA_DUMMY}/congelacion`,
      headers: headers(tokenExpirado()),
      payload: bodyValido(),
    });

    expect(res.statusCode).toBe(401);
    expect(parseBody(res).code).toBe("AUTH_TOKEN_EXPIRED");
  });

  it("E12 rol CLIENTE responde 403 AUTH_FORBIDDEN", async () => {
    const res = await editar(
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

// ─── HU15-C08 — formula de edicion y exito (E1..E5, E19, E20) ────────────────

describe("PATCH .../congelacion — formula DEC-024 revertir N y aplicar N nuevo (HU15-C08)", () => {
  it("E1 editar la pausa en curso aplica N' sobre N revertido: fechaFin = hoy+50, N' = 20 y N = 10", async () => {
    const fixture = await fixturePausaEnCurso();

    const res = await editar(fixture.clienteId, fixture.vigenciaId, bodyValido());
    expect(res.statusCode).toBe(200);

    const body = parseBody(res);
    const validacion = editarCongelacionResponseSchema.safeParse(body);
    expect(
      validacion.success,
      JSON.stringify(validacion.success ? null : validacion.error.issues)
    ).toBe(true);

    expect(body.fechaFinAnterior).toBe(dia(40));
    expect(body.fechaFin).toBe(dia(50));
    expect(diasInclusivos(dia(-2), dia(17))).toBe(20);
    expect(body.diasCongelados).toBe(20);
    expect(body.diasCongeladosAnterior).toBe(10);
    expect(body.estado).toBe("CONGELADO");
    expect(body.version).toBe(3);
    expect(body.congelacion).toEqual({
      fechaInicio: dia(-2),
      fechaFin: dia(17),
      motivo: "Cambio de viaje",
      diasCongelados: 20,
    });

    const fila = body.cambios[body.cambios.length - 1];
    expect(fila.accion).toBe("EDICION_CONGELACION");
    expect(fila.version).toBe(3);
    expect(fila.motivo).toBe("Cambio de viaje");
    expect(fila.congelacionInicio).toBe(dia(-2));
    expect(fila.congelacionFin).toBe(dia(17));
    expect(fila.fechaFinAnterior).toBe(dia(40));
    expect(fila.fechaFinNueva).toBe(dia(50));

    // aritmetica verificable: dia(40) - 10 + 20 = dia(50)
    expect(body.fechaFin).toBe(sumarDias(dia(40), -10 + 20));
  });

  it("E2 rol RECEPCIONISTA recibe 200 (DEC-017)", async () => {
    const fixture = await fixturePausaEnCurso();

    const res = await editar(
      fixture.clienteId,
      fixture.vigenciaId,
      bodyValido(),
      tokenRecep
    );

    expect(res.statusCode).toBe(200);
    expect(parseBody(res).version).toBe(3);
  });

  it("E3 editar una pausa futura revierte los N completos (caso limite 5): fechaFin = hoy+50 y estado ACTIVA", async () => {
    const fixture = await fixturePausaFutura();

    const res = await editar(
      fixture.clienteId,
      fixture.vigenciaId,
      bodyValido({ fechaInicio: dia(5), fechaFin: dia(24) })
    );
    expect(res.statusCode).toBe(200);

    const body = parseBody(res);
    expect(body.fechaFin).toBe(dia(50));
    expect(body.diasCongeladosAnterior).toBe(10);
    expect(body.diasCongelados).toBe(20);
    expect(body.estado).toBe("ACTIVA");
    expect(body.version).toBe(3);
  });

  it("E4 editar despues de consumir dias revierte los N completos (caso limite 6): fechaFin = hoy+32 con N' = 2", async () => {
    const fixture = await fixturePausaEnCurso();

    const res = await editar(
      fixture.clienteId,
      fixture.vigenciaId,
      bodyValido({ fechaInicio: HOY, fechaFin: dia(1) })
    );
    expect(res.statusCode).toBe(200);

    const body = parseBody(res);
    expect(body.fechaFin).toBe(dia(32));
    expect(body.diasCongelados).toBe(2);
    expect(body.diasCongeladosAnterior).toBe(10);
    expect(body.estado).toBe("CONGELADO");
  });

  it("E5 editar al mismo rango devuelve 200 con fechaFin sin cambio y escribe la auditoria (caso limite 7)", async () => {
    const fixture = await fixturePausaEnCurso();

    const res = await editar(
      fixture.clienteId,
      fixture.vigenciaId,
      bodyValido({ fechaInicio: dia(-2), fechaFin: dia(7) })
    );
    expect(res.statusCode).toBe(200);

    const body = parseBody(res);
    expect(body.fechaFin).toBe(dia(40));
    expect(body.diasCongelados).toBe(10);
    expect(body.diasCongeladosAnterior).toBe(10);
    expect(body.version).toBe(3);

    const ediciones = await prisma.membresiaGymCambio.count({
      where: { membresiaId: fixture.vigenciaId, accion: "EDICION_CONGELACION" },
    });
    expect(ediciones).toBe(1);
  });

  it("E19 dos ediciones con la misma version dejan exactamente una 200 y una 409 MEMBRESIA_CONFLICTO", async () => {
    const fixture = await fixturePausaEnCurso();

    const ganadora = await editar(fixture.clienteId, fixture.vigenciaId, bodyValido());
    expect(ganadora.statusCode).toBe(200);

    const perdedora = await editar(fixture.clienteId, fixture.vigenciaId, bodyValido());
    expect(perdedora.statusCode).toBe(409);
    expect(parseBody(perdedora).code).toBe("MEMBRESIA_CONFLICTO");

    const fila = await prisma.membresiaGym.findUniqueOrThrow({
      where: { id: fixture.vigenciaId },
    });
    expect(fila.version).toBe(3);
    expect(fila.fechaFin).toBe(dia(50));

    const ediciones = await prisma.membresiaGymCambio.count({
      where: { membresiaId: fixture.vigenciaId, accion: "EDICION_CONGELACION" },
    });
    expect(ediciones).toBe(1);
  });

  it("E20 la auditoria EDICION_CONGELACION queda visible en el historial y en la BD", async () => {
    const fixture = await fixturePausaEnCurso();

    const res = await editar(fixture.clienteId, fixture.vigenciaId, bodyValido());
    expect(res.statusCode).toBe(200);

    const cambio = await prisma.membresiaGymCambio.findFirst({
      where: { membresiaId: fixture.vigenciaId, accion: "EDICION_CONGELACION" },
    });
    expect(cambio).not.toBeNull();
    expect(cambio?.actorId).toBe(ownerUserId);
    expect(cambio?.version).toBe(3);
    expect(cambio?.motivo).toBe("Cambio de viaje");
    expect(cambio?.congelacionInicio).toBe(dia(-2));
    expect(cambio?.congelacionFin).toBe(dia(17));
    expect(cambio?.fechaFinAnterior).toBe(dia(40));
    expect(cambio?.fechaFinNueva).toBe(dia(50));

    const lista = await listarMembresias(fixture.clienteId);
    const historial = buscarMembresia(lista, fixture.vigenciaId).cambios;
    expect(historial[historial.length - 1].accion).toBe("EDICION_CONGELACION");
    expect(historial[historial.length - 1].version).toBe(3);
  });
});

// ─── HU15-C08 — 404 y 409 en el orden del contrato (E6..E8, E11, E13..E18) ───

describe("PATCH .../congelacion — 404 y 409 en orden determinista (HU15-C08)", () => {
  it("E11 una vigencia inexistente responde 404 NOT_FOUND", async () => {
    const cliente = await crearCliente();

    const res = await editar(cliente.id, "no-existe-vigencia-0001", bodyValido());

    expect(res.statusCode).toBe(404);
    const body = parseBody(res);
    expect(body.code).toBe("NOT_FOUND");
    expect(body.error).toBe("Membresía no encontrada");
  });

  it("E11 una vigencia de otro cliente responde 404 NOT_FOUND (ownership)", async () => {
    const duenio = await crearCliente();
    const ajeno = await crearCliente();
    const vigenciaId = await crearVigenciaActiva(duenio.id);

    const res = await editar(ajeno.id, vigenciaId, bodyValido());

    expect(res.statusCode).toBe(404);
    const body = parseBody(res);
    expect(body.code).toBe("NOT_FOUND");
    expect(body.error).toBe("Membresía no encontrada");
  });

  it("E13 una version desactualizada responde 409 MEMBRESIA_CONFLICTO y no modifica nada", async () => {
    const fixture = await fixturePausaEnCurso();

    const res = await editar(
      fixture.clienteId,
      fixture.vigenciaId,
      bodyValido({ version: 3 })
    );

    expect(res.statusCode).toBe(409);
    expect(parseBody(res).code).toBe("MEMBRESIA_CONFLICTO");

    const fila = await prisma.membresiaGym.findUniqueOrThrow({
      where: { id: fixture.vigenciaId },
    });
    expect(fila.version).toBe(2);
    expect(fila.fechaFin).toBe(dia(40));
  });

  // Enmendado 2026-10-20 por DEC-042 (INC-05 C4): DEC-023 queda enmendada y
  // `TIPOS_CONGELABLES = {GYM, PERSONALIZADO, NUTRICION}`, asi que una
  // vigencia NUTRICION con pausa vigente ya NO recibe 409: la edicion de la
  // pausa responde 200 y deja version 3 con la extension recalculada (antes:
  // 409 CONGELACION_NO_PERMITIDA). La rama por tipo queda cubierta con un
  // tipo fuera del set en `membresia-congelacion.test.ts`.
  it("E14 una vigencia NUTRICION con pausa vigente admite editar la congelacion con 200 (Enmendado 2026-10-20 por DEC-042 (INC-05 C4))", async () => {
    const cliente = await crearCliente();
    const vigenciaId = await crearVigenciaDirecta(cliente.id, {
      fechaInicio: dia(-30),
      fechaFin: dia(30),
      tipoServicio: "NUTRICION",
    });
    await aplicarPausaDirecta(vigenciaId, { inicio: dia(-2), fin: dia(7) });

    const res = await editar(cliente.id, vigenciaId, bodyValido());

    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    const validacion = editarCongelacionResponseSchema.safeParse(body);
    expect(
      validacion.success,
      JSON.stringify(validacion.success ? null : validacion.error.issues)
    ).toBe(true);

    expect(body.tipoServicio).toBe("NUTRICION");
    expect(body.fechaFinAnterior).toBe(dia(40));
    expect(body.fechaFin).toBe(dia(50));
    expect(body.diasCongelados).toBe(20);
    expect(body.diasCongeladosAnterior).toBe(10);
    expect(body.estado).toBe("CONGELADO");
    expect(body.version).toBe(3);
    expect(body.congelacion).toEqual({
      fechaInicio: dia(-2),
      fechaFin: dia(17),
      motivo: "Cambio de viaje",
      diasCongelados: 20,
    });

    const fila = body.cambios[body.cambios.length - 1];
    expect(fila.accion).toBe("EDICION_CONGELACION");
    expect(fila.version).toBe(3);
    expect(fila.congelacionInicio).toBe(dia(-2));
    expect(fila.congelacionFin).toBe(dia(17));

    const persistida = await prisma.membresiaGym.findUniqueOrThrow({
      where: { id: vigenciaId },
    });
    expect(persistida.version).toBe(3);
    expect(persistida.fechaFin).toBe(dia(50));
  });

  // Enmendado 2026-10-20 por DEC-042 (INC-05 C4): la rama por TIPO se
  // conserva REENCUADRADA con un `tipoServicio` fuera de
  // `TIPOS_CONGELABLES = {GYM, PERSONALIZADO, NUTRICION}` (el campo es
  // `String` sin constraint en `prisma/schema.prisma`), sin pausa previa, lo
  // que ademas fija el orden tipo -> CONGELACION_INEXISTENTE.
  it("E14 una vigencia con tipoServicio fuera de TIPOS_CONGELABLES responde 409 CONGELACION_NO_PERMITIDA antes de CONGELACION_INEXISTENTE (guarda generica DEC-023)", async () => {
    const cliente = await crearCliente();
    const vigenciaId = await crearVigenciaDirecta(cliente.id, {
      fechaInicio: dia(-30),
      fechaFin: dia(30),
      tipoServicio: "SERVICIO_EXTERNO",
    });

    const res = await editar(cliente.id, vigenciaId, bodyValido({ version: 1 }));

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

  it("E15 una vigencia VENCIDA responde 409 MEMBRESIA_VENCIDA antes de CONGELACION_INEXISTENTE (DEC-022)", async () => {
    const cliente = await crearCliente();
    const vigenciaId = await crearVigenciaDirecta(cliente.id, {
      fechaInicio: dia(-60),
      fechaFin: dia(-10),
    });

    const res = await editar(cliente.id, vigenciaId, bodyValido({ version: 1 }));

    expect(res.statusCode).toBe(409);
    const body = parseBody(res);
    expect(body.code).toBe("MEMBRESIA_VENCIDA");
    expect(body.error).toBe("No se puede congelar una membresía vencida");
  });

  it("E6 una vigencia nunca congelada responde 409 CONGELACION_INEXISTENTE", async () => {
    const cliente = await crearCliente();
    const vigenciaId = await crearVigenciaActiva(cliente.id);

    const res = await editar(cliente.id, vigenciaId, bodyValido({ version: 1 }));

    expect(res.statusCode).toBe(409);
    const body = parseBody(res);
    expect(body.code).toBe("CONGELACION_INEXISTENTE");
    expect(body.error).toBe("No hay una congelación vigente en esta membresía");
  });

  it("E7 una pausa ya descongelada responde 409 CONGELACION_INEXISTENTE", async () => {
    const fixture = await fixtureYaDescongelada();

    const res = await editar(fixture.clienteId, fixture.vigenciaId, bodyValido({ version: 3 }));

    expect(res.statusCode).toBe(409);
    const body = parseBody(res);
    expect(body.code).toBe("CONGELACION_INEXISTENTE");
    expect(body.error).toBe("No hay una congelación vigente en esta membresía");
  });

  it("E8 una pausa terminada por calendario responde 409 CONGELACION_INEXISTENTE (caso limite 3)", async () => {
    const fixture = await fixturePausaTerminada();

    const res = await editar(fixture.clienteId, fixture.vigenciaId, bodyValido({ version: 2 }));

    expect(res.statusCode).toBe(409);
    const body = parseBody(res);
    expect(body.code).toBe("CONGELACION_INEXISTENTE");
    expect(body.error).toBe("No hay una congelación vigente en esta membresía");
  });

  it("E16 el rango nuevo fuera de la fila revertida responde 409 CONGELACION_NO_PERMITIDA", async () => {
    const fixture = await fixturePausaEnCurso();

    // fila revertida: dia(40) - 10 = dia(30); el rango llega hasta dia(40).
    const res = await editar(
      fixture.clienteId,
      fixture.vigenciaId,
      bodyValido({ fechaInicio: dia(-2), fechaFin: dia(40) })
    );

    expect(res.statusCode).toBe(409);
    const body = parseBody(res);
    expect(body.code).toBe("CONGELACION_NO_PERMITIDA");
    expect(body.error).toBe("El rango de congelación debe estar dentro de la vigencia");

    const fila = await prisma.membresiaGym.findUniqueOrThrow({
      where: { id: fixture.vigenciaId },
    });
    expect(fila.version).toBe(2);
    expect(fila.fechaFin).toBe(dia(40));
  });

  it("E17 un rango nuevo que cruza otra pausa responde 409 MEMBRESIA_SOLAPADA", async () => {
    const fixture = await fixtureDosPausas();

    const res = await editar(
      fixture.clienteId,
      fixture.vigenciaId,
      bodyValido({
        fechaInicio: dia(0),
        fechaFin: dia(8),
        version: 3,
      })
    );

    expect(res.statusCode).toBe(409);
    const body = parseBody(res);
    expect(body.code).toBe("MEMBRESIA_SOLAPADA");
    expect(body.error).toBe("Las fechas se solapan con un período existente");

    const fila = await prisma.membresiaGym.findUniqueOrThrow({
      where: { id: fixture.vigenciaId },
    });
    expect(fila.version).toBe(3);
    expect(fila.fechaFin).toBe(dia(44));
  });

  it("E18 la nueva fechaFin que choca con un periodo posterior responde 409 MEMBRESIA_SOLAPADA sin editar nada (atomico)", async () => {
    const fixture = await fixturePeriodoPosterior();

    // fechaFin' = dia(40) - 10 + 20 = dia(50), dentro de [dia(40), dia(90)].
    const res = await editar(
      fixture.clienteId,
      fixture.vigenciaId,
      bodyValido({ fechaInicio: dia(-2), fechaFin: dia(17) })
    );

    expect(res.statusCode).toBe(409);
    const body = parseBody(res);
    expect(body.code).toBe("MEMBRESIA_SOLAPADA");
    expect(body.error).toBe("Las fechas se solapan con un período existente");

    const fila = await prisma.membresiaGym.findUniqueOrThrow({
      where: { id: fixture.vigenciaId },
    });
    expect(fila.version).toBe(2);
    expect(fila.fechaFin).toBe(dia(40));

    const ediciones = await prisma.membresiaGymCambio.count({
      where: { membresiaId: fixture.vigenciaId, accion: "EDICION_CONGELACION" },
    });
    expect(ediciones).toBe(0);
  });
});
