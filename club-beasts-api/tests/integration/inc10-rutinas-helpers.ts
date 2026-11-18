/**
 * INC-10 (RED) — helpers compartidos de los tests de rutinas, asignación,
 * historial y portal (RU-01..RU-42).
 *
 * Criterios: HU-18/19/20/21/26 (`features/acceptance-criteria/`) + orden de
 * errores del contrato API RATIFICADO del spec de INC-10-rutinas (2026-11-05)
 * + literales DEC-070.
 *
 * Patron de RED tolerante al artefacto ausente (contrato del orquestador,
 * patron INC-09):
 *  - Las rutas de producto nuevas se importan por ESPECIFICADOR VARIABLE para
 *    que el RED compile/ejecute sin `src/routes/rutinas` (GREEN T7 lo crea).
 *    Sin el modulo los endpoints responden 404 y los tests fallan por
 *    COMPORTAMIENTO AUSENTE (endpoints inexistentes), nunca por error de carga.
 *  - Ningun helper crea tablas ni modifica prisma/**: los modelos `Rutina` y
 *    `RutinaAsignacion` los aporta el GREEN (T6, migracion 10/0 -> 11/0). Los
 *    fixtures de rutinas pasan SIEMPRE por HTTP (POST /rutinas o
 *    POST /rutinas-personalizadas).
 *  - La limpieza tolera los modelos nuevos ausentes (solo limpia si existen).
 *  - El rojo por "table does not exist"/404 es aceptable y documentado (los
 *    helpers lanzan errores EXPLICITOS con la causa).
 *
 * Errores: los tests derivan los mensajes de campo del schema CANONICO
 * (`features/acceptance-criteria/HU-18|HU-19|HU-20|HU-21|HU-26-schemas.ts`,
 * INC09-R08). Literales contractuales DEC-070: 404 cliente
 * "Cliente no encontrado"/CLIENTE_NO_ENCONTRADO; 404 rutina "Rutina no
 * encontrada"/RUTINA_NO_ENCONTRADA; 409 SIN_VIGENCIA_PERSONALIZADA;
 * 409 RUTINA_YA_ACTIVA; 409 CLIENTE_INACTIVO; 409 ASIGNACION_CONFLICTO
 * (concurrencia, DEC-070; NOTA: no esta en CODIGOS_ERROR_ASIGNACION del
 * canonico — gap INC10-R08-GAP-02 reportado); marcadores SIN_RUTINA /
 * OCULTA_POR_VIGENCIA; SIN_RUTINA_MENSAJE = "No tienes una rutina activa".
 */
import bcrypt from "bcryptjs";
import Fastify from "fastify";
import { expect } from "vitest";
import prisma from "../../src/lib/prisma";
import prismaPlugin from "../../src/plugins/prisma";
import authPlugin from "../../src/plugins/auth";
import authRoutes from "../../src/routes/auth";
import clienteRoutes from "../../src/routes/clientes";
import membresiaRoutes from "../../src/routes/membresia";
import portalRoutes from "../../src/routes/portal";
import recepcionRoutes from "../../src/routes/recepcion";
import anamnesisRoutes from "../../src/routes/anamnesis";

// ─── Literales contractuales (DEC-070 / HU-20 / HU-26) ───────────────────────

export const CODE_CLIENTE_NO_ENCONTRADO = "CLIENTE_NO_ENCONTRADO";
export const CODE_RUTINA_NO_ENCONTRADA = "RUTINA_NO_ENCONTRADA";
export const CODE_SIN_VIGENCIA = "SIN_VIGENCIA_PERSONALIZADA";
export const CODE_RUTINA_YA_ACTIVA = "RUTINA_YA_ACTIVA";
export const CODE_CLIENTE_INACTIVO = "CLIENTE_INACTIVO";
/** DEC-070: arbitro `activaClave @unique` (P2002) de la doble asignacion. */
export const CODE_ASIGNACION_CONFLICTO = "ASIGNACION_CONFLICTO";

