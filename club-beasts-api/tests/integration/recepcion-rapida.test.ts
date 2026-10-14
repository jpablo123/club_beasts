/**
 * INC-03 (HU-31) — RED de la creacion rapida de cliente desde recepcion.
 *
 * Criterios: `INC03-RAP-01..07` (HU31-C01..C07) con las decisiones ratificadas
 * DEC-031 (`sedeId` opcional con default de la sede del token),
 * DEC-032 (marca `perfilPendiente` persistida, campo nuevo ya migrado),
 * DEC-033 (la marca se limpia al tener `email` tras el PATCH), DEC-001
 * (permisos), DEC-002 (cedula unica -> 409) y el precedente HU-04
 * (`POST /clientes`).
 *
 * Estado RED (2026-10-13): **no existe** `POST /recepcion/clientes-rapidos`
 * en `src/routes/` (solo `auth.ts`, `clientes.ts`, `membresia.ts`), por lo que
 * toda peticion cae en el 404 de Fastify (`Route ... not found`, cuerpo sin
 * `code`) en lugar de 201/400/401/403/409: todos los tests de este archivo
 * fallan (RED). Ninguno puede pasar por accidente: los 201 exigen el schema G14
 * `clienteRapidoResponseSchema`, los 400/409 exigen `code` y mensaje exactos.
 *
 * GREEN (backend-developer): crear `src/routes/recepcion.ts` con la creacion
 * rapida (reutilizando `createCliente()` con `perfilPendiente: true`) y agregar
 * `await app.register(recepcionRoutes)` al app de este archivo (un import + una
 * linea; ninguna asercion cambia). Dos huecos de implementacion que el RED deja
 * a la vista (documentados aqui, no son fallas del test):
 * 1. `User.sedeId` **no existe** en `prisma/schema.prisma` (el `User` de seed
 *    tampoco lo trae): DEC-031 exige derivar la sede default del token, asi que
 *    el GREEN necesita esa columna (o una fuente equivalente) + backfill del
 *    seed. Mientras exista solo el camino "sedeId explicito", el caso RAP-01
 *    sin `sedeId` sigue en rojo.
 * 2. `selectFichaCliente` (`src/services/cliente.service.ts:52`) no selecciona
 *    `perfilPendiente`, por lo que `GET /clientes/:id` no lo expone aun: es lo
 *    que hace fallar RAP-02 y RAP-03 sobre la lectura posterior (RAP-02 tambien
 *    verifica la fila en BD directamente).
 * Los campos minimos faltantes (HU31-C04 e) se asertan solo como
 * 400 `VALIDATION_ERROR` sin mensaje exacto: `src/schemas/common.schema.ts` no
 * define `required_error` (Zod emite "Required"), y el contrato de mensajes
 * unicos de esta ruta (`errors.join(", ")`) aun no existe. Precedente identico
 * aceptado en HU-04 (`tests/integration/clientes.test.ts:130-138`).
 *
 * Fixtures (spec INC-03 F10/F11/F13/F14): fechas dinamicas con
 * `getTodayBogota()`; aislamiento por prefijo de cedula 9935 (DEC-012); el
 * cliente duplicado del RAP-07 se crea directo en BD para no depender del alta
 * rapida dentro del propio archivo RED.
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
import { clienteRapidoResponseSchema } from "../../features/acceptance-criteria/HU-31-schemas";

const cedulaPrefix = "9935";
const pin = "1234";
const SEDE_PRINCIPAL = "sede-1";
const SEDE_SECUNDARIA = "sede-2";
const SEDE_INEXISTENTE = "sede-inexistente-000";

let app: any;
let tokenOwner = "";
let tokenRecep = "";
let tokenCliente = "";
let recepUserId = "";
let ownerUserId = "";
let clienteSeq = 0;

/** Cedula fixture creada directo en BD para el 409 del RAP-07. */
const CEDULA_EXISTENTE = `${cedulaPrefix}999999`;
let clienteExistenteId = "";

function parseBody(res: { body: string }) {
  return JSON.parse(res.body);
}

