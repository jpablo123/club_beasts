/**
 * INC-10 (RED) — Creación de rutina base (NAV-RU-02..NAV-RU-05).
 * Matriz NAV-RU re-escopada C2/C7 del spec de INC-10-rutinas:
 *   NAV-RU-02  Formulario crear rutina (vacío): "Aplicar cambios" valida;
 *              "Descartar cambios" -> listado sin guardar; "Volver al listado".
 *   NAV-RU-03  Con datos sin guardar: salida por Volver/Descartar con
 *              confirmación (patrón C5 INC-09: alertdialog "Cambios sin
 *              guardar" + "Si, descartar" / "Seguir editando").
 *   NAV-RU-04  Recarga / URL directa / atrás: estado coherente, sin bucles.
 *   NAV-RU-05  Permisos por rol: RECEPCIONISTA con URL directa de edición ->
 *              redirect al detalle (lectura); CLIENTE en /rutinas -> /portal
 *              (middleware C1).
 *
 * Contrato de UI fijado por este RED (C1/C3/C5/C7, para el GREEN T8):
 *  - `/rutinas/nueva` = selector de tipo (botones "Rutina generica",
 *    "Rutina de induccion", "Rutina personalizada") que revela el editor.
 *  - Editor base: "Nombre de la rutina", "Notas de la serie" (NUNCA
 *    "Observaciones"), botones "Aplicar cambios", "Descartar cambios",
 *    "Agregar sesión", "Agregar ejercicio", "Agregar serie", "Quitar serie".
 *  - "Aplicar cambios" válido -> detalle `/rutinas/:id` de la rutina creada.
 *  - "Aplicar cambios" inválido -> `role="alert"` con el mensaje canónico y
 *    foco al primer error.
 *  - "Descartar cambios" sucio -> alertdialog con "Cambios sin guardar",
 *    "Si, descartar" y "Seguir editando"; "Si, descartar" -> /rutinas sin
 *    persistir.
 *  - `/rutinas/:id/editar`: RECEPCIONISTA -> redirect a `/rutinas/:id`.
 *
 * FASE RED (2026-11-05): pantallas y endpoints NO existen (GREEN T7/T8).
 *
 * Restricciones INC00-QA-01/02: sin `isVisible()` condicional, `waitForTimeout`,
 * skips ni `only`; localizadores `exact: true` + `toHaveCount(1|0)` (C7).
 */
import { test, expect } from "@playwright/test";
import { loginComoDueno } from "./e2e-helpers";
import {
  BTN_APLICAR_CAMBIOS,
  BTN_DESCARTAR_CAMBIOS,
  BTN_SEGUIR_EDITANDO,
  BTN_SI_DESCARTAR,
  BTN_VOLVER_LISTADO,
  BANNER_CAMBIOS_SIN_GUARDAR,
  loginComoRecepcionista,
  regionRutinas,
  verificarSinProhibidos,
} from "./inc10-rutinas-e2e-helpers";

/** Llega al editor base desde /rutinas/nueva (selector de tipo). */
async function abrirEditorBase(page: import("@playwright/test").Page) {
  await page.goto("/rutinas/nueva");
  await page.getByRole("button", { name: "Rutina generica", exact: true }).click();
  await expect(page.getByLabel("Nombre de la rutina", { exact: true })).toHaveCount(1);
}

test.describe("NAV-RU-02 formulario crear rutina (vacío)", () => {
  test("el selector de tipo revela el editor con los controles exactos y sin prohibidos", async ({
    page,
  }) => {
    await loginComoDueno(page);
    await abrirEditorBase(page);

    await expect(page.getByRole("button", { name: BTN_APLICAR_CAMBIOS, exact: true })).toHaveCount(1);
    await expect(page.getByRole("button", { name: BTN_DESCARTAR_CAMBIOS, exact: true })).toHaveCount(1);
    await expect(page.getByRole("button", { name: BTN_VOLVER_LISTADO, exact: true })).toHaveCount(1);
    await expect(page.getByLabel("Notas de la serie", { exact: true }).first()).toHaveCount(1);
    await expect(page.getByLabel("Observaciones", { exact: true })).toHaveCount(0);

    await verificarSinProhibidos(page.locator("main"), "NAV-RU-02 editor base");
  });

  test("'Aplicar cambios' vacío muestra role=alert con el mensaje canónico", async ({ page }) => {
    await loginComoDueno(page);
    await abrirEditorBase(page);

    await page.getByRole("button", { name: BTN_APLICAR_CAMBIOS, exact: true }).click();
    await expect(page.getByRole("alert")).toHaveCount(1);
    await expect(
      page.getByText("Nombre debe tener entre 3 y 100 caracteres", { exact: true })
    ).toHaveCount(1);
  });

  test("crear con datos válidos aterriza en el detalle de la rutina creada", async ({ page }) => {
    await loginComoDueno(page);
    await abrirEditorBase(page);

    await page.getByLabel("Nombre de la rutina", { exact: true }).fill("NAV RU02 creada en flujo");
    await page.getByRole("button", { name: BTN_APLICAR_CAMBIOS, exact: true }).click();

    await expect(page).toHaveURL(/\/rutinas\/[^/]+$/);
    await expect(
      page.getByRole("heading", { name: "NAV RU02 creada en flujo", exact: true })
    ).toHaveCount(1);
  });

  test("'Descartar cambios' limpio y 'Volver al listado' vuelven sin guardar", async ({ page }) => {
    await loginComoDueno(page);
    await abrirEditorBase(page);

    await page.getByRole("button", { name: BTN_VOLVER_LISTADO, exact: true }).click();
    await expect(page).toHaveURL(/\/rutinas$/);
    await expect(regionRutinas(page)).toHaveCount(1);

    await abrirEditorBase(page);
    await page.getByRole("button", { name: BTN_DESCARTAR_CAMBIOS, exact: true }).click();
    await expect(page).toHaveURL(/\/rutinas$/);
  });
});

