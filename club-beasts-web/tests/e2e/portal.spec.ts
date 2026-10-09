import { test, expect } from "@playwright/test";

async function loginAsClient(page: import("@playwright/test").Page) {
  await page.goto("/login-cliente");
  await page.getByPlaceholder("Ingresa tu cedula").fill("1234567890");
  await page.getByPlaceholder("****").fill("1234");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/.*portal/);
}

test.describe("Portal del Cliente", () => {
  test("muestra información del cliente autenticado", async ({ page }) => {
    await loginAsClient(page);

    await expect(page.getByRole("heading", { name: "Mi Portal" })).toBeVisible();
    await expect(page.getByText("Carlos Rodriguez", { exact: true })).toBeVisible();
  });

  test("portal sin sesión redirige a login", async ({ page }) => {
    await page.goto("/portal");
    await expect(page).toHaveURL(/.*login/);
  });

  test("portal muestra secciones de información", async ({ page }) => {
    await loginAsClient(page);

    await expect(page.getByRole("heading", { name: "Mi Informacion" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Mi Rutina" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Plan Nutricional" })).toBeVisible();
  });
});
