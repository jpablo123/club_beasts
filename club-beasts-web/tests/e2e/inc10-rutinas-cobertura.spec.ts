/**
 * FIX INC10-FIX-03b (2026-11-08) — Viajes de cobertura de la auditoría de
 * navegación de INC-10 (SOLO tests; sin cambios de producto).
 *
 * Enmienda documentada `FIX INC10-FIX-03b`: archivo NUEVO (append puro) que
 * cierra los hallazgos de cobertura AUD-02/02b/03/04 de la auditoría. Los 39
 * viajes existentes NO se tocan. EXCLUYE AUD-01 (navLink "Rutinas") y AUD-06
 * ("Salir" en /rutinas*): **ENMIENDA C4 `FIX INC10-FIX-03b` (2ª parte)** — esos
 * dos hallazgos se cierran en `inc10-rutinas-listado.spec.ts` (AUD-01) y en el
 * spec nuevo `inc10-rutinas-edicion.spec.ts` (AUD-06); ningún viaje de este
 * archivo depende de ellos.
 *
 * **ENMIENDA C4 `FIX INC10-FIX-03b` (2ª parte) — etiquetas de fila**: 7 títulos
 * de este archivo añaden la fila NAV-RU que ya ejercían (AUD-02 -> NAV-RU-02;
 * AUD-03-5 y AUD-04-4 -> NAV-RU-11; AUD-04-2/04-3 -> NAV-RU-01) para que la
 * base `--grep-invert NAV-RU` siga midiendo exactamente 143/143. **0 cambios de
 * expectativa**: solo texto de título/descripción.
 *
 * Hallazgo -> viaje (todos verdes contra el producto actual):
 *  - INC10-NAV-AUD-02  "Aplicar cambios" (PATCH) -> detalle (datos actualizados)
 *                      y "Descartar cambios"/"Volver al listado" SUCIOS ->
 *                      detalle/listado con confirmación C5
 *                      (`editar/page.tsx:106,146`, `RutinaEditor.tsx:662-682`):
 *      AUD-02-1  aplicar -> detalle actualizado (persistencia tras recarga)
 *      AUD-02-2  descartar sucio -> C5 ("Seguir editando" conserva) ->
 *                "Si, descartar" -> DETALLE sin persistir
 *      AUD-02-3  "Volver al listado" sucio -> C5 -> "Si, descartar" ->
 *                LISTADO sin persistir
 *  - INC10-NAV-AUD-02b variantes "Volver al listado" sucio en creación
 *                      (NAV-RU-03/08) sin recorrido:
 *      AUD-02b-1 creación base -> C5 -> /rutinas sin persistir
 *      AUD-02b-2 creación personalizada -> C5 -> /rutinas sin persistir
 *  - INC10-NAV-AUD-03  variante RECEPCIONISTA de lectura (DEC-065):
 *      AUD-03-1  (NAV-RU-05) listado y detalle legibles; sin "Crear rutina"
 *                ni "Modificar rutina"
 *      AUD-03-2  (NAV-RU-11/15) "Rutina activa" + "Historial de rutinas"
 *                legibles, snapshot expandible, SIN controles de asignación
 *      AUD-03-3  (NAV-RU-16) historial vacío legible
 *      AUD-03-4  (NAV-RU-14/17) URL directa + recarga conservan lectura y
 *                orden del historial (fechaInicio DESC)
 *      AUD-03-5  ficha -> "Volver" al listado de clientes (navlink
 *                "Clientes" pre-existente del Navbar de la ficha)
 *  - INC10-NAV-AUD-04  teclado/foco explícito (Tab + foco visible):
 *      AUD-04-1  /portal/rutina (NAV-RU-21 declara "foco visible")
 *      AUD-04-2  listado: "Crear rutina"
 *      AUD-04-3  listado: link de la fila
 *      AUD-04-4  ficha-asignación: "Asignar rutina" y "Volver a la ficha"
 *                (el editor ya está cubierto por NAV-RU-10)
 *
 * Localizadores C3/C7: regiones exactas ("Rutinas", "Rutina activa",
 * "Historial de rutinas", "Mi rutina"), `exact: true` + `toHaveCount(1|0)`,
 * `verificarSinProhibidos` dentro de las regiones. Los sweeps C7 sobre las
 * pantallas de editor/detalle se acotan a `main div.max-w-3xl` (contenido de
 * pantalla nueva) para excluir la UI pre-existente del Navbar (fuera del
 * alcance C7 según el header de `inc10-rutinas-e2e-helpers.ts`) y quedar
 * independientes de AUD-06 en paralelo.
 *
 * Restricciones INC00-QA-01/02: sin `isVisible()` condicional,
 * `waitForTimeout`, skips ni `only`; fixtures deterministas con los helpers
 * existentes (nombres únicos por viaje).
 */
import {
  test,
  expect,
  type APIRequestContext,
  type Locator,
  type Page,
} from "@playwright/test";
import {
  cambiarEstadoCliente,
  crearClienteApi,
  crearClientePortalApi,
  crearVigenciaApi,
  hoyBogota,
  loginComoClienteCon,
  loginComoDueno,
  sumarDias,
  type ClienteFixture,
} from "./e2e-helpers";
import {
  BANNER_CAMBIOS_SIN_GUARDAR,
  BTN_APLICAR_CAMBIOS,
  BTN_ASIGNAR_RUTINA,
  BTN_CONFIRMAR_ASIGNACION,
  BTN_CREAR_RUTINA,
  BTN_DESCARTAR_CAMBIOS,
  BTN_MODIFICAR_RUTINA,
  BTN_SEGUIR_EDITANDO,
  BTN_SI_DESCARTAR,
  BTN_VER_VERSION,
  BTN_VOLVER_FICHA,
  BTN_VOLVER_LISTADO,
  BTN_VOLVER_PORTAL,
  HISTORIAL_VACIO_MENSAJE,
  asignarRutinaApi,
  crearRutinaBaseApi,
  crearRutinaPersonalizadaApi,
  loginComoRecepcionista,
  payloadRutinaBase,
  payloadRutinaPersonalizada,
  regionHistorial,
  regionMiRutina,
  regionRutinaActiva,
  regionRutinas,
  verificarSinProhibidos,
} from "./inc10-rutinas-e2e-helpers";

