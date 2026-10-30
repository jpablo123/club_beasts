/**
 * INC05-NUT-01..04 — Registro de servicio de nutricion (integracion API).
 *
 * Incremento: INC-05-servicios-personalizado-nutricion (tarea 11, modo SOLO RED).
 * Espejo de `hu13-servicio-personalizado.test.ts` sobre
 * `POST/GET/PATCH /clientes/:clienteId/servicios-nutricion` con el contrato
 * RATIFICADO 2026-10-20 (spec.md, endpoints #4/#5/#6). En RED las rutas aun no
 * existen: la mayoria de los casos responde 404 de Fastify.
 *
 * Criterios cubiertos:
 *  - INC05-NUT-01 (HU14-C01): POST 201 + DTO (version 1, actor, auditoria
 *    CREACION, tipoServicio NUTRICION), 5 mensajes de 400, 409
 *    SERVICIO_SOLAPADA inclusive, renovacion (DEC-007), solape POR TIPO
 *    (DEC-004: NO solapa contra GYM ni PERSONALIZADO), 404, 403, 409
 *    CLIENTE_INACTIVO y PATCH con concurrencia optimista (DEC-046) + sub-rama
 *    DEC-047 (fechaFin se desplaza con el delta de fechaInicio).
 *  - INC05-NUT-02 (HU14-C02a): estados calculados NO_CONTRATADO (lista
 *    vacia), ACTIVA (dia final inclusivo), VENCIDA, PROGRAMADA (DEC-043) +
 *    fechaActual; 404; 403.
 *  - INC05-NUT-03 (HU14-C02b): CONGELADO en nutricion — INCLUIDO por DEC-042
 *    (`TIPOS_CONGELABLES` = {GYM, PERSONALIZADO, NUTRICION}); en RED
 *    `/congelar` sobre una fila NUTRICION devuelve aun 409
 *    CONGELACION_NO_PERMITIDA (gap documentado de DEC-042).
 *  - INC05-NUT-04 (HU14-C03): listado propio filtrado por tipo + ficha con
 *    tipoServicio/estado.
 *  - Regresion C1 (correccion de ratificacion): editar la congelacion de una
 *    vigencia GYM no puede dar 409 MEMBRESIA_SOLAPADA espurio por una fila
 *    NUTRICION solapada (fixture F8).
 *
 * Aislamiento (DEC-012/DEC-013): SQLite temporal por ejecucion + fixtures con
 * prefijo de cedula unico (9941...); fechas relativas a `getTodayBogota()`.
 *
 * INC05-NUT-05 (plan nutricional, b4) esta EXCLUIDO de INC-05: sin pruebas de
 * dependencia plan <-> vigencia.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import bcrypt from "bcryptjs";
import prisma from "../../src/lib/prisma";
import { getTodayBogota } from "../../src/services/membresia.service";
import {
  createServicioNutricionSchema,
  updateServicioNutricionSchema,
  servicioNutricionVigenciaSchema,
  listarServicioNutricionSchema,
} from "../../features/acceptance-criteria/HU-14-schemas";
import { getInc05App } from "../../features/steps/inc05-soporte";

const prefix = "inc05_nut";
const cedulaPrefix = "9941";
const sedeId = `${prefix}_sede`;
const duenoEmail = `${prefix}_dueno@clubbeasts.test`;
const recepEmail = `${prefix}_recep@clubbeasts.test`;
const pin = "1234";

const MSG_SOLAPE = "Las fechas se solapan con un período existente";
const MSG_CONFLICTO =
  "Los datos fueron modificados por otro usuario. Recargue e intente nuevamente.";
const MSG_INACTIVO =
  "El cliente está inactivo. Reactíveolo antes de asignar servicios nuevos.";
const MSG_FORBIDDEN = "No tienes permisos para realizar esta acción.";
const MSG_CLIENTE_404 = "Cliente no encontrado";
const MSG_SERVICIO_404 = "Servicio no encontrado";

let app: any;
let tokenDueno = "";
let duenoId = "";
let tokenRecep = "";
let clienteSeq = 0;

function parseBody(res: { body: string }) {
  return JSON.parse(res.body);
}

function hoy(): string {
  return getTodayBogota();
}

/** `hoy +/- dias` en calendario (mismo oracle UTC que inc03-soporte). */
function en(dias: number): string {
  const base = hoy();
  const [y, m, d] = base.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + dias)).toISOString().slice(0, 10);
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

async function crearCliente(estado: string = "ACTIVO"): Promise<string> {
  clienteSeq += 1;
  const cliente = await prisma.cliente.create({
    data: {
      cedula: `${cedulaPrefix}${String(clienteSeq).padStart(6, "0")}`,
      nombres: "Cliente",
      apellidos: "Nutricion Inc05",
      telefono: "3000000000",
      sedeId,
      pin: await bcrypt.hash(pin, 4),
      estado,
    },
  });
  return cliente.id;
}