function headers(token: string) {
  return { authorization: `Bearer ${token}` };
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

/** Cliente fixture directo en BD (solo para duplicado y sesion CLIENTE). */
async function crearClienteDirecto(
  opciones: { cedula?: string } = {}
): Promise<{ id: string; cedula: string }> {
  clienteSeq += 1;
  const cedula = opciones.cedula ?? `${cedulaPrefix}${String(clienteSeq).padStart(6, "0")}`;
  const cliente = await prisma.cliente.create({
    data: {
      cedula,
      nombres: "Rapido",
      apellidos: `Cliente${clienteSeq}`,
      telefono: "3000000000",
      sedeId: SEDE_PRINCIPAL,
      pin: await bcrypt.hash(pin, 4),
      estado: "ACTIVO",
    },
  });
  return { id: cliente.id, cedula };
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

/** Cedula unica por test (nunca reutiliza entre casos). */
function nuevaCedula(): string {
  clienteSeq += 1;
  return `${cedulaPrefix}${String(clienteSeq).padStart(6, "0")}`;
}

function postRapido(payload: Record<string, unknown>, token?: string) {
  return app.inject({
    method: "POST",
    url: "/recepcion/clientes-rapidos",
    headers: token ? headers(token) : undefined,
    payload,
  });
}

async function contarPorCedula(cedula: string): Promise<number> {
  return prisma.cliente.count({ where: { cedula } });
}

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? "inc03-rapida-secret";

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

  // F10 no aplica aun (la marca la pone el flujo rapido, que no existe): el
  // duplicado del RAP-07 y la sesion CLIENTE del RAP-05 se crean directos.
  const existente = await crearClienteDirecto({ cedula: CEDULA_EXISTENTE });
  clienteExistenteId = existente.id;
  const propio = await crearClienteDirecto();
  tokenCliente = await loginCliente(propio.cedula);
});

afterAll(async () => {
  await app.close();
  await cleanupFixtures();
});

// ─── INC03-RAP-01 / RAP-06 ───────────────────────────────────────────────────

describe("INC03-RAP-01 y INC03-RAP-06 creacion rapida con el minimo de datos", () => {
  it("INC03-RAP-01/06 body minimo sin sedeId responde 201 con estado NUEVO, perfilPendiente true y creadoPor del actor (schema G14)", async () => {
    const cedula = nuevaCedula();

    const res = await postRapido(
      {
        cedula,
        nombres: "Maria Fernanda",
        apellidos: "Garcia Lopez",
        telefono: "3101234567",
      },
      tokenRecep
    );

    expect(res.statusCode).toBe(201);
    const body = parseBody(res);
    expect(clienteRapidoResponseSchema.parse(body)).toBeTruthy();
    expect(body.cedula).toBe(cedula);
    expect(body.estado).toBe("NUEVO");
    expect(body.perfilPendiente).toBe(true);
    expect(body.email).toBeNull();
    expect(body.creadoPor).toEqual({ id: recepUserId, nombre: expect.any(String) });
    // DEC-031: sede efectiva viaja en la respuesta para que la UI sepa a que
    // sede quedo asignado el cliente (default del token o la enviada).
    expect(typeof body.sede.id).toBe("string");
    expect(body.sede.id.length).toBeGreaterThan(0);
    expect(typeof body.sede.nombre).toBe("string");
    expect(body.sede.nombre.length).toBeGreaterThan(0);
  });

  it("INC03-RAP-01 la sede efectiva de la respuesta es la que persiste el cliente (lectura posterior)", async () => {
    const cedula = nuevaCedula();

    const creacion = await postRapido(
      {
        cedula,
        nombres: "Pedro",
        apellidos: "Sanchez",
        telefono: "3109998888",
      },
      tokenRecep
    );
    expect(creacion.statusCode).toBe(201);
    const creado = parseBody(creacion);

    const ficha = await app.inject({
      method: "GET",
      url: `/clientes/${creado.id}`,
      headers: headers(tokenOwner),
    });

    expect(ficha.statusCode).toBe(200);
    const fichaBody = parseBody(ficha);
    expect(fichaBody.cedula).toBe(cedula);
    expect(fichaBody.sede.id).toBe(creado.sede.id);
  });

  it("INC03-RAP-01 sedeId explicito se respeta (201 con esa sede)", async () => {
    const cedula = nuevaCedula();

    const res = await postRapido(
      {
        cedula,
        nombres: "Laura",
        apellidos: "Martinez",
        telefono: "3112223333",
        sedeId: SEDE_SECUNDARIA,
      },
      tokenOwner
    );

    expect(res.statusCode).toBe(201);
    const body = parseBody(res);
    expect(body.sede.id).toBe(SEDE_SECUNDARIA);
    expect(body.sede.nombre).toBe("Sede Secundaria");
  });

  it("INC03-RAP-01 body con los opcionales email y observaciones tambien responde 201", async () => {
    const cedula = nuevaCedula();

    const res = await postRapido(
      {
        cedula,
        nombres: "Carlos",
        apellidos: "Rivas",
        telefono: "3123334444",
        email: "carlos.rivas@clubbeasts.test",
        observaciones: "Prefiere horario nocturno",
      },
      tokenRecep
    );

    expect(res.statusCode).toBe(201);
    const body = parseBody(res);
    expect(clienteRapidoResponseSchema.parse(body)).toBeTruthy();
    expect(body.email).toBe("carlos.rivas@clubbeasts.test");
    expect(body.observaciones).toBe("Prefiere horario nocturno");
  });
});

