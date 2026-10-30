/**
 * INC-06 (DEC-048 + DEC-051 + ratificacion R1..R5) — RED del acceso completo
 * bloqueado sin ninguna membresia activa.
 *
 * Criterios: `INC06-ACC-01..07` (7 criterios SPEC, 0 puntos MVP; regresiones
 * `REF` de HU-16/HU-25/HU-30/HU-15/HU-08 verificadas sin re-cobrar).
 *
 * Contrato verificado por este RED (spec INC-06, "Regla de negocio" +
 * "Contrato API — RATIFICA CON CORRECCIONES R1..R5"):
 *  - R1 (sustantiva): `sinMembresiaActiva` se calcula SOLO sobre vigencias
 *    (`EXISTE fila GYM|PERSONALIZADO|NUTRICION con estadoCalculado en
 *    {ACTIVA, CONGELADO}` -> false). El estado general del cliente NO entra
 *    en el flag: un `SUSPENDIDO` con GYM `ACTIVA` responde
 *    `sinMembresiaActiva: false` (nunca el copy falso de DEC-051 PEND-01(a)).
 *  - R3: `GET /portal/resumen` responde 200 con UNICO campo top-level nuevo
 *    `sinMembresiaActiva: boolean` (sin objeto `accesoApp`, sin `fechaInicio`
 *    — R11: no se piden campos nuevos); campos actuales intactos.
 *  - R4 orden portal: 401 -> 403 rol -> 404 cliente -> resolucion -> 200.
 *  - DEC-051 PEND-02(a)/PEND-04(a): login intacto (identidad != acceso;
 *    solo DEC-034 `AUTH_CLIENTE_INACTIVO` bloquea login) y `PROGRAMADA`
 *    cuenta como sin membresia activa.
 *  - DEC-025: `CONGELADO` conserva acceso. DEC-026/027: acceso por servicio
 *    (mixto GYM VENCIDA + NUTRICION ACTIVA -> sin bloqueo).
 *  - Ingreso (HU-30/DEC-030/039): guardas intactas y en el MISMO orden
 *    (estado general ANTES de vigencia); mensajes exactos por motivo.
 *
 * Estado RED (2026-10-29): `src/routes/portal.ts` NO expone
 * `sinMembresiaActiva` (el contrato actual termina en `fechaActual`), por lo
 * que toda asercion del flag falla (`undefined` != true/false). Las
 * regresiones de ingreso/login/portal-con-acceso pasan hoy (comportamiento
 * aceptado intacto) y protegen el GREEN de INC-06.
 *
 * GREEN (backend-developer): `resolverAccesoApp` en `membresia.service.ts`
 * (fuente unica `calcularEstado`/`resolverEstadoAcceso` sobre los 3 tipos,
 * R2) + campo aditivo en `GET /portal/resumen` (R3). Ninguna asercion cambia.
 *
 * Fixtures (spec INC-06 F1..F8): fechas dinamicas relativas a
 * `getTodayBogota()` (DEC-013); sedes reales del seed (`sede-1`/`sede-2`);
 * aislamiento por prefijo de cedula 9946 (DEC-012).
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
import { portalResumenResponseSchema } from "../../features/acceptance-criteria/HU-25-schemas";

const cedulaPrefix = "9946";
const pin = "1234";
const SEDE_PRINCIPAL = "sede-1";

/** DEC-013: todo el archivo se calcula sobre la fecha real de Bogota. */
const HOY = getTodayBogota();

let app: any;
let tokenOwner = "";
let tokenRecep = "";
let ownerUserId = "";
let clienteSeq = 0;