export const ESTADO_SIN_RUTINA = "SIN_RUTINA";
export const ESTADO_OCULTA = "OCULTA_POR_VIGENCIA";
export const ESTADO_ACTIVA = "ACTIVA";

/** Mensajes exactos (HU-20-schemas: fuente canonica). */
export const MENSAJE_CLIENTE_NO_ENCONTRADO = "Cliente no encontrado";
export const MENSAJE_RUTINA_NO_ENCONTRADA = "Rutina no encontrada";
export const MENSAJE_SIN_VIGENCIA =
  "El cliente no tiene el servicio personalizado vigente: no se puede activar una rutina personalizada";
export const MENSAJE_RUTINA_YA_ACTIVA = "La rutina ya está activa para este cliente";
export const MENSAJE_CLIENTE_INACTIVO =
  "Cliente sin estado activo: no se le pueden asignar rutinas";
export const MENSAJE_SIN_RUTINA = "No tienes una rutina activa";

/**
 * Rutas del router de rutinas que el GREEN debe proveer (patron del repo:
 * `src/routes/<entidad>.ts` con export default). Especificadores VARIABLES a
 * proposito: TypeScript no exige que los modulos existan y el RED puede
 * ejecutar. El GREEN tambien puede exponer los endpoints desde
 * `clientes.ts`/`portal.ts`/`membresia.ts`, que ya se registran aqui.
 */
const RUTAS_MODULOS_RUTINAS = [
  "../../src/routes/rutinas",
  "../../src/routes/rutinas-personalizadas",
  "../../src/routes/asignaciones",
] as const;

export interface AppRutinas {
  app: any;
  /** true si al menos un modulo nuevo de rutas quedo registrado (solo evidencia). */
  rutasRutinasRegistradas: boolean;
}

export async function crearAppRutinas(): Promise<AppRutinas> {
  const app = Fastify();
  await app.register(prismaPlugin);
  await app.register(authPlugin);
  await app.register(authRoutes);
  await app.register(clienteRoutes);
  await app.register(membresiaRoutes);
  await app.register(portalRoutes);
  await app.register(recepcionRoutes);
  await app.register(anamnesisRoutes);

  let rutasRutinasRegistradas = false;
  for (const candidato of RUTAS_MODULOS_RUTINAS) {
    try {
      const especificador: string = candidato;
      const modulo: any = await import(especificador);
      const rutas =
        modulo.default ?? modulo.rutinasRoutes ?? modulo.rutinaRoutes ?? modulo.asignacionesRoutes;
      if (typeof rutas !== "function") continue;
      await app.register(rutas);
      rutasRutinasRegistradas = true;
    } catch {
      // RED INC-10: el modulo no existe aun (GREEN T7). Los endpoints
      // responden 404 y los tests fallan por comportamiento ausente.
    }
  }

  await app.ready();
  return { app, rutasRutinasRegistradas };
}

export function parseBody(res: { body: string }): any {
  return JSON.parse(res.body);
}

export function headers(token: string) {
  return { authorization: `Bearer ${token}` };
}

/** Mensaje del PRIMER error del schema canonico (INC05-CONF-01 / INC09-R08). */
export function primerErrorCanonico(
  schema: { safeParse: (valor: unknown) => { success: boolean; error?: any } },
  body: unknown
): string {
  const resultado = schema.safeParse(body);
  if (resultado.success || !resultado.error) {
    throw new Error(
      "INC09-R08: se esperaba un error del schema canonico para derivar el mensaje"
    );
  }
  return resultado.error.errors[0].message as string;
}

// ─── Fechas America/Bogota (DEC-005/006: dias inclusivos) ────────────────────

function pad(dia: number): string {
  return String(dia).padStart(2, "0");
}

/** Hoy en America/Bogota (UTC-5, sin DST) — mismo calendario que la API. */
export function hoyBogota(): string {
  const bogota = new Date(Date.now() - 5 * 3600_000);
  return `${bogota.getUTCFullYear()}-${pad(bogota.getUTCMonth() + 1)}-${pad(
    bogota.getUTCDate()
  )}`;
}

