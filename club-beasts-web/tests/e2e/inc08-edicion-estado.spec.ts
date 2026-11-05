import { test, expect, type APIRequestContext, type Locator, type Page } from "@playwright/test";
import {
  API_URL,
  cambiarEstadoCliente,
  cedulaUnica,
  loginComoDueno,
  tokenApi,
  type ClienteFixture,
} from "./e2e-helpers";

/**
 * INC-08 (RED) — Edicion staff: `estado` SOLO cuando el usuario lo cambio
 * (DEC-054). Criterios: `INC08-ED-01`, `INC08-ED-02`; matriz filas 8-9.
 *
 * DEC-054 (el contrato de API NO cambia): la UI envia `estado` en el PATCH
 * unicamente si el valor seleccionado difiere del persistido. Consecuencias
 * observables que fija este RED:
 *  - fila 8 (`INC08-ED-01`): editar un campo suelto (telefono) SIN tocar
 *    `estado` guarda con **200 sin `motivo`** y el PATCH NO incluye las
 *    claves `estado` ni `motivo` (hoy la UI siempre manda `estado` y el
 *    backend responde 400 "Motivo es requerido cuando cambia el estado").
 *    Un `motivo` escrito "viajero" sin cambio de estado tampoco viaja
 *    (CONF-07) y no crea filas de historial.
 *  - fila 9 (`INC08-ED-02`): cuando el usuario SI cambia `estado`, el
 *    `motivo` sigue obligatorio (DEC-035 intacta: 400 sin el, sin escritura
 *    ni fila de historial) y con motivo el cambio persiste con su
 *    `ClienteEstadoCambio` observable en la ficha.
 *
 * El payload se intercepta del PATCH real del navegador (asercion del
 * request, no solo del resultado) — mismo espiritu que `INC08-ED-03` en unit.
 *
 * Aplicabilidad de roles (fila 8-9: "DUENO / RECEPCIONISTA"): cada viaje
 * ejecuta con un rol staff; el contrato de payload es identico para ambos y
 * el unit `inc08-edicion-estado.test.tsx` fija el contrato sin rol.
 *
 * Localizadores endurecidos (C4): `getByDisplayValue` para el telefono (el
 * input del telefono no tiene label asociado en la ficha), `getByLabel` para
 * Estado/Motivo, `toHaveCount(0)` para el cierre del modo edicion y alertas
 * acotadas a `<main>` (mismo patron que `inc04-estados-cliente.spec.ts`).
 *
 * FASE RED (2026-10-30): la UI hoy codifica el pre-DEC-054 (siempre envia
 * `estado`), asi que los viajes de fila 8 y el viaje "campo suelto con motivo
 * relleno" fallan por el comportamiento ausente (payload con `estado` y/o
 * guardado 400). Los viajes de fila 9 (400 sin motivo / 200 con motivo) son
 * regresion DEC-035 con DEC-054 aplicada: hoy verdes [PIN] y deben seguirlo.
 *
 * Fixtures (DEC-012/DEC-013): SQLite temporal aislado por corrida; clientes
 * con cedula unica y telefono conocido (unico por test) creados via API staff;
 * historial previo via `cambiarEstadoCliente` (motivo obligatorio, DEC-035).
 *
 * PIN obligatorio intacto: ningun paso relaja `debeCambiarPin` ni la
 * autenticacion para facilitar los guardados.
 *
 * Restricciones INC00-QA-01/02: sin `isVisible()` condicional, sin
 * `waitForTimeout`, skips ni `only`, sin aserciones vacias; un paso
 * obligatorio ausente falla la prueba.
 */

const RECEPCIONISTA = { email: "recep@clubbeasts.com", password: "recep123" };

const MOTIVO_PREVIO = "Activacion inicial autorizada por recepcion";
const MOTIVO_INC08 = "Cambio de estado verificado en INC-08";
const MOTIVO_VIAJERO = "Motivo viajero sin estado";

/** Literal del contrato G14 que el backend responde sin motivo (DEC-035). */
const MOTIVO_REQUERIDO = "Motivo es requerido cuando cambia el estado";

/** Login de recepcionista por la UI (seed determinista); aterriza en /clientes. */
async function loginComoRecepcionista(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(RECEPCIONISTA.email);
  await page.getByLabel("Contrasena").fill(RECEPCIONISTA.password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/.*clientes/);
}

