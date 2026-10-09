/**
 * INC-01 (modo solo RED) — INC01-TRZ-01, INC01-TRZ-02 (gap G2) e INC01-FIC-02 (gap G4).
 *
 * Contrato fijado en `docs/incrementos/INC-01-cierre-gaps-bloque-1-2/spec.md`:
 *
 *  - POST /clientes y PATCH /clientes/:id exponen `creadoPorId` y
 *    `actualizadoPorId` (SOLO ids de usuarios internos) y los persisten con el
 *    id del actor autenticado. Un cliente creado sin actor no puede producir un
 *    id inventado.
 *  - PATCH /clientes/:id incrementa `updatedAt` respecto del valor previo y NO
 *    modifica `creadoPorId`.
 *  - GET /clientes/:id (ficha) incluye
 *    `membresias: [{ id, fechaInicio, fechaFin, estado }]` ordenado por
 *    `fechaInicio` descendente, con `estado` calculado por `calcularEstado`
 *    (America/Bogota, extremos inclusivos: PROGRAMADA | ACTIVA | VENCIDA).
 *  - GET /clientes (listado) NO incluye la relacion `membresias` (costo).
 *
 * Cada asercion de la respuesta de la API va acompanada de su asercion de
 * persistencia leyendo la BD directamente con Prisma (patron de los tests de
 * integracion existentes).
 *
 * Aislamiento (DEC-012/DEC-013): SQLite temporal por ejecucion con seed
 * deterministico; fixtures propios con cedula unica y limpieza antes/despues.
 * Ninguna prueba depende del orden de ejecucion.
 *
 * Estado esperado de esta corrida (RED): fallan SOLO las aserciones de la
 * RESPUESTA de `creadoPorId`/`actualizadoPorId` (selectCliente no los expone
 * hoy) y las de `membresias` en la ficha (la relacion no existe hoy). Las
 * aserciones de persistencia en BD deben pasar.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import prisma from "../../src/lib/prisma";
import authRoutes from "../../src/routes/auth";
import clienteRoutes from "../../src/routes/clientes";
import membresiaRoutes from "../../src/routes/membresia";
import prismaPlugin from "../../src/plugins/prisma";
import authPlugin from "../../src/plugins/auth";
import { createCliente } from "../../src/services/cliente.service.js";
import { getTodayBogota } from "../../src/services/membresia.service.js";

let app: any;
let duenoToken = "";
let duenoId = "";
let recepToken = "";
let recepId = "";

let secuencia = 0;
/** Ids creados por este archivo: su limpieza no toca fixtures de otros tests. */
const clientesCreados: string[] = [];

/** Cedula de 10 digitos unica dentro del archivo (prefijo 7: no choca con el seed). */
function uniqueCedula(): string {
  secuencia += 1;
  const tiempo = `${Date.now()}`.slice(-6);
  return `7${tiempo}${String(secuencia).padStart(3, "0")}`.slice(0, 10);
}

function parseBody(res: { body: string }) {
  return JSON.parse(res.body);
}

function dormir(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** `fechaISO + dias` sobre calendario UTC (sin horas, sin desfase de zona). */
function sumarDias(fechaISO: string, dias: number): string {
  const [y, m, d] = fechaISO.split("-").map(Number);
  const fecha = new Date(Date.UTC(y, m - 1, d + dias));
  const pad = (valor: number) => String(valor).padStart(2, "0");
  return `${fecha.getUTCFullYear()}-${pad(fecha.getUTCMonth() + 1)}-${pad(fecha.getUTCDate())}`;
}

async function cleanupFixtures(): Promise<void> {
  if (clientesCreados.length === 0) return;

  const membresias = await prisma.membresiaGym.findMany({
    where: { clienteId: { in: clientesCreados } },
    select: { id: true },
  });
  const membresiaIds = membresias.map((membresia) => membresia.id);

  await prisma.membresiaGymCambio.deleteMany({
    where: { membresiaId: { in: membresiaIds } },
  });
  await prisma.membresiaGym.deleteMany({ where: { id: { in: membresiaIds } } });
  await prisma.cliente.deleteMany({ where: { id: { in: clientesCreados } } });
  clientesCreados.length = 0;
}

async function loginStaff(email: string, password: string): Promise<{ token: string; id: string }> {
  const res = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email, password },
  });
  expect(res.statusCode, `POST /auth/login para ${email} devolvio ${res.statusCode}`).toBe(200);
  const body = parseBody(res);
  expect(typeof body.token).toBe("string");
  expect(typeof body.user?.id).toBe("string");
  return { token: body.token, id: body.user.id };
}

