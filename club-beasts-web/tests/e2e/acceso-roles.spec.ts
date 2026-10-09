import { test, expect } from "@playwright/test";

/**
 * INC01-ROL-01 (gap G1 de `docs/producto/auditoria-puntos-inc00.md` seccion 4)
 * — guard de rol de la UI, HU-01 bullet 3 ("solo los modulos permitidos
 * segun el rol").
 *
 * El comportamiento ya esta implementado en `src/middleware.ts:41-47`
 * (fuera de alcance de INC-01: solo se prueba). Este spec cubre la rama
 * negativa que no tenia prueba automatizada:
 *
 *  a) CLIENTE autenticado navega a /clientes  -> termina en /portal.
 *  b) CLIENTE autenticado navega a /dashboard -> termina en /portal.
 *  c) RECEPCIONISTA autenticado accede a /clientes y ve los modulos
 *     "Clientes" y "Dashboard" en la navegacion.
 *
 * Fixtures (DEC-012/DEC-013, seed determinista):
 *  - Cliente seed: cedula 1234567890, PIN 1234.
 *  - Staff seed: recep@clubbeasts.com / recep123 (RECEPCIONISTA).
 *
 * Restricciones INC00-QA-01/INC00-QA-02 vigentes: sin `isVisible()`
 * condicional, sin `waitForTimeout`, sin aserciones vacias (`expect(true)`),
 * sin `skip`/`only`. Un paso obligatorio ausente debe fallar la prueba.
 */

async function loginComoCliente(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/login-cliente");
  await page.getByPlaceholder("Ingresa tu cedula").fill("1234567890");
  await page.getByPlaceholder("****").fill("1234");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/.*portal/);
}

async function loginComoRecepcionista(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill("recep@clubbeasts.com");
  await page.getByLabel("Contrasena").fill("recep123");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/.*clientes/);
}

test.describe("INC01-ROL-01 guard de rol de la UI", () => {
  test("CLIENTE autenticado que navega a /clientes termina en /portal", async ({ page }) => {
    await loginComoCliente(page);

    await page.goto("/clientes");

    await expect(page).toHaveURL(/.*portal/);
    await expect(page.getByRole("heading", { name: "Mi Portal" })).toBeVisible();
  });

  test("CLIENTE autenticado que navega a /dashboard termina en /portal", async ({ page }) => {
    await loginComoCliente(page);

    await page.goto("/dashboard");

    await expect(page).toHaveURL(/.*portal/);
    await expect(page.getByRole("heading", { name: "Mi Portal" })).toBeVisible();
  });

  test("RECEPCIONISTA autenticado accede a /clientes y ve los modulos Clientes y Dashboard", async ({
    page,
  }) => {
    await loginComoRecepcionista(page);

    await expect(page).toHaveURL(/.*clientes/);
    await expect(page.locator("h1")).toContainText("Clientes");
    await expect(page.getByRole("link", { name: "Clientes", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Dashboard", exact: true })).toBeVisible();
  });
});
