/**
 * INC00-MEM-01, INC00-MEM-02, INC00-MEM-07 — Validacion de membresia gym (API).
 *
 * Incremento: INC-00-estabilizacion-fases-1-2 (tarea 8, modo SOLO RED).
 * Estas pruebas documentan el comportamiento esperado; si fallan, el fallo es
 * intencional (RED) y describe el criterio que falta verificar/implementar.
 *
 * Aislamiento (DEC-012/DEC-013): SQLite temporal por ejecucion + fixtures propios
 * con prefijo de cedula unico (9901...) y limpieza deterministica antes/despues.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import bcrypt from "bcryptjs";
import prisma from "../../src/lib/prisma";
import authRoutes from "../../src/routes/auth";
import membresiaRoutes from "../../src/routes/membresia";
import prismaPlugin from "../../src/plugins/prisma";
import authPlugin from "../../src/plugins/auth";

const prefix = "inc00_mem_validacion";
const cedulaPrefix = "9901";
const ownerEmail = `${prefix}_dueno@clubbeasts.test`;
const pin = "1234";

let app: any;
let token = "";
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
  await prisma.user.deleteMany({ where: { email: ownerEmail } });
  await prisma.sede.deleteMany({ where: { id: `${prefix}_sede` } });
}

/** Cliente nuevo por prueba: ninguna prueba depende del orden ni de datos de otra. */
async function crearCliente(): Promise<string> {
  clienteSeq += 1;
  const cliente = await prisma.cliente.create({
    data: {
      cedula: `${cedulaPrefix}${String(clienteSeq).padStart(6, "0")}`,
      nombres: "Cliente",
      apellidos: "Validacion Membresia",
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

async function contarPeriodos(clienteId: string) {
  return prisma.membresiaGym.count({ where: { clienteId } });
}

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? "inc00-membresia-secret";

  await cleanupFixtures();

  const hashedPassword = await bcrypt.hash("owner123", 10);
  await prisma.sede.upsert({
    where: { id: `${prefix}_sede` },
    update: { nombre: "Sede INC00 Membresia Validacion" },
    create: { id: `${prefix}_sede`, nombre: "Sede INC00 Membresia Validacion" },
  });
  await prisma.user.upsert({
    where: { email: ownerEmail },
    update: { contrasena: hashedPassword, nombre: "Dueño Membresia", rol: "DUENO" },
    create: {
      email: ownerEmail,
      contrasena: hashedPassword,
      nombre: "Dueño Membresia",
      rol: "DUENO",
    },
  });

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

// ─── INC00-MEM-01 ────────────────────────────────────────────────────────────

describe("INC00-MEM-01 crear periodo rechaza fechas invalidas y duraciones invalidas", () => {
  it("INC00-MEM-01 rechaza una fechaInicio que no existe en el calendario (2031-02-30) con 400 y no persiste la membresia", async () => {
    const clienteId = await crearCliente();

    const res = await crearPeriodo(clienteId, "2031-02-30", "2031-03-31");

    expect(res.statusCode).toBe(400);
    expect(parseBody(res).code).toBe("VALIDATION_ERROR");
    expect(await contarPeriodos(clienteId)).toBe(0);
  });

  it("INC00-MEM-01 rechaza una fechaInicio con formato distinto de YYYY-MM-DD (01/06/2031) con 400 y no persiste la membresia", async () => {
    const clienteId = await crearCliente();

    const res = await crearPeriodo(clienteId, "01/06/2031", "30/06/2031");

    expect(res.statusCode).toBe(400);
    expect(parseBody(res).code).toBe("VALIDATION_ERROR");
    expect(await contarPeriodos(clienteId)).toBe(0);
  });

  it("INC00-MEM-01 rechaza crear un periodo cuyo fechaFin es anterior a fechaInicio con 400 y no persiste la membresia", async () => {
    const clienteId = await crearCliente();

    const res = await crearPeriodo(clienteId, "2031-06-01", "2031-01-01");

    expect(res.statusCode).toBe(400);
    expect(parseBody(res).code).toBe("VALIDATION_ERROR");
    expect(parseBody(res).error).toMatch(/anterior/i);
    expect(await contarPeriodos(clienteId)).toBe(0);
  });

  it("INC00-MEM-01 rechaza crear un periodo con duracion inclusiva menor a un dia (fin 2031-06-09 < inicio 2031-06-10) con 400 y no persiste", async () => {
    // DEC-006: inicio y fin son inclusivos, por lo que la duracion minima valida
    // es 1 dia calendario (fin >= inicio). Un rango con fin < inicio dura 0 dias.
    const clienteId = await crearCliente();

    const res = await crearPeriodo(clienteId, "2031-06-10", "2031-06-09");

    expect(res.statusCode).toBe(400);
    expect(parseBody(res).code).toBe("VALIDATION_ERROR");
    expect(await contarPeriodos(clienteId)).toBe(0);
  });

  it("INC00-MEM-01 rechaza editar con fechaFin anterior al inicio persistido con 400 y conserva fechas y version originales", async () => {
    const clienteId = await crearCliente();
    const creada = await crearPeriodo(clienteId, "2031-07-01", "2031-07-31");
    expect(creada.statusCode).toBe(201);
    const membresiaId = parseBody(creada).id;

    const res = await editarPeriodo(clienteId, membresiaId, {
      fechaFin: "2031-01-01",
      version: 1,
    });

    expect(res.statusCode).toBe(400);
    expect(parseBody(res).code).toBe("VALIDATION_ERROR");

    const fila = await prisma.membresiaGym.findUnique({
      where: { id: membresiaId },
    });
    expect(fila?.fechaInicio).toBe("2031-07-01");
    expect(fila?.fechaFin).toBe("2031-07-31");
    expect(fila?.version).toBe(1);
  });

  it("INC00-MEM-01 rechaza editar con fechaInicio posterior al fin persistido con 400 y conserva fechas y version originales", async () => {
    const clienteId = await crearCliente();
    const creada = await crearPeriodo(clienteId, "2031-07-01", "2031-07-31");
    expect(creada.statusCode).toBe(201);
    const membresiaId = parseBody(creada).id;

    const res = await editarPeriodo(clienteId, membresiaId, {
      fechaInicio: "2031-12-01",
      version: 1,
    });

    expect(res.statusCode).toBe(400);
    expect(parseBody(res).code).toBe("VALIDATION_ERROR");

    const fila = await prisma.membresiaGym.findUnique({
      where: { id: membresiaId },
    });
    expect(fila?.fechaInicio).toBe("2031-07-01");
    expect(fila?.fechaFin).toBe("2031-07-31");
    expect(fila?.version).toBe(1);
  });
});

// ─── INC00-MEM-02 ────────────────────────────────────────────────────────────

describe("INC00-MEM-02 crear o editar rechaza solapamientos con 409 MEMBRESIA_SOLAPADA", () => {
  it("INC00-MEM-02 rechaza crear un periodo que solapa uno existente con 409 MEMBRESIA_SOLAPADA y deja solo el periodo original", async () => {
    const clienteId = await crearCliente();
    const original = await crearPeriodo(clienteId, "2032-01-01", "2032-01-31");
    expect(original.statusCode).toBe(201);

    const res = await crearPeriodo(clienteId, "2032-01-15", "2032-02-28");

    expect(res.statusCode).toBe(409);
    expect(parseBody(res).code).toBe("MEMBRESIA_SOLAPADA");
    expect(await contarPeriodos(clienteId)).toBe(1);

    const periodo = await prisma.membresiaGym.findFirst({
      where: { clienteId },
    });
    expect(periodo?.fechaInicio).toBe("2032-01-01");
    expect(periodo?.fechaFin).toBe("2032-01-31");
  });

  it("INC00-MEM-02 aplica extremos inclusivos: compartir el dia de borde (inicio nuevo = fin existente) tambien es solape y responde 409", async () => {
    const clienteId = await crearCliente();
    const original = await crearPeriodo(clienteId, "2032-01-01", "2032-01-31");
    expect(original.statusCode).toBe(201);

    const res = await crearPeriodo(clienteId, "2032-01-31", "2032-02-28");

    expect(res.statusCode).toBe(409);
    expect(parseBody(res).code).toBe("MEMBRESIA_SOLAPADA");
    expect(await contarPeriodos(clienteId)).toBe(1);
  });

  it("INC00-MEM-02 permite periodos adyacentes sin dia compartido (2032-02-01 arranca despues del fin 2032-01-31) con 201", async () => {
    const clienteId = await crearCliente();
    const original = await crearPeriodo(clienteId, "2032-01-01", "2032-01-31");
    expect(original.statusCode).toBe(201);

    const res = await crearPeriodo(clienteId, "2032-02-01", "2032-02-28");

    expect(res.statusCode).toBe(201);
    expect(await contarPeriodos(clienteId)).toBe(2);
  });

  it("INC00-MEM-02 rechaza editar un periodo a un rango que solapa a otro periodo del cliente con 409 MEMBRESIA_SOLAPADA y no modifica el periodo editado", async () => {
    const clienteId = await crearCliente();
    const primero = await crearPeriodo(clienteId, "2032-04-01", "2032-04-30");
    const segundo = await crearPeriodo(clienteId, "2032-06-01", "2032-06-30");
    expect(primero.statusCode).toBe(201);
    expect(segundo.statusCode).toBe(201);
    const segundoId = parseBody(segundo).id;

    const res = await editarPeriodo(clienteId, segundoId, {
      fechaInicio: "2032-04-15",
      fechaFin: "2032-05-15",
      version: 1,
    });

    expect(res.statusCode).toBe(409);
    expect(parseBody(res).code).toBe("MEMBRESIA_SOLAPADA");

    const fila = await prisma.membresiaGym.findUnique({
      where: { id: segundoId },
    });
    expect(fila?.fechaInicio).toBe("2032-06-01");
    expect(fila?.fechaFin).toBe("2032-06-30");
    expect(fila?.version).toBe(1);
  });
});

// ─── INC00-MEM-07 ────────────────────────────────────────────────────────────

describe("INC00-MEM-07 la API no permite persistir fechas vacias", () => {
  it("INC00-MEM-07 rechaza crear con fechaInicio vacia con 400 y no persiste ninguna membresia", async () => {
    const clienteId = await crearCliente();

    const res = await crearPeriodo(clienteId, "", "2031-08-31");

    expect(res.statusCode).toBe(400);
    expect(parseBody(res).code).toBe("VALIDATION_ERROR");
    expect(await contarPeriodos(clienteId)).toBe(0);
  });

  it("INC00-MEM-07 rechaza crear con fechaFin vacia con 400 y no persiste ninguna membresia", async () => {
    const clienteId = await crearCliente();

    const res = await crearPeriodo(clienteId, "2031-08-01", "");

    expect(res.statusCode).toBe(400);
    expect(parseBody(res).code).toBe("VALIDATION_ERROR");
    expect(await contarPeriodos(clienteId)).toBe(0);
  });

  it("INC00-MEM-07 rechaza editar con fechaInicio vacia con 400 y no persiste la fecha vacia en la base de datos", async () => {
    const clienteId = await crearCliente();
    const creada = await crearPeriodo(clienteId, "2031-09-01", "2031-09-30");
    expect(creada.statusCode).toBe(201);
    const membresiaId = parseBody(creada).id;

    const res = await editarPeriodo(clienteId, membresiaId, {
      fechaInicio: "",
      version: 1,
    });

    // soft: ademas del contrato HTTP, debe verse el daño en datos si persiste.
    expect.soft(res.statusCode).toBe(400);
    expect.soft(parseBody(res).code).toBe("VALIDATION_ERROR");

    const fila = await prisma.membresiaGym.findUnique({
      where: { id: membresiaId },
    });
    expect(fila?.fechaInicio).toBe("2031-09-01");
    expect(fila?.fechaFin).toBe("2031-09-30");
    expect(fila?.fechaInicio).not.toBe("");
    expect(fila?.fechaFin).not.toBe("");
    expect(fila?.version).toBe(1);
  });

  it("INC00-MEM-07 rechaza editar con ambas fechas vacias con 400 y no persiste fechas vacias", async () => {
    const clienteId = await crearCliente();
    const creada = await crearPeriodo(clienteId, "2031-10-01", "2031-10-31");
    expect(creada.statusCode).toBe(201);
    const membresiaId = parseBody(creada).id;

    const res = await editarPeriodo(clienteId, membresiaId, {
      fechaInicio: "",
      fechaFin: "",
      version: 1,
    });

    // soft: ademas del contrato HTTP, debe verse el daño en datos si persiste.
    expect.soft(res.statusCode).toBe(400);
    expect.soft(parseBody(res).code).toBe("VALIDATION_ERROR");

    const fila = await prisma.membresiaGym.findUnique({
      where: { id: membresiaId },
    });
    expect(fila?.fechaInicio).toBe("2031-10-01");
    expect(fila?.fechaFin).toBe("2031-10-31");
    expect(fila?.fechaInicio).not.toBe("");
    expect(fila?.fechaFin).not.toBe("");
    expect(fila?.version).toBe(1);
  });

  it("INC00-MEM-07 ninguna membresia de prueba queda con fechaInicio o fechaFin vacios tras los intentos de edicion", async () => {
    const clienteId = await crearCliente();
    const creada = await crearPeriodo(clienteId, "2031-11-01", "2031-11-30");
    expect(creada.statusCode).toBe(201);
    const membresiaId = parseBody(creada).id;

    const versionActual = async () =>
      (await prisma.membresiaGym.findUniqueOrThrow({ where: { id: membresiaId } }))
        .version;

    await editarPeriodo(clienteId, membresiaId, {
      fechaInicio: "",
      version: await versionActual(),
    });
    await editarPeriodo(clienteId, membresiaId, {
      fechaFin: "",
      version: await versionActual(),
    });

    const filas = await prisma.membresiaGym.findMany({
      where: { clienteId },
      select: { fechaInicio: true, fechaFin: true },
    });
    expect(filas.length).toBeGreaterThan(0);
    for (const fila of filas) {
      expect(fila.fechaInicio).not.toBe("");
      expect(fila.fechaFin).not.toBe("");
    }
  });
});
