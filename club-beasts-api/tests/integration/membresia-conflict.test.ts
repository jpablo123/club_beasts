/**
 * INC00-MEM-03 (+ riesgos GAP-006 de concurrencia) — Conflictos de version y
 * solapamiento concurrente en membresia gym.
 *
 * Incremento: INC-00-estabilizacion-fases-1-2 (tarea 8, modo SOLO RED).
 *
 * Estrategia de concurrencia con SQLite (DEC-012): el motor de pruebas no permite
 * carreras reales fiables, asi que la concurrencia se simula de forma DETERMINISTA
 * en dos niveles, sin sleeps ni esperas:
 *
 *  1) Secuencial: dos escrituras con la MISMA version (la segunda con version
 *     obsoleta). Debe quedar exactamente una persistida y la otra 409.
 *  2) Interleaving inyectado: otro cambio se compromete en la ventana entre la
 *     verificacion de version/solape y la escritura. Se inyecta interceptando el
 *     inicio de la transaccion de negocio y ejecutando ahi el cambio competidor,
 *     lo que fija el orden de eventos de forma determinista.
 *
 * Aislamiento (DEC-013): fixtures propios con prefijo de cedula unico (9902...).
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import Fastify from "fastify";
import bcrypt from "bcryptjs";
import prisma from "../../src/lib/prisma";
import authRoutes from "../../src/routes/auth";
import membresiaRoutes from "../../src/routes/membresia";
import prismaPlugin from "../../src/plugins/prisma";
import authPlugin from "../../src/plugins/auth";

const prefix = "inc00_mem_conflicto";
const cedulaPrefix = "9902";
const ownerEmail = `${prefix}_dueno@clubbeasts.test`;
const otherEmail = `${prefix}_recep@clubbeasts.test`;
const pin = "1234";

let app: any;
let token = "";
let ownerUserId = "";
let otherUserId = "";
let clienteSeq = 0;

/**
 * Interleaving programado: se ejecuta exactamente una vez, al inicio de la
 * siguiente transaccion de negocio, y despues se limpia. Permite fijar el orden
 * "verificacion -> cambio competidor -> escritura" sin sleeps ni carreras.
 */
let interleavingPendiente: (() => Promise<void>) | null = null;
let interleavingsInyectados = 0;

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
      apellidos: "Conflicto Membresia",
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

/**
 * Cambio competidor que "gana la carrera": escribe directamente en la BD lo que
 * otro usuario habria persistido (update + fila de auditoria), como lo haria el
 * servicio cuando su transaccion se compromete primero.
 */
async function comprometerEdicion(
  membresiaId: string,
  actorId: string,
  fechaInicio: string,
  fechaFin: string
) {
  const actual = await prisma.membresiaGym.findUniqueOrThrow({
    where: { id: membresiaId },
  });
  const nuevaVersion = actual.version + 1;

  await prisma.membresiaGym.update({
    where: { id: membresiaId },
    data: {
      fechaInicio,
      fechaFin,
      version: nuevaVersion,
      actualizadoPorId: actorId,
    },
  });
  await prisma.membresiaGymCambio.create({
    data: {
      membresiaId,
      actorId,
      accion: "EDICION",
      version: nuevaVersion,
      fechaInicioAnterior: actual.fechaInicio,
      fechaFinAnterior: actual.fechaFin,
      fechaInicioNueva: fechaInicio,
      fechaFinNueva: fechaFin,
    },
  });
  return nuevaVersion;
}

