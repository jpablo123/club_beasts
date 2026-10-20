import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { crearClienteApi, loginComoClienteCon } from "./e2e-helpers";

/**
 * Flujo del cambio obligatorio de PIN (`debeCambiarPin = true`).
 *
 * Los clientes creados por API / recepcion rapida nacen con `debeCambiarPin:
 * true` (schema default), asi que el portal los frena con `ChangePinForm`
 * antes de mostrar datos. Este spec cubre el ciclo completo de salida de esa
 * pantalla, que antes solo se esquivaba con `fijarPinApi` (ver comentario de
 * ese helper): el bug reproducido era que el formulario volvia a aparecer
 * aunque el PIN ya se habia cambiado.
 */

const PIN_SEED = "1234";
const PIN_NUEVO = "4321";

/** Cliente recien creado: PIN por defecto 1234 y cambio pendiente. */
async function crearClienteConCambioPendiente(
  request: APIRequestContext
): Promise<string> {
  const cliente = await crearClienteApi(request, {
    sedeId: "sede-1",
    nombres: "Pin",
    apellidos: "Obligatorio",
  });
  return cliente.cedula;
}

/** Cambia el PIN desde el formulario obligatorio del portal. */
async function cambiarPinObligatorio(page: Page): Promise<void> {
  await expect(
    page.getByRole("heading", { name: "Cambio de PIN Obligatorio" })
  ).toBeVisible();

  await page.getByLabel("PIN Actual").fill(PIN_SEED);
  // `exact: true` porque "Nuevo PIN" es substring de "Confirmar Nuevo PIN":
  // sin ello Playwright falla en strict mode (2 matches) y el flujo completo
  // de salida del formulario ni siquiera se ejecutaba.
  await page.getByLabel("Nuevo PIN", { exact: true }).fill(PIN_NUEVO);
  await page.getByLabel("Confirmar Nuevo PIN").fill(PIN_NUEVO);
  await page.getByRole("button", { name: "Cambiar PIN" }).click();

  await expect(page.getByRole("heading", { name: "PIN Actualizado" })).toBeVisible();
}

test.describe("Cambio obligatorio de PIN", () => {
  test("tras cambiar el PIN el portal queda accesible: volver al inicio no repite el formulario", async ({
    page,
    request,
  }) => {
    const cedula = await crearClienteConCambioPendiente(request);

    await loginComoClienteCon(page, cedula, PIN_SEED);
    await cambiarPinObligatorio(page);

    // El logo del Navbar es el "Inicio" al que vuelve el usuario.
    await page.locator('nav a[href="/"]').click();
    await expect(page).toHaveURL(/\/$/);

    await page.goto("/portal");

    // BUG: el formulario volvia a aparecer aunque el PIN ya estaba cambiado.
    await expect(
      page.getByRole("heading", { name: "Cambio de PIN Obligatorio" })
    ).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Mi Portal" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Mi Informacion" })).toBeVisible();
  });

  test("tras cambiar el PIN, recargar el portal no vuelve a pedir el cambio", async ({
    page,
    request,
  }) => {
    const cedula = await crearClienteConCambioPendiente(request);

    await loginComoClienteCon(page, cedula, PIN_SEED);
    await cambiarPinObligatorio(page);

    await page.reload();

    await expect(
      page.getByRole("heading", { name: "Cambio de PIN Obligatorio" })
    ).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Mi Portal" })).toBeVisible();
  });

  test("el PIN nuevo sirve para iniciar sesion y el viejo ya no", async ({
    page,
    request,
  }) => {
    const cedula = await crearClienteConCambioPendiente(request);

    await loginComoClienteCon(page, cedula, PIN_SEED);
    await cambiarPinObligatorio(page);

    await page.context().clearCookies();

    // PIN viejo -> rechazado.
    await page.goto("/login-cliente");
    await page.getByPlaceholder("Ingresa tu cedula").fill(cedula);
    await page.getByPlaceholder("****").fill(PIN_SEED);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page.getByText("Cedula o PIN invalido")).toBeVisible();

    // PIN nuevo -> entra y YA no vuelve a exigir el cambio.
    await page.getByPlaceholder("****").fill(PIN_NUEVO);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page).toHaveURL(/.*portal/);
    await expect(
      page.getByRole("heading", { name: "Cambio de PIN Obligatorio" })
    ).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Mi Portal" })).toBeVisible();
  });
});
