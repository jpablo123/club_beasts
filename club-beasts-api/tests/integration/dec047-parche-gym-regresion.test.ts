/**
 * INC05-R11 — Regresion de **DEC-047 en el `PATCH` de gym** (integracion API).
 *
 * Incremento: INC-05-servicios-personalizado-nutricion. Cierra el hallazgo
 * bloqueante **H-01** de la revision (`code-reviewer`, seccion 5.1 de
 * `docs/incrementos/INC-05-servicios-personalizado-nutricion/evidencia.md`):
 * `calcularFechasEdicion` (DEC-047) es nuevo en este incremento y
 * `editarMembresia` lo aplica en `membresia.service.ts:593`, pero el
 * comportamiento del `PATCH` de gym **no tenia prueba explicita** — los tests
 * DEC-047 existentes (`hu13`/`hu14`) ejercitan solo rutas nuevas, y
 * `membresia-validacion.test.ts:220-240` / `vencimiento.test.ts:352-381`
 * solo asertan `status`/`fechaInicio` (pasarian igual sin DEC-047).
 *
 * Compromiso del spec: `spec.md:564` (mitigacion `INC05-R11`: "prueba de
 * regresion explicita del `PATCH` de gym: mover inicio +1 -> fin +1;
 * retroceder -> retrocede; editar `fechaFin` explicito -> cambia la
 * duracion"), `spec.md:220-224` ("se prueba y se verifica, sin cobrar puntos
 * extra") y `spec.md:633` (tarea GREEN, "incluida regresion de gym").
 *
 * Endpoint ejercitado (verificado en `src/routes/membresia.ts:260`):
 * `PATCH /clientes/:clienteId/membresias-gym/:membresiaId`
 * (`preHandler` DUENO/RECEPCIONISTA, DEC-017) -> `editarMembresia` ->
 * `calcularFechasEdicion` (`membresia.service.ts:148-170`).
 *
 * Mapeo rama -> test (3 ramas de `INC05-R11` + version + orden C2):
 *  1. Mover `fechaInicio` +1 dia (solo `fechaInicio`) -> `fechaFin` pasa a
 *     `fin+1` y la duracion inclusiva queda identica.    [describe rama 1, test 1]
 *  2. Retroceder `fechaInicio` -N dias (solo `fechaInicio`) -> `fechaFin`
 *     retrocede exactamente N; duracion inclusiva identica.
 *                                                        [describe rama 1, test 2]
 *  3. `fechaFin` explicito -> cambia la duracion (asertada inclusivamente).
 *                                                        [describe rama 2, test 3]
 *  3b. Ramita: `fechaInicio` + `fechaFin` explicitos en el MISMO request ->
 *     manda lo explicito, sin desplazamiento doble.       [describe rama 2, test 4]
 *  4. Patron optimista: `version + 1` en cada edicion valida y `409
 *     MEMBRESIA_CONFLICTO` con version vieja sin escritura.
 *                                                        [describe rama 3, test 5]
 *  5. Orden C2 sin regresion: solo `fechaInicio` con `nuevoInicio >
 *     finPersistido` -> `400` ANTES de desplazar `fechaFin`.
 *                                                        [describe rama 3, test 6]
 *
 * Naturaleza: pruebas **GREEN de regresion** — deben pasar contra la
 * implementacion actual; si alguna falla, es un bug real de DEC-047 en gym y
 * se reporta al orquestador sin tocar `src/` ni ajustar la asercion.
 *
 * Aislamiento (DEC-012/DEC-013): SQLite temporal por ejecucion
 * (`tests/setup-isolated-sqlite.ts`), fixtures propios con prefijo de cedula
 * unico (9945...), limpieza deterministica antes/despues y fechas SIEMPRE
 * relativas a `getTodayBogota()` (mismo oracle que el backend).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import bcrypt from "bcryptjs";
import Fastify from "fastify";
import prisma from "../../src/lib/prisma";
import authRoutes from "../../src/routes/auth";
import membresiaRoutes from "../../src/routes/membresia";
import prismaPlugin from "../../src/plugins/prisma";
import authPlugin from "../../src/plugins/auth";
import { getTodayBogota } from "../../src/services/membresia.service";

const prefix = "inc05_r11";
const cedulaPrefix = "9945";
const sedeId = `${prefix}_sede`;
const duenoEmail = `${prefix}_dueno@clubbeasts.test`;
const pin = "1234";

const MSG_CONFLICTO =
  "Los datos fueron modificados por otro usuario. Recargue e intente nuevamente.";
const MSG_ORDEN = "Fecha fin no puede ser anterior a fecha de inicio";

let app: any;
let token = "";
let actorId = "";
let clienteSeq = 0;

function parseBody(res: { body: string }) {
  return JSON.parse(res.body);
}

/** Hoy en America/Bogota (DEC-013), mismo oracle que usa el backend. */
function hoy(): string {
  return getTodayBogota();
}