async function crearClientePortal(): Promise<{ id: string; cedula: string }> {
  clienteSeq += 1;
  const cedula = `${cedulaPrefix}${String(clienteSeq).padStart(6, "0")}`;
  const cliente = await prisma.cliente.create({
    data: {
      cedula,
      nombres: "Cliente",
      apellidos: "Portal Inc05",
      telefono: "3000000000",
      sedeId,
      pin: await bcrypt.hash(pin, 4),
      estado: "ACTIVO",
    },
  });
  return { id: cliente.id, cedula };
}

function headers(token: string = tokenDueno) {
  return { authorization: `Bearer ${token}` };
}

async function postServicio(
  clienteId: string,
  fechaInicio: string,
  fechaFin: string,
  token: string = tokenDueno
) {
  return app.inject({
    method: "POST",
    url: `/clientes/${clienteId}/servicios-nutricion`,
    headers: headers(token),
    payload: { fechaInicio, fechaFin },
  });
}

async function getServicios(clienteId: string, token: string = tokenDueno) {
  return app.inject({
    method: "GET",
    url: `/clientes/${clienteId}/servicios-nutricion`,
    headers: headers(token),
  });
}

async function patchServicio(
  clienteId: string,
  servicioId: string,
  payload: Record<string, unknown>,
  token: string = tokenDueno
) {
  return app.inject({
    method: "PATCH",
    url: `/clientes/${clienteId}/servicios-nutricion/${servicioId}`,
    headers: headers(token),
    payload,
  });
}

/** Fila directa en BD (fixtures F4/F7/F8): la API nueva aun no existe en RED. */
async function fixtureFila(
  clienteId: string,
  fechaInicio: string,
  fechaFin: string,
  tipoServicio: string
): Promise<string> {
  const fila = await prisma.membresiaGym.create({
    data: {
      clienteId,
      fechaInicio,
      fechaFin,
      tipoServicio,
      creadoPorId: duenoId,
      actualizadoPorId: duenoId,
    },
  });
  return fila.id;
}

async function contarFilas(clienteId: string, tipoServicio?: string) {
  return prisma.membresiaGym.count({
    where: {
      clienteId,
      ...(tipoServicio ? { tipoServicio } : {}),
    },
  });
}

/** Pausa via el endpoint YA ACEPTADO de INC-02 (para observar CONGELADO). */
async function congelarVigencia(
  clienteId: string,
  vigenciaId: string,
  fechaInicio: string,
  fechaFin: string,
  version: number = 1
) {
  return app.inject({
    method: "POST",
    url: `/clientes/${clienteId}/vigencias/${vigenciaId}/congelar`,
    headers: headers(),
    payload: {
      fechaInicio,
      fechaFin,
      motivo: "Pausa fixture INC-05",
      version,
    },
  });
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

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? "inc05-nutricion-secret";

  await cleanupFixtures();

  const hashedDueno = await bcrypt.hash("dueno123", 10);
  const hashedRecep = await bcrypt.hash("recep123", 10);
  await prisma.sede.upsert({
    where: { id: sedeId },
    update: { nombre: "Sede INC-05 Nutricion" },
    create: { id: sedeId, nombre: "Sede INC-05 Nutricion" },
  });
  const dueno = await prisma.user.upsert({
    where: { email: duenoEmail },
    update: { contrasena: hashedDueno, nombre: "Dueño INC-05 NUT", rol: "DUENO" },
    create: {
      email: duenoEmail,
      contrasena: hashedDueno,
      nombre: "Dueño INC-05 NUT",
      rol: "DUENO",
    },
  });
  duenoId = dueno.id;
  await prisma.user.upsert({
    where: { email: recepEmail },
    update: { contrasena: hashedRecep, nombre: "Recepcionista INC-05 NUT", rol: "RECEPCIONISTA" },
    create: {
      email: recepEmail,
      contrasena: hashedRecep,
      nombre: "Recepcionista INC-05 NUT",
      rol: "RECEPCIONISTA",
    },
  });

  app = await getInc05App();

  const loginDueno = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email: duenoEmail, password: "dueno123" },
  });
  expect(loginDueno.statusCode).toBe(200);
  tokenDueno = parseBody(loginDueno).token;

  const loginRecep = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email: recepEmail, password: "recep123" },
  });
  expect(loginRecep.statusCode).toBe(200);
  tokenRecep = parseBody(loginRecep).token;
});

afterAll(async () => {
  await app.close();
  await cleanupFixtures();
});

// ─── INC05-NUT-01 — POST /clientes/:clienteId/servicios-nutricion ────────────

