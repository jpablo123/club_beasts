import { test, expect, type Page } from "@playwright/test";
import {
  API_URL,
  cardCon,
  cambiarEstadoCliente,
  cedulaUnica,
  crearClienteApi,
  crearVigenciaApi,
  hoyBogota,
  loginComoDueno,
  sumarDias,
  tokenApi,
} from "./e2e-helpers";

/**
 * INC-03 (HU-29 / HU-30) — E2E real de la pantalla de recepcion.
 *
 * Criterios cubiertos:
 *  - `INC03-REC-01..04`: la consulta por cedula pinta identidad, sede,
 *    estado de acceso real (CONF-04), fecha de vencimiento, congelacion y
 *    el ultimo ingreso (o "Sin ingresos registrados").
 *  - `INC03-REC-05` / `DEC-028`: alertas derivadas del estado
 *    (`ESTADO_CLIENTE` + `MEMBRESIA_VENCIDA`) visibles en la consulta.
 *  - `INC03-REC-06`, `INC03-REC-07`: rechazos visibles en `role="alert"`
 *    (cedula mal formada y cedula inexistente) con el mensaje del backend.
 *  - `INC03-REC-09`, `INC03-REC-10`, `DEC-029`: un unico objeto cliente y
 *    cero campos sensibles (`pin`/`email`/`telefono`/`observaciones`) en la
 *    respuesta; `foto` siempre `null` y sin `<img>` en la pantalla.
 *  - `INC03-REC-08`, `INC03-ING-09`, `INC03-RAP-05` / `DEC-001`: una sesion
 *    CLIENTE no alcanza `/recepcion` (middleware -> `/portal`) y las tres
 *    rutas de staff responden `403 AUTH_FORBIDDEN`.
 *  - `INC03-ING-01..03`, `INC03-ING-05`: registro de ingreso 201 (fecha
 *    America/Bogota, hora `HH:mm:ss`, sede y "Registrado por"), repetido el
 *    mismo dia sin dedupe (`CONF-03`) e historial.
 *  - `INC03-VEN-03`: el estado `VENCIDA` se pinta en la superficie de
 *    recepcion (nunca "Activo").
 *
 * Fixtures: SQLite temporal aislado por corrida (DEC-012) y fechas relativas
 * a `hoyBogota()` (America/Bogota, DEC-005/006); cedulas unicas por test,
 * sin dependencia del orden de ejecucion.
 *
 * Restricciones INC00-QA-01/02: sin `isVisible()` condicional, sin
 * `waitForTimeout`, sin skips ni `only`, sin aserciones vacias.
 */

const CARD_CONSULTA = "Consulta por cedula";
const CARD_INGRESO = "Registrar ingreso";

/** Cedula bien formada que NUNCA existe en la BD de la corrida. */
const CEDULA_INEXISTENTE = "9999999999";

async function abrirRecepcion(page: Page): Promise<void> {
  await page.goto("/recepcion");
  await expect(page.getByRole("heading", { name: "Recepcion" })).toBeVisible();
  await expect(page.getByRole("heading", { name: CARD_CONSULTA })).toBeVisible();
}

/** Consulta por cedula desde la tarjeta de recepcion. */
async function consultar(page: Page, cedula: string) {
  const card = cardCon(page, CARD_CONSULTA);
  await card.getByLabel("Cedula de consulta").fill(cedula);
  await card.getByRole("button", { name: "Consultar" }).click();
  return card;
}