// ─── INC03-RAP-02 (persistencia de la marca) ─────────────────────────────────

describe("INC03-RAP-02 la marca de perfil pendiente queda persistida", () => {
  it("INC03-RAP-02 tras el 201 la fila en BD tiene perfilPendiente = true (no solo la respuesta)", async () => {
    const cedula = nuevaCedula();

    const creacion = await postRapido(
      {
        cedula,
        nombres: "Sofia",
        apellidos: "Herrera",
        telefono: "3134445555",
      },
      tokenRecep
    );
    expect(creacion.statusCode).toBe(201);
    const creado = parseBody(creacion);

    const fila = await prisma.cliente.findUnique({ where: { id: creado.id } });
    expect(fila).not.toBeNull();
    expect(fila!.perfilPendiente).toBe(true);
    expect(fila!.estado).toBe("NUEVO");
    expect(fila!.creadoPorId).toBe(recepUserId);
  });

  it("INC03-RAP-02 GET /clientes/:id (lectura posterior) expone perfilPendiente = true", async () => {
    const cedula = nuevaCedula();

    const creacion = await postRapido(
      {
        cedula,
        nombres: "Diego",
        apellidos: "Morales",
        telefono: "3145556666",
      },
      tokenRecep
    );
    expect(creacion.statusCode).toBe(201);
    const creado = parseBody(creacion);

    const ficha = await app.inject({
      method: "GET",
      url: `/clientes/${creado.id}`,
      headers: headers(tokenRecep),
    });

    expect(ficha.statusCode).toBe(200);
    const fichaBody = parseBody(ficha);
    expect(fichaBody.perfilPendiente).toBe(true);
  });
});

// ─── INC03-RAP-03 (DEC-033) ──────────────────────────────────────────────────

describe("INC03-RAP-03 el dueno completa el perfil rapido con PATCH /clientes/:id", () => {
  it("INC03-RAP-03 completar con email persiste los campos y limpia perfilPendiente (DEC-033)", async () => {
    const cedula = nuevaCedula();

    const creacion = await postRapido(
      {
        cedula,
        nombres: "Valentina",
        apellidos: "Ortiz",
        telefono: "3156667777",
      },
      tokenRecep
    );
    expect(creacion.statusCode).toBe(201);
    const creado = parseBody(creacion);

    const patch = await app.inject({
      method: "PATCH",
      url: `/clientes/${creado.id}`,
      headers: headers(tokenOwner),
      payload: {
        email: "valentina.ortiz@clubbeasts.test",
        observaciones: "Perfil completado por el dueno",
      },
    });

    expect(patch.statusCode).toBe(200);
    const patchBody = parseBody(patch);
    expect(patchBody.email).toBe("valentina.ortiz@clubbeasts.test");
    expect(patchBody.observaciones).toBe("Perfil completado por el dueno");

    const ficha = await app.inject({
      method: "GET",
      url: `/clientes/${creado.id}`,
      headers: headers(tokenOwner),
    });
    expect(ficha.statusCode).toBe(200);
    const fichaBody = parseBody(ficha);
    expect(fichaBody.email).toBe("valentina.ortiz@clubbeasts.test");
    expect(fichaBody.observaciones).toBe("Perfil completado por el dueno");
    // DEC-033: el cliente resultante tiene email -> la marca pasa a false.
    expect(fichaBody.perfilPendiente).toBe(false);

    const fila = await prisma.cliente.findUnique({ where: { id: creado.id } });
    expect(fila!.perfilPendiente).toBe(false);
    expect(fila!.actualizadoPorId).toBe(ownerUserId);
  });

  it("INC03-RAP-03 un PATCH sin email no cambia la marca (DEC-033)", async () => {
    const cedula = nuevaCedula();

    const creacion = await postRapido(
      {
        cedula,
        nombres: "Andres",
        apellidos: "Peña",
        telefono: "3167778888",
      },
      tokenRecep
    );
    expect(creacion.statusCode).toBe(201);
    const creado = parseBody(creacion);

    const patch = await app.inject({
      method: "PATCH",
      url: `/clientes/${creado.id}`,
      headers: headers(tokenOwner),
      payload: { observaciones: "Correccion de observaciones sin email" },
    });
    expect(patch.statusCode).toBe(200);

    const fila = await prisma.cliente.findUnique({ where: { id: creado.id } });
    expect(fila!.email).toBeNull();
    expect(fila!.perfilPendiente).toBe(true);
  });
});

