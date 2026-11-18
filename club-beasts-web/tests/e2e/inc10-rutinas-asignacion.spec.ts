/**
 * INC-10 (RED) — Asignación de rutina en la ficha (NAV-RU-11..NAV-RU-17).
 * Matriz NAV-RU re-escopada C2/C7 del spec de INC-10-rutinas:
 *   NAV-RU-11  Ficha sin rutina activa: "Asignar rutina" -> formulario;
 *              "Volver a la ficha" -> ficha.
 *   NAV-RU-12  Selector + confirmación: "Confirmar asignación" -> ficha con
 *              rutina activa (badge "ACTIVA"); cancelar -> ficha sin cambios.
 *   NAV-RU-13  Rechazos: SIN_VIGENCIA_PERSONALIZADA, CLIENTE_INACTIVO y
 *              RUTINA_YA_ACTIVA con mensaje visible (role=alert); sigue en el
 *              form; "Volver a la ficha" -> ficha.
 *   NAV-RU-14  Recarga / URL directa / atrás de la ficha: coherente con la
 *              asignación persistida, sin bucles.
 *   NAV-RU-15  Historial con registros: expandir "Ver versión asignada" ->
 *              snapshot; volver -> ficha.
 *   NAV-RU-16  Historial vacío: "Aun no hay rutinas asignadas"; sin bucles.
 *   NAV-RU-17  Recarga / URL directa / atrás: el historial conserva el orden
 *              (fechaInicio DESC) tras la recarga.
 *
 * Contrato de UI fijado por este RED (C3/C5/C6/C7, para el GREEN T8):
 *  - Ficha `/clientes/:id`: regiones "Rutina activa" e "Historial de rutinas".
 *  - "Asignar rutina" abre `AsignarRutinaForm` dentro de la región "Rutina
 *    activa": select "Rutina", label "Inicio de la asignación" (NUNCA "Fecha
 *    de inicio"), botones "Confirmar asignación" y "Volver a la ficha".
 *  - Estados (DEC-070): badges "ACTIVA" / "SIN_RUTINA" / "OCULTA_POR_VIGENCIA"
 *    (uppercase; indicador staff).
 *  - Rechazos 409 -> `role="alert"` con los literales exactos de
 *    `MENSAJES_ASIGNACION` (DEC-070).
 *  - Historial: filas con badge "ACTIVA"/"CERRADA" y "Ver versión asignada"
 *    (expande el `contenidoSnapshot`, DEC-067).
 *
 * FASE RED (2026-11-05): pantallas y endpoints NO existen (GREEN T7/T8).
 *
 * Restricciones INC00-QA-01/02: sin `isVisible()` condicional, `waitForTimeout`,
 * skips ni `only`; localizadores `exact: true` + `toHaveCount(1|0)` (C7).
 *
 * FIX INC10-FIX-02 (2026-11-05, NAV-RU-17): correccion SOLO de la forma de
 * esperar. Tras `page.reload()` el `evaluateAll` sincrono corria contra la
 * lista de filas aun en carga (devolvia `[]`) y la comparacion de orden
 * fallaba por carrera, no por negocio: el orden pre-recarga ya era correcto
 * (fechaInicio DESC) y NAV-RU-14 cubre el asentamiento. Se espera el
 * asentamiento de los datos (badges "ACTIVA"/"CERRADA" de las filas del
 * historial, deterministas por fixture) antes del `evaluateAll`. Las
 * aserciones de negocio quedan intactas (mismo orden pre/post recarga).
 */
import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import {
  cambiarEstadoCliente,
  crearClienteApi,
  loginComoDueno,
  type ClienteFixture,
} from "./e2e-helpers";
import {
  BTN_ASIGNAR_RUTINA,
  BTN_CONFIRMAR_ASIGNACION,
  BTN_VER_VERSION,
  BTN_VOLVER_FICHA,
  HISTORIAL_VACIO_MENSAJE,
  LABEL_INICIO_ASIGNACION,
  actualizarRutinaApi,
  asignarRutinaApi,
  crearRutinaBaseApi,
  crearRutinaPersonalizadaApi,
  payloadRutinaBase,
  payloadRutinaPersonalizada,
  regionHistorial,
  regionRutinaActiva,
  verificarSinProhibidos,
} from "./inc10-rutinas-e2e-helpers";