/** Fixtures F1..F8 del spec (se crean en beforeAll). */
let f1SinVigenciaCedula = "";
let f2VencidaCedula = "";
let f2VencidaFin = "";
let f3MixtoId = "";
let f3MixtoCedula = "";
let f4CongeladoCedula = "";
let f4bPausaTerminadaCedula = "";
let f4bFinEfectivo = "";
let f5ProgramadaCedula = "";
let f5ProgramadaInicio = "";
let f6SuspendidoCedula = "";
let f7ActivaCedula = "";
let f7ActivaFin = "";
let inactivoCedula = "";

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
  await prisma.clienteEstadoCambio.deleteMany({
    where: { clienteId: { in: clienteIds } },
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
  // Letra unica por fixture (patron "Cliente A/B/C..."): `namesSchema` (HU-25)
  // no admite digitos en nombres/apellidos.
  const letra = String.fromCharCode(65 + ((clienteSeq - 1) % 26));
  const cliente = await prisma.cliente.create({
    data: {
      cedula,
      nombres: "Acceso",
      apellidos: `Cliente ${letra}`,
      telefono: "3000000000",
      sedeId: SEDE_PRINCIPAL,
      pin: await bcrypt.hash(pin, 4),
      estado: opciones.estado ?? "ACTIVO",
    },
  });
  return { id: cliente.id, cedula };
}

/**
 * Vigencia directa en BD sobre los 3 tipos (DEC-004): fixtures F1..F7 sin
 * depender de las rutas de INC-05 (precedente `fixtureFila` de HU-13).
 */
async function crearVigencia(
  clienteId: string,
  fechaInicio: string,
  fechaFin: string,
  tipoServicio: string = "GYM"
): Promise<string> {
  const fila = await prisma.membresiaGym.create({
    data: {
      clienteId,
      fechaInicio,
      fechaFin,
      tipoServicio,
      creadoPorId: ownerUserId,
      actualizadoPorId: ownerUserId,
    },
  });
  return fila.id;
}

/** Pausa via la API aceptada de INC-02 (fixture F4). */
async function congelarVigencia(
  clienteId: string,
  vigenciaId: string,
  fechaInicio: string,
  fechaFin: string,
  version: number = 1
): Promise<void> {
  const res = await app.inject({
    method: "POST",
    url: `/clientes/${clienteId}/vigencias/${vigenciaId}/congelar`,
    headers: headers(tokenOwner),
    payload: {
      fechaInicio,
      fechaFin,
      motivo: "Pausa fixture INC-06",
      version,
    },
  });
  expect(res.statusCode).toBe(200);
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

function registrarIngreso(cedula: string, token: string) {
  return app.inject({
    method: "POST",
    url: "/recepcion/ingresos",
    headers: headers(token),
    payload: { cedula, sedeId: SEDE_PRINCIPAL },
  });
}

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? "inc06-acceso-secret";

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

  const owner = await loginStaff("admin@clubbeasts.com", "admin123");
  tokenOwner = owner.token;
  ownerUserId = owner.id;
  const recep = await loginStaff("recep@clubbeasts.com", "recep123");
  tokenRecep = recep.token;

  // F1: cliente ACTIVO con cero filas de membresia (3 tipos).
  const f1 = await crearCliente();
  f1SinVigenciaCedula = f1.cedula;

  // F2: cliente ACTIVO con SOLO GYM VENCIDA (fin ayer).
  const f2 = await crearCliente();
  f2VencidaCedula = f2.cedula;
  f2VencidaFin = dia(-1);
  await crearVigencia(f2.id, dia(-30), f2VencidaFin, "GYM");

  // F3 (fixture F8 de INC-05): GYM VENCIDA + NUTRICION ACTIVA (mixto).
  const f3 = await crearCliente();
  f3MixtoId = f3.id;
  f3MixtoCedula = f3.cedula;
  await crearVigencia(f3.id, dia(-30), dia(-1), "GYM");
  await crearVigencia(f3.id, dia(-5), dia(25), "NUTRICION");

  // F4: unica vigencia CONGELADO (pausa que cubre hoy, DEC-025).
  const f4 = await crearCliente();
  f4CongeladoCedula = f4.cedula;
  const vigenciaF4 = await crearVigencia(f4.id, dia(-30), dia(30), "GYM");
  await congelarVigencia(f4.id, vigenciaF4, dia(-1), dia(1));

  // F4b (ACC-03): pausa TERMINADA sin renovar -> el bloqueo entra al dia
  // siguiente del fin efectivo. Estado exacto que deja una pausa ya terminada
  // (fila CONGELACION + fechaFin extendida, mismo resultado que la API de
  // INC-02): pausa dia(-6)..dia(-4) (contenida, DEC-022a) extiende fechaFin
  // dia(-4) + 3 dias = dia(-1) = ayer (fin efectivo); HOY es exactamente
  // "el dia siguiente del fin efectivo" -> VENCIDA. La fila se escribe en BD
  // porque `congelar` exige fechaFin de la pausa hoy/futura (fixture de un
  // pasado ya consumido; precedente `fixtureFila` de HU-13).
  const f4b = await crearCliente();
  f4bPausaTerminadaCedula = f4b.cedula;
  f4bFinEfectivo = dia(-1);
  const vigenciaF4b = await crearVigencia(f4b.id, dia(-10), f4bFinEfectivo, "GYM");
  await prisma.membresiaGymCambio.create({
    data: {
      membresiaId: vigenciaF4b,
      actorId: ownerUserId,
      accion: "CONGELACION",
      motivo: "Fixture INC-06 pausa terminada",
      congelacionInicio: dia(-6),
      congelacionFin: dia(-4),
      version: 1,
      fechaInicioAnterior: dia(-10),
      fechaFinAnterior: dia(-4),
      fechaInicioNueva: dia(-10),
      fechaFinNueva: f4bFinEfectivo,
    },
  });

  // F5: vigencia PROGRAMADA como unica (inicio manana).
  const f5 = await crearCliente();
  f5ProgramadaCedula = f5.cedula;
  f5ProgramadaInicio = dia(1);
  await crearVigencia(f5.id, f5ProgramadaInicio, dia(30), "GYM");

  // F6: cliente SUSPENDIDO con GYM ACTIVA (guarda previa intacta + R1).
  const f6 = await crearCliente({ estado: "SUSPENDIDO" });
  f6SuspendidoCedula = f6.cedula;
  await crearVigencia(f6.id, dia(-10), dia(20), "GYM");

  // F7: cliente ACTIVO con GYM ACTIVA (regresion portal con acceso).
  const f7 = await crearCliente();
  f7ActivaCedula = f7.cedula;
  f7ActivaFin = dia(30);
  await crearVigencia(f7.id, dia(-30), f7ActivaFin, "GYM");

  // DEC-034 (regresion): cliente INACTIVO para la guarda de login.
  const inactivo = await crearCliente({ estado: "INACTIVO" });
  inactivoCedula = inactivo.cedula;
});

