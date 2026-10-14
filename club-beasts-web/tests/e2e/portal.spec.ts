import { test, expect, type Page } from "@playwright/test";
import {
  API_URL,
  cardCon,
  congelarApi,
  crearClientePortalApi,
  crearVigenciaApi,
  hoyBogota,
  loginComoClienteCon,
  loginComoDueno,
  sumarDias,
  tokenApi,
} from "./e2e-helpers";

async function loginAsClient(page: import("@playwright/test").Page) {
  await page.goto("/login-cliente");
  await page.getByPlaceholder("Ingresa tu cedula").fill("1234567890");
  await page.getByPlaceholder("****").fill("1234");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/.*portal/);
}

test.describe("Portal del Cliente", () => {
  test("muestra información del cliente autenticado", async ({ page }) => {
    await loginAsClient(page);

    await expect(page.getByRole("heading", { name: "Mi Portal" })).toBeVisible();
    await expect(page.getByText("Carlos Rodriguez", { exact: true })).toBeVisible();
  });

  test("portal sin sesión redirige a login", async ({ page }) => {
    await page.goto("/portal");
    await expect(page).toHaveURL(/.*login/);
  });

  test("portal muestra secciones de información", async ({ page }) => {
    await loginAsClient(page);

    await expect(page.getByRole("heading", { name: "Mi Informacion" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Mi Rutina" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Plan Nutricional" })).toBeVisible();
  });
});

/**
 * INC-03 — el portal consume `GET /portal/resumen` con estado real
 * (fin del hardcode "Activo" que era el gap `INC03-VEN-03`).
 *
 * Criterios cubiertos:
 *  - `INC03-POR-01`: identidad (nombre, cedula, sede) desde la BD.
 *  - `INC03-POR-02`: `estadoAccesoGym` calculado por backend (CONF-04:
 *    ACTIVA -> "Activo", VENCIDA -> "Vencido", PROGRAMADA -> "Programado",
 *    CONGELADO -> "Congelado", SIN_VIGENCIA -> "Sin vigencia").
 *  - `INC03-POR-03`: `fechaVencimiento` en `YYYY-MM-DD` (dia final
 *    inclusivo, DEC-005/006).
 *  - `INC03-POR-04`: rango de congelacion vigente en el portal.
 *  - `INC03-POR-05`: 401 sin token, 403 con rol staff y sesion staff
 *    redirigida fuera del portal (DEC-001).
 *  - `INC03-POR-06`: sin membresia -> "Sin vigencia" y "Sin fecha de
 *    vencimiento"; el portal NUNCA pinta "Activo".
 *  - `INC03-POR-07`: `hoy = fechaInicio-1` -> Programado, `hoy = fechaFin`
 *    -> Activo, `hoy = fechaFin+1` -> Vencido (extremos inclusivos).
 *
 * Fixtures: SQLite temporal aislado (DEC-012), cedulas unicas y fechas
 * relativas a `hoyBogota()` (America/Bogota): ninguna prueba depende de la
 * hora del sistema ni del orden de ejecucion.
 */

/** Entra al portal con un cliente distinto limpiando la sesion previa. */
async function entrarAlPortal(page: Page, cedula: string, pin = "1234"): Promise<void> {
  await page.context().clearCookies();
  await loginComoClienteCon(page, cedula, pin);
}

