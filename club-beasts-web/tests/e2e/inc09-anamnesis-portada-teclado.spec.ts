/**
 * INC09-FIX-03 (SOLO pruebas) — cierre de hallazgos de cobertura de la
 * auditoria de navegacion INC-09 (comportamiento YA implementado; viajes
 * ejecutados que faltaban). Filas/hallazgos cubiertos por este spec:
 *
 *   NAV-F-02  guarda `debeCambiarPin` en `/portal/anamnesis` (pagina
 *             `src/app/portal/anamnesis/page.tsx:49-58`): con sesion CLIENTE
 *             con cambio de PIN PENDIENTE la URL deriva a `/portal` con el
 *             formulario PIN (sin bypass) y SIN ninguna peticion de datos a
 *             `/portal/anamnesis` ni `/clientes/<id>/anamnesis` (red interceptada
 *             desde antes de la visita). El PIN obligatorio NUNCA se relaja:
 *             se usa el fixture real de cambio pendiente (mismo patron que
 *             `cambio-pin-obligatorio.spec.ts`).
 *   NAV-F-01  salida "Volver al portal" por CLICK -> URL `/portal`.
 *   NAV-F-05  teclado (Tab + Enter) en los links "Mi anamnesis" (entrada en
 *             `/portal`) y "Volver al portal" (salida en `/portal/anamnesis`):
 *             foco visible (`toBeFocused` + `:focus-visible`) + navegacion.
 *   NAV-F-06  DEC-041: el DOM de `/portal/anamnesis` no contiene
 *             `actualizadoPorId` ni metadatos de staff ("Actualizado por").
 *
 * Restricciones INC00-QA-01/02 + C4/C7: sin `isVisible()` condicional,
 * `waitForTimeout`, skips ni `only`; localizadores `exact: true` +
 * `toHaveCount(1|0)`; nombres sin substrings prohibidos. Fixtures
 * deterministas con los helpers existentes (sin tocarlos).
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
  API_URL,
  crearAnamnesisApi,
  payloadAnamnesisCompleto,
  regionAnamnesis,
} from "./inc09-anamnesis-e2e-helpers";

const PIN_CLIENTE = "1234";
const TITULO_PIN = "Cambio de PIN Obligatorio";

/** Cliente portal con GYM ACTIVA (link "Mi anamnesis" pintado, DEC-060). */
async function crearClienteConServicio(
  request: APIRequestContext,
  opciones: { nombres?: string; apellidos?: string } = {}
): Promise<ClienteFixture> {
  const cliente = await crearClientePortalApi(request, {
    sedeId: "sede-1",
    nombres: opciones.nombres ?? "Anamnesis",
    apellidos: opciones.apellidos ?? "Portada",
  });
  await cambiarEstadoCliente(request, cliente.id, "ACTIVO");
  await crearVigenciaApi(
    request,
    cliente.id,
    hoyBogota(),
    sumarDias(hoyBogota(), 30)
  );
  return cliente;
}

/** Presiona Tab hasta enfocar el control (máx. teclas acotado, sin waits). */
async function enfocarConTab(
  page: Page,
  locator: ReturnType<Page["locator"]>,
  maxTeclas = 80
): Promise<void> {
  for (let i = 0; i < maxTeclas; i += 1) {
    await page.keyboard.press("Tab");
    const enfocado = await locator.evaluate((el) => el === document.activeElement);
    if (enfocado) break;
  }
  await expect(locator).toBeFocused();
}

function linkMiAnamnesis(page: Page) {
  return page.getByRole("link", { name: "Mi anamnesis", exact: true });
}

function linkVolverAlPortal(page: Page) {
  return page.getByRole("link", { name: "Volver al portal", exact: true });
}

