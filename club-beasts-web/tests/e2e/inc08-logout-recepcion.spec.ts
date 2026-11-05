import { test, expect, type APIRequestContext, type Locator, type Page } from "@playwright/test";
import {
  cardCon,
  cedulaUnica,
  cambiarEstadoCliente,
  crearClienteApi,
  crearClientePortalApi,
  crearVigenciaApi,
  hoyBogota,
  loginComoClienteCon,
  loginComoDueno,
  sumarDias,
  telefonoUnico,
} from "./e2e-helpers";

/**
 * INC-08 (RED) — Logout propio de `/recepcion` (DEC-053).
 * Criterios: `INC08-NAV-01..06`; matriz de navegacion filas 1-7.
 *
 * DEC-053: el control "Salir" vive en la pantalla `/recepcion` (barra/header
 * propio) y usa exactamente el patron del Navbar:
 * `signOut({ callbackUrl: "/" })` -> aterriza en la landing `/` con la sesion
 * cerrada. El nuevo control NO rompe los selectores base:
 * `nav a[href="/"]` de `cambio-pin-obligatorio.spec.ts:58` sigue intacto (el
 * control es un <button>, no un link del Navbar).
 *
 * Filas cubiertas (roles DUENO y RECEPCIONISTA salvo justificacion):
 *  - fila 1 (NAV-01): URL directa con sesion staff viva -> pantalla accesible
 *    con "Salir" visible (una sola vez).
 *  - fila 2 (NAV-02): clic "Salir" -> `/` (landing) con sesion cerrada y
 *    `/recepcion` ya no accesible (guarda -> /login).
 *  - fila 3 (NAV-03): teclado — Tab hasta "Salir" (foco visible) y activacion
 *    con Enter (ambos roles) y Space (DUENO).
 *  - fila 4 (NAV-04): URL directa y recarga persisten pantalla + control.
 *  - fila 5 (NAV-04): atras del navegador tras "Salir" no reabre la sesion
 *    (guarda existente -> /login).
 *  - fila 6 (NAV-05): "Salir" visible sin overflow horizontal en movil 375px
 *    y escritorio 1280px.
 *  - fila 7 (NAV-06): regresion — consulta por cedula, registro de ingreso y
 *    creacion rapida intactos con el control presente. Aplicabilidad: la
 *    creacion rapida solo aplica para RECEPCIONISTA (el DUENO del seed no
 *    tiene sede: INC-03 #5, el alta rapida responderia 400 "sedeId es
 *    requerido"); con DUENO se ejecutan consulta e ingreso.
 *
 * Localizadores endurecidos (patron C4 de INC-07): `exact: true`, conteo
 * `toHaveCount(1)`, nombres exactos por role; el viaje de teclado arranca con
 * Tab desde el inicio del documento (recorrido real de usuario).
 *
 * FASE RED (2026-10-30): el control "Salir" aun no existe en
 * `src/app/recepcion/page` (hoy `showAuth={false}` oculta el logout del
 * Navbar), asi que las aserciones del control fallan con
 * `toHaveCount(1)` recibiendo 0. La guarda sin sesion (sub-casos de NAV-02/04)
 * es comportamiento SIN CAMBIO y hoy esta verde.
 *
 * Fixtures (DEC-012/DEC-013): SQLite temporal aislado por corrida, cedulas y
 * telefonos unicos por test (`cedulaUnica`/`telefonoUnico`); staff seed
 * determinista de `start-api-e2e.mjs`.
 *
 * ENMIENDA INC08-FIX-01 (2026-10-30): los viajes fila 7 registraban ingreso
 * sobre un cliente NUEVO sin vigencia, lo que la regla HU-30 / DEC-030 /
 * INC-06 rechaza con 403 INGRESO_NO_PERMITIDO (backend correcto, fixture
 * defectuoso). Correccion de fixture en los dos viajes fila 7: estado ACTIVO
 * + vigencia que cubre hoy (patron de `recepcion.spec.ts:75-84`). Las
 * aserciones originales de la matriz fila 7 (flujos consulta/ingreso/creacion
 * intactos con el control presente) quedan sin cambios.
 *
 * PIN obligatorio intacto: ningun paso relaja `debeCambiarPin` ni la
 * autenticacion; el logout no toca guards.
 *
 * Restricciones INC00-QA-01/02: sin `isVisible()` condicional, sin
 * `waitForTimeout`, skips ni `only`, sin aserciones vacias; un paso
 * obligatorio ausente falla la prueba.
 */

const RECEPCIONISTA = { email: "recep@clubbeasts.com", password: "recep123" };

