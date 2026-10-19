/**
 * INC-04 (HU-08 + HU-17) — RED del cambio de estado del cliente con motivo,
 * historial transaccional y matriz de transiciones.
 *
 * Criterios: `INC04-CLI-02` (conservacion sin borrado fisico), `INC04-CLI-03`
 * (motivo + actor + ultimoCambio + errores/roles), `INC04-CLI-08`
 * (reactivacion DEC-020), `INC04-EST-02` (historial en la misma transaccion),
 * `INC04-EST-03` (motivo obligatorio, DEC-035), `INC04-EST-04` (acumulacion
 * N -> N+1), `INC04-EST-05` (matriz 5x5 ratificada DEC-038, 25 celdas) y
 * `DEC-041` (motivo solo staff).
 *
 * Estado RED (2026-10-19): el modelo `ClienteEstadoCambio` existe (migracion
 * #9 aplicada por database-admin) pero `src/` aun no lo usa: `grep
 * ultimoCambio|TRANSICION_INVALIDA|motivo` en `src/routes/clientes.ts` y
 * `src/services/cliente.service.ts` no arroja resultados; `updateClienteSchema`
 * no conoce `motivo` (lo stripa) y no hay validacion de transiciones. Por eso:
 *  - los 400 de motivo fallan hoy (el PATCH aplica el estado igual);
 *  - `ultimoCambio`/`motivo`/historial no existen en respuesta ni en BD;
 *  - la matriz no se evalua (todo 200 hoy) y RETIRADO no es terminal.
 * GREEN (backend-developer): `updateClienteSchema` + superRefine de G14,
 * `cliente.service` escribe cliente+historial en transaccion con la matriz
 * DEC-038 y `routes/clientes.ts` responde `motivo`/`ultimoCambio`.
 *
 * Fixtures: aislamiento por prefijo de cedula `9904` (DEC-012); fechas
 * relativas a `getTodayBogota()` (DEC-013); sedes reales `sede-1`/`sede-2`.
 * La limpieza borra `ClienteEstadoCambio` antes que `Cliente` (FK RESTRICT).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import bcrypt from "bcryptjs";
import prisma from "../../src/lib/prisma";
import authRoutes from "../../src/routes/auth";
import clienteRoutes from "../../src/routes/clientes";
import membresiaRoutes from "../../src/routes/membresia";
import portalRoutes from "../../src/routes/portal";
import prismaPlugin from "../../src/plugins/prisma";
import authPlugin from "../../src/plugins/auth";
import { getTodayBogota } from "../../src/services/membresia.service";
import {
  respuestaCambioEstadoSchema,
  fichaClienteResponseSchema,
  transicionesAprobadas,
  clasificarTransicion,
  type ClienteEstado,
} from "../../features/acceptance-criteria/HU-17-schemas";

const cedulaPrefix = "9904";
const SEDE_PRINCIPAL = "sede-1";
const MOTIVO = "Motivo de prueba INC-04";
const HOY = getTodayBogota();

let app: any;
let tokenOwner = "";
let ownerUserId = "";
let tokenRecep = "";
let recepUserId = "";
let tokenCliente = "";
let clienteSeq = 0;

function dia(offset: number): string {
  const [anio, mes, diaMes] = HOY.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, diaMes + offset))
    .toISOString()
    .slice(0, 10);
}

function headers(token: string) {
  return { authorization: `Bearer ${token}` };
}

function parseBody(res: { body: string }) {
  return JSON.parse(res.body);
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
  const data = parseBody(res);
  return { token: data.token, id: data.user.id };
}

/** Cliente con estado arbitrario escrito directo en BD (fixture F2/F5/F6/F10). */
async function crearClienteDirecto(
  estado: string
): Promise<{ id: string; cedula: string }> {
  clienteSeq += 1;
  const cedula = `${cedulaPrefix}${String(clienteSeq).padStart(6, "0")}`;
  const cliente = await prisma.cliente.create({
    data: {
      cedula,
      nombres: "Estado",
      apellidos: `Cliente${clienteSeq}`,
      telefono: "3000000000",
      sedeId: SEDE_PRINCIPAL,
      pin: await bcrypt.hash("1234", 4),
      estado,
    },
  });
  return { id: cliente.id, cedula };
}