test.describe("NAV-F-02 guarda debeCambiarPin en /portal/anamnesis (CLIENTE)", () => {
  test("con cambio de PIN pendiente deriva a /portal con el formulario PIN y sin fetch de anamnesis", async ({
    page,
    request,
  }) => {
    // Fixture REAL de PIN obligatorio: cliente recien creado por API nace con
    // `debeCambiarPin: true` y PIN seed 1234 (nunca se relaja el PIN ni la
    // autenticacion). Ademas YA tiene anamnesis con valores rastreables: si
    // la guarda fallara, los datos se filtrarian y el viaje lo detectaria.
    const cliente = await crearClienteApi(request, {
      sedeId: "sede-1",
      nombres: "Guarda",
      apellidos: "Pin Anamnesis",
    });
    await crearAnamnesisApi(
      request,
      cliente.id,
      payloadAnamnesisCompleto({
        nombreCompleto: "Cliente Guarda Pin",
        objetivosEntrenamiento: "Objetivos NAV-F-02",
      })
    );

    await loginComoClienteCon(page, cliente.cedula, PIN_CLIENTE);
    await expect(page).toHaveURL(/\/portal\/?$/);
    // Guarda positiva: la sesion esta en el cambio OBLIGATORIO de PIN.
    await expect(
      page.getByRole("heading", { name: TITULO_PIN, exact: true })
    ).toHaveCount(1);

    // Red interceptada desde ANTES de visitar la ruta: recogemos toda
    // peticion de DATOS de anamnesis (la peticion del documento HTML de la
    // pagina no es un fetch de datos y viaja por el origen web, no por la API).
    const peticionesAnamnesis: string[] = [];
    page.on("request", (peticion) => {
      const url = peticion.url();
      if (!url.startsWith(API_URL)) return;
      const ruta = new URL(url).pathname;
      if (
        ruta === "/portal/anamnesis" ||
        /^\/clientes\/[^/]+\/anamnesis(\/|$)/.test(ruta)
      ) {
        peticionesAnamnesis.push(`${peticion.method()} ${ruta}`);
      }
    });

    await page.goto("/portal/anamnesis");

    // La guarda redirige a /portal SIN bypass y vuelve el formulario PIN.
    await expect(page).toHaveURL(/\/portal\/?$/);
    await expect(
      page.getByRole("heading", { name: TITULO_PIN, exact: true })
    ).toHaveCount(1);

    // Sin datos de anamnesis en el DOM (ni vista, ni valores propios).
    await expect(regionAnamnesis(page)).toHaveCount(0);
    await expect(
      page.getByText("Cliente Guarda Pin", { exact: true })
    ).toHaveCount(0);
    await expect(
      page.getByText("Objetivos NAV-F-02", { exact: true })
    ).toHaveCount(0);
    await expect(linkMiAnamnesis(page)).toHaveCount(0);

    await page.waitForLoadState("networkidle");
    expect(
      peticionesAnamnesis,
      "la guarda debeCambiarPin debe impedir TODO fetch de anamnesis (sin bypass): " +
        JSON.stringify(peticionesAnamnesis)
    ).toEqual([]);
  });
});

test.describe("NAV-F-01 salida 'Volver al portal' por click", () => {
  test("el click en 'Volver al portal' aterriza en /portal", async ({
    page,
    request,
  }) => {
    const cliente = await crearClienteConServicio(request, {
      nombres: "Salida",
      apellidos: "Por Click",
    });
    await crearAnamnesisApi(
      request,
      cliente.id,
      payloadAnamnesisCompleto({
        objetivosEntrenamiento: "Objetivos NAV-F-01",
      })
    );

    await loginComoClienteCon(page, cliente.cedula, PIN_CLIENTE);
    await page.goto("/portal/anamnesis");
    await expect(regionAnamnesis(page)).toHaveCount(1);
    await expect(linkVolverAlPortal(page)).toHaveCount(1);

    await linkVolverAlPortal(page).click();

    // Destino completo: URL + encabezado + la entrada de anamnesis de nuevo.
    await expect(page).toHaveURL(/\/portal\/?$/);
    await expect(
      page.getByRole("heading", { name: "Mi Portal", exact: true })
    ).toHaveCount(1);
    await expect(linkMiAnamnesis(page)).toHaveCount(1);
    await expect(regionAnamnesis(page)).toHaveCount(0);
  });
});