describe("INC05-NUT-01 POST crea la vigencia con DTO, version 1, actor y auditoria", () => {
  it("NUT-01 crea una vigencia activa con 201, DTO ratificado (G14 + tipoServicio), version 1, actor y fila CREACION version 1", async () => {
    const clienteId = await crearCliente();
    const payload = { fechaInicio: en(-5), fechaFin: en(5) };
    createServicioNutricionSchema.parse(payload);

    const res = await postServicio(clienteId, payload.fechaInicio, payload.fechaFin);

    expect(res.statusCode).toBe(201);
    const dto = servicioNutricionVigenciaSchema.parse(parseBody(res));
    expect(dto.clienteId).toBe(clienteId);
    expect(dto.fechaInicio).toBe(en(-5));
    expect(dto.fechaFin).toBe(en(5));
    expect(dto.estado).toBe("ACTIVA");
    expect(dto.version).toBe(1);
    expect(dto.creadoPor.id).toBe(duenoId);
    expect(dto.actualizadoPor.id).toBe(duenoId);
    expect(parseBody(res).tipoServicio).toBe("NUTRICION");

    const fila = await prisma.membresiaGym.findUnique({ where: { id: dto.id } });
    expect(fila?.creadoPorId).toBe(duenoId);
    expect(fila?.actualizadoPorId).toBe(duenoId);
    expect(fila?.tipoServicio).toBe("NUTRICION");
    expect(fila?.version).toBe(1);

    const auditoria = await prisma.membresiaGymCambio.findFirst({
      where: { membresiaId: dto.id },
    });
    expect(auditoria?.accion).toBe("CREACION");
    expect(auditoria?.version).toBe(1);
    expect(auditoria?.actorId).toBe(duenoId);
    expect(auditoria?.fechaInicioNueva).toBe(en(-5));
    expect(auditoria?.fechaFinNueva).toBe(en(5));
  });

  it("NUT-01 acepta duracion minima de 1 dia inclusivo (inicio == fin) con 201", async () => {
    const clienteId = await crearCliente();

    const res = await postServicio(clienteId, en(0), en(0));

    expect(res.statusCode).toBe(201);
    const dto = servicioNutricionVigenciaSchema.parse(parseBody(res));
    expect(dto.fechaInicio).toBe(en(0));
    expect(dto.fechaFin).toBe(en(0));
  });

  it("NUT-01 el rol RECEPCIONISTA tambien registra vigencias (DEC-017) con 201", async () => {
    const clienteId = await crearCliente();

    const res = await postServicio(clienteId, en(10), en(20), tokenRecep);

    expect(res.statusCode).toBe(201);
    expect(parseBody(res).creadoPor.id).not.toBe(duenoId);
    expect(parseBody(res).tipoServicio).toBe("NUTRICION");
  });
});

describe("INC05-NUT-01 POST rechaza fechas invalidas con 400 VALIDATION_ERROR y no persiste", () => {
  it("NUT-01 rechaza fechaInicio vacia con 400 'Fecha de inicio es requerida' sin persistir", async () => {
    const clienteId = await crearCliente();

    const res = await postServicio(clienteId, "", en(20));

    expect(res.statusCode).toBe(400);
    expect(parseBody(res).code).toBe("VALIDATION_ERROR");
    expect(parseBody(res).error).toBe("Fecha de inicio es requerida");
    expect(await contarFilas(clienteId)).toBe(0);
  });

  it("NUT-01 rechaza fechaFin vacia con 400 'Fecha fin es requerida' sin persistir", async () => {
    const clienteId = await crearCliente();

    const res = await postServicio(clienteId, en(10), "");

    expect(res.statusCode).toBe(400);
    expect(parseBody(res).code).toBe("VALIDATION_ERROR");
    expect(parseBody(res).error).toBe("Fecha fin es requerida");
    expect(await contarFilas(clienteId)).toBe(0);
  });

  it("NUT-01 rechaza un dia inexistente (2026-02-30) con 400 'Fecha de inicio debe ser una fecha válida (YYYY-MM-DD)'", async () => {
    const clienteId = await crearCliente();

    const res = await postServicio(clienteId, "2026-02-30", "2026-03-31");

    expect(res.statusCode).toBe(400);
    expect(parseBody(res).code).toBe("VALIDATION_ERROR");
    expect(parseBody(res).error).toBe(
      "Fecha de inicio debe ser una fecha válida (YYYY-MM-DD)"
    );
    expect(await contarFilas(clienteId)).toBe(0);
  });

  it("NUT-01 rechaza un formato de fechaFin distinto de YYYY-MM-DD (abc) con 400 y su mensaje exacto", async () => {
    const clienteId = await crearCliente();

    const res = await postServicio(clienteId, en(10), "abc");

    expect(res.statusCode).toBe(400);
    expect(parseBody(res).code).toBe("VALIDATION_ERROR");
    expect(parseBody(res).error).toBe(
      "Fecha fin debe ser una fecha válida (YYYY-MM-DD)"
    );
    expect(await contarFilas(clienteId)).toBe(0);
  });

  it("NUT-01 rechaza fechaFin anterior a fechaInicio con 400 'Fecha fin no puede ser anterior a fecha de inicio'", async () => {
    const clienteId = await crearCliente();

    const res = await postServicio(clienteId, en(20), en(10));

    expect(res.statusCode).toBe(400);
    expect(parseBody(res).code).toBe("VALIDATION_ERROR");
    expect(parseBody(res).error).toBe(
      "Fecha fin no puede ser anterior a fecha de inicio"
    );
    expect(await contarFilas(clienteId)).toBe(0);
  });
});