/** Cliente NUEVO via API HU-04 (fixture F10: 0 cambios de historial). */
async function crearClienteApi(
  overrides: Partial<{ nombres: string; apellidos: string; email: string }> = {}
): Promise<{ id: string; cedula: string; createdAt: string }> {
  clienteSeq += 1;
  const cedula = `${cedulaPrefix}${String(clienteSeq).padStart(6, "0")}`;
  const res = await app.inject({
    method: "POST",
    url: "/clientes",
    headers: headers(tokenOwner),
    payload: {
      cedula,
      nombres: overrides.nombres ?? "Historial",
      apellidos: overrides.apellidos ?? `Cliente${clienteSeq}`,
      telefono: "3000000000",
      ...(overrides.email ? { email: overrides.email } : {}),
      sedeId: SEDE_PRINCIPAL,
    },
  });
  expect(res.statusCode).toBe(201);
  const body = parseBody(res);
  return { id: body.id, cedula, createdAt: body.createdAt };
}

/** Historial completo del cliente, mas reciente primero (CONF-05, lectura BD). */
async function historial(clienteId: string) {
  return prisma.clienteEstadoCambio.findMany({
    where: { clienteId },
    orderBy: { createdAt: "desc" },
    include: { actor: { select: { id: true, nombre: true } } },
  });
}

async function estadoEnBD(clienteId: string): Promise<string> {
  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: { estado: true },
  });
  return cliente?.estado ?? "";
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
  await prisma.clienteEstadoCambio.deleteMany({
    where: { clienteId: { in: clienteIds } },
  });
  await prisma.membresiaGymCambio.deleteMany({
    where: { membresiaId: { in: membresiaIds } },
  });
  await prisma.membresiaGym.deleteMany({ where: { id: { in: membresiaIds } } });
  await prisma.cliente.deleteMany({
    where: { cedula: { startsWith: cedulaPrefix } },
  });
}

beforeAll(async () => {
  app = Fastify();
  await app.register(prismaPlugin);
  await app.register(authPlugin);
  await app.register(authRoutes);
  await app.register(clienteRoutes);
  await app.register(membresiaRoutes);
  await app.register(portalRoutes);
  await app.ready();

  const owner = await loginStaff("admin@clubbeasts.com", "admin123");
  tokenOwner = owner.token;
  ownerUserId = owner.id;

  const recep = await loginStaff("recep@clubbeasts.com", "recep123");
  tokenRecep = recep.token;
  recepUserId = recep.id;

  // Token de rol CLIENTE para asertar el 403 preHandler y la ficha self-only.
  const cliente = await crearClienteDirecto("ACTIVO");
  const clienteLoginRes = await app.inject({
    method: "POST",
    url: "/auth/login-cliente",
    payload: { cedula: cliente.cedula, pin: "1234" },
  });
  expect(clienteLoginRes.statusCode).toBe(200);
  tokenCliente = parseBody(clienteLoginRes).token;
});

afterAll(async () => {
  await cleanupFixtures();
  await app.close();
});

// ─── INC04-EST-03 / INC04-CLI-03: motivo obligatorio (DEC-035, CONF-04) ─────

