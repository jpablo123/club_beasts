import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import {
  API_URL,
  cardCon,
  cedulaUnica,
  crearClienteApi,
  telefonoUnico,
} from "./e2e-helpers";

/**
 * INC-03 (HU-31) — E2E real del alta rapida de clientes en recepcion.
 *
 * Criterios cubiertos:
 *  - `INC03-RAP-01` / `DEC-031`: el formulario exige SOLO el minimo de
 *    campos (cedula, nombres, apellidos, telefono) y no trae selector de
 *    sede; la sede la asigna el backend desde la sesion del recepcionista.
 *  - `INC03-RAP-02` / `DEC-032`: el 201 pinta la marca "Perfil pendiente"
 *    y la marca PERSISTE en una lectura posterior (`GET /clientes/:id`).
 *  - `INC03-RAP-03` / `DEC-033`: completar el perfil con email limpia la
 *    marca en pantalla y en BD.
 *  - `INC03-RAP-04`: validaciones de HU-04 sobre la nueva superficie
 *    (telefono invalido -> 400 en `role="alert"`, sin escritura).
 *  - `INC03-RAP-06`: `estado = "NUEVO"`, `creadoPorId` = actor del token y
 *    `creadoPor.nombre` visible en la respuesta.
 *  - `INC03-RAP-07`: cedula duplicada -> 409 en `role="alert"` y sin
 *    segunda fila.
 *
 * Fixtures: SQLite temporal aislado (DEC-012), cedulas/telefonos unicos y
 * datos deterministas; ninguna prueba depende del orden de ejecucion.
 *
 * Restricciones INC00-QA-01/02: sin `isVisible()` condicional, sin
 * `waitForTimeout`, sin skips ni `only`, sin aserciones vacias.
 */

const CARD_RAPIDA = "Cliente rapido";

/**
 * El alta rapida usa la sede DEFAULT del token (DEC-031) y en el seed solo
 * el RECEPCIONISTA tiene sede (`prisma/seed.ts` y el fixture E2E, GAP-RED-01):
 * por eso estas pruebas operan con ese rol y no con el DUENO.
 */
const RECEPCIONISTA = { email: "recep@clubbeasts.com", password: "recep123" };

async function loginComoRecepcionista(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(RECEPCIONISTA.email);
  await page.getByLabel("Contrasena").fill(RECEPCIONISTA.password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/.*clientes/);
}

interface DatosAlta {
  cedula: string;
  nombres: string;
  apellidos: string;
  telefono: string;
}

async function abrirAltaRapida(page: Page): Promise<void> {
  await page.goto("/recepcion");
  await expect(page.getByRole("heading", { name: CARD_RAPIDA })).toBeVisible();
}

/** Tarjeta de alta + su unico formulario (el que envia el minimo de campos). */
function formularioAlta(page: Page) {
  const card = cardCon(page, CARD_RAPIDA);
  const form = card.locator("form").filter({
    has: page.getByRole("button", { name: "Crear cliente rapido" }),
  });
  return { card, form };
}

/** Llena el minimo de campos y envia el alta. */
async function altaRapidaUI(page: Page, datos: DatosAlta) {
  const { card, form } = formularioAlta(page);
  await card.getByLabel("Cedula rapida").fill(datos.cedula);
  await card.getByLabel("Nombres rapido").fill(datos.nombres);
  await card.getByLabel("Apellidos rapido").fill(datos.apellidos);
  await card.getByLabel("Telefono rapido").fill(datos.telefono);
  await form.getByRole("button", { name: "Crear cliente rapido" }).click();
  return card;
}