async function abrirFicha(page: Page, clienteId: string): Promise<void> {
  await page.goto(`/clientes/${clienteId}`);
  await expect(page.getByRole("heading", { name: "Ficha del Cliente" })).toBeVisible();
}

/** Badge del estado actual (`span.rounded-tag` de la ficha). */
function badgeEstado(page: Page) {
  return page.locator("span.rounded-tag");
}

/**
 * Input de telefono de la ficha en modo edicion. El input no tiene label
 * asociado (el `<label>Telefono</label>` del marcado comparte wrapper con el
 * input pero sin `htmlFor`/`id`), asi que se localiza por su estructura
 * (label exacto -> wrapper -> textbox), sin depender de clases, posicion ni
 * atributos de valor.
 */
function campoTelefono(page: Page): Locator {
  return page
    .getByText("Telefono", { exact: true })
    .locator("xpath=..")
    .getByRole("textbox");
}

/** `role="alert"` acotado a `<main>` (patron de `inc04-estados-cliente.spec.ts`). */
function alertaDePantalla(page: Page) {
  return page.locator("main").getByRole("alert");
}

/** Ficha del cliente por la API staff (estado + `motivo` del ultimo cambio). */
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

/**
 * Cliente con telefono conocido y unico por test (el input de telefono de la
 * ficha no tiene label asociado: se localiza por su valor mostrado).
 */
async function crearClienteConTelefono(
  request: APIRequestContext,
  telefono: string
): Promise<ClienteFixture> {
  const token = await tokenApi(request);
  const cedula = cedulaUnica();
  const res = await request.post(`${API_URL}/clientes`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      cedula,
      nombres: "Cliente",
      apellidos: "Edicion",
      telefono,
      sedeId: "sede-1",
    },
  });
  expect(res.ok(), `POST /clientes devolvio ${res.status()}: ${await res.text()}`).toBe(
    true
  );
  const body = (await res.json()) as { id: string };
  expect(typeof body.id).toBe("string");
  return { id: body.id, cedula };
}

/**
 * Guarda de la ficha capturando el PATCH real del navegador: payload enviado
 * (asercion del request) y status de la respuesta. El PATCH va a la API real
 * (`/clientes/:id`, sin sub-rutas).
 */
async function guardarYCapturarPatch(
  page: Page,
  clienteId: string
): Promise<{ payload: Record<string, unknown>; status: number }> {
  const esElPatch = (url: string): boolean => {
    try {
      return new URL(url).pathname === `/clientes/${clienteId}`;
    } catch {
      return false;
    }
  };
  const esperaRequest = page.waitForRequest(
    (req) => req.method() === "PATCH" && esElPatch(req.url())
  );
  const esperaResponse = page.waitForResponse(
    (res) => res.request().method() === "PATCH" && esElPatch(res.url())
  );

  await page.getByRole("button", { name: "Guardar" }).click();

  const [req, res] = await Promise.all([esperaRequest, esperaResponse]);
  return {
    payload: (req.postDataJSON() ?? {}) as Record<string, unknown>,
    status: res.status(),
  };
}