describe("INC04-EST-03 / INC04-CLI-03 motivo obligatorio en todo cambio de estado", () => {
  it("EST-03/CLI-03 PATCH con estado sin motivo retorna 400 VALIDATION_ERROR y el estado no cambia", async () => {
    const cliente = await crearClienteApi();

    const res = await app.inject({
      method: "PATCH",
      url: `/clientes/${cliente.id}`,
      headers: headers(tokenOwner),
      payload: { estado: "ACTIVO" },
    });

    expect(res.statusCode).toBe(400);
    const body = parseBody(res);
    expect(body.code).toBe("VALIDATION_ERROR");
    expect(body.error).toBe("Motivo es requerido cuando cambia el estado");
    // Sin escritura en el 400 (CONF-03): el cliente sigue NUEVO y sin historial.
    expect(await estadoEnBD(cliente.id)).toBe("NUEVO");
    expect(await historial(cliente.id)).toHaveLength(0);
  });

  it("EST-03 PATCH con motivo de 1-2 caracteres retorna 400 con mensaje exacto", async () => {
    const cliente = await crearClienteApi();

    const res = await app.inject({
      method: "PATCH",
      url: `/clientes/${cliente.id}`,
      headers: headers(tokenOwner),
      payload: { estado: "ACTIVO", motivo: "No" },
    });

    expect(res.statusCode).toBe(400);
    const body = parseBody(res);
    expect(body.code).toBe("VALIDATION_ERROR");
    expect(body.error).toBe("Motivo debe tener al menos 3 caracteres");
    expect(await estadoEnBD(cliente.id)).toBe("NUEVO");
  });

  it("EST-03 PATCH con motivo de 201 caracteres retorna 400 con mensaje exacto", async () => {
    const cliente = await crearClienteApi();

    const res = await app.inject({
      method: "PATCH",
      url: `/clientes/${cliente.id}`,
      headers: headers(tokenOwner),
      payload: { estado: "ACTIVO", motivo: "a".repeat(201) },
    });

    expect(res.statusCode).toBe(400);
    const body = parseBody(res);
    expect(body.code).toBe("VALIDATION_ERROR");
    expect(body.error).toBe("Motivo no puede exceder 200 caracteres");
    expect(await estadoEnBD(cliente.id)).toBe("NUEVO");
  });

  it("EST-03 un motivo vacio literal tambien es rechazado (materializacion D4 del G14)", async () => {
    // D4: "" literal -> "al menos 3 caracteres"; el mensaje de "requerido" es
    // solo para el campo omitido.
    const cliente = await crearClienteApi();

    const res = await app.inject({
      method: "PATCH",
      url: `/clientes/${cliente.id}`,
      headers: headers(tokenOwner),
      payload: { estado: "ACTIVO", motivo: "" },
    });

    expect(res.statusCode).toBe(400);
    const body = parseBody(res);
    expect(body.code).toBe("VALIDATION_ERROR");
    expect(body.error).toBe("Motivo debe tener al menos 3 caracteres");
    expect(await estadoEnBD(cliente.id)).toBe("NUEVO");
  });

  it("CONF-07 PATCH con motivo sin estado no cambia estado ni registra historial", async () => {
    // Red de seguridad del refactor: el motivo viajero sin `estado` se ignora
    // (sin 400 nuevo, sin escritura de historial).
    const cliente = await crearClienteApi();

    const res = await app.inject({
      method: "PATCH",
      url: `/clientes/${cliente.id}`,
      headers: headers(tokenOwner),
      payload: { telefono: "3009998877", motivo: "Motivo sin estado" },
    });

    expect(res.statusCode).toBe(200);
    expect(parseBody(res).estado).toBe("NUEVO");
    expect(await estadoEnBD(cliente.id)).toBe("NUEVO");
    expect(await historial(cliente.id)).toHaveLength(0);
  });
});

// ─── INC04-EST-02 / INC04-CLI-03: historial en la misma transaccion ─────────

