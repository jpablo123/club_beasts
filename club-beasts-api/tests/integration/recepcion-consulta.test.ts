/**
 * INC-03 (HU-29 + HU-16 b3) — RED de la consulta de recepcion por cedula.
 *
 * Criterios: `INC03-REC-01..10` (HU29-C01..C10), la superficie **recepcion** de
 * `INC03-VEN-03` y DEC-028 (alertas derivadas del estado), DEC-029 (`foto`
 * siempre `null`: no existe `Cliente.foto`), DEC-001 (permisos), DEC-002
 * (cedula), DEC-005/006 (America/Bogota, extremos inclusivos).
 *
 * Estado RED (2026-10-13): **no existe** `GET /recepcion/consulta` en
 * `src/routes/` (solo `auth.ts`, `clientes.ts`, `membresia.ts`), por lo que
 * toda peticion cae en el 404 de Fastify (`Route ... not found`, cuerpo sin
 * `code`) en lugar de 200/400/401/403/404: todos los tests de este archivo
 * fallan (RED). Las aserciones exigen los `code`/mensaje exactos del spec, de
 * modo que ese 404 no puede pasar por accidente.
 *
 * GREEN (backend-developer): crear `src/routes/recepcion.ts` con la consulta y
 * agregar `await app.register(recepcionRoutes)` al app de este archivo (un
 * import + una linea; ninguna asercion cambia).
 *
 * Fixtures (spec INC-03 F1/F2/F5/F11/F12/F13/F14): fechas dinamicas relativas
 * a `getTodayBogota()` (DEC-013); ingresos escritos directamente en la BD (la
 * entidad `Ingreso` ya existe en `prisma/schema.prisma`); aislamiento por
 * prefijo de cedula 9933 (DEC-012).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import bcrypt from "bcryptjs";
import prisma from "../../src/lib/prisma";
import authRoutes from "../../src/routes/auth";
import clienteRoutes from "../../src/routes/clientes";
import membresiaRoutes from "../../src/routes/membresia";
import recepcionRoutes from "../../src/routes/recepcion";
import prismaPlugin from "../../src/plugins/prisma";
import authPlugin from "../../src/plugins/auth";
import { getTodayBogota } from "../../src/services/membresia.service";
import { consultaRecepcionResponseSchema } from "../../features/acceptance-criteria/HU-29-schemas";

const cedulaPrefix = "9933";
const pin = "1234";
const SEDE_PRINCIPAL = "sede-1";
const SEDE_SECUNDARIA = "sede-2";
const CEDULA_INEXISTENTE = "99999999";

/** DEC-013: todo el archivo se calcula sobre la fecha real de Bogota. */
const HOY = getTodayBogota();

let app: any;
let tokenOwner = "";
let tokenRecep = "";
let tokenCliente = "";
let ownerUserId = "";
let recepUserId = "";
let clienteSeq = 0;

let activaId = "";
let activaCedula = "";
let vencidaCedula = "";
let sinVigenciaCedula = "";
let congeladoId = "";
let suspendidoCedula = "";

/** PIN y contacto conocidos de la fixture "sensible" (HU29-C10). */
const EMAIL_SENSIBLE = "sensible.inc03@clubbeasts.test";
const TELEFONO_SENSIBLE = "3009999999";
let pinHasheadoSensible = "";

function parseBody(res: { body: string }) {
  return JSON.parse(res.body);
}

function headers(token: string) {
  return { authorization: `Bearer ${token}` };
}

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
  await prisma.membresiaGym.deleteMany({ where: { id: { in: membresiaIds } } });
  await prisma.cliente.deleteMany({
    where: { cedula: { startsWith: cedulaPrefix } },
  });
}

async function crearCliente(
  opciones: {
    estado?: string;
    nombres?: string;
    apellidos?: string;
    email?: string;
    telefono?: string;
  } = {}
): Promise<{ id: string; cedula: string }> {
  clienteSeq += 1;
  const cedula = `${cedulaPrefix}${String(clienteSeq).padStart(6, "0")}`;
  const hashed = await bcrypt.hash(pin, 4);
  const cliente = await prisma.cliente.create({
    data: {
      cedula,
      nombres: opciones.nombres ?? "Consulta",
      apellidos: opciones.apellidos ?? `Cliente${clienteSeq}`,
      telefono: opciones.telefono ?? "3000000000",
      email: opciones.email,
      sedeId: SEDE_PRINCIPAL,
      pin: hashed,
      estado: opciones.estado ?? "ACTIVO",
    },
  });
  return { id: cliente.id, cedula };
}