// ─── INC03-RAP-04 (HU31-C04) ─────────────────────────────────────────────────

describe("INC03-RAP-04 validaciones de HU-04 sobre la nueva superficie", () => {
  const invalidasDeCedula = ["ABC", "12345", "12345678901"];
  for (const cedula of invalidasDeCedula) {
    it(`INC03-RAP-04 cedula "${cedula}" -> 400 VALIDATION_ERROR con el mensaje exacto y sin escritura`, async () => {
      const res = await postRapido(
        {
          cedula,
          nombres: "Prueba",
          apellidos: "Validacion",
          telefono: "3100000000",
        },
        tokenRecep
      );

      expect(res.statusCode).toBe(400);
      const body = parseBody(res);
      expect(body.code).toBe("VALIDATION_ERROR");
      expect(body.error).toContain(
        "Cédula debe ser numérica de 6 a 10 dígitos"
      );
      expect(await contarPorCedula(cedula)).toBe(0);
    });
  }

  it("INC03-RAP-04 telefono no movil -> 400 con el mensaje exacto de HU-04", async () => {
    const cedula = nuevaCedula();
    const res = await postRapido(
      {
        cedula,
        nombres: "Prueba",
        apellidos: "Validacion",
        telefono: "2101234567",
      },
      tokenRecep
    );

    expect(res.statusCode).toBe(400);
    const body = parseBody(res);
    expect(body.code).toBe("VALIDATION_ERROR");
    expect(body.error).toContain(
      "Teléfono debe ser móvil colombiano (3XXXXXXXXX)"
    );
    expect(await contarPorCedula(cedula)).toBe(0);
  });

  it("INC03-RAP-04 nombres con numero -> 400 con el mensaje exacto de HU-04", async () => {
    const cedula = nuevaCedula();
    const res = await postRapido(
      {
        cedula,
        nombres: "Juan123",
        apellidos: "Validacion",
        telefono: "3100000000",
      },
      tokenRecep
    );

    expect(res.statusCode).toBe(400);
    const body = parseBody(res);
    expect(body.code).toBe("VALIDATION_ERROR");
    expect(body.error).toContain(
      "Nombres solo pueden contener letras y espacios"
    );
    expect(await contarPorCedula(cedula)).toBe(0);
  });

  it("INC03-RAP-04 apellidos con numero -> 400 con el mensaje exacto de HU-04", async () => {
    const cedula = nuevaCedula();
    const res = await postRapido(
      {
        cedula,
        nombres: "Prueba",
        apellidos: "Perez1",
        telefono: "3100000000",
      },
      tokenRecep
    );

    expect(res.statusCode).toBe(400);
    const body = parseBody(res);
    expect(body.code).toBe("VALIDATION_ERROR");
    expect(body.error).toContain(
      "Apellidos solo pueden contener letras y espacios"
    );
    expect(await contarPorCedula(cedula)).toBe(0);
  });

  it("INC03-RAP-04 campo minimo faltante (nombres) -> 400 VALIDATION_ERROR sin escritura", async () => {
    const cedula = nuevaCedula();
    const res = await postRapido(
      {
        cedula,
        apellidos: "SinNombres",
        telefono: "3100000000",
      },
      tokenRecep
    );

    expect(res.statusCode).toBe(400);
    expect(parseBody(res).code).toBe("VALIDATION_ERROR");
    expect(await contarPorCedula(cedula)).toBe(0);
  });

  it("INC03-RAP-04 campo minimo faltante (telefono) -> 400 VALIDATION_ERROR sin escritura", async () => {
    const cedula = nuevaCedula();
    const res = await postRapido(
      { cedula, nombres: "Sin", apellidos: "Telefono" },
      tokenRecep
    );

    expect(res.statusCode).toBe(400);
    expect(parseBody(res).code).toBe("VALIDATION_ERROR");
    expect(await contarPorCedula(cedula)).toBe(0);
  });

  it("INC03-RAP-04 sedeId inexistente -> 400 con el mensaje proprio de sede y sin escritura", async () => {
    const cedula = nuevaCedula();
    const res = await postRapido(
      {
        cedula,
        nombres: "Prueba",
        apellidos: "Validacion",
        telefono: "3100000000",
        sedeId: SEDE_INEXISTENTE,
      },
      tokenRecep
    );

    expect(res.statusCode).toBe(400);
    const body = parseBody(res);
    expect(body.code).toBe("VALIDATION_ERROR");
    expect(body.error).toBe(
      "La sede indicada no existe. Verifique el identificador enviado."
    );
    expect(await contarPorCedula(cedula)).toBe(0);
  });
});