/** Suma (o resta) dias de calendario a un `YYYY-MM-DD` (logica minima propia). */
function sumarDias(fecha: string, dias: number): string {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia + dias)).toISOString().slice(0, 10);
}

/** Dias completos INCLUSIVOS de un rango (DEC-005/DEC-006): (fin - inicio) + 1. */
function diasInclusivos(inicio: string, fin: string): number {
  const [y1, m1, d1] = inicio.split("-").map(Number);
  const [y2, m2, d2] = fin.split("-").map(Number);
  return (
    Math.round(
      (Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000
    ) + 1
  );
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
  await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });
  await prisma.sede.deleteMany({ where: { id: sedeId } });
}

/** Cliente nuevo por prueba: ninguna prueba depende del orden ni de otra. */
async function crearCliente(): Promise<string> {
  clienteSeq += 1;
  const cliente = await prisma.cliente.create({
    data: {
      cedula: `${cedulaPrefix}${String(clienteSeq).padStart(6, "0")}`,
      nombres: "Cliente",
      apellidos: "Regresion R11",
      telefono: "3000000000",
      sedeId,
      pin: await bcrypt.hash(pin, 4),
      estado: "ACTIVO",
    },
  });
  return cliente.id;
}

function headers() {
  return { authorization: `Bearer ${token}` };
}

/** Vigencia GYM via el endpoint ACEPTADO `POST .../membresias-gym` (version 1). */
async function crearVigenciaGym(
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

/** `PATCH /clientes/:clienteId/membresias-gym/:membresiaId` (ruta gym). */
async function editarGym(
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

async function leerFila(membresiaId: string) {
  return prisma.membresiaGym.findUniqueOrThrow({ where: { id: membresiaId } });
}

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? "inc05-r11-gym-secret";

  await cleanupFixtures();

  const hashedDueno = await bcrypt.hash("dueno123", 10);
  await prisma.sede.upsert({
    where: { id: sedeId },
    update: { nombre: "Sede INC-05 R11" },
    create: { id: sedeId, nombre: "Sede INC-05 R11" },
  });
  const dueno = await prisma.user.upsert({
    where: { email: duenoEmail },
    update: { contrasena: hashedDueno, nombre: "Dueño INC-05 R11", rol: "DUENO" },
    create: {
      email: duenoEmail,
      contrasena: hashedDueno,
      nombre: "Dueño INC-05 R11",
      rol: "DUENO",
    },
  });
  actorId = dueno.id;

  app = Fastify();
  await app.register(prismaPlugin);
  await app.register(authPlugin);
  await app.register(authRoutes);
  await app.register(membresiaRoutes);
  await app.ready();

  const login = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email: duenoEmail, password: "dueno123" },
  });
  expect(login.statusCode).toBe(200);
  token = parseBody(login).token;
});

afterAll(async () => {
  await app.close();
  await cleanupFixtures();
});

// ─── Rama 1 de INC05-R11: mover SOLO fechaInicio desplaza fechaFin ───────────