describe("INC04-EST-02 / INC04-CLI-03 el cambio de estado persiste motivo, actor e historial", () => {
  it("EST-02/CLI-03 PATCH NUEVO -> INACTIVO responde ultimoCambio y persiste la fila de historial en BD", async () => {
    const cliente = await crearClienteApi();

    const res = await app.inject({
      method: "PATCH",
      url: `/clientes/${cliente.id}`,
      headers: headers(tokenOwner),
      payload: { estado: "INACTIVO", motivo: "Mudanza de ciudad" },
    });

    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    const parsed = respuestaCambioEstadoSchema.safeParse(body);
    expect(
      parsed.success,
      `respuesta fuera del contrato G14: ${JSON.stringify(
        parsed.success ? null : parsed.error.issues
      )}`
    ).toBe(true);
    expect(body.estado).toBe("INACTIVO");
    expect(body.motivo).toBe("Mudanza de ciudad");
    // HU08-C03: el actor del cambio queda registrado.
    expect(body.actualizadoPorId).toBe(ownerUserId);
    expect(body.ultimoCambio.estadoAnterior).toBe("NUEVO");
    expect(body.ultimoCambio.estadoNuevo).toBe("INACTIVO");
    expect(body.ultimoCambio.motivo).toBe("Mudanza de ciudad");
    expect(body.ultimoCambio.actor.id).toBe(ownerUserId);
    expect(typeof body.ultimoCambio.actor.nombre).toBe("string");
    expect(Number.isNaN(Date.parse(body.ultimoCambio.createdAt))).toBe(false);

    // MISMA transaccion: la fila existe en BD y coincide con la respuesta.
    const filas = await historial(cliente.id);
    expect(filas).toHaveLength(1);
    expect(filas[0].id).toBe(body.ultimoCambio.id);
    expect(filas[0].estadoAnterior).toBe("NUEVO");
    expect(filas[0].estadoNuevo).toBe("INACTIVO");
    expect(filas[0].motivo).toBe("Mudanza de ciudad");
    expect(filas[0].actorId).toBe(ownerUserId);
  });

  it("EST-02 el motivo del ultimo cambio queda recuperable en la ficha tras una edicion sin estado", async () => {
    const cliente = await crearClienteApi();

    const cambio = await app.inject({
      method: "PATCH",
      url: `/clientes/${cliente.id}`,
      headers: headers(tokenOwner),
      payload: { estado: "INACTIVO", motivo: "Falta de pago" },
    });
    expect(cambio.statusCode).toBe(200);

    // Edicion posterior sin cambio de estado: el motivo NO se sobreescribe.
    const edicion = await app.inject({
      method: "PATCH",
      url: `/clientes/${cliente.id}`,
      headers: headers(tokenOwner),
      payload: { telefono: "3001234567" },
    });
    expect(edicion.statusCode).toBe(200);

    const ficha = await app.inject({
      method: "GET",
      url: `/clientes/${cliente.id}`,
      headers: headers(tokenOwner),
    });
    expect(ficha.statusCode).toBe(200);
    expect(parseBody(ficha).motivo).toBe("Falta de pago");
  });
});

// ─── INC04-CLI-03: exposicion del motivo (DEC-041) y errores/roles ──────────

describe("INC04-CLI-03 el motivo se expone solo a staff (DEC-041) y los errores respetan el orden CONF-03", () => {
  it("CLI-03 la ficha self-only del rol CLIENTE expone motivo null", async () => {
    const cliente = await crearClienteDirecto("ACTIVO");
    const inactivacion = await app.inject({
      method: "PATCH",
      url: `/clientes/${cliente.id}`,
      headers: headers(tokenOwner),
      payload: { estado: "INACTIVO", motivo: "Cuenta morosa" },
    });
    expect(inactivacion.statusCode).toBe(200);

    const ficha = await app.inject({
      method: "GET",
      url: `/clientes/${cliente.id}`,
      headers: headers(tokenCliente),
    });
    expect(ficha.statusCode).toBe(200);
    // DEC-041: el motivo es informacion interna; para el cliente va null.
    expect(parseBody(ficha).motivo).toBeNull();
  });

  it("CLI-03 el rol CLIENTE recibe 403 AUTH_FORBIDDEN al cambiar estados", async () => {
    const cliente = await crearClienteDirecto("ACTIVO");

    const res = await app.inject({
      method: "PATCH",
      url: `/clientes/${cliente.id}`,
      headers: headers(tokenCliente),
      payload: { estado: "INACTIVO", motivo: "Intento del cliente" },
    });

    expect(res.statusCode).toBe(403);
    expect(parseBody(res).code).toBe("AUTH_FORBIDDEN");
    expect(await estadoEnBD(cliente.id)).toBe("ACTIVO");
    expect(await historial(cliente.id)).toHaveLength(0);
  });

  it("CLI-03 PATCH con estado y motivo a cliente inexistente retorna 404 sin escritura", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/clientes/cliente-inexistente-inc04",
      headers: headers(tokenOwner),
      payload: { estado: "INACTIVO", motivo: "Prueba 404" },
    });

    expect(res.statusCode).toBe(404);
    expect(parseBody(res).code).toBe("NOT_FOUND");
  });
});