/** Cliente ACTIVO con PIN y perfil para la ficha staff. */
async function clienteActivo(
  request: APIRequestContext,
  nombres: string
): Promise<ClienteFixture> {
  const cliente = await crearClienteApi(request, {
    sedeId: "sede-1",
    nombres,
    apellidos: "Asignacion",
  });
  await cambiarEstadoCliente(request, cliente.id, "ACTIVO");
  return cliente;
}

async function abrirFicha(page: Page, clienteId: string) {
  await page.goto(`/clientes/${clienteId}`);
  await expect(regionRutinaActiva(page)).toHaveCount(1);
}

test.describe("NAV-RU-11 ficha sin rutina activa", () => {
  test("'Asignar rutina' abre el formulario y 'Volver a la ficha' lo cierra", async ({
    page,
    request,
  }) => {
    const cliente = await clienteActivo(request, "Nav once");
    await crearRutinaBaseApi(request, payloadRutinaBase({ nombre: "NAV RU11 generica" }));
    await loginComoDueno(page);
    await abrirFicha(page, cliente.id);

    await expect(regionRutinaActiva(page).getByText("SIN_RUTINA", { exact: true })).toHaveCount(1);
    await verificarSinProhibidos(regionRutinaActiva(page), "NAV-RU-11 sección rutina");

    await regionRutinaActiva(page)
      .getByRole("button", { name: BTN_ASIGNAR_RUTINA, exact: true })
      .click();

    await expect(page.getByLabel("Rutina", { exact: true })).toHaveCount(1);
    await expect(page.getByLabel(LABEL_INICIO_ASIGNACION, { exact: true })).toHaveCount(1);
    await expect(page.getByLabel("Fecha de inicio", { exact: true })).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: BTN_CONFIRMAR_ASIGNACION, exact: true })
    ).toHaveCount(1);

    await page.getByRole("button", { name: BTN_VOLVER_FICHA, exact: true }).click();
    await expect(page.getByLabel("Rutina", { exact: true })).toHaveCount(0);
    await expect(regionRutinaActiva(page)).toHaveCount(1);
  });
});

test.describe("NAV-RU-12 asignar rutina (selector + confirmación)", () => {
  test("confirmar deja la rutina ACTIVA en la ficha; el badge es 'ACTIVA'", async ({
    page,
    request,
  }) => {
    const cliente = await clienteActivo(request, "Nav doce");
    await crearRutinaBaseApi(request, payloadRutinaBase({ nombre: "NAV RU12 generica" }));
    await loginComoDueno(page);
    await abrirFicha(page, cliente.id);

    await regionRutinaActiva(page)
      .getByRole("button", { name: BTN_ASIGNAR_RUTINA, exact: true })
      .click();
    await page.getByLabel("Rutina", { exact: true }).selectOption({ label: "NAV RU12 generica" });
    await page.getByRole("button", { name: BTN_CONFIRMAR_ASIGNACION, exact: true }).click();

    await expect(regionRutinaActiva(page).getByText("ACTIVA", { exact: true })).toHaveCount(1);
    await expect(
      regionRutinaActiva(page).getByRole("button", { name: BTN_VER_VERSION, exact: true })
    ).toHaveCount(1);
  });

  test("cancelar la selección deja la ficha sin cambios", async ({ page, request }) => {
    const cliente = await clienteActivo(request, "Nav doce dos");
    await crearRutinaBaseApi(request, payloadRutinaBase({ nombre: "NAV RU12b generica" }));
    await loginComoDueno(page);
    await abrirFicha(page, cliente.id);

    await regionRutinaActiva(page)
      .getByRole("button", { name: BTN_ASIGNAR_RUTINA, exact: true })
      .click();
    await page.getByLabel("Rutina", { exact: true }).selectOption({ label: "NAV RU12b generica" });
    await page.getByRole("button", { name: BTN_VOLVER_FICHA, exact: true }).click();

    await expect(regionRutinaActiva(page).getByText("SIN_RUTINA", { exact: true })).toHaveCount(1);
  });
});

