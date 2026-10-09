import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import {
  API_URL,
  crearClienteApi,
  fechaLarga,
  hoyBogota,
  loginComoDueno,
  sumarDias,
  tokenApi,
} from "./e2e-helpers";

/**
 * INC-02 (HU-15 + DEC-024) — E2E real en navegador del flujo de congelacion.
 *
 * Criterios cubiertos:
 *  - `INC02-CON-03` / `HU15-C04`: badge `CONGELADO` visible durante el rango
 *    de pausa y linea informativa de la pausa vigente.
 *  - `INC02-CON-04`: `fechaFin` extendida automaticamente por los dias
 *    congelados (inclusivos, America/Bogota) y persistida tras recargar.
 *  - `INC02-CON-05` / `DEC-017`: sin rol gestor (CLIENTE) no existen las
 *    acciones `Congelar` / `Descongelar` en la pagina y el backend responde
 *    `403 AUTH_FORBIDDEN`.
 *  - `HU15-C07` / `DEC-024`: `descongelar` sobre una pausa vigente, feedback
 *    de dias devueltos y desaparicion de la pausa.
 *  - Lock optimista INC00-MEM-03: `409 MEMBRESIA_CONFLICTO` si la ficha
 *    abierta quedo con una `version` obsoleta.
 *
 * Fixtures: SQLite temporal aislado por corrida (DEC-012) con fechas
 * dinamicas relativas a `hoyBogota()` (America/Bogota, DEC-013); nada de
 * fechas de calendario fijas. Cada test crea su propio cliente + vigencia
 * con cedula unica, por lo que los tests son independientes del orden.
 *
 * Restricciones INC00-QA-01/02: sin `isVisible()` condicional, sin
 * `waitForTimeout`, sin skips ni `only`, sin aserciones vacias.
 */

/** Texto de la seccion mientras carga la lista de membresias. */
const CARGANDO = /Cargando membresías/i;

interface VigenciaFixture {
  id: string;
  fechaInicio: string;
  fechaFin: string;
  version: number;
}

/** Vigencia GYM a traves de la misma API que usa el navegador. */
async function crearVigenciaApi(
  request: APIRequestContext,
  clienteId: string,
  fechaInicio: string,
  fechaFin: string
): Promise<VigenciaFixture> {
  const token = await tokenApi(request);
  const res = await request.post(`${API_URL}/clientes/${clienteId}/membresias-gym`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { fechaInicio, fechaFin },
  });
  const cuerpo = (await res.json()) as VigenciaFixture & { error?: string };
  expect(
    res.ok(),
    `POST /membresias-gym devolvio ${res.status()}: ${JSON.stringify(cuerpo)}`
  ).toBe(true);
  expect(typeof cuerpo.id).toBe("string");
  return {
    id: cuerpo.id,
    fechaInicio: cuerpo.fechaInicio,
    fechaFin: cuerpo.fechaFin,
    version: cuerpo.version,
  };
}

interface RangoPausa {
  fechaInicio: string;
  fechaFin: string;
  motivo: string;
  version: number;
}

/** Aplica una pausa via API (fixture de arranque de otros tests). */
async function congelarApi(
  request: APIRequestContext,
  clienteId: string,
  vigenciaId: string,
  rango: RangoPausa
): Promise<{ fechaFin: string; version: number; diasCongelados: number }> {
  const token = await tokenApi(request);
  const res = await request.post(
    `${API_URL}/clientes/${clienteId}/vigencias/${vigenciaId}/congelar`,
    {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        fechaInicio: rango.fechaInicio,
        fechaFin: rango.fechaFin,
        motivo: rango.motivo,
        version: rango.version,
      },
    }
  );
  const cuerpo = (await res.json()) as {
    fechaFin?: string;
    version?: number;
    diasCongelados?: number;
    error?: string;
  };
  expect(
    res.ok(),
    `POST .../congelar devolvio ${res.status()}: ${JSON.stringify(cuerpo)}`
  ).toBe(true);
  expect(typeof cuerpo.fechaFin).toBe("string");
  expect(typeof cuerpo.diasCongelados).toBe("number");
  return {
    fechaFin: cuerpo.fechaFin as string,
    version: cuerpo.version as number,
    diasCongelados: cuerpo.diasCongelados as number,
  };
}