// ─── INC04-CLI-02: conservacion sin borrado fisico ──────────────────────────

describe("INC04-CLI-02 inactivar conserva datos, busqueda e historial (sin DELETE)", () => {
  it("CLI-02 tras inactivar la ficha responde 200 integra, la busqueda la encuentra y DELETE responde 404", async () => {
    const cliente = await crearClienteApi({
      nombres: "Conserva",
      apellidos: "Historial",
      email: "conserva@clubbeasts.com",
    });

    const inactivacion = await app.inject({
      method: "PATCH",
      url: `/clientes/${cliente.id}`,
      headers: headers(tokenOwner),
      payload: { estado: "INACTIVO", motivo: "Cierre temporal" },
    });
    expect(inactivacion.statusCode).toBe(200);

    // Ficha 200 con TODOS los campos originales + estado INACTIVO.
    const fichaRes = await app.inject({
      method: "GET",
      url: `/clientes/${cliente.id}`,
      headers: headers(tokenOwner),
    });
    expect(fichaRes.statusCode).toBe(200);
    const ficha = parseBody(fichaRes);
    const parsedFicha = fichaClienteResponseSchema.safeParse(ficha);
    expect(
      parsedFicha.success,
      `ficha fuera del contrato G14: ${JSON.stringify(
        parsedFicha.success ? null : parsedFicha.error.issues
      )}`
    ).toBe(true);
    expect(ficha.estado).toBe("INACTIVO");
    expect(ficha.cedula).toBe(cliente.cedula);
    expect(ficha.nombres).toBe("Conserva");
    expect(ficha.apellidos).toBe("Historial");
    expect(ficha.telefono).toBe("3000000000");
    expect(ficha.email).toBe("conserva@clubbeasts.com");
    expect(ficha.sede.id).toBe(SEDE_PRINCIPAL);
    expect(ficha.createdAt).toBe(cliente.createdAt);

    // La busqueda por cedula lo sigue encontrando.
    const busqueda = await app.inject({
      method: "GET",
      url: `/clientes?search=${cliente.cedula}&limit=100`,
      headers: headers(tokenOwner),
    });
    expect(busqueda.statusCode).toBe(200);
    const ids = parseBody(busqueda).clientes.map((c: any) => c.id);
    expect(ids).toContain(cliente.id);

    // El historial acumula: 1 cambio inactivo -> count 1, no vacio.
    const filas = await historial(cliente.id);
    expect(filas).toHaveLength(1);
    expect(filas[0].estadoNuevo).toBe("INACTIVO");
    expect(filas[0].motivo).toBe("Cierre temporal");

    // HU-08 b2: no existe borrado fisico (ruta DELETE inexistente -> 404).
    const del = await app.inject({
      method: "DELETE",
      url: `/clientes/${cliente.id}`,
      headers: headers(tokenOwner),
    });
    expect(del.statusCode).toBe(404);

    const trasBorrado = await prisma.cliente.findUnique({
      where: { id: cliente.id },
    });
    expect(trasBorrado).not.toBeNull();
  });
});

