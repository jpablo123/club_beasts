/**
 * INC-10 (RED) — Portal del cliente: "Mi rutina activa" (NAV-RU-18..NAV-RU-22).
 * Matriz NAV-RU re-escopada C2/C7 del spec de INC-10-rutinas:
 *   NAV-RU-18  Card "Mi Rutina" desde /portal -> link "Mi rutina activa" ->
 *              /portal/rutina con la estructura completa (DEC-068); "Volver al
 *              portal" -> /portal. Sin logout (transversal).
 *   NAV-RU-19  Sin rutina: "No tienes una rutina activa" (role=alert);
 *              "Volver al portal"; sin bucles.
 *   NAV-RU-20  URL directa / recarga / atrás: misma vista coherente.
 *   NAV-RU-21  Solo lectura: sin controles de edición alcanzables; foco
 *              visible; móvil responsive.
 *   NAV-RU-22  PIN obligatorio y gate DEC-060: con `sinMembresiaActiva` el
 *              link NO se pinta y la URL directa deriva al aviso DEC-051 sin
 *              datos; con PIN pendiente -> /portal (guarda intacta).
 *
 * Contrato de UI fijado por este RED (C3/C8/C7, para el GREEN T8):
 *  - /portal: card "Mi Rutina" con 1 ÚNICO heading "Mi Rutina" (el acceso es
 *    el link "Mi rutina activa", nunca un heading) pintado SOLO con servicio
 *    vigente (DEC-060).
 *  - /portal/rutina: `<section role="region" aria-label="Mi rutina">` con la
 *    vista en solo lectura (estructura completa de la personalizada: info,
 *    diagnóstico, ciclos y evaluaciones) o el mensaje en `role="alert"`.
 *
 * FASE RED (2026-11-05): la página y el endpoint NO existen (GREEN T7/T8).
 *
 * Restricciones INC00-QA-01/02: sin `isVisible()` condicional, `waitForTimeout`,
 * skips ni `only`; localizadores `exact: true` + `toHaveCount(1|0)` (C7).
 *
 * FIX INC10-FIX-02 (2026-11-05, NAV-RU-22-1): correccion SOLO de la forma de
 * escuchar. El listener de `request` contaba el propio `document` del
 * `page.goto("/portal/rutina")`, por lo que `consultas` nunca podia ser `[]`
 * (asercion imposible); el producto se porta bien (redirect al aviso DEC-051
 * + 0 llamadas de datos). Se excluye `resourceType === "document"` del filtro
 * del listener; la asercion de negocio "0 llamadas de datos" (fetch/xhr a
 * `/portal/rutina`) queda identica. PIN obligatorio y guardas intactos.
 */
import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import {
  cambiarEstadoCliente,
  crearClienteApi,
  crearClientePortalApi,
  crearVigenciaApi,
  hoyBogota,
  loginComoClienteCon,
  sumarDias,
  type ClienteFixture,
} from "./e2e-helpers";
import {
  BTN_VOLVER_PORTAL,
  SIN_RUTINA_MENSAJE,
  TITULO_AVISO,
  asignarRutinaApi,
  cardMiRutina,
  crearRutinaBaseApi,
  crearRutinaPersonalizadaApi,
  crearVigenciaPersonalizadaApi,
  payloadRutinaBase,
  payloadRutinaPersonalizada,
  regionMiRutina,
  verificarSinProhibidos,
} from "./inc10-rutinas-e2e-helpers";

const PIN_CLIENTE = "1234";

function linkMiRutinaActiva(page: Page) {
  return page.getByRole("link", { name: "Mi rutina activa", exact: true });
}

/** Cliente portal con GYM ACTIVA (DEC-060: link pintado) y PIN fijo. */
async function clienteConServicio(
  request: APIRequestContext,
  nombres: string
): Promise<ClienteFixture> {
  const cliente = await crearClientePortalApi(request, {
    sedeId: "sede-1",
    nombres,
    apellidos: "Portal",
  });
  await cambiarEstadoCliente(request, cliente.id, "ACTIVO");
  await crearVigenciaApi(request, cliente.id, hoyBogota(), sumarDias(hoyBogota(), 30));
  return cliente;
}