// ─── Helpers locales (sin tocar los helpers compartidos) ─────────────────────

/** Cliente ACTIVO con datos propios del viaje (fixture determinista). */
async function clienteActivo(
  request: APIRequestContext,
  nombres: string
): Promise<ClienteFixture> {
  const cliente = await crearClienteApi(request, {
    sedeId: "sede-1",
    nombres,
    apellidos: "Cobertura",
  });
  await cambiarEstadoCliente(request, cliente.id, "ACTIVO");
  return cliente;
}

/**
 * Recorrido de teclado real (patrón aceptado INC-08/INC-09): Tab sucesivos
 * hasta que el control queda enfocado; exige `toBeFocused` + `:focus-visible`
 * (foco visible para teclado/lectores). Falla si no se alcanza (sin foco
 * trampa) — sin `waitForTimeout` ni condicionales.
 */
async function tabHasta(page: Page, control: Locator, maxTabs = 80): Promise<void> {
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

/** Banner C5 "Cambios sin guardar" (role=status) del editor, sin colisionar
 *  con el texto homónimo del alertdialog. */
function bannerCambiosSinGuardar(page: Page) {
  return page.getByRole("status").filter({ hasText: BANNER_CAMBIOS_SIN_GUARDAR });
}

// ─── INC10-NAV-AUD-02 — flujo de edición /rutinas/[id]/editar ────────────────

// ENMIENDA C4 `FIX INC10-FIX-03b`: título del describe + etiqueta NAV-RU-02
// (la fila que ya ejercían estos 3 viajes); 0 cambios de expectativa.
test.describe("INC10-NAV-AUD-02 flujo de edición (NAV-RU-02) Aplicar/Descartar/Volver sucio", () => {
  test("AUD-02-1 'Aplicar cambios' aplica el PATCH y deja el detalle con los datos actualizados", async ({
    page,
    request,
  }) => {
    const rutina = await crearRutinaBaseApi(
      request,
      payloadRutinaBase({
        nombre: "Cobertura AUD02 original",
        descripcion: "Descripcion original AUD02",
      })
    );
    await loginComoDueno(page);
    await page.goto(`/rutinas/${rutina.id}`);
    await expect(
      page.getByRole("heading", { name: "Cobertura AUD02 original", exact: true })
    ).toHaveCount(1);

    // Entrada al editor por el detalle.
    await page.getByRole("button", { name: BTN_MODIFICAR_RUTINA, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/rutinas/${rutina.id}/editar`));
    await expect(page.getByLabel("Nombre de la rutina", { exact: true })).toHaveValue(
      "Cobertura AUD02 original"
    );
    await verificarSinProhibidos(
      page.locator("main div.max-w-3xl"),
      "AUD-02-1 editor de edición"
    );

    await page
      .getByLabel("Nombre de la rutina", { exact: true })
      .fill("Cobertura AUD02 editada");
    await page
      .getByLabel("Descripción", { exact: true })
      .fill("Descripcion editada AUD02");
    await page.getByRole("button", { name: BTN_APLICAR_CAMBIOS, exact: true }).click();

    // PATCH -> detalle con datos actualizados (nunca /editar).
    await expect(page).toHaveURL(new RegExp(`/rutinas/${rutina.id}$`));
    await expect(page).not.toHaveURL(/\/editar$/);
    await expect(
      page.getByRole("heading", { name: "Cobertura AUD02 editada", exact: true })
    ).toHaveCount(1);
    await expect(
      page.getByRole("heading", { name: "Cobertura AUD02 original", exact: true })
    ).toHaveCount(0);
    await expect(page.getByText("Descripcion editada AUD02", { exact: true })).toHaveCount(
      1
    );

    // Persistencia real: la recarga del detalle conserva lo aplicado.
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Cobertura AUD02 editada", exact: true })
    ).toHaveCount(1);
    await expect(page.getByText("Descripcion editada AUD02", { exact: true })).toHaveCount(
      1
    );
  });

  test("AUD-02-2 'Descartar cambios' sucio exige C5 y 'Si, descartar' vuelve al DETALLE sin persistir", async ({
    page,
    request,
  }) => {
    const rutina = await crearRutinaBaseApi(
      request,
      payloadRutinaBase({ nombre: "Cobertura AUD02 descarte" })
    );
    await loginComoDueno(page);
    await page.goto(`/rutinas/${rutina.id}/editar`);
    await expect(page.getByLabel("Nombre de la rutina", { exact: true })).toHaveValue(
      "Cobertura AUD02 descarte"
    );

    await page
      .getByLabel("Nombre de la rutina", { exact: true })
      .fill("Cobertura AUD02 sucia descarte");
    await expect(bannerCambiosSinGuardar(page)).toHaveCount(1);

    await page.getByRole("button", { name: BTN_DESCARTAR_CAMBIOS, exact: true }).click();
    const alerta = page.getByRole("alertdialog");
    await expect(alerta).toHaveCount(1);
    await expect(
      alerta.getByText(BANNER_CAMBIOS_SIN_GUARDAR, { exact: true })
    ).toHaveCount(1);
    await expect(
      alerta.getByRole("button", { name: BTN_SI_DESCARTAR, exact: true })
    ).toHaveCount(1);
    await expect(
      alerta.getByRole("button", { name: BTN_SEGUIR_EDITANDO, exact: true })
    ).toHaveCount(1);

    // "Seguir editando" conserva lo escrito.
    await alerta.getByRole("button", { name: BTN_SEGUIR_EDITANDO, exact: true }).click();
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await expect(page.getByLabel("Nombre de la rutina", { exact: true })).toHaveValue(
      "Cobertura AUD02 sucia descarte"
    );

    // Confirmar el descarte -> DETALLE (onDescartar del editor de edición).
    await page.getByRole("button", { name: BTN_DESCARTAR_CAMBIOS, exact: true }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: BTN_SI_DESCARTAR, exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`/rutinas/${rutina.id}$`));
    await expect(
      page.getByRole("heading", { name: "Cobertura AUD02 descarte", exact: true })
    ).toHaveCount(1);
    await expect(
      page.getByRole("heading", { name: "Cobertura AUD02 sucia descarte", exact: true })
    ).toHaveCount(0);
  });

  test("AUD-02-3 'Volver al listado' sucio exige C5 y 'Si, descartar' sale al listado sin persistir", async ({
    page,
    request,
  }) => {
    const rutina = await crearRutinaBaseApi(
      request,
      payloadRutinaBase({ nombre: "Cobertura AUD02 volver" })
    );
    await loginComoDueno(page);
    await page.goto(`/rutinas/${rutina.id}/editar`);
    await expect(page.getByLabel("Nombre de la rutina", { exact: true })).toHaveValue(
      "Cobertura AUD02 volver"
    );

    await page
      .getByLabel("Nombre de la rutina", { exact: true })
      .fill("Cobertura AUD02 sucia volver");
    await expect(bannerCambiosSinGuardar(page)).toHaveCount(1);

    await page.getByRole("button", { name: BTN_VOLVER_LISTADO, exact: true }).click();
    const alerta = page.getByRole("alertdialog");
    await expect(alerta).toHaveCount(1);
    await expect(
      alerta.getByRole("button", { name: BTN_SI_DESCARTAR, exact: true })
    ).toHaveCount(1);
    await alerta.getByRole("button", { name: BTN_SI_DESCARTAR, exact: true }).click();

    await expect(page).toHaveURL(/\/rutinas$/);
    await expect(regionRutinas(page)).toHaveCount(1);
    await expect(
      regionRutinas(page).getByRole("link", { name: "Cobertura AUD02 volver", exact: true })
    ).toHaveCount(1);
    await expect(
      regionRutinas(page).getByRole("link", {
        name: "Cobertura AUD02 sucia volver",
        exact: true,
      })
    ).toHaveCount(0);
  });
});

// ─── INC10-NAV-AUD-02b — "Volver al listado" sucio en creación (NAV-RU-03/08) ─

test.describe("INC10-NAV-AUD-02b navegación sucia en creación (NAV-RU-03/08)", () => {
  test("AUD-02b-1 creación base: 'Volver al listado' sucio exige C5 y sale sin persistir", async ({
    page,
  }) => {
    await loginComoDueno(page);
    await page.goto("/rutinas/nueva");
    await page.getByRole("button", { name: "Rutina generica", exact: true }).click();
    await expect(page.getByLabel("Nombre de la rutina", { exact: true })).toHaveCount(1);

    await page
      .getByLabel("Nombre de la rutina", { exact: true })
      .fill("Cobertura AUD02b base sucia");
    await expect(bannerCambiosSinGuardar(page)).toHaveCount(1);

    await page.getByRole("button", { name: BTN_VOLVER_LISTADO, exact: true }).click();
    const alerta = page.getByRole("alertdialog");
    await expect(alerta).toHaveCount(1);
    await expect(
      alerta.getByText(BANNER_CAMBIOS_SIN_GUARDAR, { exact: true })
    ).toHaveCount(1);
    await expect(
      alerta.getByRole("button", { name: BTN_SI_DESCARTAR, exact: true })
    ).toHaveCount(1);
    await expect(
      alerta.getByRole("button", { name: BTN_SEGUIR_EDITANDO, exact: true })
    ).toHaveCount(1);

    // "Seguir editando" conserva lo escrito en la creación.
    await alerta.getByRole("button", { name: BTN_SEGUIR_EDITANDO, exact: true }).click();
    await expect(page.getByLabel("Nombre de la rutina", { exact: true })).toHaveValue(
      "Cobertura AUD02b base sucia"
    );

    await page.getByRole("button", { name: BTN_VOLVER_LISTADO, exact: true }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: BTN_SI_DESCARTAR, exact: true })
      .click();
    await expect(page).toHaveURL(/\/rutinas$/);
    await expect(
      regionRutinas(page).getByRole("link", {
        name: "Cobertura AUD02b base sucia",
        exact: true,
      })
    ).toHaveCount(0);
  });

  test("AUD-02b-2 creación personalizada: 'Volver al listado' sucio exige C5 y sale sin persistir", async ({
    page,
  }) => {
    await loginComoDueno(page);
    await page.goto("/rutinas/nueva");
    await page.getByRole("button", { name: "Rutina personalizada", exact: true }).click();
    await expect(page.getByLabel("Objetivo general", { exact: true })).toHaveCount(1);

    await page
      .getByLabel("Nombre de la rutina", { exact: true })
      .fill("Cobertura AUD02b pers sucia");
    await expect(bannerCambiosSinGuardar(page)).toHaveCount(1);

    await page.getByRole("button", { name: BTN_VOLVER_LISTADO, exact: true }).click();
    const alerta = page.getByRole("alertdialog");
    await expect(alerta).toHaveCount(1);
    await expect(
      alerta.getByRole("button", { name: BTN_SI_DESCARTAR, exact: true })
    ).toHaveCount(1);
    await alerta.getByRole("button", { name: BTN_SI_DESCARTAR, exact: true }).click();

    await expect(page).toHaveURL(/\/rutinas$/);
    await expect(
      regionRutinas(page).getByRole("link", {
        name: "Cobertura AUD02b pers sucia",
        exact: true,
      })
    ).toHaveCount(0);
  });
});

// ─── INC10-NAV-AUD-03 — variante RECEPCIONISTA de lectura (DEC-065) ──────────

test.describe("INC10-NAV-AUD-03 variante RECEPCIONISTA de lectura (DEC-065)", () => {
  test("AUD-03-1 (NAV-RU-05) RECEP lee el listado y el detalle; sin 'Crear rutina' ni 'Modificar rutina'", async ({
    page,
    request,
  }) => {
    const rutina = await crearRutinaBaseApi(
      request,
      payloadRutinaBase({ nombre: "Cobertura AUD03 lectura" })
    );
    await loginComoRecepcionista(page);
    await page.goto("/rutinas");

    const region = regionRutinas(page);
    await expect(region).toHaveCount(1);
    await expect(
      region.getByRole("link", { name: "Cobertura AUD03 lectura", exact: true })
    ).toHaveCount(1);
    // DEC-065: solo DUENO crea.
    await expect(
      page.getByRole("button", { name: BTN_CREAR_RUTINA, exact: true })
    ).toHaveCount(0);
    await verificarSinProhibidos(region, "AUD-03-1 listado RECEP");

    await region
      .getByRole("link", { name: "Cobertura AUD03 lectura", exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`/rutinas/${rutina.id}`));
    await expect(
      page.getByRole("heading", { name: "Cobertura AUD03 lectura", exact: true })
    ).toHaveCount(1);
    // DEC-065: solo DUENO modifica.
    await expect(
      page.getByRole("button", { name: BTN_MODIFICAR_RUTINA, exact: true })
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: BTN_VOLVER_LISTADO, exact: true })
    ).toHaveCount(1);
    await verificarSinProhibidos(
      page.locator("main div.max-w-3xl"),
      "AUD-03-1 detalle RECEP"
    );

    await page.getByRole("button", { name: BTN_VOLVER_LISTADO, exact: true }).click();
    await expect(page).toHaveURL(/\/rutinas$/);
    await expect(regionRutinas(page)).toHaveCount(1);
  });

  test("AUD-03-2 (NAV-RU-11/15) RECEP lee 'Rutina activa' e 'Historial de rutinas' sin controles de asignación", async ({
    page,
    request,
  }) => {
    const cliente = await clienteActivo(request, "Cobertura recepcion ficha");
    const rutina = await crearRutinaBaseApi(
      request,
      payloadRutinaBase({
        nombre: "Cobertura AUD03 ficha",
        descripcion: "Snapshot AUD03 visible",
      })
    );
    await asignarRutinaApi(request, cliente.id, rutina.id);

    await loginComoRecepcionista(page);
    await page.goto(`/clientes/${cliente.id}`);

    const activa = regionRutinaActiva(page);
    await expect(activa).toHaveCount(1);
    await expect(activa.getByText("ACTIVA", { exact: true })).toHaveCount(1);
    // DEC-065: ningún control de asignación para RECEP.
    await expect(
      page.getByRole("button", { name: BTN_ASIGNAR_RUTINA, exact: true })
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: BTN_CONFIRMAR_ASIGNACION, exact: true })
    ).toHaveCount(0);
    await verificarSinProhibidos(activa, "AUD-03-2 rutina activa RECEP");

    const historial = regionHistorial(page);
    await expect(historial).toHaveCount(1);
    await expect(
      historial.getByRole("group", { name: "Cobertura AUD03 ficha", exact: true })
    ).toHaveCount(1);
    // El snapshot es legible al expandir (lectura, DEC-067).
    await expect(
      historial.getByText("Snapshot AUD03 visible", { exact: true })
    ).toHaveCount(0);
    await expect(
      historial.getByRole("button", { name: BTN_VER_VERSION, exact: true })
    ).toHaveCount(1);
    await historial.getByRole("button", { name: BTN_VER_VERSION, exact: true }).click();
    await expect(
      historial.getByText("Snapshot AUD03 visible", { exact: true })
    ).toHaveCount(1);
    await verificarSinProhibidos(historial, "AUD-03-2 historial RECEP");
  });

  test("AUD-03-3 (NAV-RU-16) RECEP lee el historial vacío y 'SIN_RUTINA'", async ({
    page,
    request,
  }) => {
    const cliente = await clienteActivo(request, "Cobertura recepcion vacia");
    await loginComoRecepcionista(page);
    await page.goto(`/clientes/${cliente.id}`);

    const activa = regionRutinaActiva(page);
    await expect(activa).toHaveCount(1);
    await expect(activa.getByText("SIN_RUTINA", { exact: true })).toHaveCount(1);
    await expect(
      page.getByRole("button", { name: BTN_ASIGNAR_RUTINA, exact: true })
    ).toHaveCount(0);

    const historial = regionHistorial(page);
    await expect(historial).toHaveCount(1);
    await expect(
      historial.getByText(HISTORIAL_VACIO_MENSAJE, { exact: true })
    ).toHaveCount(1);
    await verificarSinProhibidos(historial, "AUD-03-3 historial vacío RECEP");
  });

  test("AUD-03-4 (NAV-RU-14/17) RECEP: URL directa y recarga conservan lectura y orden del historial", async ({
    page,
    request,
  }) => {
    const cliente = await clienteActivo(request, "Cobertura recepcion historial");
    const antigua = await crearRutinaBaseApi(
      request,
      payloadRutinaBase({ nombre: "Cobertura AUD03 historial antigua" })
    );
    const nueva = await crearRutinaBaseApi(
      request,
      payloadRutinaBase({ nombre: "Cobertura AUD03 historial nueva" })
    );
    await asignarRutinaApi(request, cliente.id, antigua.id, "2026-10-01");
    await asignarRutinaApi(request, cliente.id, nueva.id);

    await loginComoRecepcionista(page);
    // URL directa con sesión.
    await page.goto(`/clientes/${cliente.id}`);

    const activa = regionRutinaActiva(page);
    const historial = regionHistorial(page);
    await expect(activa.getByText("ACTIVA", { exact: true })).toHaveCount(1);
    // Espera de asentamiento (patrón FIX INC10-FIX-02) antes del orden.
    await expect(historial.getByText("ACTIVA", { exact: true })).toHaveCount(1);
    await expect(historial.getByText("CERRADA", { exact: true })).toHaveCount(1);

    const ordenInicial = await historial
      .getByRole("group")
      .evaluateAll((grupos: Element[]) =>
        grupos.map((g) => g.getAttribute("aria-label"))
      );
    expect(ordenInicial).toEqual([
      "Cobertura AUD03 historial nueva",
      "Cobertura AUD03 historial antigua",
    ]);

    await page.reload();
    await expect(activa.getByText("ACTIVA", { exact: true })).toHaveCount(1);
    await expect(historial.getByText("ACTIVA", { exact: true })).toHaveCount(1);
    await expect(historial.getByText("CERRADA", { exact: true })).toHaveCount(1);
    const ordenTrasRecarga = await historial
      .getByRole("group")
      .evaluateAll((grupos: Element[]) =>
        grupos.map((g) => g.getAttribute("aria-label"))
      );
    expect(ordenTrasRecarga).toEqual(ordenInicial);
    // DEC-065 se conserva tras la recarga.
    await expect(
      page.getByRole("button", { name: BTN_ASIGNAR_RUTINA, exact: true })
    ).toHaveCount(0);
    await verificarSinProhibidos(historial, "AUD-03-4 historial RECEP");
  });

  // ENMIENDA C4 `FIX INC10-FIX-03b`: + etiqueta NAV-RU-11 (fila "Volver ->
  // listado" que ya ejercía este viaje); 0 cambios de expectativa.
  test("AUD-03-5 ficha -> 'Volver' al listado de clientes (NAV-RU-11, navlink 'Clientes')", async ({
    page,
    request,
  }) => {
    const cliente = await clienteActivo(request, "Cobertura recepcion salida");
    await loginComoDueno(page);
    await page.goto(`/clientes/${cliente.id}`);
    await expect(regionRutinaActiva(page)).toHaveCount(1);

    // Salida de la ficha al listado de clientes (navlink pre-existente).
    const volver = page.getByRole("link", { name: "Clientes", exact: true });
    await expect(volver).toHaveCount(1);
    await volver.click();
    // ENMIENDA C4 `FIX INC10-FIX-03b`: ventana de espera 5000ms -> 15000ms.
    // 0 cambios de expectativa (mismo patrón de URL y mismas aserciones).
    // Medición del fix: el RSC de /clientes responde 200 en ~104ms, pero el
    // dev server (Turbopack, raíz con lockfiles duplicados) tarda ~5.5s en
    // servir el chunk de `clientes/page.tsx` y el commit de la navegación
    // client-side ocurre a ~5.9s (6/6 muestras: 5942-5995ms), justo sobre el
    // default de 5000ms. Precedente del repo: `inc06-acceso-membresia.spec.ts`
    // usa `toHaveURL(..., { timeout: 15000 })`. No es defecto de navegación:
    // la URL y el destino siempre cambian; solo supera el timeout por
    // compilación on-demand del entorno dev.
    await expect(page).toHaveURL(/\/clientes$/, { timeout: 15000 });
    await expect(page.getByRole("heading", { name: "Clientes", exact: true })).toHaveCount(
      1
    );
  });
});

// ─── INC10-NAV-AUD-04 — teclado / foco visible (Tab + :focus-visible) ────────

test.describe("INC10-NAV-AUD-04 teclado y foco visible", () => {
  test("AUD-04-1 /portal/rutina: Tab alcanza 'Volver al portal' con foco visible y Enter navega (NAV-RU-21)", async ({
    page,
    request,
  }) => {
    const cliente = await crearClientePortalApi(request, {
      sedeId: "sede-1",
      nombres: "Cobertura teclado portal",
      apellidos: "Teclado",
    });
    await cambiarEstadoCliente(request, cliente.id, "ACTIVO");
    await crearVigenciaApi(
      request,
      cliente.id,
      hoyBogota(),
      sumarDias(hoyBogota(), 30)
    );
    const rutina = await crearRutinaBaseApi(
      request,
      payloadRutinaBase({ nombre: "Cobertura AUD04 portal" })
    );
    await asignarRutinaApi(request, cliente.id, rutina.id);

    await loginComoClienteCon(page, cliente.cedula, "1234");
    await page.goto("/portal/rutina");
    await expect(regionMiRutina(page)).toHaveCount(1);

    const volver = page.getByRole("button", { name: BTN_VOLVER_PORTAL, exact: true });
    await expect(volver).toHaveCount(1);
    await tabHasta(page, volver);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/portal$/);
  });

  // ENMIENDA C4 `FIX INC10-FIX-03b`: + etiquetas NAV-RU en AUD-04-2/04-3
  // (listado, NAV-RU-01) y AUD-04-4 (ficha, NAV-RU-11); 0 cambios de
  // expectativa.
  test("AUD-04-2 listado: Tab alcanza 'Crear rutina' con foco visible y Enter abre el formulario (NAV-RU-01)", async ({
    page,
  }) => {
    await loginComoDueno(page);
    await page.goto("/rutinas");
    await expect(regionRutinas(page)).toHaveCount(1);

    const crear = page.getByRole("button", { name: BTN_CREAR_RUTINA, exact: true });
    await expect(crear).toHaveCount(1);
    await tabHasta(page, crear);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/rutinas\/nueva/);
  });

  test("AUD-04-3 listado: Tab alcanza el link de la fila con foco visible y Enter abre el detalle (NAV-RU-01)", async ({
    page,
    request,
  }) => {
    const rutina = await crearRutinaBaseApi(
      request,
      payloadRutinaBase({ nombre: "Cobertura AUD04 link" })
    );
    await loginComoDueno(page);
    await page.goto("/rutinas");
    await expect(regionRutinas(page)).toHaveCount(1);

    const link = regionRutinas(page).getByRole("link", {
      name: "Cobertura AUD04 link",
      exact: true,
    });
    await expect(link).toHaveCount(1);
    await tabHasta(page, link);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`/rutinas/${rutina.id}`));
  });

  test("AUD-04-4 ficha-asignación: Tab + foco visible alcanza 'Asignar rutina' y 'Volver a la ficha' (NAV-RU-11)", async ({
    page,
    request,
  }) => {
    const cliente = await clienteActivo(request, "Cobertura teclado ficha");
    await crearRutinaBaseApi(
      request,
      payloadRutinaBase({ nombre: "Cobertura AUD04 asignar" })
    );
    await loginComoDueno(page);
    await page.goto(`/clientes/${cliente.id}`);
    await expect(regionRutinaActiva(page)).toHaveCount(1);

    const asignar = regionRutinaActiva(page).getByRole("button", {
      name: BTN_ASIGNAR_RUTINA,
      exact: true,
    });
    await expect(asignar).toHaveCount(1);
    await tabHasta(page, asignar);
    await page.keyboard.press("Enter");
    // El formulario de asignación abre (entrada por teclado).
    await expect(page.getByLabel("Rutina", { exact: true })).toHaveCount(1);

    const volverFicha = page.getByRole("button", { name: BTN_VOLVER_FICHA, exact: true });
    await expect(volverFicha).toHaveCount(1);
    await tabHasta(page, volverFicha);
    await page.keyboard.press("Enter");
    // Salida por teclado: el formulario cierra y la ficha queda operativa.
    await expect(page.getByLabel("Rutina", { exact: true })).toHaveCount(0);
    await expect(asignar).toHaveCount(1);
  });

  // FIX INC10-FIX-03c (2026-11-15) — viaje NUEVO (cobertura sobre producto ya
  // implementado): cierra el item que dejó AUD-04 parcial 3/4 en la
  // re-auditoría (INC10-NAV-AUD-10 del contrato; hallazgo del auditor: "sin
  // Tab + `:focus-visible` + Enter en 'Historial de rutinas'"). 0 cambios de
  // expectativa sobre AUD-04-1..4.
  test("AUD-10 (NAV-RU-15, cierre AUD-04) ficha: Tab + foco visible + Enter sobre 'Ver versión asignada' expande el snapshot", async ({
    page,
    request,
  }) => {
    const cliente = await clienteActivo(request, "Cobertura teclado historial");
    const rutina = await crearRutinaBaseApi(
      request,
      payloadRutinaBase({
        nombre: "FIX03c AUD10 historial",
        descripcion: "Snapshot FIX03c teclado",
      })
    );
    await asignarRutinaApi(request, cliente.id, rutina.id);

    await loginComoDueno(page);
    await page.goto(`/clientes/${cliente.id}`);

    const historial = regionHistorial(page);
    await expect(historial).toHaveCount(1);
    await expect(historial.getByText("ACTIVA", { exact: true })).toHaveCount(1);
    const verVersion = historial.getByRole("button", {
      name: BTN_VER_VERSION,
      exact: true,
    });
    await expect(verVersion).toHaveCount(1);
    // Snapshot plegado antes de la activación por teclado (DEC-067).
    await expect(
      historial.getByText("Snapshot FIX03c teclado", { exact: true })
    ).toHaveCount(0);

    // Teclado real: Tab por la ficha hasta el control del historial.
    await tabHasta(page, verVersion, 200);
    await page.keyboard.press("Enter");
    await expect(
      historial.getByText("Snapshot FIX03c teclado", { exact: true })
    ).toHaveCount(1);
    await expect(historial.getByText("ACTIVA", { exact: true })).toHaveCount(1);
    await verificarSinProhibidos(historial, "AUD-10 historial por teclado");
  });
});

// ─── INC10-NAV-AUD-07 — edición de la familia personalizada (NAV-RU-07) ──────

/**
 * FIX INC10-FIX-03c (2026-11-15) — viajes NUEVOS (cobertura sobre producto ya
 * implementado; sin cambios de expectativas existentes). Clon de AUD-02-1/2/3
 * aplicado a `/rutinas/[id]/editar` con el árbol macro-meso-micro de la familia
 * personalizada (NAV-RU-07: "Detalle -> Editar; Guardar -> detalle; Cancelar ->
 * detalle sin guardar"): "Aplicar cambios" -> detalle con lo aplicado verificado
 * tras RECARGA (persistencia), y "Descartar cambios"/"Volver al listado" SUCIOS
 * -> C5 -> salida sin persistir.
 */
test.describe("INC10-NAV-AUD-07 edición de la familia personalizada (NAV-RU-07)", () => {
  test("AUD-07-1 (NAV-RU-07) 'Aplicar cambios' con árbol deja el detalle con nombre, descripción y ciclo persistidos tras la recarga", async ({
    page,
    request,
  }) => {
    const rutina = await crearRutinaPersonalizadaApi(
      request,
      payloadRutinaPersonalizada({ nombre: "FIX03c AUD07 original" })
    );
    await loginComoDueno(page);
    await page.goto(`/rutinas/${rutina.id}`);
    await expect(
      page.getByRole("heading", { name: "FIX03c AUD07 original", exact: true })
    ).toHaveCount(1);

    // Entrada "Detalle -> Editar" sobre la familia personalizada.
    await page.getByRole("button", { name: BTN_MODIFICAR_RUTINA, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/rutinas/${rutina.id}/editar`));
    await expect(page.getByLabel("Objetivo general", { exact: true })).toHaveCount(1);
    await expect(page.getByLabel("Nombre de la rutina", { exact: true })).toHaveValue(
      "FIX03c AUD07 original"
    );
    await verificarSinProhibidos(
      page.locator("main div.max-w-3xl"),
      "AUD-07-1 editor de personalizada"
    );

    // Árbol: renombra el macrociclo raíz (id determinista del editor C4).
    await page.locator("#ciclo-macro-0-nombre").fill("Macro FIX03c aplicado");
    await page
      .getByLabel("Nombre de la rutina", { exact: true })
      .fill("FIX03c AUD07 aplicada");
    await page.getByLabel("Descripción", { exact: true }).fill("Descripcion FIX03c");
    await expect(bannerCambiosSinGuardar(page)).toHaveCount(1);

    await page.getByRole("button", { name: BTN_APLICAR_CAMBIOS, exact: true }).click();

    // PATCH -> detalle (nunca /editar), con las tres secciones aplicadas.
    await expect(page).toHaveURL(new RegExp(`/rutinas/${rutina.id}$`));
    await expect(page).not.toHaveURL(/\/editar$/);
    await expect(
      page.getByRole("heading", { name: "FIX03c AUD07 aplicada", exact: true })
    ).toHaveCount(1);
    await expect(
      page.getByRole("heading", { name: "FIX03c AUD07 original", exact: true })
    ).toHaveCount(0);
    await expect(page.getByText("Descripcion FIX03c", { exact: true })).toHaveCount(1);
    await expect(page.getByText("Macro FIX03c aplicado", { exact: true })).toHaveCount(1);

    // Persistencia real: la recarga conserva lo aplicado (nombre + árbol).
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "FIX03c AUD07 aplicada", exact: true })
    ).toHaveCount(1);
    await expect(page.getByText("Descripcion FIX03c", { exact: true })).toHaveCount(1);
    await expect(page.getByText("Macro FIX03c aplicado", { exact: true })).toHaveCount(1);
    await verificarSinProhibidos(
      page.locator("main div.max-w-3xl"),
      "AUD-07-1 detalle tras recarga"
    );
  });

  test("AUD-07-2 (NAV-RU-07) 'Descartar cambios' sucio exige C5 y vuelve al DETALLE sin persistir (árbol conservado hasta 'Si, descartar')", async ({
    page,
    request,
  }) => {
    const rutina = await crearRutinaPersonalizadaApi(
      request,
      payloadRutinaPersonalizada({ nombre: "FIX03c AUD07 descarte" })
    );
    await loginComoDueno(page);
    await page.goto(`/rutinas/${rutina.id}/editar`);
    await expect(page.getByLabel("Nombre de la rutina", { exact: true })).toHaveValue(
      "FIX03c AUD07 descarte"
    );

    // Suciedad en el árbol + en el nombre.
    await page.locator("#ciclo-macro-0-nombre").fill("Macro FIX03c descartado");
    await page
      .getByLabel("Nombre de la rutina", { exact: true })
      .fill("FIX03c AUD07 sucia descarte");
    await expect(bannerCambiosSinGuardar(page)).toHaveCount(1);

    await page.getByRole("button", { name: BTN_DESCARTAR_CAMBIOS, exact: true }).click();
    const alerta = page.getByRole("alertdialog");
    await expect(alerta).toHaveCount(1);
    await expect(
      alerta.getByText(BANNER_CAMBIOS_SIN_GUARDAR, { exact: true })
    ).toHaveCount(1);
    await expect(
      alerta.getByRole("button", { name: BTN_SEGUIR_EDITANDO, exact: true })
    ).toHaveCount(1);

    // "Seguir editando" conserva nombre y árbol sucios.
    await alerta.getByRole("button", { name: BTN_SEGUIR_EDITANDO, exact: true }).click();
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await expect(page.getByLabel("Nombre de la rutina", { exact: true })).toHaveValue(
      "FIX03c AUD07 sucia descarte"
    );
    await expect(page.locator("#ciclo-macro-0-nombre")).toHaveValue(
      "Macro FIX03c descartado"
    );

    // Confirmar el descarte -> DETALLE (onDescartar del editor de edición).
    await page.getByRole("button", { name: BTN_DESCARTAR_CAMBIOS, exact: true }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: BTN_SI_DESCARTAR, exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`/rutinas/${rutina.id}$`));
    await expect(
      page.getByRole("heading", { name: "FIX03c AUD07 descarte", exact: true })
    ).toHaveCount(1);
    await expect(
      page.getByRole("heading", { name: "FIX03c AUD07 sucia descarte", exact: true })
    ).toHaveCount(0);
    // Nada del árbol se persistió.
    await expect(page.getByText("Macro FIX03c descartado", { exact: true })).toHaveCount(
      0
    );
    await expect(page.getByText("Macro 1", { exact: true })).toHaveCount(1);
  });

  test("AUD-07-3 (NAV-RU-07) 'Volver al listado' sucio exige C5 y sale al listado sin persistir", async ({
    page,
    request,
  }) => {
    const rutina = await crearRutinaPersonalizadaApi(
      request,
      payloadRutinaPersonalizada({ nombre: "FIX03c AUD07 volver" })
    );
    await loginComoDueno(page);
    await page.goto(`/rutinas/${rutina.id}/editar`);
    await expect(page.getByLabel("Nombre de la rutina", { exact: true })).toHaveValue(
      "FIX03c AUD07 volver"
    );

    await page
      .getByLabel("Nombre de la rutina", { exact: true })
      .fill("FIX03c AUD07 sucia volver");
    await expect(bannerCambiosSinGuardar(page)).toHaveCount(1);

    await page.getByRole("button", { name: BTN_VOLVER_LISTADO, exact: true }).click();
    const alerta = page.getByRole("alertdialog");
    await expect(alerta).toHaveCount(1);
    await expect(
      alerta.getByRole("button", { name: BTN_SI_DESCARTAR, exact: true })
    ).toHaveCount(1);
    await alerta.getByRole("button", { name: BTN_SI_DESCARTAR, exact: true }).click();

    await expect(page).toHaveURL(/\/rutinas$/);
    await expect(regionRutinas(page)).toHaveCount(1);
    await expect(
      regionRutinas(page).getByRole("link", {
        name: "FIX03c AUD07 volver",
        exact: true,
      })
    ).toHaveCount(1);
    await expect(
      regionRutinas(page).getByRole("link", {
        name: "FIX03c AUD07 sucia volver",
        exact: true,
      })
    ).toHaveCount(0);
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await expect(bannerCambiosSinGuardar(page)).toHaveCount(0);
  });
});