afterAll(async () => {
  await app.close();
  await cleanupFixtures();
});

// ─── INC06-ACC-01 — deteccion (F1/F2/F5: sinMembresiaActiva true) ────────────

describe("INC06-ACC-01 el portal marca sinMembresiaActiva cuando no hay ninguna vigencia ACTIVA/CONGELADO", () => {
  it("ACC-01 F1: cliente con cero filas de membresia -> 200 con sinMembresiaActiva true (SIN_VIGENCIA intacto)", async () => {
    const token = await loginCliente(f1SinVigenciaCedula);
    const res = await consultarResumen(token);

    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.sinMembresiaActiva).toBe(true);
    // Campos actuales intactos (R3): el bloque GYM no cambia.
    expect(body.estadoAccesoGym).toBe("SIN_VIGENCIA");
    expect(body.fechaVencimiento).toBeNull();
    expect(portalResumenResponseSchema.parse(body)).toBeTruthy();
  });

  it("ACC-01 F2: cliente con solo GYM VENCIDA -> 200 con sinMembresiaActiva true", async () => {
    const token = await loginCliente(f2VencidaCedula);
    const res = await consultarResumen(token);

    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.sinMembresiaActiva).toBe(true);
    expect(body.estadoAccesoGym).toBe("VENCIDA");
    expect(body.fechaVencimiento).toBe(f2VencidaFin);
  });

  it("ACC-01 F5: la unica vigencia PROGRAMADA cuenta como sin membresia activa (DEC-051 PEND-04(a))", async () => {
    const token = await loginCliente(f5ProgramadaCedula);
    const res = await consultarResumen(token);

    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.sinMembresiaActiva).toBe(true);
    // El estado calculado por vigencia sigue expuesto tal cual.
    expect(body.estadoAccesoGym).toBe("PROGRAMADA");
  });
});

// ─── INC06-ACC-02 — regresion multi-servicio (F3 mixto, DEC-026/027) ─────────