describe("INC05-R11 rama 1: con SOLO fechaInicio, fechaFin se desplaza por el mismo delta (DEC-047 en gym)", () => {
  it("R11-1 mover SOLO fechaInicio +1 dia deja fechaFin en fin+1, conserva los 30 dias inclusivos, sube version 1 -> 2 y audita EDICION con las fechas efectivas", async () => {
    const clienteId = await crearCliente();
    const inicioPersistido = hoy();
    const finPersistido = sumarDias(inicioPersistido, 29); // 30 dias inclusivos
    const creada = await crearVigenciaGym(clienteId, inicioPersistido, finPersistido);
    expect(creada.statusCode).toBe(201);
    expect(parseBody(creada).version).toBe(1);
    const membresiaId = parseBody(creada).id as string;
    expect(diasInclusivos(inicioPersistido, finPersistido)).toBe(30);

    const res = await editarGym(clienteId, membresiaId, {
      fechaInicio: sumarDias(inicioPersistido, 1),
      version: 1,
    });

    expect(res.statusCode).toBe(200);
    const dto = parseBody(res);
    expect(dto.tipoServicio).toBe("GYM");
    expect(dto.fechaInicio).toBe(sumarDias(inicioPersistido, 1));
    expect(dto.fechaFin).toBe(sumarDias(finPersistido, 1));
    expect(dto.version).toBe(2);

    const fila = await leerFila(membresiaId);
    expect(fila.tipoServicio).toBe("GYM");
    expect(fila.fechaInicio).toBe(sumarDias(inicioPersistido, 1));
    expect(fila.fechaFin).toBe(sumarDias(finPersistido, 1));
    expect(fila.version).toBe(2);
    // La duracion inclusiva queda IDENTICA (30 -> 30), no solo las fechas.
    expect(diasInclusivos(fila.fechaInicio, fila.fechaFin)).toBe(
      diasInclusivos(inicioPersistido, finPersistido)
    );
    expect(diasInclusivos(fila.fechaInicio, fila.fechaFin)).toBe(30);

    // La auditoria registra las fechas EFECTIVas (orden C2), no solo las enviadas.
    const edicion = await prisma.membresiaGymCambio.findFirstOrThrow({
      where: { membresiaId, accion: "EDICION" },
    });
    expect(edicion.version).toBe(2);
    expect(edicion.actorId).toBe(actorId);
    expect(edicion.fechaInicioAnterior).toBe(inicioPersistido);
    expect(edicion.fechaFinAnterior).toBe(finPersistido);
    expect(edicion.fechaInicioNueva).toBe(sumarDias(inicioPersistido, 1));
    expect(edicion.fechaFinNueva).toBe(sumarDias(finPersistido, 1));
  });

  it("R11-2 retroceder SOLO fechaInicio -3 dias retrocede fechaFin exactamente 3 y conserva la duracion inclusiva (version 2)", async () => {
    const clienteId = await crearCliente();
    const inicioPersistido = sumarDias(hoy(), 3);
    const finPersistido = sumarDias(hoy(), 32); // 30 dias inclusivos
    const creada = await crearVigenciaGym(clienteId, inicioPersistido, finPersistido);
    expect(creada.statusCode).toBe(201);
    const membresiaId = parseBody(creada).id as string;

    const res = await editarGym(clienteId, membresiaId, {
      fechaInicio: hoy(),
      version: 1,
    });

    expect(res.statusCode).toBe(200);
    expect(parseBody(res).fechaInicio).toBe(hoy());
    expect(parseBody(res).fechaFin).toBe(sumarDias(finPersistido, -3));
    expect(parseBody(res).version).toBe(2);

    const fila = await leerFila(membresiaId);
    expect(fila.fechaInicio).toBe(hoy());
    expect(fila.fechaFin).toBe(sumarDias(finPersistido, -3));
    expect(fila.version).toBe(2);
    expect(diasInclusivos(fila.fechaInicio, fila.fechaFin)).toBe(
      diasInclusivos(inicioPersistido, finPersistido)
    );
    expect(diasInclusivos(fila.fechaInicio, fila.fechaFin)).toBe(30);
  });
});

// ─── Rama 3 de INC05-R11: fechaFin explicito manda (incluida la ramita) ──────

describe("INC05-R11 rama 3: con fechaFin explicito cambia la duracion y lo explicito manda sin desplazamiento doble", () => {
  it("R11-3 un PATCH de gym con SOLO fechaFin explicito conserva el inicio persistido y cambia la duracion inclusiva a la del cuerpo (30 -> 10, version 2)", async () => {
    const clienteId = await crearCliente();
    const inicioPersistido = hoy();
    const finPersistido = sumarDias(inicioPersistido, 29); // 30 dias inclusivos
    const creada = await crearVigenciaGym(clienteId, inicioPersistido, finPersistido);
    expect(creada.statusCode).toBe(201);
    const membresiaId = parseBody(creada).id as string;

    const res = await editarGym(clienteId, membresiaId, {
      fechaFin: sumarDias(inicioPersistido, 9),
      version: 1,
    });

    expect(res.statusCode).toBe(200);
    expect(parseBody(res).fechaInicio).toBe(inicioPersistido);
    expect(parseBody(res).fechaFin).toBe(sumarDias(inicioPersistido, 9));
    expect(parseBody(res).version).toBe(2);

    const fila = await leerFila(membresiaId);
    expect(fila.fechaInicio).toBe(inicioPersistido);
    expect(fila.fechaFin).toBe(sumarDias(inicioPersistido, 9));
    expect(fila.version).toBe(2);
    // La duracion SI cambia cuando fechaFin viene explicito: 30 -> 10 inclusivos.
    expect(diasInclusivos(fila.fechaInicio, fila.fechaFin)).toBe(10);
    expect(diasInclusivos(fila.fechaInicio, fila.fechaFin)).not.toBe(
      diasInclusivos(inicioPersistido, finPersistido)
    );
  });

  it("R11-3b con fechaInicio y fechaFin explicitos en el MISMO request manda lo exactamente pedido (fin = fin cuerpo, NO fin+deltas) y la duracion inclusiva nueva es 19", async () => {
    const clienteId = await crearCliente();
    const inicioPersistido = hoy();
    const finPersistido = sumarDias(inicioPersistido, 29); // 30 dias inclusivos
    const creada = await crearVigenciaGym(clienteId, inicioPersistido, finPersistido);
    expect(creada.statusCode).toBe(201);
    const membresiaId = parseBody(creada).id as string;

    const inicioPedido = sumarDias(inicioPersistido, 2);
    const finPedido = sumarDias(inicioPersistido, 20);
    const res = await editarGym(clienteId, membresiaId, {
      fechaInicio: inicioPedido,
      fechaFin: finPedido,
      version: 1,
    });

    expect(res.statusCode).toBe(200);
    // Sin desplazamiento doble: manda lo explicito tal cual (si DEC-047
    // desplazara ademas el fin quedaria inicioPedido+18 dias = finPedido+2).
    expect(parseBody(res).fechaInicio).toBe(inicioPedido);
    expect(parseBody(res).fechaFin).toBe(finPedido);
    expect(parseBody(res).fechaFin).not.toBe(sumarDias(finPedido, 2));
    expect(parseBody(res).version).toBe(2);

    const fila = await leerFila(membresiaId);
    expect(fila.fechaInicio).toBe(inicioPedido);
    expect(fila.fechaFin).toBe(finPedido);
    expect(fila.version).toBe(2);
    expect(diasInclusivos(fila.fechaInicio, fila.fechaFin)).toBe(19);

    const edicion = await prisma.membresiaGymCambio.findFirstOrThrow({
      where: { membresiaId, accion: "EDICION" },
    });
    expect(edicion.fechaInicioNueva).toBe(inicioPedido);
    expect(edicion.fechaFinNueva).toBe(finPedido);
    expect(edicion.actorId).toBe(actorId);
  });
});

