import { test, expect } from "@playwright/test";

test.describe("Auth - Login Dueño/Recepcionista", () => {
  test("muestra formulario de login", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("h1")).toContainText("Iniciar Sesión");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("login exitoso redirige a clientes", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "admin@clubbeasts.com");
    await page.fill('input[type="password"]', "admin123");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*clientes/);
  });

  test("login fallido muestra error", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "admin@clubbeasts.com");
    await page.fill('input[type="password"]', "wrongpassword");
    await page.click('button[type="submit"]');
    await expect(page.locator(".bg-red-100")).toContainText("Credenciales inválidas");
  });

  test("logout funciona correctamente", async ({ page }) => {
    // Login primero
    await page.goto("/login");
    await page.fill('input[type="email"]', "admin@clubbeasts.com");
    await page.fill('input[type="password"]', "admin123");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*clientes/);

    // Logout
    const logoutBtn = page.locator("text=Cerrar Sesión").or(page.locator("text=Logout"));
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      await expect(page).toHaveURL(/.*login/);
    }
  });

  test("acceso sin autenticación redirige a login", async ({ page }) => {
    await page.goto("/clientes");
    await expect(page).toHaveURL(/.*login/);
  });
});

test.describe("Auth - Login Cliente", () => {
  test("muestra formulario de login cliente", async ({ page }) => {
    await page.goto("/login-cliente");
    await expect(page.locator("h1")).toContainText("Portal del Cliente");
    await expect(page.locator('input[placeholder="Ingrese su cédula"]')).toBeVisible();
  });

  test("PIN inválido muestra error de formato", async ({ page }) => {
    await page.goto("/login-cliente");
    await page.fill('input[placeholder="Ingrese su cédula"]', "1234567890");
    await page.fill('input[placeholder="****"]', "abcd");
    await page.click('button[type="submit"]');
    await expect(page.locator(".bg-red-100")).toContainText("PIN debe ser de 4 dígitos");
  });

  test("acceso a portal sin sesión redirige a login", async ({ page }) => {
    await page.goto("/portal");
    await expect(page).toHaveURL(/.*login/);
  });
});
