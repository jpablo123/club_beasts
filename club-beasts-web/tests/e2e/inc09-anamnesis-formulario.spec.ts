/**
 * INC-09 (RED) — Formulario de anamnesis: guardado y descarte (HU-11 / C3 / C5 / C8).
 * Filas de la matriz de navegación APROBADA del spec INC-09:
 *   NAV-AN-05  sesión expirada al guardar -> login sin 500 (patrón
 *              `resolveSessionExit("/login")`), PIN obligatorio intacto
 *   NAV-AN-06  "Descartar cambios" con `role="alertdialog"` ("Si, descartar" /
 *              "Seguir editando") + banner "Cambios sin guardar" mientras sucio
 * Aplicabilidad C8: 375px/1280px sin overflow, teclado con foco visible,
 * targets de checkbox >= 44px.
 *
 * Contrato de UI fijado por este RED (C5/C7/C8, para el GREEN T10):
 *  - Editor bajo demanda con botones "Aplicar cambios" y "Descartar cambios"
 *    y banner "Cambios sin guardar" mientras hay cambios sin guardar.
 *  - "Descartar cambios" abre `role="alertdialog"` con "Si, descartar" /
 *    "Seguir editando"; cancelar conserva lo escrito.
 *  - Con la sesión de la API vencida, "Aplicar cambios" recibe el 401 real y
 *    la app sale al login SIN respuestas 5xx.
 *
 * FASE RED (2026-11-04): el editor NO existe (GREEN T10).
 *
 * Restricciones INC00-QA-01/02: sin `isVisible()` condicional, `waitForTimeout`,
 * skips ni `only`; localizadores `exact: true` + `toHaveCount(1|0)` (C7).
 */
import { test, expect, type Page } from "@playwright/test";
import { decode, encode } from "next-auth/jwt";
import { crearClienteApi, loginComoDueno } from "./e2e-helpers";
import {
  leerSecreto,
  regionAnamnesis,
  tokenApiVencidoDueno,
  API_URL,
} from "./inc09-anamnesis-e2e-helpers";
import { MENSAJE_SESION_VENCIDA } from "./e2e-helpers";

const WEB_URL = "http://localhost:3000";

const VIEWPORTS = [
  { nombre: "movil", width: 375, height: 812 },
  { nombre: "escritorio", width: 1280, height: 800 },
] as const;

/** Abre el editor de una ficha nueva (sin anamnesis registrada). */
async function abrirEditor(page: Page, clienteId: string): Promise<void> {
  await page.goto(`/clientes/${clienteId}`);
  await expect(regionAnamnesis(page)).toHaveCount(1);
  await page
    .getByRole("button", { name: "Diligenciar anamnesis", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Aplicar cambios", exact: true })
  ).toHaveCount(1);
}

/** Presiona Tab hasta enfocar el control (máx. teclas acotado, sin waits). */
async function enfocarConTab(page: Page, locator: ReturnType<Page["locator"]>, maxTeclas = 80): Promise<void> {
  for (let i = 0; i < maxTeclas; i += 1) {
    await page.keyboard.press("Tab");
    const enfocado = await locator.evaluate((el) => el === document.activeElement);
    if (enfocado) break;
  }
  await expect(locator).toBeFocused();
}

test.describe("NAV-AN-05 sesión expirada al guardar", () => {
  test("el 401 real al guardar sale al login sin 500", async ({
    page,
    context,
    request,
  }) => {
    const cliente = await crearClienteApi(request, {
      sedeId: "sede-1",
      nombres: "Sesion",
      apellidos: "Expirada",
    });

    await loginComoDueno(page);
    await abrirEditor(page, cliente.id);
    await page
      .getByLabel("Objetivos de entrenamiento", { exact: true })
      .fill("Ganar masa muscular");
    await expect(
      page.getByText("Cambios sin guardar", { exact: true })
    ).toHaveCount(1);

    // Ninguna respuesta de /api/auth/session en vuelo (mismo patrón que
    // sesion-vencida.spec.ts): Auth.js re-firma la cookie en cada respuesta.
    await page.waitForLoadState("networkidle");

    const secretoNextAuth = await leerSecreto(
      "playwright.config.ts",
      /NEXTAUTH_SECRET:\s*"([^"]+)"/
    );
    const secretoApi = await leerSecreto(
      "tests/e2e/start-api-e2e.mjs",
      /JWT_SECRET:\s*"([^"]+)"/
    );

    const cookies = await context.cookies(WEB_URL);
    const cookieSesion = cookies.find((c) => c.name.includes("session-token"));
    if (!cookieSesion) {
      throw new Error("Debe existir una cookie de sesión después del login de staff.");
    }
    const payload = await decode({
      token: cookieSesion.value,
      secret: secretoNextAuth,
      salt: cookieSesion.name,
    });
    expect(payload, "la cookie de sesión debe ser decodificable").not.toBeNull();
    if (!payload) throw new Error("cookie de sesión ilegible");

    const cookieVencida = await encode({
      token: { ...payload, apiToken: tokenApiVencidoDueno(secretoApi) },
      secret: secretoNextAuth,
      salt: cookieSesion.name,
    });
    await context.addCookies([{ ...cookieSesion, value: cookieVencida }]);

    // Evidencia de red: el 401 es de la API real y jamás un 5xx.
    const codigos: number[] = [];
    page.on("response", (respuesta) => {
      if (respuesta.url().startsWith(API_URL)) codigos.push(respuesta.status());
    });

    await page
      .getByRole("button", { name: "Aplicar cambios", exact: true })
      .click();

    await expect(page).toHaveURL(/\/login/);
    const banner = page
      .getByRole("alert")
      .filter({ hasText: MENSAJE_SESION_VENCIDA });
    await expect(banner).toHaveCount(1);

    expect(
      codigos.filter((codigo) => codigo >= 500),
      "la sesión expirada al guardar no debe producir errores 5xx"
    ).toEqual([]);
  });
});

