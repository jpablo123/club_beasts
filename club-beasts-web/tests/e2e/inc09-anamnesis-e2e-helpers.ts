/**
 * INC-09 (RED) — helpers E2E de anamnesis deportiva (NAV-AN-01..09).
 *
 * No modifica `e2e-helpers.ts` (base intacta): aquí viven los fixtures y
 * localizadores propios del incremento.
 *
 * Localizadores C7 (ratificados): scope
 * `getByRole("region", { name: "Anamnesis deportiva", exact: true })`;
 * SIEMPRE `exact: true` + `toHaveCount(1|0)`; nombres nuevos sin los
 * substrings prohibidos. Nombres aprobados: "Mi anamnesis",
 * "Diligenciar anamnesis", "Modificar anamnesis", "Aplicar cambios",
 * "Descartar cambios", "Cambios sin guardar", "Si, descartar",
 * "Seguir editando".
 */
import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { API_URL, tokenApi } from "./e2e-helpers";

export const REGION_ANAMNESIS = "Anamnesis deportiva";
export const MENSAJE_SIN_REGISTRO =
  "Aun no hay una anamnesis registrada para este cliente.";

/** Claves SENSIBLES de DEC-055 (ausentes para RECEPCIONISTA en red y DOM). */
export const CLAVES_SENSIBLES = [
  "rh",
  "antecedentesMedicos",
  "antecedentesFamiliares",
  "enfermedadRelevante",
  "cualEnfermedad",
] as const;

export const ETIQUETAS_SENSIBLES = [
  "RH",
  "Antecedentes médicos",
  "Antecedentes familiares",
  "Enfermedad relevante",
  "Cual enfermedad",
] as const;

/** Encabezados de las 4 secciones del Anexo (SECCIONES_ANAMNESIS). */
export const ENCABEZADOS_SECCIONES = [
  "Identificacion personal",
  "Deporte",
  "Emergencia y salud",
  "Objetivos y estilo de vida",
] as const;

/** 25 propiedades consistentes (18a=SI para que 18b aplique) -> COMPLETA. */
export function payloadAnamnesisCompleto(
  ajustes: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
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
    practicaDeporte: "SI",
    cualDeporte: "Futbol",
    tiempoQuePractica: "3 anos",
    contactoEmergencia: "Maria Perez 3001112233",
    eps: "Nueva EPS",
    antecedentesMedicos: ["Alergias"],
    antecedentesFamiliares: "Diabetes en abuelos",
    enfermedadRelevante: "SI",
    cualEnfermedad: "Hipertension",
    objetivosEntrenamiento: "Ganar masa muscular",
    nivelActividad: "estoy bastante activo durante mi dia",
    diasNoEntrenamiento: ["lunes", "viernes"],
    horaAcostarse: "22:30",
    comidasPorDia: 3,
    ...ajustes,
  };
}

/** Igual que el completo pero con valores SENSIBLES fácilmente rastreables. */
export function payloadConSensiblesRastreables(
  ajustes: Record<string, unknown> = {}
): Record<string, unknown> {
  return payloadAnamnesisCompleto({
    rh: "AB-",
    antecedentesMedicos: ["consume psicoactivos"],
    antecedentesFamiliares: "Abuelo con Alzheimer",
    enfermedadRelevante: "SI",
    cualEnfermedad: "Hipertension severa",
    ...ajustes,
  });
}

/**
 * Crea la anamnesis via API (fixture). Si el endpoint aún no existe (RED),
 * el fallo es explícito y documentado: comportamiento ausente, no fixture rota.
 */
export async function crearAnamnesisApi(
  request: APIRequestContext,
  clienteId: string,
  campos: Record<string, unknown>
): Promise<void> {
  const token = await tokenApi(request);
  const res = await request.post(`${API_URL}/clientes/${clienteId}/anamnesis`, {
    headers: { Authorization: `Bearer ${token}` },
    data: campos,
  });
  expect(
    res.ok(),
    `FIXTURE INC-09 (RED): POST /clientes/${clienteId}/anamnesis devolvio ` +
      `${res.status()} (esperado 201). Si es 404 el endpoint de anamnesis aun no ` +
      `existe (GREEN T9) — fallo de comportamiento ausente esperado. ` +
      `${await res.text()}`
  ).toBe(true);
}

/** Login de recepcionista (seed) por la UI; aterriza en /clientes. */
export async function loginComoRecepcionista(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill("recep@clubbeasts.com");
  await page.getByLabel("Contrasena").fill("recep123");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/.*clientes/);
}

/** Scope C7 de la sección de anamnesis. */
export function regionAnamnesis(page: Page) {
  return page.getByRole("region", { name: REGION_ANAMNESIS, exact: true });
}

// ─── Sesión expirada (mismo mecanismo que sesion-vencida.spec.ts) ────────────

/** Lee un secreto del entorno E2E sin imprimirlo. Lanza si no existe. */
export async function leerSecreto(fichero: string, patron: RegExp): Promise<string> {
  const config = test.info().config.configFile;
  const raiz = config
    ? path.dirname(path.resolve(config))
    : path.resolve(process.cwd());
  const ruta = path.join(raiz, fichero);
  let texto: string;
  try {
    texto = await readFile(ruta, "utf8");
  } catch (error) {
    throw new Error(
      `No se pudo leer ${ruta} para obtener el secreto de E2E: ${String(error)}`
    );
  }
  const coincidencia = texto.match(patron);
  if (!coincidencia) {
    throw new Error(
      `No se encontro el secreto requerido para E2E en ${fichero} (patron ${patron.source}).`
    );
  }
  return coincidencia[1];
}

/** JWT HS256 staff (DUENO) con firma válida y `exp` en el pasado. */
export function tokenApiVencidoDueno(secreto: string): string {
  const base64url = (valor: string) => Buffer.from(valor).toString("base64url");
  const ahora = Math.floor(Date.now() / 1000);
  const cabecera = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const cuerpo = base64url(
    JSON.stringify({
      id: "e2e-token-vencido-inc09",
      email: "admin@clubbeasts.com",
      nombre: "David Rozo",
      rol: "DUENO",
      iat: ahora - 7200,
      exp: ahora - 60,
    })
  );
  const firma = createHmac("sha256", secreto)
    .update(`${cabecera}.${cuerpo}`)
    .digest("base64url");
  return `${cabecera}.${cuerpo}.${firma}`;
}

export { API_URL };
