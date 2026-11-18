/**
 * INC-10 (RED) — Creación de rutina personalizada (NAV-RU-06..NAV-RU-10).
 * Matriz NAV-RU re-escopada C2/C7 del spec de INC-10-rutinas:
 *   NAV-RU-06  Detalle de personalizada: "Modificar rutina" -> editor;
 *              "Volver al listado" -> listado.
 *   NAV-RU-07  Formulario personalizada (macro-meso-micro): acordeones con
 *              `aria-expanded`, agregar por nivel, guardado -> detalle;
 *              descartar -> detalle sin guardar.
 *   NAV-RU-08  Con datos sin guardar: confirmación C5 al salir.
 *   NAV-RU-09  Recarga / URL directa / atrás: estado coherente, sin bucles.
 *   NAV-RU-10  Teclado / móvil: controles alcanzables con foco visible en el
 *              árbol de ciclos; responsive.
 *
 * Contrato de UI fijado por este RED (C1/C3/C4/C7, para el GREEN T8):
 *  - `/rutinas/nueva` con "Rutina personalizada" revela el editor P1..P5:
 *    botones "Agregar macrociclo", "Agregar mesociclo", "Agregar microciclo",
 *    "Agregar sesión", "Agregar ejercicio", "Agregar serie", "Quitar serie",
 *    "Agregar test", "Agregar medida", "Agregar hallazgo".
 *  - Cada ciclo es un acordeón: botón de encabezado con `aria-expanded` y el
 *    panel solo se renderiza expandido (C4).
 *  - Límites C4: al máximo, el botón "Agregar X" queda disabled.
 *  - `/rutinas/:id/editar` con el árbol existente: "Aplicar cambios" ->
 *    detalle; "Descartar cambios" -> detalle (confirmación si está sucio).
 *
 * FASE RED (2026-11-05): pantallas y endpoints NO existen (GREEN T7/T8).
 *
 * Restricciones INC00-QA-01/02: sin `isVisible()` condicional, `waitForTimeout`,
 * skips ni `only`; localizadores `exact: true` + `toHaveCount(1|0)` (C7).
 *
 * FIX INC10-FIX-03c (2026-11-15): se AÑADE el viaje AUD-09 (Tab real por
 * niveles + aserción `:focus-visible` + Enter, reemplazando/augmentando el
 * `focus()` programático) al bloque NAV-RU-10. El test con `focus()` se
 * conserva sin cambios de expectativa → sin enmienda C4.
 */
import { test, expect, type Locator, type Page } from "@playwright/test";
import { loginComoDueno } from "./e2e-helpers";
import {
  BANNER_CAMBIOS_SIN_GUARDAR,
  BTN_APLICAR_CAMBIOS,
  BTN_DESCARTAR_CAMBIOS,
  BTN_MODIFICAR_RUTINA,
  BTN_SI_DESCARTAR,
  BTN_VOLVER_LISTADO,
  crearRutinaPersonalizadaApi,
  payloadRutinaPersonalizada,
  regionRutinas,
  verificarSinProhibidos,
} from "./inc10-rutinas-e2e-helpers";

/**
 * FIX INC10-FIX-03c (2026-11-15) — recorrido de teclado REAL (patrón
 * aceptado INC-08/INC-09): Tab sucesivos hasta que el control queda enfocado;
 * exige `toBeFocused` + `:focus-visible` y falla si no se alcanza (sin foco
 * trampa). Sin `waitForTimeout` ni condicionales.
 */
async function tabHasta(page: Page, control: Locator, maxTabs = 120): Promise<void> {
  for (let i = 0; i < maxTabs; i++) {
    await page.keyboard.press("Tab");
    const enfocado = await control
      .evaluate((el) => el === document.activeElement)
      .catch(() => false);
    if (enfocado) break;
  }
  await expect(control, "Tab debe alcanzar el control sin foco trampa").toBeFocused();
  expect(
    await control.evaluate((el) => el.matches(":focus-visible")),
    "el foco del teclado debe ser visible (:focus-visible)"
  ).toBe(true);
}

/** Llega al editor de personalizada desde /rutinas/nueva (selector de tipo). */
async function abrirEditorPersonalizada(page: import("@playwright/test").Page) {
  await page.goto("/rutinas/nueva");
  await page
    .getByRole("button", { name: "Rutina personalizada", exact: true })
    .click();
  await expect(page.getByLabel("Objetivo general", { exact: true })).toHaveCount(1);
}