// ─── INC10-NAV-AUD-08 — entrada "navegación" con datos sucios (NAV-RU-03/08) ─

/**
 * FIX INC10-FIX-03c (2026-11-15) — viajes NUEVOS: la entrada de la matriz
 * "navegación" (atrás del navegador sobre el documento con datos sin guardar)
 * de NAV-RU-03 (familia base) y NAV-RU-08 (familia personalizada) no tenía
 * viaje (hallazgo INC10-NAV-AUD-08).
 *
 * Mecanismo medido (evidencia `inc10-fix03c-pw-diag3.log`, spec temporal
 * `inc10-fix03c-diag.spec.ts` eliminada): elegir tipo hace `router.push`
 * (`nueva/page.tsx:70`) y por eso el editor vive en `/rutinas/nueva?tipo=X`;
 * el "atrás" es una traversal de MISMO documento (popstate, sin `beforeunload`
 * ni diálogo nativo: 0 eventos `dialog`/`beforeunload` en la traza) y el
 * primer paso aterriza en el selector `/rutinas/nueva` (la derivación C3
 * `nueva/page.tsx:57-63` puede sustituirlo por `/rutinas`); el segundo
 * "atrás" llega al listado. En ambos caminos el editor se desmonta: el
 * borrador no viaja, no se persiste y no hay bucles. La otra sub-entrada de la
 * fila ("salida del documento" = recarga/cierre con el guard `beforeunload`
 * armado, `RutinaEditor.tsx:315-323`) ya está cubierta por NAV-RU-04
 * (`inc10-rutinas-creacion-base.spec.ts:153`) y NAV-RU-09
 * (`inc10-rutinas-creacion-personalizada.spec.ts:194`); aquí se verifica
 * además el ciclado del guard (armado con el borrador sucio, liberado fuera
 * del editor) con un `beforeunload` sintético (sin diálogo nativo).
 */