test.describe("Portal con estado real (INC-03 / INC03-POR-*)", () => {
  test("cliente con vigencia activa ve su identidad, el estado Activo y la fecha de vencimiento calculada", async ({
    page,
    request,
  }) => {
    const hoy = hoyBogota();
    const vence = sumarDias(hoy, 45);
    const cliente = await crearClientePortalApi(request, {
      sedeId: "sede-1",
      nombres: "Portal",
      apellidos: "Activo",
    });
    await crearVigenciaApi(request, cliente.id, sumarDias(hoy, -15), vence);

    await entrarAlPortal(page, cliente.cedula);
    await expect(page.getByRole("heading", { name: "Mi Portal" })).toBeVisible();

    // INC03-POR-01: identidad desde la BD.
    const info = cardCon(page, "Mi Informacion");
    await expect(info.getByText("Portal Activo", { exact: true })).toBeVisible();
    await expect(info.getByText(cliente.cedula, { exact: true })).toBeVisible();
    await expect(info.getByText("Sede Principal", { exact: true })).toBeVisible();

    // INC03-POR-02/03: estado calculado y fecha de vencimiento YYYY-MM-DD.
    const estado = cardCon(page, "Estado de acceso");
    await expect(estado.getByText("Activo", { exact: true })).toBeVisible();
    await expect(estado.getByText(vence, { exact: true })).toBeVisible();
    await expect(estado.getByText("Sin acceso al gimnasio", { exact: true })).toHaveCount(0);
  });

  test("cliente con congelacion vigente ve el rango de congelacion y el vencimiento extendido", async ({
    page,
    request,
  }) => {
    const hoy = hoyBogota();
    const cliente = await crearClientePortalApi(request, {
      sedeId: "sede-1",
      nombres: "Portal",
      apellidos: "Congelado",
    });
    const vigencia = await crearVigenciaApi(
      request,
      cliente.id,
      sumarDias(hoy, -30),
      sumarDias(hoy, 30)
    );

    // Pausa en curso [hoy-2, hoy+7] -> 10 dias inclusivos (DEC-017).
    const inicio = sumarDias(hoy, -2);
    const fin = sumarDias(hoy, 7);
    const pausa = await congelarApi(request, cliente.id, vigencia.id, {
      fechaInicio: inicio,
      fechaFin: fin,
      motivo: "Vacaciones",
      version: vigencia.version,
    });
    expect(pausa.diasCongelados, "dias inclusivos de la pausa").toBe(10);

    await entrarAlPortal(page, cliente.cedula);
    const estado = cardCon(page, "Estado de acceso");

    // INC03-POR-04: estado Congelado + rango de la pausa vigente.
    await expect(estado.getByText("Congelado", { exact: true })).toBeVisible();
    await expect(estado.getByText("Congelacion", { exact: true })).toBeVisible();
    await expect(estado.getByText(inicio, { exact: true })).toBeVisible();
    await expect(estado.getByText(fin, { exact: true })).toBeVisible();
    // INC03-POR-03: la fecha de vencimiento sigue a la fechaFin extendida.
    await expect(estado.getByText(pausa.fechaFin, { exact: true })).toBeVisible();
  });

  test("cliente sin membresia ve Sin vigencia y Sin fecha de vencimiento, nunca Activo", async ({
    page,
    request,
  }) => {
    const cliente = await crearClientePortalApi(request, { sedeId: "sede-1" });

    await entrarAlPortal(page, cliente.cedula);
    await expect(page.getByRole("heading", { name: "Mi Portal" })).toBeVisible();

    const estado = cardCon(page, "Estado de acceso");
    await expect(estado.getByText("Sin vigencia", { exact: true })).toBeVisible();
    await expect(estado.getByText("Sin fecha de vencimiento", { exact: true })).toBeVisible();
    // INC03-POR-06 / INC03-VEN-03: jamas pinta estados que no corresponden.
    await expect(estado.getByText("Activo", { exact: true })).toHaveCount(0);
    await expect(estado.getByText("Vencido", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Congelacion", { exact: true })).toHaveCount(0);
  });

  test("los extremos de la vigencia se pintan en el portal: fechaInicio-1 Programado, fechaFin Activo y fechaFin+1 Vencido", async ({
    page,
    request,
  }) => {
    const hoy = hoyBogota();

    // INC03-POR-07 / DEC-005/006: tres fronteras de calendario, sin horas.
    const casos: Array<{
      nombre: string;
      inicio: string;
      fin: string;
      esperado: string;
    }> = [
      {
        nombre: "AntesDelInicio",
        inicio: sumarDias(hoy, 1), // hoy = fechaInicio - 1
        fin: sumarDias(hoy, 40),
        esperado: "Programado",
      },
      {
        nombre: "UltimoDia",
        inicio: sumarDias(hoy, -10),
        fin: hoy, // hoy = fechaFin (dia final inclusivo)
        esperado: "Activo",
      },
      {
        nombre: "DiaSiguiente",
        inicio: sumarDias(hoy, -40),
        fin: sumarDias(hoy, -1), // hoy = fechaFin + 1
        esperado: "Vencido",
      },
    ];

    for (const caso of casos) {
      const cliente = await crearClientePortalApi(request, {
        sedeId: "sede-1",
        nombres: "Borde",
        apellidos: caso.nombre,
      });
      await crearVigenciaApi(request, cliente.id, caso.inicio, caso.fin);

      await entrarAlPortal(page, cliente.cedula);
      await expect(page.getByRole("heading", { name: "Mi Portal" })).toBeVisible();

      const estado = cardCon(page, "Estado de acceso");
      await expect(
        estado.getByText(caso.esperado, { exact: true }),
        `hoy=${hoy}, vigencia ${caso.inicio} a ${caso.fin}`
      ).toBeVisible();
      await expect(estado.getByText(caso.fin, { exact: true })).toBeVisible();
    }
  });

  test("una sesion staff no accede al portal: 401 sin token, 403 con rol staff y redireccion a /clientes", async ({
    page,
    request,
  }) => {
    // INC03-POR-05 / DEC-001: autorizacion del endpoint.
    const sinToken = await request.get(`${API_URL}/portal/resumen`);
    expect(sinToken.status(), "GET /portal/resumen sin token").toBe(401);
    expect(((await sinToken.json()) as { code?: string }).code).toBe("AUTH_TOKEN_MISSING");

    const token = await tokenApi(request);
    const conStaff = await request.get(`${API_URL}/portal/resumen`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(conStaff.status(), "GET /portal/resumen con rol DUENO").toBe(403);
    expect(((await conStaff.json()) as { code?: string }).code).toBe("AUTH_FORBIDDEN");

    // INC03-POR-05 en navegador: el middleware saca al staff del portal.
    await loginComoDueno(page);
    await page.goto("/portal");
    await expect(page).toHaveURL(/.*clientes/);
    await expect(page.locator("h1")).toContainText("Clientes");
    await expect(page.getByRole("heading", { name: "Mi Portal" })).toHaveCount(0);
  });
});