// ─── INC04-EST-04: acumulacion del historial ────────────────────────────────

describe("INC04-EST-04 los cambios de estado acumulan historial sin reemplazar nada", () => {
  it("EST-04 tres cambios consecutivos producen 3 registros ordenados con los campos base intactos", async () => {
    const cliente = await crearClienteApi({
      nombres: "Acumula",
      apellidos: "TresCambios",
    });

    const cambios = [
      { estado: "ACTIVO", motivo: "Alta autorizada" },
      { estado: "SUSPENDIDO", motivo: "Falta de pago" },
      { estado: "INACTIVO", motivo: "Baja temporal" },
    ];
    for (const cambio of cambios) {
      const res = await app.inject({
        method: "PATCH",
        url: `/clientes/${cliente.id}`,
        headers: headers(tokenOwner),
        payload: cambio,
      });
      expect(res.statusCode).toBe(200);
    }

    // 3 registros, mas reciente primero, encadenados N -> A -> S -> I.
    const filas = await historial(cliente.id);
    expect(filas).toHaveLength(3);
    expect(filas.map((f) => f.estadoNuevo)).toEqual([
      "INACTIVO",
      "SUSPENDIDO",
      "ACTIVO",
    ]);
    expect(filas.map((f) => f.motivo)).toEqual([
      "Baja temporal",
      "Falta de pago",
      "Alta autorizada",
    ]);
    expect(filas[0].estadoAnterior).toBe("SUSPENDIDO");
    expect(filas[1].estadoAnterior).toBe("ACTIVO");
    expect(filas[2].estadoAnterior).toBe("NUEVO");
    // Orden cronologico descendente (el mas reciente primero).
    for (let i = 1; i < filas.length; i++) {
      expect(filas[i - 1].createdAt.getTime()).toBeGreaterThanOrEqual(
        filas[i].createdAt.getTime()
      );
    }

    // Campos base intactos tras los 3 cambios.
    const fichaRes = await app.inject({
      method: "GET",
      url: `/clientes/${cliente.id}`,
      headers: headers(tokenOwner),
    });
    expect(fichaRes.statusCode).toBe(200);
    const ficha = parseBody(fichaRes);
    expect(ficha.cedula).toBe(cliente.cedula);
    expect(ficha.nombres).toBe("Acumula");
    expect(ficha.apellidos).toBe("TresCambios");
    expect(ficha.sede.id).toBe(SEDE_PRINCIPAL);
    expect(ficha.createdAt).toBe(cliente.createdAt);

    // Busqueda y filtro siguen operativos.
    const busqueda = await app.inject({
      method: "GET",
      url: `/clientes?search=${cliente.cedula}&limit=100`,
      headers: headers(tokenOwner),
    });
    expect(parseBody(busqueda).clientes.map((c: any) => c.id)).toContain(
      cliente.id
    );
    const filtro = await app.inject({
      method: "GET",
      url: `/clientes?estado=INACTIVO&limit=100`,
      headers: headers(tokenOwner),
    });
    expect(parseBody(filtro).clientes.map((c: any) => c.id)).toContain(
      cliente.id
    );

    // Sin borrado fisico.
    const del = await app.inject({
      method: "DELETE",
      url: `/clientes/${cliente.id}`,
      headers: headers(tokenOwner),
    });
    expect(del.statusCode).toBe(404);
  });
});

// ─── INC04-EST-05: matriz de transiciones 5x5 (DEC-038) ────────────────────

/** Matriz ratificada transcrita LITERALMENTE de `spec.md` (DEC-038). */
const MATRIZ_RATIFICADA: Record<
  ClienteEstado,
  Partial<Record<ClienteEstado, boolean>>
> = {
  NUEVO: { ACTIVO: true, SUSPENDIDO: true, RETIRADO: true, INACTIVO: true },
  ACTIVO: { SUSPENDIDO: true, RETIRADO: true, INACTIVO: true },
  SUSPENDIDO: { ACTIVO: true, RETIRADO: true, INACTIVO: true },
  RETIRADO: {}, // terminal
  INACTIVO: { ACTIVO: true, RETIRADO: true }, // DEC-020 + "* -> RETIRADO"
};