const CARD_CONSULTA = "Consulta por cedula";
const CARD_INGRESO = "Registrar ingreso";
const CARD_RAPIDA = "Cliente rapido";

const VIEWPORTS = [
  { nombre: "movil", width: 375, height: 812 },
  { nombre: "escritorio", width: 1280, height: 800 },
] as const;

/** Login de recepcionista por la UI (seed determinista); aterriza en /clientes. */
async function loginComoRecepcionista(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(RECEPCIONISTA.email);
  await page.getByLabel("Contrasena").fill(RECEPCIONISTA.password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/.*clientes/);
}

/** Localizador endurecido (C4): role button con nombre exacto "Salir". */
function salirControl(page: Page): Locator {
  return page.getByRole("button", { name: "Salir", exact: true });
}

/** Pantalla de recepcion staff completa con el control "Salir" unico y visible. */
async function expectRecepcionConSalir(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/recepcion\/?$/);
  await expect(page.getByRole("heading", { name: "Recepcion" })).toBeVisible();
  await expect(page.getByRole("heading", { name: CARD_CONSULTA })).toBeVisible();
  const salir = salirControl(page);
  await expect(salir).toHaveCount(1);
  await expect(salir).toBeVisible();
}

/** Landing `/` anonima: hero + CTAs de login (demuestra sesion cerrada). */
async function expectLandingAnonima(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("heading", { name: "Alto Rendimiento" })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Iniciar sesion", exact: true })
  ).toBeVisible();
}

/** Guarda de sesion existente: sin login no hay recepcion, solo /login. */
async function expectGuardaAlogin(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/login\/?$/);
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Cedula de consulta")).toHaveCount(0);
  await expect(salirControl(page)).toHaveCount(0);
}

/**
 * Recorrido de teclado real: Tab sucesivos desde el inicio del documento
 * (foco en body al cargar) hasta que el control queda enfocado; falla si no
 * se alcanza. Tras Tab de teclado el navegador marca `:focus-visible`
 * (indicador de foco para teclado/lectores).
 */
async function tabHastaSalir(page: Page, salir: Locator, maxTabs = 30): Promise<void> {
  for (let i = 0; i < maxTabs; i++) {
    await page.keyboard.press("Tab");
    const enfocado = await salir
      .evaluate((el) => el === document.activeElement)
      .catch(() => false);
    if (enfocado) break;
  }
  await expect(salir).toBeFocused();
  expect(
    await salir.evaluate((el) => el.matches(":focus-visible")),
    "el foco de teclado debe ser visible (:focus-visible)"
  ).toBe(true);
}

