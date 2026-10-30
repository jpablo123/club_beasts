import {
  test,
  expect,
  type APIRequestContext,
  type Locator,
  type Page,
} from "@playwright/test";
import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { decode, encode } from "next-auth/jwt";
import {
  API_URL,
  MENSAJE_SESION_VENCIDA,
  cambiarEstadoCliente,
  crearClienteApi,
  crearVigenciaApi,
  fijarPinApi,
  hoyBogota,
  loginComoClienteCon,
  loginComoDueno,
  sumarDias,
  tokenApi,
  type ClienteFixture,
} from "./e2e-helpers";

/**
 * INC-06 (RED) — acceso completo bloqueado sin ninguna membresia activa.
 * Criterios: `INC06-ACC-01`, `INC06-ACC-02`, `INC06-ACC-04`, `INC06-ACC-05`,
 * `INC06-ACC-06`, `INC06-ACC-07` (matriz de navegacion/aplicabilidad del spec:
 * login->aviso, recarga, atras sin bucle, movil/escritorio, teclado, sesion
 * expirada, recepcion 403, mixto sin aviso, portal con acceso).
 *
 * DEC-051 (copy fijo, opcion (a)): titulo "No tienes una membresia activa" +
 * subtexto/CTA "Contacta recepcion para activar tu membresia y volver a
 * acceder"; nunca la palabra "suspension"; aviso a PANTALLA COMPLETA en
 * /portal (sin tarjetas de estado/rutina/plan). DEC-051 PEND-02(a): el login
 * NO se bloquea (identidad != acceso); el aviso se ve tras el login.
 *
 * FASE RED (2026-10-29): `GET /portal/resumen` todavia no expone
 * `sinMembresiaActiva` y `/portal` no pinta el aviso, por lo que las
 * aserciones del aviso y del flag fallan. Las regresiones de recepcion y de
 * portal-con-acceso pasan hoy (comportamiento aceptado intacto).
 *
 * R5 (ratificacion, patron C4): el E2E aceptado `acceso-vencimiento.spec.ts`
 * (lineas 90-104) aserta las tarjetas del portal para un cliente con GYM
 * vencida unica; bajo DEC-048 + PEND-03(a) ese cliente vera el aviso, por lo
 * que ese E2E quedara EN ROJO tras el GREEN (cambio de comportamiento
 * `INC06-ACC-01`, no regresion `ACC-07`). NO se modifica aqui: su enmienda
 * exige contrato propio del orquestador.
 *
 * Restricciones INC00-QA-01/02: sin `isVisible()` condicional, sin
 * `waitForTimeout`, skips ni `only`, sin aserciones vacias.
 */

const PIN_CLIENTE = "1234";
const TITULO_AVISO = "No tienes una membresia activa";
const SUBTEXTO_AVISO =
  "Contacta recepcion para activar tu membresia y volver a acceder";

/** Tarjetas excluidas por DEC-051 PEND-03(a) del aviso a pantalla completa. */
const TARJETAS_PORTAL = [
  "Mi Informacion",
  "Estado de acceso",
  "Mi Rutina",
  "Plan Nutricional",
];

const VIEWPORTS = [
  { nombre: "movil", width: 375, height: 812 },
  { nombre: "escritorio", width: 1280, height: 800 },
] as const;

const WEB_URL = "http://localhost:3000";

// ─── Staff seed (H-01b: viaje ACC-04 con RECEPCIONISTA) ─────────────────────

const RECEPCIONISTA = { email: "recep@clubbeasts.com", password: "recep123" };

/** Login de recepcionista por la UI (seed determinista); aterriza en /clientes. */
async function loginComoRecepcionista(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(RECEPCIONISTA.email);
  await page.getByLabel("Contrasena").fill(RECEPCIONISTA.password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/.*clientes/);
}

// ─── Fixtures F1..F8 del spec (cedulas unicas por test, DEC-012) ─────────────

