import { test, expect, type APIRequestContext, type Locator, type Page } from "@playwright/test";
import {
  ADMIN,
  crearClienteApi,
  crearClientePortalApi,
  crearVigenciaApi,
  hoyBogota,
  loginComoClienteCon,
  loginComoDueno,
  sumarDias,
  type ClienteFixture,
} from "./e2e-helpers";

/**
 * INC-07 (RED) — Navegacion de regreso al dashboard en login y cambio de PIN.
 * Criterios: INC07-NAV-01..05 (NAV-06 es la corrida completa como regresion).
 *
 * DEC-049 (E2E obligatorio: clic Y teclado, movil y escritorio) + DEC-050
 * (destino por rol/estado) + contrato C1..C6:
 *  - NAV-01 `/login` anonimo: link "Volver al inicio" href="/" -> landing.
 *  - NAV-02 `/login-cliente`: link "Volver al inicio" href="/" + link cruzado
 *    "Iniciar sesion como Dueno/Recepcionista" href="/login" conservado.
 *  - NAV-03 `/portal` (debeCambiarPin): link href="/" -> "/"; atras regresa al
 *    formulario (guarda intacta, sin bypass); recarga persiste el formulario;
 *    cambio de PIN exitoso completo (carrera update() intacta).
 *  - NAV-04 `/portal` (pinChangeSuccess): CTA "Ir a mi portal" href="/portal"
 *    -> portal completo.
 *  - NAV-05 callbackUrl intacto: /login?callbackUrl=/clientes -> /clientes; sin
 *    param -> fallback /clientes y /portal; el link nuevo no consume el param.
 *
 * Localizadores ratificados (C4): getByRole("link", { name, exact: true }) +
 * href exacto + toHaveCount(1) + toBeVisible(). En la rama debeCambiarPin
 * NUNCA se usa el selector global a[href="/"] (coincidiria el logo del Navbar).
 * El E2E nuevo NO usa `nav a[href="/"]` (C3).
 *
 * FASE RED (2026-10-29): los links/CTA aun no existen en src/, asi que las
 * aserciones de localizador nuevo fallan (toHaveCount(1) recibe 0). La base
 * E2E aceptada (57) no se toca.
 */

const PIN_SEED = "1234";
const PIN_NUEVO = "4321";

const VIEWPORTS = [
  { nombre: "movil", width: 375, height: 812 },
  { nombre: "escritorio", width: 1280, height: 800 },
] as const;

/**
 * Cliente recien creado (cambio de PIN pendiente) ya logueado en /portal.
 * Devuelve el fixture del cliente para que los viajes que necesitan datos
 * extra (p. ej. NAV-04 con vigencia) los creen sobre el mismo cliente.
 */
async function entrarPortalConCambioPendiente(
  page: Page,
  request: APIRequestContext
): Promise<ClienteFixture> {
  const cliente = await crearClienteApi(request, {
    sedeId: "sede-1",
    nombres: "Nav",
    // Solo letras y espacios: el backend rechaza digitos en apellidos.
    apellidos: "Navegacion",
  });
  await loginComoClienteCon(page, cliente.cedula, PIN_SEED);
  await expect(
    page.getByRole("heading", { name: "Cambio de PIN Obligatorio" })
  ).toBeVisible();
  return cliente;
}

/**
 * Cierre W1 (fixture NAV-04, patron C4): vigencia GYM ACTIVA con fechas
 * relativas (DEC-013, mismo rango que INC-06 F7) para que "portal completo
 * (identidad, estado)" sea el ESTADO ESTACIONARIO de /portal. Sin ninguna
 * vigencia, DEC-051 deja el aviso "No tienes una membresia activa" como
 * estado estable del cliente y la asercion de "Mi Informacion" solo se
 * cumpliria sobre el render de carga (hallazgo W1: fuente de flake y
 * literal de NAV-04 verificado solo en transitorio).
 */
async function crearVigenciaActiva(
  request: APIRequestContext,
  clienteId: string
): Promise<void> {
  await crearVigenciaApi(
    request,
    clienteId,
    sumarDias(hoyBogota(), -30),
    sumarDias(hoyBogota(), 30)
  );
}

