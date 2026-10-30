/**
 * INC05-PER-01..04 — Registro de servicio personalizado (integracion API).
 *
 * Incremento: INC-05-servicios-personalizado-nutricion (tarea 11, modo SOLO RED).
 * Estas pruebas documentan el comportamiento esperado del contrato RATIFICADO
 * 2026-10-20 (spec.md: endpoints #1/#2/#3, orden de evaluacion, tabla de
 * errores, correcciones C2/C5/C6); si fallan, el fallo es intencional (RED) y
 * describe el criterio que falta implementar. En RED las rutas nuevas aun no
 * existen, por lo que la mayoria de los casos responde 404 de Fastify.
 *
 * Criterios cubiertos:
 *  - INC05-PER-01 (HU13-C01): POST 201 + DTO (version 1, actor, auditoria
 *    CREACION, tipoServicio), 5 mensajes de 400, 409 SERVICIO_SOLAPADA
 *    inclusive, renovacion (DEC-007) crea periodo nuevo, solape POR TIPO
 *    (DEC-004), 404 cliente, 403 CLIENTE (DEC-017), 409 CLIENTE_INACTIVO
 *    (CONF-06, antes del solape), PATCH con version vieja -> 409
 *    SERVICIO_CONFLICTO (DEC-046) y sub-rama DEC-047 (mover solo fechaInicio
 *    desplaza fechaFin conservando la duracion inclusiva; fechaFin explicito
 *    manda; inicioNuevo > finPersistido -> 400 C2 antes de desplazar; orden
 *    Zod -> 404 -> 409 version -> 409 solape; sin escritura en errores).
 *  - INC05-PER-02 (HU13-C02a): GET con estados calculados NO_CONTRATADO
 *    (lista vacia implicita), ACTIVA (dia final inclusivo), VENCIDA,
 *    PROGRAMADA (DEC-043) + fechaActual; 404 cliente inexistente; 403.
 *  - INC05-PER-03 (HU13-C02b): CONGELADO con pausa de INC-02 y regreso al
 *    calculo normal con fechaFin extendida al terminar la pausa.
 *  - INC05-PER-04 (HU13-C03): listado propio con filtro por tipo y ficha
 *    `GET /clientes/:id` con tipoServicio + estado por fila.
 *  - Regresiones exigidas por el spec (incompatibilidad #1 / correccion C1):
 *    la lista GYM no se contamina con tipos mixtos, un solape cruzado no
 *    rechaza creaciones validas y `congelar` no devuelve 409 espurio con
 *    clientes mixtos (fixture F8).
 *
 * Aislamiento (DEC-012/DEC-013): SQLite temporal por ejecucion + fixtures
 * propios con prefijo de cedula unico (9940...) y limpieza deterministica
 * (cambios -> membresias -> clientes -> usuarios -> sede). Fechas siempre
 * relativas a `getTodayBogota()`.
 *
 * INC05-PER-05 (rutina personalizada, b4) esta EXCLUIDO de INC-05: aqui no
 * se escribe ninguna prueba de dependencia rutina <-> vigencia.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import bcrypt from "bcryptjs";
import prisma from "../../src/lib/prisma";
import { getTodayBogota } from "../../src/services/membresia.service";
import {
  createServicioPersonalizadoSchema,
  updateServicioPersonalizadoSchema,
  servicioPersonalizadoVigenciaSchema,
  listarServicioPersonalizadoSchema,
} from "../../features/acceptance-criteria/HU-13-schemas";
import { getInc05App } from "../../features/steps/inc05-soporte";

const prefix = "inc05_per";
const cedulaPrefix = "9940";
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

/** Cliente nuevo por prueba: ninguna prueba depende del orden ni de otra prueba. */
async function crearCliente(estado: string = "ACTIVO"): Promise<string> {
  clienteSeq += 1;
  const cliente = await prisma.cliente.create({
    data: {
      cedula: `${cedulaPrefix}${String(clienteSeq).padStart(6, "0")}`,
      nombres: "Cliente",
      apellidos: "Personalizado Inc05",
      telefono: "3000000000",
      sedeId,
      pin: await bcrypt.hash(pin, 4),
      estado,
    },
  });
  return cliente.id;
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
    url: `/clientes/${clienteId}/servicios-personalizado`,
    headers: headers(token),
    payload: { fechaInicio, fechaFin },
  });
}

async function getServicios(clienteId: string, token: string = tokenDueno) {
  return app.inject({
    method: "GET",
    url: `/clientes/${clienteId}/servicios-personalizado`,
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
    url: `/clientes/${clienteId}/servicios-personalizado/${servicioId}`,
    headers: headers(token),
    payload,
  });
}