test.describe("NAV-AN-06 descartar cambios con confirmación", () => {
  test("el banner 'Cambios sin guardar' y el alertdialog conservan o descartan lo escrito", async ({
    page,
    request,
  }) => {
    const cliente = await crearClienteApi(request, {
      sedeId: "sede-1",
      nombres: "Descarte",
      apellidos: "Cambios",
    });

    await loginComoDueno(page);
    await abrirEditor(page, cliente.id);

    // Sin cambios: no hay banner.
    await expect(
      page.getByText("Cambios sin guardar", { exact: true })
    ).toHaveCount(0);

    const nombre = page.getByLabel("Nombre completo", { exact: true });
    await nombre.fill("Ana Maria Perez");
    await expect(page.getByText("Cambios sin guardar", { exact: true })).toHaveCount(1);

    // "Seguir editando" conserva lo escrito.
    await page.getByRole("button", { name: "Descartar cambios", exact: true }).click();
    const dialogo = page.getByRole("alertdialog");
    await expect(dialogo).toHaveCount(1);
    await expect(dialogo.getByRole("button", { name: "Si, descartar", exact: true })).toHaveCount(1);
    await expect(dialogo.getByRole("button", { name: "Seguir editando", exact: true })).toHaveCount(1);

    await dialogo.getByRole("button", { name: "Seguir editando", exact: true }).click();
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await expect(nombre).toHaveValue("Ana Maria Perez");

    // "Si, descartar" cierra el editor y vuelve a la vista.
    await page.getByRole("button", { name: "Descartar cambios", exact: true }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Si, descartar", exact: true }).click();
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Diligenciar anamnesis", exact: true })
    ).toHaveCount(1);
    await expect(page.getByText("Cambios sin guardar", { exact: true })).toHaveCount(0);
  });
});

