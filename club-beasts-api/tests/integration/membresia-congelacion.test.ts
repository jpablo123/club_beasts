/**
 * INC-02 (HU-15 + HU-12 bullet 2) — RED de congelacion: `POST
 * /clientes/:clienteId/vigencias/:vigenciaId/congelar` (sin prefijo `/api`).
 *
 * Criterios: `HU15-C01..C06` con la tabla de cobertura de ramas **1..32** de
 * `features/acceptance-criteria/HU-15-criterios-aceptacion.md` + la expectativa
 * **DEC-025** (la congelacion no bloquea el acceso del cliente).
 * Decisiones: DEC-017 (permisos), DEC-022 (post-Zod `fechaFin >= hoy`,
 * `MEMBRESIA_VENCIDA`, rango contenido), DEC-023 (`NUTRICION` rechazado),
 * DEC-008 (solapes), DEC-005/DEC-006 (`America/Bogota`, dias inclusivos),
 * DEC-012/DEC-013 (SQLite aislado por ejecucion + fechas dinamicas).
 *
 * Estado RED (2026-10-08): la ruta de pausa aun no existe en
 * `src/routes/membresia.ts`, por lo que las peticiones caen en el 404 de
 * Fastify (`Route ... not found`, cuerpo **sin** `code`) en lugar de los
 * 200/400/409 del contrato; las aserciones sobre `code`/`error` hacen que ese
 * 404 no pase por accidente. Los escenarios que ya pasan hoy (estados base sin
 * pausa, no-bloqueo DEC-025) quedan como guardias de regresion.
 *
 * Orden de evaluacion que fija el contrato (se usa en todos los 409):
 * 401/403 -> 400 (Zod y despues post-Zod) -> 404 -> 409 `MEMBRESIA_CONFLICTO`
 * -> `CONGELACION_NO_PERMITIDA` (tipo) -> `MEMBRESIA_VENCIDA` ->
 * `CONGELACION_NO_PERMITIDA` (rango) -> `MEMBRESIA_SOLAPADA` (solape) ->
 * `MEMBRESIA_SOLAPADA` (choque con periodo posterior).
 *
 * Fixtures (spec INC-02): F1 por API; F2/F3/F4/F5/F6/F7 directas en BD (no hay
 * alta por API hasta INC-05 y F7 es inalcanzable por API con DEC-022). Fechas
 * dinamicas relativas a `getTodayBogota()`. Aislamiento: prefijo de cedula 9915.
 *
 * Nota de determinismo: las ramas 400/401/403 usan ids de params ficticios
 * porque el contrato las resuelve ANTES de buscar la vigencia (orden 2 vs 3);
 * eso tambien verifica dicho orden.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import bcrypt from "bcryptjs";
import prisma from "../../src/lib/prisma";
import authRoutes from "../../src/routes/auth";
import membresiaRoutes from "../../src/routes/membresia";
import clienteRoutes from "../../src/routes/clientes";
import prismaPlugin from "../../src/plugins/prisma";
import authPlugin from "../../src/plugins/auth";
import { getTodayBogota } from "../../src/services/membresia.service";
import { congelacionResponseSchema } from "../../features/acceptance-criteria/HU-15-schemas";

const prefix = "inc02_cong";
const cedulaPrefix = "9915";
const ownerEmail = `${prefix}_dueno@clubbeasts.test`;
const recepEmail = `${prefix}_recep@clubbeasts.test`;
const pin = "1234";

/** DEC-013: todo el archivo se calcula sobre la fecha real de Bogota. */
const HOY = getTodayBogota();

/** Params ficticios para las ramas que el contrato resuelve sin tocar la BD. */
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

/** Fecha YYYY-MM-DD con `offset` dias respecto de HOY (nunca fechas fijas). */
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
  const diferencia =
    Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1);
  return Math.round(diferencia / 86_400_000) + 1;
}

function bodyValido(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    fechaInicio: dia(-2),
    fechaFin: dia(7),
    motivo: "Viaje de trabajo",
    version: 1,
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
  await prisma.membresiaGym.deleteMany({
    where: { id: { in: membresiaIds } },
  });
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
      apellidos: "Congelacion",
      telefono: "3000000000",
      sedeId: `${prefix}_sede`,
      pin: await bcrypt.hash(pin, 4),
      estado: "ACTIVO",
    },
  });
  return { id: cliente.id, cedula };
}

