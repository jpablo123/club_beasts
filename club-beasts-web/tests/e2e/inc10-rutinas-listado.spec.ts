/**
 * INC-10 (RED) — Listado de rutinas (NAV-RU-01, NAV-RU-23, NAV-RU-24).
 * Matriz NAV-RU re-escopada C2/C7 del spec de INC-10-rutinas:
 *   NAV-RU-01  Listado normal: menú staff / URL directa con sesión -> "Crear
 *              rutina" abre el formulario; el detalle abre la vista.
 *   NAV-RU-23  Listado vacío y filtros (tipo= y nombre=): mensaje de vacío y
 *              resultados filtrados; sin coincidencias -> vacío.
 *   NAV-RU-24  URL directa a rutina inexistente -> 404 "Rutina no encontrada"
 *              con "Volver al listado".
 *
 * Contrato de UI fijado por este RED (C1/C3/C7, para el GREEN T8):
 *  - `/rutinas` renderiza `<section role="region" aria-label="Rutinas">` con
 *    el botón "Crear rutina" y una fila por rutina (nombre = link al detalle).
 *  - Filtros: select "Tipo de rutina" (GENERICA|INDUCCION|PERSONALIZADA) e
 *    input "Nombre" (subcadena). Listado vacío -> "Aun no hay rutinas
 *    registradas".
 *  - `/rutinas/nueva` = selector de tipo (botones "Rutina generica",
 *    "Rutina de induccion", "Rutina personalizada").
 *  - `/rutinas/:id` inexistente -> texto "Rutina no encontrada" + botón
 *    "Volver al listado" -> /rutinas.
 *  - Sin substrings prohibidos C7 dentro de la región.
 *
 * FASE RED (2026-11-05): pantallas y endpoints NO existen (GREEN T7/T8).
 *
 * ENMIENDA C4 documentada — `FIX INC10-FIX-03b` (2026-11-08): bloque NUEVO al
 * final del archivo con los viajes dedicados **INC10-NAV-AUD-01** (entrada al
 * listado por el navLink "Rutinas" de las 4 pantallas staff y por la card del
 * dashboard, que FIX-03a habilitó en producto). Append puro: **0 cambios de
 * expectativa** en los tests existentes de este archivo.
 *
 * Restricciones INC00-QA-01/02: sin `isVisible()` condicional, `waitForTimeout`,
 * skips ni `only`; localizadores `exact: true` + `toHaveCount(1|0)` (C7).
 */
import { test, expect, type APIRequestContext } from "@playwright/test";
import { loginComoDueno } from "./e2e-helpers";
import {
  BTN_CREAR_RUTINA,
  BTN_VOLVER_LISTADO,
  LISTADO_VACIO_MENSAJE,
  REGION_RUTINAS,
  RUTINA_NO_ENCONTRADA_MENSAJE,
  abrirListadoRutinas,
  crearRutinaBaseApi,
  crearRutinaPersonalizadaApi,
  loginComoRecepcionista,
  payloadRutinaBase,
  payloadRutinaPersonalizada,
  regionRutinas,
  verificarSinProhibidos,
} from "./inc10-rutinas-e2e-helpers";