test.describe("NAV-RU-06 detalle de la personalizada", () => {
  test("el detalle muestra el árbol y 'Modificar rutina' abre el editor", async ({
    page,
    request,
  }) => {
    const rutina = await crearRutinaPersonalizadaApi(
      request,
      payloadRutinaPersonalizada({ nombre: "NAV RU06 personalizada" })
    );
    await loginComoDueno(page);
    await page.goto(`/rutinas/${rutina.id}`);

    await expect(
      page.getByRole("heading", { name: "NAV RU06 personalizada", exact: true })
    ).toHaveCount(1);

    await page.getByRole("button", { name: BTN_MODIFICAR_RUTINA, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/rutinas/${rutina.id}/editar`));
    await expect(page.getByLabel("Objetivo general", { exact: true })).toHaveCount(1);

    await page.getByRole("button", { name: BTN_VOLVER_LISTADO, exact: true }).click();
    await expect(page).toHaveURL(/\/rutinas$/);
    await expect(regionRutinas(page)).toHaveCount(1);
  });
});

test.describe("NAV-RU-07 formulario personalizada (macro-meso-micro)", () => {
  test("los acordeones por ciclo tienen aria-expanded y los controles por nivel", async ({
    page,
  }) => {
    await loginComoDueno(page);
    await abrirEditorPersonalizada(page);

    // C4: un acordeón por ciclo con aria-expanded; el panel vive solo expandido.
    const acordeones = page.locator('[aria-expanded]');
    expect(await acordeones.count()).toBeGreaterThan(0);

    for (const boton of [
      "Agregar macrociclo",
      "Agregar mesociclo",
      "Agregar microciclo",
      "Agregar sesión",
      "Agregar ejercicio",
      "Agregar serie",
      "Agregar test",
      "Agregar medida",
      "Agregar hallazgo",
    ]) {
      await expect(page.getByRole("button", { name: boton, exact: true }).first()).toHaveCount(1);
    }
    await verificarSinProhibidos(page.locator("main"), "NAV-RU-07 editor personalizada");
  });

  test("'Agregar macrociclo' construye una cadena válida por índice (sin tocar la existente)", async ({
    page,
  }) => {
    await loginComoDueno(page);
    await abrirEditorPersonalizada(page);

    // Scaffold inicial: 1 cadena (1 serie). Cada "Agregar X" inserta X con su
    // subárbol mínimo válido (fechas contenidas por defecto, C4).
    const quitarSerie = page.getByRole("button", { name: "Quitar serie", exact: true });
    const antes = await quitarSerie.count();
    expect(antes, "scaffold inicial").toBeGreaterThan(0);

    await page.getByRole("button", { name: "Agregar macrociclo", exact: true }).click();
    await expect
      .poll(async () => quitarSerie.count(), {
        message: "el macrociclo nuevo trae su cadena mínima",
      })
      .toBe(antes + 1);

    await page.getByRole("button", { name: "Agregar serie", exact: true }).first().click();
    await expect
      .poll(async () => quitarSerie.count(), {
        message: "'Agregar serie' agrega por ruta de índice",
      })
      .toBe(antes + 2);
  });

  test("guardar una personalizada válida aterriza en su detalle", async ({ page }) => {
    await loginComoDueno(page);
    await page.goto("/rutinas/nueva");
    await page
      .getByRole("button", { name: "Rutina personalizada", exact: true })
      .click();

    // Scaffold mínimo válido (ciclos con fechas contenidas + cadena de sesión).
    await page.getByLabel("Nombre de la rutina", { exact: true }).fill("NAV RU07 creada flujo");
    await page.getByLabel("Objetivo general", { exact: true }).fill("Ganar masa muscular");
    await page.getByLabel("Fecha de evaluación", { exact: true }).fill("2026-01-01");
    await page.getByLabel("Diagnostico", { exact: true }).fill("Buena postura general");
    await page
      .getByLabel("Nivel de experiencia", { exact: true })
      .selectOption("INTERMEDIO");

    await page.getByRole("button", { name: BTN_APLICAR_CAMBIOS, exact: true }).click();

    await expect(page).toHaveURL(/\/rutinas\/[^/]+$/);
    await expect(
      page.getByRole("heading", { name: "NAV RU07 creada flujo", exact: true })
    ).toHaveCount(1);
  });

  test("'Descartar cambios' desde el editor con árbol parcial vuelve sin guardar", async ({
    page,
  }) => {
    await loginComoDueno(page);
    await abrirEditorPersonalizada(page);
    await page.getByRole("button", { name: "Agregar macrociclo", exact: true }).click();

    await page.getByRole("button", { name: BTN_DESCARTAR_CAMBIOS, exact: true }).click();
    // Sucio -> confirmación C5; confirmar sale sin persistir.
    const alerta = page.getByRole("alertdialog");
    await expect(alerta).toHaveCount(1);
    await expect(alerta.getByText(BANNER_CAMBIOS_SIN_GUARDAR, { exact: true })).toHaveCount(1);
    await alerta.getByRole("button", { name: BTN_SI_DESCARTAR, exact: true }).click();
    await expect(page).toHaveURL(/\/rutinas$/);
  });
});

test.describe("NAV-RU-08 datos sin guardar (patrón C5)", () => {
  test("la salida con datos sin guardar exige confirmación", async ({ page }) => {
    await loginComoDueno(page);
    await abrirEditorPersonalizada(page);
    await page.getByLabel("Nombre de la rutina", { exact: true }).fill("NAV RU08 sin guardar");

    await page.getByRole("button", { name: BTN_DESCARTAR_CAMBIOS, exact: true }).click();
    await expect(page.getByRole("alertdialog")).toHaveCount(1);
  });
});

test.describe("NAV-RU-09 recarga / URL directa / atrás", () => {
  test("recarga y atrás sobre el editor dejan la vista coherente, sin bucles", async ({
    page,
  }) => {
    await loginComoDueno(page);
    await abrirEditorPersonalizada(page);
    await page.getByLabel("Nombre de la rutina", { exact: true }).fill("NAV RU09 con datos");

    await page.reload();
    await expect(page).toHaveURL(/\/rutinas\/nueva/);
    await expect(page.getByLabel("Nombre de la rutina", { exact: true })).toHaveCount(1);

    await page.goBack();
    await expect(page).toHaveURL(/\/rutinas$/);
  });
});

test.describe("NAV-RU-10 teclado / móvil", () => {
  test("los controles del árbol son alcanzables por teclado con foco visible", async ({ page }) => {
    await loginComoDueno(page);
    await abrirEditorPersonalizada(page);

    // Tab hasta "Agregar macrociclo" y activación con Enter (foco visible).
    const objetivo = page.getByRole("button", { name: "Agregar macrociclo", exact: true });
    const quitarSerie = page.getByRole("button", { name: "Quitar serie", exact: true });
    const antes = await quitarSerie.count();

    await objetivo.focus();
    await expect(objetivo).toBeFocused();
    await page.keyboard.press("Enter");
    await expect
      .poll(async () => quitarSerie.count(), {
        message: "Enter sobre el botón agrega el macrociclo",
      })
      .toBe(antes + 1);
  });

  // FIX INC10-FIX-03c (2026-11-15) — viaje NUEVO (cobertura sobre producto ya
  // implementado): cierra INC10-NAV-AUD-10 de la re-auditoría ("NAV-RU-10 usa
  // focus() programático; sin Tab real por niveles ni aserción :focus-visible").
  // El test anterior con `focus()` se PRESERVA sin cambios (augment, 0 cambios
  // de expectativa; sin enmienda C4 porque no se edita ninguna).
  test("AUD-09 (NAV-RU-10) Tab real por niveles hasta 'Agregar macrociclo' y anidamiento con :focus-visible + Enter", async ({
    page,
  }) => {
    await loginComoDueno(page);
    await abrirEditorPersonalizada(page);

    const agregarMacro = page.getByRole("button", {
      name: "Agregar macrociclo",
      exact: true,
    });
    await expect(agregarMacro).toHaveCount(1);
    const quitarSerie = page.getByRole("button", { name: "Quitar serie", exact: true });
    const antes = await quitarSerie.count();

    // Nivel 1: teclado real desde el cuerpo del documento (sin focus()).
    await tabHasta(page, agregarMacro);
    await page.keyboard.press("Enter");
    await expect
      .poll(async () => quitarSerie.count(), {
        message: "Enter sobre 'Agregar macrociclo' añade su cadena mínima",
      })
      .toBe(antes + 1);
    await expect(
      page.getByRole("status").filter({ hasText: BANNER_CAMBIOS_SIN_GUARDAR })
    ).toHaveCount(1);

    // Nivel 2 (anidamiento): Tab real hasta "Agregar mesociclo" del macro raíz.
    const agregarMeso = page
      .getByRole("button", { name: "Agregar mesociclo", exact: true })
      .first();
    const microAntes = await page
      .getByRole("button", { name: "Agregar microciclo", exact: true })
      .count();
    await tabHasta(page, agregarMeso);
    await page.keyboard.press("Enter");
    await expect
      .poll(
        async () =>
          page.getByRole("button", { name: "Agregar microciclo", exact: true }).count(),
        {
          message:
            "Enter sobre 'Agregar mesociclo' anida un mesociclo con su 'Agregar microciclo'",
        }
      )
      .toBe(microAntes + 1);
  });

  test("la vista del editor es usable en viewport móvil (responsive)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginComoDueno(page);
    await abrirEditorPersonalizada(page);

    await expect(page.getByLabel("Nombre de la rutina", { exact: true })).toHaveCount(1);
    await expect(
      page.getByRole("button", { name: BTN_APLICAR_CAMBIOS, exact: true })
    ).toHaveCount(1);
  });
});