/** Busca el cliente por cedula y abre su ficha (patron de `membresia.spec.ts`). */
async function abrirFicha(page: Page, cedula: string, clienteId: string): Promise<void> {
  await page.goto("/clientes");
  await page.getByPlaceholder("Buscar por cedula o nombre...").fill(cedula);
  await expect(page.getByRole("cell", { name: cedula, exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Ver ficha" }).first().click();
  await expect(page).toHaveURL(new RegExp(`/clientes/${clienteId}$`));
  await expect(page.getByRole("heading", { name: "Ficha del Cliente" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Membresías" })).toBeVisible();
  // La seccion de membresias termina de cargar cuando desaparece el texto de
  // espera (mismo patron que el fix de R-10): nunca se lee la tabla con
  // contenido todavia no hidratado.
  await expect(page.getByText(CARGANDO)).toHaveCount(0);
}

/** Unica fila de membresia cuyo rango visible es `inicio — fin`. */
function filaPorRango(page: Page, inicio: string, fin: string) {
  const rango = `${fechaLarga(inicio)} — ${fechaLarga(fin)}`;
  return page.locator("div.space-y-3 > div").filter({ hasText: rango });
}

async function loginComoCliente(page: Page): Promise<void> {
  await page.goto("/login-cliente");
  await page.getByPlaceholder("Ingresa tu cedula").fill("1234567890");
  await page.getByPlaceholder("****").fill("1234");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/.*portal/);
}

test.describe("Congelación de vigencias (INC-02 / HU-15) — DUENO", () => {
  test.beforeEach(async ({ page }) => {
    await loginComoDueno(page);
  });

  test("flujo feliz: congelar un rango contenido en la vigencia deja el badge Congelado, la pausa visible y la fechaFin extendida", async ({
    page,
    request,
  }) => {
    const hoy = hoyBogota();
    const cliente = await crearClienteApi(request, { sedeId: "sede-1" });
    const vigencia = await crearVigenciaApi(
      request,
      cliente.id,
      sumarDias(hoy, -30),
      sumarDias(hoy, 30)
    );

    await abrirFicha(page, cliente.cedula, cliente.id);
    await expect(filaPorRango(page, vigencia.fechaInicio, vigencia.fechaFin)).toHaveCount(1);
    await expect(
      filaPorRango(page, vigencia.fechaInicio, vigencia.fechaFin).getByText("Activa", {
        exact: true,
      })
    ).toHaveCount(1);

    // Rango de pausa contenido en la vigencia, que cubre hoy y se extiende al
    // futuro: N = 10 dias inclusivos.
    const pausaInicio = sumarDias(hoy, -2);
    const pausaFin = sumarDias(hoy, 7);
    const nuevaFechaFin = sumarDias(vigencia.fechaFin, 10);
    const motivo = "Viaje de trabajo";

    await page.getByRole("button", { name: "Congelar", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Congelar membresía" })).toBeVisible();

    await page.getByLabel("Fecha de inicio").fill(pausaInicio);
    await page.getByLabel("Fecha de fin").fill(pausaFin);
    await page.getByLabel("Motivo").fill(motivo);
    await page.getByRole("button", { name: "Aplicar congelación" }).click();

    // Feedback de exito: rango + nueva fechaFin + dias congelados.
    const exito = page.getByRole("status");
    await expect(exito).toContainText("Congelación registrada");
    await expect(exito).toContainText(`del ${fechaLarga(pausaInicio)} al ${fechaLarga(pausaFin)}`);
    await expect(exito).toContainText(`la membresía vence el ${fechaLarga(nuevaFechaFin)}`);
    await expect(exito).toContainText("10 días congelados");

    // INC02-CON-03: badge CONGELADO + pausa vigente visible en la seccion.
    const fila = filaPorRango(page, vigencia.fechaInicio, nuevaFechaFin);
    await expect(fila).toHaveCount(1);
    await expect(fila.getByText("Congelado", { exact: true })).toHaveCount(1);
    await expect(fila).toContainText(
      `Pausa: ${fechaLarga(pausaInicio)} — ${fechaLarga(pausaFin)} · ${motivo}`
    );
    // La pausa vigente sustituye congelar por las acciones de DEC-024.
    await expect(page.getByRole("button", { name: "Descongelar", exact: true })).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Congelar", exact: true })).toHaveCount(0);

    // INC02-CON-04: la extension persiste tras recargar la ficha.
    await page.reload();
    await expect(page.getByRole("heading", { name: "Membresías" })).toBeVisible();
    await expect(page.getByText(CARGANDO)).toHaveCount(0);
    const filaRecargada = filaPorRango(page, vigencia.fechaInicio, nuevaFechaFin);
    await expect(filaRecargada).toHaveCount(1);
    await expect(filaRecargada.getByText("Congelado", { exact: true })).toHaveCount(1);
    await expect(filaRecargada).toContainText(
      `Pausa: ${fechaLarga(pausaInicio)} — ${fechaLarga(pausaFin)} · ${motivo}`
    );
  });

  test("pausa futura contenido en la vigencia extiende la fechaFin pero el estado sigue Activa", async ({
    page,
    request,
  }) => {
    const hoy = hoyBogota();
    const cliente = await crearClienteApi(request, { sedeId: "sede-1" });
    const vigencia = await crearVigenciaApi(
      request,
      cliente.id,
      sumarDias(hoy, -30),
      sumarDias(hoy, 30)
    );

    await abrirFicha(page, cliente.cedula, cliente.id);

    // Rango 100% futuro (hoy < inicio): N = 10 dias inclusivos.
    const pausaInicio = sumarDias(hoy, 5);
    const pausaFin = sumarDias(hoy, 14);
    const nuevaFechaFin = sumarDias(vigencia.fechaFin, 10);

    await page.getByRole("button", { name: "Congelar", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Congelar membresía" })).toBeVisible();
    await page.getByLabel("Fecha de inicio").fill(pausaInicio);
    await page.getByLabel("Fecha de fin").fill(pausaFin);
    await page.getByLabel("Motivo").fill("Viaje de trabajo");
    await page.getByRole("button", { name: "Aplicar congelación" }).click();

    await expect(page.getByRole("status")).toContainText(
      `la membresía vence el ${fechaLarga(nuevaFechaFin)}`
    );
    await expect(page.getByRole("status")).toContainText("10 días congelados");

    const fila = filaPorRango(page, vigencia.fechaInicio, nuevaFechaFin);
    await expect(fila).toHaveCount(1);
    // HU15-C03: CONGELADO solo aplica cuando hoy cae dentro del rango; una
    // pausa futura conserva el estado base calculado (ACTIVA).
    await expect(fila.getByText("Activa", { exact: true })).toHaveCount(1);
    await expect(fila.getByText("Congelado", { exact: true })).toHaveCount(0);
    // La pausa futura si es vigente: se informa y ofrece descongelar/editar.
    await expect(fila).toContainText(
      `Pausa: ${fechaLarga(pausaInicio)} — ${fechaLarga(pausaFin)} · Viaje de trabajo`
    );
    await expect(page.getByRole("button", { name: "Descongelar", exact: true })).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Editar congelación", exact: true })).toHaveCount(
      1
    );
  });

  test("descongelar una pausa vigente quita la pausa y muestra los dias devueltos", async ({
    page,
    request,
  }) => {
    const hoy = hoyBogota();
    const cliente = await crearClienteApi(request, { sedeId: "sede-1" });
    const vigencia = await crearVigenciaApi(
      request,
      cliente.id,
      sumarDias(hoy, -30),
      sumarDias(hoy, 30)
    );

    // Fixture: pausa en curso [hoy-2, hoy+7] aplicada via API (version 1 -> 2,
    // fechaFin extendida en 10 dias).
    const pausa = await congelarApi(request, cliente.id, vigencia.id, {
      fechaInicio: sumarDias(hoy, -2),
      fechaFin: sumarDias(hoy, 7),
      motivo: "Viaje de trabajo",
      version: vigencia.version,
    });
    expect(pausa.diasCongelados).toBe(10);
    expect(pausa.fechaFin).toBe(sumarDias(vigencia.fechaFin, 10));

    await abrirFicha(page, cliente.cedula, cliente.id);
    const filaCongelada = filaPorRango(page, vigencia.fechaInicio, pausa.fechaFin);
    await expect(filaCongelada).toHaveCount(1);
    await expect(filaCongelada.getByText("Congelado", { exact: true })).toHaveCount(1);
    await expect(filaCongelada).toContainText("Pausa: ");

    await page.getByRole("button", { name: "Descongelar", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Descongelar membresía" })).toBeVisible();
    await expect(page.getByText(/Se finalizará la pausa del/)).toHaveCount(1);
    await page.getByRole("button", { name: "Confirmar descongelación" }).click();

    // DEC-024: dias devueltos = (hoy+7) - hoy + 1 = 8; fechaFin = extendida - 8.
    const diasDevueltos = 8;
    const fechaFinDevuelta = sumarDias(pausa.fechaFin, -diasDevueltos);
    expect(fechaFinDevuelta).toBe(sumarDias(vigencia.fechaFin, 2));

    const exito = page.getByRole("status");
    await expect(exito).toContainText("Congelación finalizada");
    await expect(exito).toContainText(`la membresía vence el ${fechaLarga(fechaFinDevuelta)}`);
    await expect(exito).toContainText("8 días devueltos");

    // La pausa desaparece: estado base Activa y acciones de congelar de nuevo.
    const fila = filaPorRango(page, vigencia.fechaInicio, fechaFinDevuelta);
    await expect(fila).toHaveCount(1);
    await expect(fila.getByText("Activa", { exact: true })).toHaveCount(1);
    await expect(fila.getByText("Congelado", { exact: true })).toHaveCount(0);
    await expect(fila).not.toContainText("Pausa:");
    await expect(page.getByRole("button", { name: "Congelar", exact: true })).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Descongelar", exact: true })).toHaveCount(0);

    // Persiste tras recargar.
    await page.reload();
    await expect(page.getByRole("heading", { name: "Membresías" })).toBeVisible();
    await expect(page.getByText(CARGANDO)).toHaveCount(0);
    const filaRecargada = filaPorRango(page, vigencia.fechaInicio, fechaFinDevuelta);
    await expect(filaRecargada).toHaveCount(1);
    await expect(filaRecargada).not.toContainText("Pausa:");
    await expect(filaRecargada.getByText("Activa", { exact: true })).toHaveCount(1);
  });

  test("una ficha con version obsoleta recibe 409 MEMBRESIA_CONFLICTO y no aplica la pausa", async ({
    page,
    request,
  }) => {
    const hoy = hoyBogota();
    const cliente = await crearClienteApi(request, { sedeId: "sede-1" });
    const vigencia = await crearVigenciaApi(
      request,
      cliente.id,
      sumarDias(hoy, -30),
      sumarDias(hoy, 30)
    );

    await abrirFicha(page, cliente.cedula, cliente.id);
    await page.getByRole("button", { name: "Congelar", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Congelar membresía" })).toBeVisible();

    await page.getByLabel("Fecha de inicio").fill(hoy);
    await page.getByLabel("Fecha de fin").fill(sumarDias(hoy, 5));
    await page.getByLabel("Motivo").fill("Cambio de planes");

    // Otra operacion avanza la version (1 -> 2) mientras el formulario esta
    // abierto: el snapshot de la ficha queda obsoleto.
    const actualizada = await congelarApi(request, cliente.id, vigencia.id, {
      fechaInicio: sumarDias(hoy, -2),
      fechaFin: sumarDias(hoy, 7),
      motivo: "Viaje de trabajo",
      version: vigencia.version,
    });
    expect(actualizada.version).toBe(vigencia.version + 1);

    await page.getByRole("button", { name: "Aplicar congelación" }).click();

    // 409 MEMBRESIA_CONFLICTO (orden 49.1 del spec): se informa al usuario y
    // el formulario sigue abierto sin feedback de exito.
    await expect(
      page.getByText("Los datos fueron modificados por otro usuario. Recargue e intente nuevamente.")
    ).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "Congelar membresía" })).toBeVisible();
    await expect(page.getByRole("status")).toHaveCount(0);
    // La operacion rechazada no dejo pausa: la fila conserva sus acciones.
    await expect(page.getByRole("button", { name: "Congelar", exact: true })).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Descongelar", exact: true })).toHaveCount(0);
  });
});

test.describe("Congelación de vigencias — permisos DEC-017 (INC02-CON-05)", () => {
  test("una sesion CLIENTE no ve las acciones Congelar/Descongelar y el backend responde 403", async ({
    page,
    request,
  }) => {
    const hoy = hoyBogota();
    const cliente = await crearClienteApi(request, { sedeId: "sede-1" });
    const vigencia = await crearVigenciaApi(
      request,
      cliente.id,
      sumarDias(hoy, -30),
      sumarDias(hoy, 30)
    );

    await loginComoCliente(page);
    await expect(page.getByRole("heading", { name: "Mi Portal" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Congelar", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Descongelar", exact: true })).toHaveCount(0);

    // La ficha de gestion no es alcanzable sin rol gestor: middleware -> /portal.
    await page.goto(`/clientes/${cliente.id}`);
    await expect(page).toHaveURL(/.*portal/);
    await expect(page.getByRole("heading", { name: "Mi Portal" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Congelar", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Descongelar", exact: true })).toHaveCount(0);

    // Autoridad del backend para la misma sesion CLIENTE: 403 AUTH_FORBIDDEN.
    const login = await request.post(`${API_URL}/auth/login-cliente`, {
      data: { cedula: "1234567890", pin: "1234" },
    });
    expect(login.ok(), `POST /auth/login-cliente devolvio ${login.status()}`).toBe(true);
    const { token } = (await login.json()) as { token: string };

    // La sesion CLIENTE ni siquiera puede listar las vigencias (DEC-017).
    const lectura = await request.get(`${API_URL}/clientes/${cliente.id}/membresias-gym`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const cuerpoLectura = (await lectura.json()) as { code?: string };
    expect(lectura.status(), JSON.stringify(cuerpoLectura)).toBe(403);
    expect(cuerpoLectura.code).toBe("AUTH_FORBIDDEN");

    const respuesta = await request.post(
      `${API_URL}/clientes/${cliente.id}/vigencias/${vigencia.id}/congelar`,
      {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          fechaInicio: hoy,
          fechaFin: sumarDias(hoy, 5),
          motivo: "Intento sin rol gestor",
          version: vigencia.version,
        },
      }
    );
    expect(respuesta.status()).toBe(403);
    const cuerpo = (await respuesta.json()) as { code?: string; error?: string };
    expect(cuerpo.code).toBe("AUTH_FORBIDDEN");
    expect(cuerpo.error).toBe("No tienes permisos para realizar esta acción.");
  });
});