/** Fixture F1: vigencia `ACTIVA` que abarca hoy, creada por la API existente. */
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

/**
 * Fixtures directas en BD (F2/F3/F4/F5/F7): la API de alta no cubre
 * `tipoServicio` (INC-05) y F7 no es alcanzable por API con DEC-022.
 */
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
 * Fila `CONGELACION` escrita directamente en la BD con la extension ya
 * aplicada (el estado resultante es identico al de una llamada 200 a la API).
 * `extender: false` deja `fechaFin` sin tocar: es el escenario de datos
 * heredados de F7 (fila de pausa sobre una vigencia que sigue `VENCIDA`).
 */
async function aplicarPausaDirecta(
  vigenciaId: string,
  rango: { inicio: string; fin: string },
  opciones: { motivo?: string; extender?: boolean } = {}
): Promise<{ version: number; fechaFin: string; dias: number }> {
  const vigencia = await prisma.membresiaGym.findUniqueOrThrow({
    where: { id: vigenciaId },
  });
  const dias = diasInclusivos(rango.inicio, rango.fin);
  const extender = opciones.extender ?? true;
  const fechaFinNueva = extender
    ? sumarDias(vigencia.fechaFin, dias)
    : vigencia.fechaFin;
  const nuevaVersion = vigencia.version + 1;

  await prisma.membresiaGymCambio.create({
    data: {
      membresiaId: vigenciaId,
      actorId: ownerUserId,
      accion: "CONGELACION",
      version: nuevaVersion,
      motivo: opciones.motivo ?? "Pausa directa de fixture",
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
    data: {
      fechaFin: fechaFinNueva,
      version: nuevaVersion,
      actualizadoPorId: ownerUserId,
    },
  });

  return { version: nuevaVersion, fechaFin: fechaFinNueva, dias };
}

async function congelar(
  clienteId: string,
  vigenciaId: string,
  payload: Record<string, unknown>,
  token: string = tokenOwner
) {
  return app.inject({
    method: "POST",
    url: `/clientes/${clienteId}/vigencias/${vigenciaId}/congelar`,
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

/**
 * Ventana que cruza el anio mas cercana a hoy (fila 18): 25-dic .. 3-ene, con
 * una vigencia que la contenga. Se deriva del anio de HOY para que la prueba
 * no dependa del calendario real de ejecucion.
 */
function ventanaCruceAnio() {
  const anio = Number(HOY.slice(0, 4));
  const anioRango = HOY <= `${anio}-12-25` ? anio : anio + 1;
  return {
    vigenciaInicio: `${anioRango}-01-01`,
    vigenciaFin: `${anioRango + 1}-01-31`,
    rangoInicio: `${anioRango}-12-25`,
    rangoFin: `${anioRango + 1}-01-03`,
  };
}

/** JWT con `exp` en el pasado (mismo patron que auth-session-expired). */
function tokenExpirado(): string {
  return app.jwt.sign({
    id: ownerUserId,
    email: ownerEmail,
    nombre: "Dueño Congelacion",
    rol: "DUENO",
    exp: Math.floor(Date.now() / 1000) - 120,
  });
}

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? "inc02-congelacion-secret";

  await cleanupFixtures();

  const [hashedOwner, hashedRecep] = await Promise.all([
    bcrypt.hash("owner123", 10),
    bcrypt.hash("recep123", 10),
  ]);
  await prisma.sede.upsert({
    where: { id: `${prefix}_sede` },
    update: { nombre: "Sede INC02 Congelacion" },
    create: { id: `${prefix}_sede`, nombre: "Sede INC02 Congelacion" },
  });
  const owner = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: { contrasena: hashedOwner, nombre: "Dueño Congelacion", rol: "DUENO" },
    create: {
      email: ownerEmail,
      contrasena: hashedOwner,
      nombre: "Dueño Congelacion",
      rol: "DUENO",
    },
  });
  await prisma.user.upsert({
    where: { email: recepEmail },
    update: { contrasena: hashedRecep, nombre: "Recepcion Congelacion", rol: "RECEPCIONISTA" },
    create: {
      email: recepEmail,
      contrasena: hashedRecep,
      nombre: "Recepcion Congelacion",
      rol: "RECEPCIONISTA",
    },
  });
  ownerUserId = owner.id;

  app = Fastify();
  await app.register(prismaPlugin);
  await app.register(authPlugin);
  await app.register(authRoutes);
  await app.register(clienteRoutes);
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

// ─── HU15-C02 — 400 VALIDATION_ERROR (filas 3..9b, 15) ───────────────────────

describe("POST .../congelar — HU15-C02 validaciones de body (400 VALIDATION_ERROR)", () => {
  const CASOS_400: Array<{
    caso: string;
    payload: Record<string, unknown>;
    mensaje: string;
  }> = [
    {
      caso: "fila 3 — fechaInicio ausente",
      payload: { fechaFin: dia(7), motivo: "Viaje de trabajo", version: 1 },
      mensaje: "Fecha de inicio es requerida",
    },
    {
      caso: "fila 4 — fechaFin ausente",
      payload: { fechaInicio: dia(-2), motivo: "Viaje de trabajo", version: 1 },
      mensaje: "Fecha fin es requerida",
    },
    {
      caso: "fila 5 — motivo ausente",
      payload: { fechaInicio: dia(-2), fechaFin: dia(7), version: 1 },
      mensaje: "Motivo es requerido",
    },
    {
      caso: "fila 5 — motivo vacio",
      payload: bodyValido({ motivo: "" }),
      mensaje: "Motivo es requerido",
    },
    {
      caso: "fila 5 — motivo solo espacios",
      payload: bodyValido({ motivo: "   " }),
      mensaje: "Motivo es requerido",
    },
    {
      caso: "fila 6 — motivo de 501 caracteres",
      payload: bodyValido({ motivo: "a".repeat(501) }),
      mensaje: "Motivo no puede exceder 500 caracteres",
    },
    {
      caso: "fila 7 — fechaInicio con formato distinto de YYYY-MM-DD",
      payload: bodyValido({ fechaInicio: "01/02/2026" }),
      mensaje: "Fecha de inicio debe ser una fecha válida (YYYY-MM-DD)",
    },
    {
      caso: "fila 8 — fechaFin inexistente en calendario",
      payload: bodyValido({ fechaFin: "2026-02-30" }),
      mensaje: "Fecha fin debe ser una fecha válida (YYYY-MM-DD)",
    },
    {
      caso: "fila 9 — fechaFin anterior a fechaInicio",
      payload: bodyValido({ fechaInicio: dia(10), fechaFin: dia(3) }),
      mensaje: "Fecha fin no puede ser anterior a fecha de inicio",
    },
    {
      caso: "fila 9b — version ausente",
      payload: { fechaInicio: dia(-2), fechaFin: dia(7), motivo: "Viaje de trabajo" },
      mensaje: "Versión es requerida",
    },
    {
      caso: "fila 9b — version no entera",
      payload: bodyValido({ version: 1.5 }),
      mensaje: "Versión debe ser un entero",
    },
    {
      caso: "fila 9b — version no positiva",
      payload: bodyValido({ version: 0 }),
      mensaje: "Versión debe ser positiva",
    },
    {
      caso: "fila 15 — fechaFin de la congelacion anterior a hoy (post-Zod)",
      payload: bodyValido({ fechaInicio: dia(-10), fechaFin: dia(-5) }),
      mensaje: "Fecha fin no puede ser anterior a hoy",
    },
  ];

  it.each(CASOS_400)(
    "HU15-C02 $caso responde 400 VALIDATION_ERROR con el mensaje exacto: $mensaje",
    async ({ payload, mensaje }) => {
      const res = await congelar(CLIENTE_DUMMY, VIGENCIA_DUMMY, payload);

      expect(res.statusCode).toBe(400);
      const body = parseBody(res);
      expect(body.code).toBe("VALIDATION_ERROR");
      expect(body.error).toBe(mensaje);
    }
  );
});

// ─── HU15-C05 — permisos (filas 2, 24, 25; DEC-017) ─────────────────────────

describe("POST .../congelar — HU15-C05 permisos (DEC-017)", () => {
  it("fila 25 sin token responde 401 AUTH_TOKEN_MISSING", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/clientes/${CLIENTE_DUMMY}/vigencias/${VIGENCIA_DUMMY}/congelar`,
      payload: bodyValido(),
    });

    expect(res.statusCode).toBe(401);
    const body = parseBody(res);
    expect(body.code).toBe("AUTH_TOKEN_MISSING");
    expect(body.error).toBe("Token de autenticación requerido.");
  });

  it("token invalido responde 401 AUTH_TOKEN_INVALID", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/clientes/${CLIENTE_DUMMY}/vigencias/${VIGENCIA_DUMMY}/congelar`,
      headers: { authorization: "Bearer token-no-valido" },
      payload: bodyValido(),
    });

    expect(res.statusCode).toBe(401);
    expect(parseBody(res).code).toBe("AUTH_TOKEN_INVALID");
  });

  it("token expirado responde 401 AUTH_TOKEN_EXPIRED", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/clientes/${CLIENTE_DUMMY}/vigencias/${VIGENCIA_DUMMY}/congelar`,
      headers: headers(tokenExpirado()),
      payload: bodyValido(),
    });

    expect(res.statusCode).toBe(401);
    expect(parseBody(res).code).toBe("AUTH_TOKEN_EXPIRED");
  });

  it("fila 24 rol CLIENTE responde 403 AUTH_FORBIDDEN", async () => {
    const res = await congelar(CLIENTE_DUMMY, VIGENCIA_DUMMY, bodyValido(), tokenCliente);

    expect(res.statusCode).toBe(403);
    const body = parseBody(res);
    expect(body.code).toBe("AUTH_FORBIDDEN");
    expect(body.error).toBe("No tienes permisos para realizar esta acción.");
  });
});

// ─── Filas 1, 2, 16..21, 23, 26, 30, 32 — exito, formulas y 409 de version ───

describe("POST .../congelar — exito, formulas de dias y version (HU15-C01/C04/C06)", () => {
  it("fila 1 happy path devuelve el DTO completo: N = 10, fechaFin extendida y estado CONGELADO", async () => {
    const cliente = await crearCliente();
    const vigenciaId = await crearVigenciaActiva(cliente.id);

    const res = await congelar(cliente.id, vigenciaId, bodyValido());
    expect(res.statusCode).toBe(200);

    const body = parseBody(res);
    const validacion = congelacionResponseSchema.safeParse(body);
    expect(
      validacion.success,
      JSON.stringify(validacion.success ? null : validacion.error.issues)
    ).toBe(true);

    expect(body.tipoServicio).toBe("GYM");
    expect(body.fechaInicio).toBe(dia(-30));
    expect(body.fechaFinAnterior).toBe(dia(30));
    expect(body.fechaFin).toBe(dia(40));
    expect(body.diasCongelados).toBe(10);
    expect(body.estado).toBe("CONGELADO");
    expect(body.version).toBe(2);
    expect(body.creadoPor.id).toBe(ownerUserId);
    expect(body.actualizadoPor.id).toBe(ownerUserId);
    expect(body.congelacion).toEqual({
      fechaInicio: dia(-2),
      fechaFin: dia(7),
      motivo: "Viaje de trabajo",
      diasCongelados: 10,
    });

    expect(body.cambios).toHaveLength(2);
    const fila = body.cambios[1];
    expect(fila.accion).toBe("CONGELACION");
    expect(fila.version).toBe(2);
    expect(fila.motivo).toBe("Viaje de trabajo");
    expect(fila.congelacionInicio).toBe(dia(-2));
    expect(fila.congelacionFin).toBe(dia(7));
    expect(fila.fechaInicioAnterior).toBe(dia(-30));
    expect(fila.fechaFinAnterior).toBe(dia(30));
    expect(fila.fechaInicioNueva).toBe(dia(-30));
    expect(fila.fechaFinNueva).toBe(dia(40));
    expect(fila.actor.id).toBe(ownerUserId);
  });

  it("fila 2 rol RECEPCIONISTA recibe 200 (DEC-017)", async () => {
    const cliente = await crearCliente();
    const vigenciaId = await crearVigenciaActiva(cliente.id);

    const res = await congelar(
      cliente.id,
      vigenciaId,
      bodyValido({ fechaInicio: dia(1), fechaFin: dia(3) }),
      tokenRecep
    );

    expect(res.statusCode).toBe(200);
    expect(parseBody(res).version).toBe(2);
  });

  it("fila 16 inicio retroactivo con el rango abierto devuelve 200, N = 27 y fechaFin + 27 dias", async () => {
    const cliente = await crearCliente();
    const vigenciaId = await crearVigenciaActiva(cliente.id);
    const payload = bodyValido({ fechaInicio: dia(-21), fechaFin: dia(5) });

    const res = await congelar(cliente.id, vigenciaId, payload);
    expect(res.statusCode).toBe(200);

    const body = parseBody(res);
    expect(diasInclusivos(dia(-21), dia(5))).toBe(27);
    expect(body.diasCongelados).toBe(27);
    expect(body.fechaFin).toBe(sumarDias(dia(30), 27));
  });

  it("fila 17 congelacion de un solo dia (cInicio == cFin) devuelve 200 con N = 1", async () => {
    const cliente = await crearCliente();
    const vigenciaId = await crearVigenciaActiva(cliente.id);

    const res = await congelar(
      cliente.id,
      vigenciaId,
      bodyValido({ fechaInicio: dia(3), fechaFin: dia(3) })
    );
    expect(res.statusCode).toBe(200);

    const body = parseBody(res);
    expect(body.diasCongelados).toBe(1);
    expect(body.fechaFin).toBe(dia(31));
  });

  it("fila 18 rango que cruza el anio devuelve 200 con N = 10 (calendario, no strings)", async () => {
    const ventana = ventanaCruceAnio();
    const cliente = await crearCliente();
    const vigenciaId = await crearVigenciaDirecta(cliente.id, {
      fechaInicio: ventana.vigenciaInicio,
      fechaFin: ventana.vigenciaFin,
    });

    const res = await congelar(
      cliente.id,
      vigenciaId,
      bodyValido({
        fechaInicio: ventana.rangoInicio,
        fechaFin: ventana.rangoFin,
      })
    );
    expect(res.statusCode).toBe(200);

    const body = parseBody(res);
    expect(diasInclusivos(ventana.rangoInicio, ventana.rangoFin)).toBe(10);
    expect(body.diasCongelados).toBe(10);
    expect(body.fechaFin).toBe(sumarDias(ventana.vigenciaFin, 10));
  });

  it("fila 20 un gap de un dia entre congelaciones se acepta (DEC-008 permite gaps)", async () => {
    const cliente = await crearCliente();
    const vigenciaId = await crearVigenciaActiva(cliente.id);
    await aplicarPausaDirecta(vigenciaId, { inicio: dia(-5), fin: dia(3) });

    const res = await congelar(
      cliente.id,
      vigenciaId,
      bodyValido({ fechaInicio: dia(5), fechaFin: dia(9), version: 2 })
    );

    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.diasCongelados).toBe(5);
    expect(body.fechaFin).toBe(dia(44));
  });

  it("fila 21 dos congelaciones consecutivas disjuntas suman N1 + N2 sin duplicar dias", async () => {
    const cliente = await crearCliente();
    const vigenciaId = await crearVigenciaActiva(cliente.id);

    const primera = await congelar(cliente.id, vigenciaId, bodyValido());
    expect(primera.statusCode).toBe(200);
    expect(parseBody(primera).fechaFin).toBe(dia(40));

    const segunda = await congelar(
      cliente.id,
      vigenciaId,
      bodyValido({ fechaInicio: dia(9), fechaFin: dia(12), version: 2 })
    );
    expect(segunda.statusCode).toBe(200);

    const body = parseBody(segunda);
    expect(body.fechaFin).toBe(dia(44));
    expect(body.fechaFin).toBe(sumarDias(dia(30), 10 + 4));
    expect(body.version).toBe(3);
  });

  it("fila 23 dos congelaciones con la misma version dejan exactamente una 200 y una 409 MEMBRESIA_CONFLICTO", async () => {
    const cliente = await crearCliente();
    const vigenciaId = await crearVigenciaActiva(cliente.id);

    const ganadora = await congelar(cliente.id, vigenciaId, bodyValido());
    expect(ganadora.statusCode).toBe(200);

    const perdedora = await congelar(
      cliente.id,
      vigenciaId,
      bodyValido({ fechaInicio: dia(9), fechaFin: dia(12) })
    );
    expect(perdedora.statusCode).toBe(409);
    expect(parseBody(perdedora).code).toBe("MEMBRESIA_CONFLICTO");

    const fila = await prisma.membresiaGym.findUniqueOrThrow({
      where: { id: vigenciaId },
    });
    expect(fila.version).toBe(2);
    expect(fila.fechaFin).toBe(dia(40));

    const congelaciones = await prisma.membresiaGymCambio.count({
      where: { membresiaId: vigenciaId, accion: "CONGELACION" },
    });
    expect(congelaciones).toBe(1);
  });

  it("fila 26 la congelacion aceptada deja la fila CONGELACION de auditoria en la BD", async () => {
    const cliente = await crearCliente();
    const vigenciaId = await crearVigenciaActiva(cliente.id);

    const res = await congelar(cliente.id, vigenciaId, bodyValido());
    expect(res.statusCode).toBe(200);

    const cambio = await prisma.membresiaGymCambio.findFirst({
      where: { membresiaId: vigenciaId, accion: "CONGELACION" },
    });
    expect(cambio).not.toBeNull();
    expect(cambio?.actorId).toBe(ownerUserId);
    expect(cambio?.version).toBe(2);
    expect(cambio?.motivo).toBe("Viaje de trabajo");
    expect(cambio?.congelacionInicio).toBe(dia(-2));
    expect(cambio?.congelacionFin).toBe(dia(7));
    expect(cambio?.fechaInicioAnterior).toBe(dia(-30));
    expect(cambio?.fechaFinAnterior).toBe(dia(30));
    expect(cambio?.fechaInicioNueva).toBe(dia(-30));
    expect(cambio?.fechaFinNueva).toBe(dia(40));
  });

  it("fila 30 una vigencia PERSONALIZADO se congela por el mismo endpoint con 200 (DEC-023)", async () => {
    const cliente = await crearCliente();
    const vigenciaId = await crearVigenciaDirecta(cliente.id, {
      fechaInicio: dia(-30),
      fechaFin: dia(30),
      tipoServicio: "PERSONALIZADO",
    });

    const res = await congelar(cliente.id, vigenciaId, bodyValido());

    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.tipoServicio).toBe("PERSONALIZADO");
    expect(body.diasCongelados).toBe(10);
    expect(body.fechaFin).toBe(dia(40));
  });

  it("fila 32 version desactualizada responde 409 MEMBRESIA_CONFLICTO y no modifica la vigencia", async () => {
    const cliente = await crearCliente();
    const vigenciaId = await crearVigenciaActiva(cliente.id);

    const res = await congelar(cliente.id, vigenciaId, bodyValido({ version: 2 }));
    expect(res.statusCode).toBe(409);
    expect(parseBody(res).code).toBe("MEMBRESIA_CONFLICTO");

    const fila = await prisma.membresiaGym.findUniqueOrThrow({
      where: { id: vigenciaId },
    });
    expect(fila.version).toBe(1);
    expect(fila.fechaFin).toBe(dia(30));

    const congelaciones = await prisma.membresiaGymCambio.count({
      where: { membresiaId: vigenciaId, accion: "CONGELACION" },
    });
    expect(congelaciones).toBe(0);
  });
});

// ─── Filas 10..14, 19, 22, 31 — 404 y 409 en el orden del contrato ───────────

describe("POST .../congelar — 404 y 409 en orden determinista (HU15-C01/C04)", () => {
  it("fila 10 una vigencia inexistente responde 404 NOT_FOUND", async () => {
    const cliente = await crearCliente();

    const res = await congelar(
      cliente.id,
      "no-existe-vigencia-0001",
      bodyValido()
    );

    expect(res.statusCode).toBe(404);
    const body = parseBody(res);
    expect(body.code).toBe("NOT_FOUND");
    expect(body.error).toBe("Membresía no encontrada");
  });

  it("fila 11 una vigencia de otro cliente responde 404 NOT_FOUND (ownership)", async () => {
    const duenio = await crearCliente();
    const ajeno = await crearCliente();
    const vigenciaId = await crearVigenciaActiva(duenio.id);

    const res = await congelar(ajeno.id, vigenciaId, bodyValido());

    expect(res.statusCode).toBe(404);
    const body = parseBody(res);
    expect(body.code).toBe("NOT_FOUND");
    expect(body.error).toBe("Membresía no encontrada");
  });

  it("filas 12/31 una vigencia NUTRICION responde 409 CONGELACION_NO_PERMITIDA y no cambia (DEC-023)", async () => {
    const cliente = await crearCliente();
    const vigenciaId = await crearVigenciaDirecta(cliente.id, {
      fechaInicio: dia(-30),
      fechaFin: dia(30),
      tipoServicio: "NUTRICION",
    });

    const res = await congelar(cliente.id, vigenciaId, bodyValido());

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
  });

  it("fila 13 una vigencia VENCIDA responde 409 MEMBRESIA_VENCIDA antes de validar el rango (DEC-022)", async () => {
    const cliente = await crearCliente();
    const vigenciaId = await crearVigenciaDirecta(cliente.id, {
      fechaInicio: dia(-60),
      fechaFin: dia(-10),
    });

    // El rango tambien esta fuera de la vigencia: si el orden fuera al reves
    // llegaria CONGELACION_NO_PERMITIDA en lugar de MEMBRESIA_VENCIDA.
    const res = await congelar(
      cliente.id,
      vigenciaId,
      bodyValido({ fechaInicio: dia(-5), fechaFin: dia(3) })
    );

    expect(res.statusCode).toBe(409);
    const body = parseBody(res);
    expect(body.code).toBe("MEMBRESIA_VENCIDA");
    expect(body.error).toBe("No se puede congelar una membresía vencida");
  });

  it("fila 14 un rango fuera de la vigencia responde 409 CONGELACION_NO_PERMITIDA", async () => {
    const cliente = await crearCliente();
    const vigenciaId = await crearVigenciaActiva(cliente.id);

    const res = await congelar(
      cliente.id,
      vigenciaId,
      bodyValido({ fechaInicio: dia(31), fechaFin: dia(35) })
    );

    expect(res.statusCode).toBe(409);
    const body = parseBody(res);
    expect(body.code).toBe("CONGELACION_NO_PERMITIDA");
    expect(body.error).toBe("El rango de congelación debe estar dentro de la vigencia");
  });

  it("fila 19 un rango que solapa otra congelacion responde 409 MEMBRESIA_SOLAPADA", async () => {
    const cliente = await crearCliente();
    const vigenciaId = await crearVigenciaActiva(cliente.id);
    await aplicarPausaDirecta(vigenciaId, { inicio: dia(-5), fin: dia(3) });

    const res = await congelar(
      cliente.id,
      vigenciaId,
      bodyValido({ fechaInicio: dia(2), fechaFin: dia(8), version: 2 })
    );

    expect(res.statusCode).toBe(409);
    const body = parseBody(res);
    expect(body.code).toBe("MEMBRESIA_SOLAPADA");
    expect(body.error).toBe("Las fechas se solapan con un período existente");
  });

  it("fila 22 la extension que chocaria con un periodo posterior responde 409 MEMBRESIA_SOLAPADA sin cambios (atomico)", async () => {
    const cliente = await crearCliente();
    const vigenciaId = await crearVigenciaDirecta(cliente.id, {
      fechaInicio: dia(-30),
      fechaFin: dia(30),
    });
    // Periodo posterior que empieza exactamente donde caeria la fechaFin
    // extendida: dia(30) + N(10) = dia(40).
    await crearVigenciaDirecta(cliente.id, {
      fechaInicio: dia(40),
      fechaFin: dia(90),
    });

    const res = await congelar(cliente.id, vigenciaId, bodyValido());

    expect(res.statusCode).toBe(409);
    const body = parseBody(res);
    expect(body.code).toBe("MEMBRESIA_SOLAPADA");
    expect(body.error).toBe("Las fechas se solapan con un período existente");

    const fila = await prisma.membresiaGym.findUniqueOrThrow({
      where: { id: vigenciaId },
    });
    expect(fila.version).toBe(1);
    expect(fila.fechaFin).toBe(dia(30));

    const congelaciones = await prisma.membresiaGymCambio.count({
      where: { membresiaId: vigenciaId, accion: "CONGELACION" },
    });
    expect(congelaciones).toBe(0);
  });
});

// ─── HU15-C03 / HU-12 b2 — estado CONGELADO + DEC-025 ────────────────────────

describe("GET .../membresias-gym — estado calculado (HU15-C03, HU-12 bullet 2, DEC-025)", () => {
  it("fila 27 durante el rango congelado el estado calculado es CONGELADO", async () => {
    const cliente = await crearCliente();
    const vigenciaId = await crearVigenciaActiva(cliente.id);

    const res = await congelar(cliente.id, vigenciaId, bodyValido());
    expect(res.statusCode).toBe(200);

    const body = await listarMembresias(cliente.id);
    expect(buscarMembresia(body, vigenciaId).estado).toBe("CONGELADO");
  });

  it("filas 27/28 precedencia sobre VENCIDA: pausa que cubre hoy sobre una vigencia VENCIDA (F7, fixture directa)", async () => {
    const cliente = await crearCliente();
    const vigenciaId = await crearVigenciaDirecta(cliente.id, {
      fechaInicio: dia(-60),
      fechaFin: dia(-10),
    });
    // F7: escenario de datos heredados (inalcanzable por API con DEC-022);
    // la extension no se aplica para conservar fechaFin < hoy.
    await aplicarPausaDirecta(
      vigenciaId,
      { inicio: dia(-20), fin: dia(0) },
      { extender: false }
    );

    const body = await listarMembresias(cliente.id);
    expect(buscarMembresia(body, vigenciaId).fechaFin).toBe(dia(-10));
    expect(buscarMembresia(body, vigenciaId).estado).toBe("CONGELADO");
  });

  it("fila 29 terminado el rango el estado vuelve al calculo normal con la fechaFin extendida", async () => {
    const cliente = await crearCliente();
    const vigenciaId = await crearVigenciaDirecta(cliente.id, {
      fechaInicio: dia(-30),
      fechaFin: dia(30),
    });
    await aplicarPausaDirecta(vigenciaId, { inicio: dia(-20), fin: dia(-10) });

    const body = await listarMembresias(cliente.id);
    const membresia = buscarMembresia(body, vigenciaId);
    expect(membresia.fechaFin).toBe(dia(41));
    expect(membresia.estado).toBe("ACTIVA");
  });

  it("regresion HU15-C03 los estados base sin pausa siguen siendo ACTIVA, VENCIDA y PROGRAMADA", async () => {
    const cliente = await crearCliente();
    const vencidaId = await crearVigenciaDirecta(cliente.id, {
      fechaInicio: dia(-60),
      fechaFin: dia(-40),
    });
    const activaId = await crearVigenciaDirecta(cliente.id, {
      fechaInicio: dia(-30),
      fechaFin: dia(30),
    });
    const programadaId = await crearVigenciaDirecta(cliente.id, {
      fechaInicio: dia(40),
      fechaFin: dia(70),
    });

    const body = await listarMembresias(cliente.id);
    expect(buscarMembresia(body, vencidaId).estado).toBe("VENCIDA");
    expect(buscarMembresia(body, activaId).estado).toBe("ACTIVA");
    expect(buscarMembresia(body, programadaId).estado).toBe("PROGRAMADA");
  });

  it("DEC-025 con una congelacion vigente el cliente se autentica y accede a su ficha (sin bloqueo)", async () => {
    const cliente = await crearCliente();
    const vigenciaId = await crearVigenciaDirecta(cliente.id, {
      fechaInicio: dia(-30),
      fechaFin: dia(30),
    });
    await aplicarPausaDirecta(vigenciaId, { inicio: dia(-2), fin: dia(7) });

    const login = await app.inject({
      method: "POST",
      url: "/auth/login-cliente",
      payload: { cedula: cliente.cedula, pin },
    });
    expect(login.statusCode).toBe(200);
    const clienteToken = parseBody(login).token;

    const ficha = await app.inject({
      method: "GET",
      url: `/clientes/${cliente.id}`,
      headers: headers(clienteToken),
    });
    expect(ficha.statusCode).toBe(200);

    const lista = await listarMembresias(cliente.id);
    expect(buscarMembresia(lista, vigenciaId).estado).toBe("CONGELADO");
  });
});