test.describe("NAV-RU-13 rechazos de la asignación (409 con literales)", () => {
  test("personalizada sin vigencia ACTIVA -> role=alert con SIN_VIGENCIA_PERSONALIZADA", async ({
    page,
    request,
  }) => {
    const cliente = await clienteActivo(request, "Nav trece v");
    await crearRutinaPersonalizadaApi(
      request,
      payloadRutinaPersonalizada({ nombre: "NAV RU13 personalizada" })
    );
    await loginComoDueno(page);
    await abrirFicha(page, cliente.id);

    await regionRutinaActiva(page)
      .getByRole("button", { name: BTN_ASIGNAR_RUTINA, exact: true })
      .click();
    await page
      .getByLabel("Rutina", { exact: true })
      .selectOption({ label: "NAV RU13 personalizada" });
    await page.getByRole("button", { name: BTN_CONFIRMAR_ASIGNACION, exact: true }).click();

    const alerta = page.getByRole("alert");
    await expect(alerta).toHaveCount(1);
    await expect(
      alerta.getByText(
        "El cliente no tiene el servicio personalizado vigente: no se puede activar una rutina personalizada",
        { exact: true }
      )
    ).toHaveCount(1);
    // Sigue en el formulario; Volver -> ficha.
    await expect(page.getByLabel("Rutina", { exact: true })).toHaveCount(1);
    await page.getByRole("button", { name: BTN_VOLVER_FICHA, exact: true }).click();
    await expect(regionRutinaActiva(page)).toHaveCount(1);
  });

  test("cliente SUSPENDIDO -> role=alert con CLIENTE_INACTIVO", async ({ page, request }) => {
    const cliente = await crearClienteApi(request, {
      sedeId: "sede-1",
      nombres: "Nav trece i",
      apellidos: "Inactivo",
    });
    await cambiarEstadoCliente(request, cliente.id, "SUSPENDIDO");
    await crearRutinaBaseApi(request, payloadRutinaBase({ nombre: "NAV RU13 generica" }));
    await loginComoDueno(page);
    await abrirFicha(page, cliente.id);

    await regionRutinaActiva(page)
      .getByRole("button", { name: BTN_ASIGNAR_RUTINA, exact: true })
      .click();
    await page.getByLabel("Rutina", { exact: true }).selectOption({ label: "NAV RU13 generica" });
    await page.getByRole("button", { name: BTN_CONFIRMAR_ASIGNACION, exact: true }).click();

    const alerta = page.getByRole("alert");
    await expect(alerta).toHaveCount(1);
    await expect(
      alerta.getByText("Cliente sin estado activo: no se le pueden asignar rutinas", {
        exact: true,
      })
    ).toHaveCount(1);
  });

  test("repetir la MISMA rutina activa -> role=alert con RUTINA_YA_ACTIVA", async ({
    page,
    request,
  }) => {
    const cliente = await clienteActivo(request, "Nav trece r");
    const rutina = await crearRutinaBaseApi(
      request,
      payloadRutinaBase({ nombre: "NAV RU13 repetida" })
    );
    await asignarRutinaApi(request, cliente.id, rutina.id);
    await loginComoDueno(page);
    await abrirFicha(page, cliente.id);

    await regionRutinaActiva(page)
      .getByRole("button", { name: BTN_ASIGNAR_RUTINA, exact: true })
      .click();
    await page.getByLabel("Rutina", { exact: true }).selectOption({ label: "NAV RU13 repetida" });
    await page.getByRole("button", { name: BTN_CONFIRMAR_ASIGNACION, exact: true }).click();

    const alerta = page.getByRole("alert");
    await expect(alerta).toHaveCount(1);
    await expect(
      alerta.getByText("La rutina ya está activa para este cliente", { exact: true })
    ).toHaveCount(1);
  });
});

test.describe("NAV-RU-14 recarga / URL directa / atrás (ficha)", () => {
  test("la ficha refleja la asignación persistida tras recarga y URL directa", async ({
    page,
    request,
  }) => {
    const cliente = await clienteActivo(request, "Nav catorce");
    const rutina = await crearRutinaBaseApi(
      request,
      payloadRutinaBase({ nombre: "NAV RU14 persistida" })
    );
    await asignarRutinaApi(request, cliente.id, rutina.id);
    await loginComoDueno(page);
    await abrirFicha(page, cliente.id);

    await expect(regionRutinaActiva(page).getByText("ACTIVA", { exact: true })).toHaveCount(1);

    await page.reload();
    await expect(regionRutinaActiva(page).getByText("ACTIVA", { exact: true })).toHaveCount(1);
    await expect(regionRutinaActiva(page).getByText("SIN_RUTINA", { exact: true })).toHaveCount(0);

    await page.goBack();
    await expect(regionRutinaActiva(page)).toHaveCount(1);
  });
});