/** `fechaISO +/- dias` sobre calendario (sin horas ni desfase). */
export function sumarDias(fechaISO: string, dias: number): string {
  const [y, m, d] = fechaISO.split("-").map(Number);
  const fecha = new Date(Date.UTC(y, m - 1, d) + dias * 86400_000);
  return `${fecha.getUTCFullYear()}-${pad(fecha.getUTCMonth() + 1)}-${pad(
    fecha.getUTCDate()
  )}`;
}

// ─── Sesiones (seed determinista de setup-isolated-sqlite.ts) ────────────────

export interface SesionStaff {
  token: string;
  userId: string;
}

export async function loginDueno(app: any): Promise<SesionStaff> {
  const res = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email: "admin@clubbeasts.com", password: "admin123" },
  });
  expect(res.statusCode, "login DUENO del seed").toBe(200);
  const body = parseBody(res);
  return { token: body.token, userId: body.user.id };
}

export async function loginRecepcionista(app: any): Promise<SesionStaff> {
  const res = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email: "recep@clubbeasts.com", password: "recep123" },
  });
  expect(res.statusCode, "login RECEPCIONISTA del seed").toBe(200);
  const body = parseBody(res);
  return { token: body.token, userId: body.user.id };
}

export async function loginCliente(
  app: any,
  cedula: string,
  pin: string
): Promise<string> {
  const res = await app.inject({
    method: "POST",
    url: "/auth/login-cliente",
    payload: { cedula, pin },
  });
  expect(res.statusCode, `login CLIENTE ${cedula}`).toBe(200);
  return parseBody(res).token;
}

/** Segundo DUENO real (trazabilidad RU-16/RU-30: actor distinto). */
export const EMAIL_DUENO_2 = "dueno2-inc10@test.com";

export async function crearSegundoDueno(app: any): Promise<SesionStaff> {
  await prisma.user.upsert({
    where: { email: EMAIL_DUENO_2 },
    update: { contrasena: await bcrypt.hash("dueno2pass", 4), rol: "DUENO" },
    create: {
      email: EMAIL_DUENO_2,
      contrasena: await bcrypt.hash("dueno2pass", 4),
      nombre: "Segundo Dueno",
      rol: "DUENO",
      sedeId: "sede-1",
    },
  });
  const res = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email: EMAIL_DUENO_2, password: "dueno2pass" },
  });
  expect(res.statusCode, "login del segundo DUENO").toBe(200);
  const body = parseBody(res);
  return { token: body.token, userId: body.user.id };
}

/** JWT con firma válida y `exp` en el pasado (patrón auth-session-expired). */
export function tokenExpirado(app: any, payload: Record<string, unknown>): string {
  const pastExp = Math.floor(Date.now() / 1000) - 120;
  return app.jwt.sign({ ...payload, exp: pastExp });
}

// ─── Fixtures de cliente (modelos existentes; DEC-012/013) ───────────────────

const PIN_FIXTURE = "1234";
export const PIN_CLIENTE_FIXTURE = PIN_FIXTURE;

export interface ClienteFixture {
  id: string;
  cedula: string;
}

let seqClientes = 0;

/**
 * Cliente único por corrida (prefijo de cédula propio del archivo de test,
 * DEC-012). `estado` por defecto ACTIVO; DEC-069 exige SUSPENDIDO/RETIRADO/
 * INACTIVO para el 409 CLIENTE_INACTIVO.
 */
export async function crearClienteUnico(
  prefijo: string,
  opciones: { estado?: string; nombres?: string; apellidos?: string } = {}
): Promise<ClienteFixture> {
  seqClientes += 1;
  const cedula = `${prefijo}${String(seqClientes).padStart(6, "0")}`;
  const letra = String.fromCharCode(65 + ((seqClientes - 1) % 26));
  const cliente = await prisma.cliente.create({
    data: {
      cedula,
      nombres: opciones.nombres ?? "Rutina",
      apellidos: opciones.apellidos ?? `Cliente ${letra}`,
      telefono: "3000000000",
      sedeId: "sede-1",
      pin: await bcrypt.hash(PIN_FIXTURE, 4),
      estado: opciones.estado ?? "ACTIVO",
    },
  });
  return { id: cliente.id, cedula };
}