test.describe("NAV-RU-03 datos sin guardar (patrón C5 INC-09)", () => {
  test("descartar con datos abre el alertdialog y 'Si, descartar' sale sin persistir", async ({
    page,
  }) => {
    await loginComoDueno(page);
    await abrirEditorBase(page);
    await page.getByLabel("Nombre de la rutina", { exact: true }).fill("NAV RU03 sin guardar");

    await page.getByRole("button", { name: BTN_DESCARTAR_CAMBIOS, exact: true }).click();

    const alerta = page.getByRole("alertdialog");
    await expect(alerta).toHaveCount(1);
    await expect(alerta.getByText(BANNER_CAMBIOS_SIN_GUARDAR, { exact: true })).toHaveCount(1);
    await expect(alerta.getByRole("button", { name: BTN_SI_DESCARTAR, exact: true })).toHaveCount(1);
    await expect(alerta.getByRole("button", { name: BTN_SEGUIR_EDITANDO, exact: true })).toHaveCount(1);

    // "Seguir editando" conserva lo escrito.
    await alerta.getByRole("button", { name: BTN_SEGUIR_EDITANDO, exact: true }).click();
    await expect(page.getByLabel("Nombre de la rutina", { exact: true })).toHaveValue(
      "NAV RU03 sin guardar"
    );

    await page.getByRole("button", { name: BTN_DESCARTAR_CAMBIOS, exact: true }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: BTN_SI_DESCARTAR, exact: true })
      .click();
    await expect(page).toHaveURL(/\/rutinas$/);

    // Nada se persistió.
    await expect(regionRutinas(page)).toHaveCount(1);
    await expect(
      regionRutinas(page).getByRole("link", { name: "NAV RU03 sin guardar", exact: true })
    ).toHaveCount(0);
  });
});

test.describe("NAV-RU-04 recarga / URL directa / atrás", () => {
  test("URL directa y recarga del editor mantienen la vista coherente, sin bucles", async ({
    page,
  }) => {
    await loginComoDueno(page);
    await abrirEditorBase(page);
    await page.getByLabel("Nombre de la rutina", { exact: true }).fill("NAV RU04 con datos");

    await page.reload();
    await expect(page).toHaveURL(/\/rutinas\/nueva/);
    await expect(page.getByLabel("Nombre de la rutina", { exact: true })).toHaveCount(1);

    // Atrás: vuelve al listado sin bucles de redirect.
    await page.goBack();
    await expect(page).toHaveURL(/\/rutinas$/);
    await expect(regionRutinas(page)).toHaveCount(1);
    await page.goForward();
    await expect(page).toHaveURL(/\/rutinas\/nueva/);
  });
});

test.describe("NAV-RU-05 permisos por rol", () => {
  test("RECEPCIONISTA con URL directa de edición redirige al detalle (solo lectura)", async ({
    page,
  }) => {
    await loginComoRecepcionista(page);
    await page.goto("/rutinas/id-inexistente-inc10/editar");
    // Redirect a la vista de lectura (detalle), nunca el editor.
    await expect(page).toHaveURL(/\/rutinas\/[^/]+$/);
    await expect(page).not.toHaveURL(/\/editar$/);
  });

  test("CLIENTE en /rutinas es derivado a /portal (middleware C1)", async ({ page, request }) => {
    const { crearClientePortalApi, loginComoClienteCon, cambiarEstadoCliente } = await import(
      "./e2e-helpers"
    );
    const cliente = await crearClientePortalApi(request, { sedeId: "sede-1" });
    await cambiarEstadoCliente(request, cliente.id, "ACTIVO");

    await loginComoClienteCon(page, cliente.cedula, "1234");
    await page.goto("/rutinas");
    await expect(page).toHaveURL(/\/portal/);
    await expect(regionRutinas(page)).toHaveCount(0);
  });
});