/** ¿El guard C5 `beforeunload` está armado? (dispatch sintético cancelable). */
async function guardBeforeunloadActivo(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const ev = new Event("beforeunload", { cancelable: true });
    return !window.dispatchEvent(ev);
  });
}

/**
 * Entrada "navegación" sobre el editor sucio ya abierto en
 * `/rutinas/nueva?tipo=X` (el llamador llenó el borrador): 1) atrás ->
 * el editor se desmonta sin persistir; 2) atrás -> listado estable, sin
 * persistir, sin bucles y con el guard liberado.
 */
async function salirPorNavegacion(
  page: Page,
  nombreBorrador: string,
  tipo: "GENERICA" | "PERSONALIZADA"
): Promise<void> {
  // Guard nativo C5 armado mientras el borrador está sucio.
  await expect
    .poll(() => guardBeforeunloadActivo(page), {
      message: "con el borrador sucio el guard beforeunload debe estar armado",
    })
    .toBe(true);

  // 1ª salida: atrás desde el editor con datos sucios.
  await page.goBack();
  await expect(page).not.toHaveURL(new RegExp(`tipo=${tipo}`));
  await expect(page.getByLabel("Nombre de la rutina", { exact: true })).toHaveCount(0);
  await expect(bannerCambiosSinGuardar(page)).toHaveCount(0);
  await expect(page.getByRole("alertdialog")).toHaveCount(0);

  // 2ª salida: atrás hasta el listado (destino de la fila, sin bucles).
  await page.goBack();
  await expect(page).toHaveURL(/\/rutinas$/);
  await expect(regionRutinas(page)).toHaveCount(1);
  await expect(
    regionRutinas(page).getByRole("link", { name: nombreBorrador, exact: true })
  ).toHaveCount(0);
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(bannerCambiosSinGuardar(page)).toHaveCount(0);

  // Fuera del editor el guard beforeunload queda liberado.
  await expect
    .poll(() => guardBeforeunloadActivo(page), {
      message: "fuera del editor el guard beforeunload debe estar liberado",
    })
    .toBe(false);

  // Estabilidad final: el listado sigue en /rutinas (sin bucle de redirect).
  await expect(page).toHaveURL(/\/rutinas$/);
}

