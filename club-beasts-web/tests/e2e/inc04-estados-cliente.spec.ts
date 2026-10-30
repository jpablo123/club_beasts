import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import {
  API_URL,
  cambiarEstadoCliente,
  crearClienteApi,
  fijarPinApi,
  loginComoDueno,
  tokenApi,
} from "./e2e-helpers";

/**
 * INC-04 — cambio de estado del cliente desde la UI staff (DEC-035 / DEC-020).
 *
 * Criterios cubiertos:
 *  - `INC04-EST-06` + `INC04-CLI-03`: el formulario de la ficha exige
 *    `motivo` (3..200) en todo cambio de estado; sin el, el 400 del backend
 *    ("Motivo es requerido cuando cambia el estado") se pinta en
 *    `role="alert"` y NO se guarda el cambio; con el, el estado cambia y el
 *    `ultimoCambio` queda observable en la respuesta de la ficha
 *    (`motivo` derivado del ultimo `ClienteEstadoCambio`, CONF-05/DEC-036).
 *  - Ciclo completo HU-08 (`INC04-CLI-04` + `INC04-CLI-08`): inactivar con
 *    motivo -> login del cliente bloqueado con el literal aprobado ->
 *    reactivar (DEC-020) -> el login del cliente vuelve a funcionar.
 *
 * Fixtures: SQLite temporal aislado por corrida (DEC-012); cliente creado via
 * API con cedula unica y PIN fijo; cada cambio de estado lleva su motivo
 * (DEC-035).
 *
 * Restricciones INC00-QA-01/02: sin `isVisible()` condicional, sin
 * `waitForTimeout`, skips ni `only`, sin aserciones vacias.
 */

/** Literal aprobado del contrato G14 (`HU08-C04a`), con tildes exactas. */
const LITERAL_CUENTA_INACTIVA =
  "La cuenta está inactiva. Contacte con recepción.";

const MOTIVO_INACTIVAR = "Reposo por lesión de rodilla autorizado por medicina";
const MOTIVO_REACTIVAR = "Alta autorizada por recepción tras recuperación";

/** Badge del estado actual (`span.rounded-tag` del ficha de cliente). */
function badgeEstado(page: Page) {
  return page.locator("span.rounded-tag");
}

/**
 * `role="alert"` del contenido de la pantalla. Se acota a `<main>` porque el
 * anunciador de rutas de Next.js (`#__next-route-announcer__`, siempre en el
 * DOM y colgando de `body`) tambien expone `role="alert"` y haria ambiguo el
 * localizador (mismo patron de acotado que `cardCon` en recepcion).
 */
function alertaDePantalla(page: Page) {
  return page.locator("main").getByRole("alert");
}

async function abrirFicha(page: Page, clienteId: string): Promise<void> {
  await page.goto(`/clientes/${clienteId}`);
  await expect(page.getByRole("heading", { name: "Ficha del Cliente" })).toBeVisible();
}

/** Editar -> estado + motivo -> Guardar (flujo staff real de la ficha). */
async function cambiarEstadoEnFicha(
  page: Page,
  clienteId: string,
  estado: "NUEVO" | "ACTIVO" | "SUSPENDIDO" | "RETIRADO" | "INACTIVO",
  motivo: string
): Promise<void> {
  await page.getByRole("button", { name: "Editar" }).click();
  await page.getByLabel("Estado").selectOption(estado);
  await page.getByLabel("Motivo").fill(motivo);

  // R-10: la recarga de la ficha tras guardar viaja por `fetchApi`, que
  // espera a `getSession()` antes de cada llamada (traza: ~2.5s antes del
  // PATCH y ~2.5s antes del GET de recarga). Esperar la respuesta de la
  // recarga en vez de asumir la ventana de 5s del badge evita que la
  // asercion posterior se agote justo antes de que el GET llegue
  // (traza observada: GET de recarga en 21586ms vs fin del expect 21573ms).
  const recarga = page.waitForResponse((res) => {
    if (res.request().method() !== "GET") return false;
    try {
      return new URL(res.url()).pathname === `/clientes/${clienteId}`;
    } catch {
      return false;
    }
  });

  await page.getByRole("button", { name: "Guardar" }).click();

  const respuesta = await recarga;
  expect(
    respuesta.status(),
    "la recarga de la ficha tras guardar debe responder 200"
  ).toBe(200);
}