// ─── Fixtures de vigencia del servicio personalizado (HU-13, DEC-066) ────────

export interface VigenciaFixture {
  id: string;
  estado: string;
}

/**
 * Crea una vigencia del servicio personalizado via HTTP (endpoint YA ACEPTADO
 * de HU-13). `estado` calculado: ACTIVA si hoy cae en el rango, PROGRAMADA si
 * inicia en el futuro, VENCIDA si termino en el pasado (DEC-005/006).
 */
export async function crearVigenciaPersonalizada(
  app: any,
  tokenDueno: string,
  clienteId: string,
  fechaInicio: string,
  fechaFin: string
): Promise<VigenciaFixture> {
  const res = await app.inject({
    method: "POST",
    url: `/clientes/${clienteId}/servicios-personalizado`,
    headers: headers(tokenDueno),
    payload: { fechaInicio, fechaFin },
  });
  expect(
    res.statusCode,
    `FIXTURE INC-10: POST /clientes/${clienteId}/servicios-personalizado respondio ` +
      `${res.statusCode} (esperado 201). Cuerpo: ${res.body.slice(0, 200)}`
  ).toBe(201);
  const body = parseBody(res);
  return { id: body.id, estado: body.estado };
}

/** Pausa que cubre HOY (endpoint de INC-02) -> estado calculado CONGELADO. */
export async function congelarVigencia(
  app: any,
  tokenDueno: string,
  clienteId: string,
  vigenciaId: string,
  version = 1
): Promise<void> {
  const res = await app.inject({
    method: "POST",
    url: `/clientes/${clienteId}/vigencias/${vigenciaId}/congelar`,
    headers: headers(tokenDueno),
    payload: {
      fechaInicio: hoyBogota(),
      fechaFin: sumarDias(hoyBogota(), 2),
      motivo: "Pausa fixture INC-10",
      version,
    },
  });
  expect(
    res.statusCode,
    `FIXTURE INC-10: congelar vigencia ${vigenciaId} respondio ${res.statusCode}`
  ).toBe(200);
}

/**
 * Estado de vigencia personalizada DEC-066 por caso de prueba:
 *  - "ACTIVA": vigencia que cubre hoy.
 *  - "VENCIDA": vigencia que termino ayer.
 *  - "PROGRAMADA": vigencia que empieza mañana.
 *  - "CONGELADO": vigencia ACTIVA con pausa que cubre hoy.
 *  - "NO_CONTRATADO": sin vigencias (no se crea nada).
 */
export async function fixtureVigenciaPersonalizada(
  app: any,
  tokenDueno: string,
  clienteId: string,
  estado: "ACTIVA" | "VENCIDA" | "PROGRAMADA" | "CONGELADO" | "NO_CONTRATADO"
): Promise<VigenciaFixture | null> {
  const hoy = hoyBogota();
  switch (estado) {
    case "ACTIVA":
      return crearVigenciaPersonalizada(app, tokenDueno, clienteId, hoy, sumarDias(hoy, 30));
    case "VENCIDA":
      return crearVigenciaPersonalizada(
        app,
        tokenDueno,
        clienteId,
        sumarDias(hoy, -30),
        sumarDias(hoy, -1)
      );
    case "PROGRAMADA":
      return crearVigenciaPersonalizada(
        app,
        tokenDueno,
        clienteId,
        sumarDias(hoy, 1),
        sumarDias(hoy, 30)
      );
    case "CONGELADO": {
      const vigencia = await crearVigenciaPersonalizada(
        app,
        tokenDueno,
        clienteId,
        hoy,
        sumarDias(hoy, 30)
      );
      await congelarVigencia(app, tokenDueno, clienteId, vigencia.id);
      return vigencia;
    }
    case "NO_CONTRATADO":
      return null;
  }
}