/** F2: cliente ACTIVO con solo GYM VENCIDA (fin ayer) -> sinMembresiaActiva. */
async function crearClienteF2(
  request: APIRequestContext
): Promise<ClienteFixture & { fechaFin: string }> {
  const cliente = await crearClienteApi(request, {
    sedeId: "sede-1",
    nombres: "Sin",
    apellidos: "Membresia",
  });
  await cambiarEstadoCliente(request, cliente.id, "ACTIVO");
  const fechaFin = sumarDias(hoyBogota(), -1);
  await crearVigenciaApi(
    request,
    cliente.id,
    sumarDias(fechaFin, -30),
    fechaFin
  );
  await fijarPinApi(request, cliente.id);
  return { ...cliente, fechaFin };
}

/** F3 (fixture F8 de INC-05): GYM VENCIDA + NUTRICION ACTIVA (mixto). */
async function crearClienteF3(
  request: APIRequestContext
): Promise<ClienteFixture & { fechaFin: string }> {
  const cliente = await crearClienteApi(request, {
    sedeId: "sede-1",
    nombres: "Mixto",
    apellidos: "Servicios",
  });
  await cambiarEstadoCliente(request, cliente.id, "ACTIVO");
  // Mismos datos que siempre (GYM terminado ayer); `fechaFin` se devuelve para
  // asertar el mensaje 403 existente del viaje F3 (micro-fix 2026-10-29).
  const fechaInicio = sumarDias(hoyBogota(), -30);
  const fechaFin = sumarDias(hoyBogota(), -1);
  await crearVigenciaApi(request, cliente.id, fechaInicio, fechaFin);
  await crearServicioApi(
    request,
    cliente.id,
    "servicios-nutricion",
    sumarDias(hoyBogota(), -5),
    sumarDias(hoyBogota(), 25)
  );
  await fijarPinApi(request, cliente.id);
  return { ...cliente, fechaFin };
}

/** F7: cliente ACTIVO con GYM ACTIVA (regresion portal con acceso). */
async function crearClienteF7(request: APIRequestContext): Promise<ClienteFixture> {
  const cliente = await crearClienteApi(request, {
    sedeId: "sede-1",
    nombres: "Con",
    apellidos: "Acceso",
  });
  await cambiarEstadoCliente(request, cliente.id, "ACTIVO");
  await crearVigenciaApi(
    request,
    cliente.id,
    sumarDias(hoyBogota(), -30),
    sumarDias(hoyBogota(), 30)
  );
  await fijarPinApi(request, cliente.id);
  return cliente;
}

/** Vigencia de un servicio INC-05 (NUTRICION/PERSONALIZADO) via API real. */
async function crearServicioApi(
  request: APIRequestContext,
  clienteId: string,
  ruta: "servicios-personalizado" | "servicios-nutricion",
  fechaInicio: string,
  fechaFin: string
): Promise<void> {
  const token = await tokenApi(request);
  const res = await request.post(`${API_URL}/clientes/${clienteId}/${ruta}`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { fechaInicio, fechaFin },
  });
  expect(
    res.ok(),
    `POST /${ruta} devolvio ${res.status()}: ${await res.text()}`
  ).toBe(true);
}

// ─── Aserciones compartidas del aviso (DEC-051) ─────────────────────────────

/** Aviso a pantalla completa: copy exacto, accesible y sin tarjetas. */
async function expectAvisoPantallaCompleta(page: Page): Promise<void> {
  await expect(
    page.getByRole("heading", { name: TITULO_AVISO })
  ).toBeVisible();
  await expect(page.getByText(SUBTEXTO_AVISO, { exact: true })).toBeVisible();

  // INC06-ACC-06: role=alert (equivalente accesible fijado en el RED) con el
  // copy completo.
  const aviso = page.getByRole("alert").filter({ hasText: TITULO_AVISO });
  await expect(aviso).toHaveCount(1);
  await expect(aviso).toContainText(SUBTEXTO_AVISO);

  // DEC-051 PEND-01(a): el copy nunca usa la palabra "suspension".
  const textoPagina = await page.evaluate(() => document.body.textContent ?? "");
  expect(textoPagina).not.toMatch(/suspensi[oó]n/i);

  // DEC-051 PEND-03(a): pantalla completa, sin tarjetas del portal.
  for (const tarjeta of TARJETAS_PORTAL) {
    await expect(
      page.getByRole("heading", { name: tarjeta }),
      `la tarjeta "${tarjeta}" no debe pintarse en el aviso`
    ).toHaveCount(0);
  }

  // Superficie PEND-03(a): Navbar conservada (logo "inicio" visible).
  await expect(page.locator("nav a[href='/']").first()).toBeVisible();
}

