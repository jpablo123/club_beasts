import { test, expect, type Page } from "@playwright/test";
import { loginComoDueno } from "./e2e-helpers";

/**
 * INC-07 / INC-06 (auditoria de navegacion 2026-10-29) — viajes faltantes
 * H-01a y H-01d del informe `ui-navigation-auditor`: las filas `/dashboard`
 * staff y "logout por rol" quedaron sin recorrido ejecutado.
 *
 * Hallazgos cerrados aqui:
 *  - H-01a (matriz INC-07, fila `/dashboard` staff): URL directa con sesion
 *    staff viva -> **sin cambio respecto a hoy**: el dashboard es accesible
 *    para DUENO y RECEPCIONISTA (sin redirect, sin bucle).
 *  - H-01d (logout por rol): "Salir" desde `/dashboard` (Navbar,
 *    `signOut({ callbackUrl: "/" })`) -> **`/`** (landing, DEC-050) con la
 *    sesion cerrada (la landing vuelve a mostrar los CTAs de login).
 *
 * Destinos fijados (DEC-050): `/dashboard` sin cambio; logout staff -> `/`.
 * Comportamiento esperado SIN CAMBIO: son viajes de verificacion sobre
 * comportamiento ya implementado (sin fase RED: no se agrega ni se repara
 * comportamiento aqui; un rojo seria una regresion real del destino fijado).
 *
 * Decision de archivo (contrato del orquestador, 2026-10-29): viajes NUEVOS
 * en archivo nuevo `inc07-dashboard-staff.spec.ts` (preferencia del contrato)
 * en vez de extender `acceso-roles.spec.ts` (E2E aceptado de INC-01, que
 * queda intocado). Los hallazgos H-01b/H-01c/H-02 se cierran en
 * `inc06-acceso-membresia.spec.ts` (contrato propio de INC-06).
 *
 * Fixtures (DEC-012/DEC-013, seed determinista de `start-api-e2e.mjs`; sin
 * datos nuevos: los viajes usan usuarios staff del seed):
 *  - Staff seed: admin@clubbeasts.com / admin123 (DUENO, "David Rozo").
 *  - Staff seed: recep@clubbeasts.com / recep123 (RECEPCIONISTA, "Maria Garcia").
 *
 * Restricciones INC00-QA-01/INC00-QA-02: sin `isVisible()` condicional, sin
 * `waitForTimeout`, skips ni `only`, sin aserciones vacias; un paso
 * obligatorio ausente falla la prueba.
 */

const RECEPCIONISTA = { email: "recep@clubbeasts.com", password: "recep123" };

/** Login de recepcionista por la UI (seed determinista); aterriza en /clientes. */
async function loginComoRecepcionista(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(RECEPCIONISTA.email);
  await page.getByLabel("Contrasena").fill(RECEPCIONISTA.password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/.*clientes/);
}

/**
 * Dashboard staff accesible (H-01a, destino sin cambio): URL `/dashboard`
 * sin redirect, identidad de la sesion, modulos del rol y control de salida.
 */
async function expectDashboardStaff(page: Page, nombre: string): Promise<void> {
  await expect(page).toHaveURL(/\/dashboard\/?$/);
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true })
  ).toBeVisible();
  await expect(
    page.getByText(`Bienvenido, ${nombre}`, { exact: true })
  ).toBeVisible();
  // Permisos del rol: los modulos de staff siguen visibles en la navegacion.
  await expect(
    page.getByRole("link", { name: "Clientes", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Dashboard", exact: true })
  ).toBeVisible();
  // Salida del rol en esta pantalla (control "Salir" del Navbar).
  await expect(
    page.getByRole("button", { name: "Salir", exact: true })
  ).toBeVisible();
}

/**
 * Landing `/` de un anonimo: hero + CTAs de login visibles. Demuestra que el
 * logout cerro la sesion (con sesion viva la landing muestra "Ir al sistema").
 */
async function expectLandingAnonima(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("heading", { name: "Alto Rendimiento" })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Iniciar sesion", exact: true })
  ).toBeVisible();
}

// ─── H-01a: URL directa /dashboard con sesion staff (matriz INC-07) ─────────

test.describe("INC07 /dashboard staff URL directa (H-01a)", () => {
  test("URL directa /dashboard con sesion DUENO: dashboard accesible sin cambio", async ({
    page,
  }) => {
    await loginComoDueno(page);
    await page.goto("/dashboard");
    await expectDashboardStaff(page, "David Rozo");
  });

  test("URL directa /dashboard con sesion RECEPCIONISTA: dashboard accesible sin cambio", async ({
    page,
  }) => {
    await loginComoRecepcionista(page);
    await page.goto("/dashboard");
    await expectDashboardStaff(page, "Maria Garcia");
  });
});

// ─── H-01d: logout por rol desde /dashboard ("Salir" -> /, DEC-050) ─────────

test.describe("INC07 logout por rol desde /dashboard (H-01d)", () => {
  test("'Salir' desde /dashboard (DUENO) cierra la sesion y aterriza en la landing /", async ({
    page,
  }) => {
    await loginComoDueno(page);
    await page.goto("/dashboard");
    await expectDashboardStaff(page, "David Rozo");

    const salir = page.getByRole("button", { name: "Salir", exact: true });
    await salir.click();

    // Destino fijado (DEC-050): logout staff -> "/" (landing), sesion cerrada.
    await expectLandingAnonima(page);
  });

  test("'Salir' desde /dashboard (RECEPCIONISTA) cierra la sesion y aterriza en la landing /", async ({
    page,
  }) => {
    await loginComoRecepcionista(page);
    await page.goto("/dashboard");
    await expectDashboardStaff(page, "Maria Garcia");

    const salir = page.getByRole("button", { name: "Salir", exact: true });
    await salir.click();

    await expectLandingAnonima(page);
  });
});
