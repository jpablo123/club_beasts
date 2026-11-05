/**
 * INC-09 (RED) — helpers compartidos de los tests de anamnesis deportiva.
 *
 * Criterios: AN-01..AN-33 (HU-09/10/11/28) + orden de errores R7 del contrato
 * API RATIFICADO del spec de INC-09-anamnesis-deportiva (2026-11-04).
 *
 * Patron de RED tolerante al artefacto ausente (contrato del orquestador):
 *  - Las rutas de producto se importan por ESPECIFICADOR VARIABLE para que el
 *    RED compile/ejecute sin `src/routes/anamnesis` (GREEN T9 lo crea). Sin el
 *    modulo los endpoints responden 404 y los tests fallan por COMPORTAMIENTO
 *    AUSENTE (endpoints inexistentes), nunca por error de carga.
 *  - Ningun helper crea tablas ni modifica prisma/**: el modelo `Anamnesis` lo
 *    aporta el GREEN (T8, migracion 10/0). Los fixtures de anamnesis pasan
 *    SIEMPRE por HTTP (POST /clientes/:id/anamnesis).
 *  - La limpieza tolera el modelo `Anamnesis` ausente (solo limpia si existe).
 *
 * Errores: los tests derivan los mensajes de campo del schema CANONICO
 * (`features/acceptance-criteria/HU-11-schemas.ts` -> guardarParcialAnamnesisSchema,
 * INC09-R08). Literales contractuales fijados por el spec: 404 cliente
 * "Cliente no encontrado"/NOT_FOUND; 404 anamnesis "El cliente no tiene una
 * anamnesis registrada"/ANAMNESIS_NO_ENCONTRADA; 400 VALIDATION_ERROR; 409
 * ANAMNESIS_EXISTENTE; SIN_REGISTRO mensaje "Aun no hay una anamnesis registrada
 * para este cliente.".
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

/** Mensaje literal AN-26 (HU-11-schemas / contrato ratificado). */
export const MENSAJE_AN26 = "La anamnesis debe tener al menos un campo diligenciado";

/** Mensaje literal de 404 de cliente (contrato ratificado R7). */
export const MENSAJE_404_CLIENTE = "Cliente no encontrado";

/** Mensaje literal de 404 de anamnesis (contrato ratificado R7). */
export const MENSAJE_404_ANAMNESIS = "El cliente no tiene una anamnesis registrada";

/** Mensaje literal SIN_REGISTRO (R2, fijado en el RED). */
export const MENSAJE_SIN_REGISTRO =
  "Aun no hay una anamnesis registrada para este cliente.";

/**
 * Ruta del router de anamnesis que el GREEN debe proveer (patrón del repo:
 * `src/routes/<entidad>.ts` con export default). Especificador VARIABLE a
 * propósito: TypeScript no exige que el módulo exista y el RED puede ejecutar.
 */
const RUTA_MODULO_ANAMNESIS = "../../src/routes/anamnesis";

export interface AppAnamnesis {
  app: any;
  /** true si `src/routes/anamnesis` existía y quedó registrado (solo evidencia). */
  rutaAnamnesisRegistrada: boolean;
}

/**
 * App Fastify de test con TODO el producto actual registrado + el router de
 * anamnesis si ya existe (el GREEN también puede exponer los endpoints desde
 * `clientes.ts`/`portal.ts`, que ya se registran aquí).
 */
export async function crearAppAnamnesis(): Promise<AppAnamnesis> {
  const app = Fastify();
  await app.register(prismaPlugin);
  await app.register(authPlugin);
  await app.register(authRoutes);
  await app.register(clienteRoutes);
  await app.register(membresiaRoutes);
  await app.register(portalRoutes);
  await app.register(recepcionRoutes);

  let rutaAnamnesisRegistrada = false;
  try {
    const especificador: string = RUTA_MODULO_ANAMNESIS;
    const modulo: any = await import(especificador);
    const rutas = modulo.default ?? modulo.anamnesisRoutes;
    if (typeof rutas !== "function") {
      throw new Error("el modulo no exporta un plugin de rutas");
    }
    await app.register(rutas);
    rutaAnamnesisRegistrada = true;
  } catch {
    // RED INC-09: `src/routes/anamnesis` no existe aun (GREEN T9). Los
    // endpoints responden 404 y los tests fallan por comportamiento ausente.
  }

  await app.ready();
  return { app, rutaAnamnesisRegistrada };
}

export function parseBody(res: { body: string }): any {
  return JSON.parse(res.body);
}

export function headers(token: string) {
  return { authorization: `Bearer ${token}` };
}

// ─── Sesiones (seed determinista de setup-isolated-sqlite.ts) ─────────────────

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

/** JWT con firma válida y `exp` en el pasado (patrón auth-session-expired). */
export function tokenExpirado(app: any, payload: Record<string, unknown>): string {
  const pastExp = Math.floor(Date.now() / 1000) - 120;
  return app.jwt.sign({ ...payload, exp: pastExp });
}

// ─── Fixtures de cliente / usuario (modelos existentes) ───────────────────────

const PIN_FIXTURE = "1234";

export interface ClienteFixture {
  id: string;
  cedula: string;
}

let seqClientes = 0;

/**
 * Cliente único por corrida (prefijo de cédula propio del archivo de test,
 * DEC-012). `estado` por defecto ACTIVO.
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
      nombres: opciones.nombres ?? "Anamnesis",
      apellidos: opciones.apellidos ?? `Cliente ${letra}`,
      telefono: "3000000000",
      sedeId: "sede-1",
      pin: await bcrypt.hash(PIN_FIXTURE, 4),
      estado: opciones.estado ?? "ACTIVO",
    },
  });
  return { id: cliente.id, cedula };
}

export const PIN_CLIENTE_FIXTURE = PIN_FIXTURE;

/** Segundo DUENO real (trazabilidad: editar con un actor distinto). */
export const EMAIL_DUENO_2 = "dueno2-inc09@test.com";

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

