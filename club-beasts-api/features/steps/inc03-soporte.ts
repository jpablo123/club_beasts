import prisma from "../../src/lib/prisma";
import { getTodayBogota } from "../../src/services/membresia.service";
import type { ApiWorld } from "../support/world";

/**
 * INC-03 (tarea 14, RED Gherkin) - soporte compartido por los steps nuevos de
 * vencimiento (HU-16), portal (HU-25), recepcion consulta (HU-29), ingresos
 * (HU-30) y creacion rapida (HU-31).
 *
 * Convenciones del spec INC-03 ratificado 2026-10-10:
 * - Sin prefijo `/api` en los paths (el backend registra rutas raiz).
 * - Fechas DINAMICAS relativas a `getTodayBogota()` (America/Bogota, DEC-005/
 *   DEC-013): los steps aceptan tokens "hoy", "hoy+N", "hoy-N" o una fecha
 *   literal YYYY-MM-DD.
 * - Sedes reales del seed: `sede-1` "Sede Principal" y `sede-2`
 *   "Sede Secundaria" (el borrador G14 usaba "Sede Norte"/"uid-sede-norte").
 *
 * El app de prueba registra todas las rutas del backend, incluidas las de
 * INC-03 (`/portal/resumen`, `/recepcion/*`): los endpoints nuevos pasaron de
 * 404 (RED) a existir con el GREEN (tarea 16/17), que es cuando los 63
 * escenarios nuevos dejan de fallar.
 */

export const CEDULA_SEED = "1234567890";
export const PIN_PRUEBA = "1234";
export const SEDE_PRINCIPAL = { id: "sede-1", nombre: "Sede Principal" };
export const SEDE_SECUNDARIA = { id: "sede-2", nombre: "Sede Secundaria" };

/** Mundo de ApiWorld ampliado con el estado propio de los escenarios INC-03. */
export type Inc03World = ApiWorld & {
  /** id del usuario staff autenticado (DUENO/RECEPCIONISTA) del escenario. */
  actorId?: string | null;
  /** nombre del usuario staff autenticado (para trazabilidad de creadoPor). */
  actorNombre?: string | null;
  /** id de la ultima vigencia GYM creada como fixture. */
  vigenciaId?: string | null;
  /** token JWT del cliente (rol CLIENTE) para /portal/resumen. */
  portalToken?: string | null;
  /** cedula del cliente fixture del escenario (8800000xxx). */
  cedulaFixture?: string | null;
  /** token del recepcionista autenticado. */
  recepToken?: string | null;
  /** id del cliente creado via /recepcion/clientes-rapidos (o fallback fixture). */
  clienteRapidoId?: string | null;
  /**
   * Filtro de fecha (YYYY-MM-DD) de la ultima consulta al historial de
   * ingresos: `null` = sin filtro, `undefined` = todavia no se consulto.
   * GAP-RED-02: el Then del historial relee el endpoint con este filtro en
   * lugar de reutilizar la ultima respuesta (que puede ser el 201 de un
   * registro anterior).
   */
  historialFecha?: string | null;
};

let app: any = null;

/** Fastify con todas las rutas del backend (existentes + las de INC-03). */
export async function getInc03App() {
  if (!app) {
    const Fastify = (await import("fastify")).default;
    const { default: prismaPlugin } = await import("../../src/plugins/prisma");
    const { default: authPlugin } = await import("../../src/plugins/auth");
    const { default: authRoutes } = await import("../../src/routes/auth");
    const { default: clienteRoutes } = await import("../../src/routes/clientes");
    const { default: membresiaRoutes } = await import("../../src/routes/membresia");
    const { default: portalRoutes } = await import("../../src/routes/portal");
    const { default: recepcionRoutes } = await import("../../src/routes/recepcion");

    app = Fastify();
    await app.register(prismaPlugin);
    await app.register(authPlugin);
    await app.register(authRoutes);
    await app.register(clienteRoutes);
    await app.register(membresiaRoutes);
    await app.register(portalRoutes);
    await app.register(recepcionRoutes);
    await app.ready();
  }
  return app;
}

/** Hoy en America/Bogota (misma fuente que usa el backend). */
export function hoyBogota(): string {
  return getTodayBogota();
}

/** Suma dias de calendario a un YYYY-MM-DD (negativo para retroceder). */
export function sumarDias(fecha: string, dias: number): string {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia + dias)).toISOString().slice(0, 10);
}

/**
 * Resuelve los tokens de fecha usados en los `.feature`:
 * "hoy" -> hoy America/Bogota; "hoy+N"/"hoy-N" -> relativo; cualquier otro
 * valor se devuelve tal cual (fecha literal YYYY-MM-DD).
 */
export function resolverFecha(token: string): string {
  if (token === "hoy") return hoyBogota();
  const relativo = /^hoy([+-]\d+)$/.exec(token);
  if (relativo) return sumarDias(hoyBogota(), parseInt(relativo[1], 10));
  return token;
}

export function authHeaders(token: string | null | undefined) {
  return token ? { authorization: `Bearer ${token}` } : {};
}

export function body(respuesta: any) {
  return JSON.parse(respuesta.body);
}