describe("INC05-NUT-01 solape por tipo (DEC-008 inclusivo, DEC-004 separado) y renovacion (DEC-007)", () => {
  it("NUT-01 rechaza un periodo que solapa uno existente del MISMO tipo por 409 SERVICIO_SOLAPADA con el literal exacto", async () => {
    const clienteId = await crearCliente();
    await fixtureFila(clienteId, en(-10), en(10), "NUTRICION");

    const res = await postServicio(clienteId, en(10), en(20));

    expect(res.statusCode).toBe(409);
    expect(parseBody(res).code).toBe("SERVICIO_SOLAPADA");
    expect(parseBody(res).error).toBe(MSG_SOLAPE);
    expect(await contarFilas(clienteId, "NUTRICION")).toBe(1);
  });

  it("NUT-01 la renovacion con gap de 1 dia crea un periodo NUEVO sin sobrescribir el anterior (201 y 2 filas)", async () => {
    const clienteId = await crearCliente();
    const primera = await postServicio(clienteId, en(-30), en(-1));
    expect(primera.statusCode).toBe(201);

    const renovacion = await postServicio(clienteId, en(0), en(29));

    expect(renovacion.statusCode).toBe(201);
    expect(parseBody(primera).id).not.toBe(parseBody(renovacion).id);
    expect(await contarFilas(clienteId, "NUTRICION")).toBe(2);
    const original = await prisma.membresiaGym.findUnique({
      where: { id: parseBody(primera).id },
    });
    expect(original?.fechaFin).toBe(en(-1));
    expect(original?.version).toBe(1);
  });

  it("NUT-01 un rango que solapa solo una vigencia GYM del mismo cliente se crea con 201 (DEC-004: servicios separados)", async () => {
    const clienteId = await crearCliente();
    await fixtureFila(clienteId, en(-10), en(10), "GYM");

    const res = await postServicio(clienteId, en(-10), en(10));

    expect(res.statusCode).toBe(201);
    expect(await contarFilas(clienteId, "NUTRICION")).toBe(1);
  });

  it("NUT-01 un rango que solapa solo una vigencia PERSONALIZADO del mismo cliente se crea con 201 (DEC-004)", async () => {
    const clienteId = await crearCliente();
    await fixtureFila(clienteId, en(-10), en(10), "PERSONALIZADO");

    const res = await postServicio(clienteId, en(-10), en(10));

    expect(res.statusCode).toBe(201);
    expect(await contarFilas(clienteId, "NUTRICION")).toBe(1);
  });
});

describe("INC05-NUT-01 ramas de error: 404 cliente, 403 rol CLIENTE y 409 CLIENTE_INACTIVO", () => {
  it("NUT-01 responde 404 NOT_FOUND 'Cliente no encontrado' para un cliente inexistente", async () => {
    const res = await postServicio("cliente-inexistente-inc05", en(10), en(20));

    expect(res.statusCode).toBe(404);
    expect(parseBody(res).code).toBe("NOT_FOUND");
    expect(parseBody(res).error).toBe(MSG_CLIENTE_404);
  });

  it("NUT-01 el rol CLIENTE recibe 403 AUTH_FORBIDDEN con el literal exacto", async () => {
    const clienteId = await crearCliente();
    const portal = await crearClientePortal();
    const tokenCliente = await loginCliente(portal.cedula);

    const res = await postServicio(clienteId, en(10), en(20), tokenCliente);

    expect(res.statusCode).toBe(403);
    expect(parseBody(res).code).toBe("AUTH_FORBIDDEN");
    expect(parseBody(res).error).toBe(MSG_FORBIDDEN);
    expect(await contarFilas(clienteId)).toBe(0);
  });

  it("NUT-01 un cliente INACTIVO recibe 409 CLIENTE_INACTIVO con el literal heredado de HU-08 y sin fila creada", async () => {
    const clienteId = await crearCliente("INACTIVO");

    const res = await postServicio(clienteId, en(10), en(20));

    expect(res.statusCode).toBe(409);
    expect(parseBody(res).code).toBe("CLIENTE_INACTIVO");
    expect(parseBody(res).error).toBe(MSG_INACTIVO);
    expect(await contarFilas(clienteId)).toBe(0);
  });

  it("NUT-01 la guarda CLIENTE_INACTIVO evalua ANTES del solape (CONF-01/CONF-06): INACTIVO con vigencia solapada tambien da 409 CLIENTE_INACTIVO", async () => {
    const clienteId = await crearCliente("INACTIVO");
    await fixtureFila(clienteId, en(-10), en(10), "NUTRICION");

    const res = await postServicio(clienteId, en(0), en(5));

    expect(res.statusCode).toBe(409);
    expect(parseBody(res).code).toBe("CLIENTE_INACTIVO");
    expect(await contarFilas(clienteId, "NUTRICION")).toBe(1);
  });
});

// ─── INC05-NUT-01 — PATCH .../servicios-nutricion/:servicioId (DEC-046) ─────