// ─── Rama 4/5 de INC05-R11: patron optimista y orden C2 sin regresion ───────

describe("INC05-R11 rama 4+5: version +1 en cada edicion, conflicto con version vieja y orden C2 sin regresion", () => {
  it("R11-4 cada edicion valida sube version +1 y un segundo PATCH con la version vieja responde 409 MEMBRESIA_CONFLICTO sin pisar fechas ni version", async () => {
    const clienteId = await crearCliente();
    const inicioPersistido = hoy();
    const finPersistido = sumarDias(inicioPersistido, 29);
    const creada = await crearVigenciaGym(clienteId, inicioPersistido, finPersistido);
    expect(creada.statusCode).toBe(201);
    const membresiaId = parseBody(creada).id as string;

    const primera = await editarGym(clienteId, membresiaId, {
      fechaInicio: sumarDias(inicioPersistido, 1),
      version: 1,
    });
    expect(primera.statusCode).toBe(200);
    expect(parseBody(primera).version).toBe(2);

    const segunda = await editarGym(clienteId, membresiaId, {
      fechaInicio: sumarDias(inicioPersistido, 5),
      version: 1, // version vieja: ya quedo en 2
    });

    expect(segunda.statusCode).toBe(409);
    expect(parseBody(segunda).code).toBe("MEMBRESIA_CONFLICTO");
    expect(parseBody(segunda).error).toBe(MSG_CONFLICTO);

    const fila = await leerFila(membresiaId);
    expect(fila.fechaInicio).toBe(sumarDias(inicioPersistido, 1));
    expect(fila.fechaFin).toBe(sumarDias(finPersistido, 1));
    expect(fila.version).toBe(2);
    const ediciones = await prisma.membresiaGymCambio.count({
      where: { membresiaId, accion: "EDICION" },
    });
    expect(ediciones).toBe(1);
  });

  it("R11-5 (orden C2) con SOLO fechaInicio y nuevoInicio > finPersistido responde 400 VALIDATION_ERROR ANTES de desplazar fechaFin: fin intacto, version 1 y sin EDICION", async () => {
    const clienteId = await crearCliente();
    const inicioPersistido = hoy();
    const finPersistido = sumarDias(inicioPersistido, 29);
    const creada = await crearVigenciaGym(clienteId, inicioPersistido, finPersistido);
    expect(creada.statusCode).toBe(201);
    const membresiaId = parseBody(creada).id as string;

    const res = await editarGym(clienteId, membresiaId, {
      fechaInicio: sumarDias(finPersistido, 1), // nuevoInicio > fin persistido
      version: 1,
    });

    expect(res.statusCode).toBe(400);
    expect(parseBody(res).code).toBe("VALIDATION_ERROR");
    expect(parseBody(res).error).toBe(MSG_ORDEN);

    const fila = await leerFila(membresiaId);
    expect(fila.fechaInicio).toBe(inicioPersistido);
    // Clave C2: el fin NO se desplazo antes de validar el orden.
    expect(fila.fechaFin).toBe(finPersistido);
    expect(fila.version).toBe(1);
    const ediciones = await prisma.membresiaGymCambio.count({
      where: { membresiaId, accion: "EDICION" },
    });
    expect(ediciones).toBe(0);
  });
});