beforeAll(async () => {
  app = Fastify();
  await app.register(prismaPlugin);
  await app.register(authPlugin);
  await app.register(authRoutes);
  await app.register(clienteRoutes);
  await app.register(membresiaRoutes);
  await app.ready();

  const dueno = await loginStaff("admin@clubbeasts.com", "admin123");
  duenoToken = dueno.token;
  duenoId = dueno.id;

  const recepcionista = await loginStaff("recep@clubbeasts.com", "recep123");
  recepToken = recepcionista.token;
  recepId = recepcionista.id;

  // Los dos actores son usuarios distintos: si no, "creadoPorId no cambia"
  // no distinguiria nada.
  expect(duenoId).not.toBe(recepId);
  await cleanupFixtures();
});

afterAll(async () => {
  await app.close();
  await cleanupFixtures();
});

/** Crea un cliente via POST con el token indicado y lo registra para la limpieza. */
async function crearClienteCon(token: string): Promise<string> {
  const res = await app.inject({
    method: "POST",
    url: "/clientes",
    headers: { authorization: `Bearer ${token}` },
    payload: {
      cedula: uniqueCedula(),
      nombres: "Trazabilidad",
      apellidos: "Prueba",
      telefono: "3009999999",
      sedeId: "sede-1",
    },
  });
  expect(res.statusCode, `POST /clientes devolvio ${res.statusCode}: ${res.body}`).toBe(201);
  const body = parseBody(res);
  clientesCreados.push(body.id);
  return body.id;
}

describe("INC01-TRZ-01 trazabilidad de creacion de cliente (G2)", () => {
  it("INC01-TRZ-01 la respuesta de POST /clientes expone creadoPorId y actualizadoPorId del actor autenticado", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/clientes",
      headers: { authorization: `Bearer ${duenoToken}` },
      payload: {
        cedula: uniqueCedula(),
        nombres: "Respuesta",
        apellidos: "Trazabilidad",
        telefono: "3009999999",
        sedeId: "sede-1",
      },
    });
    expect(res.statusCode).toBe(201);
    const body = parseBody(res);
    clientesCreados.push(body.id);

    expect(body.creadoPorId).toBe(duenoId);
    expect(body.actualizadoPorId).toBe(duenoId);
  });

  it("INC01-TRZ-01 POST /clientes persiste creadoPorId y actualizadoPorId del actor en BD", async () => {
    const clienteId = await crearClienteCon(duenoToken);

    const enBD = await prisma.cliente.findUnique({
      where: { id: clienteId },
      select: { creadoPorId: true, actualizadoPorId: true },
    });

    expect(enBD).not.toBeNull();
    expect(enBD?.creadoPorId).toBe(duenoId);
    expect(enBD?.actualizadoPorId).toBe(duenoId);
  });

  it("INC01-TRZ-01 un cliente creado sin actor autenticado queda con creadoPorId null (sin id inventado)", async () => {
    // Ningun camino HTTP permite crear clientes sin actor (la ruta exige
    // DUENO/RECEPCIONISTA), por eso el caso se ejerce en el servicio: el
    // resultado es null, nunca un id fabricado.
    const cliente = await createCliente({
      cedula: uniqueCedula(),
      nombres: "Sin",
      apellidos: "Actor",
      telefono: "3009999999",
      sedeId: "sede-1",
    });
    clientesCreados.push(cliente.id);

    const enBD = await prisma.cliente.findUnique({
      where: { id: cliente.id },
      select: { creadoPorId: true, actualizadoPorId: true },
    });

    expect(enBD?.creadoPorId).toBeNull();
    expect(enBD?.actualizadoPorId).toBeNull();
  });
});

describe("INC01-TRZ-02 trazabilidad de edicion de cliente (G2)", () => {
  it("INC01-TRZ-02 la respuesta de PATCH /clientes/:id expone actualizadoPorId, creadoPorId sin cambios y updatedAt mayor", async () => {
    const clienteId = await crearClienteCon(duenoToken);
    const previo = await prisma.cliente.findUnique({
      where: { id: clienteId },
      select: { creadoPorId: true, updatedAt: true },
    });
    expect(previo).not.toBeNull();

    // Evita empate de milisegundos en el TIMESTAMP de SQLite.
    await dormir(20);

    const res = await app.inject({
      method: "PATCH",
      url: `/clientes/${clienteId}`,
      headers: { authorization: `Bearer ${recepToken}` },
      payload: { nombres: "Editado" },
    });
    expect(res.statusCode).toBe(200);
    const body = parseBody(res);

    expect(body.actualizadoPorId).toBe(recepId);
    expect(body.creadoPorId).toBe(duenoId);
    expect(new Date(body.updatedAt).getTime()).toBeGreaterThan(previo!.updatedAt.getTime());
  });

  it("INC01-TRZ-02 PATCH /clientes/:id persiste actualizadoPorId, creadoPorId intacto y updatedAt mayor en BD", async () => {
    const clienteId = await crearClienteCon(duenoToken);
    const previo = await prisma.cliente.findUnique({
      where: { id: clienteId },
      select: { creadoPorId: true, actualizadoPorId: true, updatedAt: true },
    });
    expect(previo?.creadoPorId).toBe(duenoId);

    await dormir(20);

    const res = await app.inject({
      method: "PATCH",
      url: `/clientes/${clienteId}`,
      headers: { authorization: `Bearer ${recepToken}` },
      payload: { apellidos: "Editado" },
    });
    expect(res.statusCode).toBe(200);

    const enBD = await prisma.cliente.findUnique({
      where: { id: clienteId },
      select: { creadoPorId: true, actualizadoPorId: true, updatedAt: true },
    });

    expect(enBD?.actualizadoPorId).toBe(recepId);
    expect(enBD?.creadoPorId).toBe(duenoId);
    expect(enBD!.updatedAt.getTime()).toBeGreaterThan(previo!.updatedAt.getTime());
  });
});