export async function loginStaff(email: string, password: string) {
  const server = await getInc03App();
  const res = await server.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email, password },
  });
  if (res.statusCode !== 200) {
    throw new Error(`login staff ${email} fallo: ${res.statusCode} ${res.body}`);
  }
  const data = body(res);
  return {
    token: data.token as string,
    actorId: data.user.id as string,
    actorNombre: data.user.nombre as string,
  };
}

export async function adminToken(): Promise<string> {
  const { token } = await loginStaff("admin@clubbeasts.com", "admin123");
  return token;
}

/** Login del recepcionista del seed (F13). */
export async function recepToken(): Promise<string> {
  const { token } = await loginStaff("recep@clubbeasts.com", "recep123");
  return token;
}

/** Login de cliente (rol CLIENTE) via `POST /auth/login-cliente` (HU-02). */
export async function loginClientePortal(cedula: string, pin: string = PIN_PRUEBA) {
  const server = await getInc03App();
  const res = await server.inject({
    method: "POST",
    url: "/auth/login-cliente",
    payload: { cedula, pin },
  });
  if (res.statusCode !== 200) {
    throw new Error(`login cliente ${cedula} fallo: ${res.statusCode} ${res.body}`);
  }
  return body(res).token as string;
}

async function adminId(): Promise<string> {
  const admin = await prisma.user.findUnique({
    where: { email: "admin@clubbeasts.com" },
    select: { id: true },
  });
  if (!admin) throw new Error("seed incompleto: falta admin@clubbeasts.com");
  return admin.id;
}

export type FixtureCliente = {
  cedula: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  sedeId: string;
  email?: string;
  estado?: string;
};

/**
 * Fixture de cliente via API existente `POST /clientes` (HU-04 aceptada);
 * `estado` opcional se setea directo en BD (HU-17 esta en INC-04, no hay
 * endpoint). PIN por defecto "1234" (createCliente).
 *
 * GAP-RED-02: el estado por DEFECTO del cliente de prueba es `ACTIVO`, igual
 * que los fixtures Vitest (`tests/integration/recepcion-consulta.test.ts` y
 * `recepcion-ingresos.test.ts` usan `estado: "ACTIVO"`). `POST /clientes`
 * (HU-04/C01) fuerza `estado: "NUEVO"`, y con NUEVO la consulta de recepcion
 * emite la alerta `ESTADO_CLIENTE`, con lo que el escenario "sin alertas"
 * (INC03-REC-05) no podia cumplirse. Los escenarios que necesitan otro estado
 * lo piden explicitamente con "el cliente de prueba tiene estado ...".
 *
 * Nombres/apellidos solo letras y espacios (validacion HU-04): no usar tokens
 * con digitos en los defaults.
 */
export async function crearClienteFixture(data: FixtureCliente): Promise<string> {
  const server = await getInc03App();
  const token = await adminToken();
  const res = await server.inject({
    method: "POST",
    url: "/clientes",
    headers: authHeaders(token),
    payload: {
      cedula: data.cedula,
      nombres: data.nombres,
      apellidos: data.apellidos,
      telefono: data.telefono,
      sedeId: data.sedeId,
      ...(data.email ? { email: data.email } : {}),
    },
  });
  if (res.statusCode !== 201) {
    throw new Error(`fixture cliente fallo: ${res.statusCode} ${res.body}`);
  }
  const clienteId = body(res).id as string;

  await prisma.cliente.update({
    where: { id: clienteId },
    data: { estado: data.estado ?? "ACTIVO" },
  });
  return clienteId;
}

/**
 * Vigencia directa en BD (fixture F1..F8 del spec): la API de membresias solo
 * crea GYM y exige solapes/version; para fixtures deterministas se escribe la
 * fila con el admin como trazabilidad.
 */
export async function crearVigenciaGymFixture(
  clienteId: string,
  fechaInicio: string,
  fechaFin: string,
  tipoServicio: string = "GYM"
): Promise<string> {
  const actorId = await adminId();
  const membresia = await prisma.membresiaGym.create({
    data: {
      clienteId,
      fechaInicio,
      fechaFin,
      tipoServicio,
      creadoPorId: actorId,
      actualizadoPorId: actorId,
    },
  });
  return membresia.id;
}

/**
 * Pausa que cubre hoy via la API aceptada de INC-02
 * (`POST /clientes/:id/vigencias/:id/congelar`): extiende fechaFin y deja la
 * vigencia en estado CONGELADO segun la unica fuente de calculo.
 */
export async function congelarVigenciaFixture(
  clienteId: string,
  vigenciaId: string,
  rangoInicio: string,
  rangoFin: string,
  version: number = 1
): Promise<void> {
  const server = await getInc03App();
  const token = await adminToken();
  const res = await server.inject({
    method: "POST",
    url: `/clientes/${clienteId}/vigencias/${vigenciaId}/congelar`,
    headers: authHeaders(token),
    payload: {
      fechaInicio: rangoInicio,
      fechaFin: rangoFin,
      motivo: "Fixture INC-03",
      version,
    },
  });
  if (res.statusCode !== 200) {
    throw new Error(`fixture congelacion fallo: ${res.statusCode} ${res.body}`);
  }
}