/** Sin scroll horizontal (fila 6 de la matriz). */
async function expectSinOverflowHorizontal(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

// ─── Fila 1 (INC08-NAV-01): URL directa con sesion staff viva ───────────────

test.describe("INC08-NAV-01 'Salir' visible en /recepcion con sesion staff (fila 1)", () => {
  test("URL directa /recepcion con sesion DUENO: pantalla accesible con 'Salir' visible", async ({
    page,
  }) => {
    await loginComoDueno(page);
    await page.goto("/recepcion");
    await expectRecepcionConSalir(page);
  });

  test("URL directa /recepcion con sesion RECEPCIONISTA: pantalla accesible con 'Salir' visible", async ({
    page,
  }) => {
    await loginComoRecepcionista(page);
    await page.goto("/recepcion");
    await expectRecepcionConSalir(page);
  });

  test("sin sesion /recepcion redirige a /login (guarda existente, sin cambios)", async ({
    page,
  }) => {
    await page.goto("/recepcion");
    await expectGuardaAlogin(page);
  });
});

// ─── Fila 2 (INC08-NAV-02): clic "Salir" -> "/" con sesion cerrada ──────────

test.describe("INC08-NAV-02 'Salir' cierra la sesion hacia / (fila 2)", () => {
  test("'Salir' (DUENO) aterriza en la landing / y /recepcion deja de ser accesible", async ({
    page,
  }) => {
    await loginComoDueno(page);
    await page.goto("/recepcion");
    await expectRecepcionConSalir(page);

    await salirControl(page).click();

    await expectLandingAnonima(page);
    // Sesion cerrada: la guarda existente manda a /login (sin bypass).
    await page.goto("/recepcion");
    await expectGuardaAlogin(page);
  });

  test("'Salir' (RECEPCIONISTA) aterriza en la landing / y /recepcion deja de ser accesible", async ({
    page,
  }) => {
    await loginComoRecepcionista(page);
    await page.goto("/recepcion");
    await expectRecepcionConSalir(page);

    await salirControl(page).click();

    await expectLandingAnonima(page);
    await page.goto("/recepcion");
    await expectGuardaAlogin(page);
  });
});

// ─── Fila 3 (INC08-NAV-03): teclado — Tab + Enter/Space, foco visible ───────

test.describe("INC08-NAV-03 'Salir' alcanzable por teclado (fila 3)", () => {
  test("teclado (DUENO): Tab alcanza 'Salir' con foco visible y Enter cierra la sesion hacia /", async ({
    page,
  }) => {
    await loginComoDueno(page);
    await page.goto("/recepcion");
    await expectRecepcionConSalir(page);

    const salir = salirControl(page);
    await tabHastaSalir(page, salir);
    await page.keyboard.press("Enter");

    await expectLandingAnonima(page);
  });

  test("teclado (RECEPCIONISTA): Tab alcanza 'Salir' con foco visible y Enter cierra la sesion hacia /", async ({
    page,
  }) => {
    await loginComoRecepcionista(page);
    await page.goto("/recepcion");
    await expectRecepcionConSalir(page);

    const salir = salirControl(page);
    await tabHastaSalir(page, salir);
    await page.keyboard.press("Enter");

    await expectLandingAnonima(page);
  });

  test("teclado (DUENO): Space tambien activa 'Salir' y cierra la sesion hacia /", async ({
    page,
  }) => {
    await loginComoDueno(page);
    await page.goto("/recepcion");
    await expectRecepcionConSalir(page);

    const salir = salirControl(page);
    await tabHastaSalir(page, salir);
    await page.keyboard.press(" ");

    await expectLandingAnonima(page);
  });

  // H-INC08-03 (cierre del vacio de cobertura de la auditoria de navegacion de
  // INC-08): activacion con Space del "Salir" con RECEPCIONISTA, paridad exacta
  // con el viaje DUENO de arriba (mismo <button> nativo: `recepcion/page.tsx`).
  // `tabHastaSalir` exige `toBeFocused` + `:focus-visible`; el destino es la
  // landing `/` (DEC-053). El comportamiento YA existe en producto (INC-08
  // GREEN): si falla es hallazgo de producto y se reporta, no se arregla aqui.
  test("teclado (RECEPCIONISTA): Space tambien activa 'Salir' y cierra la sesion hacia /", async ({
    page,
  }) => {
    await loginComoRecepcionista(page);
    await page.goto("/recepcion");
    await expectRecepcionConSalir(page);

    const salir = salirControl(page);
    await tabHastaSalir(page, salir);
    await page.keyboard.press(" ");

    await expectLandingAnonima(page);
  });
});

// ─── Fila 4 (INC08-NAV-04): URL directa y recarga persisten la pantalla ─────

test.describe("INC08-NAV-04 recarga de /recepcion con sesion viva (fila 4)", () => {
  test("recarga (DUENO): la pantalla y el control 'Salir' persisten", async ({ page }) => {
    await loginComoDueno(page);
    await page.goto("/recepcion");
    await expectRecepcionConSalir(page);

    await page.reload();
    await expectRecepcionConSalir(page);
  });

  test("recarga (RECEPCIONISTA): la pantalla y el control 'Salir' persisten", async ({
    page,
  }) => {
    await loginComoRecepcionista(page);
    await page.goto("/recepcion");
    await expectRecepcionConSalir(page);

    await page.reload();
    await expectRecepcionConSalir(page);
  });
});

// ─── Fila 5 (INC08-NAV-04): atras tras "Salir" no reabre la sesion ──────────

test.describe("INC08-NAV-04 atras del navegador tras 'Salir' (fila 5)", () => {
  test("atras (DUENO) tras 'Salir' no reabre la sesion: la guarda manda a /login", async ({
    page,
  }) => {
    await loginComoDueno(page);
    await page.goto("/recepcion");
    await expectRecepcionConSalir(page);

    await salirControl(page).click();
    await expectLandingAnonima(page);

    await page.goBack();
    await expectGuardaAlogin(page);
  });

  test("atras (RECEPCIONISTA) tras 'Salir' no reabre la sesion: la guarda manda a /login", async ({
    page,
  }) => {
    await loginComoRecepcionista(page);
    await page.goto("/recepcion");
    await expectRecepcionConSalir(page);

    await salirControl(page).click();
    await expectLandingAnonima(page);

    await page.goBack();
    await expectGuardaAlogin(page);
  });
});

// ─── Fila 6 (INC08-NAV-05): movil 375px y escritorio 1280px ────────────────

for (const vp of VIEWPORTS) {
  test.describe(`INC08-NAV-05 'Salir' sin overflow horizontal (${vp.nombre}) (fila 6)`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test(`movil/escritorio (DUENO, ${vp.nombre}): 'Salir' visible sin overflow horizontal`, async ({
      page,
    }) => {
      await loginComoDueno(page);
      await page.goto("/recepcion");
      await expectRecepcionConSalir(page);
      await expectSinOverflowHorizontal(page);
    });

    test(`movil/escritorio (RECEPCIONISTA, ${vp.nombre}): 'Salir' visible sin overflow horizontal`, async ({
      page,
    }) => {
      await loginComoRecepcionista(page);
      await page.goto("/recepcion");
      await expectRecepcionConSalir(page);
      await expectSinOverflowHorizontal(page);
    });
  });
}