// ─── INC03-RAP-05 (DEC-001) ──────────────────────────────────────────────────

describe("INC03-RAP-05 permisos DEC-001 de la creacion rapida", () => {
  it("INC03-RAP-05 sin token -> 401 AUTH_TOKEN_MISSING", async () => {
    const cedula = nuevaCedula();
    const res = await postRapido({
      cedula,
      nombres: "Sin",
      apellidos: "Token",
      telefono: "3100000000",
    });

    expect(res.statusCode).toBe(401);
    expect(parseBody(res).code).toBe("AUTH_TOKEN_MISSING");
    expect(await contarPorCedula(cedula)).toBe(0);
  });

  it("INC03-RAP-05 token CLIENTE -> 403 AUTH_FORBIDDEN sin escritura", async () => {
    const cedula = nuevaCedula();
    const res = await postRapido(
      {
        cedula,
        nombres: "Cliente",
        apellidos: "Rol",
        telefono: "3100000000",
      },
      tokenCliente
    );

    expect(res.statusCode).toBe(403);
    const body = parseBody(res);
    expect(body.code).toBe("AUTH_FORBIDDEN");
    expect(body.error).toBe("No tienes permisos para realizar esta acción.");
    expect(await contarPorCedula(cedula)).toBe(0);
  });

  it("INC03-RAP-05 token DUENO -> 201", async () => {
    const cedula = nuevaCedula();
    const res = await postRapido(
      {
        cedula,
        nombres: "Dueño",
        apellidos: "Rol",
        telefono: "3100000000",
      },
      tokenOwner
    );

    expect(res.statusCode).toBe(201);
    expect(parseBody(res).creadoPor.id).toBe(ownerUserId);
  });

  it("INC03-RAP-05 token RECEPCIONISTA -> 201", async () => {
    const cedula = nuevaCedula();
    const res = await postRapido(
      {
        cedula,
        nombres: "Recepcion",
        apellidos: "Rol",
        telefono: "3100000000",
      },
      tokenRecep
    );

    expect(res.statusCode).toBe(201);
    expect(parseBody(res).creadoPor.id).toBe(recepUserId);
  });
});

// ─── INC03-RAP-07 (unicidad DEC-002) ─────────────────────────────────────────

describe("INC03-RAP-07 cedula duplicada responde 409 y no escribe una segunda fila", () => {
  it("INC03-RAP-07 misma cedula con datos distintos -> 409 DUPLICATE y count = 1", async () => {
    const antes = await contarPorCedula(CEDULA_EXISTENTE);
    expect(antes).toBe(1);

    const res = await postRapido(
      {
        cedula: CEDULA_EXISTENTE,
        nombres: "Otro",
        apellidos: "Nombre",
        telefono: "3199999999",
      },
      tokenRecep
    );

    expect(res.statusCode).toBe(409);
    const body = parseBody(res);
    expect(body.code).toBe("DUPLICATE");
    expect(body.error).toBe("Ya existe un cliente con esa cédula");
    expect(await contarPorCedula(CEDULA_EXISTENTE)).toBe(1);
    // El cliente original no fue pisado.
    const fila = await prisma.cliente.findUnique({
      where: { id: clienteExistenteId },
    });
    expect(fila!.nombres).toBe("Rapido");
  });
});
