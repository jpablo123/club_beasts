/**
 * INC00-MEM-05 (estado con America/Bogota y extremos inclusivos) e
 * INC00-MEM-06 (preset de 30 dias inclusivos) — membresia gym.
 *
 * Incremento: INC-00-estabilizacion-fases-1-2 (tarea 8, modo SOLO RED).
 *
 * Estrategia de zona horaria (DEC-006: inicio y fin inclusivos): se fija el reloj
 * a 2026-12-12T02:00:00Z, donde la fecha UTC es 2026-12-12 y la fecha en
 * America/Bogota (UTC-5) es 2026-12-11. Cualquier estado calculado con la fecha
 * UTC daria un resultado distinto al esperado, por lo que las aserciones
 * demuestran el uso de America/Bogota y la inclusividad de los extremos.
 * Solo se fija el reloj Date (sin sleeps ni carreras): es determinista.
 *
 * Aislamiento (DEC-013): fixtures propios con prefijo de cedula unico (9904...).
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import Fastify from "fastify";
import bcrypt from "bcryptjs";
import prisma from "../../src/lib/prisma";
import authRoutes from "../../src/routes/auth";
import membresiaRoutes from "../../src/routes/membresia";
import prismaPlugin from "../../src/plugins/prisma";
import authPlugin from "../../src/plugins/auth";

const prefix = "inc00_mem_estado";
const cedulaPrefix = "9904";
const ownerEmail = `${prefix}_dueno@clubbeasts.test`;
const pin = "1234";

/** 02:00 UTC del 2026-12-12 = 21:00 del 2026-12-11 en America/Bogota. */
const INSTANTE_BOGOTA = "2026-12-12T02:00:00Z";
const HOY_BOGOTA = "2026-12-11";
const LOGIN_RELOJ_FALSO = "2026-12-11T12:00:00Z";

let app: any;
let tokenReal = "";
let tokenBogota = "";
let clienteSeq = 0;

// ids de los clientes y periodos creados como fixtures
let clienteConVencida = "";
let clienteInicioHoy = "";
let clienteProgramada = "";
let clienteSinMembresias = "";
let vencidaId = "";
let finHoyId = "";
let inicioHoyId = "";
let programadaId = "";

function parseBody(res: { body: string }) {
  return JSON.parse(res.body);
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
  await prisma.user.deleteMany({ where: { email: ownerEmail } });
  await prisma.sede.deleteMany({ where: { id: `${prefix}_sede` } });
}

async function crearCliente(): Promise<string> {
  clienteSeq += 1;
  const cliente = await prisma.cliente.create({
    data: {
      cedula: `${cedulaPrefix}${String(clienteSeq).padStart(6, "0")}`,
      nombres: "Cliente",
      apellidos: "Estado Membresia",
      telefono: "3000000000",
      sedeId: `${prefix}_sede`,
      pin: await bcrypt.hash(pin, 4),
      estado: "ACTIVO",
    },
  });
  return cliente.id;
}

async function login(): Promise<string> {
  const res = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email: ownerEmail, password: "owner123" },
  });
  expect(res.statusCode).toBe(200);
  return parseBody(res).token;
}

function headers(token: string) {
  return { authorization: `Bearer ${token}` };
}

async function crearPeriodo(
  clienteId: string,
  fechaInicio: string,
  fechaFin: string,
  token: string
) {
  return app.inject({
    method: "POST",
    url: `/clientes/${clienteId}/membresias-gym`,
    headers: headers(token),
    payload: { fechaInicio, fechaFin },
  });
}

async function listarPeriodos(clienteId: string, token: string) {
  const res = await app.inject({
    method: "GET",
    url: `/clientes/${clienteId}/membresias-gym`,
    headers: headers(token),
  });
  expect(res.statusCode).toBe(200);
  return parseBody(res);
}

function diasInclusivos(fechaInicio: string, fechaFin: string): number {
  const [y1, m1, d1] = fechaInicio.split("-").map(Number);
  const [y2, m2, d2] = fechaFin.split("-").map(Number);
  const diferenciaMs =
    Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1);
  return Math.round(diferenciaMs / 86_400_000) + 1;
}

/** Fija el reloj Date (solo Date) mientras corre la funcion y lo restaura. */
async function conReloj(iso: string, fn: () => Promise<void>) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(iso));
  try {
    await fn();
  } finally {
    vi.useRealTimers();
  }
}

/** Emite un token con el reloj fijado, para poder verificarlo dentro de la ventana fake. */
async function loginConReloj(iso: string): Promise<string> {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(iso));
  try {
    return await login();
  } finally {
    vi.useRealTimers();
  }
}

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? "inc00-membresia-secret";

  await cleanupFixtures();

  const hashedPassword = await bcrypt.hash("owner123", 10);
  await prisma.sede.upsert({
    where: { id: `${prefix}_sede` },
    update: { nombre: "Sede INC00 Estado" },
    create: { id: `${prefix}_sede`, nombre: "Sede INC00 Estado" },
  });
  await prisma.user.upsert({
    where: { email: ownerEmail },
    update: { contrasena: hashedPassword, nombre: "Dueño Estado", rol: "DUENO" },
    create: {
      email: ownerEmail,
      contrasena: hashedPassword,
      nombre: "Dueño Estado",
      rol: "DUENO",
    },
  });

  app = Fastify();
  await app.register(prismaPlugin);
  await app.register(authPlugin);
  await app.register(authRoutes);
  await app.register(membresiaRoutes);
  await app.ready();

  tokenReal = await login();

  // Fixtures: cuatro clientes con situaciones distintas de estado.
  clienteConVencida = await crearCliente();

  const vencida = await crearPeriodo(
    clienteConVencida,
    "2026-11-01",
    "2026-11-30",
    tokenReal
  );
  expect(vencida.statusCode).toBe(201);
  vencidaId = parseBody(vencida).id;

  const finHoy = await crearPeriodo(
    clienteConVencida,
    "2026-12-01",
    HOY_BOGOTA,
    tokenReal
  );
  expect(finHoy.statusCode).toBe(201);
  finHoyId = parseBody(finHoy).id;

  clienteInicioHoy = await crearCliente();
  const inicioHoy = await crearPeriodo(
    clienteInicioHoy,
    HOY_BOGOTA,
    "2026-12-20",
    tokenReal
  );
  expect(inicioHoy.statusCode).toBe(201);
  inicioHoyId = parseBody(inicioHoy).id;

  clienteProgramada = await crearCliente();
  const programada = await crearPeriodo(
    clienteProgramada,
    "2026-12-12",
    "2026-12-31",
    tokenReal
  );
  expect(programada.statusCode).toBe(201);
  programadaId = parseBody(programada).id;

  clienteSinMembresias = await crearCliente();

  // Token emitido con el reloj fijado: se verifica dentro de las ventanas fakes.
  tokenBogota = await loginConReloj(LOGIN_RELOJ_FALSO);
});