/** Ficha del cliente por la API staff (estado + `ultimoCambio` derivado). */
async function fichaApi(
  request: APIRequestContext,
  clienteId: string
): Promise<{ estado: string; motivo: string | null }> {
  const token = await tokenApi(request);
  const res = await request.get(`${API_URL}/clientes/${clienteId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.ok(), `GET /clientes/${clienteId} devolvio ${res.status()}`).toBe(true);
  return (await res.json()) as { estado: string; motivo: string | null };
}

/** Login de cliente por la UI (cedula + PIN) en la pagina dada. */
async function intentarLoginCliente(
  page: Page,
  cedula: string,
  pin: string
): Promise<void> {
  await page.goto("/login-cliente");
  await page.getByPlaceholder("Ingresa tu cedula").fill(cedula);
  await page.getByPlaceholder("****").fill(pin);
  await page.getByRole("button", { name: "Ingresar" }).click();
}

test.describe("INC04-EST-06 / INC04-CLI-03: cambio de estado con motivo en la ficha", () => {
  test("cambiar el estado sin motivo pinta el 400 del backend en role=alert y no guarda el cambio", async ({
    page,
    request,
  }) => {
    const cliente = await crearClienteApi(request, { sedeId: "sede-1" });

    await loginComoDueno(page);
    await abrirFicha(page, cliente.id);

    // Estado intentado INACTIVO con el campo Motivo vacio.
    await page.getByRole("button", { name: "Editar" }).click();
    await page.getByLabel("Estado").selectOption("INACTIVO");
    await page.getByLabel("Motivo").fill("");
    await page.getByRole("button", { name: "Guardar" }).click();

    // INC04-EST-03/06: el literal del backend aparece en role=alert.
    await expect(alertaDePantalla(page)).toContainText(
      "Motivo es requerido cuando cambia el estado"
    );
    // El modo edicion no se cierra: no hubo guardado.
    await expect(page.getByRole("button", { name: "Guardar" })).toBeVisible();

    // INC04-CLI-03: sin escritura (estado intacto y sin fila de historial).
    const ficha = await fichaApi(request, cliente.id);
    expect(ficha.estado, "el estado no debe cambiar sin motivo").toBe("NUEVO");
    expect(ficha.motivo, "no debe existir un ultimo cambio").toBeNull();
    await expect(badgeEstado(page)).toHaveText("NUEVO");
  });

  test("cambiar el estado con motivo valido guarda el estado y deja el ultimo cambio observable", async ({
    page,
    request,
  }) => {
    const cliente = await crearClienteApi(request, { sedeId: "sede-1" });

    await loginComoDueno(page);
    await abrirFicha(page, cliente.id);
    await cambiarEstadoEnFicha(page, cliente.id, "INACTIVO", MOTIVO_INACTIVAR);

    // INC04-EST-06: el modo edicion se cierra y el estado pintado es el nuevo.
    await expect(page.getByRole("button", { name: "Editar" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Guardar" })).toHaveCount(0);
    await expect(badgeEstado(page)).toHaveText("INACTIVO");
    await expect(alertaDePantalla(page)).toHaveCount(0);

    // INC04-CLI-03 / INC04-EST-02: estado persistido y `ultimoCambio`
    // observable en la respuesta de la ficha (motivo derivado del historial).
    const ficha = await fichaApi(request, cliente.id);
    expect(ficha.estado).toBe("INACTIVO");
    expect(ficha.motivo).toBe(MOTIVO_INACTIVAR);
  });
});

test.describe("INC-04: ciclo completo HU-08 (inactivar -> bloqueo -> reactivar)", () => {
  test("inactivar con motivo bloquea el login del cliente y reactivarlo (DEC-020) lo devuelve al portal", async ({
    page,
    request,
  }) => {
    const cliente = await crearClienteApi(request, { sedeId: "sede-1" });
    await fijarPinApi(request, cliente.id);

    // ── 1) Staff inactiva el cliente con motivo.
    await loginComoDueno(page);
    await abrirFicha(page, cliente.id);
    await cambiarEstadoEnFicha(page, cliente.id, "INACTIVO", MOTIVO_INACTIVAR);
    await expect(badgeEstado(page)).toHaveText("INACTIVO");

    // ── 2) El login del cliente quedo bloqueado con el literal aprobado.
    await page.getByRole("button", { name: "Salir" }).click();
    await expect(page).toHaveURL(/.*\/$/);
    await intentarLoginCliente(page, cliente.cedula, "1234");
    await expect(alertaDePantalla(page)).toContainText(LITERAL_CUENTA_INACTIVA);
    await expect(page).toHaveURL(/.*login-cliente/);
    await expect(page.getByRole("heading", { name: "Mi Portal" })).toHaveCount(0);

    // ── 3) Staff reactiva al cliente (DEC-020) con su motivo.
    await loginComoDueno(page);
    await abrirFicha(page, cliente.id);
    await cambiarEstadoEnFicha(page, cliente.id, "ACTIVO", MOTIVO_REACTIVAR);
    await expect(badgeEstado(page)).toHaveText("ACTIVO");
    const reactivado = await fichaApi(request, cliente.id);
    expect(reactivado.estado).toBe("ACTIVO");
    expect(reactivado.motivo).toBe(MOTIVO_REACTIVAR);

    // ── 4) El login del cliente vuelve a funcionar.
    await page.getByRole("button", { name: "Salir" }).click();
    await expect(page).toHaveURL(/.*\/$/);
    await intentarLoginCliente(page, cliente.cedula, "1234");
    await expect(page).toHaveURL(/.*portal/);
    await expect(page.getByRole("heading", { name: "Mi Portal" })).toBeVisible();
    await expect(alertaDePantalla(page)).toHaveCount(0);
  });

  test("reactivar (DEC-020) devuelve el acceso: el login del cliente vuelve al portal con su ultimo cambio", async ({
    page,
    request,
  }) => {
    const cliente = await crearClienteApi(request, { sedeId: "sede-1" });
    await fijarPinApi(request, cliente.id);
    await cambiarEstadoCliente(request, cliente.id, "INACTIVO", MOTIVO_INACTIVAR);

    // Staff reactiva al cliente desde la ficha (UI real).
    await loginComoDueno(page);
    await abrirFicha(page, cliente.id);
    await cambiarEstadoEnFicha(page, cliente.id, "ACTIVO", MOTIVO_REACTIVAR);
    await expect(badgeEstado(page)).toHaveText("ACTIVO");

    const reactivado = await fichaApi(request, cliente.id);
    expect(reactivado.estado, "DEC-020: la reactivacion debe persistirse").toBe("ACTIVO");
    expect(reactivado.motivo).toBe(MOTIVO_REACTIVAR);

    // El login del cliente vuelve a funcionar (INC04-CLI-08).
    await page.getByRole("button", { name: "Salir" }).click();
    await expect(page).toHaveURL(/.*\/$/);
    await intentarLoginCliente(page, cliente.cedula, "1234");
    await expect(page).toHaveURL(/.*portal/);
    await expect(page.getByRole("heading", { name: "Mi Portal" })).toBeVisible();
    await expect(alertaDePantalla(page)).toHaveCount(0);
  });
});
