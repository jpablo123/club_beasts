import { test, expect } from "@playwright/test";

test.describe("Auth - Login Dueño/Recepcionista", () => {
  test("muestra formulario de login", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Iniciar Sesion" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Contrasena")).toBeVisible();
  });

  test("login exitoso redirige a clientes", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@clubbeasts.com");
    await page.getByLabel("Contrasena").fill("admin123");
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page).toHaveURL(/.*clientes/);
  });

  test("login fallido muestra error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@clubbeasts.com");
    await page.getByLabel("Contrasena").fill("wrongpassword");
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page.locator(".bg-red-500\\/20")).toContainText("Credenciales invalidas");
  });

  test("logout funciona correctamente", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@clubbeasts.com");
    await page.getByLabel("Contrasena").fill("admin123");
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page).toHaveURL(/.*clientes/);

    await page.getByRole("button", { name: "Salir" }).click();
    await expect(page).toHaveURL(/.*\/$/);
    await expect(page.getByRole("link", { name: "Iniciar sesion" })).toBeVisible();
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
    await expect(page.getByPlaceholder("Ingresa tu cedula")).toBeVisible();
  });

  test("PIN inválido muestra error de formato", async ({ page }) => {
    await page.goto("/login-cliente");
    await page.getByPlaceholder("Ingresa tu cedula").fill("1234567890");
    const pinInput = page.getByPlaceholder("****");
    await pinInput.fill("12");
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(pinInput).toHaveJSProperty("validity.valid", false);
  });

  test("acceso a portal sin sesión redirige a login", async ({ page }) => {
    await page.goto("/portal");
    await expect(page).toHaveURL(/.*login/);
  });
});