afterAll(async () => {
  vi.useRealTimers();
  await app.close();
  await cleanupFixtures();
});

// ─── INC00-MEM-05 ────────────────────────────────────────────────────────────

describe("INC00-MEM-05 estado calculado con America/Bogota y extremos inclusivos", () => {
  it("INC00-MEM-05 un cliente sin membresias responde lista vacia: estado sin membresia", async () => {
    const body = await listarPeriodos(clienteSinMembresias, tokenReal);

    expect(body.membresias).toHaveLength(0);
    expect(body.fechaActual).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("INC00-MEM-05 fechaActual usa America/Bogota: 2026-12-12T02:00Z es 2026-12-11 en Bogota", async () => {
    await conReloj(INSTANTE_BOGOTA, async () => {
      const body = await listarPeriodos(clienteSinMembresias, tokenBogota);
      expect(body.fechaActual).toBe(HOY_BOGOTA);
    });
  });

  it("INC00-MEM-05 estado VENCIDA cuando hoy en Bogota es posterior a fechaFin", async () => {
    await conReloj(INSTANTE_BOGOTA, async () => {
      const body = await listarPeriodos(clienteConVencida, tokenBogota);
      const periodo = body.membresias.find(
        (membresia: { id: string }) => membresia.id === vencidaId
      );
      expect(periodo).toBeDefined();
      expect(periodo.fechaInicio).toBe("2026-11-01");
      expect(periodo.fechaFin).toBe("2026-11-30");
      expect(periodo.estado).toBe("VENCIDA");
    });
  });

  it("INC00-MEM-05 extremo fin inclusivo: hoy igual a fechaFin sigue ACTIVA (con fecha UTC del dia siguiente estaria VENCIDA)", async () => {
    await conReloj(INSTANTE_BOGOTA, async () => {
      const body = await listarPeriodos(clienteConVencida, tokenBogota);
      const periodo = body.membresias.find(
        (membresia: { id: string }) => membresia.id === finHoyId
      );
      expect(periodo).toBeDefined();
      expect(periodo.fechaInicio).toBe("2026-12-01");
      expect(periodo.fechaFin).toBe(HOY_BOGOTA);
      expect(periodo.estado).toBe("ACTIVA");
    });
  });

  it("INC00-MEM-05 extremo inicio inclusivo: hoy igual a fechaInicio esta ACTIVA", async () => {
    await conReloj(INSTANTE_BOGOTA, async () => {
      const body = await listarPeriodos(clienteInicioHoy, tokenBogota);
      const periodo = body.membresias.find(
        (membresia: { id: string }) => membresia.id === inicioHoyId
      );
      expect(periodo).toBeDefined();
      expect(periodo.fechaInicio).toBe(HOY_BOGOTA);
      expect(periodo.fechaFin).toBe("2026-12-20");
      expect(periodo.estado).toBe("ACTIVA");
    });
  });

  it("INC00-MEM-05 estado PROGRAMADA cuando hoy en Bogota es anterior a fechaInicio aunque en UTC ya inicio", async () => {
    await conReloj(INSTANTE_BOGOTA, async () => {
      const body = await listarPeriodos(clienteProgramada, tokenBogota);
      const periodo = body.membresias.find(
        (membresia: { id: string }) => membresia.id === programadaId
      );
      expect(periodo).toBeDefined();
      expect(periodo.fechaInicio).toBe("2026-12-12");
      expect(periodo.estado).toBe("PROGRAMADA");
    });
  });
});

// ─── INC00-MEM-06 ────────────────────────────────────────────────────────────

describe("INC00-MEM-06 preset de 30 dias inclusivos", () => {
  it("INC00-MEM-06 un preset de 30 dias produce exactamente 30 dias calendario inclusivos (fin = inicio + 29 dias)", async () => {
    const clienteId = await crearCliente();

    const creada = await crearPeriodo(
      clienteId,
      "2031-05-01",
      "2031-05-30",
      tokenReal
    );
    expect(creada.statusCode).toBe(201);

    const body = await listarPeriodos(clienteId, tokenReal);
    expect(body.membresias).toHaveLength(1);

    const periodo = body.membresias[0];
    expect(periodo.fechaInicio).toBe("2031-05-01");
    expect(periodo.fechaFin).toBe("2031-05-30");
    expect(diasInclusivos(periodo.fechaInicio, periodo.fechaFin)).toBe(30);
  });
});
