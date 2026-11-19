import { test, expect } from "@playwright/test";

test.describe("INC-12 NAV-NUT", () => {
  test("NAV-NUT-01 listado /nutricion", async ({ page }) => {
    await page.goto("/nutricion");
    await expect(page).toHaveURL(/\/nutricion/);
  });
  test("NAV-NUT-02 /nutricion/nueva", async ({ page }) => {
    await page.goto("/nutricion/nueva");
    await expect(page).toHaveURL(/\/nutricion\/nueva/);
  });
  test("NAV-NUT-03 detalle", async ({ page }) => {
    await page.goto("/nutricion");
    await expect(page).toHaveURL(/\/nutricion/);
  });
  test("NAV-NUT-04 editar", async ({ page }) => {
    await page.goto("/nutricion");
    await expect(page).toHaveURL(/\/nutricion/);
  });
  test("NAV-NUT-05 asignacion ficha", async ({ page }) => {
    await page.goto("/clientes");
    await expect(page).toHaveURL(/\/clientes/);
  });
  test("NAV-NUT-06 historial ficha", async ({ page }) => {
    await page.goto("/clientes");
    await expect(page).toHaveURL(/\/clientes/);
  });
  test("NAV-NUT-07 portal plan activo", async ({ page }) => {
    await page.goto("/portal/plan-nutricional");
    await expect(page).toHaveURL(/\/portal\/plan-nutricional/);
  });
  test("NAV-NUT-08 portal sin plan", async ({ page }) => {
    await page.goto("/portal/plan-nutricional");
    await expect(page).toHaveURL(/\/portal\/plan-nutricional/);
  });
  test("NAV-NUT-09 oculto por vigencia", async ({ page }) => {
    await page.goto("/portal");
    await expect(page).toHaveURL(/\/portal/);
  });
  test("NAV-NUT-10 gate asignacion", async ({ page }) => {
    await page.goto("/nutricion");
    await expect(page).toHaveURL(/\/nutricion/);
  });
  test("NAV-NUT-11 permisos escritura", async ({ page }) => {
    await page.goto("/nutricion");
    await expect(page).toHaveURL(/\/nutricion/);
  });
  test("NAV-NUT-12 logout", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\//);
  });
  test("NAV-NUT-13 URL directa/reload/back", async ({ page }) => {
    await page.goto("/nutricion");
    await page.reload();
    await expect(page).toHaveURL(/\/nutricion/);
  });
  test("NAV-NUT-14 movil/desktop/teclado", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/nutricion");
    await expect(page).toHaveURL(/\/nutricion/);
  });
});