test.describe("Recepción: consulta por cedula (INC03-REC-*)", () => {
  test.beforeEach(async ({ page }) => {
    await loginComoDueno(page);
  });

  test("flujo feliz: consulta con identidad, estado, vencimiento y ultimo ingreso tras registrar dos ingresos del dia", async ({
    page,
    request,
  }) => {
    const hoy = hoyBogota();
    const vence = sumarDias(hoy, 30);
    const cliente = await crearClienteApi(request, {
      sedeId: "sede-1",
      nombres: "Paula",
      apellidos: "Recepcion",
    });
    // Estado ACTIVO: la consulta de flujo feliz no debe mostrar alertas.
    await cambiarEstadoCliente(request, cliente.id, "ACTIVO");
    await crearVigenciaApi(request, cliente.id, sumarDias(hoy, -30), vence);

    await abrirRecepcion(page);
    const consulta = await consultar(page, cliente.cedula);

    // INC03-REC-01/02/03: identidad, sede, estado real y fecha de vencimiento.
    await expect(consulta.getByText("Paula Recepcion", { exact: true })).toBeVisible();
    await expect(consulta.getByText(cliente.cedula, { exact: true })).toBeVisible();
    await expect(consulta.getByText("Sede: Sede Principal", { exact: true })).toBeVisible();
    await expect(consulta.getByText("Activo", { exact: true })).toBeVisible();
    await expect(consulta.getByText(vence, { exact: true })).toBeVisible();

    // INC03-REC-04 (rama null) y DEC-029 (sin foto en la pantalla).
    await expect(consulta.getByText("Sin ingresos registrados", { exact: true })).toBeVisible();
    await expect(consulta.locator("img")).toHaveCount(0);
    // Sin alertas: estado ACTIVO y vigencia activa (DEC-028 -> []).
    await expect(consulta.getByText("Alertas", { exact: true })).toHaveCount(0);

    // INC03-ING-01/03: registrar ingreso -> 201 pintado con fecha/hora/sede.
    const ingreso = cardCon(page, CARD_INGRESO);
    await ingreso.getByLabel("Cedula de ingreso").fill(cliente.cedula);
    await ingreso.getByRole("button", { name: "Registrar ingreso" }).click();
    const exito = ingreso.getByRole("status");
    await expect(exito).toContainText("Ingreso registrado");
    await expect(exito).toContainText(hoy);
    await expect(exito).toContainText("Sede: Sede Principal");
    await expect(exito.getByText(/^\d{2}:\d{2}:\d{2}$/)).toBeVisible();

    // INC03-ING-02 / CONF-03: un segundo ingreso del mismo dia tambien es 201.
    await ingreso.getByRole("button", { name: "Registrar ingreso" }).click();
    await expect(ingreso.getByRole("status")).toContainText("Ingreso registrado");

    // INC03-ING-05: historial con las 2 filas y el actor registrado.
    await ingreso.getByRole("button", { name: "Ver historial" }).click();
    await expect(ingreso.getByText("Historial de ingresos (2)", { exact: true })).toBeVisible();
    await expect(ingreso.getByText("Registrado por: David Rozo", { exact: true })).toHaveCount(2);

    // INC03-REC-04: la re-consulta muestra el ultimo ingreso de hoy.
    await consulta.getByRole("button", { name: "Consultar" }).click();
    await expect(consulta.getByText("Ultimo ingreso", { exact: true })).toBeVisible();
    await expect(consulta.getByText(hoy, { exact: true })).toHaveCount(1);
    await expect(consulta.getByText(/^\d{2}:\d{2}:\d{2}$/)).toBeVisible();
    await expect(consulta.getByText("Sin ingresos registrados", { exact: true })).toHaveCount(0);
  });

  test("una cedula mal formada y una cedula inexistente se rechazan con su mensaje en role=alert", async ({
    page,
  }) => {
    await abrirRecepcion(page);

    // INC03-REC-06: 400 VALIDATION_ERROR visible en la tarjeta de consulta.
    const consultaInvalida = await consultar(page, "12345");
    await expect(consultaInvalida.getByRole("alert")).toContainText(
      "Cédula debe ser numérica de 6 a 10 dígitos"
    );
    await expect(consultaInvalida.getByText("Nombre completo", { exact: true })).toHaveCount(0);

    // INC03-REC-07: 404 NOT_FOUND visible, sin datos de cliente.
    const consultaInexistente = await consultar(page, CEDULA_INEXISTENTE);
    await expect(consultaInexistente.getByRole("alert")).toContainText("Cliente no encontrado");
    await expect(consultaInexistente.getByText("Nombre completo", { exact: true })).toHaveCount(0);
  });

  test("cliente con vigencia vencida muestra estado Vencido (nunca Activo) y las alertas derivadas del estado", async ({
    page,
    request,
  }) => {
    const hoy = hoyBogota();
    const fin = sumarDias(hoy, -10);
    // Estado NUEVO (alta por API) + vigencia vencida -> 2 alertas (DEC-028).
    const cliente = await crearClienteApi(request, { sedeId: "sede-1" });
    await crearVigenciaApi(request, cliente.id, sumarDias(hoy, -60), fin);

    await abrirRecepcion(page);
    const consulta = await consultar(page, cliente.cedula);

    // INC03-VEN-03 / INC03-REC-02: el estado real llega a recepcion.
    await expect(consulta.getByText("Vencido", { exact: true })).toBeVisible();
    await expect(consulta.getByText("Activo", { exact: true })).toHaveCount(0);
    await expect(consulta.getByText(fin, { exact: true })).toBeVisible();

    // INC03-REC-05 / DEC-028: alertas derivadas, en orden deterministico.
    const alertas = consulta.getByLabel("Alertas del cliente");
    await expect(alertas).toBeVisible();
    await expect(alertas.getByText("El cliente tiene estado NUEVO", { exact: true })).toBeVisible();
    await expect(alertas.getByText(`La membresía venció el ${fin}`, { exact: true })).toBeVisible();
  });

  test("la respuesta de la consulta expone un unico objeto cliente y ningun campo sensible", async ({
    page,
    request,
  }) => {
    const cliente = await crearClienteApi(request, { sedeId: "sede-1" });
    const token = await tokenApi(request);

    // Datos sensibles persistidos que NO deben salir en la consulta.
    const correo = `secreto.${cliente.cedula}@clubbeasts.com`;
    const telefonoFijo = "3009998877";
    const patch = await request.patch(`${API_URL}/clientes/${cliente.id}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        email: correo,
        telefono: telefonoFijo,
        observaciones: "Nota de salud sensible",
      },
    });
    expect(patch.ok(), `PATCH /clientes/:id devolvio ${patch.status()}`).toBe(true);

    const res = await request.get(
      `${API_URL}/recepcion/consulta?cedula=${cliente.cedula}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    expect(res.status(), "GET /recepcion/consulta con token staff").toBe(200);
    const cuerpo = (await res.json()) as Record<string, unknown>;

    // INC03-REC-09: un unico objeto cliente (nunca array).
    expect(Array.isArray(cuerpo), "la respuesta debe ser un objeto, no un array").toBe(false);
    expect(cuerpo.id).toBe(cliente.id);
    expect(cuerpo.cedula).toBe(cliente.cedula);

    // INC03-REC-01 / DEC-029: `foto` presente y siempre null.
    expect(Object.prototype.hasOwnProperty.call(cuerpo, "foto")).toBe(true);
    expect(cuerpo.foto).toBeNull();

    // INC03-REC-10: cero campos sensibles en la respuesta.
    for (const campo of ["pin", "email", "telefono", "observaciones", "debeCambiarPin"]) {
      expect(
        Object.prototype.hasOwnProperty.call(cuerpo, campo),
        `la respuesta no debe exponer "${campo}"`
      ).toBe(false);
    }

    // Y la pantalla tampoco los pinta.
    await abrirRecepcion(page);
    const consulta = await consultar(page, cliente.cedula);
    await expect(consulta.getByText(correo)).toHaveCount(0);
    await expect(consulta.getByText(telefonoFijo)).toHaveCount(0);
    await expect(consulta.getByText("Nota de salud sensible")).toHaveCount(0);
  });
});

test.describe("Recepción: permisos DEC-001 (REC-08 / ING-09 / RAP-05)", () => {
  test("una sesion CLIENTE no entra a /recepcion y las tres rutas de staff responden 403 AUTH_FORBIDDEN", async ({
    page,
    request,
  }) => {
    // ── UI: el middleware redirige al portal y no se pinta ninguna
    //    herramienta de recepcion (defensa en profundidad).
    await page.goto("/login-cliente");
    await page.getByPlaceholder("Ingresa tu cedula").fill("1234567890");
    await page.getByPlaceholder("****").fill("1234");
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page).toHaveURL(/.*portal/);

    await page.goto("/recepcion");
    await expect(page).toHaveURL(/.*portal/);
    await expect(page.getByRole("heading", { name: "Mi Portal" })).toBeVisible();
    await expect(page.getByLabel("Cedula de consulta")).toHaveCount(0);
    await expect(page.getByLabel("Cedula de ingreso")).toHaveCount(0);
    await expect(page.getByLabel("Cedula rapida")).toHaveCount(0);

    // ── Backend: la misma sesion CLIENTE recibe 403 en las 3 rutas.
    const login = await request.post(`${API_URL}/auth/login-cliente`, {
      data: { cedula: "1234567890", pin: "1234" },
    });
    expect(login.ok(), `POST /auth/login-cliente devolvio ${login.status()}`).toBe(true);
    const { token } = (await login.json()) as { token: string };
    const auth = { Authorization: `Bearer ${token}` };

    const consulta = await request.get(
      `${API_URL}/recepcion/consulta?cedula=1234567890`,
      { headers: auth }
    );
    expect(consulta.status()).toBe(403);
    expect(((await consulta.json()) as { code?: string }).code).toBe("AUTH_FORBIDDEN");

    const ingreso = await request.post(`${API_URL}/recepcion/ingresos`, {
      headers: auth,
      data: { cedula: "1234567890", sedeId: "sede-1" },
    });
    expect(ingreso.status()).toBe(403);
    expect(((await ingreso.json()) as { code?: string }).code).toBe("AUTH_FORBIDDEN");

    const rapida = await request.post(`${API_URL}/recepcion/clientes-rapidos`, {
      headers: auth,
      data: {
        cedula: cedulaUnica(),
        nombres: "Sin",
        apellidos: "Permiso",
        telefono: "3001112223",
      },
    });
    expect(rapida.status()).toBe(403);
    expect(((await rapida.json()) as { code?: string }).code).toBe("AUTH_FORBIDDEN");

    // Y sin token la ruta exige autenticacion (REC-08 / ING-09 / RAP-05).
    const sinToken = await request.get(
      `${API_URL}/recepcion/consulta?cedula=1234567890`
    );
    expect(sinToken.status()).toBe(401);
    expect(((await sinToken.json()) as { code?: string }).code).toBe("AUTH_TOKEN_MISSING");
  });
});