test.describe("NAV-RU-18 /portal/rutina con rutina visible", () => {
  test("el link 'Mi rutina activa' abre la vista con la estructura de la rutina", async ({
    page,
    request,
  }) => {
    const cliente = await clienteConServicio(request, "Nav dieciocho");
    const rutina = await crearRutinaBaseApi(
      request,
      payloadRutinaBase({
        tipoRutina: "INDUCCION",
        nombre: "NAV RU18 induccion",
        descripcion: "Descripcion snapshot portal",
      })
    );
    await asignarRutinaApi(request, cliente.id, rutina.id);

    await loginComoClienteCon(page, cliente.cedula, PIN_CLIENTE);

    // Invariante C3: 1 único heading "Mi Rutina" en /portal; el acceso es link.
    await expect(page.getByRole("heading", { name: "Mi Rutina", exact: true })).toHaveCount(1);
    await expect(linkMiRutinaActiva(page)).toHaveCount(1);

    await linkMiRutinaActiva(page).click();
    await expect(page).toHaveURL(/\/portal\/rutina/);

    const region = regionMiRutina(page);
    await expect(region).toHaveCount(1);
    await expect(region.getByText("NAV RU18 induccion", { exact: true })).toHaveCount(1);
    await expect(
      region.getByText("Descripcion snapshot portal", { exact: true })
    ).toHaveCount(1);
    await verificarSinProhibidos(region, "NAV-RU-18 mi rutina");

    await page.getByRole("button", { name: BTN_VOLVER_PORTAL, exact: true }).click();
    await expect(page).toHaveURL(/\/portal$/);
  });

  test("la personalizada muestra la estructura completa (DEC-068) sin datos de staff", async ({
    page,
    request,
  }) => {
    const cliente = await clienteConServicio(request, "Nav dieciocho p");
    await crearVigenciaPersonalizadaApi(
      request,
      cliente.id,
      hoyBogota(),
      sumarDias(hoyBogota(), 30)
    );
    const rutina = await crearRutinaPersonalizadaApi(
      request,
      payloadRutinaPersonalizada({ nombre: "NAV RU18 personalizada" })
    );
    await asignarRutinaApi(request, cliente.id, rutina.id);

    await loginComoClienteCon(page, cliente.cedula, PIN_CLIENTE);
    await linkMiRutinaActiva(page).click();
    await expect(page).toHaveURL(/\/portal\/rutina/);

    const region = regionMiRutina(page);
    await expect(region).toHaveCount(1);
    for (const encabezado of [
      "Informacion general",
      "Diagnostico",
      "Ciclos (macro-meso-micro)",
      "Evaluaciones",
    ]) {
      await expect(
        region.getByRole("heading", { name: encabezado, exact: true })
      ).toHaveCount(1);
    }
    await expect(region.getByText("Macro 1", { exact: true })).toHaveCount(1);
    await expect(region.getByText("1RM sentadilla", { exact: true })).toHaveCount(1);
    // Sin campos de staff (SEC-01/SEC-03).
    await expect(region.getByText("David Rozo", { exact: true })).toHaveCount(0);
    await expect(region.getByText("Actualizado", { exact: true })).toHaveCount(0);
  });
});

test.describe("NAV-RU-19 sin rutina (mensaje)", () => {
  test("'No tienes una rutina activa' en role=alert con 'Volver al portal'", async ({
    page,
    request,
  }) => {
    const cliente = await clienteConServicio(request, "Nav diecinueve");
    await loginComoClienteCon(page, cliente.cedula, PIN_CLIENTE);

    await linkMiRutinaActiva(page).click();
    await expect(page).toHaveURL(/\/portal\/rutina/);

    const alerta = page.getByRole("alert");
    await expect(alerta).toHaveCount(1);
    await expect(alerta.getByText(SIN_RUTINA_MENSAJE, { exact: true })).toHaveCount(1);

    await page.getByRole("button", { name: BTN_VOLVER_PORTAL, exact: true }).click();
    await expect(page).toHaveURL(/\/portal$/);
    // Sin bucles: el link sigue operativo.
    await expect(linkMiRutinaActiva(page)).toHaveCount(1);
  });
});

