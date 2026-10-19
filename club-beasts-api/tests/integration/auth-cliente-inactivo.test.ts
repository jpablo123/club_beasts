/**
 * INC-04 (HU-08 b4 / HU08-C04a) — RED del bloqueo de login del cliente
 * INACTIVO en el portal.
 *
 * Criterio: `INC04-CLI-04` (DEC-034): `POST /auth/login-cliente` con cliente
 * `INACTIVO` + PIN correcto -> 401 `AUTH_CLIENTE_INACTIVO` sin `token`;
 * con PIN incorrecto -> 401 `AUTH_INVALID_CREDENTIALS` (anti-enumeracion:
 * el estado no se revela si las credenciales fallan); cliente no bloqueado
 * (ACTIVO / NUEVO) -> 200 (regresion HU-02, que debe seguir intacta).
 *
 * Estado RED (2026-10-19): `loginClient` (`src/services/auth.service.ts:14-28`)
 * solo valida cedula+PIN y no mira `estado`, y la ruta
 * (`src/routes/auth.ts:36-59`) siempre firma token con 200. Por eso:
 *  - el 401 `AUTH_CLIENTE_INACTIVO` con el literal G14 no existe hoy;
 *  - los tests de regresion 200 (ACTIVO/NUEVO) y el 401 de PIN mal si pasan
 *    hoy, pero se escriben para fijar el ORDEN de chequeo (credenciales
 *    primero, estado despues) al que el GREEN no puede romper.
 * GREEN (backend-developer): tras validar credenciales, si `cliente.estado`
 * es `INACTIVO` responder 401 con `{ error: "La cuenta está inactiva.
 * Contacte con recepción.", code: "AUTH_CLIENTE_INACTIVO" }` y SIN `token`
 * (mensaje literal G14 `HU08-C04a`); el resto de estados firma token igual.
 *
 * Fixtures: aislamiento por prefijo de cedula `9914` (DEC-012); PIN "1234".
 * La limpieza borra `ClienteEstadoCambio` antes que `Cliente` (FK RESTRICT).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import bcrypt from "bcryptjs";
import prisma from "../../src/lib/prisma";
import authRoutes from "../../src/routes/auth";
import prismaPlugin from "../../src/plugins/prisma";
import authPlugin from "../../src/plugins/auth";
import { loginClienteInactivoResponseSchema } from "../../features/acceptance-criteria/HU-08-schemas";

const cedulaPrefix = "9914";
const PIN = "1234";
const SEDE_PRINCIPAL = "sede-1";

let app: any;
let clienteSeq = 0;

function parseBody(res: { body: string }) {
  return JSON.parse(res.body);
}

/** Cliente con estado arbitrario escrito directo en BD (fixture F5/F6/F10). */
async function crearCliente(
  estado: string
): Promise<{ id: string; cedula: string }> {
  clienteSeq += 1;
  const cedula = `${cedulaPrefix}${String(clienteSeq).padStart(6, "0")}`;
  const cliente = await prisma.cliente.create({
    data: {
      cedula,
      nombres: "Portal",
      apellidos: `Cliente${clienteSeq}`,
      telefono: "3000000000",
      sedeId: SEDE_PRINCIPAL,
      pin: await bcrypt.hash(PIN, 4),
      estado,
    },
  });
  return { id: cliente.id, cedula };
}

async function login(cedula: string, pin: string) {
  return app.inject({
    method: "POST",
    url: "/auth/login-cliente",
    payload: { cedula, pin },
  });
}

async function cleanupFixtures() {
  const clientes = await prisma.cliente.findMany({
    where: { cedula: { startsWith: cedulaPrefix } },
    select: { id: true },
  });
  const clienteIds = clientes.map((cliente) => cliente.id);
  await prisma.clienteEstadoCambio.deleteMany({
    where: { clienteId: { in: clienteIds } },
  });
  await prisma.cliente.deleteMany({
    where: { cedula: { startsWith: cedulaPrefix } },
  });
}

beforeAll(async () => {
  app = Fastify();
  await app.register(prismaPlugin);
  await app.register(authPlugin);
  await app.register(authRoutes);
  await app.ready();
});

afterAll(async () => {
  await cleanupFixtures();
  await app.close();
});

// ─── INC04-CLI-04: bloqueo de login del cliente INACTIVO (DEC-034) ──────────

describe("INC04-CLI-04 login-cliente bloqueado para cliente INACTIVO", () => {
  it("CLI-04 INACTIVO con PIN correcto retorna 401 AUTH_CLIENTE_INACTIVO sin token (mensaje literal G14)", async () => {
    const cliente = await crearCliente("INACTIVO");

    const res = await login(cliente.cedula, PIN);

    expect(res.statusCode).toBe(401);
    const body = parseBody(res);
    const parsed = loginClienteInactivoResponseSchema.safeParse(body);
    expect(
      parsed.success,
      `respuesta fuera del contrato G14: ${JSON.stringify(
        parsed.success ? null : parsed.error.issues
      )}`
    ).toBe(true);
    expect(body.error).toBe("La cuenta está inactiva. Contacte con recepción.");
    expect(body.code).toBe("AUTH_CLIENTE_INACTIVO");
    // Sin token: no se abre sesion a una cuenta bloqueada.
    expect(body.token).toBeUndefined();
  });

  it("CLI-04 INACTIVO con PIN incorrecto retorna 401 AUTH_INVALID_CREDENTIALS (no revela el estado)", async () => {
    // Orden obligatorio HU08-C04a: credenciales ANTES de estado. Un PIN mal
    // responde igual que con cualquier otra cedula: anti-enumeracion.
    const cliente = await crearCliente("INACTIVO");

    const res = await login(cliente.cedula, "0000");

    expect(res.statusCode).toBe(401);
    const body = parseBody(res);
    expect(body.code).toBe("AUTH_INVALID_CREDENTIALS");
    expect(body.error).toBe("Cédula o PIN inválido");
    expect(body.token).toBeUndefined();
  });

  it("CLI-04 ACTIVO con PIN correcto sigue retornando 200 con token (regresion HU-02)", async () => {
    const cliente = await crearCliente("ACTIVO");

    const res = await login(cliente.cedula, PIN);

    expect(res.statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.token).toBeDefined();
    expect(body.cliente.cedula).toBe(cliente.cedula);
  });

  it("CLI-04 NUEVO con PIN correcto tambien retorna 200 (solo INACTIVO esta bloqueado)", async () => {
    // El bloqueo b4 es exclusivo de INACTIVO: NUEVO/ACTIVO/SUSPENDIDO/RETIRADO
    // conservan su login actual (la rama de estado del ingreso fisico es otra).
    const cliente = await crearCliente("NUEVO");

    const res = await login(cliente.cedula, PIN);

    expect(res.statusCode).toBe(200);
    expect(parseBody(res).token).toBeDefined();
  });

  it("CLI-04 cedula inexistente sigue retornando 401 AUTH_INVALID_CREDENTIALS (regresion)", async () => {
    const res = await login("9999999999", PIN);

    expect(res.statusCode).toBe(401);
    expect(parseBody(res).code).toBe("AUTH_INVALID_CREDENTIALS");
  });
});