// ─── Fila 7 (INC08-NAV-06): regresion de flujos de recepcion ────────────────

test.describe("INC08-NAV-06 flujos de recepcion intactos con el control presente (fila 7)", () => {
  test("DUENO: consulta por cedula e ingreso intactos con 'Salir' presente", async ({
    page,
    request,
  }) => {
    // ENMIENDA INC08-FIX-01 (2026-10-30): el fixture original creaba el cliente
    // en NUEVO sin vigencia, pero HU-30 / DEC-030 / INC-06 exigen vigencia
    // activa para registrar ingreso (403 INGRESO_NO_PERMITIDO en `recepcion.ts`
    // si no). Patron del fixture base `recepcion.spec.ts:75-84`: estado ACTIVO
    // + vigencia que cubre hoy. Corrige el fixture, NO las aserciones.
    const hoy = hoyBogota();
    const cliente = await crearClienteApi(request, { sedeId: "sede-1" });
    await cambiarEstadoCliente(request, cliente.id, "ACTIVO");
    await crearVigenciaApi(request, cliente.id, sumarDias(hoy, -30), sumarDias(hoy, 30));

    await loginComoDueno(page);
    await page.goto("/recepcion");
    await expectRecepcionConSalir(page);

    // Consulta por cedula (INC03-REC-*): identidad pintada.
    const consulta = cardCon(page, CARD_CONSULTA);
    await consulta.getByLabel("Cedula de consulta").fill(cliente.cedula);
    await consulta.getByRole("button", { name: "Consultar" }).click();
    await expect(consulta.getByText("Cliente Prueba", { exact: true })).toBeVisible();

    // El control sigue unico y visible tras la consulta.
    await expect(salirControl(page)).toHaveCount(1);
    await expect(salirControl(page)).toBeVisible();

    // Registro de ingreso (INC03-ING-*): 201 pintado.
    const ingreso = cardCon(page, CARD_INGRESO);
    await ingreso.getByLabel("Cedula de ingreso").fill(cliente.cedula);
    await ingreso.getByRole("button", { name: "Registrar ingreso" }).click();
    await expect(ingreso.getByRole("status")).toContainText("Ingreso registrado");

    // El control sigue unico y visible tras el ingreso.
    await expect(salirControl(page)).toHaveCount(1);
    await expect(salirControl(page)).toBeVisible();

    // Aplicabilidad (INC-03 #5): la creacion rapida NO aplica para DUENO
    // (sin sede en el seed; el backend responderia 400 "sedeId es
    // requerido"). La creacion rapida se ejecuta con RECEPCIONISTA abajo.
  });

  test("RECEPCIONISTA: consulta, ingreso y creacion rapida intactos con 'Salir' presente", async ({
    page,
    request,
  }) => {
    // ENMIENDA INC08-FIX-01 (2026-10-30): misma correccion de fixture que el
    // viaje DUENO — estado ACTIVO + vigencia que cubre hoy (HU-30 / DEC-030 /
    // INC-06) para que el registro de ingreso sea 201; aserciones intactas.
    const hoy = hoyBogota();
    const cliente = await crearClienteApi(request, { sedeId: "sede-1" });
    await cambiarEstadoCliente(request, cliente.id, "ACTIVO");
    await crearVigenciaApi(request, cliente.id, sumarDias(hoy, -30), sumarDias(hoy, 30));

    await loginComoRecepcionista(page);
    await page.goto("/recepcion");
    await expectRecepcionConSalir(page);

    // Consulta por cedula.
    const consulta = cardCon(page, CARD_CONSULTA);
    await consulta.getByLabel("Cedula de consulta").fill(cliente.cedula);
    await consulta.getByRole("button", { name: "Consultar" }).click();
    await expect(consulta.getByText("Cliente Prueba", { exact: true })).toBeVisible();
    await expect(salirControl(page)).toHaveCount(1);

    // Registro de ingreso.
    const ingreso = cardCon(page, CARD_INGRESO);
    await ingreso.getByLabel("Cedula de ingreso").fill(cliente.cedula);
    await ingreso.getByRole("button", { name: "Registrar ingreso" }).click();
    await expect(ingreso.getByRole("status")).toContainText("Ingreso registrado");
    await expect(salirControl(page)).toHaveCount(1);

    // Creacion rapida (INC03-RAP-*): alta con sede default del token.
    const rapida = cardCon(page, CARD_RAPIDA);
    await rapida.getByLabel("Cedula rapida").fill(cedulaUnica());
    await rapida.getByLabel("Nombres rapido").fill("Rapido");
    await rapida.getByLabel("Apellidos rapido").fill("DePrueba");
    await rapida.getByLabel("Telefono rapido").fill(telefonoUnico());
    await rapida.getByRole("button", { name: "Crear cliente rapido" }).click();
    await expect(rapida.getByText("Rapido DePrueba", { exact: true })).toBeVisible();
    await expect(rapida.getByText("Creado por", { exact: true })).toBeVisible();

    // El control sigue unico y visible tras los tres flujos.
    await expect(salirControl(page)).toHaveCount(1);
    await expect(salirControl(page)).toBeVisible();
  });
});