/** Cambia el PIN desde el formulario obligatorio hasta la tarjeta de exito. */
async function completarCambioPin(page: Page): Promise<void> {
  await page.getByLabel("PIN Actual").fill(PIN_SEED);
  // `exact: true` porque "Nuevo PIN" es substring de "Confirmar Nuevo PIN".
  await page.getByLabel("Nuevo PIN", { exact: true }).fill(PIN_NUEVO);
  await page.getByLabel("Confirmar Nuevo PIN").fill(PIN_NUEVO);
  await page.getByRole("button", { name: "Cambiar PIN" }).click();
  await expect(
    page.getByRole("heading", { name: "PIN Actualizado" })
  ).toBeVisible();
}

/** Enfoca el link con Tab desde el foco actual; falla si nunca se alcanza. */
async function tabHastaLink(page: Page, link: Locator, maxTabs = 12): Promise<void> {
  for (let i = 0; i < maxTabs; i++) {
    await page.keyboard.press("Tab");
    const enfocado = await link
      .evaluate((el) => el === document.activeElement)
      .catch(() => false);
    if (enfocado) break;
  }
  await expect(link).toBeFocused();
}

/** Landing `/`: URL raiz + hero de la landing visible (aplica con y sin sesion). */
async function expectLanding(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Alto Rendimiento" })).toBeVisible();
}

/**
 * Landing de un anonimo: ademas del hero, los CTAs de login del hero
 * (fila de matriz "landing con Navbar y CTAs de login"). Con sesion la
 * landing muestra "Ir al sistema", por eso solo se exige en flujos anonimos.
 */
async function expectLandingConCtasDeLogin(page: Page): Promise<void> {
  await expectLanding(page);
  await expect(
    page.getByRole("link", { name: "Iniciar sesion", exact: true })
  ).toBeVisible();
}

/** Sin scroll horizontal (fila de matriz "movil: visible sin scroll horizontal"). */
async function expectSinOverflowHorizontal(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

for (const vp of VIEWPORTS) {
  test.describe(`INC07-NAV-01 /login (${vp.nombre})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("clic: link 'Volver al inicio' href=/ visible (una sola vez) y navega a la landing", async ({ page }) => {
      await page.goto("/login");

      const link = page.getByRole("link", { name: "Volver al inicio", exact: true });
      await expect(link).toHaveCount(1);
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", "/");
      await expectSinOverflowHorizontal(page);

      await link.click();
      await expectLandingConCtasDeLogin(page);
    });

    test("teclado: Tab desde el campo Email alcanza el link y Enter navega a la landing", async ({ page }) => {
      await page.goto("/login");

      const link = page.getByRole("link", { name: "Volver al inicio", exact: true });
      await expect(link).toHaveCount(1);

      await page.getByLabel("Email").focus();
      await tabHastaLink(page, link);
      await page.keyboard.press("Enter");
      await expectLandingConCtasDeLogin(page);
    });
  });

  test.describe(`INC07-NAV-02 /login-cliente (${vp.nombre})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("clic: link 'Volver al inicio' href=/ y link cruzado a /login conservado; navega a la landing", async ({ page }) => {
      await page.goto("/login-cliente");

      const link = page.getByRole("link", { name: "Volver al inicio", exact: true });
      await expect(link).toHaveCount(1);
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", "/");

      const cruzado = page.getByRole("link", {
        name: "Iniciar sesion como Dueno/Recepcionista",
        exact: true,
      });
      await expect(cruzado).toHaveCount(1);
      await expect(cruzado).toHaveAttribute("href", "/login");
      await expectSinOverflowHorizontal(page);

      await link.click();
      await expectLandingConCtasDeLogin(page);
    });

    test("teclado: Tab desde el campo Cedula alcanza el link y Enter navega a la landing", async ({ page }) => {
      await page.goto("/login-cliente");

      const link = page.getByRole("link", { name: "Volver al inicio", exact: true });
      await expect(link).toHaveCount(1);

      await page.getByLabel("Cedula").focus();
      await tabHastaLink(page, link);
      await page.keyboard.press("Enter");
      await expectLandingConCtasDeLogin(page);
    });
  });

  test.describe(`INC07-NAV-03 /portal cambio de PIN obligatorio (${vp.nombre})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("clic: link href=/ -> landing; atras repinta el formulario; recarga persiste; cambio de PIN exitoso", async ({ page, request }) => {
      await entrarPortalConCambioPendiente(page, request);

      const link = page.getByRole("link", { name: "Volver al inicio", exact: true });
      await expect(link).toHaveCount(1);
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", "/");

      await link.click();
      await expectLanding(page);

      // Atras del navegador: regresa al formulario (guarda sigue activa, sin bypass).
      await page.goBack();
      await expect(
        page.getByRole("heading", { name: "Cambio de PIN Obligatorio" })
      ).toBeVisible();

      // Recarga: el formulario persiste (dato de sesion, no de navegacion).
      await page.reload();
      await expect(
        page.getByRole("heading", { name: "Cambio de PIN Obligatorio" })
      ).toBeVisible();

      // El link no interfiere con la carrera update(): el cambio completa.
      await completarCambioPin(page);
    });

    test("teclado: Tab desde el formulario alcanza el link y Enter navega a la landing", async ({ page, request }) => {
      await entrarPortalConCambioPendiente(page, request);

      const link = page.getByRole("link", { name: "Volver al inicio", exact: true });
      await expect(link).toHaveCount(1);

      await page.getByLabel("PIN Actual").focus();
      await tabHastaLink(page, link);
      await page.keyboard.press("Enter");
      await expectLanding(page);
    });
  });

  test.describe(`INC07-NAV-04 /portal exito de cambio de PIN (${vp.nombre})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("clic: CTA 'Ir a mi portal' href=/portal visible y navega al portal completo", async ({ page, request }) => {
      const cliente = await entrarPortalConCambioPendiente(page, request);
      await crearVigenciaActiva(request, cliente.id);
      await completarCambioPin(page);

      const cta = page.getByRole("link", { name: "Ir a mi portal", exact: true });
      await expect(cta).toHaveCount(1);
      await expect(cta).toBeVisible();
      await expect(cta).toHaveAttribute("href", "/portal");

      await cta.click();
      await expect(page).toHaveURL(/.*portal/);
      await expect(page.getByRole("heading", { name: "Mi Informacion" })).toBeVisible();
    });

    test("teclado: Tab alcanza el CTA 'Ir a mi portal' y Enter abre el portal completo", async ({ page, request }) => {
      const cliente = await entrarPortalConCambioPendiente(page, request);
      await crearVigenciaActiva(request, cliente.id);
      await completarCambioPin(page);

      const cta = page.getByRole("link", { name: "Ir a mi portal", exact: true });
      await expect(cta).toHaveCount(1);

      await tabHastaLink(page, cta);
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(/.*portal/);
      await expect(page.getByRole("heading", { name: "Mi Informacion" })).toBeVisible();
    });
  });
}

