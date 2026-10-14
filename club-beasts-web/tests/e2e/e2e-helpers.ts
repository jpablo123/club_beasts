import { expect, type APIRequestContext, type Page } from "@playwright/test";

/**
 * Helpers compartidos de los E2E (INC00-QA-05 / INC00-CLI-05 / GAP-009).
 *
 * - La API E2E la levanta `tests/e2e/start-api-e2e.mjs` (SQLite temporal
 *   aislado, fixtures deterministas) en el puerto 3001.
 * - Todo dato de prueba se crea con cedula/telefono unicos: ninguna prueba
 *   depende del orden de ejecucion de las demas.
 */

export const API_URL = "http://localhost:3001";
export const ADMIN = { email: "admin@clubbeasts.com", password: "admin123" };

/** Mensaje aprobado de sesion vencida (identico al cuerpo de AUTH_TOKEN_EXPIRED). */
export const MENSAJE_SESION_VENCIDA =
  "Tu sesión venció por seguridad. Inicia sesión de nuevo para continuar.";

/** Login de staff por la UI; aterriza en la lista de clientes. */
export async function loginComoDueno(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel("Contrasena").fill(ADMIN.password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/.*clientes/);
}

let contadorCedula = 0;

/** Cedula de 10 digitos unica dentro de la corrida (prefijo 8: no choca con el seed 1234567890). */
export function cedulaUnica(): string {
  contadorCedula += 1;
  const tiempo = Date.now().toString().slice(-6);
  const unico = String(contadorCedula).padStart(3, "0");
  return `8${tiempo}${unico}`;
}

/** Telefono movil colombiano unico por cedula (regex ^3\d{9}$). */
export function telefonoUnico(): string {
  return `3${Date.now().toString().slice(-9)}`;
}