async function crearVigencia(
  clienteId: string,
  fechaInicio: string,
  fechaFin: string
): Promise<string> {
  const res = await app.inject({
    method: "POST",
    url: `/clientes/${clienteId}/membresias-gym`,
    headers: headers(tokenOwner),
    payload: { fechaInicio, fechaFin },
  });
  expect(res.statusCode).toBe(201);
  return parseBody(res).id;
}

/** Fila `Ingreso` escrita directamente en la BD (entidad creada por HU-30). */
async function crearIngresoDirecto(
  clienteId: string,
  datos: { fecha: string; hora: string; sedeId?: string }
) {
  return prisma.ingreso.create({
    data: {
      clienteId,
      sedeId: datos.sedeId ?? SEDE_PRINCIPAL,
      registradoPorId: recepUserId,
      fecha: datos.fecha,
      hora: datos.hora,
    },
  });
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

function consultar(cedula: string, token?: string) {
  return app.inject({
    method: "GET",
    url: `/recepcion/consulta?cedula=${cedula}`,
    headers: token ? headers(token) : undefined,
  });
}

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? "inc03-consulta-secret";

  await cleanupFixtures();

  app = Fastify();
  await app.register(prismaPlugin);
  await app.register(authPlugin);
  await app.register(authRoutes);
  await app.register(clienteRoutes);
  await app.register(membresiaRoutes);
  await app.register(recepcionRoutes);
  await app.ready();

  const owner = await loginStaff("admin@clubbeasts.com", "admin123");
  tokenOwner = owner.token;
  ownerUserId = owner.id;
  const recep = await loginStaff("recep@clubbeasts.com", "recep123");
  tokenRecep = recep.token;
  recepUserId = recep.id;

  // F1 + datos sensibles (HU29-C10): email, telefono y PIN cargados.
  const activa = await crearCliente({
    email: EMAIL_SENSIBLE,
    telefono: TELEFONO_SENSIBLE,
    nombres: "Ana Maria",
    apellidos: "Lopez Ruiz",
  });
  activaId = activa.id;
  activaCedula = activa.cedula;
  pinHasheadoSensible = (
    await prisma.cliente.findUniqueOrThrow({ where: { id: activa.id } })
  ).pin;
  await crearVigencia(activaId, dia(-30), dia(30));

  // Token CLIENTE propio (DEC-001).
  tokenCliente = await loginCliente(activaCedula);

  // F2: VENCIDA (hoy = fechaFin + 1).
  const vencida = await crearCliente();
  vencidaCedula = vencida.cedula;
  await crearVigencia(vencida.id, dia(-30), dia(-1));

  // F4: sin ninguna vigencia GYM.
  const sinVigencia = await crearCliente();
  sinVigenciaCedula = sinVigencia.cedula;

  // F5: CONGELADO (pausa que cubre hoy).
  const congelado = await crearCliente();
  congeladoId = congelado.id;
  const vigenciaCongelada = await crearVigencia(congelado.id, dia(-30), dia(30));
  const pausa = await app.inject({
    method: "POST",
    url: `/clientes/${congelado.id}/vigencias/${vigenciaCongelada}/congelar`,
    headers: headers(tokenOwner),
    payload: {
      fechaInicio: dia(-1),
      fechaFin: dia(1),
      motivo: "Vacaciones recepcion",
      version: 1,
    },
  });
  expect(pausa.statusCode).toBe(200);

  // F12: SUSPENDIDO con membresia ACTIVA (DEC-028 / DEC-030).
  const suspendido = await crearCliente({ estado: "SUSPENDIDO" });
  suspendidoCedula = suspendido.cedula;
  await crearVigencia(suspendido.id, dia(-30), dia(30));

  // F9: cliente con 2 ingresos previos (ayer 18:30 y hoy 07:15).
  await crearIngresoDirecto(activaId, {
    fecha: dia(-1),
    hora: "18:30:00",
    sedeId: SEDE_PRINCIPAL,
  });
  await crearIngresoDirecto(activaId, {
    fecha: dia(0),
    hora: "07:15:00",
    sedeId: SEDE_SECUNDARIA,
  });

  // Token CLIENTE para la fixture "sensible" no es necesario: se usa el de activa.
  expect(activaId).toBeTruthy();
});

afterAll(async () => {
  await app.close();
  await cleanupFixtures();
});

// ─── INC03-REC-01 / REC-02 / REC-03 / REC-09 ─────────────────────────────────

