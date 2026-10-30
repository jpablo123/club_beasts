import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import {
  API_URL,
  crearClienteApi,
  crearVigenciaApi,
  fechaLarga,
  hoyBogota,
  loginComoDueno,
  sumarDias,
  tokenApi,
} from "./e2e-helpers";

/**
 * INC05-PER-04 / INC05-NUT-04 (DEC-045 = (b)) — E2E real en navegador.
 *
 * La ficha del cliente (`/clientes/[id]` -> `MembershipSection`) consume
 * `GET .../membresias-gym`, cuya consulta no filtra por `tipoServicio`, asi
 * que conviven filas GYM, PERSONALIZADO y NUTRICION. El criterio exige
 * "pintado minimo" etiquetando cada vigencia por su `tipoServicio`.
 *
 * RED (TDD): las fixtures de los servicios nuevos se crean por la misma
 * superficie HTTP que usa el navegador (`POST .../servicios-personalizado` y
 * `POST .../servicios-nutricion`); esas rutas aun no existen, asi que la
 * prueba falla al crear la fixture (404) y, en GREEN, al pintar las etiquetas.
 *
 * Las tres vigencias se solapan entre si a proposito: DEC-004 fija que el
 * solape se evalua por `tipoServicio`, nunca entre tipos distintos.
 */

async function abrirFicha(page: Page, cedula: string, clienteId: string): Promise<void> {
  await page.goto("/clientes");
  await page.getByPlaceholder("Buscar por cedula o nombre...").fill(cedula);
  await expect(page.getByRole("cell", { name: cedula, exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Ver ficha" }).first().click();
  await expect(page).toHaveURL(new RegExp(`/clientes/${clienteId}$`));
  await expect(page.getByRole("heading", { name: "Ficha del Cliente" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Membresías" })).toBeVisible();
}

/** Fixture via API: vigencia de servicio personalizado o de nutrición (rutas nuevas de INC-05). */
async function crearServicioApi(
  request: APIRequestContext,
  clienteId: string,
  tipo: "personalizado" | "nutricion",
  fechaInicio: string,
  fechaFin: string
): Promise<void> {
  const token = await tokenApi(request);
  const res = await request.post(`${API_URL}/clientes/${clienteId}/servicios-${tipo}`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { fechaInicio, fechaFin },
  });
  const texto = await res.text();
  expect(res.status(), `POST /servicios-${tipo} devolvio ${res.status()}: ${texto}`).toBe(
    201
  );
}

/** Unica fila de la sección que muestra el rango dd/mm/yyyy — dd/mm/yyyy. */
function filaPorRango(page: Page, inicio: string, fin: string) {
  const rango = `${fechaLarga(inicio)} — ${fechaLarga(fin)}`;
  return page.locator("div.space-y-3 > div").filter({ hasText: rango });
}

test.describe("INC-05 tipos de vigencia en la ficha (E2E)", () => {
  test.beforeEach(async ({ page }) => {
    await loginComoDueno(page);
  });

  test("la ficha etiqueta cada vigencia por tipoServicio (GYM, Personalizado, Nutrición) y persiste tras recargar", async ({
    page,
    request,
  }) => {
    const hoy = hoyBogota();

    const cliente = await crearClienteApi(request, { sedeId: "sede-1" });

    // GYM: hoy a +29 (30 dias inclusivos), Activa.
    const inicioGym = hoy;
    const finGym = sumarDias(inicioGym, 29);
    await crearVigenciaApi(request, cliente.id, inicioGym, finGym);

    // PERSONALIZADO: -5 a +24, Activa. Se solapa con GYM: distinto tipo (DEC-004).
    const inicioPer = sumarDias(hoy, -5);
    const finPer = sumarDias(inicioPer, 29);
    await crearServicioApi(request, cliente.id, "personalizado", inicioPer, finPer);

    // NUTRICION: -3 a +26, Activa. Se solapa con GYM y PERSONALIZADO (DEC-004).
    const inicioNut = sumarDias(hoy, -3);
    const finNut = sumarDias(inicioNut, 29);
    await crearServicioApi(request, cliente.id, "nutricion", inicioNut, finNut);

    await abrirFicha(page, cliente.cedula, cliente.id);

    const seccion = page.locator("div.rounded-card").filter({
      has: page.getByRole("heading", { name: "Membresías" }),
    });
    await expect(seccion.locator("div.space-y-3 > div")).toHaveCount(3);

    // Cada fila lleva la etiqueta de su propio tipoServicio (DEC-045 (b)).
    const filaGym = filaPorRango(page, inicioGym, finGym);
    await expect(filaGym).toHaveCount(1);
    await expect(filaGym).toContainText(/Activa/i);
    await expect(filaGym).not.toContainText(/personalizado/i);
    await expect(filaGym).not.toContainText(/nutrici[oó]n/i);

    const filaPer = filaPorRango(page, inicioPer, finPer);
    await expect(filaPer).toHaveCount(1);
    await expect(filaPer).toContainText(/personalizado/i);
    await expect(filaPer).not.toContainText(/nutrici[oó]n/i);

    const filaNut = filaPorRango(page, inicioNut, finNut);
    await expect(filaNut).toHaveCount(1);
    await expect(filaNut).toContainText(/nutrici[oó]n/i);
    await expect(filaNut).not.toContainText(/personalizado/i);

    // Las etiquetas no son un artefacto de la carga inicial: persisten tras recargar.
    await page.reload();
    await expect(page.getByRole("heading", { name: "Membresías" })).toBeVisible();
    await expect(seccion.locator("div.space-y-3 > div")).toHaveCount(3);
    await expect(filaPorRango(page, inicioPer, finPer)).toContainText(/personalizado/i);
    await expect(filaPorRango(page, inicioNut, finNut)).toContainText(/nutrici[oó]n/i);
  });
});