/** Token de la API para armar fixtures via HTTP (mismo canal que usa el navegador). */
export async function tokenApi(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${API_URL}/auth/login`, {
    data: { email: ADMIN.email, password: ADMIN.password },
  });
  expect(res.ok(), `POST /auth/login devolvio ${res.status()}`).toBe(true);
  const body = (await res.json()) as { token?: string };
  expect(typeof body.token).toBe("string");
  return body.token as string;
}

export interface ClienteFixture {
  id: string;
  cedula: string;
}

export interface OpcionesCliente {
  sedeId: string;
  nombres?: string;
  apellidos?: string;
}

/** Crea un cliente via API; devuelve id y cedula para localizarlo en la UI. */
export async function crearClienteApi(
  request: APIRequestContext,
  opciones: OpcionesCliente
): Promise<ClienteFixture> {
  const token = await tokenApi(request);
  const cedula = cedulaUnica();
  const res = await request.post(`${API_URL}/clientes`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      cedula,
      nombres: opciones.nombres ?? "Cliente",
      apellidos: opciones.apellidos ?? "Prueba",
      telefono: telefonoUnico(),
      sedeId: opciones.sedeId,
    },
  });
  expect(res.ok(), `POST /clientes devolvio ${res.status()}: ${await res.text()}`).toBe(
    true
  );
  const body = (await res.json()) as { id: string };
  expect(typeof body.id).toBe("string");
  return { id: body.id, cedula };
}

/** Cambia el estado de un cliente via API (el alta siempre nace en NUEVO). */
export async function cambiarEstadoCliente(
  request: APIRequestContext,
  clienteId: string,
  estado: "NUEVO" | "ACTIVO" | "SUSPENDIDO" | "RETIRADO" | "INACTIVO"
): Promise<void> {
  const token = await tokenApi(request);
  const res = await request.patch(`${API_URL}/clientes/${clienteId}`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { estado },
  });
  expect(res.ok(), `PATCH /clientes/${clienteId} devolvio ${res.status()}: ${await res.text()}`).toBe(
    true
  );
}

function pad(dia: number): string {
  return String(dia).padStart(2, "0");
}

/**
 * Hoy en America/Bogota (UTC-5, sin DST): la API calcula el estado de la
 * membresia con este dia, asi que el E2E debe usar el mismo calendario.
 */
export function hoyBogota(): string {
  const bogota = new Date(Date.now() - 5 * 3600_000);
  return `${bogota.getUTCFullYear()}-${pad(bogota.getUTCMonth() + 1)}-${pad(
    bogota.getUTCDate()
  )}`;
}

/** `fechaISO +/- dias` sobre calendario (sin horas, sin desfase de zona horaria). */
export function sumarDias(fechaISO: string, dias: number): string {
  const [y, m, d] = fechaISO.split("-").map(Number);
  const fecha = new Date(Date.UTC(y, m - 1, d) + dias * 86400_000);
  return `${fecha.getUTCFullYear()}-${pad(fecha.getUTCMonth() + 1)}-${pad(
    fecha.getUTCDate()
  )}`;
}

/** dd/mm/yyyy tal como lo muestra la UI. */
export function fechaLarga(fechaISO: string): string {
  const [y, m, d] = fechaISO.split("-");
  return `${d}/${m}/${y}`;
}

/** Distancia en dias de calendario (fin - inicio), sin conteo inclusivo. */
export function diferenciaDias(inicioISO: string, finISO: string): number {
  const [y1, m1, d1] = inicioISO.split("-").map(Number);
  const [y2, m2, d2] = finISO.split("-").map(Number);
  const inicio = Date.UTC(y1, m1 - 1, d1);
  const fin = Date.UTC(y2, m2 - 1, d2);
  return Math.round((fin - inicio) / 86400_000);
}

/** Dias de calendario inclusivos: inicio y fin cuentan (INC00-MEM-06). */
export function diasInclusivos(inicioISO: string, finISO: string): number {
  return diferenciaDias(inicioISO, finISO) + 1;
}

/** Convierte `dd/mm/yyyy` (texto de la UI) a `yyyy-mm-dd`. */
export function isoDesdeLarga(fechaLargaText: string): string {
  const [d, m, y] = fechaLargaText.split("/");
  return `${y}-${m}-${d}`;
}

// ─── INC-03 (tarea 19): fixtures de portal / recepcion ──────────────────────

export interface VigenciaFixture {
  id: string;
  fechaInicio: string;
  fechaFin: string;
  version: number;
}

/** Vigencia GYM via API (misma superficie que consume el navegador). */
export async function crearVigenciaApi(
  request: APIRequestContext,
  clienteId: string,
  fechaInicio: string,
  fechaFin: string
): Promise<VigenciaFixture> {
  const token = await tokenApi(request);
  const res = await request.post(`${API_URL}/clientes/${clienteId}/membresias-gym`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { fechaInicio, fechaFin },
  });
  const cuerpo = (await res.json()) as Partial<VigenciaFixture> & { error?: string };
  expect(
    res.ok(),
    `POST /membresias-gym devolvio ${res.status()}: ${JSON.stringify(cuerpo)}`
  ).toBe(true);
  expect(typeof cuerpo.id).toBe("string");
  expect(typeof cuerpo.fechaFin).toBe("string");
  return {
    id: cuerpo.id as string,
    fechaInicio: cuerpo.fechaInicio as string,
    fechaFin: cuerpo.fechaFin as string,
    version: cuerpo.version as number,
  };
}

/** Aplica una pausa (fixture de congelacion) via API. */
export async function congelarApi(
  request: APIRequestContext,
  clienteId: string,
  vigenciaId: string,
  rango: { fechaInicio: string; fechaFin: string; motivo: string; version: number }
): Promise<{ fechaFin: string; version: number; diasCongelados: number }> {
  const token = await tokenApi(request);
  const res = await request.post(
    `${API_URL}/clientes/${clienteId}/vigencias/${vigenciaId}/congelar`,
    {
      headers: { Authorization: `Bearer ${token}` },
      data: rango,
    }
  );
  const cuerpo = (await res.json()) as {
    fechaFin?: string;
    version?: number;
    diasCongelados?: number;
    error?: string;
  };
  expect(
    res.ok(),
    `POST .../congelar devolvio ${res.status()}: ${JSON.stringify(cuerpo)}`
  ).toBe(true);
  return {
    fechaFin: cuerpo.fechaFin as string,
    version: cuerpo.version as number,
    diasCongelados: cuerpo.diasCongelados as number,
  };
}

/**
 * Fija un PIN conocido para un cliente y deja `debeCambiarPin = false`.
 * El portal exige PIN fijo y NO fuerza el cambio de PIN (los clientes creados
 * por API nacen con `debeCambiarPin: true`, lo que mostraria el formulario de
 * cambio en vez del portal).
 */
export async function fijarPinApi(
  request: APIRequestContext,
  clienteId: string,
  pin = "1234"
): Promise<void> {
  const token = await tokenApi(request);
  const res = await request.post(`${API_URL}/auth/reset-pin`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { clienteId, newPin: pin },
  });
  expect(
    res.ok(),
    `POST /auth/reset-pin devolvio ${res.status()}: ${await res.text()}`
  ).toBe(true);
}

/** Cliente portal listo para login: creado, PIN fijo y sin cambio pendiente. */
export async function crearClientePortalApi(
  request: APIRequestContext,
  opciones: OpcionesCliente
): Promise<ClienteFixture> {
  const cliente = await crearClienteApi(request, opciones);
  await fijarPinApi(request, cliente.id);
  return cliente;
}

/** Login de cliente (cedula + PIN) por la UI; aterriza en /portal. */
export async function loginComoClienteCon(
  page: Page,
  cedula: string,
  pin: string
): Promise<void> {
  await page.goto("/login-cliente");
  await page.getByPlaceholder("Ingresa tu cedula").fill(cedula);
  await page.getByPlaceholder("****").fill(pin);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/.*portal/);
}

/** Card contenedor (`div.rounded-card`) que contiene el heading indicado. */
export function cardCon(page: Page, heading: string) {
  return page
    .locator("div.rounded-card")
    .filter({ has: page.getByRole("heading", { name: heading }) });
}