describe("INC06-ACC-02 un servicio vigente alcanza: mixto GYM VENCIDA + NUTRICION ACTIVA sin bloqueo", () => {
  it("ACC-02 F3: el portal responde sinMembresiaActiva false con GYM VENCIDA + NUTRICION ACTIVA", async () => {
    const token = await loginCliente(f3MixtoCedula);
    const res = await consultarResumen(token);

    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.sinMembresiaActiva).toBe(false);
    // Estado por servicio (DEC-026/027): el bloque GYM conserva su estado.
    expect(body.estadoAccesoGym).toBe("VENCIDA");
  });

  it("ACC-02 F3: la ficha expone el estado calculado por servicio (GYM VENCIDA y NUTRICION ACTIVA)", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/clientes/${f3MixtoId}`,
      headers: headers(tokenOwner),
    });

    expect(res.statusCode).toBe(200);
    const filas = parseBody(res).membresias as Array<{
      tipoServicio: string;
      estado: string;
    }>;
    const gym = filas.find((fila) => fila.tipoServicio === "GYM");
    const nutricion = filas.find((fila) => fila.tipoServicio === "NUTRICION");
    expect(gym?.estado).toBe("VENCIDA");
    expect(nutricion?.estado).toBe("ACTIVA");
  });

  it("ACC-02 F3: el ingreso sigue rechazado por GYM VENCIDA (acceso por servicio intacto, DEC-026/027)", async () => {
    const res = await registrarIngreso(f3MixtoCedula, tokenRecep);

    expect(res.statusCode).toBe(403);
    const body = parseBody(res);
    expect(body.code).toBe("INGRESO_NO_PERMITIDO");
    expect(body.error).toBe(
      `La membresía no está habilitada para ingresar (vencida el ${dia(-1)})`
    );
  });

  it("ACC-02 F3: el login del cliente mixto esta intacto (DEC-026)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login-cliente",
      payload: { cedula: f3MixtoCedula, pin },
    });

    expect(res.statusCode).toBe(200);
    expect(parseBody(res).token).toBeTruthy();
  });
});

// ─── INC06-ACC-03 — congelacion conserva acceso (F4, DEC-025) ────────────────

describe("INC06-ACC-03 CONGELADO conserva acceso y el bloqueo entra tras el fin efectivo de la pausa", () => {
  it("ACC-03 F4: la unica vigencia CONGELADO -> sinMembresiaActiva false (DEC-025)", async () => {
    const token = await loginCliente(f4CongeladoCedula);
    const res = await consultarResumen(token);

    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.sinMembresiaActiva).toBe(false);
    expect(body.estadoAccesoGym).toBe("CONGELADO");
  });

  it("ACC-03 F4b: pausa terminada sin renovar -> el bloqueo entra al dia siguiente del fin efectivo", async () => {
    const token = await loginCliente(f4bPausaTerminadaCedula);
    const res = await consultarResumen(token);

    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    // Fin efectivo de la pausa = ayer; HOY es el dia siguiente -> bloqueo.
    expect(body.sinMembresiaActiva).toBe(true);
    expect(body.estadoAccesoGym).toBe("VENCIDA");
    expect(body.fechaVencimiento).toBe(f4bFinEfectivo);
  });
});

// ─── INC06-ACC-04 — regresion de ingresos (HU-30 / DEC-030 / DEC-039) ────────

describe("INC06-ACC-04 las guardas de ingreso quedan intactas y en el mismo orden", () => {
  it("ACC-04 F7: 201 con GYM ACTIVA", async () => {
    const res = await registrarIngreso(f7ActivaCedula, tokenRecep);

    expect(res.statusCode).toBe(201);
    const body = parseBody(res);
    expect(body.cedula).toBe(f7ActivaCedula);
    expect(body.fecha).toBe(HOY);
  });

  it("ACC-04 F4: 201 con GYM CONGELADO (DEC-025)", async () => {
    const res = await registrarIngreso(f4CongeladoCedula, tokenRecep);

    expect(res.statusCode).toBe(201);
  });

  it("ACC-04 F2: 403 INGRESO_NO_PERMITIDO con el mensaje exacto de VENCIDA", async () => {
    const res = await registrarIngreso(f2VencidaCedula, tokenRecep);

    expect(res.statusCode).toBe(403);
    const body = parseBody(res);
    expect(body.code).toBe("INGRESO_NO_PERMITIDO");
    expect(body.error).toBe(
      `La membresía no está habilitada para ingresar (vencida el ${f2VencidaFin})`
    );
  });

  it("ACC-04 F5: 403 INGRESO_NO_PERMITIDO con el mensaje exacto de PROGRAMADA", async () => {
    const res = await registrarIngreso(f5ProgramadaCedula, tokenRecep);

    expect(res.statusCode).toBe(403);
    const body = parseBody(res);
    expect(body.code).toBe("INGRESO_NO_PERMITIDO");
    expect(body.error).toBe(
      `La membresía no está habilitada para ingresar (aún no inicia desde ${f5ProgramadaInicio})`
    );
  });

  it("ACC-04 F1: 403 INGRESO_NO_PERMITIDO con el mensaje exacto de SIN_VIGENCIA", async () => {
    const res = await registrarIngreso(f1SinVigenciaCedula, tokenRecep);

    expect(res.statusCode).toBe(403);
    const body = parseBody(res);
    expect(body.code).toBe("INGRESO_NO_PERMITIDO");
    expect(body.error).toBe(
      "La membresía no está habilitada para ingresar (no tiene vigencia activa)"
    );
  });

  it("ACC-04 F6: la rama de estado general (SUSPENDIDO) esta intacta y ANTES de la vigencia", async () => {
    // F6 tiene GYM ACTIVA: si el orden cambiara, el ingreso pasaria a 201.
    const res = await registrarIngreso(f6SuspendidoCedula, tokenRecep);

    expect(res.statusCode).toBe(403);
    const body = parseBody(res);
    expect(body.code).toBe("INGRESO_NO_PERMITIDO");
    expect(body.error).toBe(
      "El cliente está SUSPENDIDO y no puede registrar ingresos"
    );
  });

  it("ACC-04: sin token -> 401 y con token CLIENTE -> 403 AUTH_FORBIDDEN (permisos intactos, F8)", async () => {
    const sinToken = await registrarIngreso(f7ActivaCedula, "");
    expect(sinToken.statusCode).toBe(401);

    const tokenCliente = await loginCliente(f7ActivaCedula);
    const comoCliente = await registrarIngreso(f7ActivaCedula, tokenCliente);
    expect(comoCliente.statusCode).toBe(403);
    expect(parseBody(comoCliente).code).toBe("AUTH_FORBIDDEN");
  });
});

// ─── INC06-ACC-05 — login intacto (DEC-051 PEND-02(a) / DEC-026 / DEC-034) ───

describe("INC06-ACC-05 el login del cliente no cambia sin membresia activa", () => {
  it("ACC-05 F2: login 200 con todas las vigencias VENCIDA (identidad != acceso)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login-cliente",
      payload: { cedula: f2VencidaCedula, pin },
    });

    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.token).toBeTruthy();
    expect(body.cliente.cedula).toBe(f2VencidaCedula);
    // El flujo de PIN obligatorio (HU-03) no se ve afectado: `debeCambiarPin`
    // sigue expuesto en la sesion del cliente.
    expect(typeof body.cliente.debeCambiarPin).toBe("boolean");
  });

  it("ACC-05 F1: login 200 sin ninguna vigencia (0 filas)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login-cliente",
      payload: { cedula: f1SinVigenciaCedula, pin },
    });

    expect(res.statusCode).toBe(200);
    expect(parseBody(res).token).toBeTruthy();
  });

  it("ACC-05 DEC-034 intacto: el unico bloqueo de login sigue siendo INACTIVO", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login-cliente",
      payload: { cedula: inactivoCedula, pin },
    });

    expect(res.statusCode).toBe(401);
    const body = parseBody(res);
    expect(body.code).toBe("AUTH_CLIENTE_INACTIVO");
    expect(body.error).toBe("La cuenta está inactiva. Contacte con recepción.");
  });
});

// ─── INC06-ACC-07 — regresion portal con acceso (F7, HU-25) ──────────────────

describe("INC06-ACC-07 el portal con acceso se pinta completo y sin cambios", () => {
  it("ACC-07 F7: GYM ACTIVA -> sinMembresiaActiva false y campos intactos (schema G14)", async () => {
    const token = await loginCliente(f7ActivaCedula);
    const res = await consultarResumen(token);

    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.sinMembresiaActiva).toBe(false);
    expect(portalResumenResponseSchema.parse(body)).toBeTruthy();
    expect(body.estadoAccesoGym).toBe("ACTIVA");
    expect(body.fechaVencimiento).toBe(f7ActivaFin);
    expect(body.congelacion).toBeNull();
    expect(body.fechaActual).toBe(HOY);
    expect(body.cliente.cedula).toBe(f7ActivaCedula);
    expect(body.sede.id).toBe(SEDE_PRINCIPAL);
  });

  it("ACC-07 F4: CONGELADO -> sinMembresiaActiva false con el rango de pausa intacto", async () => {
    const token = await loginCliente(f4CongeladoCedula);
    const res = await consultarResumen(token);

    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.sinMembresiaActiva).toBe(false);
    expect(body.congelacion).toEqual({
      fechaInicio: dia(-1),
      fechaFin: dia(1),
    });
    expect(portalResumenResponseSchema.parse(body)).toBeTruthy();
  });
});

// ─── R1 (ratificacion, caso sustantivo) ─────────────────────────────────────

describe("R1 el estado general del cliente NO entra en sinMembresiaActiva", () => {
  it("R1 F6: SUSPENDIDO con GYM ACTIVA -> sinMembresiaActiva false (el aviso no aplica)", async () => {
    // La formula corregida por R1 evita el copy falso "No tienes una membresia
    // activa" para un cliente suspendido por ESTADO con membresia vigente.
    const token = await loginCliente(f6SuspendidoCedula);
    const res = await consultarResumen(token);

    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.sinMembresiaActiva).toBe(false);
    // El bloque GYM sigue expuesto con su estado calculado real.
    expect(body.estadoAccesoGym).toBe("ACTIVA");
    expect(portalResumenResponseSchema.parse(body)).toBeTruthy();
  });
});

// ─── R3 forma de la respuesta + R4 orden de evaluacion ───────────────────────

describe("R3/R4 forma de respuesta aditiva y orden 401 -> 403 -> 404 -> resolucion -> 200", () => {
  it("R3: sinMembresiaActiva es el UNICO campo top-level nuevo (sin accesoApp ni campos extra, R11)", async () => {
    const token = await loginCliente(f7ActivaCedula);
    const res = await consultarResumen(token);

    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    expect(typeof body.sinMembresiaActiva).toBe("boolean");
    // R3: sin objeto `accesoApp`; R11: sin campos nuevos que exponer.
    expect(body.accesoApp).toBeUndefined();
    expect(Object.keys(body).sort()).toEqual(
      [
        "cliente",
        "nombreCompleto",
        "cedula",
        "sede",
        "estadoAccesoGym",
        "fechaVencimiento",
        "congelacion",
        "fechaActual",
        "sinMembresiaActiva",
      ].sort()
    );
  });

  it("R4: sin token -> 401 AUTH_TOKEN_MISSING antes de resolver el acceso", async () => {
    const res = await consultarResumen();
    expect(res.statusCode).toBe(401);
    expect(parseBody(res).code).toBe("AUTH_TOKEN_MISSING");
  });

  it("R4: token staff -> 403 AUTH_FORBIDDEN antes de resolver el acceso", async () => {
    const conDueno = await consultarResumen(tokenOwner);
    expect(conDueno.statusCode).toBe(403);
    expect(parseBody(conDueno).code).toBe("AUTH_FORBIDDEN");

    const conRecep = await consultarResumen(tokenRecep);
    expect(conRecep.statusCode).toBe(403);
    expect(parseBody(conRecep).code).toBe("AUTH_FORBIDDEN");
  });

  it("R4: cliente inexistente -> 404 NOT_FOUND antes de resolver el acceso", async () => {
    // Token CLIENTE valido emitido antes de borrar la fila del cliente.
    const efimero = await crearCliente();
    const token = await loginCliente(efimero.cedula);
    await prisma.cliente.delete({ where: { id: efimero.id } });

    const res = await consultarResumen(token);
    expect(res.statusCode).toBe(404);
    expect(parseBody(res).code).toBe("NOT_FOUND");
  });
});
