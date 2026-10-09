import { test, expect } from "@playwright/test";
import {
  API_URL,
  cambiarEstadoCliente,
  crearClienteApi,
  tokenApi,
} from "./e2e-helpers";

async function loginAsAdmin(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@clubbeasts.com");
  await page.getByLabel("Contrasena").fill("admin123");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/.*clientes/);
}

test.describe("Clientes", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("muestra lista de clientes", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Clientes");
    await expect(page.locator("table")).toBeVisible();
    await expect(page.getByRole("cell", { name: "1234567890" })).toBeVisible();
  });

  test("puede buscar clientes", async ({ page }) => {
    await page.getByPlaceholder("Buscar por cedula o nombre...").fill("Carlos");
    await expect(page.getByRole("cell", { name: /Carlos Rodriguez/ })).toBeVisible();
  });

  test("puede crear un cliente nuevo", async ({ page }) => {
    const uniqueCedula = `99${Date.now().toString().slice(-8)}`;

    await page.getByRole("link", { name: /Nuevo Cliente/ }).click();
    await expect(page).toHaveURL(/.*clientes\/nuevo/);

    await page.getByLabel("Cedula *").fill(uniqueCedula);
    await page.getByLabel("Nombres *").fill("Maria");
    await page.getByLabel("Apellidos *").fill("Garcia");
    await page.getByLabel("Telefono *").fill("3009999999");

    await page.getByRole("button", { name: "Crear Cliente" }).click();
    await expect(page).toHaveURL(/.*\/clientes$/);
    await page.getByPlaceholder("Buscar por cedula o nombre...").fill(uniqueCedula);
    await expect(page.getByRole("cell", { name: uniqueCedula })).toBeVisible();
  });

  test("puede ver ficha de cliente", async ({ page }) => {
    await page.getByRole("link", { name: "Ver ficha" }).first().click();
    await expect(page).toHaveURL(/.*clientes\/.+/);
    await expect(page.getByRole("heading", { name: "Ficha del Cliente" })).toBeVisible();
  });

  test("puede editar un cliente existente", async ({ page }) => {
    await page.getByRole("link", { name: "Ver ficha" }).first().click();
    await page.getByRole("button", { name: "Editar" }).click();
    await expect(page.getByRole("button", { name: "Guardar" })).toBeVisible();
  });
});

/**
 * INC00-CLI-05: filtros de estado/sede y paginación de la lista, con fixtures
 * que garantizan siempre un resultado esperado y un resultado excluido
 * (INC00-QA-03). Este bloque va al final del archivo: su fixture de paginación
 * supera el tamaño de página (20) y empuja al cliente del seed a la última
 * página, por lo que debe ejecutarse después de los tests que lo necesitan en
 * la primera página.
 */