describe("INC05-NUT-01 PATCH con concurrencia optimista (DEC-046) y regla DEC-047", () => {
  it("NUT-01 un PATCH con version vieja responde 409 SERVICIO_CONFLICTO con el literal exacto y no escribe nada", async () => {
    const clienteId = await crearCliente();
    const vigenciaId = await fixtureFila(clienteId, en(-5), en(5), "NUTRICION");

    const res = await patchServicio(clienteId, vigenciaId, {
      fechaInicio: en(0),
      fechaFin: en(9),
      version: 99,
    });

    expect(res.statusCode).toBe(409);
    expect(parseBody(res).code).toBe("SERVICIO_CONFLICTO");
    expect(parseBody(res).error).toBe(MSG_CONFLICTO);
    const fila = await prisma.membresiaGym.findUnique({ where: { id: vigenciaId } });
    expect(fila?.fechaInicio).toBe(en(-5));
    expect(fila?.fechaFin).toBe(en(5));
    expect(fila?.version).toBe(1);
    const ediciones = await prisma.membresiaGymCambio.count({
      where: { membresiaId: vigenciaId, accion: "EDICION" },
    });
    expect(ediciones).toBe(0);
  });

  it("NUT-01 (DEC-047) mover SOLO fechaInicio +1 dia desplaza fechaFin +1 conservando los 30 dias inclusivos y deja version 2 con auditoria EDICION", async () => {
    const clienteId = await crearCliente();
    const vigenciaId = await fixtureFila(clienteId, en(0), en(29), "NUTRICION");
    updateServicioNutricionSchema.parse({ fechaInicio: en(1), version: 1 });

    const res = await patchServicio(clienteId, vigenciaId, {
      fechaInicio: en(1),
      version: 1,
    });

    expect(res.statusCode).toBe(200);
    const dto = servicioNutricionVigenciaSchema.parse(parseBody(res));
    expect(dto.fechaInicio).toBe(en(1));
    expect(dto.fechaFin).toBe(en(30));
    expect(dto.version).toBe(2);
    const fila = await prisma.membresiaGym.findUnique({ where: { id: vigenciaId } });
    expect(fila?.fechaInicio).toBe(en(1));
    expect(fila?.fechaFin).toBe(en(30));
    expect(fila?.version).toBe(2);
    const auditoria = await prisma.membresiaGymCambio.findFirst({
      where: { membresiaId: vigenciaId, accion: "EDICION" },
    });
    expect(auditoria?.version).toBe(2);
    expect(auditoria?.fechaInicioAnterior).toBe(en(0));
    expect(auditoria?.fechaFinAnterior).toBe(en(29));
    expect(auditoria?.fechaInicioNueva).toBe(en(1));
    expect(auditoria?.fechaFinNueva).toBe(en(30));
  });

  it("NUT-01 (DEC-047) retroceder SOLO fechaInicio -1 dia desplaza fechaFin -1 y conserva la duracion inclusiva", async () => {
    const clienteId = await crearCliente();
    const vigenciaId = await fixtureFila(clienteId, en(1), en(30), "NUTRICION");

    const res = await patchServicio(clienteId, vigenciaId, {
      fechaInicio: en(0),
      version: 1,
    });

    expect(res.statusCode).toBe(200);
    expect(parseBody(res).fechaInicio).toBe(en(0));
    expect(parseBody(res).fechaFin).toBe(en(29));
  });

  it("NUT-01 (DEC-047) editar fechaFin explicito cambia la duracion pedida en el cuerpo (inicio + fin mandan)", async () => {
    const clienteId = await crearCliente();
    const vigenciaId = await fixtureFila(clienteId, en(0), en(29), "NUTRICION");

    const res = await patchServicio(clienteId, vigenciaId, {
      fechaInicio: en(2),
      fechaFin: en(20),
      version: 1,
    });

    expect(res.statusCode).toBe(200);
    expect(parseBody(res).fechaInicio).toBe(en(2));
    expect(parseBody(res).fechaFin).toBe(en(20));
    expect(parseBody(res).version).toBe(2);
  });

  it("NUT-01 (DEC-047) editar SOLO fechaFin mueve el fin y conserva el inicio persistido", async () => {
    const clienteId = await crearCliente();
    const vigenciaId = await fixtureFila(clienteId, en(0), en(29), "NUTRICION");

    const res = await patchServicio(clienteId, vigenciaId, {
      fechaFin: en(40),
      version: 1,
    });

    expect(res.statusCode).toBe(200);
    expect(parseBody(res).fechaInicio).toBe(en(0));
    expect(parseBody(res).fechaFin).toBe(en(40));
  });

  it("NUT-01 (C2) con SOLO fechaInicio y nuevoInicio > fin persistido responde 400 'Fecha fin no puede ser anterior a fecha de inicio' ANTES de desplazar y no escribe", async () => {
    const clienteId = await crearCliente();
    const vigenciaId = await fixtureFila(clienteId, en(0), en(29), "NUTRICION");

    const res = await patchServicio(clienteId, vigenciaId, {
      fechaInicio: en(30),
      version: 1,
    });

    expect(res.statusCode).toBe(400);
    expect(parseBody(res).code).toBe("VALIDATION_ERROR");
    expect(parseBody(res).error).toBe(
      "Fecha fin no puede ser anterior a fecha de inicio"
    );
    const fila = await prisma.membresiaGym.findUnique({ where: { id: vigenciaId } });
    expect(fila?.fechaInicio).toBe(en(0));
    expect(fila?.fechaFin).toBe(en(29));
    expect(fila?.version).toBe(1);
  });

  it("NUT-01 el PATCH que produce un rango solapado con otro periodo del MISMO tipo responde 409 SERVICIO_SOLAPADA sin escribir", async () => {
    const clienteId = await crearCliente();
    const vigenciaA = await fixtureFila(clienteId, en(0), en(9), "NUTRICION");
    await fixtureFila(clienteId, en(15), en(40), "NUTRICION");

    const res = await patchServicio(clienteId, vigenciaA, {
      fechaInicio: en(10),
      fechaFin: en(19),
      version: 1,
    });

    expect(res.statusCode).toBe(409);
    expect(parseBody(res).code).toBe("SERVICIO_SOLAPADA");
    expect(parseBody(res).error).toBe(MSG_SOLAPE);
    const fila = await prisma.membresiaGym.findUnique({ where: { id: vigenciaA } });
    expect(fila?.fechaInicio).toBe(en(0));
    expect(fila?.version).toBe(1);
  });

  it("NUT-01 (C2) un PATCH sin version responde 400 'Versión es requerida' y con version 0 responde 400 'Versión debe ser positiva'", async () => {
    const clienteId = await crearCliente();
    const vigenciaId = await fixtureFila(clienteId, en(0), en(9), "NUTRICION");

    const sinVersion = await patchServicio(clienteId, vigenciaId, {
      fechaInicio: en(1),
    });
    expect(sinVersion.statusCode).toBe(400);
    expect(parseBody(sinVersion).code).toBe("VALIDATION_ERROR");
    expect(parseBody(sinVersion).error).toBe("Versión es requerida");

    const versionCero = await patchServicio(clienteId, vigenciaId, {
      fechaInicio: en(1),
      version: 0,
    });
    expect(versionCero.statusCode).toBe(400);
    expect(parseBody(versionCero).code).toBe("VALIDATION_ERROR");
    expect(parseBody(versionCero).error).toBe("Versión debe ser positiva");

    const fila = await prisma.membresiaGym.findUnique({ where: { id: vigenciaId } });
    expect(fila?.version).toBe(1);
  });

  it("NUT-01 (C6) el PATCH sobre una fila de OTRO tipo (GYM) responde 404 'Servicio no encontrado'", async () => {
    const clienteId = await crearCliente();
    const vigenciaGym = await fixtureFila(clienteId, en(0), en(9), "GYM");

    const res = await patchServicio(clienteId, vigenciaGym, {
      fechaInicio: en(1),
      fechaFin: en(10),
      version: 1,
    });

    expect(res.statusCode).toBe(404);
    expect(parseBody(res).code).toBe("NOT_FOUND");
    expect(parseBody(res).error).toBe(MSG_SERVICIO_404);
    const fila = await prisma.membresiaGym.findUnique({ where: { id: vigenciaGym } });
    expect(fila?.fechaInicio).toBe(en(0));
    expect(fila?.version).toBe(1);
  });

  it("NUT-01 el PATCH sobre una vigencia de OTRO cliente responde 404 'Servicio no encontrado'", async () => {
    const clienteA = await crearCliente();
    const clienteB = await crearCliente();
    const vigenciaDeA = await fixtureFila(clienteA, en(0), en(9), "NUTRICION");

    const res = await patchServicio(clienteB, vigenciaDeA, {
      fechaInicio: en(1),
      fechaFin: en(10),
      version: 1,
    });

    expect(res.statusCode).toBe(404);
    expect(parseBody(res).code).toBe("NOT_FOUND");
    expect(parseBody(res).error).toBe(MSG_SERVICIO_404);
  });

  it("NUT-01 el PATCH de un cliente inexistente responde 404 'Cliente no encontrado' (cliente antes que pertenencia)", async () => {
    const clienteId = await crearCliente();
    const vigenciaId = await fixtureFila(clienteId, en(0), en(9), "NUTRICION");

    const res = await patchServicio("cliente-inexistente-inc05", vigenciaId, {
      fechaInicio: en(1),
      version: 1,
    });

    expect(res.statusCode).toBe(404);
    expect(parseBody(res).code).toBe("NOT_FOUND");
    expect(parseBody(res).error).toBe(MSG_CLIENTE_404);
  });

  it("NUT-01 el rol CLIENTE recibe 403 AUTH_FORBIDDEN en el PATCH", async () => {
    const clienteId = await crearCliente();
    const vigenciaId = await fixtureFila(clienteId, en(0), en(9), "NUTRICION");
    const portal = await crearClientePortal();
    const tokenCliente = await loginCliente(portal.cedula);

    const res = await patchServicio(
      clienteId,
      vigenciaId,
      { fechaInicio: en(1), version: 1 },
      tokenCliente
    );

    expect(res.statusCode).toBe(403);
    expect(parseBody(res).code).toBe("AUTH_FORBIDDEN");
  });

  it("NUT-01 (CONF-02) el PATCH NO aplica la guarda CLIENTE_INACTIVO: editar la vigencia de un cliente INACTIVO devuelve 200", async () => {
    const clienteId = await crearCliente("INACTIVO");
    const vigenciaId = await fixtureFila(clienteId, en(0), en(9), "NUTRICION");

    const res = await patchServicio(clienteId, vigenciaId, {
      fechaInicio: en(1),
      fechaFin: en(10),
      version: 1,
    });

    expect(res.statusCode).toBe(200);
    expect(parseBody(res).version).toBe(2);
  });
});

