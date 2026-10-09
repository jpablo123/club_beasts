import { test, expect } from "@playwright/test";
import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { decode, encode } from "next-auth/jwt";
import { ADMIN, API_URL, MENSAJE_SESION_VENCIDA, loginComoDueno } from "./e2e-helpers";

/**
 * GAP-009 / INC00-AUTH-01, AUTH-02 y AUTH-03 (E2E real en navegador).
 *
 * Camino tecnico: con una sesion de staff valida se inyecta en la cookie de
 * sesion un `apiToken` JWT firmado con el secreto de la API E2E pero con `exp`
 * en el pasado. El token de la sesion next-auth sigue siendo valido (por eso el
 * navegador no sale en modo proactivo) y el 401 con `AUTH_TOKEN_EXPIRED` lo
 * produce la API real al procesar la peticion: no hay ninguna respuesta
 * simulada ni ningun paso opcional.
 */

const WEB_URL = "http://localhost:3000";

/** Lee un secreto del propio entorno E2E sin imprimirlo. Lanza si no existe. */
async function leerSecreto(fichero: string, patron: RegExp): Promise<string> {
  const config = test.info().config.configFile;
  // El directorio de la app E2E es el que contiene playwright.config.ts
  // (rootDir apunta al testDir, no a la raíz del proyecto).
  const raiz = config ? path.dirname(path.resolve(config)) : path.resolve(process.cwd());
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

/**
 * JWT HS256 con firma valida y `exp` en el pasado: la API responde
 * 401 `AUTH_TOKEN_EXPIRED` (y no `AUTH_TOKEN_INVALID`).
 */
function tokenApiVencido(secreto: string): string {
  const base64url = (valor: string) => Buffer.from(valor).toString("base64url");
  const ahora = Math.floor(Date.now() / 1000);
  const cabecera = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const cuerpo = base64url(
    JSON.stringify({
      id: "e2e-token-vencido",
      email: ADMIN.email,
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

test.describe("Recuperación de sesión por token vencido (E2E)", () => {
  test("un 401 AUTH_TOKEN_EXPIRED real muestra el banner, cierra la sesión y conserva la pantalla original", async ({
    page,
    context,
  }) => {
    await loginComoDueno(page);

    // Ninguna respuesta de /api/auth/session debe quedar en vuelo: Auth.js
    // re-firma la cookie en cada respuesta y pisaría la inyección de abajo.
    await page.waitForLoadState("networkidle");

    const secretoNextAuth = await leerSecreto(
      "playwright.config.ts",
      /NEXTAUTH_SECRET:\s*"([^"]+)"/
    );
    const secretoApi = await leerSecreto(
      path.join("tests", "e2e", "start-api-e2e.mjs"),
      /JWT_SECRET:\s*"([^"]+)"/
    );

    const cookies = await context.cookies(WEB_URL);
    const cookieSesion = cookies.find((c) => c.name.includes("session-token"));
    if (!cookieSesion) {
      throw new Error("Debe existir una cookie de sesión después del login de staff.");
    }

    const payload = await decode({
      token: cookieSesion.value,
      secret: secretoNextAuth,
      salt: cookieSesion.name,
    });
    expect(payload, "la cookie de sesión debe ser decodificable con el secreto de la app").not.toBeNull();
    if (!payload) throw new Error("cookie de sesión ilegible");
    expect(typeof payload.apiToken).toBe("string");
    // El navegador todavía no sabe que el token de la API venció: la salida
    // tiene que venir del 401 real, no de la comprobación proactiva local.
    expect(
      Number(payload.apiTokenExpiresAt),
      "el vencimiento local debe seguir siendo futuro para ejercitar el 401"
    ).toBeGreaterThan(Math.floor(Date.now() / 1000));

    const tokenVencido = tokenApiVencido(secretoApi);
    const cookieVencida = await encode({
      token: { ...payload, apiToken: tokenVencido },
      secret: secretoNextAuth,
      salt: cookieSesion.name,
    });
    await context.addCookies([{ ...cookieSesion, value: cookieVencida }]);

    // Evidencia de que el 401 lo emite la API real (INC00-AUTH-01).
    const respuestas401: Array<{ code?: string; error?: string }> = [];
    page.on("response", (respuesta) => {
      if (!respuesta.url().startsWith(API_URL)) return;
      if (respuesta.status() !== 401) return;
      void respuesta
        .json()
        .then((cuerpo: { code?: string; error?: string }) =>
          respuestas401.push({ code: cuerpo?.code, error: cuerpo?.error })
        )
        .catch(() => respuestas401.push({}));
    });

    // Dispara la acción sobre una pantalla protegida.
    await page.reload();

    // Condición de partida verificable: el navegador viaja con el token
    // vencido inyectado (si otra respuesta hubiera pisado la cookie, el
    // test falla aquí y no simula un 401).
    const sesionConTokenVencido = await page.evaluate(async () => {
      const respuesta = await fetch("/api/auth/session");
      return respuesta.json();
    });
    expect(
      sesionConTokenVencido?.user?.apiToken,
      "el navegador debe usar el apiToken vencido inyectado"
    ).toBe(tokenVencido);

    await expect
      .poll(() => respuestas401.length, {
        message: "la API E2E debe responder al menos un 401 a la petición del navegador",
        timeout: 15000,
        intervals: [100, 250, 500],
      })
      .toBeGreaterThan(0);
    const ultimo401 = respuestas401[respuestas401.length - 1];
    expect(
      ultimo401.code,
      `401 observados: ${JSON.stringify(respuestas401)}`
    ).toBe("AUTH_TOKEN_EXPIRED");
    expect(ultimo401.error).toBe(MENSAJE_SESION_VENCIDA);

    // INC00-AUTH-03: vuelve al login correcto conservando la pantalla original.
    await expect(page).toHaveURL(/\/login\?/);
    await expect(page).toHaveURL(/callbackUrl=%2Fclientes/);

    // INC00-AUTH-02: mensaje aprobado en un banner accesible. Next.js añade
    // además un `role="alert"` vacío (route announcer), por lo que el locator
    // se acota al alert que contiene el mensaje aprobado: si no existe, la
    // aserción falla.
    const banner = page
      .getByRole("alert")
      .filter({ hasText: MENSAJE_SESION_VENCIDA });
    await expect(banner).toHaveCount(1);
    await expect(banner).toHaveText(MENSAJE_SESION_VENCIDA);

    // INC00-AUTH-02: la sesión y sus datos privados quedan limpios.
    const cookiesTras = await context.cookies(WEB_URL);
    expect(
      cookiesTras.some((c) => c.name.includes("session-token")),
      "la cookie de sesión debe eliminarse tras la recuperación"
    ).toBe(false);
    const sesion = await page.evaluate(async () => {
      const respuesta = await fetch("/api/auth/session");
      return respuesta.json();
    });
    expect(sesion?.user, "la sesión del navegador debe quedar vacía").toBeFalsy();

    // INC00-AUTH-03: el callbackUrl regresa a la pantalla original.
    await page.getByLabel("Email").fill(ADMIN.email);
    await page.getByLabel("Contrasena").fill(ADMIN.password);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page).toHaveURL(/.*clientes/);
    await expect(page.locator("h1")).toContainText("Clientes");
  });
});