test.describe("Clientes - lista con filtros y paginación (INC00-CLI-05)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("filtra por estado con un resultado esperado y un resultado excluido", async ({
    page,
    request,
  }) => {
    const suspendido = await crearClienteApi(request, { sedeId: "sede-1" });
    await cambiarEstadoCliente(request, suspendido.id, "SUSPENDIDO");
    await page.reload();

    // Esperado: el cliente suspendido. Excluido: el seed ACTIVO.
    await page.getByLabel("Filtrar por estado").selectOption("SUSPENDIDO");
    await expect(
      page.getByRole("cell", { name: suspendido.cedula, exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("cell", { name: "1234567890", exact: true })
    ).toHaveCount(0);

    // Invertido: esperado el seed ACTIVO, excluido el suspendido.
    await page.getByLabel("Filtrar por estado").selectOption("ACTIVO");
    await expect(
      page.getByRole("cell", { name: "1234567890", exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("cell", { name: suspendido.cedula, exact: true })
    ).toHaveCount(0);

    // Quitar el filtro vuelve a mostrar ambos.
    await page.getByLabel("Filtrar por estado").selectOption("");
    await expect(
      page.getByRole("cell", { name: suspendido.cedula, exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("cell", { name: "1234567890", exact: true })
    ).toBeVisible();
  });

  test("filtra por sede con un resultado esperado y un resultado excluido", async ({
    page,
    request,
  }) => {
    const clienteSede1 = await crearClienteApi(request, { sedeId: "sede-1" });
    const clienteSede2 = await crearClienteApi(request, { sedeId: "sede-2" });
    await page.reload();

    // Esperado: cliente de la sede 2. Excluido: cliente de la sede 1.
    await page.getByLabel("Filtrar por sede").selectOption("sede-2");
    await expect(
      page.getByRole("cell", { name: clienteSede2.cedula, exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("cell", { name: clienteSede1.cedula, exact: true })
    ).toHaveCount(0);

    // Invertido: esperado el de la sede 1, excluido el de la sede 2.
    await page.getByLabel("Filtrar por sede").selectOption("sede-1");
    await expect(
      page.getByRole("cell", { name: clienteSede1.cedula, exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("cell", { name: clienteSede2.cedula, exact: true })
    ).toHaveCount(0);

    await page.getByLabel("Filtrar por sede").selectOption("");
    await expect(
      page.getByRole("cell", { name: clienteSede1.cedula, exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("cell", { name: clienteSede2.cedula, exact: true })
    ).toBeVisible();
  });

  test("pagina la lista cuando los resultados no caben en una página", async ({
    page,
    request,
  }) => {
    // Fixture determinista: suficientes clientes para dos páginas (20 por página).
    const token = await tokenApi(request);
    const listado = await request.get(`${API_URL}/clientes?page=1&limit=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(listado.ok(), `GET /clientes devolvio ${listado.status()}`).toBe(true);
    const cuerpo = (await listado.json()) as { total: number };
    const faltan = Math.max(0, 21 - cuerpo.total);
    for (let i = 0; i < faltan; i++) {
      await crearClienteApi(request, {
        sedeId: "sede-2",
        nombres: "Cliente",
        apellidos: "Pagina",
      });
    }

    await page.reload();

    const textoPagina1 = page.getByText(/^Página 1 de \d+$/);
    await expect(textoPagina1).toBeVisible();

    const resultados = page.getByText(/^\d+ resultados$/);
    await expect(resultados).toBeVisible();
    const totalLeido = Number(((await resultados.textContent()) ?? "").split(" ")[0]);
    expect(totalLeido).toBeGreaterThanOrEqual(21);

    const primeraPagina = (await textoPagina1.textContent()) ?? "";
    const paginas = Number((primeraPagina.match(/Página (\d+) de (\d+)/) ?? [])[2]);
    expect(paginas, `no debe leerse el total de páginas en "${primeraPagina}"`).toBeGreaterThanOrEqual(2);

    // R-10: la tabla se reemplaza por "Cargando clientes..." mientras la lista
    // hidrata (page.tsx: loading -> <p>Cargando clientes...</p>); nunca se lee
    // la tabla con el refetch aun en curso (mismo patron que congelacion.spec.ts).
    await expect(page.getByText(/Cargando clientes/i)).toHaveCount(0);
    const cedulasPagina1 = await page.locator("tbody td:first-child").allTextContents();
    expect(cedulasPagina1.length).toBeGreaterThan(0);
    expect(cedulasPagina1.length).toBeLessThanOrEqual(20);

    await expect(page.getByRole("button", { name: "Anterior" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Siguiente" })).toBeEnabled();

    await page.getByRole("button", { name: "Siguiente" }).click();

    await expect(page.getByText(/^Página 2 de \d+$/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Anterior" })).toBeEnabled();

    // R-10: tras "Siguiente" el footer ya muestra la pagina 2 (estado de React)
    // pero la tabla aun no refetchea. El guard de carga cierra la ventana "en
    // curso"; el poll cierra la ventana previa al loading (tabla aun de la
    // pagina 1, sin "Cargando" en el DOM): se espera hasta que la tabla tenga
    // filas que NO son de la pagina 1 (el fixture garantiza paginas disjuntas
    // con total >= 21), condicion que una vez cumplida ya no cambia.
    await expect(page.getByText(/Cargando clientes/i)).toHaveCount(0);
    await expect
      .poll(
        async () => {
          const actuales = await page.locator("tbody td:first-child").allTextContents();
          return (
            actuales.length > 0 && actuales.some((c) => !cedulasPagina1.includes(c))
          );
        },
        { message: "la tabla debe terminar el refetch y mostrar la pagina 2" }
      )
      .toBe(true);
    const cedulasPagina2 = await page.locator("tbody td:first-child").allTextContents();
    expect(cedulasPagina2.length).toBeGreaterThan(0);
    const repetidas = cedulasPagina2.filter((c) => cedulasPagina1.includes(c));
    expect(
      repetidas,
      `las páginas deben mostrar clientes distintos, se repitieron: ${repetidas.join(", ")}`
    ).toHaveLength(0);
  });
});