/** Portal completo con acceso (regresion HU-25): tarjetas y sin aviso. */
async function expectPortalCompleto(page: Page): Promise<void> {
  for (const tarjeta of TARJETAS_PORTAL) {
    await expect(
      page.getByRole("heading", { name: tarjeta }),
      `la tarjeta "${tarjeta}" del portal debe seguir pintandose`
    ).toBeVisible();
  }
  await expect(page.getByText("Activo", { exact: true })).toBeVisible();
  await expect(page.getByText(TITULO_AVISO, { exact: true })).toHaveCount(0);
  await expect(page.getByText(SUBTEXTO_AVISO, { exact: true })).toHaveCount(0);
}

/** Sin scroll horizontal (fila de matriz ACC-06: movil 375px y escritorio 1280px). */
async function expectSinOverflowHorizontal(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

/** Flag del contrato via API real (R3: booleano simple). */
async function expectFlagResumen(
  request: APIRequestContext,
  cedula: string,
  esperado: boolean
): Promise<void> {
  const login = await request.post(`${API_URL}/auth/login-cliente`, {
    data: { cedula, pin: PIN_CLIENTE },
  });
  expect(login.status(), "login del cliente para leer el resumen").toBe(200);
  const { token } = (await login.json()) as { token: string };
  const resumen = await request.get(`${API_URL}/portal/resumen`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(resumen.status(), "GET /portal/resumen").toBe(200);
  const cuerpo = (await resumen.json()) as { sinMembresiaActiva?: boolean };
  expect(cuerpo.sinMembresiaActiva, "sinMembresiaActiva del resumen").toBe(
    esperado
  );
}

/** Enfoca el control con Tab desde el foco actual; falla si nunca se alcanza. */
async function tabHasta(page: Page, control: Locator, maxTabs = 15): Promise<void> {
  for (let i = 0; i < maxTabs; i++) {
    await page.keyboard.press("Tab");
    const enfocado = await control
      .evaluate((el) => el === document.activeElement)
      .catch(() => false);
    if (enfocado) break;
  }
  await expect(control).toBeFocused();
}

// ─── Sesion expirada (mismo mecanismo que sesion-vencida.spec.ts) ────────────

/** Lee un secreto del propio entorno E2E sin imprimirlo. Lanza si no existe. */
async function leerSecreto(fichero: string, patron: RegExp): Promise<string> {
  const config = test.info().config.configFile;
  const raiz = config
    ? path.dirname(path.resolve(config))
    : path.resolve(process.cwd());
  const ruta = path.join(raiz, fichero);
  let texto: string;
  try {
    texto = await readFile(ruta, "utf8");
  } catch (error) {
    throw new Error(
      `No se pudo leer ${ruta} para obtener el secreto de E2E: ${String(error)}`
    );
  }
  const coincidencia = texto.match(patron);
  if (!coincidencia) {
    throw new Error(
      `No se encontro el secreto requerido para E2E en ${fichero} (patron ${patron.source}).`
    );
  }
  return coincidencia[1];
}

/** JWT HS256 con firma valida y `exp` en el pasado (401 AUTH_TOKEN_EXPIRED). */
function tokenApiVencido(secreto: string, clienteId: string): string {
  const base64url = (valor: string) => Buffer.from(valor).toString("base64url");
  const ahora = Math.floor(Date.now() / 1000);
  const cabecera = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const cuerpo = base64url(
    JSON.stringify({
      id: clienteId,
      cedula: "0000000000",
      rol: "CLIENTE",
      iat: ahora - 7200,
      exp: ahora - 60,
    })
  );
  const firma = createHmac("sha256", secreto)
    .update(`${cabecera}.${cuerpo}`)
    .digest("base64url");
  return `${cabecera}.${cuerpo}.${firma}`;
}

// ─── Matriz de navegacion: login -> aviso / recarga / atras / teclado ────────

for (const vp of VIEWPORTS) {
  test.describe(`INC06-ACC-05/01 login -> /portal con aviso (${vp.nombre})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("el cliente F2 aterriza en /portal y ve el aviso a pantalla completa", async ({
      page,
      request,
    }) => {
      const cliente = await crearClienteF2(request);

      await loginComoClienteCon(page, cliente.cedula, PIN_CLIENTE);
      await expect(page).toHaveURL(/\/portal/);

      await expectAvisoPantallaCompleta(page);
      // H-02 (auditoria de navegacion 2026-10-29): el overflow horizontal se
      // mide en AMBOS viewports de la matriz ACC-06 (movil 375px y escritorio
      // 1280px), no solo en movil.
      await expectSinOverflowHorizontal(page);
    });

    test("el aviso persiste tras recargar /portal (dato del resumen, no estado de navegacion)", async ({
      page,
      request,
    }) => {
      const cliente = await crearClienteF2(request);

      await loginComoClienteCon(page, cliente.cedula, PIN_CLIENTE);
      await page.reload();
      await expect(page).toHaveURL(/\/portal/);

      await expectAvisoPantallaCompleta(page);
    });

    test("URL directa + atras del navegador tras recarga: /portal repinta el aviso sin bucle", async ({
      page,
      request,
    }) => {
      const cliente = await crearClienteF2(request);

      await loginComoClienteCon(page, cliente.cedula, PIN_CLIENTE);
      // URL directa con sesion valida.
      await page.goto("/portal");
      await expectAvisoPantallaCompleta(page);
      await page.reload();
      await page.goBack();

      await expect(page).toHaveURL(/\/portal/);
      await expectAvisoPantallaCompleta(page);
    });

    test("teclado: el aviso es legible por lector y Tab alcanza el logout sin foco trampa", async ({
      page,
      request,
    }) => {
      const cliente = await crearClienteF2(request);

      await loginComoClienteCon(page, cliente.cedula, PIN_CLIENTE);
      // Estructura semantica legible por lector de pantalla.
      await expect(
        page.getByRole("heading", { name: TITULO_AVISO })
      ).toBeVisible();
      await expect(
        page.getByRole("alert").filter({ hasText: TITULO_AVISO })
      ).toHaveCount(1);

      // El logout del portal queda intacto (fila de matriz: salidas por rol).
      const logout = page
        .getByRole("button", { name: /cerrar sesi/i })
        .or(page.getByRole("link", { name: /cerrar sesi/i }));
      await expect(logout).toBeVisible();

      // Sin foco trampa: Tab recorre hasta el control de salida (falla si no).
      await tabHasta(page, logout);
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(/\/login-cliente/);
    });
  });
}

// ─── Matriz: sesion expirada -> login -> portal con aviso (sin bucle) ────────

test.describe("INC06-ACC-05 sesion expirada -> nuevo login -> portal con aviso", () => {
  test("el 401 AUTH_TOKEN_EXPIRED real lleva al login y tras re-autenticar se ve el aviso", async ({
    page,
    context,
    request,
  }) => {
    const cliente = await crearClienteF2(request);
    await loginComoClienteCon(page, cliente.cedula, PIN_CLIENTE);
    await page.waitForLoadState("networkidle");

    const secretoNextAuth = await leerSecreto(
      "playwright.config.ts",
      /NEXTAUTH_SECRET:\s*"([^"]+)"/
    );
    const secretoApi = await leerSecreto(
      path.join("tests", "e2e", "start-api-e2e.mjs"),
      /JWT_SECRET:\s*"([^"]+)"/
    );

    const cookies = await context.cookies(WEB_URL);
    const cookieSesion = cookies.find((c) => c.name.includes("session-token"));
    if (!cookieSesion) {
      throw new Error(
        "Debe existir una cookie de sesion despues del login del cliente."
      );
    }
    const payload = await decode({
      token: cookieSesion.value,
      secret: secretoNextAuth,
      salt: cookieSesion.name,
    });
    expect(payload, "la cookie de sesion debe ser decodificable").not.toBeNull();
    if (!payload) throw new Error("cookie de sesion ilegible");

    const tokenVencido = tokenApiVencido(secretoApi, cliente.id);
    const cookieVencida = await encode({
      token: { ...payload, apiToken: tokenVencido },
      secret: secretoNextAuth,
      salt: cookieSesion.name,
    });
    await context.addCookies([{ ...cookieSesion, value: cookieVencida }]);

    // Evidencia: el 401 lo emite la API real (mismo patron que sesion-vencida).
    const respuestas401: Array<{ code?: string }> = [];
    page.on("response", (respuesta) => {
      if (!respuesta.url().startsWith(API_URL)) return;
      if (respuesta.status() !== 401) return;
      void respuesta
        .json()
        .then((cuerpo: { code?: string }) =>
          respuestas401.push({ code: cuerpo?.code })
        )
        .catch(() => respuestas401.push({}));
    });

    await page.reload();

    await expect
      .poll(() => respuestas401.length, {
        message: "la API E2E debe responder al menos un 401 a la peticion del navegador",
        timeout: 15000,
        intervals: [100, 250, 500],
      })
      .toBeGreaterThan(0);
    expect(respuestas401[respuestas401.length - 1].code).toBe(
      "AUTH_TOKEN_EXPIRED"
    );

    // DEC-010: banner de sesion expirada + salida al login del cliente
    // conservando el retorno (/portal).
    await expect(page).toHaveURL(/\/login-cliente\?/);
    await expect(page).toHaveURL(/callbackUrl=%2Fportal/);
    const banner = page
      .getByRole("alert")
      .filter({ hasText: MENSAJE_SESION_VENCIDA });
    await expect(banner).toHaveCount(1);

    // Tras el nuevo login aterriza en /portal con el aviso; sin bucle.
    await loginComoClienteCon(page, cliente.cedula, PIN_CLIENTE);
    await expect(page).toHaveURL(/\/portal/);
    await expectAvisoPantallaCompleta(page);
  });
});

// ─── Matriz: recepcion consulta + ingreso 403 con F2 (HU-30 intacta) ────────

test.describe("INC06-ACC-04 recepcion con cliente F2: consulta con estado e ingreso 403", () => {
  test("la consulta muestra el estado vencido y el ingreso responde 403 con el mensaje existente", async ({
    page,
    request,
  }) => {
    const cliente = await crearClienteF2(request);
    await loginComoDueno(page);
    await page.goto("/recepcion");

    // Consulta por cedula: el estado real se pinta tal cual (INC03-REC-*).
    const consulta = page
      .locator("div.rounded-card")
      .filter({ has: page.getByRole("heading", { name: "Consulta por cedula" }) });
    await consulta.getByLabel("Cedula de consulta").fill(cliente.cedula);
    await consulta.getByRole("button", { name: "Consultar" }).click();
    await expect(consulta.getByText("Vencido", { exact: true })).toBeVisible();

    // Ingreso: 403 con el mensaje exacto existente, sin confirmacion visible.
    const mensajeVencida = `La membresía no está habilitada para ingresar (vencida el ${cliente.fechaFin})`;
    const ingreso = page
      .locator("div.rounded-card")
      .filter({ has: page.getByRole("heading", { name: "Registrar ingreso" }) });
    await ingreso.getByLabel("Cedula de ingreso").fill(cliente.cedula);
    await ingreso.getByRole("button", { name: "Registrar ingreso" }).click();
    await expect(ingreso.getByRole("alert")).toContainText(mensajeVencida);
    await expect(ingreso.getByText("Ingreso registrado")).toHaveCount(0);

    // Backend: el mismo 403 por la API real (mensaje exacto intacto).
    const token = await tokenApi(request);
    const res = await request.post(`${API_URL}/recepcion/ingresos`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { cedula: cliente.cedula, sedeId: "sede-1" },
    });
    expect(res.status()).toBe(403);
    const cuerpo = (await res.json()) as { code?: string; error?: string };
    expect(cuerpo.code).toBe("INGRESO_NO_PERMITIDO");
    expect(cuerpo.error).toBe(mensajeVencida);
  });
});

// ─── Matriz ACC-04 con RECEPCIONISTA (H-01b: el DUENO ya estaba ejecutado) ──

test.describe("INC06-ACC-04 recepcion con RECEPCIONISTA: consulta con estado e ingreso 403", () => {
  test("el RECEPCIONISTA consulta el estado vencido y el ingreso responde 403 con el mensaje existente", async ({
    page,
    request,
  }) => {
    const cliente = await crearClienteF2(request);
    await loginComoRecepcionista(page);
    await page.goto("/recepcion");

    // Consulta por cedula: el estado real se pinta tal cual (INC03-REC-*).
    const consulta = page
      .locator("div.rounded-card")
      .filter({ has: page.getByRole("heading", { name: "Consulta por cedula" }) });
    await consulta.getByLabel("Cedula de consulta").fill(cliente.cedula);
    await consulta.getByRole("button", { name: "Consultar" }).click();
    await expect(consulta.getByText("Vencido", { exact: true })).toBeVisible();

    // Ingreso: 403 con el mensaje exacto existente, sin confirmacion visible.
    const mensajeVencida = `La membresía no está habilitada para ingresar (vencida el ${cliente.fechaFin})`;
    const ingreso = page
      .locator("div.rounded-card")
      .filter({ has: page.getByRole("heading", { name: "Registrar ingreso" }) });
    await ingreso.getByLabel("Cedula de ingreso").fill(cliente.cedula);
    await ingreso.getByRole("button", { name: "Registrar ingreso" }).click();
    await expect(ingreso.getByRole("alert")).toContainText(mensajeVencida);
    await expect(ingreso.getByText("Ingreso registrado")).toHaveCount(0);

    // Backend: el mismo 403 por la API real con el token DEL RECEPCIONISTA
    // (mismo canal que usa el navegador; permisos STAFF_ROLES intactos).
    const loginRecep = await request.post(`${API_URL}/auth/login`, {
      data: { email: RECEPCIONISTA.email, password: RECEPCIONISTA.password },
    });
    expect(
      loginRecep.ok(),
      `POST /auth/login (recepcionista) devolvio ${loginRecep.status()}`
    ).toBe(true);
    const { token } = (await loginRecep.json()) as { token?: string };
    expect(typeof token).toBe("string");
    const res = await request.post(`${API_URL}/recepcion/ingresos`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { cedula: cliente.cedula, sedeId: "sede-1" },
    });
    expect(res.status()).toBe(403);
    const cuerpo = (await res.json()) as { code?: string; error?: string };
    expect(cuerpo.code).toBe("INGRESO_NO_PERMITIDO");
    expect(cuerpo.error).toBe(mensajeVencida);
  });
});

// ─── Matriz: mixto F3 -> portal sin aviso + ingreso 403 (DEC-026/027) ───────

test.describe("INC06-ACC-02 mixto F3: hay servicio vigente, sin aviso en el portal", () => {
  test("el portal del cliente mixto se pinta completo sin aviso y el ingreso sigue 403 por GYM vencida", async ({
    page,
    request,
  }) => {
    const cliente = await crearClienteF3(request);

    await loginComoClienteCon(page, cliente.cedula, PIN_CLIENTE);
    await expect(page).toHaveURL(/\/portal/);

    // Matriz de navegacion `ACC-02` (viaje F3): "Ingreso 403 (GYM vencida)
    // pero portal sin aviso (hay servicio vigente); destinos intactos".
    // Micro-fix 2026-10-29 (contrato propio del orquestador): este viaje NO
    // reutiliza `expectPortalCompleto` (helper del viaje F7, que aserta el
    // badge "Activo" del GYM `ACTIVA`, incompatible con F3). El contrato R3
    // expone en el resumen el bloque GYM + `sinMembresiaActiva` (campo unico
    // aditivo): no hay badge "Activo" de NUTRICION en /portal.
    // (1) Sin aviso de activar membresia: hay servicio vigente.
    await expect(page.getByText(TITULO_AVISO, { exact: true })).toHaveCount(0);
    await expect(page.getByText(SUBTEXTO_AVISO, { exact: true })).toHaveCount(0);
    // (2) El portal pinta el estado por servicio del GYM (DEC-026/027).
    await expect(page.getByText("Vencido", { exact: true })).toBeVisible();
    // (4) Destinos intactos: tarjetas del portal y salida del cliente.
    for (const tarjeta of TARJETAS_PORTAL) {
      await expect(
        page.getByRole("heading", { name: tarjeta }),
        `la tarjeta "${tarjeta}" debe seguir disponible en el portal mixto`
      ).toBeVisible();
    }
    const logout = page
      .getByRole("button", { name: /cerrar sesi/i })
      .or(page.getByRole("link", { name: /cerrar sesi/i }));
    await expect(logout).toBeVisible();

    // R3: el flag del contrato confirma "sin bloqueo" con servicio vigente.
    await expectFlagResumen(request, cliente.cedula, false);

    // (3) El ingreso se rige por GYM (acceso por servicio): 403 con el
    // mensaje existente intacto.
    const token = await tokenApi(request);
    const res = await request.post(`${API_URL}/recepcion/ingresos`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { cedula: cliente.cedula, sedeId: "sede-1" },
    });
    expect(res.status()).toBe(403);
    const cuerpo = (await res.json()) as { code?: string; error?: string };
    expect(cuerpo.code).toBe("INGRESO_NO_PERMITIDO");
    expect(cuerpo.error).toBe(
      `La membresía no está habilitada para ingresar (vencida el ${cliente.fechaFin})`
    );
  });
});

// ─── Matriz: regresion portal con acceso F7 (URL directa + recarga + atras) ─

test.describe("INC06-ACC-07 regresion: portal con acceso completo y sin aviso", () => {
  test("URL directa, recarga y atras pintan el portal completo sin aviso (mismos destinos que hoy)", async ({
    page,
    request,
  }) => {
    const cliente = await crearClienteF7(request);

    await loginComoClienteCon(page, cliente.cedula, PIN_CLIENTE);
    await expectPortalCompleto(page);

    // URL directa.
    await page.goto("/portal");
    await expectPortalCompleto(page);
    // Recarga.
    await page.reload();
    await expectPortalCompleto(page);
    // Atras: sin bucle, el portal completo persiste.
    await page.goBack();
    await expect(page).toHaveURL(/\/portal/);
    await expectPortalCompleto(page);

    // R3: con acceso el flag es false (el GREEN no debe marcar aviso).
    await expectFlagResumen(request, cliente.cedula, false);
  });
});

// ─── Matriz: salidas por rol — logout CLIENTE desde el portal completo ──────

test.describe("INC06-ACC-07 salidas por rol: logout CLIENTE desde el portal completo (F7)", () => {
  test("el cliente F7 (con acceso) cierra sesion desde el portal completo y aterriza en /login-cliente", async ({
    page,
    request,
  }) => {
    const cliente = await crearClienteF7(request);

    await loginComoClienteCon(page, cliente.cedula, PIN_CLIENTE);
    await expectPortalCompleto(page);

    // H-01c (auditoria 2026-10-29): la salida del portal completo estaba
    // ejecutada solo desde el aviso; aqui se recorre con membresia activa.
    const logout = page.getByRole("button", { name: /cerrar sesi/i });
    await expect(logout).toHaveCount(1);
    await expect(logout).toBeVisible();
    await logout.click();

    // Destino fijado (matriz "salidas por rol"): signOut -> /login-cliente,
    // con el acceso del cliente intacto (DEC-051 PEND-02(a): login intacto).
    await expect(page).toHaveURL(/\/login-cliente\/?$/);
    await expect(
      page.getByRole("heading", { name: "Portal del Cliente" })
    ).toBeVisible();
    await expect(page.getByPlaceholder("Ingresa tu cedula")).toBeVisible();
  });
});