/**
 * Limpieza tolerante: elimina anamnesis SOLO si el modelo existe (GREEN T8),
 * luego los clientes del prefijo y el segundo DUENO.
 */
export async function limpiarFixtures(prefijo: string): Promise<void> {
  const clientes = await prisma.cliente.findMany({
    where: { cedula: { startsWith: prefijo } },
    select: { id: true },
  });
  const clienteIds = clientes.map((cliente) => cliente.id);

  const modeloAnamnesis = (prisma as any).anamnesis;
  if (modeloAnamnesis && typeof modeloAnamnesis.deleteMany === "function") {
    await modeloAnamnesis.deleteMany({ where: { clienteId: { in: clienteIds } } });
  }
  if (clienteIds.length > 0) {
    await prisma.clienteEstadoCambio.deleteMany({
      where: { clienteId: { in: clienteIds } },
    });
    await prisma.cliente.deleteMany({ where: { id: { in: clienteIds } } });
  }
  await prisma.user.deleteMany({ where: { email: EMAIL_DUENO_2 } });
}

// ─── Payloads (Anexo DEC-052: 25 propiedades / 23 campos) ────────────────────

/**
 * Body COMPLETO y consistente: los 25 campos diligenciados (18a = "SI" para que
 * la condicional 18b aplique) -> estado derivado COMPLETA.
 */
export function payloadCompleto(
  ajustes: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    // S1 — Identificacion personal
    nombreCompleto: "Ana Maria Perez",
    numeroDocumento: "1020304050",
    sexo: "FEMENINO",
    rh: "O+",
    edad: 25,
    fechaNacimiento: "1998-04-12",
    lugarNacimiento: "Bogota D.C.",
    estadoCivil: "Soltero",
    direccionResidencia: "Calle 45 # 12-34",
    numeroContacto: "3001234567",
    correoElectronico: "ana@mail.com",
    // S2 — Deporte
    practicaDeporte: "SI",
    cualDeporte: "Futbol",
    tiempoQuePractica: "3 anos",
    // S3 — Emergencia y salud
    contactoEmergencia: "Maria Perez 3001112233",
    eps: "Nueva EPS",
    antecedentesMedicos: ["Alergias"],
    antecedentesFamiliares: "Diabetes en abuelos",
    enfermedadRelevante: "SI",
    cualEnfermedad: "Hipertension",
    // S4 — Objetivos y estilo de vida
    objetivosEntrenamiento: "Ganar masa muscular",
    nivelActividad: "estoy bastante activo durante mi dia",
    diasNoEntrenamiento: ["lunes", "viernes"],
    horaAcostarse: "22:30",
    comidasPorDia: 3,
    ...ajustes,
  };
}

/**
 * Valores DISTINCTIVOS de campos sensibles (DEC-055) para asertar que ni las
 * claves ni los valores viajan a RECEPCIONISTA (AN-15 / INC09-R05).
 */
export const VALORES_SENSIBLES = {
  rh: "AB-",
  antecedentesMedicos: ["consume psicoactivos"],
  antecedentesFamiliares: "Abuelo con Alzheimer",
  enfermedadRelevante: "SI",
  cualEnfermedad: "Hipertension severa",
} as const;

/** Payload COMPLETO cuyos 5 sensibles llevan valores únicos fácilmente rastreables. */
export function payloadConSensiblesRastreables(
  ajustes: Record<string, unknown> = {}
): Record<string, unknown> {
  return payloadCompleto({
    rh: VALORES_SENSIBLES.rh,
    antecedentesMedicos: [...VALORES_SENSIBLES.antecedentesMedicos],
    antecedentesFamiliares: VALORES_SENSIBLES.antecedentesFamiliares,
    enfermedadRelevante: VALORES_SENSIBLES.enfermedadRelevante,
    cualEnfermedad: VALORES_SENSIBLES.cualEnfermedad,
    ...ajustes,
  });
}

// ─── Creación de anamnesis por HTTP (fixture única: sin tocar prisma/**) ─────

export interface RespuestaAnamnesis {
  statusCode: number;
  body: any;
  raw: string;
}

/**
 * POST /clientes/:clienteId/anamnesis (solo DUENO). Si el endpoint aún no
 * existe (RED) lanza un error EXPLÍCITO que documenta la causa del fallo.
 */
export async function crearAnamnesisViaApi(
  app: any,
  tokenDueno: string,
  clienteId: string,
  campos: Record<string, unknown>
): Promise<RespuestaAnamnesis> {
  const res = await app.inject({
    method: "POST",
    url: `/clientes/${clienteId}/anamnesis`,
    headers: headers(tokenDueno),
    payload: campos,
  });
  const raw = res.body;
  let body: any;
  try {
    body = JSON.parse(raw);
  } catch {
    body = {};
  }
  if (res.statusCode !== 201) {
    throw new Error(
      `FIXTURE INC-09 (RED): POST /clientes/${clienteId}/anamnesis respondio ` +
        `${res.statusCode} (esperado 201). Si es 404, el endpoint de anamnesis ` +
        `aun no existe (GREEN T9) — fallo de comportamiento ausente esperado. ` +
        `Cuerpo: ${raw.slice(0, 200)}`
    );
  }
  return { statusCode: res.statusCode, body, raw };
}

/** Mensaje del PRIMER error del schema canónico (INC05-CONF-01 / INC09-R08). */
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