/** Busca por cedula exacta en el listado staff (`{ total, clientes }`). */
async function buscarPorCedula(
  request: APIRequestContext,
  token: string,
  cedula: string
): Promise<{ total: number; clientes: Array<{ id: string }> }> {
  const res = await request.get(`${API_URL}/clientes?search=${cedula}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.ok(), `GET /clientes devolvio ${res.status()}`).toBe(true);
  const cuerpo = (await res.json()) as {
    total: number;
    clientes: Array<{ id: string }>;
  };
  expect(Array.isArray(cuerpo.clientes)).toBe(true);
  return { total: cuerpo.total, clientes: cuerpo.clientes };
}

/** Ficha staff (`GET /clientes/:id`) con `perfilPendiente`/`creadoPorId`. */
async function fichaCliente(
  request: APIRequestContext,
  token: string,
  clienteId: string
): Promise<Record<string, unknown>> {
  const res = await request.get(`${API_URL}/clientes/${clienteId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.ok(), `GET /clientes/:id devolvio ${res.status()}`).toBe(true);
  return (await res.json()) as Record<string, unknown>;
}

/** Token staff + id del actor (para validar `creadoPorId`). */
async function staffActual(
  request: APIRequestContext
): Promise<{ token: string; userId: string }> {
  const res = await request.post(`${API_URL}/auth/login`, { data: RECEPCIONISTA });
  expect(res.ok(), `POST /auth/login devolvio ${res.status()}`).toBe(true);
  const cuerpo = (await res.json()) as { token: string; user: { id: string } };
  expect(typeof cuerpo.token).toBe("string");
  expect(typeof cuerpo.user?.id).toBe("string");
  return { token: cuerpo.token, userId: cuerpo.user.id };
}

test.describe("Recepción: alta rapida (INC03-RAP-*)", () => {
  test.beforeEach(async ({ page }) => {
    await loginComoRecepcionista(page);
  });

  test("el formulario exige solo 4 campos sin sede y crea el cliente con la sede default del token, estado Nuevo y perfil pendiente", async ({
    page,
    request,
  }) => {
    const { token, userId } = await staffActual(request);
    await abrirAltaRapida(page);

    // DEC-031: minimo de 4 campos y NINGUN selector de sede en el formulario.
    const { form } = formularioAlta(page);
    await expect(form).toHaveCount(1);
    await expect(form.locator("input")).toHaveCount(4);
    await expect(form.locator("select")).toHaveCount(0);

    const datos: DatosAlta = {
      cedula: cedulaUnica(),
      nombres: "Rapido",
      apellidos: "DePrueba",
      telefono: telefonoUnico(),
    };
    const card = await altaRapidaUI(page, datos);

    // RAP-06 + RAP-02: identidad, estado Nuevo y marca de perfil pendiente.
    await expect(card.getByText("Rapido DePrueba", { exact: true })).toBeVisible();
    await expect(card.getByText("Nuevo", { exact: true })).toBeVisible();
    await expect(card.getByText("Perfil pendiente", { exact: true })).toBeVisible();
    await expect(card.getByText(datos.cedula, { exact: true })).toBeVisible();
    await expect(card.getByText(datos.telefono, { exact: true })).toBeVisible();

    // DEC-031: la sede no la eligio el usuario; la asigno el backend.
    await expect(card.getByText("Sede: Sede Principal", { exact: true })).toBeVisible();
    await expect(card.getByText("Creado por", { exact: true })).toBeVisible();
    await expect(card.getByText("Maria Garcia", { exact: true })).toBeVisible();

    // RAP-01/02/06: exactamente una fila persistida con la marca y el actor.
    const { total, clientes } = await buscarPorCedula(request, token, datos.cedula);
    expect(total, "el alta debe crear exactamente un cliente").toBe(1);
    expect(clientes).toHaveLength(1);

    const ficha = await fichaCliente(request, token, clientes[0].id);
    expect(ficha.perfilPendiente, "la marca debe persistir en BD (DEC-032)").toBe(true);
    expect(ficha.estado).toBe("NUEVO");
    expect(ficha.sedeId).toBe("sede-1");
    expect(ficha.creadoPorId, "creadoPorId = actor del token (RAP-06)").toBe(userId);
  });

  test("completar el perfil con email limpia la marca de perfil pendiente en pantalla y en BD", async ({
    page,
    request,
  }) => {
    const { token } = await staffActual(request);
    await abrirAltaRapida(page);

    const datos: DatosAlta = {
      cedula: cedulaUnica(),
      nombres: "Perfil",
      apellidos: "Completo",
      telefono: telefonoUnico(),
    };
    const card = await altaRapidaUI(page, datos);
    await expect(card.getByText("Perfil pendiente", { exact: true })).toBeVisible();

    // DEC-033: el alta rapida trae el formulario de completitud.
    const email = `perfil.${datos.cedula}@clubbeasts.com`;
    await card.getByLabel("Email para completar perfil").fill(email);
    await card.getByRole("button", { name: "Completar perfil" }).click();

    // La marca desaparece y el formulario de completitud tambien.
    await expect(card.getByText("Perfil pendiente", { exact: true })).toHaveCount(0);
    await expect(card.getByRole("button", { name: "Completar perfil" })).toHaveCount(0);
    await expect(card.getByRole("alert")).toHaveCount(0);
    await expect(card.getByText("Perfil Completo", { exact: true })).toBeVisible();

    // Persistencia: PATCH con email -> perfilPendiente=false + email guardado.
    const { clientes } = await buscarPorCedula(request, token, datos.cedula);
    expect(clientes).toHaveLength(1);
    const ficha = await fichaCliente(request, token, clientes[0].id);
    expect(ficha.perfilPendiente, "DEC-033: el email limpia la marca").toBe(false);
    expect(ficha.email).toBe(email);
  });

  test("una cedula duplicada muestra 409 en role=alert y no crea una segunda fila", async ({
    page,
    request,
  }) => {
    const { token } = await staffActual(request);
    // Fixture: la cedula ya existe (creada por el flujo normal de clientes).
    const existente = await crearClienteApi(request, { sedeId: "sede-1" });
    await abrirAltaRapida(page);

    const card = await altaRapidaUI(page, {
      cedula: existente.cedula,
      nombres: "Duplicado",
      apellidos: "Invalido",
      telefono: telefonoUnico(),
    });

    // RAP-07: 409 visible y sin marca de exito.
    await expect(card.getByRole("alert")).toContainText("Ya existe un cliente con esa cédula");
    await expect(card.getByText("Perfil pendiente", { exact: true })).toHaveCount(0);
    await expect(card.getByText("Creado por", { exact: true })).toHaveCount(0);

    // Sin escritura: sigue habiendo exactamente un cliente con esa cedula.
    const { total, clientes } = await buscarPorCedula(
      request,
      token,
      existente.cedula
    );
    expect(total).toBe(1);
    expect(clientes).toHaveLength(1);
  });

  test("un telefono invalido muestra el 400 del backend y no escribe el cliente", async ({
    page,
    request,
  }) => {
    const { token } = await staffActual(request);
    await abrirAltaRapida(page);

    const cedula = cedulaUnica();
    const card = await altaRapidaUI(page, {
      cedula,
      nombres: "Validacion",
      apellidos: "Telefono",
      telefono: "123",
    });

    // RAP-04: mismo mensaje de HU-04 en role="alert", sin resultado.
    await expect(card.getByRole("alert")).toContainText(
      "Teléfono debe ser móvil colombiano (3XXXXXXXXX)"
    );
    await expect(card.getByText("Perfil pendiente", { exact: true })).toHaveCount(0);
    await expect(card.getByText("Creado por", { exact: true })).toHaveCount(0);

    const { total } = await buscarPorCedula(request, token, cedula);
    expect(total, "no debe quedar ninguna fila escrita").toBe(0);
  });
});
