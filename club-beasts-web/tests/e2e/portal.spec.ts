import { test, expect } from "@playwright/test";

test.describe("Portal del Cliente", () => {
  test("muestra información del cliente autenticado", async ({ page }) => {
    // Login como cliente (necesitamos un cliente de prueba)
    await page.goto("/login-cliente");
    await page.fill('input[placeholder="Ingrese su cédula"]', "1234567890");
    await page.fill('input[placeholder="****"]', "1234");
    await page.click('button[type="submit"]');

    // Verificar que redirige al portal
    await expect(page).toHaveURL(/.*portal/);

    // Verificar que muestra información del cliente
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("portal sin sesión redirige a login", async ({ page }) => {
    await page.goto("/portal");
    await expect(page).toHaveURL(/.*login/);
  });

  test("portal muestra secciones de información", async ({ page }) => {
    // Login primero
    await page.goto("/login-cliente");
    await page.fill('input[placeholder="Ingrese su cédula"]', "1234567890");
    await page.fill('input[placeholder="****"]', "1234");
    await page.click('button[type="submit"]');

    // Verificar secciones del portal
    await expect(page.locator("text=Mi Perfil").or(page.locator("text=Datos Personales"))).toBeVisible();
  });
});
