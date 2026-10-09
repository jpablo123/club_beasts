/**
 * INC00-MEM-04 — Auditoria de membresia gym dentro de la misma transaccion.
 *
 * Incremento: INC-00-estabilizacion-fases-1-2 (tarea 8, modo SOLO RED).
 *
 * Cubre: actor, accion, version, fechas anteriores/nuevas y atomicidad
 * (si la fila de auditoria no puede escribirse, el cambio de la membresia no
 * debe persistir). La atomicidad se fuerza de forma determinista envenenando la
 * restriccion unique (membresiaId, version) de MembresiaGymCambio; no se usan
 * sleeps ni carreras.
 *
 * Aislamiento (DEC-013): fixtures propios con prefijo de cedula unico (9903...).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import bcrypt from "bcryptjs";
import prisma from "../../src/lib/prisma";
import authRoutes from "../../src/routes/auth";
import membresiaRoutes from "../../src/routes/membresia";
import prismaPlugin from "../../src/plugins/prisma";
import authPlugin from "../../src/plugins/auth";

const prefix = "inc00_mem_auditoria";
const cedulaPrefix = "9903";
const ownerEmail = `${prefix}_dueno@clubbeasts.test`;
const otherEmail = `${prefix}_recep@clubbeasts.test`;
const pin = "1234";

let app: any;
let token = "";
let ownerUserId = "";
let otherUserId = "";
let clienteSeq = 0;

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
  await prisma.user.deleteMany({
    where: { email: { in: [ownerEmail, otherEmail] } },
  });
  await prisma.sede.deleteMany({ where: { id: `${prefix}_sede` } });
}

async function crearCliente(): Promise<string> {
  clienteSeq += 1;
  const cliente = await prisma.cliente.create({
    data: {
      cedula: `${cedulaPrefix}${String(clienteSeq).padStart(6, "0")}`,
      nombres: "Cliente",
      apellidos: "Auditoria Membresia",
      telefono: "3000000000",
      sedeId: `${prefix}_sede`,
      pin: await bcrypt.hash(pin, 4),
      estado: "ACTIVO",
    },
  });
  return cliente.id;
}

function headers() {
  return { authorization: `Bearer ${token}` };
}

async function crearPeriodo(
  clienteId: string,
  fechaInicio: string,
  fechaFin: string
) {
  return app.inject({
    method: "POST",
    url: `/clientes/${clienteId}/membresias-gym`,
    headers: headers(),
    payload: { fechaInicio, fechaFin },
  });
}

async function editarPeriodo(
  clienteId: string,
  membresiaId: string,
  payload: Record<string, unknown>
) {
  return app.inject({
    method: "PATCH",
    url: `/clientes/${clienteId}/membresias-gym/${membresiaId}`,
    headers: headers(),
    payload,
  });
}

async function listarPeriodos(clienteId: string) {
  const res = await app.inject({
    method: "GET",
    url: `/clientes/${clienteId}/membresias-gym`,
    headers: headers(),
  });
  expect(res.statusCode).toBe(200);
  return parseBody(res);
}

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? "inc00-membresia-secret";

  await cleanupFixtures();

  const [hashedOwner, hashedOther] = await Promise.all([
    bcrypt.hash("owner123", 10),
    bcrypt.hash("recep123", 10),
  ]);
  await prisma.sede.upsert({
    where: { id: `${prefix}_sede` },
    update: { nombre: "Sede INC00 Auditoria" },
    create: { id: `${prefix}_sede`, nombre: "Sede INC00 Auditoria" },
  });
  const owner = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: { contrasena: hashedOwner, nombre: "Dueño Auditoria", rol: "DUENO" },
    create: {
      email: ownerEmail,
      contrasena: hashedOwner,
      nombre: "Dueño Auditoria",
      rol: "DUENO",
    },
  });
  const other = await prisma.user.upsert({
    where: { email: otherEmail },
    update: { contrasena: hashedOther, nombre: "Recepcion Auditoria", rol: "RECEPCIONISTA" },
    create: {
      email: otherEmail,
      contrasena: hashedOther,
      nombre: "Recepcion Auditoria",
      rol: "RECEPCIONISTA",
    },
  });
  ownerUserId = owner.id;
  otherUserId = other.id;

  app = Fastify();
  await app.register(prismaPlugin);
  await app.register(authPlugin);
  await app.register(authRoutes);
  await app.register(membresiaRoutes);
  await app.ready();

  const login = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email: ownerEmail, password: "owner123" },
  });
  expect(login.statusCode).toBe(200);
  token = parseBody(login).token;
});

afterAll(async () => {
  await app.close();
  await cleanupFixtures();
});

describe("INC00-MEM-04 la auditoria registra actor, accion, version y fechas anteriores/nuevas", () => {
  it("INC00-MEM-04 la creacion deja exactamente una fila de auditoria con actor, accion CREACION, version 1, fechas nuevas y sin fechas anteriores", async () => {
    const clienteId = await crearCliente();

    const creada = await crearPeriodo(clienteId, "2034-01-01", "2034-01-31");
    expect(creada.statusCode).toBe(201);
    const membresiaId = parseBody(creada).id;

    const cambios = await prisma.membresiaGymCambio.findMany({
      where: { membresiaId },
    });
    expect(cambios).toHaveLength(1);
    expect(cambios[0].accion).toBe("CREACION");
    expect(cambios[0].version).toBe(1);
    expect(cambios[0].actorId).toBe(ownerUserId);
    expect(cambios[0].fechaInicioAnterior).toBeNull();
    expect(cambios[0].fechaFinAnterior).toBeNull();
    expect(cambios[0].fechaInicioNueva).toBe("2034-01-01");
    expect(cambios[0].fechaFinNueva).toBe("2034-01-31");
  });

  it("INC00-MEM-04 la edicion deja una fila de auditoria con actor, accion EDICION, version incrementada y fechas anteriores y nuevas", async () => {
    const clienteId = await crearCliente();
    const creada = await crearPeriodo(clienteId, "2034-02-01", "2034-02-28");
    expect(creada.statusCode).toBe(201);
    const membresiaId = parseBody(creada).id;

    const editada = await editarPeriodo(clienteId, membresiaId, {
      fechaInicio: "2034-03-01",
      fechaFin: "2034-03-31",
      version: 1,
    });
    expect(editada.statusCode).toBe(200);
    expect(parseBody(editada).version).toBe(2);

    const cambios = await prisma.membresiaGymCambio.findMany({
      where: { membresiaId },
      orderBy: { version: "asc" },
    });
    expect(cambios).toHaveLength(2);

    const edicion = cambios.find((cambio) => cambio.accion === "EDICION");
    expect(edicion).toBeDefined();
    expect(edicion?.version).toBe(2);
    expect(edicion?.actorId).toBe(ownerUserId);
    expect(edicion?.fechaInicioAnterior).toBe("2034-02-01");
    expect(edicion?.fechaFinAnterior).toBe("2034-02-28");
    expect(edicion?.fechaInicioNueva).toBe("2034-03-01");
    expect(edicion?.fechaFinNueva).toBe("2034-03-31");
  });

  it("INC00-MEM-04 la auditoria refleja al usuario autenticado que realizo el cambio (no a un actor fijo)", async () => {
    const clienteId = await crearCliente();
    const creada = await crearPeriodo(clienteId, "2034-04-01", "2034-04-30");
    expect(creada.statusCode).toBe(201);
    const membresiaId = parseBody(creada).id;

    const listada = await listarPeriodos(clienteId);
    expect(listada.membresias).toHaveLength(1);
    const dto = listada.membresias[0];

    expect(dto.creadoPor.id).toBe(ownerUserId);
    expect(dto.actualizadoPor.id).toBe(ownerUserId);
    expect(dto.cambios).toHaveLength(1);
    expect(dto.cambios[0].actor.id).toBe(ownerUserId);
    expect(dto.cambios[0].accion).toBe("CREACION");
    expect(dto.cambios[0].version).toBe(1);
  });
});

describe("INC00-MEM-04 la auditoria se escribe dentro de la misma transaccion que el cambio", () => {
  it("INC00-MEM-04 si la fila de auditoria no puede escribirse, la edicion no queda persistida (rollback completo)", async () => {
    const clienteId = await crearCliente();
    const creada = await crearPeriodo(clienteId, "2034-05-01", "2034-05-31");
    expect(creada.statusCode).toBe(201);
    const membresiaId = parseBody(creada).id;

    // Restriccion unique (membresiaId, version) envenenada para la version 2:
    // la escritura de auditoria de la edicion fallara dentro de la transaccion.
    await prisma.membresiaGymCambio.create({
      data: {
        membresiaId,
        actorId: otherUserId,
        accion: "EDICION",
        version: 2,
        fechaInicioAnterior: "2034-05-01",
        fechaFinAnterior: "2034-05-31",
        fechaInicioNueva: "2034-06-01",
        fechaFinNueva: "2034-06-30",
      },
    });
    const cambiosAntes = await prisma.membresiaGymCambio.count({
      where: { membresiaId },
    });
    expect(cambiosAntes).toBe(2);

    const res = await editarPeriodo(clienteId, membresiaId, {
      fechaInicio: "2034-07-01",
      fechaFin: "2034-07-31",
      version: 1,
    });

    // La edicion no fue aceptada y, sobre todo, no dejo un cambio a medias.
    expect(res.statusCode).not.toBe(200);

    const fila = await prisma.membresiaGym.findUnique({
      where: { id: membresiaId },
    });
    expect(fila?.fechaInicio).toBe("2034-05-01");
    expect(fila?.fechaFin).toBe("2034-05-31");
    expect(fila?.version).toBe(1);

    const cambiosDespues = await prisma.membresiaGymCambio.findMany({
      where: { membresiaId },
    });
    expect(cambiosDespues).toHaveLength(cambiosAntes);
    expect(
      cambiosDespues.some(
        (cambio) =>
          cambio.accion === "EDICION" && cambio.actorId === ownerUserId
      )
    ).toBe(false);
  });

  it("INC00-MEM-04 la creacion no deja membresia sin su fila de auditoria asociada", async () => {
    const clienteId = await crearCliente();

    const creada = await crearPeriodo(clienteId, "2034-08-01", "2034-08-31");
    expect(creada.statusCode).toBe(201);
    const membresiaId = parseBody(creada).id;

    const filas = await prisma.membresiaGym.findMany({
      where: { clienteId },
      include: { cambios: true },
    });
    expect(filas).toHaveLength(1);
    expect(filas[0].id).toBe(membresiaId);
    expect(filas[0].cambios).toHaveLength(1);
    expect(filas[0].cambios[0].accion).toBe("CREACION");
    expect(filas[0].cambios[0].actorId).toBe(ownerUserId);
  });
});
