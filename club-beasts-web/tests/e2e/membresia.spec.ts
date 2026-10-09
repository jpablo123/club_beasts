import { test, expect, type Page } from "@playwright/test";
import {
  API_URL,
  crearClienteApi,
  diasInclusivos,
  diferenciaDias,
  fechaLarga,
  hoyBogota,
  isoDesdeLarga,
  loginComoDueno,
  sumarDias,
  tokenApi,
} from "./e2e-helpers";

/**
 * GAP-009 / INC00-MEM-06 y INC00-MEM-02 (E2E real en navegador).
 *
 * Flujo critico: staff logueado -> buscar cliente -> ficha -> Nueva Membresia
 * -> preset "1 mes (30 dias)" -> guardar -> la fila persiste con exactamente
 * 30 dias calendario inclusivos y estado Activa.
 */

const RE_RANGO = /(\d{2})\/(\d{2})\/(\d{4})\s+—\s+(\d{2})\/(\d{2})\/(\d{4})/;

async function abrirFicha(page: Page, cedula: string, clienteId: string): Promise<void> {
  await page.goto("/clientes");
  await page.getByPlaceholder("Buscar por cedula o nombre...").fill(cedula);
  await expect(page.getByRole("cell", { name: cedula, exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Ver ficha" }).first().click();
  await expect(page).toHaveURL(new RegExp(`/clientes/${clienteId}$`));
  await expect(page.getByRole("heading", { name: "Ficha del Cliente" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Membresías" })).toBeVisible();
}

/** Localiza la unica fila que muestra `rango` y valida estado + duracion inclusiva. */
async function expectFilaMembresia(
  page: Page,
  inicio: string,
  fin: string
): Promise<void> {
  const rango = `${fechaLarga(inicio)} — ${fechaLarga(fin)}`;
  const fila = page.locator("div.space-y-3 > div").filter({ hasText: rango });
  await expect(fila).toHaveCount(1);
  await expect(fila.getByText("Activa", { exact: true })).toHaveCount(1);

  const texto = (await fila.textContent()) ?? "";
  const coincidencia = texto.match(RE_RANGO);
  expect(
    coincidencia,
    `la fila debe mostrar "dd/mm/yyyy — dd/mm/yyyy"; texto real: ${texto}`
  ).not.toBeNull();

  const inicioLeido = isoDesdeLarga(
    `${coincidencia![1]}/${coincidencia![2]}/${coincidencia![3]}`
  );
  const finLeido = isoDesdeLarga(
    `${coincidencia![4]}/${coincidencia![5]}/${coincidencia![6]}`
  );

  expect(inicioLeido).toBe(inicio);
  expect(finLeido).toBe(fin);
  expect(diferenciaDias(inicioLeido, finLeido)).toBe(29);
  expect(diasInclusivos(inicioLeido, finLeido)).toBe(30);
}

test.describe("Membresías (E2E)", () => {
  test.beforeEach(async ({ page }) => {
    await loginComoDueno(page);
  });

  test("preset 1 mes (30 días) crea una membresía Activa de exactamente 30 días inclusivos", async ({
    page,
    request,
  }) => {
    const cliente = await crearClienteApi(request, { sedeId: "sede-1" });
    await abrirFicha(page, cliente.cedula, cliente.id);

    await page.getByRole("button", { name: "Nueva Membresía" }).click();
    await expect(page.getByRole("heading", { name: "Nuevo Período" })).toBeVisible();

    // Preset elegido explicitamente por el usuario.
    await page.getByLabel("Plan").selectOption("1m");
    await expect(page.getByLabel("Plan")).toHaveValue("1m");

    const inicio = hoyBogota();
    const fin = sumarDias(inicio, 29);
    await page.getByLabel("Fecha Inicio").fill(inicio);

    // El preset calcula el fin de forma inclusiva antes de guardar.
    await expect(page.getByText(fechaLarga(fin), { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Guardar" }).click();

    await expectFilaMembresia(page, inicio, fin);

    // Persiste tras recargar la pantalla.
    await page.reload();
    await expect(page.getByRole("heading", { name: "Membresías" })).toBeVisible();
    await expectFilaMembresia(page, inicio, fin);
  });

  test("un segundo periodo superpuesto se rechaza en la UI y la API responde 409 MEMBRESIA_SOLAPADA", async ({
    page,
    request,
  }) => {
    const cliente = await crearClienteApi(request, { sedeId: "sede-1" });
    await abrirFicha(page, cliente.cedula, cliente.id);

    const inicio = hoyBogota();
    const fin = sumarDias(inicio, 29);

    // Primer periodo valido.
    await page.getByRole("button", { name: "Nueva Membresía" }).click();
    await page.getByLabel("Plan").selectOption("1m");
    await page.getByLabel("Fecha Inicio").fill(inicio);
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.locator("div.space-y-3 > div")).toHaveCount(1);

    // Segundo intento con el mismo rango: la UI bloquea el solapamiento.
    await page.getByRole("button", { name: "Nueva Membresía" }).click();
    await page.getByLabel("Plan").selectOption("1m");
    await page.getByLabel("Fecha Inicio").fill(inicio);
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(
      page.getByText("El período se solapa con una membresía existente.")
    ).toBeVisible();
    await expect(page.locator("div.space-y-3 > div")).toHaveCount(1);

    // Sin el chequeo de la UI, la API devuelve el 409 de negocio.
    const token = await tokenApi(request);
    const respuesta = await request.post(
      `${API_URL}/clientes/${cliente.id}/membresias-gym`,
      {
        headers: { Authorization: `Bearer ${token}` },
        data: { fechaInicio: inicio, fechaFin: fin },
      }
    );
    expect(respuesta.status()).toBe(409);
    const cuerpo = (await respuesta.json()) as { code?: string };
    expect(cuerpo.code).toBe("MEMBRESIA_SOLAPADA");
  });
});