// ─── INC05-NUT-02 / NUT-03 / NUT-04 — GET y estados calculados ──────────────

describe("INC05-NUT-02 GET calcula estados con America/Bogota e inclusivos (DEC-005/006, DEC-043)", () => {
  it("NUT-02 sin vigencias responde 200 con lista vacia y fechaActual (NO_CONTRATADO implicito)", async () => {
    const clienteId = await crearCliente();

    const res = await getServicios(clienteId);

    expect(res.statusCode).toBe(200);
    const cuerpo = listarServicioNutricionSchema.parse(parseBody(res));
    expect(cuerpo.servicios).toEqual([]);
    expect(cuerpo.fechaActual).toBe(hoy());
  });

  it("NUT-02 la vigencia sigue ACTIVA en su dia final inclusivo (hoy == fechaFin)", async () => {
    const clienteId = await crearCliente();
    await fixtureFila(clienteId, en(-10), en(0), "NUTRICION");

    const res = await getServicios(clienteId);

    expect(res.statusCode).toBe(200);
    const cuerpo = listarServicioNutricionSchema.parse(parseBody(res));
    expect(cuerpo.servicios).toHaveLength(1);
    expect(cuerpo.servicios[0].estado).toBe("ACTIVA");
    expect(cuerpo.servicios[0].fechaFin).toBe(en(0));
  });

  it("NUT-02 la vigencia queda VENCIDA al dia siguiente de su fecha fin (hoy == fechaFin + 1)", async () => {
    const clienteId = await crearCliente();
    await fixtureFila(clienteId, en(-20), en(-1), "NUTRICION");

    const res = await getServicios(clienteId);

    expect(res.statusCode).toBe(200);
    const cuerpo = listarServicioNutricionSchema.parse(parseBody(res));
    expect(cuerpo.servicios[0].estado).toBe("VENCIDA");
  });

  it("NUT-02 un periodo futuro se muestra como PROGRAMADA (literal fijado por DEC-043)", async () => {
    const clienteId = await crearCliente();
    await fixtureFila(clienteId, en(5), en(30), "NUTRICION");

    const res = await getServicios(clienteId);

    expect(res.statusCode).toBe(200);
    const cuerpo = listarServicioNutricionSchema.parse(parseBody(res));
    expect(cuerpo.servicios[0].estado).toBe("PROGRAMADA");
  });

  it("NUT-02 el listado ordena por fechaInicio descendente con los DOS periodos de una renovacion", async () => {
    const clienteId = await crearCliente();
    await fixtureFila(clienteId, en(0), en(9), "NUTRICION");
    await fixtureFila(clienteId, en(10), en(19), "NUTRICION");

    const res = await getServicios(clienteId);

    expect(res.statusCode).toBe(200);
    const cuerpo = listarServicioNutricionSchema.parse(parseBody(res));
    expect(cuerpo.servicios.map((fila) => fila.fechaInicio)).toEqual([
      en(10),
      en(0),
    ]);
  });

  it("NUT-02 con datos mixtos (GYM + PERSONALIZADO + NUTRICION) el listado SOLO devuelve filas NUTRICION (incompatibilidad #1)", async () => {
    const clienteId = await crearCliente();
    await fixtureFila(clienteId, en(-30), en(-20), "GYM");
    await fixtureFila(clienteId, en(-10), en(10), "PERSONALIZADO");
    await fixtureFila(clienteId, en(20), en(40), "NUTRICION");

    const res = await getServicios(clienteId);

    expect(res.statusCode).toBe(200);
    const cuerpo = listarServicioNutricionSchema.parse(parseBody(res));
    expect(cuerpo.servicios).toHaveLength(1);
    expect(cuerpo.servicios[0].fechaInicio).toBe(en(20));
    expect(parseBody(res).servicios[0].tipoServicio).toBe("NUTRICION");
  });

  it("NUT-02 el GET de un cliente inexistente responde 404 'Cliente no encontrado' (divergencia deliberada C6 del espejo gym)", async () => {
    const res = await getServicios("cliente-inexistente-inc05");

    expect(res.statusCode).toBe(404);
    expect(parseBody(res).code).toBe("NOT_FOUND");
    expect(parseBody(res).error).toBe(MSG_CLIENTE_404);
  });

  it("NUT-02 el rol CLIENTE recibe 403 AUTH_FORBIDDEN en el listado", async () => {
    const clienteId = await crearCliente();
    const portal = await crearClientePortal();
    const tokenCliente = await loginCliente(portal.cedula);

    const res = await getServicios(clienteId, tokenCliente);

    expect(res.statusCode).toBe(403);
    expect(parseBody(res).code).toBe("AUTH_FORBIDDEN");
    expect(parseBody(res).error).toBe(MSG_FORBIDDEN);
  });
});