const ESTADOS: ClienteEstado[] = [
  "NUEVO",
  "ACTIVO",
  "SUSPENDIDO",
  "RETIRADO",
  "INACTIVO",
];

describe("INC04-EST-05 matriz de transiciones ratificada DEC-038 (25 celdas)", () => {
  it("EST-05 la matriz del contrato G14 coincide celda por celda con la matriz ratificada del spec", () => {
    // Incompatibilidad #14 del spec: el RED aserta paridad spec == G14.
    expect(transicionesAprobadas).toEqual(MATRIZ_RATIFICADA);
  });

  for (const desde of ESTADOS) {
    for (const hacia of ESTADOS) {
      const clasificacion = clasificarTransicion(desde, hacia);
      it(`EST-05 matriz ${desde} -> ${hacia} (${clasificacion})`, async () => {
        const cliente = await crearClienteDirecto(desde);

        const res = await app.inject({
          method: "PATCH",
          url: `/clientes/${cliente.id}`,
          headers: headers(tokenOwner),
          payload: { estado: hacia, motivo: "Transicion de prueba" },
        });

        const filas = await historial(cliente.id);

        if (clasificacion === "INVALIDA") {
          // 409 con mensaje exacto, sin escritura y sin cambio de estado.
          expect(res.statusCode).toBe(409);
          const body = parseBody(res);
          expect(body).toEqual({
            error: "Transición de estado no permitida",
            code: "TRANSICION_INVALIDA",
          });
          expect(await estadoEnBD(cliente.id)).toBe(desde);
          expect(filas).toHaveLength(0);
          return;
        }

        // NO_OP y PERMITIDA responden 200 con el estado aplicado.
        expect(res.statusCode).toBe(200);
        const body = parseBody(res);
        expect(body.estado).toBe(hacia);
        expect(body.motivo).toBe("Transicion de prueba");

        if (clasificacion === "NO_OP") {
          // CONF-02: diagonal = no-op SIN registro nuevo y sin ultimoCambio.
          expect(body.ultimoCambio).toBeUndefined();
          expect(filas).toHaveLength(0);
        } else {
          // PERMITIDA: registro A -> B con actor.
          expect(body.ultimoCambio).toBeDefined();
          expect(body.ultimoCambio.estadoAnterior).toBe(desde);
          expect(body.ultimoCambio.estadoNuevo).toBe(hacia);
          expect(filas).toHaveLength(1);
          expect(filas[0].estadoAnterior).toBe(desde);
          expect(filas[0].estadoNuevo).toBe(hacia);
        }
      });
    }
  }
});

// ─── INC04-CLI-08: reactivacion (DEC-020 / CONF-01) ─────────────────────────