test.describe("NAV-RU-01 listado de rutinas (normal)", () => {
  test("URL directa con sesión DUENO muestra la región 'Rutinas' y 'Crear rutina' abre el formulario", async ({
    page,
    request,
  }) => {
    await crearRutinaBaseApi(request, payloadRutinaBase({ nombre: "NAV RU01 generica" }));
    await loginComoDueno(page);
    await abrirListadoRutinas(page);

    const region = regionRutinas(page);
    await expect(region).toHaveCount(1);
    await expect(page.getByRole("button", { name: BTN_CREAR_RUTINA, exact: true })).toHaveCount(1);

    // Guarda positiva + C7: la región existe y no hay substrings prohibidos.
    await verificarSinProhibidos(region, "NAV-RU-01 listado");

    await page.getByRole("button", { name: BTN_CREAR_RUTINA, exact: true }).click();
    await expect(page).toHaveURL(/\/rutinas\/nueva/);
  });

  test("una fila del listado abre el detalle de la rutina", async ({ page, request }) => {
    const rutina = await crearRutinaBaseApi(
      request,
      payloadRutinaBase({ nombre: "NAV RU01 detalle" })
    );
    await loginComoDueno(page);
    await abrirListadoRutinas(page);

    await expect(regionRutinas(page)).toHaveCount(1);
    await page.getByRole("link", { name: "NAV RU01 detalle", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/rutinas/${rutina.id}`));
  });
});

test.describe("NAV-RU-23 listado vacío y filtros", () => {
  test("sin rutinas coincide el mensaje de vacío y los filtros no rompen la vista", async ({
    page,
    request,
  }) => {
    await crearRutinaBaseApi(
      request,
      payloadRutinaBase({ nombre: "NAV RU23 existente unica" })
    );
    await loginComoDueno(page);
    await abrirListadoRutinas(page);

    const region = regionRutinas(page);
    await expect(region).toHaveCount(1);

    // Filtro por nombre sin coincidencias -> vacío con mensaje claro.
    await page.getByLabel("Nombre", { exact: true }).fill("zzz-sin-coincidencias");
    await expect(region.getByText(LISTADO_VACIO_MENSAJE, { exact: true })).toHaveCount(1);

    // Filtro por nombre con coincidencia -> solo esa rutina.
    await page.getByLabel("Nombre", { exact: true }).fill("NAV RU23 existente");
    await expect(
      region.getByRole("link", { name: "NAV RU23 existente unica", exact: true })
    ).toHaveCount(1);
  });

  test("el filtro por tipo muestra solo el tipo seleccionado", async ({ page, request }) => {
    await crearRutinaBaseApi(request, payloadRutinaBase({ nombre: "NAV RU23 generica" }));
    await crearRutinaPersonalizadaApi(
      request,
      payloadRutinaPersonalizada({ nombre: "NAV RU23 personalizada" })
    );
    await loginComoDueno(page);
    await abrirListadoRutinas(page);

    const region = regionRutinas(page);
    await expect(region).toHaveCount(1);

    await page.getByLabel("Tipo de rutina", { exact: true }).selectOption("PERSONALIZADA");
    await expect(
      region.getByRole("link", { name: "NAV RU23 personalizada", exact: true })
    ).toHaveCount(1);
    await expect(region.getByRole("link", { name: "NAV RU23 generica", exact: true })).toHaveCount(0);

    await page.getByLabel("Tipo de rutina", { exact: true }).selectOption("GENERICA");
    await expect(
      region.getByRole("link", { name: "NAV RU23 generica", exact: true })
    ).toHaveCount(1);
    await expect(
      region.getByRole("link", { name: "NAV RU23 personalizada", exact: true })
    ).toHaveCount(0);
  });
});

test.describe("NAV-RU-24 rutina inexistente (404)", () => {
  test("URL directa a /rutinas/id-inexistente muestra 'Rutina no encontrada' y 'Volver al listado'", async ({
    page,
  }) => {
    await loginComoDueno(page);
    await page.goto("/rutinas/id-inexistente-inc10-e2e");

    await expect(
      page.getByText(RUTINA_NO_ENCONTRADA_MENSAJE, { exact: true })
    ).toHaveCount(1);
    const volver = page.getByRole("button", { name: BTN_VOLVER_LISTADO, exact: true });
    await expect(volver).toHaveCount(1);

    await volver.click();
    await expect(page).toHaveURL(/\/rutinas$/);
    await expect(regionRutinas(page)).toHaveCount(1);
  });
});

// ─── FIX INC10-FIX-03b — NAV-RU-01 / INC10-NAV-AUD-01: entradas al listado ────
//
// Viaje dedicado del hallazgo INC10-NAV-AUD-01 (entrada "Menu staff" de
// NAV-RU-01): navLink "Rutinas" en las 4 pantallas staff (dashboard, clientes,
// clientes-nuevo, recepcion) y card "Rutinas" del dashboard -> llegada a
// `/rutinas` con la región "Rutinas". FIX-03a habilitó `navLinks` y la card en
// producto: estos viajes son **cobertura nueva sobre código existente** (RED no
// aplicable — se declara explícitamente); se ejercen con aserciones de
// pantalla de origen, destino URL, estado del listado y guarda por rol
// (DEC-065: DUENO ve "Crear rutina", RECEP no).

test.describe("NAV-RU-01 entradas al listado por menú staff y card (AUD-01)", () => {
  test("AUD-01-1 navLink 'Rutinas' del dashboard abre /rutinas con la región 'Rutinas'", async ({
    page,
  }) => {
    await loginComoDueno(page);
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toHaveCount(
      1
    );

    const navlink = page.getByRole("link", { name: "Rutinas", exact: true });
    await expect(navlink).toHaveCount(1);
    await navlink.click();

    await expect(page).toHaveURL(/\/rutinas$/);
    await expect(regionRutinas(page)).toHaveCount(1);
    await expect(
      page.getByRole("button", { name: BTN_CREAR_RUTINA, exact: true })
    ).toHaveCount(1);
  });

  test("AUD-01-2 navLink 'Rutinas' de /clientes abre /rutinas con la región 'Rutinas'", async ({
    page,
  }) => {
    await loginComoDueno(page);
    await page.goto("/clientes");
    await expect(page.getByRole("heading", { name: "Clientes", exact: true })).toHaveCount(
      1
    );

    const navlink = page.getByRole("link", { name: "Rutinas", exact: true });
    await expect(navlink).toHaveCount(1);
    await navlink.click();

    await expect(page).toHaveURL(/\/rutinas$/);
    await expect(regionRutinas(page)).toHaveCount(1);
    await expect(
      page.getByRole("button", { name: BTN_CREAR_RUTINA, exact: true })
    ).toHaveCount(1);
  });

  test("AUD-01-3 navLink 'Rutinas' de /clientes/nuevo abre /rutinas con la región 'Rutinas'", async ({
    page,
  }) => {
    await loginComoDueno(page);
    await page.goto("/clientes/nuevo");
    await expect(
      page.getByRole("heading", { name: "Nuevo Cliente", exact: true })
    ).toHaveCount(1);

    const navlink = page.getByRole("link", { name: "Rutinas", exact: true });
    await expect(navlink).toHaveCount(1);
    await navlink.click();

    await expect(page).toHaveURL(/\/rutinas$/);
    await expect(regionRutinas(page)).toHaveCount(1);
    await expect(
      page.getByRole("button", { name: BTN_CREAR_RUTINA, exact: true })
    ).toHaveCount(1);
  });

  test("AUD-01-4 navLink 'Rutinas' de /recepcion (RECEPCIONISTA) abre /rutinas en modo lectura", async ({
    page,
  }) => {
    await loginComoRecepcionista(page);
    await page.goto("/recepcion");
    await expect(page.getByRole("heading", { name: "Recepcion", exact: true })).toHaveCount(
      1
    );

    const navlink = page.getByRole("link", { name: "Rutinas", exact: true });
    await expect(navlink).toHaveCount(1);
    await navlink.click();

    // Destino coherente con el rol (DEC-065: RECEP solo lectura).
    await expect(page).toHaveURL(/\/rutinas$/);
    await expect(regionRutinas(page)).toHaveCount(1);
    await expect(
      page.getByRole("button", { name: BTN_CREAR_RUTINA, exact: true })
    ).toHaveCount(0);
  });

  test("AUD-01-5 card 'Rutinas' del dashboard abre /rutinas con la región 'Rutinas'", async ({
    page,
  }) => {
    await loginComoDueno(page);
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toHaveCount(
      1
    );

    // Card del dashboard: link cuyo nombre accesible incluye la descripción
    // (colisiona con el navLink "Rutinas" si se usa nombre exacto).
    const card = page.getByRole("link", { name: /Gestionar rutinas del gimnasio/ });
    await expect(card).toHaveCount(1);
    await card.click();

    await expect(page).toHaveURL(/\/rutinas$/);
    await expect(regionRutinas(page)).toHaveCount(1);
    await expect(
      page.getByRole("button", { name: BTN_CREAR_RUTINA, exact: true })
    ).toHaveCount(1);
  });
});