describe("INC05-NUT-03 el estado CONGELADO en nutricion (incluido por DEC-042)", () => {
  it("NUT-03 congelar una vigencia NUTRICION con pausa vigente responde 200 y el estado calculado es CONGELADO (DEC-042 + DEC-043)", async () => {
    const clienteId = await crearCliente();
    const vigenciaId = await fixtureFila(clienteId, en(-10), en(10), "NUTRICION");

    // En RED `/congelar` todavia responde 409 CONGELACION_NO_PERMITIDA porque
    // TIPOS_CONGELABLES = {GYM, PERSONALIZADO} (gap de DEC-042 a cerrar en GREEN).
    const pausa = await congelarVigencia(clienteId, vigenciaId, en(0), en(2));
    expect(pausa.statusCode).toBe(200);
    expect(parseBody(pausa).estado).toBe("CONGELADO");

    const res = await getServicios(clienteId);

    expect(res.statusCode).toBe(200);
    const cuerpo = listarServicioNutricionSchema.parse(parseBody(res));
    expect(cuerpo.servicios[0].estado).toBe("CONGELADO");
  });

  it("NUT-03 al terminar la pausa el estado vuelve al calculo normal con fechaFin ya extendida", async () => {
    const clienteId = await crearCliente();
    const vigenciaId = await fixtureFila(clienteId, en(-10), en(10), "NUTRICION");

    const pausa = await congelarVigencia(clienteId, vigenciaId, en(0), en(2));
    expect(pausa.statusCode).toBe(200);
    const finTrasPausa = parseBody(pausa).fechaFin as string;

    await prisma.membresiaGymCambio.updateMany({
      where: { membresiaId: vigenciaId, accion: "CONGELACION" },
      data: { congelacionFin: en(-1) },
    });

    const res = await getServicios(clienteId);

    expect(res.statusCode).toBe(200);
    const cuerpo = listarServicioNutricionSchema.parse(parseBody(res));
    expect(cuerpo.servicios[0].estado).toBe("ACTIVA");
    expect(cuerpo.servicios[0].fechaFin).toBe(finTrasPausa);
  });
});