test.describe("C8 responsive y teclado", () => {
  for (const viewport of VIEWPORTS) {
    test(`el editor abre sin overflow a ${viewport.nombre} y el foco visible alcanza 'Aplicar cambios'`, async ({
      page,
      request,
    }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const cliente = await crearClienteApi(request, {
        sedeId: "sede-1",
        nombres: "Vista",
        apellidos: viewport.nombre === "movil" ? "Movil" : "Escritorio",
      });

      await loginComoDueno(page);
      await abrirEditor(page, cliente.id);

      // Sin overflow horizontal (C8).
      const sinOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
      );
      expect(sinOverflow, "el formulario no debe desbordar en horizontal").toBe(true);

      // Teclado: Tab alcanza "Aplicar cambios" con foco visible (C8).
      const botonGuardar = page.getByRole("button", { name: "Aplicar cambios", exact: true });
      await enfocarConTab(page, botonGuardar);
    });
  }

  test("los targets de checkbox de 'Antecedentes médicos' son de al menos 44px", async ({
    page,
    request,
  }) => {
    const cliente = await crearClienteApi(request, {
      sedeId: "sede-1",
      nombres: "Target",
      apellidos: "Checkbox",
    });

    await loginComoDueno(page);
    await abrirEditor(page, cliente.id);

    const casillaFuma = page.getByLabel("fuma", { exact: true });
    await expect(casillaFuma).toHaveCount(1);
    const target = page.locator("label").filter({ has: casillaFuma });
    await expect(target).toHaveCount(1);
    const caja = await target.boundingBox();
    expect(caja, "el target del checkbox debe tener caja").not.toBeNull();
    if (!caja) throw new Error("target sin caja");
    expect(caja.height).toBeGreaterThanOrEqual(44);
  });
});

// ─── INC09-FIX-03 (SOLO pruebas) — NAV-F-03: gestión de foco del alertdialog ─
// Hallazgo de cobertura de la auditoría de navegación INC-09 (comportamiento
// del `role="alertdialog"` de "Descartar cambios", `AnamnesisEditor.tsx:378`):
// foco inicial dentro del diálogo, Tab alcanza ambos botones y sin trampa
// (el Tab final sale). Mismas restricciones INC00-QA-01/02 + C4/C7.
test.describe("NAV-F-03 gestión de foco del alertdialog ('Descartar cambios')", () => {
  test("al abrir el alertdialog el foco inicial queda dentro del diálogo", async ({
    page,
    request,
  }) => {
    const cliente = await crearClienteApi(request, {
      sedeId: "sede-1",
      nombres: "Foco",
      apellidos: "Inicial",
    });

    await loginComoDueno(page);
    await abrirEditor(page, cliente.id);
    await page.getByLabel("Nombre completo", { exact: true }).fill("Ana Maria Perez");
    await page
      .getByRole("button", { name: "Descartar cambios", exact: true })
      .click();

    const dialogo = page.getByRole("alertdialog");
    await expect(dialogo).toHaveCount(1);

    const focoDescrito = await page.evaluate(() => {
      const el = document.activeElement;
      return el
        ? `${el.tagName.toLowerCase()} "${(el.textContent ?? "").trim().slice(0, 40)}"`
        : "ninguno";
    });
    const focoDentro = await dialogo.evaluate((el) =>
      el.contains(document.activeElement)
    );
    expect(
      focoDentro,
      `al abrir el alertdialog el foco inicial debe quedar dentro del ` +
        `diálogo (foco observado: ${focoDescrito})`
    ).toBe(true);
  });

  test("Tab alcanza ambos botones del alertdialog y el Tab final sale sin trampa", async ({
    page,
    request,
  }) => {
    const cliente = await crearClienteApi(request, {
      sedeId: "sede-1",
      nombres: "Foco",
      apellidos: "Tabular",
    });

    await loginComoDueno(page);
    await abrirEditor(page, cliente.id);
    await page.getByLabel("Nombre completo", { exact: true }).fill("Ana Maria Perez");

    // Apertura por teclado: el foco viaja al disparador y Enter abre el diálogo.
    const disparador = page.getByRole("button", {
      name: "Descartar cambios",
      exact: true,
    });
    await enfocarConTab(page, disparador);
    await page.keyboard.press("Enter");

    const dialogo = page.getByRole("alertdialog");
    await expect(dialogo).toHaveCount(1);

    // El primer tab stop al entrar queda dentro del diálogo.
    await page.keyboard.press("Tab");
    const siDescartar = dialogo.getByRole("button", {
      name: "Si, descartar",
      exact: true,
    });
    await expect(siDescartar, "Tab debe alcanzar 'Si, descartar'").toBeFocused();

    // Tab alcanza el segundo botón.
    await page.keyboard.press("Tab");
    const seguir = dialogo.getByRole("button", {
      name: "Seguir editando",
      exact: true,
    });
    await expect(seguir, "Tab debe alcanzar 'Seguir editando'").toBeFocused();

    // Sin trampa: el Tab final sale del diálogo (el foco no queda encerrado).
    await page.keyboard.press("Tab");
    await expect(dialogo.locator(":focus")).toHaveCount(0);
  });
});
