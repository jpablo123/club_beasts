import { test, expect, type Page } from "@playwright/test";
import {
  API_URL,
  cambiarEstadoCliente,
  crearClienteApi,
  fijarPinApi,
} from "./e2e-helpers";

/**
 * INC-04 / `INC04-CLI-04` (DEC-034) — bloqueo de login del cliente INACTIVO.
 *
 * Comportamiento exigido (spec INC-04 #3 y #7):
 *  - el backend responde 401 `AUTH_CLIENTE_INACTIVO` con el literal aprobado
 *    "La cuenta está inactiva. Contacte con recepción." y **sin** `token`;
 *  - `src/lib/auth.ts` propaga ese literal via `CredentialsSignin.code`
 *    (Auth.js v5 beta lo entrega como `code=` percent-encoded en la URL de
 *    error) y `/login-cliente` lo muestra en su `role="alert"`;
 *  - el navegador nunca entra al portal.
 *
 * Fixtures: SQLite temporal aislado por corrida (DEC-012), cliente creado via
 * API con cedula unica, PIN fijo y estado cambiado con motivo (DEC-035).
 *
 * Restricciones INC00-QA-01/02: sin `isVisible()` condicional, sin
 * `waitForTimeout`, sin skips ni `only`, sin aserciones vacias.
 */

/** Literal aprobado del contrato G14 (`HU08-C04a`), con tildes exactas. */
const LITERAL_CUENTA_INACTIVA =
  "La cuenta está inactiva. Contacte con recepción.";

/**
 * `role="alert"` del contenido de la pantalla. Se acota a `<main>` porque el
 * anunciador de rutas de Next.js (`#__next-route-announcer__`, siempre en el
 * DOM y colgando de `body`) tambien expone `role="alert"` y haria ambiguo el
 * localizador (mismo patron de acotado que `cardCon` en recepcion).
 */
function alertaDePantalla(page: Page) {
  return page.locator("main").getByRole("alert");
}

test.describe("INC04-CLI-04: el login de un cliente INACTIVO se bloquea con su literal", () => {
  test("el navegador muestra 'La cuenta está inactiva. Contacte con recepción.' y no entra al portal", async ({
    page,
    request,
  }) => {
    const cliente = await crearClienteApi(request, { sedeId: "sede-1" });
    await fijarPinApi(request, cliente.id);
    await cambiarEstadoCliente(request, cliente.id, "INACTIVO");

    // ── Backend (mismo canal que usa el navegador): 401 + literal + sin token.
    const loginApi = await request.post(`${API_URL}/auth/login-cliente`, {
      data: { cedula: cliente.cedula, pin: "1234" },
    });
    expect(loginApi.status(), "login de un cliente INACTIVO").toBe(401);
    const cuerpo = (await loginApi.json()) as {
      code?: string;
      error?: string;
      token?: string;
    };
    expect(cuerpo.code).toBe("AUTH_CLIENTE_INACTIVO");
    expect(cuerpo.error).toBe(LITERAL_CUENTA_INACTIVA);
    expect(cuerpo.token, "el bloqueo no debe entregar sesion").toBeUndefined();

    // ── UI: el literal llega al navegador (percent-encoded en el `code` de
    //    la URL de error) y se pinta en el role=alert del formulario.
    await page.goto("/login-cliente");
    await page.getByPlaceholder("Ingresa tu cedula").fill(cliente.cedula);
    await page.getByPlaceholder("****").fill("1234");
    await page.getByRole("button", { name: "Ingresar" }).click();

    await expect(alertaDePantalla(page)).toContainText(LITERAL_CUENTA_INACTIVA);
    await expect(page).toHaveURL(/.*login-cliente/);
    await expect(page.getByRole("heading", { name: "Mi Portal" })).toHaveCount(0);
  });

  test("control: un cliente ACTIVO con el mismo PIN si loguea (el bloqueo es por estado, no por credenciales)", async ({
    page,
    request,
  }) => {
    const cliente = await crearClienteApi(request, { sedeId: "sede-1" });
    await fijarPinApi(request, cliente.id);
    await cambiarEstadoCliente(request, cliente.id, "ACTIVO");

    await page.goto("/login-cliente");
    await page.getByPlaceholder("Ingresa tu cedula").fill(cliente.cedula);
    await page.getByPlaceholder("****").fill("1234");
    await page.getByRole("button", { name: "Ingresar" }).click();

    await expect(page).toHaveURL(/.*portal/);
    await expect(page.getByRole("heading", { name: "Mi Portal" })).toBeVisible();
    await expect(alertaDePantalla(page)).toHaveCount(0);
  });
});