/** Fila directa en BD (fixtures F2/F4/F8): la API nueva aun no existe en RED. */
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
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? "inc05-personalizado-secret";

  await cleanupFixtures();

  const hashedDueno = await bcrypt.hash("dueno123", 10);
  const hashedRecep = await bcrypt.hash("recep123", 10);
  await prisma.sede.upsert({
    where: { id: sedeId },
    update: { nombre: "Sede INC-05 Personalizado" },
    create: { id: sedeId, nombre: "Sede INC-05 Personalizado" },
  });
  const dueno = await prisma.user.upsert({
    where: { email: duenoEmail },
    update: { contrasena: hashedDueno, nombre: "Dueño INC-05 PER", rol: "DUENO" },
    create: {
      email: duenoEmail,
      contrasena: hashedDueno,
      nombre: "Dueño INC-05 PER",
      rol: "DUENO",
    },
  });
  duenoId = dueno.id;
  await prisma.user.upsert({
    where: { email: recepEmail },
    update: { contrasena: hashedRecep, nombre: "Recepcionista INC-05 PER", rol: "RECEPCIONISTA" },
    create: {
      email: recepEmail,
      contrasena: hashedRecep,
      nombre: "Recepcionista INC-05 PER",
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

// ─── INC05-PER-01 — POST /clientes/:clienteId/servicios-personalizado ────────

describe("INC05-PER-01 POST crea la vigencia con DTO, version 1, actor y auditoria", () => {
  it("PER-01 crea una vigencia activa con 201, DTO ratificado (G14 + tipoServicio), version 1, actor y fila CREACION version 1", async () => {
    const clienteId = await crearCliente();
    const payload = { fechaInicio: en(-5), fechaFin: en(5) };
    createServicioPersonalizadoSchema.parse(payload);

    const res = await postServicio(clienteId, payload.fechaInicio, payload.fechaFin);

    expect(res.statusCode).toBe(201);
    const dto = servicioPersonalizadoVigenciaSchema.parse(parseBody(res));
    expect(dto.clienteId).toBe(clienteId);
    expect(dto.fechaInicio).toBe(en(-5));
    expect(dto.fechaFin).toBe(en(5));
    expect(dto.estado).toBe("ACTIVA");
    expect(dto.version).toBe(1);
    expect(dto.creadoPor.id).toBe(duenoId);
    expect(dto.actualizadoPor.id).toBe(duenoId);
    // INC05-CONF-04: campo aditivo del DTO real sobre el schema G14.
    expect(parseBody(res).tipoServicio).toBe("PERSONALIZADO");

    const fila = await prisma.membresiaGym.findUnique({ where: { id: dto.id } });
    expect(fila?.creadoPorId).toBe(duenoId);
    expect(fila?.actualizadoPorId).toBe(duenoId);
    expect(fila?.tipoServicio).toBe("PERSONALIZADO");
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

  it("PER-01 acepta duracion minima de 1 dia inclusivo (inicio == fin) con 201", async () => {
    const clienteId = await crearCliente();

    const res = await postServicio(clienteId, en(0), en(0));

    expect(res.statusCode).toBe(201);
    const dto = servicioPersonalizadoVigenciaSchema.parse(parseBody(res));
    expect(dto.fechaInicio).toBe(en(0));
    expect(dto.fechaFin).toBe(en(0));
  });

  it("PER-01 el rol RECEPCIONISTA tambien registra vigencias (DEC-017) con 201", async () => {
    const clienteId = await crearCliente();

    const res = await postServicio(clienteId, en(10), en(20), tokenRecep);

    expect(res.statusCode).toBe(201);
    expect(parseBody(res).creadoPor.id).not.toBe(duenoId);
    expect(parseBody(res).tipoServicio).toBe("PERSONALIZADO");
  });
});

describe("INC05-PER-01 POST rechaza fechas invalidas con 400 VALIDATION_ERROR y no persiste", () => {
  it("PER-01 rechaza fechaInicio vacia con 400 'Fecha de inicio es requerida' sin persistir", async () => {
    const clienteId = await crearCliente();

    const res = await postServicio(clienteId, "", en(20));

    expect(res.statusCode).toBe(400);
    expect(parseBody(res).code).toBe("VALIDATION_ERROR");
    expect(parseBody(res).error).toBe("Fecha de inicio es requerida");
    expect(await contarFilas(clienteId)).toBe(0);
  });

  it("PER-01 rechaza fechaFin vacia con 400 'Fecha fin es requerida' sin persistir", async () => {
    const clienteId = await crearCliente();

    const res = await postServicio(clienteId, en(10), "");

    expect(res.statusCode).toBe(400);
    expect(parseBody(res).code).toBe("VALIDATION_ERROR");
    expect(parseBody(res).error).toBe("Fecha fin es requerida");
    expect(await contarFilas(clienteId)).toBe(0);
  });

  it("PER-01 rechaza un dia inexistente (2026-02-30) con 400 'Fecha de inicio debe ser una fecha válida (YYYY-MM-DD)'", async () => {
    const clienteId = await crearCliente();

    const res = await postServicio(clienteId, "2026-02-30", "2026-03-31");

    expect(res.statusCode).toBe(400);
    expect(parseBody(res).code).toBe("VALIDATION_ERROR");
    expect(parseBody(res).error).toBe(
      "Fecha de inicio debe ser una fecha válida (YYYY-MM-DD)"
    );
    expect(await contarFilas(clienteId)).toBe(0);
  });

  it("PER-01 rechaza un formato de fechaFin distinto de YYYY-MM-DD (abc) con 400 y su mensaje exacto", async () => {
    const clienteId = await crearCliente();

    const res = await postServicio(clienteId, en(10), "abc");

    expect(res.statusCode).toBe(400);
    expect(parseBody(res).code).toBe("VALIDATION_ERROR");
    expect(parseBody(res).error).toBe(
      "Fecha fin debe ser una fecha válida (YYYY-MM-DD)"
    );
    expect(await contarFilas(clienteId)).toBe(0);
  });

  it("PER-01 rechaza fechaFin anterior a fechaInicio con 400 'Fecha fin no puede ser anterior a fecha de inicio'", async () => {
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

describe("INC05-PER-01 solape por tipo (DEC-008 inclusivo, DEC-004 separado) y renovacion (DEC-007)", () => {
  it("PER-01 rechaza un periodo que solapa uno existente del MISMO tipo por 409 SERVICIO_SOLAPADA con el literal exacto", async () => {
    const clienteId = await crearCliente();
    await fixtureFila(clienteId, en(-10), en(10), "PERSONALIZADO");

    const res = await postServicio(clienteId, en(10), en(20));

    expect(res.statusCode).toBe(409);
    expect(parseBody(res).code).toBe("SERVICIO_SOLAPADA");
    expect(parseBody(res).error).toBe(MSG_SOLAPE);
    expect(await contarFilas(clienteId, "PERSONALIZADO")).toBe(1);
  });

  it("PER-01 rechaza tambien el solape por el extremo izquierdo (nuevoFin == inicioPrevio) por 409 SERVICIO_SOLAPADA", async () => {
    const clienteId = await crearCliente();
    await fixtureFila(clienteId, en(-10), en(0), "PERSONALIZADO");

    const res = await postServicio(clienteId, en(-20), en(-10));

    expect(res.statusCode).toBe(409);
    expect(parseBody(res).code).toBe("SERVICIO_SOLAPADA");
    expect(await contarFilas(clienteId, "PERSONALIZADO")).toBe(1);
  });

  it("PER-01 la renovacion con gap de 1 dia crea un periodo NUEVO sin sobrescribir el anterior (201 y GET con 2 periodos)", async () => {
    const clienteId = await crearCliente();
    const primera = await postServicio(clienteId, en(-30), en(-1));
    expect(primera.statusCode).toBe(201);

    const renovacion = await postServicio(clienteId, en(0), en(29));

    expect(renovacion.statusCode).toBe(201);
    expect(parseBody(primera).id).not.toBe(parseBody(renovacion).id);
    const filas = await contarFilas(clienteId, "PERSONALIZADO");
    expect(filas).toBe(2);
    const original = await prisma.membresiaGym.findUnique({
      where: { id: parseBody(primera).id },
    });
    expect(original?.fechaFin).toBe(en(-1));
    expect(original?.version).toBe(1);
  });

  it("PER-01 un rango que solapa solo una vigencia GYM del mismo cliente se crea con 201 (DEC-004: servicios separados)", async () => {
    const clienteId = await crearCliente();
    await fixtureFila(clienteId, en(-10), en(10), "GYM");

    const res = await postServicio(clienteId, en(-10), en(10));

    expect(res.statusCode).toBe(201);
    expect(await contarFilas(clienteId, "PERSONALIZADO")).toBe(1);
  });

  it("PER-01 un rango que solapa solo una vigencia de NUTRICION del mismo cliente se crea con 201 (DEC-004)", async () => {
    const clienteId = await crearCliente();
    await fixtureFila(clienteId, en(-10), en(10), "NUTRICION");

    const res = await postServicio(clienteId, en(-10), en(10));

    expect(res.statusCode).toBe(201);
    expect(await contarFilas(clienteId, "PERSONALIZADO")).toBe(1);
  });
});

describe("INC05-PER-01 ramas de error: 404 cliente, 403 rol CLIENTE y 409 CLIENTE_INACTIVO", () => {
  it("PER-01 responde 404 NOT_FOUND 'Cliente no encontrado' para un cliente inexistente", async () => {
    const res = await postServicio("cliente-inexistente-inc05", en(10), en(20));

    expect(res.statusCode).toBe(404);
    expect(parseBody(res).code).toBe("NOT_FOUND");
    expect(parseBody(res).error).toBe(MSG_CLIENTE_404);
  });

  it("PER-01 el rol CLIENTE recibe 403 AUTH_FORBIDDEN con el literal exacto", async () => {
    const clienteId = await crearCliente();
    clienteSeq += 1;
    const portal = await prisma.cliente.create({
      data: {
        cedula: `${cedulaPrefix}${String(clienteSeq).padStart(6, "0")}`,
        nombres: "Cliente",
        apellidos: "Portal Inc05",
        telefono: "3000000000",
        sedeId,
        pin: await bcrypt.hash(pin, 4),
        estado: "ACTIVO",
      },
    });
    const tokenCliente = await loginCliente(portal.cedula);

    const res = await postServicio(clienteId, en(10), en(20), tokenCliente);

    expect(res.statusCode).toBe(403);
    expect(parseBody(res).code).toBe("AUTH_FORBIDDEN");
    expect(parseBody(res).error).toBe(MSG_FORBIDDEN);
    expect(await contarFilas(clienteId)).toBe(0);
  });

  it("PER-01 un cliente INACTIVO recibe 409 CLIENTE_INACTIVO con el literal heredado de HU-08 y sin fila creada", async () => {
    const clienteId = await crearCliente("INACTIVO");

    const res = await postServicio(clienteId, en(10), en(20));

    expect(res.statusCode).toBe(409);
    expect(parseBody(res).code).toBe("CLIENTE_INACTIVO");
    expect(parseBody(res).error).toBe(MSG_INACTIVO);
    expect(await contarFilas(clienteId)).toBe(0);
  });

  it("PER-01 la guarda CLIENTE_INACTIVO evalua ANTES del solape (CONF-01/CONF-06): INACTIVO con vigencia solapada tambien da 409 CLIENTE_INACTIVO", async () => {
    const clienteId = await crearCliente("INACTIVO");
    await fixtureFila(clienteId, en(-10), en(10), "PERSONALIZADO");

    const res = await postServicio(clienteId, en(0), en(5));

    expect(res.statusCode).toBe(409);
    expect(parseBody(res).code).toBe("CLIENTE_INACTIVO");
    expect(await contarFilas(clienteId, "PERSONALIZADO")).toBe(1);
  });
});

// ─── INC05-PER-01 — PATCH .../servicios-personalizado/:servicioId (DEC-046) ──

describe("INC05-PER-01 PATCH con concurrencia optimista (DEC-046) y regla DEC-047", () => {
  it("PER-01 un PATCH con version vieja responde 409 SERVICIO_CONFLICTO con el literal exacto y no escribe nada", async () => {
    const clienteId = await crearCliente();
    const vigenciaId = await fixtureFila(clienteId, en(-5), en(5), "PERSONALIZADO");

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

  it("PER-01 (DEC-047) mover SOLO fechaInicio +1 dia desplaza fechaFin +1 conservando los 30 dias inclusivos y deja version 2 con auditoria EDICION", async () => {
    const clienteId = await crearCliente();
    // Plan de 30 dias inclusivos: en(0)..en(29).
    const vigenciaId = await fixtureFila(clienteId, en(0), en(29), "PERSONALIZADO");
    updateServicioPersonalizadoSchema.parse({ fechaInicio: en(1), version: 1 });

    const res = await patchServicio(clienteId, vigenciaId, {
      fechaInicio: en(1),
      version: 1,
    });

    expect(res.statusCode).toBe(200);
    const dto = servicioPersonalizadoVigenciaSchema.parse(parseBody(res));
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
    // La auditoria registra las fechas EFECTIVas (C2), no solo las enviadas.
    expect(auditoria?.fechaInicioAnterior).toBe(en(0));
    expect(auditoria?.fechaFinAnterior).toBe(en(29));
    expect(auditoria?.fechaInicioNueva).toBe(en(1));
    expect(auditoria?.fechaFinNueva).toBe(en(30));
  });

  it("PER-01 (DEC-047) retroceder SOLO fechaInicio -1 dia desplaza fechaFin -1 y conserva la duracion inclusiva", async () => {
    const clienteId = await crearCliente();
    const vigenciaId = await fixtureFila(clienteId, en(1), en(30), "PERSONALIZADO");

    const res = await patchServicio(clienteId, vigenciaId, {
      fechaInicio: en(0),
      version: 1,
    });

    expect(res.statusCode).toBe(200);
    expect(parseBody(res).fechaInicio).toBe(en(0));
    expect(parseBody(res).fechaFin).toBe(en(29));
  });

  it("PER-01 (DEC-047) editar fechaFin explicito cambia la duracion pedida en el cuerpo (inicio + fin mandan)", async () => {
    const clienteId = await crearCliente();
    const vigenciaId = await fixtureFila(clienteId, en(0), en(29), "PERSONALIZADO");

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

  it("PER-01 (DEC-047) editar SOLO fechaFin mueve el fin y conserva el inicio persistido", async () => {
    const clienteId = await crearCliente();
    const vigenciaId = await fixtureFila(clienteId, en(0), en(29), "PERSONALIZADO");

    const res = await patchServicio(clienteId, vigenciaId, {
      fechaFin: en(40),
      version: 1,
    });

    expect(res.statusCode).toBe(200);
    expect(parseBody(res).fechaInicio).toBe(en(0));
    expect(parseBody(res).fechaFin).toBe(en(40));
  });

  it("PER-01 (C2) con SOLO fechaInicio y nuevoInicio > fin persistido responde 400 'Fecha fin no puede ser anterior a fecha de inicio' ANTES de desplazar y no escribe", async () => {
    const clienteId = await crearCliente();
    const vigenciaId = await fixtureFila(clienteId, en(0), en(29), "PERSONALIZADO");

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

  it("PER-01 el PATCH que produce un rango solapado con otro periodo del MISMO tipo responde 409 SERVICIO_SOLAPADA sin escribir", async () => {
    const clienteId = await crearCliente();
    const vigenciaA = await fixtureFila(clienteId, en(0), en(9), "PERSONALIZADO");
    await fixtureFila(clienteId, en(15), en(40), "PERSONALIZADO");

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

  it("PER-01 (C2) un PATCH sin version responde 400 'Versión es requerida' y con version 0 responde 400 'Versión debe ser positiva'", async () => {
    const clienteId = await crearCliente();
    const vigenciaId = await fixtureFila(clienteId, en(0), en(9), "PERSONALIZADO");

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

  it("PER-01 el orden de evaluacion aplica Zod ANTES del conflicto de version (CONF-01): body invalido + version vieja -> 400", async () => {
    const clienteId = await crearCliente();
    const vigenciaId = await fixtureFila(clienteId, en(0), en(9), "PERSONALIZADO");

    const res = await patchServicio(clienteId, vigenciaId, {
      fechaInicio: "abc",
      version: 99,
    });

    expect(res.statusCode).toBe(400);
    expect(parseBody(res).code).toBe("VALIDATION_ERROR");
    const fila = await prisma.membresiaGym.findUnique({ where: { id: vigenciaId } });
    expect(fila?.version).toBe(1);
  });

  it("PER-01 (C6) el PATCH sobre una fila de OTRO tipo (GYM) responde 404 'Servicio no encontrado'", async () => {
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

  it("PER-01 el PATCH sobre una vigencia de OTRO cliente responde 404 'Servicio no encontrado'", async () => {
    const clienteA = await crearCliente();
    const clienteB = await crearCliente();
    const vigenciaDeA = await fixtureFila(clienteA, en(0), en(9), "PERSONALIZADO");

    const res = await patchServicio(clienteB, vigenciaDeA, {
      fechaInicio: en(1),
      fechaFin: en(10),
      version: 1,
    });

    expect(res.statusCode).toBe(404);
    expect(parseBody(res).code).toBe("NOT_FOUND");
    expect(parseBody(res).error).toBe(MSG_SERVICIO_404);
  });

  it("PER-01 el PATCH de un cliente inexistente responde 404 'Cliente no encontrado' (cliente antes que pertenencia)", async () => {
    const clienteId = await crearCliente();
    const vigenciaId = await fixtureFila(clienteId, en(0), en(9), "PERSONALIZADO");

    const res = await patchServicio("cliente-inexistente-inc05", vigenciaId, {
      fechaInicio: en(1),
      version: 1,
    });

    expect(res.statusCode).toBe(404);
    expect(parseBody(res).code).toBe("NOT_FOUND");
    expect(parseBody(res).error).toBe(MSG_CLIENTE_404);
  });

  it("PER-01 el rol CLIENTE recibe 403 AUTH_FORBIDDEN en el PATCH", async () => {
    const clienteId = await crearCliente();
    const vigenciaId = await fixtureFila(clienteId, en(0), en(9), "PERSONALIZADO");
    clienteSeq += 1;
    const portal = await prisma.cliente.create({
      data: {
        cedula: `${cedulaPrefix}${String(clienteSeq).padStart(6, "0")}`,
        nombres: "Cliente",
        apellidos: "Portal Inc05",
        telefono: "3000000000",
        sedeId,
        pin: await bcrypt.hash(pin, 4),
        estado: "ACTIVO",
      },
    });
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

  it("PER-01 (CONF-02) el PATCH NO aplica la guarda CLIENTE_INACTIVO: editar la vigencia de un cliente INACTIVO devuelve 200", async () => {
    const clienteId = await crearCliente("INACTIVO");
    const vigenciaId = await fixtureFila(clienteId, en(0), en(9), "PERSONALIZADO");

    const res = await patchServicio(clienteId, vigenciaId, {
      fechaInicio: en(1),
      fechaFin: en(10),
      version: 1,
    });

    expect(res.statusCode).toBe(200);
    expect(parseBody(res).version).toBe(2);
  });
});

// ─── INC05-PER-02 / PER-03 / PER-04 — GET y estados calculados ──────────────

describe("INC05-PER-02 GET calcula estados con America/Bogota e inclusivos (DEC-005/006, DEC-043)", () => {
  it("PER-02 sin vigencias responde 200 con lista vacia y fechaActual (NO_CONTRATADO implicito)", async () => {
    const clienteId = await crearCliente();

    const res = await getServicios(clienteId);

    expect(res.statusCode).toBe(200);
    const cuerpo = listarServicioPersonalizadoSchema.parse(parseBody(res));
    expect(cuerpo.servicios).toEqual([]);
    expect(cuerpo.fechaActual).toBe(hoy());
  });

  it("PER-02 la vigencia sigue ACTIVA en su dia final inclusivo (hoy == fechaFin)", async () => {
    const clienteId = await crearCliente();
    await fixtureFila(clienteId, en(-10), en(0), "PERSONALIZADO");

    const res = await getServicios(clienteId);

    expect(res.statusCode).toBe(200);
    const cuerpo = listarServicioPersonalizadoSchema.parse(parseBody(res));
    expect(cuerpo.servicios).toHaveLength(1);
    expect(cuerpo.servicios[0].estado).toBe("ACTIVA");
    expect(cuerpo.servicios[0].fechaFin).toBe(en(0));
  });

  it("PER-02 la vigencia queda VENCIDA al dia siguiente de su fecha fin (hoy == fechaFin + 1)", async () => {
    const clienteId = await crearCliente();
    await fixtureFila(clienteId, en(-20), en(-1), "PERSONALIZADO");

    const res = await getServicios(clienteId);

    expect(res.statusCode).toBe(200);
    const cuerpo = listarServicioPersonalizadoSchema.parse(parseBody(res));
    expect(cuerpo.servicios[0].estado).toBe("VENCIDA");
  });

  it("PER-02 un periodo futuro se muestra como PROGRAMADA (literal fijado por DEC-043)", async () => {
    const clienteId = await crearCliente();
    await fixtureFila(clienteId, en(5), en(30), "PERSONALIZADO");

    const res = await getServicios(clienteId);

    expect(res.statusCode).toBe(200);
    const cuerpo = listarServicioPersonalizadoSchema.parse(parseBody(res));
    expect(cuerpo.servicios[0].estado).toBe("PROGRAMADA");
  });

  it("PER-02 el listado ordena por fechaInicio descendente con los DOS periodos de una renovacion", async () => {
    const clienteId = await crearCliente();
    await fixtureFila(clienteId, en(0), en(9), "PERSONALIZADO");
    await fixtureFila(clienteId, en(10), en(19), "PERSONALIZADO");

    const res = await getServicios(clienteId);

    expect(res.statusCode).toBe(200);
    const cuerpo = listarServicioPersonalizadoSchema.parse(parseBody(res));
    expect(cuerpo.servicios.map((fila) => fila.fechaInicio)).toEqual([
      en(10),
      en(0),
    ]);
  });

  it("PER-02 con datos mixtos (GYM + PERSONALIZADO + NUTRICION) el listado SOLO devuelve filas PERSONALIZADO (incompatibilidad #1)", async () => {
    const clienteId = await crearCliente();
    await fixtureFila(clienteId, en(-30), en(-20), "GYM");
    await fixtureFila(clienteId, en(-10), en(10), "PERSONALIZADO");
    await fixtureFila(clienteId, en(20), en(40), "NUTRICION");

    const res = await getServicios(clienteId);

    expect(res.statusCode).toBe(200);
    const cuerpo = listarServicioPersonalizadoSchema.parse(parseBody(res));
    expect(cuerpo.servicios).toHaveLength(1);
    expect(cuerpo.servicios[0].fechaInicio).toBe(en(-10));
    expect(parseBody(res).servicios[0].tipoServicio).toBe("PERSONALIZADO");
  });

  it("PER-02 el GET de un cliente inexistente responde 404 'Cliente no encontrado' (divergencia deliberada C6 del espejo gym)", async () => {
    const res = await getServicios("cliente-inexistente-inc05");

    expect(res.statusCode).toBe(404);
    expect(parseBody(res).code).toBe("NOT_FOUND");
    expect(parseBody(res).error).toBe(MSG_CLIENTE_404);
  });

  it("PER-02 el rol CLIENTE recibe 403 AUTH_FORBIDDEN en el listado", async () => {
    const clienteId = await crearCliente();
    clienteSeq += 1;
    const portal = await prisma.cliente.create({
      data: {
        cedula: `${cedulaPrefix}${String(clienteSeq).padStart(6, "0")}`,
        nombres: "Cliente",
        apellidos: "Portal Inc05",
        telefono: "3000000000",
        sedeId,
        pin: await bcrypt.hash(pin, 4),
        estado: "ACTIVO",
      },
    });
    const tokenCliente = await loginCliente(portal.cedula);

    const res = await getServicios(clienteId, tokenCliente);

    expect(res.statusCode).toBe(403);
    expect(parseBody(res).code).toBe("AUTH_FORBIDDEN");
    expect(parseBody(res).error).toBe(MSG_FORBIDDEN);
  });
});

describe("INC05-PER-03 el estado CONGELADO con una pausa de INC-02 y el regreso al calculo normal", () => {
  it("PER-03 con una pausa vigente creada por /congelar el estado calculado es CONGELADO (literal DEC-043)", async () => {
    const clienteId = await crearCliente();
    const vigenciaId = await fixtureFila(clienteId, en(-10), en(10), "PERSONALIZADO");

    const pausa = await congelarVigencia(clienteId, vigenciaId, en(0), en(2));
    expect(pausa.statusCode).toBe(200);

    const res = await getServicios(clienteId);

    expect(res.statusCode).toBe(200);
    const cuerpo = listarServicioPersonalizadoSchema.parse(parseBody(res));
    expect(cuerpo.servicios[0].estado).toBe("CONGELADO");
  });

  it("PER-03 al terminar la pausa el estado vuelve al calculo normal con fechaFin ya extendida", async () => {
    const clienteId = await crearCliente();
    const vigenciaId = await fixtureFila(clienteId, en(-10), en(10), "PERSONALIZADO");

    const pausa = await congelarVigencia(clienteId, vigenciaId, en(0), en(2));
    expect(pausa.statusCode).toBe(200);
    const diasCongelados = parseBody(pausa).diasCongelados as number;
    expect(diasCongelados).toBeGreaterThan(0);
    const finTrasPausa = parseBody(pausa).fechaFin as string;

    // Simula el paso del tiempo: la pausa dejo de cubrir hoy.
    await prisma.membresiaGymCambio.updateMany({
      where: { membresiaId: vigenciaId, accion: "CONGELACION" },
      data: { congelacionFin: en(-1) },
    });

    const res = await getServicios(clienteId);

    expect(res.statusCode).toBe(200);
    const cuerpo = listarServicioPersonalizadoSchema.parse(parseBody(res));
    expect(cuerpo.servicios[0].estado).toBe("ACTIVA");
    // La extension aceptada por HU-15 se conserva tras el fin de la pausa.
    expect(cuerpo.servicios[0].fechaFin).toBe(finTrasPausa);
  });
});

describe("INC05-PER-04 la vigencia es visible en la ficha del cliente con tipoServicio y estado", () => {
  it("PER-04 la ficha GET /clientes/:id muestra la fila PERSONALIZADO con su tipoServicio y estado calculado", async () => {
    const clienteId = await crearCliente();
    await fixtureFila(clienteId, en(-10), en(10), "PERSONALIZADO");

    const res = await app.inject({
      method: "GET",
      url: `/clientes/${clienteId}`,
      headers: headers(),
    });

    expect(res.statusCode).toBe(200);
    const ficha = parseBody(res);
    const fila = ficha.membresias.find(
      (membresia: { tipoServicio: string }) =>
        membresia.tipoServicio === "PERSONALIZADO"
    );
    expect(fila).toBeDefined();
    expect(fila.fechaInicio).toBe(en(-10));
    expect(fila.fechaFin).toBe(en(10));
    expect(fila.estado).toBe("ACTIVA");
  });

  it("PER-04 la ficha expone cada fila CON su tipoServicio cuando el cliente tiene los tres tipos (GYM, PERSONALIZADO, NUTRICION)", async () => {
    const clienteId = await crearCliente();
    await fixtureFila(clienteId, en(-30), en(-20), "GYM");
    await fixtureFila(clienteId, en(-10), en(10), "PERSONALIZADO");
    await fixtureFila(clienteId, en(20), en(40), "NUTRICION");

    const res = await app.inject({
      method: "GET",
      url: `/clientes/${clienteId}`,
      headers: headers(),
    });

    expect(res.statusCode).toBe(200);
    const tipos = parseBody(res)
      .membresias.map((membresia: { tipoServicio: string }) => membresia.tipoServicio)
      .sort();
    expect(tipos).toEqual(["GYM", "NUTRICION", "PERSONALIZADO"]);
  });
});

// ─── Regresiones exigidas por el spec (incompatibilidad #1 / correccion C1) ──

describe("INC-05 regresiones sobre rutas GYM aceptadas con clientes mixtos (fixture F8)", () => {
  it("REG-01 GET .../membresias-gym NO se contamina con filas PERSONALIZADO/NUTRICION (incompatibilidad #1)", async () => {
    const clienteId = await crearCliente();
    await fixtureFila(clienteId, en(-30), en(-20), "GYM");
    await fixtureFila(clienteId, en(-10), en(10), "PERSONALIZADO");
    await fixtureFila(clienteId, en(20), en(40), "NUTRICION");

    const res = await app.inject({
      method: "GET",
      url: `/clientes/${clienteId}/membresias-gym`,
      headers: headers(),
    });

    expect(res.statusCode).toBe(200);
    const filas = parseBody(res).membresias as Array<{ tipoServicio: string }>;
    expect(filas).toHaveLength(1);
    expect(filas[0].tipoServicio).toBe("GYM");
  });

  it("REG-02 crear una membresia GYM que solapa SOLO una fila PERSONALIZADA responde 201 (el solape es por tipo, DEC-004)", async () => {
    const clienteId = await crearCliente();
    await fixtureFila(clienteId, en(-10), en(10), "PERSONALIZADO");

    const res = await app.inject({
      method: "POST",
      url: `/clientes/${clienteId}/membresias-gym`,
      headers: headers(),
      payload: { fechaInicio: en(-10), fechaFin: en(10) },
    });

    expect(res.statusCode).toBe(201);
    expect(parseBody(res).tipoServicio).toBe("GYM");
    expect(await contarFilas(clienteId, "GYM")).toBe(1);
  });

  it("REG-03 (correccion C1) congelar una vigencia GYM no produce 409 MEMBRESIA_SOLAPADA espurio por una fila PERSONALIZADO solapada", async () => {
    const clienteId = await crearCliente();
    const vigenciaGym = await fixtureFila(clienteId, en(0), en(9), "GYM");
    await fixtureFila(clienteId, en(4), en(8), "PERSONALIZADO");

    // Enmendado (fecha de fixture): `calcularEstado` (INC-02 ratificado) solo
    // devuelve CONGELADO si HOY cae dentro de la pausa, por lo que el rango
    // debe cubrir hoy (mismo patron que PER-03 arriba y que REG-04 en HU-14).
    const res = await congelarVigencia(clienteId, vigenciaGym, en(0), en(2));

    expect(res.statusCode).toBe(200);
    expect(parseBody(res).estado).toBe("CONGELADO");
  });
});