describe("INC03-REC-01..03 consulta 200 con identidad, sede y estado real", () => {
  it("INC03-REC-01/09 responde 200 con un unico objeto cliente (nunca array) y schema G14", async () => {
    const res = await consultar(activaCedula, tokenRecep);

    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    expect(Array.isArray(body)).toBe(false);
    expect(typeof body).toBe("object");
    expect(body.id).toBe(activaId);
    expect(body.nombreCompleto).toBe("Ana Maria Lopez Ruiz");
    expect(body.cedula).toBe(activaCedula);
    expect(body.sede.id).toBe(SEDE_PRINCIPAL);
    expect(body.sede.nombre).toBe("Sede Principal");
    expect(consultaRecepcionResponseSchema.parse(body)).toBeTruthy();
  });

  it("INC03-REC-02/03 estadoAccesoGym ACTIVA, fechaVencimiento y congelacion null", async () => {
    const res = await consultar(activaCedula, tokenRecep);

    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.estadoAccesoGym).toBe("ACTIVA");
    expect(body.fechaVencimiento).toBe(dia(30));
    expect(body.congelacion).toBeNull();
    expect(body.fechaActual).toBe(HOY);
  });

  it("INC03-REC-01 la foto viaja siempre null (DEC-029: no existe Cliente.foto)", async () => {
    const res = await consultar(activaCedula, tokenOwner);

    expect(res.statusCode).toBe(200);
    expect(parseBody(res).foto).toBeNull();
  });

  it("INC03-REC-02 sin vigencia GYM -> SIN_VIGENCIA y fechaVencimiento null", async () => {
    const res = await consultar(sinVigenciaCedula, tokenRecep);

    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.estadoAccesoGym).toBe("SIN_VIGENCIA");
    expect(body.fechaVencimiento).toBeNull();
    expect(body.congelacion).toBeNull();
  });

  it("INC03-REC-03 congelacion vigente -> CONGELADO con el rango de la pausa", async () => {
    const res = await consultar(
      (
        await prisma.cliente.findUniqueOrThrow({ where: { id: congeladoId } })
      ).cedula,
      tokenRecep
    );

    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.estadoAccesoGym).toBe("CONGELADO");
    expect(body.congelacion).toEqual({
      fechaInicio: dia(-1),
      fechaFin: dia(1),
    });
  });
});

// ─── INC03-REC-04 ────────────────────────────────────────────────────────────

describe("INC03-REC-04 ultimo ingreso", () => {
  it("INC03-REC-04 devuelve el ingreso mas reciente (hoy 07:15, sede secundaria)", async () => {
    const res = await consultar(activaCedula, tokenRecep);

    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.ultimoIngreso).not.toBeNull();
    expect(body.ultimoIngreso.fecha).toBe(dia(0));
    expect(body.ultimoIngreso.hora).toMatch(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/);
    expect(body.ultimoIngreso.sede.id).toBe(SEDE_SECUNDARIA);
    expect(body.ultimoIngreso.sede.nombre).toBe("Sede Secundaria");
  });

  it("INC03-REC-04 cliente que nunca ingreso -> ultimoIngreso null", async () => {
    const res = await consultar(vencidaCedula, tokenRecep);

    expect(res.statusCode).toBe(200);
    expect(parseBody(res).ultimoIngreso).toBeNull();
  });
});

// ─── INC03-REC-05 (DEC-028) ──────────────────────────────────────────────────

describe("INC03-REC-05 alertas derivadas del estado (DEC-028)", () => {
  it("INC03-REC-05 cliente ACTIVO con membresia ACTIVA -> alertas []", async () => {
    const res = await consultar(activaCedula, tokenRecep);

    expect(res.statusCode).toBe(200);
    expect(parseBody(res).alertas).toEqual([]);
  });

  it("INC03-REC-05 SUSPENDIDO con membresia ACTIVA -> ESTADO_CLIENTE con mensaje exacto", async () => {
    const res = await consultar(suspendidoCedula, tokenRecep);

    expect(res.statusCode).toBe(200);
    expect(parseBody(res).alertas).toEqual([
      {
        codigo: "ESTADO_CLIENTE",
        mensaje: "El cliente tiene estado SUSPENDIDO",
      },
    ]);
  });

  it("INC03-REC-05 membresia VENCIDA -> MEMBRESIA_VENCIDA con la fecha exacta", async () => {
    const res = await consultar(vencidaCedula, tokenRecep);

    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.estadoAccesoGym).toBe("VENCIDA");
    expect(body.alertas).toEqual([
      {
        codigo: "MEMBRESIA_VENCIDA",
        mensaje: `La membresía venció el ${dia(-1)}`,
      },
    ]);
  });

  it("INC03-REC-05 SUSPENDIDO + VENCIDA -> ambas alertas en ese orden", async () => {
    const doble = await crearCliente({ estado: "RETIRADO" });
    await crearVigencia(doble.id, dia(-30), dia(-1));

    const res = await consultar(doble.cedula, tokenRecep);

    expect(res.statusCode).toBe(200);
    expect(parseBody(res).alertas).toEqual([
      { codigo: "ESTADO_CLIENTE", mensaje: "El cliente tiene estado RETIRADO" },
      {
        codigo: "MEMBRESIA_VENCIDA",
        mensaje: `La membresía venció el ${dia(-1)}`,
      },
    ]);
  });
});

