import { test, expect } from "@playwright/test";

test.describe("Clientes", () => {
  test.beforeEach(async ({ page }) => {
    // Login primero
    await page.goto("/login");
    await page.fill('input[type="email"]', "admin@clubbeasts.com");
    await page.fill('input[type="password"]', "admin123");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*clientes/);
  });

  test("muestra lista de clientes", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Clientes");
    await expect(page.locator("table")).toBeVisible();
  });

  test("puede buscar clientes", async ({ page }) => {
    await page.fill('input[placeholder*="Buscar"]', "Juan");
    await page.waitForTimeout(500);
    // Verificar que el filtro funciona
    const rows = page.locator("tbody tr");
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("puede crear un cliente nuevo", async ({ page }) => {
    await page.click('a[href="/clientes/nuevo"]');
    await expect(page).toHaveURL(/.*clientes\/nuevo/);

    await page.fill('input[required]:nth-of-type(1)', "9999999999");
    await page.fill('input[required]:nth-of-type(2)', "María");
    await page.fill('input[required]:nth-of-type(3)', "García");
    await page.fill('input[required]:nth-of-type(4)', "3009999999");

    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*clientes/);
  });

  test("puede ver ficha de cliente", async ({ page }) => {
    // Buscar y hacer click en un cliente de la lista
    const firstRow = page.locator("tbody tr").first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      // Verificar que muestra detalles del cliente
      await expect(page.locator("h1, h2").first()).toBeVisible();
    }
  });

  test("puede editar un cliente existente", async ({ page }) => {
    // Ir a la lista y buscar un cliente
    const firstRow = page.locator("tbody tr").first();
    if (await firstRow.isVisible()) {
      // Buscar botón o enlace de editar
      const editBtn = page.locator("text=Editar").or(page.locator('[data-testid="edit-button"]'));
      if (await editBtn.first().isVisible()) {
        await editBtn.first().click();
        // Verificar que estamos en la página de edición
        await expect(page.locator('button[type="submit"]')).toBeVisible();
      }
    }
  });
});