test.describe("INC10-NAV-AUD-08 entrada navegación con datos sucios (NAV-RU-03/08)", () => {
  test("AUD-08-1 (NAV-RU-03) atrás del navegador con borrador base sucio desmonta el editor y llega al listado sin persistir ni bucles", async ({
    page,
  }) => {
    await loginComoDueno(page);
    await page.goto("/rutinas");
    await expect(regionRutinas(page)).toHaveCount(1);

    // Entrada por control -> editor con historial previo (el listado).
    await page.getByRole("button", { name: BTN_CREAR_RUTINA, exact: true }).click();
    await expect(page).toHaveURL(/\/rutinas\/nueva/);
    await page.getByRole("button", { name: "Rutina generica", exact: true }).click();
    await expect(page).toHaveURL(/tipo=GENERICA/);
    await page
      .getByLabel("Nombre de la rutina", { exact: true })
      .fill("FIX03c AUD08 base sucia");
    await expect(bannerCambiosSinGuardar(page)).toHaveCount(1);

    // Entrada "navegación": atrás del documento con el borrador sucio.
    await salirPorNavegacion(page, "FIX03c AUD08 base sucia", "GENERICA");
  });

  test("AUD-08-2 (NAV-RU-08) atrás del navegador con borrador personalizado sucio desmonta el editor y llega al listado sin persistir ni bucles", async ({
    page,
  }) => {
    await loginComoDueno(page);
    await page.goto("/rutinas");
    await expect(regionRutinas(page)).toHaveCount(1);

    await page.getByRole("button", { name: BTN_CREAR_RUTINA, exact: true }).click();
    await expect(page).toHaveURL(/\/rutinas\/nueva/);
    await page
      .getByRole("button", { name: "Rutina personalizada", exact: true })
      .click();
    await expect(page).toHaveURL(/tipo=PERSONALIZADA/);
    await expect(page.getByLabel("Objetivo general", { exact: true })).toHaveCount(1);
    await page
      .getByLabel("Nombre de la rutina", { exact: true })
      .fill("FIX03c AUD08 pers sucia");
    await expect(bannerCambiosSinGuardar(page)).toHaveCount(1);

    // Entrada "navegación": atrás del documento con el borrador sucio.
    await salirPorNavegacion(page, "FIX03c AUD08 pers sucia", "PERSONALIZADA");
  });
});