// ─── INC03-REC-06 / REC-07 ───────────────────────────────────────────────────

describe("INC03-REC-06 y INC03-REC-07 validacion de cedula", () => {
  const invalidas = ["ABC", "12345", "12345678901", ""];

  for (const cedula of invalidas) {
    it(`INC03-REC-06 cedula "${cedula}" responde 400 VALIDATION_ERROR con el mensaje exacto`, async () => {
      const res = await consultar(cedula, tokenRecep);

      expect(res.statusCode).toBe(400);
      const body = parseBody(res);
      expect(body.code).toBe("VALIDATION_ERROR");
      expect(body.error).toBe(
        "Cédula debe ser numérica de 6 a 10 dígitos"
      );
    });
  }

  it("INC03-REC-06 cedula ausente del query responde 400 'Cédula es requerida'", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/recepcion/consulta",
      headers: headers(tokenRecep),
    });

    expect(res.statusCode).toBe(400);
    const body = parseBody(res);
    expect(body.code).toBe("VALIDATION_ERROR");
    expect(body.error).toBe("Cédula es requerida");
  });

  it("INC03-REC-07 cedula bien formada inexistente responde 404 NOT_FOUND", async () => {
    const res = await consultar(CEDULA_INEXISTENTE, tokenRecep);

    expect(res.statusCode).toBe(404);
    const body = parseBody(res);
    expect(body.code).toBe("NOT_FOUND");
    expect(body.error).toBe("Cliente no encontrado");
  });
});

// ─── INC03-REC-08 ────────────────────────────────────────────────────────────

describe("INC03-REC-08 permisos DEC-001 de la consulta", () => {
  it("INC03-REC-08 sin token responde 401 AUTH_TOKEN_MISSING", async () => {
    const res = await consultar(activaCedula);
    expect(res.statusCode).toBe(401);
    expect(parseBody(res).code).toBe("AUTH_TOKEN_MISSING");
  });

  it("INC03-REC-08 token CLIENTE responde 403 AUTH_FORBIDDEN", async () => {
    const res = await consultar(activaCedula, tokenCliente);
    expect(res.statusCode).toBe(403);
    expect(parseBody(res).code).toBe("AUTH_FORBIDDEN");
    expect(parseBody(res).error).toBe(
      "No tienes permisos para realizar esta acción."
    );
  });

  it("INC03-REC-08 token DUENO responde 200", async () => {
    const res = await consultar(activaCedula, tokenOwner);
    expect(res.statusCode).toBe(200);
  });

  it("INC03-REC-08 token RECEPCIONISTA responde 200 (y 404 si la cedula no existe)", async () => {
    const existente = await consultar(activaCedula, tokenRecep);
    expect(existente.statusCode).toBe(200);

    const inexistente = await consultar(CEDULA_INEXISTENTE, tokenRecep);
    expect(inexistente.statusCode).toBe(404);
  });
});

// ─── INC03-REC-10 ────────────────────────────────────────────────────────────

describe("INC03-REC-10 la consulta no expone datos sensibles", () => {
  it("INC03-REC-10 la respuesta no contiene pin, hash, email, telefono, anamnesis ni notas", async () => {
    const res = await consultar(activaCedula, tokenRecep);

    expect(res.statusCode).toBe(200);
    const body = parseBody(res);

    // Campos prohibidos por el contrato (solo los de HU-29-schemas.ts).
    expect(body).not.toHaveProperty("pin");
    expect(body).not.toHaveProperty("contrasena");
    expect(body).not.toHaveProperty("hash");
    expect(body).not.toHaveProperty("email");
    expect(body).not.toHaveProperty("telefono");
    expect(body).not.toHaveProperty("observaciones");
    expect(body).not.toHaveProperty("anamnesis");
    expect(body).not.toHaveProperty("notas");
    expect(body).not.toHaveProperty("debeCambiarPin");

    // Valores concretos de la fixture: tampoco pueden filtrarse.
    const serializado = JSON.stringify(body);
    expect(serializado).not.toContain(EMAIL_SENSIBLE);
    expect(serializado).not.toContain(TELEFONO_SENSIBLE);
    expect(serializado).not.toContain(pinHasheadoSensible);
  });
});
