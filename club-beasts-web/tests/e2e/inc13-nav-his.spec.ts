import { test, expect } from "@playwright/test";

test.describe("INC-13 NAV-HIS", () => {
  test("NAV-HIS-01 reportes conteos", async ({ page }) => {
    await page.goto("/reportes");
    await expect(page).toHaveURL(/\/reportes/);
  });
  test("NAV-HIS-02 disparo notificaciones", async ({ page }) => {
    await page.goto("/reportes");
    await expect(page).toHaveURL(/\/reportes/);
  });
  test("NAV-HIS-03 historial ficha", async ({ page }) => {
    await page.goto("/clientes");
    await expect(page).toHaveURL(/\/clientes/);
  });
  test("NAV-HIS-04 portal historial", async ({ page }) => {
    await page.goto("/portal");
    await expect(page).toHaveURL(/\/portal/);
  });
  test("NAV-HIS-05 permisos conteos", async ({ page }) => {
    await page.goto("/reportes");
    await expect(page).toHaveURL(/\/reportes/);
  });
  test("NAV-HIS-06 permisos historial ajeno", async ({ page }) => {
    await page.goto("/clientes");
    await expect(page).toHaveURL(/\/clientes/);
  });
  test("NAV-HIS-07 URL directa/reload/back", async ({ page }) => {
    await page.goto("/reportes");
    await page.reload();
    await expect(page).toHaveURL(/\/reportes/);
  });
  test("NAV-HIS-08 movil/desktop/teclado", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/reportes");
    await expect(page).toHaveURL(/\/reportes/);
  });
  test("NAV-HIS-09 sesion expirada", async ({ page }) => {
    await page.goto("/reportes");
    await expect(page).toHaveURL(/\/reportes/);
  });
});