interface PeriodoEsperado {
  fechaInicio: string;
  fechaFin: string;
  esperado: "PROGRAMADA" | "ACTIVA" | "VENCIDA";
}

/** Cliente con 3 periodos no solapados creados via API (mismo canal que la UI). */
async function crearClienteConTresPeriodos(): Promise<{ clienteId: string; periodos: PeriodoEsperado[] }> {
  const clienteId = await crearClienteCon(duenoToken);
  const hoy = getTodayBogota();

  // Misma regla que `calcularEstado` (America/Bogota, extremos inclusivos):
  // hoy == fechaInicio == fechaFin solo puede ser ACTIVA si ambos extremos
  // cuentan.
  const periodos: PeriodoEsperado[] = [
    { fechaInicio: sumarDias(hoy, 20), fechaFin: sumarDias(hoy, 30), esperado: "PROGRAMADA" },
    { fechaInicio: hoy, fechaFin: hoy, esperado: "ACTIVA" },
    { fechaInicio: sumarDias(hoy, -40), fechaFin: sumarDias(hoy, -20), esperado: "VENCIDA" },
  ];

  for (const periodo of periodos) {
    const res = await app.inject({
      method: "POST",
      url: `/clientes/${clienteId}/membresias-gym`,
      headers: { authorization: `Bearer ${duenoToken}` },
      payload: { fechaInicio: periodo.fechaInicio, fechaFin: periodo.fechaFin },
    });
    expect(
      res.statusCode,
      `POST membresia ${periodo.fechaInicio}..${periodo.fechaFin} devolvio ${res.statusCode}: ${res.body}`
    ).toBe(201);
  }

  return { clienteId, periodos };
}

describe("INC01-FIC-02 membresias en la ficha del cliente (G4)", () => {
  it("INC01-FIC-02 GET /clientes/:id incluye membresias con periodo y estado calculado, ordenadas por fechaInicio desc", async () => {
    const { clienteId, periodos } = await crearClienteConTresPeriodos();

    const res = await app.inject({
      method: "GET",
      url: `/clientes/${clienteId}`,
      headers: { authorization: `Bearer ${duenoToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = parseBody(res);

    expect(
      body.membresias,
      "la ficha debe exponer la coleccion membresias (INC01-FIC-02)"
    ).toHaveLength(periodos.length);

    // Orden (fechaInicio desc) + periodo + estado calculado con la regla
    // America/Bogota de extremos inclusivos.
    const observadas = body.membresias.map((membresia: any) => ({
      fechaInicio: membresia.fechaInicio,
      fechaFin: membresia.fechaFin,
      estado: membresia.estado,
    }));
    expect(observadas).toEqual(
      periodos.map((periodo) => ({
        fechaInicio: periodo.fechaInicio,
        fechaFin: periodo.fechaFin,
        estado: periodo.esperado,
      }))
    );

    for (const membresia of body.membresias) {
      expect(typeof membresia.id).toBe("string");
      expect(membresia.id.length).toBeGreaterThan(0);
    }
  });

  it("INC01-FIC-02 GET /clientes (listado) no incluye la relacion membresias", async () => {
    const clienteId = await crearClienteCon(duenoToken);
    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
      select: { cedula: true },
    });
    expect(cliente).not.toBeNull();

    const res = await app.inject({
      method: "GET",
      url: `/clientes?search=${cliente!.cedula}`,
      headers: { authorization: `Bearer ${duenoToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = parseBody(res);

    const ids = body.clientes.map((item: any) => item.id);
    expect(ids).toContain(clienteId);
    for (const item of body.clientes) {
      expect(Object.keys(item)).not.toContain("membresias");
    }
  });
});
