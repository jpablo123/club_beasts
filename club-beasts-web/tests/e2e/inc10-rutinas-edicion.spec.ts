/**
 * FIX INC10-FIX-03b (2026-11-08) — Viajes dedicados **INC10-NAV-AUD-06**:
 * logout "Salir" desde las 4 pantallas `/rutinas*` (NAV-RU-05, salida
 * "logout → login"). SOLO tests; sin cambios de producto.
 *
 * Enmienda documentada `FIX INC10-FIX-03b`: archivo NUEVO (autorizado por el
 * contrato FIX-03b como único spec nuevo). Alberga los viajes AUD-06 porque
 * son transversales a las 4 pantallas staff de rutinas, **incluida la de
 * edición**; los viajes de edición en sí (AUD-02/02b) ya viven en
 * `inc10-rutinas-cobertura.spec.ts` (trabajo previo de FIX-03b, intacto) y los
 * de entrada al listado (AUD-01) en `inc10-rutinas-listado.spec.ts`.
 *
 * Hallazgo -> viaje (FIX-03a habilitó `Navbar showAuth` en las 4 pantallas;
 * cobertura nueva sobre código existente — RED no aplicable, declarado):
 *  - INC10-NAV-AUD-06 / NAV-RU-05 "logout → login":
 *      AUD-06-1  /rutinas           (DUENO)          -> "Salir" -> `/`
 *      AUD-06-2  /rutinas/nueva     (DUENO)          -> "Salir" -> `/`
 *      AUD-06-3  /rutinas/[id]      (DUENO)          -> "Salir" -> `/`
 *      AUD-06-4  /rutinas/[id]/editar (DUENO)        -> "Salir" -> `/`
 *      AUD-06-5  /rutinas           (RECEPCIONISTA)  -> "Salir" -> `/`
 *
 * Cada viaje exige: pantalla de origen cargada (guarda positiva), control
 * "Salir" único (`toHaveCount(1)`) y visible, aterrizaje en la landing `/`
 * con la sesión cerrada (CTA "Iniciar sesion", nunca "Ir al sistema") y la
 * guarda de middleware verificada después (URL directa a la misma ruta ->
 * `/login`, sin bypass). Sin PIN bypass en ninguna parte.
 *
 * Localizadores C3/C7: "Salir" y "Iniciar sesion" son UI preexistente FUERA de
 * las regiones nuevas (header de `inc10-rutinas-e2e-helpers.ts`); no se aplica
 * `verificarSinProhibidos` al Navbar.
 *
 * Restricciones INC00-QA-01/02: sin `isVisible()` condicional, `waitForTimeout`,
 * skips ni `only`; fixtures deterministas con nombres únicos por viaje.
 */
import { test, expect, type Page } from "@playwright/test";
import { loginComoDueno } from "./e2e-helpers";
import {
  BTN_CREAR_RUTINA,
  crearRutinaBaseApi,
  loginComoRecepcionista,
  payloadRutinaBase,
  regionRutinas,
} from "./inc10-rutinas-e2e-helpers";

// ─── Helpers locales (sin tocar los helpers compartidos) ─────────────────────

/** Localizador endurecido (C4): role button con nombre exacto "Salir". */
function salirControl(page: Page) {
  return page.getByRole("button", { name: "Salir", exact: true });
}

/** Landing `/` anónima: hero + CTA de login (demuestra sesión cerrada). */
async function expectLandingAnonima(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Alto Rendimiento" })).toBeVisible();
  // Sesión cerrada: solo el CTA anónimo (nunca "Ir al sistema").
  await expect(page.getByRole("link", { name: "Iniciar sesion", exact: true })).toHaveCount(
    1
  );
  await expect(page.getByRole("link", { name: "Ir al sistema", exact: true })).toHaveCount(
    0
  );
}

/**
 * Guarda de sesión: sin sesión la ruta staff deriva a `/login` (middleware),
 * sin pantalla de gestión y sin control "Salir".
 */
async function expectGuardaLogin(page: Page, ruta: string): Promise<void> {
  await page.goto(ruta);
  await expect(page).toHaveURL(/\/login\/?$/);
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(salirControl(page)).toHaveCount(0);
}

/**
 * Recorrido completo de logout desde una pantalla `/rutinas*` ya cargada
 * (guarda positiva en el test) -> "Salir" único y visible -> landing `/`
 * anónima -> guarda de middleware re-verificada en la misma ruta.
 */
async function expectLogoutDesde(page: Page, ruta: string): Promise<void> {
  const salir = salirControl(page);
  await expect(salir).toHaveCount(1);
  await expect(salir).toBeVisible();

  await salir.click();

  await expectLandingAnonima(page);
  await expectGuardaLogin(page, ruta);
}

// ─── INC10-NAV-AUD-06 — logout desde las 4 pantallas /rutinas* ───────────────

test.describe("NAV-RU-05 logout desde /rutinas* (AUD-06)", () => {
  test("AUD-06-1 'Salir' desde /rutinas (DUENO) aterriza en / y cierra la sesión", async ({
    page,
  }) => {
    await loginComoDueno(page);
    await page.goto("/rutinas");
    await expect(regionRutinas(page)).toHaveCount(1);

    await expectLogoutDesde(page, "/rutinas");
  });

  test("AUD-06-2 'Salir' desde /rutinas/nueva (DUENO) aterriza en / y cierra la sesión", async ({
    page,
  }) => {
    await loginComoDueno(page);
    await page.goto("/rutinas/nueva");
    await expect(
      page.getByRole("button", { name: "Rutina generica", exact: true })
    ).toHaveCount(1);

    await expectLogoutDesde(page, "/rutinas/nueva");
  });

  test("AUD-06-3 'Salir' desde el detalle /rutinas/[id] (DUENO) aterriza en / y cierra la sesión", async ({
    page,
    request,
  }) => {
    const rutina = await crearRutinaBaseApi(
      request,
      payloadRutinaBase({ nombre: "AUD06 salida detalle" })
    );
    await loginComoDueno(page);
    await page.goto(`/rutinas/${rutina.id}`);
    await expect(
      page.getByRole("heading", { name: "AUD06 salida detalle", exact: true })
    ).toHaveCount(1);

    await expectLogoutDesde(page, `/rutinas/${rutina.id}`);
  });

  test("AUD-06-4 'Salir' desde el editor /rutinas/[id]/editar (DUENO) aterriza en / y cierra la sesión", async ({
    page,
    request,
  }) => {
    const rutina = await crearRutinaBaseApi(
      request,
      payloadRutinaBase({ nombre: "AUD06 salida edicion" })
    );
    await loginComoDueno(page);
    await page.goto(`/rutinas/${rutina.id}/editar`);
    await expect(page.getByLabel("Nombre de la rutina", { exact: true })).toHaveValue(
      "AUD06 salida edicion"
    );

    await expectLogoutDesde(page, `/rutinas/${rutina.id}/editar`);
  });

  test("AUD-06-5 'Salir' desde /rutinas (RECEPCIONISTA) aterriza en / y cierra la sesión", async ({
    page,
  }) => {
    await loginComoRecepcionista(page);
    await page.goto("/rutinas");
    // Variante de rol: RECEP también llega al listado en modo lectura.
    await expect(regionRutinas(page)).toHaveCount(1);
    await expect(
      page.getByRole("button", { name: BTN_CREAR_RUTINA, exact: true })
    ).toHaveCount(0);

    await expectLogoutDesde(page, "/rutinas");
  });
});