test.describe("INC07-NAV-05 callbackUrl intacto con el link nuevo", () => {
  test("/login?callbackUrl=/clientes conserva el param y aterriza en /clientes tras login", async ({ page }) => {
    await page.goto("/login?callbackUrl=%2Fclientes");

    // El link nuevo convive con el query param sin consumirlo.
    const link = page.getByRole("link", { name: "Volver al inicio", exact: true });
    await expect(link).toHaveCount(1);
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "/");
    await expect(page).toHaveURL(/callbackUrl=%2Fclientes/);

    // Login EN LINEA (sin re-navegar a /login: eso borraria el callbackUrl y
    // la prueba no distinguiria callback del fallback). El submit conserva la
    // query y el retorno a la pantalla original.
    await page.getByLabel("Email").fill(ADMIN.email);
    await page.getByLabel("Contrasena").fill(ADMIN.password);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page).toHaveURL(/.*clientes/);
  });

  test("/login sin callbackUrl conserva su fallback a /clientes", async ({ page }) => {
    await page.goto("/login");

    const link = page.getByRole("link", { name: "Volver al inicio", exact: true });
    await expect(link).toHaveCount(1);
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "/");

    await loginComoDueno(page);
    await expect(page).toHaveURL(/.*clientes/);
  });

  test("/login-cliente sin callbackUrl conserva su fallback a /portal", async ({ page, request }) => {
    const cliente = await crearClientePortalApi(request, {
      sedeId: "sede-1",
      nombres: "Nav",
      apellidos: "Fallback",
    });

    await page.goto("/login-cliente");

    const link = page.getByRole("link", { name: "Volver al inicio", exact: true });
    await expect(link).toHaveCount(1);
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "/");

    await loginComoClienteCon(page, cliente.cedula, PIN_SEED);
    await expect(page).toHaveURL(/.*portal/);
  });
});