test.describe("NAV-RU-15 historial con registros", () => {
  test("'Ver versión asignada' expande el snapshot (DEC-067) pese a la edición posterior", async ({
    page,
    request,
  }) => {
    const cliente = await clienteActivo(request, "Nav quince");
    const rutina = await crearRutinaBaseApi(
      request,
      payloadRutinaBase({
        nombre: "NAV RU15 historial",
        descripcion: "Version original del snapshot",
      })
    );
    await asignarRutinaApi(request, cliente.id, rutina.id);
    await actualizarRutinaApi(request, rutina.id, {
      descripcion: "Version editada E2E",
    });

    await loginComoDueno(page);
    await abrirFicha(page, cliente.id);

    const historial = regionHistorial(page);
    await expect(historial).toHaveCount(1);
    await expect(historial.getByText("ACTIVA", { exact: true })).toHaveCount(1);

    // Colapsado: el snapshot no está en el DOM.
    await expect(
      historial.getByText("Version original del snapshot", { exact: true })
    ).toHaveCount(0);

    await historial.getByRole("button", { name: BTN_VER_VERSION, exact: true }).first().click();
    await expect(
      historial.getByText("Version original del snapshot", { exact: true })
    ).toHaveCount(1);
    await expect(historial.getByText("Version editada E2E", { exact: true })).toHaveCount(0);

    await verificarSinProhibidos(historial, "NAV-RU-15 historial");
  });
});

test.describe("NAV-RU-16 historial vacío", () => {
  test("sin asignaciones muestra 'Aun no hay rutinas asignadas' sin bucles", async ({
    page,
    request,
  }) => {
    const cliente = await clienteActivo(request, "Nav dieciseis");
    await loginComoDueno(page);
    await abrirFicha(page, cliente.id);

    const historial = regionHistorial(page);
    await expect(historial).toHaveCount(1);
    await expect(historial.getByText(HISTORIAL_VACIO_MENSAJE, { exact: true })).toHaveCount(1);

    await page.goBack();
    await page.goForward();
    await expect(historial.getByText(HISTORIAL_VACIO_MENSAJE, { exact: true })).toHaveCount(1);
  });
});

test.describe("NAV-RU-17 recarga / URL directa / atrás (historial)", () => {
  test("el orden del historial (fechaInicio DESC) se conserva tras la recarga", async ({
    page,
    request,
  }) => {
    const cliente = await clienteActivo(request, "Nav diecisiete");
    const rutinaAntigua = await crearRutinaBaseApi(
      request,
      payloadRutinaBase({ nombre: "NAV RU17 antigua" })
    );
    const rutinaNueva = await crearRutinaBaseApi(
      request,
      payloadRutinaBase({ nombre: "NAV RU17 nueva" })
    );
    await asignarRutinaApi(request, cliente.id, rutinaAntigua.id, "2026-10-01");
    await asignarRutinaApi(request, cliente.id, rutinaNueva.id);

    await loginComoDueno(page);
    await abrirFicha(page, cliente.id);

    const historial = regionHistorial(page);
    await expect(historial).toHaveCount(1);
    await expect(historial.getByText("ACTIVA", { exact: true })).toHaveCount(1);
    await expect(historial.getByText("CERRADA", { exact: true })).toHaveCount(1);

    const ordenInicial = await historial.getByRole("group").evaluateAll((grupos: Element[]) =>
      grupos.map((g) => g.getAttribute("aria-label"))
    );
    expect(ordenInicial).toEqual(["NAV RU17 nueva", "NAV RU17 antigua"]);

    await page.reload();
    await expect(historial).toHaveCount(1);
    // FIX INC10-FIX-02 (NAV-RU-17): espera de asentamiento tras la recarga — el
    // `evaluateAll` sincrono corria contra la lista aun en carga ([]) y la
    // comparacion de orden fallaba por carrera. Cada fila (role=group) lleva
    // exactamente un badge, asi que 1 "ACTIVA" + 1 "CERRADA" garantiza las 2
    // filas pintadas antes de leer el orden; la asercion de negocio siguiente
    // (orden identico al pre-recarga, fechaInicio DESC) queda intacta.
    await expect(historial.getByText("ACTIVA", { exact: true })).toHaveCount(1);
    await expect(historial.getByText("CERRADA", { exact: true })).toHaveCount(1);
    const ordenTrasRecarga = await historial.getByRole("group").evaluateAll((grupos: Element[]) =>
      grupos.map((g) => g.getAttribute("aria-label"))
    );
    expect(ordenTrasRecarga).toEqual(ordenInicial);
  });
});