/** Modo lectura tras un guardado exitoso, sin alertas. */
async function expectModoLectura(page: Page): Promise<void> {
  await expect(page.getByRole("button", { name: "Guardar" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Editar" })).toBeVisible();
  await expect(alertaDePantalla(page)).toHaveCount(0);
}

// ─── Fila 8 (INC08-ED-01): campo suelto -> 200 sin motivo, payload sin estado

test.describe("INC08-ED-01 editar un campo suelto guarda 200 sin motivo (fila 8)", () => {
  test("DUENO: editar telefono sin tocar estado guarda 200 y el PATCH no incluye `estado` ni `motivo`", async ({
    page,
    request,
  }) => {
    const cliente = await crearClienteConTelefono(request, "3005550001");

    await loginComoDueno(page);
    await abrirFicha(page, cliente.id);

    await page.getByRole("button", { name: "Editar" }).click();
    await campoTelefono(page).fill("3005551001");

    const { payload, status } = await guardarYCapturarPatch(page, cliente.id);

    // DEC-054: el campo suelto NO manda `estado` ni exige `motivo`.
    expect(Object.prototype.hasOwnProperty.call(payload, "estado")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(payload, "motivo")).toBe(false);
    expect(payload.telefono).toBe("3005551001");
    expect(status, "el guardado del campo suelto debe responder 200").toBe(200);

    await expectModoLectura(page);
    await expect(page.getByText("3005551001", { exact: true })).toBeVisible();

    // Historial intacto: sin cambio de estado no hay fila ni motivo nuevo.
    const ficha = await fichaApi(request, cliente.id);
    expect(ficha.estado).toBe("NUEVO");
    expect(ficha.motivo, "no debe existir un ultimo cambio").toBeNull();
  });

  test("RECEPCIONISTA: editar telefono sin tocar estado guarda 200 y el PATCH no incluye `estado` ni `motivo`", async ({
    page,
    request,
  }) => {
    const cliente = await crearClienteConTelefono(request, "3005550002");

    await loginComoRecepcionista(page);
    await abrirFicha(page, cliente.id);

    await page.getByRole("button", { name: "Editar" }).click();
    await campoTelefono(page).fill("3005551002");

    const { payload, status } = await guardarYCapturarPatch(page, cliente.id);

    expect(Object.prototype.hasOwnProperty.call(payload, "estado")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(payload, "motivo")).toBe(false);
    expect(status, "el guardado del campo suelto debe responder 200").toBe(200);

    await expectModoLectura(page);
    await expect(page.getByText("3005551002", { exact: true })).toBeVisible();
  });

  test("DUENO: un motivo escrito sin cambio de estado no viaja en el PATCH ni crea historial (CONF-07 / DEC-054)", async ({
    page,
    request,
  }) => {
    const cliente = await crearClienteConTelefono(request, "3005550003");

    await loginComoDueno(page);
    await abrirFicha(page, cliente.id);

    await page.getByRole("button", { name: "Editar" }).click();
    await campoTelefono(page).fill("3005551003");
    await page.getByLabel("Motivo").fill(MOTIVO_VIAJERO);

    const { payload, status } = await guardarYCapturarPatch(page, cliente.id);

    // El motivo viajero sin cambio de estado no viaja (CONF-07).
    expect(Object.prototype.hasOwnProperty.call(payload, "estado")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(payload, "motivo")).toBe(false);
    expect(status, "el guardado debe responder 200 sin exigir motivo").toBe(200);

    await expectModoLectura(page);

    // Historial intacto: ni fila de historial ni motivo viajero persistido.
    const ficha = await fichaApi(request, cliente.id);
    expect(ficha.estado).toBe("NUEVO");
    expect(ficha.motivo, "no debe existir un ultimo cambio").toBeNull();
  });
});

// ─── Fila 9 (INC08-ED-02): cambio de estado -> motivo obligatorio ───────────

test.describe("INC08-ED-02 cambio de estado exige motivo; historial intacto (fila 9)", () => {
  test("[PIN] RECEPCIONISTA: cambiar estado sin motivo muestra el 400 y no escribe historial (DEC-035 intacta)", async ({
    page,
    request,
  }) => {
    const cliente = await crearClienteConTelefono(request, "3005550004");

    await loginComoRecepcionista(page);
    await abrirFicha(page, cliente.id);

    await page.getByRole("button", { name: "Editar" }).click();
    await page.getByLabel("Estado").selectOption("ACTIVO");
    await page.getByLabel("Motivo").fill("");
    await page.getByRole("button", { name: "Guardar" }).click();

    // DEC-035 intacta tras DEC-054: 400 del backend en role=alert.
    await expect(alertaDePantalla(page)).toContainText(MOTIVO_REQUERIDO);
    await expect(page.getByRole("button", { name: "Guardar" })).toBeVisible();

    // Sin escritura: estado intacto y sin fila de historial.
    const ficha = await fichaApi(request, cliente.id);
    expect(ficha.estado, "el estado no debe cambiar sin motivo").toBe("NUEVO");
    expect(ficha.motivo, "no debe existir un ultimo cambio").toBeNull();
    await expect(badgeEstado(page)).toHaveText("NUEVO");
  });

  test("[PIN] DUENO: cambiar estado con motivo guarda 200, actualiza el badge y deja el ultimo cambio observable", async ({
    page,
    request,
  }) => {
    const cliente = await crearClienteConTelefono(request, "3005550005");

    await loginComoDueno(page);
    await abrirFicha(page, cliente.id);

    await page.getByRole("button", { name: "Editar" }).click();
    await page.getByLabel("Estado").selectOption("ACTIVO");
    await page.getByLabel("Motivo").fill(MOTIVO_INC08);

    const { payload, status } = await guardarYCapturarPatch(page, cliente.id);

    // El cambio real de estado SI viaja con su motivo.
    expect(payload.estado).toBe("ACTIVO");
    expect(payload.motivo).toBe(MOTIVO_INC08);
    expect(status).toBe(200);

    await expectModoLectura(page);
    await expect(badgeEstado(page)).toHaveText("ACTIVO");

    // Historial intacto: el ultimo cambio queda observable en la ficha.
    const ficha = await fichaApi(request, cliente.id);
    expect(ficha.estado).toBe("ACTIVO");
    expect(ficha.motivo).toBe(MOTIVO_INC08);
  });

  test("DUENO: editar un campo suelto con motivo relleno no crea historial ni altera el ultimo cambio", async ({
    page,
    request,
  }) => {
    const cliente = await crearClienteConTelefono(request, "3005550006");
    // Historial previo: un cambio de estado real con su motivo (DEC-035).
    await cambiarEstadoCliente(request, cliente.id, "ACTIVO", MOTIVO_PREVIO);

    await loginComoDueno(page);
    await abrirFicha(page, cliente.id);

    await page.getByRole("button", { name: "Editar" }).click();
    await campoTelefono(page).fill("3005551006");
    await page.getByLabel("Motivo").fill(MOTIVO_VIAJERO);

    const { payload, status } = await guardarYCapturarPatch(page, cliente.id);

    // DEC-054: sin cambio de estado el PATCH no lleva `estado` ni `motivo`.
    expect(Object.prototype.hasOwnProperty.call(payload, "estado")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(payload, "motivo")).toBe(false);
    expect(status, "el guardado del campo suelto debe responder 200").toBe(200);

    await expectModoLectura(page);

    // Historial intacto: el ultimo cambio sigue siendo el previo.
    const ficha = await fichaApi(request, cliente.id);
    expect(ficha.estado).toBe("ACTIVO");
    expect(ficha.motivo).toBe(MOTIVO_PREVIO);
    await expect(badgeEstado(page)).toHaveText("ACTIVO");
  });
});

// ─── H-INC08-01 (INC-08 auditoria): recorrido "Cancelar" de la edicion ───────

/**
 * H-INC08-01 (cierre del vacio de cobertura de la auditoria de navegacion de
 * INC-08): el recorrido obligatorio "cancelar" de la puerta ACEPTADO — el
 * control "Cancelar" de la edicion de ficha (`clientes/[id]/page.tsx:182-187`)
 * descarta el form y vuelve a modo lectura. Viajes DUENO y RECEPCIONISTA
 * (roles con `canEdit` en la ficha):
 *  - entra a modo edicion y deja el form SUCIO (telefono, estado y motivo),
 *  - pulsa "Cancelar" -> modo lectura con los valores originales intactos y
 *    los valores descartados ausentes,
 *  - SIN PATCH emitido (interceptado a nivel de red del navegador),
 *  - historial sin filas nuevas: el ultimo cambio previo queda intacto.
 *
 * El comportamiento YA existe en producto (INC-08 GREEN): este viaje solo
 * aporta la evidencia ejecutada que faltaba; si falla es hallazgo de producto
 * y se reporta, no se arregla aqui.
 *
 * Localizadores endurecidos (C4): "Cancelar"/"Editar" por `getByRole` con
 * `exact: true` y conteo unico; telefono por valor mostrado (`getByText`
 * exacto) en lectura y por la estructura label->textbox en edicion (el input
 * no tiene label asociado, ver `campoTelefono`).
 *
 * PIN obligatorio intacto: ningun paso relaja `debeCambiarPin` ni la
 * autenticacion. Restricciones INC00-QA-01/02: sin `isVisible()` condicional,
 * sin `waitForTimeout`, skips ni `only`, sin aserciones vacias.
 */

const MOTIVO_DESCARTADO = "Motivo descartado por el recorrido Cancelar";

/**
 * Interceptacion de red: registra todo PATCH que emita el navegador durante
 * el recorrido (la ausencia de PATCH es la asercion; un guardado silencioso
 * de "Cancelar" quedaria capturado aqui).
 */
function capturarPatches(page: Page): string[] {
  const patches: string[] = [];
  page.on("request", (req) => {
    if (req.method() === "PATCH") patches.push(req.url());
  });
  return patches;
}

/** Ficha via API con los campos observados por el recorrido "Cancelar". */
async function fichaEdicionApi(
  request: APIRequestContext,
  clienteId: string
): Promise<{ estado: string; motivo: string | null; telefono: string }> {
  const token = await tokenApi(request);
  const res = await request.get(`${API_URL}/clientes/${clienteId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.ok(), `GET /clientes/${clienteId} devolvio ${res.status()}`).toBe(true);
  return (await res.json()) as { estado: string; motivo: string | null; telefono: string };
}

/**
 * Viaje completo "Cancelar" para un rol staff: fixture con historial previo
 * (fila ancla de `ClienteEstadoCambio`), edicion sucia, descarte y verificacion
 * de UI + red + datos.
 */
async function viajeCancelarEdicion(
  page: Page,
  request: APIRequestContext,
  login: (page: Page) => Promise<void>,
  telefonoOriginal: string,
  telefonoDescartado: string
): Promise<void> {
  const cliente = await crearClienteConTelefono(request, telefonoOriginal);
  // Fila ancla de historial (DEC-035): el ultimo cambio previo debe quedar
  // intacto tras "Cancelar" (una fila nueva lo cambiaria).
  await cambiarEstadoCliente(request, cliente.id, "ACTIVO", MOTIVO_PREVIO);

  await login(page);
  await abrirFicha(page, cliente.id);

  // Estado inicial observable en modo lectura.
  await expect(page.getByText(telefonoOriginal, { exact: true })).toBeVisible();
  await expect(badgeEstado(page)).toHaveText("ACTIVO");

  // Interceptacion de red desde antes de editar: el recorrido entero no debe
  // emitir NINGUN PATCH.
  const patches = capturarPatches(page);

  await page.getByRole("button", { name: "Editar", exact: true }).click();

  // Form sucio: telefono, estado y motivo modificados (valores que deben
  // descartarse por completo).
  await campoTelefono(page).fill(telefonoDescartado);
  await page.getByLabel("Estado").selectOption("SUSPENDIDO");
  await page.getByLabel("Motivo").fill(MOTIVO_DESCARTADO);
  await expect(campoTelefono(page)).toHaveValue(telefonoDescartado);

  const cancelar = page.getByRole("button", { name: "Cancelar", exact: true });
  await expect(cancelar).toHaveCount(1);
  await cancelar.click();

  // Modo lectura: sin Guardar/Cancelar y con "Editar" disponible.
  await expectModoLectura(page);
  await expect(page.getByRole("button", { name: "Cancelar", exact: true })).toHaveCount(0);

  // Valores originales intactos; los descartados no aparecen.
  await expect(page.getByText(telefonoOriginal, { exact: true })).toBeVisible();
  await expect(page.getByText(telefonoDescartado, { exact: true })).toHaveCount(0);
  await expect(badgeEstado(page)).toHaveText("ACTIVO");
  await expect(page.getByLabel("Estado")).toHaveCount(0);
  await expect(page.getByLabel("Motivo")).toHaveCount(0);

  // Sin PATCH emitido (asercion de red).
  expect(patches, "'Cancelar' no debe emitir ningun PATCH").toHaveLength(0);

  // Historial sin filas nuevas: el ultimo cambio previo sigue siendo el mismo.
  const ficha = await fichaEdicionApi(request, cliente.id);
  expect(ficha.telefono, "el telefono persistido no debe cambiar").toBe(telefonoOriginal);
  expect(ficha.estado, "el estado persistido no debe cambiar").toBe("ACTIVO");
  expect(ficha.motivo, "no debe crearse una fila nueva de historial").toBe(MOTIVO_PREVIO);
}

test.describe("H-INC08-01 'Cancelar' de la edicion de ficha descarta el form (INC08-ED-01/ED-02)", () => {
  test("DUENO: 'Cancelar' vuelve a modo lectura con valores originales, sin PATCH ni historial nuevo", async ({
    page,
    request,
  }) => {
    await viajeCancelarEdicion(
      page,
      request,
      loginComoDueno,
      "3005550201",
      "3005551201"
    );
  });

  test("RECEPCIONISTA: 'Cancelar' vuelve a modo lectura con valores originales, sin PATCH ni historial nuevo", async ({
    page,
    request,
  }) => {
    await viajeCancelarEdicion(
      page,
      request,
      loginComoRecepcionista,
      "3005550202",
      "3005551202"
    );
  });
});