async function comprometerCreacion(
  clienteId: string,
  actorId: string,
  fechaInicio: string,
  fechaFin: string
) {
  const creada = await prisma.membresiaGym.create({
    data: {
      clienteId,
      fechaInicio,
      fechaFin,
      creadoPorId: actorId,
      actualizadoPorId: actorId,
      version: 1,
    },
  });
  await prisma.membresiaGymCambio.create({
    data: {
      membresiaId: creada.id,
      actorId,
      accion: "CREACION",
      version: 1,
      fechaInicioNueva: fechaInicio,
      fechaFinNueva: fechaFin,
    },
  });
  return creada.id;
}

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? "inc00-membresia-secret";

  await cleanupFixtures();

  // Punto de inyeccion unico y determinista para toda la suite: se instala una
  // sola vez y NO se restaura, porque restaurar el spy sobre el cliente Prisma
  // deja prisma.$transaction inutilizable. El wrapper es identidad mientras no
  // haya interleaving programado.
  const transaccionOriginal = (prisma as any).$transaction.bind(prisma);
  vi.spyOn(prisma as any, "$transaction").mockImplementation(
    async (fn: any, opts?: any) => {
      if (interleavingPendiente) {
        const ejecutar = interleavingPendiente;
        interleavingPendiente = null;
        interleavingsInyectados += 1;
        await ejecutar();
      }
      return transaccionOriginal(fn, opts);
    }
  );

  const [hashedOwner, hashedOther] = await Promise.all([
    bcrypt.hash("owner123", 10),
    bcrypt.hash("recep123", 10),
  ]);
  await prisma.sede.upsert({
    where: { id: `${prefix}_sede` },
    update: { nombre: "Sede INC00 Conflicto" },
    create: { id: `${prefix}_sede`, nombre: "Sede INC00 Conflicto" },
  });
  const owner = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: { contrasena: hashedOwner, nombre: "Dueño Conflicto", rol: "DUENO" },
    create: {
      email: ownerEmail,
      contrasena: hashedOwner,
      nombre: "Dueño Conflicto",
      rol: "DUENO",
    },
  });
  const other = await prisma.user.upsert({
    where: { email: otherEmail },
    update: { contrasena: hashedOther, nombre: "Recepcion Conflicto", rol: "RECEPCIONISTA" },
    create: {
      email: otherEmail,
      contrasena: hashedOther,
      nombre: "Recepcion Conflicto",
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

// ─── INC00-MEM-03 (secuencial, DEC-012) ──────────────────────────────────────

describe("INC00-MEM-03 dos cambios sobre la misma version dejan exactamente uno persistido", () => {
  it("INC00-MEM-03 el segundo cambio con version obsoleta recibe 409 MEMBRESIA_CONFLICTO y solo el primer cambio queda persistido", async () => {
    const clienteId = await crearCliente();
    const creada = await crearPeriodo(clienteId, "2033-01-01", "2033-01-31");
    expect(creada.statusCode).toBe(201);
    const membresiaId = parseBody(creada).id;

    // Ambos cambios parten de la version 1 leida antes de escribir.
    const primero = await editarPeriodo(clienteId, membresiaId, {
      fechaInicio: "2033-02-01",
      fechaFin: "2033-02-28",
      version: 1,
    });
    expect(primero.statusCode).toBe(200);
    expect(parseBody(primero).version).toBe(2);

    const segundo = await editarPeriodo(clienteId, membresiaId, {
      fechaInicio: "2033-03-01",
      fechaFin: "2033-03-31",
      version: 1,
    });
    expect(segundo.statusCode).toBe(409);
    expect(parseBody(segundo).code).toBe("MEMBRESIA_CONFLICTO");

    // Exactamente uno persistido: manda el primer cambio, el segundo no toca nada.
    const fila = await prisma.membresiaGym.findUnique({
      where: { id: membresiaId },
    });
    expect(fila?.fechaInicio).toBe("2033-02-01");
    expect(fila?.fechaFin).toBe("2033-02-28");
    expect(fila?.version).toBe(2);

    const cambios = await prisma.membresiaGymCambio.findMany({
      where: { membresiaId },
      orderBy: { version: "asc" },
    });
    expect(cambios).toHaveLength(2);
    expect(cambios.filter((cambio) => cambio.accion === "EDICION")).toHaveLength(1);
    expect(cambios[1].fechaInicioNueva).toBe("2033-02-01");
    expect(cambios[1].fechaFinNueva).toBe("2033-02-28");
  });

  it("INC00-MEM-03 cada cambio aceptado incrementa la version en exactamente uno", async () => {
    const clienteId = await crearCliente();
    const creada = await crearPeriodo(clienteId, "2033-04-01", "2033-04-30");
    expect(creada.statusCode).toBe(201);
    const membresiaId = parseBody(creada).id;
    expect(parseBody(creada).version).toBe(1);

    const editada = await editarPeriodo(clienteId, membresiaId, {
      fechaInicio: "2033-05-01",
      fechaFin: "2033-05-31",
      version: 1,
    });
    expect(editada.statusCode).toBe(200);
    expect(parseBody(editada).version).toBe(2);

    const fila = await prisma.membresiaGym.findUnique({
      where: { id: membresiaId },
    });
    expect(fila?.version).toBe(2);
  });
});

// ─── INC00-MEM-03 (interleaving determinista, GAP-006) ───────────────────────

describe("INC00-MEM-03 verificacion de version atomica frente a un cambio comprometido en paralelo", () => {
  it("INC00-MEM-03 un cambio cuya version quedo obsoleta porque otro cambio se comprometio primero recibe 409 MEMBRESIA_CONFLICTO y no pisa el cambio ganador", async () => {
    const clienteId = await crearCliente();
    const creada = await crearPeriodo(clienteId, "2033-06-01", "2033-06-30");
    expect(creada.statusCode).toBe(201);
    const membresiaId = parseBody(creada).id;

    // Orden determinista de eventos:
    // 1) el cambio bajo prueba lee la version 1,
    // 2) el competidor se compromete (version 2),
    // 3) el cambio bajo prueba escribe con la version 1 que ya lee.
    const inyectadosAntes = interleavingsInyectados;
    interleavingPendiente = () =>
      comprometerEdicion(membresiaId, otherUserId, "2033-06-15", "2033-07-15");

    try {
      const res = await editarPeriodo(clienteId, membresiaId, {
        fechaInicio: "2033-08-01",
        fechaFin: "2033-08-31",
        version: 1,
      });

      // Si el interleaving no llego a inyectarse, el resultado no es utilizable.
      expect(interleavingsInyectados).toBe(inyectadosAntes + 1);

      // Contrato: el perdedor de la carrera recibe 409 MEMBRESIA_CONFLICTO.
      // soft: el fallo de integridad de datos de abajo tambien debe reportarse.
      expect.soft(res.statusCode).toBe(409);
      expect.soft(parseBody(res).code).toBe("MEMBRESIA_CONFLICTO");

      // Exactamente uno persistido: el cambio que se comprometio primero.
      const fila = await prisma.membresiaGym.findUnique({
        where: { id: membresiaId },
      });
      expect(fila?.fechaInicio).toBe("2033-06-15");
      expect(fila?.fechaFin).toBe("2033-07-15");
      expect(fila?.version).toBe(2);

      const cambios = await prisma.membresiaGymCambio.findMany({
        where: { membresiaId },
        orderBy: { version: "asc" },
      });
      expect(cambios).toHaveLength(2);
      expect(
        cambios.some(
          (cambio) =>
            cambio.accion === "EDICION" && cambio.actorId === ownerUserId
        )
      ).toBe(false);
      expect(
        cambios.some(
          (cambio) =>
            cambio.accion === "EDICION" && cambio.actorId === otherUserId
        )
      ).toBe(true);
    } finally {
      interleavingPendiente = null;
    }
  });
});

// ─── INC00-MEM-02 (interleaving determinista, GAP-006) ───────────────────────

describe("INC00-MEM-02 verificacion de solapamiento frente a una creacion comprometida en paralelo", () => {
  it("INC00-MEM-02 una creacion que solapa un periodo comprometido despues de la verificacion recibe 409 MEMBRESIA_SOLAPADA y no persiste el solape", async () => {
    const clienteId = await crearCliente();

    // Orden determinista de eventos:
    // 1) la creacion bajo prueba verifica que no hay solape (BD aun sin el
    //    periodo del competidor),
    // 2) el competidor se compromete en el mismo hueco,
    // 3) la creacion bajo prueba escribe igualmente.
    const inyectadosAntes = interleavingsInyectados;
    interleavingPendiente = () =>
      comprometerCreacion(clienteId, otherUserId, "2033-09-10", "2033-09-30");

    try {
      const res = await crearPeriodo(clienteId, "2033-09-20", "2033-10-20");

      expect(interleavingsInyectados).toBe(inyectadosAntes + 1);

      // soft: el solape persistido de abajo tambien debe reportarse.
      expect.soft(res.statusCode).toBe(409);
      expect.soft(parseBody(res).code).toBe("MEMBRESIA_SOLAPADA");

      // Exactamente uno persistido: solo el periodo que se comprometio primero.
      const filas = await prisma.membresiaGym.findMany({
        where: { clienteId },
        orderBy: { fechaInicio: "asc" },
      });
      expect(filas).toHaveLength(1);
      expect(filas[0].fechaInicio).toBe("2033-09-10");
      expect(filas[0].fechaFin).toBe("2033-09-30");
    } finally {
      interleavingPendiente = null;
    }
  });
});