test.describe("NAV-F-05 teclado (Tab + Enter) en links de entrada y salida", () => {
  test("Tab + Enter en 'Mi anamnesis' (entrada) abre la vista con foco visible", async ({
    page,
    request,
  }) => {
    const cliente = await crearClienteConServicio(request, {
      nombres: "Teclado",
      apellidos: "Entrada",
    });
    await crearAnamnesisApi(
      request,
      cliente.id,
      payloadAnamnesisCompleto({
        objetivosEntrenamiento: "Objetivos NAV-F-05",
      })
    );

    await loginComoClienteCon(page, cliente.cedula, PIN_CLIENTE);
    await expect(page).toHaveURL(/\/portal\/?$/);

    const link = linkMiAnamnesis(page);
    await expect(link).toHaveCount(1);
    await enfocarConTab(page, link);
    await expect(link, "el foco del teclado debe quedar en 'Mi anamnesis'").toBeFocused();
    expect(
      await link.evaluate((el) => el.matches(":focus-visible")),
      "el foco del teclado sobre 'Mi anamnesis' debe ser visible (:focus-visible)"
    ).toBe(true);

    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/\/portal\/anamnesis/);
    await expect(regionAnamnesis(page)).toHaveCount(1);
    await expect(
      regionAnamnesis(page).getByText("Objetivos NAV-F-05", { exact: true })
    ).toHaveCount(1);
  });

  test("Tab + Enter en 'Volver al portal' (salida) aterriza en /portal con foco visible", async ({
    page,
    request,
  }) => {
    const cliente = await crearClienteConServicio(request, {
      nombres: "Teclado",
      apellidos: "Salida",
    });
    await crearAnamnesisApi(
      request,
      cliente.id,
      payloadAnamnesisCompleto({
        objetivosEntrenamiento: "Objetivos NAV-F-05 salida",
      })
    );

    await loginComoClienteCon(page, cliente.cedula, PIN_CLIENTE);
    await page.goto("/portal/anamnesis");
    await expect(regionAnamnesis(page)).toHaveCount(1);

    const link = linkVolverAlPortal(page);
    await expect(link).toHaveCount(1);
    await enfocarConTab(page, link);
    await expect(link, "el foco del teclado debe quedar en 'Volver al portal'").toBeFocused();
    expect(
      await link.evaluate((el) => el.matches(":focus-visible")),
      "el foco del teclado sobre 'Volver al portal' debe ser visible (:focus-visible)"
    ).toBe(true);

    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/\/portal\/?$/);
    await expect(
      page.getByRole("heading", { name: "Mi Portal", exact: true })
    ).toHaveCount(1);
    await expect(linkMiAnamnesis(page)).toHaveCount(1);
    await expect(regionAnamnesis(page)).toHaveCount(0);
  });
});

test.describe("NAV-F-06 DEC-041: sin metadatos de staff en el DOM del portal", () => {
  test("el DOM de /portal/anamnesis no contiene actualizadoPorId ni 'Actualizado por'", async ({
    page,
    request,
  }) => {
    const cliente = await crearClienteConServicio(request, {
      nombres: "Sin",
      apellidos: "Metadatos Staff",
    });
    await crearAnamnesisApi(
      request,
      cliente.id,
      payloadAnamnesisCompleto({
        objetivosEntrenamiento: "Objetivos NAV-F-06",
      })
    );

    await loginComoClienteCon(page, cliente.cedula, PIN_CLIENTE);
    await page.goto("/portal/anamnesis");
    const region = regionAnamnesis(page);
    await expect(region).toHaveCount(1);

    // Guardas positivas: la vista renderiza su metadato permitido
    // (fecha de actualizacion) y los datos propios.
    await expect(region.getByText(/Última actualización/)).toHaveCount(1);
    await expect(
      region.getByText("Objetivos NAV-F-06", { exact: true })
    ).toHaveCount(1);

    // DEC-041: la trazabilidad de staff jamas viaja al portal.
    const dom = await page.content();
    expect(
      dom,
      "DEC-041: actualizadoPorId no debe existir en el DOM de /portal/anamnesis"
    ).not.toContain("actualizadoPorId");
    expect(
      dom,
      "los metadatos de staff ('Actualizado por') no deben existir en el DOM de /portal/anamnesis"
    ).not.toContain("Actualizado por");
  });
});