// ─── Payloads canónicos de rutinas (HU-18/HU-19-schemas) ─────────────────────

export function serieValida(ajustes: Record<string, unknown> = {}) {
  return {
    repeticiones: "8-12",
    intensidad: "70% 1RM",
    descansoSegundos: 90,
    ...ajustes,
  };
}

export function ejercicioValido(ajustes: Record<string, unknown> = {}) {
  return {
    nombre: "Press banca",
    grupoMuscular: "PECHO",
    series: [serieValida()],
    ...ajustes,
  };
}

export function sesionValida(ajustes: Record<string, unknown> = {}) {
  return {
    nombre: "Sesion fuerza A",
    dia: "lunes",
    ejercicios: [ejercicioValido()],
    ...ajustes,
  };
}

/** Body válido de creación base (GENERICA; RU-01). */
export function payloadRutinaBase(ajustes: Record<string, unknown> = {}) {
  return {
    tipoRutina: "GENERICA",
    nombre: "Rutina base INC10",
    descripcion: "Descripcion base original",
    objetivo: "Objetivo base",
    nivelExperiencia: "PRINCIPIANTE",
    sesiones: [sesionValida()],
    ...ajustes,
  };
}

export function microcicloValido(ajustes: Record<string, unknown> = {}) {
  return {
    nombre: "Micro 1",
    fechaInicio: "2026-01-01",
    fechaFin: "2026-01-31",
    sesiones: [sesionValida()],
    ...ajustes,
  };
}

export function mesocicloValido(ajustes: Record<string, unknown> = {}) {
  return {
    nombre: "Meso 1",
    fechaInicio: "2026-01-01",
    fechaFin: "2026-06-30",
    microciclos: [microcicloValido()],
    ...ajustes,
  };
}

export function macrocicloValido(ajustes: Record<string, unknown> = {}) {
  return {
    nombre: "Macro 1",
    fechaInicio: "2026-01-01",
    fechaFin: "2026-12-31",
    mesociclos: [mesocicloValido()],
    ...ajustes,
  };
}

/** Body válido de creación personalizada (RU-09; DEC-062/DEC-063). */
export function payloadRutinaPersonalizada(ajustes: Record<string, unknown> = {}) {
  return {
    tipoRutina: "PERSONALIZADA",
    nombre: "Rutina personalizada INC10",
    descripcion: "Descripcion personalizada original",
    informacionGeneral: {
      objetivoGeneral: "Ganar masa muscular",
      nivelExperiencia: "INTERMEDIO",
      fechaEvaluacion: "2026-01-01",
    },
    diagnostico: {
      diagnostico: "Buena postura general",
      restriccionesMedicas: null,
      lesionesPrevias: null,
      observacionesGenerales: null,
    },
    macrociclos: [macrocicloValido()],
    tests: [{ nombre: "1RM sentadilla", resultado: "100 kg", fecha: "2026-01-01" }],
    antropometria: [
      { medida: "peso", valor: 75.5, unidad: "kg", fecha: "2026-01-01" },
      { medida: "perimetroCintura", valor: 82, unidad: "cm", fecha: "2026-01-01" },
    ],
    analisisBiomecanico: [
      { zona: "RODILLA", hallazgo: "LEVE", descripcion: "Leve molestia", fecha: "2026-01-01" },
    ],
    ...ajustes,
  };
}

// ─── Creación de rutinas por HTTP (fixture única: sin tocar prisma/**) ───────

export interface RespuestaHttp {
  statusCode: number;
  body: any;
  raw: string;
}

function respuesta(res: { statusCode: number; body: string }): RespuestaHttp {
  let body: any;
  try {
    body = JSON.parse(res.body);
  } catch {
    body = {};
  }
  return { statusCode: res.statusCode, body, raw: res.body };
}

/**
 * POST /rutinas (solo DUENO). Si el endpoint aún no existe (RED) lanza un
 * error EXPLÍCITO que documenta la causa del fallo.
 */
