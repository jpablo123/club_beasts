import { test, expect, type Page } from "@playwright/test";
import {
  API_URL,
  cardCon,
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
 *
 * FIX INC09-FIX-02 (2026-11-04, patron R-10 / H-INC09-FLAKY-01): los viajes
 * `:71` y `:102` fallaban intermitentemente bajo carga porque la espera tras
 * "Guardar" era un conteo estructural con ventana fija de 5s que se agotaba
 * mientras el refetch post-creacion (`loadMembresias()`) aun no pintaba la
 * fila (14 sondeos = 0 elementos; la fila si se renderizaba despues).
 * Reproduccion deliberada pre-fix con `--repeat-each=6`: 2/12 fallos (ambos
 * `expectFilaMembresia` desde `:94`). Correccion SOLO de la forma de esperar:
 * (1) espera anclada a la respuesta real del POST de creacion
 * (`page.waitForResponse` del POST a `.../membresias-gym`, status 201
 * verificado) registrada antes del click; (2) espera por contenido unico del
 * fixture (rango de fechas del periodo) con timeout 30s; (3) presupuesto
 * `test.setTimeout(90_000)` para que las esperas ancladas quepan bajo carga.
 * Las aserciones de negocio no cambian: rango exacto dd/mm/yyyy, estado
 * Activa, 30 dias calendario inclusivos, persistencia tras recargar y el
 * rechazo 409 MEMBRESIA_SOLAPADA siguen igual.
 *
 * PIN obligatorio intacto: ningun paso relaja `debeCambiarPin` ni la
 * autenticacion. Sin `waitForTimeout`, skips ni `only`; fixtures deterministas
 * existentes sin cambios de semantica.
 *
 * FIX INC10-FIX-02 (2026-11-05, regresion base): correccion SOLO de scoping.
 * El locator global `div.space-y-3 > div` matchea ahora tambien la fila del
 * badge de "Rutina activa" (RutinaSection, markup legitimo aprobado por el
 * spec de INC-10; pasaba antes porque un bug UI ocultaba las secciones). Se
 * acota el locator al contenedor de Membresias con el patron C7 ya usado en
 * `inc05-tipos-vigencia.spec.ts` (card `div.rounded-card` con el heading
 * "Membresías" = `cardCon` de `e2e-helpers`). Las aserciones de negocio
 * (exactamente una fila por periodo, rango exacto y rechazo 409
 * MEMBRESIA_SOLAPADA) quedan intactas.
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
  // FIX INC09-FIX-02 (patron R-10): la fila nace del refetch post-creacion y
  // bajo carga supera la ventana default de 5s. Se espera por el contenido
  // unico del fixture (rango de fechas) con timeout generoso; una vez que la
  // fila con ese contenido existe, las aserciones de negocio siguientes son
  // inmediatas y no cambian.
  await expect(fila).toHaveCount(1, { timeout: 30_000 });
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
    // FIX INC09-FIX-02: presupuesto para las esperas ancladas de 30s.
    test.setTimeout(90_000);
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

    // FIX INC09-FIX-02 (patron R-10): ancla determinista a la respuesta real
    // del POST de creacion (201), registrada antes del click; la espera por la
    // fila nunca arranca antes de que la membresia exista en la API.
    const creacion = page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        new URL(res.url()).pathname === `/clientes/${cliente.id}/membresias-gym`
    );
    await page.getByRole("button", { name: "Guardar" }).click();
    expect(
      (await creacion).status(),
      "el POST de creacion de membresia debe responder 201"
    ).toBe(201);

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
    // FIX INC09-FIX-02: presupuesto para las esperas ancladas de 30s.
    test.setTimeout(90_000);
    const cliente = await crearClienteApi(request, { sedeId: "sede-1" });
    await abrirFicha(page, cliente.cedula, cliente.id);

    const inicio = hoyBogota();
    const fin = sumarDias(inicio, 29);
    const rango = `${fechaLarga(inicio)} — ${fechaLarga(fin)}`;

    // FIX INC10-FIX-02: scoping C7 al contenedor de Membresias (card
    // `div.rounded-card` con el heading "Membresías", mismo patron de
    // `inc05-tipos-vigencia.spec.ts` / `cardCon`). El locator global
    // `div.space-y-3 > div` matchea ahora tambien la fila del badge de
    // "Rutina activa" (markup legitimo de INC-10). Aserciones de negocio
    // intactas: exactamente una fila por periodo.
    const seccionMembresias = cardCon(page, "Membresías");

    // Primer periodo valido.
    await page.getByRole("button", { name: "Nueva Membresía" }).click();
    await page.getByLabel("Plan").selectOption("1m");
    await page.getByLabel("Fecha Inicio").fill(inicio);
    // FIX INC09-FIX-02 (patron R-10): ancla determinista a la respuesta real
    // del POST de creacion (201) antes del click; luego se espera por el
    // contenido unico del fixture (rango) con timeout generoso — la fila nace
    // del refetch post-creacion y bajo carga superaba la ventana de 5s. El
    // conteo de negocio "exactamente una fila" queda intacto y ahora es
    // inmediato porque la fila ya existe.
    const creacion = page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        new URL(res.url()).pathname === `/clientes/${cliente.id}/membresias-gym`
    );
    await page.getByRole("button", { name: "Guardar" }).click();
    expect(
      (await creacion).status(),
      "el POST de creacion de membresia debe responder 201"
    ).toBe(201);
    await expect(
      seccionMembresias.locator("div.space-y-3 > div").filter({ hasText: rango })
    ).toHaveCount(1, { timeout: 30_000 });
    await expect(seccionMembresias.locator("div.space-y-3 > div")).toHaveCount(1);

    // Segundo intento con el mismo rango: la UI bloquea el solapamiento.
    await page.getByRole("button", { name: "Nueva Membresía" }).click();
    await page.getByLabel("Plan").selectOption("1m");
    await page.getByLabel("Fecha Inicio").fill(inicio);
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(
      page.getByText("El período se solapa con una membresía existente.")
    ).toBeVisible();
    // FIX INC10-FIX-02: mismo scoping C7 al contenedor de Membresias (ver arriba).
    await expect(seccionMembresias.locator("div.space-y-3 > div")).toHaveCount(1);

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