// ─── H-INC08-02 (INC-08 auditoria): CLIENTE -> /recepcion, salida segura ─────

/**
 * H-INC08-02 (cierre del vacio de cobertura de la auditoria de navegacion de
 * INC-08): una sesion CLIENTE que intenta `/recepcion` por URL directa sale de
 * forma segura hacia `/portal` sin fuga alguna de la UI de recepcion. La
 * salida segura tiene dos capas con el mismo destino `/portal`:
 *  - capa 1: `middleware.ts:36` redirige al CLIENTE antes de renderizar,
 *  - capa 2 (defensa en profundidad): el fallback "Volver a mi portal"
 *    (`recepcion/page.tsx:83-95`) si la pantalla llegara a renderizarse.
 * La capa 1 es la alcanzable por navegacion real con middleware activo (dev/
 * prod); el contrato del enlace de la capa 2 se fija en unit
 * (`tests/unit/inc08-logout-recepcion.test.tsx`) porque el middleware la hace
 * inalcanzable en un recorrido de navegador — sin fuga de herramientas en
 * ninguna de las dos capas.
 *
 * Entrada: URL directa con sesion CLIENTE viva. Salida esperada: `/portal`
 * (destino del fallback) con la UI de recepcion ausente (ni cards de consulta/
 * ingreso/creacion, ni control "Salir" staff). Aplicabilidad: rol CLIENTE
 * creado via API con PIN fijo (`crearClientePortalApi` + `loginComoClienteCon`,
 * patron de `portal.spec.ts` / `inc06-acceso-membresia.spec.ts`).
 *
 * PIN obligatorio intacto: el fixture usa el alta de PIN oficial
 * (`/auth/reset-pin`) y el login real por `/login-cliente` (cedula + PIN);
 * ningun paso relaja `debeCambiarPin` ni la autenticacion.
 *
 * Restricciones INC00-QA-01/02: sin `isVisible()` condicional, sin
 * `waitForTimeout`, skips ni `only`, sin aserciones vacias; un paso
 * obligatorio ausente falla la prueba.
 */

const PIN_CLIENTE = "1234";

test.describe("H-INC08-02 CLIENTE en /recepcion sale de forma segura a /portal (sin fuga de UI)", () => {
  test("CLIENTE: URL directa /recepcion aterriza en /portal sin fuga de la UI de recepcion", async ({
    page,
    request,
  }) => {
    const cliente = await crearClientePortalApi(request, { sedeId: "sede-1" });
    await loginComoClienteCon(page, cliente.cedula, PIN_CLIENTE);

    await page.goto("/recepcion");

    // Salida segura -> /portal (capa 1 middleware.ts:36; la capa 2 del
    // fallback comparte el mismo destino, ver contrato del enlace en unit).
    await expect(page).toHaveURL(/\/portal\/?$/);
    await expect(
      page.getByRole("heading", { name: "Mi Portal", exact: true })
    ).toBeVisible();

    // Sin fuga de la UI de recepcion: ni pantalla, ni herramientas, ni
    // control "Salir" staff (el Navbar del portal va con showAuth={false}).
    await expect(
      page.getByRole("heading", { name: "Recepcion", exact: true })
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Consulta por cedula", exact: true })
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Registrar ingreso", exact: true })
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Cliente rapido", exact: true })
    ).toHaveCount(0);
    await expect(page.getByLabel("Cedula de consulta")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Salir", exact: true })
    ).toHaveCount(0);
  });
});