test.describe("NAV-RU-20 URL directa / recarga / atrás", () => {
  test("la URL directa con sesión y la recarga conservan la misma vista coherente", async ({
    page,
    request,
  }) => {
    const cliente = await clienteConServicio(request, "Nav veinte");
    const rutina = await crearRutinaBaseApi(
      request,
      payloadRutinaBase({ nombre: "NAV RU20 persistente" })
    );
    await asignarRutinaApi(request, cliente.id, rutina.id);

    await loginComoClienteCon(page, cliente.cedula, PIN_CLIENTE);
    await page.goto("/portal/rutina");
    await expect(regionMiRutina(page)).toHaveCount(1);
    await expect(
      regionMiRutina(page).getByText("NAV RU20 persistente", { exact: true })
    ).toHaveCount(1);

    await page.reload();
    await expect(regionMiRutina(page)).toHaveCount(1);
    await expect(
      regionMiRutina(page).getByText("NAV RU20 persistente", { exact: true })
    ).toHaveCount(1);

    await page.goBack();
    await expect(page).toHaveURL(/\/portal\/rutina/);
    await expect(regionMiRutina(page)).toHaveCount(1);
  });
});

test.describe("NAV-RU-21 solo lectura (teclado / móvil)", () => {
  test("la vista no expone controles de edición y es usable en viewport móvil", async ({
    page,
    request,
  }) => {
    const cliente = await clienteConServicio(request, "Nav veintiuno");
    const rutina = await crearRutinaBaseApi(
      request,
      payloadRutinaBase({ nombre: "NAV RU21 lectura" })
    );
    await asignarRutinaApi(request, cliente.id, rutina.id);

    await page.setViewportSize({ width: 390, height: 844 });
    await loginComoClienteCon(page, cliente.cedula, PIN_CLIENTE);
    await page.goto("/portal/rutina");

    const region = regionMiRutina(page);
    await expect(region).toHaveCount(1);
    await expect(region.getByText("NAV RU21 lectura", { exact: true })).toHaveCount(1);

    // Guardas positivas + ausencias (RU-40/C7): sin controles de escritura.
    await expect(page.getByRole("button", { name: "Aplicar cambios", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Modificar rutina", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Asignar rutina", exact: true })).toHaveCount(0);
    await verificarSinProhibidos(region, "NAV-RU-21 mi rutina móvil");
  });
});

test.describe("NAV-RU-22 PIN obligatorio y gate DEC-060", () => {
  test("con sinMembresiaActiva el link no se pinta y la URL directa deriva al aviso sin datos", async ({
    page,
    request,
  }) => {
    // Cliente portal SIN ninguna vigencia -> sinMembresiaActiva (INC-06 R1).
    const cliente = await crearClientePortalApi(request, {
      sedeId: "sede-1",
      nombres: "Nav veintidos",
      apellidos: "SinServicio",
    });
    await cambiarEstadoCliente(request, cliente.id, "ACTIVO");

    await loginComoClienteCon(page, cliente.cedula, PIN_CLIENTE);
    await expect(linkMiRutinaActiva(page), "DEC-060: link no pintado").toHaveCount(0);

    // URL directa: deriva al aviso DEC-051 y JAMÁS consulta /portal/rutina.
    const consultas: string[] = [];
    // FIX INC10-FIX-02 (NAV-RU-22-1): el listener contaba tambien el propio
    // `document` del `page.goto("/portal/rutina")`, por lo que `consultas`
    // nunca podia ser [] (asercion imposible). Se excluyen los documentos de
    // pagina: la asercion de negocio "0 llamadas de datos" (fetch/xhr) queda
    // identica y el producto se porta bien (redirect + 0 llamadas de datos).
    page.on("request", (req) => {
      if (req.resourceType() !== "document" && req.url().includes("/portal/rutina"))
        consultas.push(req.url());
    });
    await page.goto("/portal/rutina");
    await expect(page).toHaveURL(/\/portal$/);
    await expect(page.getByText(TITULO_AVISO, { exact: true })).toHaveCount(1);
    expect(consultas, "sin datos con membresía inactiva").toEqual([]);
  });

  test("con PIN pendiente /portal/rutina deriva a /portal (guarda PIN intacta)", async ({
    page,
    request,
  }) => {
    // Los clientes nacidos por API traen debeCambiarPin = true.
    const cliente = await crearClienteApi(request, {
      sedeId: "sede-1",
      nombres: "Nav veintitres pin",
      apellidos: "PinPendiente",
    });
    await cambiarEstadoCliente(request, cliente.id, "ACTIVO");
    await crearVigenciaApi(request, cliente.id, hoyBogota(), sumarDias(hoyBogota(), 30));

    await loginComoClienteCon(page, cliente.cedula, "1234");
    await page.goto("/portal/rutina");
    await expect(page).toHaveURL(/\/portal/);
    await expect(page).not.toHaveURL(/\/portal\/rutina/);
    await expect(regionMiRutina(page)).toHaveCount(0);
  });
});