export async function crearRutinaBaseViaApi(
  app: any,
  tokenDueno: string,
  campos: Record<string, unknown>
): Promise<RespuestaHttp> {
  const res = await app.inject({
    method: "POST",
    url: "/rutinas",
    headers: headers(tokenDueno),
    payload: campos,
  });
  if (res.statusCode !== 201) {
    throw new Error(
      `FIXTURE INC-10 (RED): POST /rutinas respondio ${res.statusCode} (esperado 201). ` +
        `Si es 404, el endpoint de rutinas aun no existe (GREEN T7) — fallo de ` +
        `comportamiento ausente esperado. Cuerpo: ${res.body.slice(0, 200)}`
    );
  }
  return respuesta(res);
}

/** POST /rutinas-personalizadas (solo DUENO) con la misma tolerancia RED. */
export async function crearRutinaPersonalizadaViaApi(
  app: any,
  tokenDueno: string,
  campos: Record<string, unknown>
): Promise<RespuestaHttp> {
  const res = await app.inject({
    method: "POST",
    url: "/rutinas-personalizadas",
    headers: headers(tokenDueno),
    payload: campos,
  });
  if (res.statusCode !== 201) {
    throw new Error(
      `FIXTURE INC-10 (RED): POST /rutinas-personalizadas respondio ${res.statusCode} ` +
        `(esperado 201). Si es 404, el endpoint aun no existe (GREEN T7) — fallo de ` +
        `comportamiento ausente esperado. Cuerpo: ${res.body.slice(0, 200)}`
    );
  }
  return respuesta(res);
}

/**
 * POST /clientes/:clienteId/rutinas/asignacion (solo DUENO). Tolerancia RED
 * idéntica.
 */
export async function asignarRutinaViaApi(
  app: any,
  tokenDueno: string,
  clienteId: string,
  payload: Record<string, unknown>
): Promise<RespuestaHttp> {
  const res = await app.inject({
    method: "POST",
    url: `/clientes/${clienteId}/rutinas/asignacion`,
    headers: headers(tokenDueno),
    payload,
  });
  return respuesta(res);
}

// ─── Limpieza tolerante (modelos nuevos ausentes en RED) ─────────────────────

/**
 * Elimina asignaciones/rutinas de los clientes del prefijo (si los modelos
 * existen), las vigencias personalizadas (membresiaGym) y los clientes.
 */
export async function limpiarFixtures(prefijo: string): Promise<void> {
  const clientes = await prisma.cliente.findMany({
    where: { cedula: { startsWith: prefijo } },
    select: { id: true },
  });
  const clienteIds = clientes.map((cliente) => cliente.id);

  const modeloAsignacion = (prisma as any).rutinaAsignacion;
  if (modeloAsignacion && typeof modeloAsignacion.deleteMany === "function") {
    await modeloAsignacion.deleteMany({ where: { clienteId: { in: clienteIds } } });
  }
  const modeloRutina = (prisma as any).rutina;
  if (modeloRutina && typeof modeloRutina.deleteMany === "function") {
    await modeloRutina.deleteMany({});
  }

  if (clienteIds.length > 0) {
    const vigencias = await prisma.membresiaGym.findMany({
      where: { clienteId: { in: clienteIds } },
      select: { id: true },
    });
    const vigenciaIds = vigencias.map((v) => v.id);
    if (vigenciaIds.length > 0) {
      await prisma.membresiaGymCambio.deleteMany({
        where: { membresiaId: { in: vigenciaIds } },
      });
    }
    await prisma.membresiaGym.deleteMany({ where: { clienteId: { in: clienteIds } } });
    await prisma.clienteEstadoCambio.deleteMany({
      where: { clienteId: { in: clienteIds } },
    });
    await prisma.cliente.deleteMany({ where: { id: { in: clienteIds } } });
  }
  await prisma.user.deleteMany({ where: { email: EMAIL_DUENO_2 } });
}