describe("INC05-NUT-04 la vigencia es visible en la ficha del cliente con tipoServicio y estado", () => {
  it("NUT-04 la ficha GET /clientes/:id muestra la fila NUTRICION con su tipoServicio y estado calculado", async () => {
    const clienteId = await crearCliente();
    await fixtureFila(clienteId, en(-10), en(10), "NUTRICION");

    const res = await app.inject({
      method: "GET",
      url: `/clientes/${clienteId}`,
      headers: headers(),
    });

    expect(res.statusCode).toBe(200);
    const ficha = parseBody(res);
    const fila = ficha.membresias.find(
      (membresia: { tipoServicio: string }) =>
        membresia.tipoServicio === "NUTRICION"
    );
    expect(fila).toBeDefined();
    expect(fila.fechaInicio).toBe(en(-10));
    expect(fila.fechaFin).toBe(en(10));
    expect(fila.estado).toBe("ACTIVA");
  });
});

// ─── Regresiones exigidas por el spec (correccion C1, fixture F8) ───────────

describe("INC-05 regresion C1 sobre la congelacion aceptada con clientes mixtos", () => {
  it("REG-04 (correccion C1) editar la congelacion de una vigencia GYM no produce 409 MEMBRESIA_SOLAPADA espurio por una fila NUTRICION solapada", async () => {
    const clienteId = await crearCliente();
    const vigenciaGym = await fixtureFila(clienteId, en(0), en(19), "GYM");
    await fixtureFila(clienteId, en(4), en(8), "NUTRICION");

    const pausa = await congelarVigencia(clienteId, vigenciaGym, en(0), en(2));
    expect(pausa.statusCode).toBe(200);

    const res = await app.inject({
      method: "PATCH",
      url: `/clientes/${clienteId}/vigencias/${vigenciaGym}/congelacion`,
      headers: headers(),
      payload: {
        fechaInicio: en(0),
        fechaFin: en(3),
        motivo: "Edicion de pausa fixture INC-05",
        version: parseBody(pausa).version,
      },
    });

    expect(res.statusCode).toBe(200);
    expect(parseBody(res).estado).toBe("CONGELADO");
  });
});