describe("INC04-CLI-08 reactivacion de cliente INACTIVO por DUENO y RECEPCIONISTA", () => {
  it("CLI-08 el DUENO reactiva a ACTIVO con historial y el cliente recupera login y servicios nuevos", async () => {
    const cliente = await crearClienteDirecto("INACTIVO");

    const res = await app.inject({
      method: "PATCH",
      url: `/clientes/${cliente.id}`,
      headers: headers(tokenOwner),
      payload: { estado: "ACTIVO", motivo: "Reactivacion autorizada" },
    });

    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.estado).toBe("ACTIVO");
    expect(body.ultimoCambio).toBeDefined();
    expect(body.ultimoCambio.estadoAnterior).toBe("INACTIVO");
    expect(body.ultimoCambio.estadoNuevo).toBe("ACTIVO");
    expect(body.ultimoCambio.actor.id).toBe(ownerUserId);

    const filas = await historial(cliente.id);
    expect(filas).toHaveLength(1);
    expect(filas[0].actorId).toBe(ownerUserId);

    // El login del cliente vuelve a 200 (CLI-04 inverso).
    const login = await app.inject({
      method: "POST",
      url: "/auth/login-cliente",
      payload: { cedula: cliente.cedula, pin: "1234" },
    });
    expect(login.statusCode).toBe(200);
    expect(parseBody(login).token).toBeDefined();

    // Vuelve a permitirse crear servicios nuevos (CLI-05 inverso).
    const membresia = await app.inject({
      method: "POST",
      url: `/clientes/${cliente.id}/membresias-gym`,
      headers: headers(tokenOwner),
      payload: { fechaInicio: dia(-30), fechaFin: dia(30) },
    });
    expect(membresia.statusCode).toBe(201);
  });

  it("CLI-08 el RECEPCIONISTA tambien puede reactivar (DEC-037) y queda como actor", async () => {
    const cliente = await crearClienteDirecto("INACTIVO");

    const res = await app.inject({
      method: "PATCH",
      url: `/clientes/${cliente.id}`,
      headers: headers(tokenRecep),
      payload: { estado: "ACTIVO", motivo: "Cliente al dia" },
    });

    expect(res.statusCode).toBe(200);
    expect(parseBody(res).ultimoCambio.actor.id).toBe(recepUserId);
    const filas = await historial(cliente.id);
    expect(filas).toHaveLength(1);
    expect(filas[0].actorId).toBe(recepUserId);
  });

  it("CLI-08 reactivar sin motivo retorna 400 y el cliente sigue INACTIVO", async () => {
    const cliente = await crearClienteDirecto("INACTIVO");

    const res = await app.inject({
      method: "PATCH",
      url: `/clientes/${cliente.id}`,
      headers: headers(tokenOwner),
      payload: { estado: "ACTIVO" },
    });

    expect(res.statusCode).toBe(400);
    expect(parseBody(res).error).toBe(
      "Motivo es requerido cuando cambia el estado"
    );
    expect(await estadoEnBD(cliente.id)).toBe("INACTIVO");
  });

  it("CLI-08 el rol CLIENTE no puede reactivar (403 preHandler)", async () => {
    const cliente = await crearClienteDirecto("INACTIVO");

    const res = await app.inject({
      method: "PATCH",
      url: `/clientes/${cliente.id}`,
      headers: headers(tokenCliente),
      payload: { estado: "ACTIVO", motivo: "Auto-reactivacion" },
    });

    expect(res.statusCode).toBe(403);
    expect(parseBody(res).code).toBe("AUTH_FORBIDDEN");
    expect(await estadoEnBD(cliente.id)).toBe("INACTIVO");
  });
});

// ─── INC04-CLI-06: sesion previa no revocada (DEC-040) ──────────────────────

describe("INC04-CLI-06 la sesion JWT emitida antes de inactivar expira sola (DEC-040)", () => {
  it("CLI-06 la sesion del portal emitida antes de inactivar sigue respondiendo 200 (sin revocacion inmediata)", async () => {
    const cliente = await crearClienteDirecto("ACTIVO");

    const login = await app.inject({
      method: "POST",
      url: "/auth/login-cliente",
      payload: { cedula: cliente.cedula, pin: "1234" },
    });
    expect(login.statusCode).toBe(200);
    const tokenPortal = parseBody(login).token;

    const inactivacion = await app.inject({
      method: "PATCH",
      url: `/clientes/${cliente.id}`,
      headers: headers(tokenOwner),
      payload: { estado: "INACTIVO", motivo: "Sesion previa" },
    });
    expect(inactivacion.statusCode).toBe(200);

    // DEC-040: no hay revocacion inmediata; la sesion viva sigue buena hasta
    // su TTL (prueba de no-regresion del contrato ratificado).
    const resumen = await app.inject({
      method: "GET",
      url: "/portal/resumen",
      headers: headers(tokenPortal),
    });
    expect(resumen.statusCode).toBe(200);
  });
});
