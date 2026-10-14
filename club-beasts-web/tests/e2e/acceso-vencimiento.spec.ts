import { test, expect } from "@playwright/test";
import {
  API_URL,
  cardCon,
  crearClienteApi,
  crearVigenciaApi,
  fijarPinApi,
  hoyBogota,
  loginComoClienteCon,
  loginComoDueno,
  sumarDias,
  tokenApi,
} from "./e2e-helpers";

/**
 * INC-03 / `INC03-VEN-04` + `DEC-026` — bloqueo observable del vencimiento.
 *
 * La decision DEC-026 (opcion B) fija el comportamiento:
 *  - el login por cedula/PIN **no** se bloquea por vencimiento (nunca 401
 *    `VIGENCIA_VENCIDA`; el login sigue validando credenciales),
 *  - el acceso denegado vive en el **portal** (estado `VENCIDA` visible con
 *    "Sin acceso al gimnasio") y en **recepcion** (`403 INGRESO_NO_PERMITIDO`
 *    al registrar el ingreso, sin confirmacion visible).
 *
 * Criterios cubiertos:
 *  - `INC03-VEN-04`: denegacion observable con codigo propio distinto de
 *    credenciales invalidas (`INGRESO_NO_PERMITIDO` vs
 *    `AUTH_INVALID_CREDENTIALS`).
 *  - `DEC-026`: login intacto (200 con PIN correcto, 401 solo con PIN
 *    incorrecto) y denegacion en portal + ingreso.
 *  - `INC03-VEN-03`: el estado `VENCIDA` se pinta en portal y recepcion
 *    (nunca el texto fijo "Activo").
 *
 * Fixtures: SQLite temporal aislado (DEC-012); vigencia terminada hace N
 * dias relativo a `hoyBogota()` (America/Bogota, DEC-005/006), sin depender
 * de la hora del sistema.
 *
 * Restricciones INC00-QA-01/02: sin `isVisible()` condicional, sin
 * `waitForTimeout`, skips ni `only`, sin aserciones vacias.
 */

/** Crea un cliente con vigencia VENCIDA terminada hace `diasVencida` dias. */
async function clienteVencido(
  request: import("@playwright/test").APIRequestContext,
  diasVencida: number
): Promise<{ id: string; cedula: string; fechaFin: string }> {
  const hoy = hoyBogota();
  const fechaFin = sumarDias(hoy, -diasVencida);
  const cliente = await crearClienteApi(request, { sedeId: "sede-1" });
  await crearVigenciaApi(
    request,
    cliente.id,
    sumarDias(fechaFin, -50),
    fechaFin
  );
  await fijarPinApi(request, cliente.id);
  return { ...cliente, fechaFin };
}

test.describe("DEC-026: el login con cedula/PIN sigue funcionando con la membresia vencida", () => {
  test("el login de un cliente vencido responde 200 (nunca 401) y el PIN incorrecto sigue respondiendo 401", async ({
    request,
  }) => {
    const cliente = await clienteVencido(request, 10);

    // Login correcto con la membresia VENCIDA: DEC-026 lo prohíbe bloquear.
    const login = await request.post(`${API_URL}/auth/login-cliente`, {
      data: { cedula: cliente.cedula, pin: "1234" },
    });
    expect(
      login.status(),
      "DEC-026: el vencimiento no debe bloquear el login"
    ).toBe(200);
    expect(login.status(), "el login no puede devolver 401 por vencimiento").not.toBe(401);
    const cuerpo = (await login.json()) as { token?: string };
    expect(typeof cuerpo.token, "debe entregar un token de sesion").toBe("string");

    // Control negativo: el auth sigue vivo y valida credenciales (401 real).
    const pinIncorrecto = await request.post(`${API_URL}/auth/login-cliente`, {
      data: { cedula: cliente.cedula, pin: "0000" },
    });
    expect(pinIncorrecto.status(), "el PIN incorrecto si debe dar 401").toBe(401);
    const cuerpoError = (await pinIncorrecto.json()) as { code?: string };
    expect(cuerpoError.code).toBe("AUTH_INVALID_CREDENTIALS");
    expect(cuerpoError.code).not.toBe("VIGENCIA_VENCIDA");
  });
});

test.describe("INC03-VEN-04: bloqueo observable en portal y recepcion", () => {
  test("el portal de un cliente con vigencia vencida muestra el estado vencido con 'Sin acceso al gimnasio'", async ({
    page,
    request,
  }) => {
    const cliente = await clienteVencido(request, 10);

    await loginComoClienteCon(page, cliente.cedula, "1234");
    await expect(page.getByRole("heading", { name: "Mi Portal" })).toBeVisible();

    const estado = cardCon(page, "Estado de acceso");
    await expect(estado.getByText("Vencido", { exact: true })).toBeVisible();
    await expect(estado.getByText("Sin acceso al gimnasio", { exact: true })).toBeVisible();
    await expect(estado.getByText(cliente.fechaFin, { exact: true })).toBeVisible();
    // INC03-VEN-03 / POR-02: el estado sale del backend; nunca texto fijo.
    await expect(estado.getByText("Activo", { exact: true })).toHaveCount(0);
  });

  test("recepcion rechaza el ingreso con 403 INGRESO_NO_PERMITIDO y no muestra confirmacion", async ({
    page,
    request,
  }) => {
    const cliente = await clienteVencido(request, 5);
    const token = await tokenApi(request);

    // ── Backend: codigo propio del bloqueo, distinto de credenciales.
    const res = await request.post(`${API_URL}/recepcion/ingresos`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { cedula: cliente.cedula, sedeId: "sede-1" },
    });
    expect(res.status(), "ingreso de un cliente vencido").toBe(403);
    const cuerpo = (await res.json()) as { code?: string; error?: string };
    expect(cuerpo.code).toBe("INGRESO_NO_PERMITIDO");
    expect(cuerpo.code).not.toBe("AUTH_INVALID_CREDENTIALS");
    expect(cuerpo.error).toBe(
      `La membresía no está habilitada para ingresar (vencida el ${cliente.fechaFin})`
    );

    // ── UI: el error queda visible en role=alert y NO hay exito.
    await loginComoDueno(page);
    await page.goto("/recepcion");
    await expect(page.getByRole("heading", { name: "Recepcion" })).toBeVisible();

    const ingreso = cardCon(page, "Registrar ingreso");
    await ingreso.getByLabel("Cedula de ingreso").fill(cliente.cedula);
    await ingreso.getByRole("button", { name: "Registrar ingreso" }).click();

    await expect(ingreso.getByRole("alert")).toContainText(
      "La membresía no está habilitada para ingresar"
    );
    await expect(ingreso.getByRole("alert")).toContainText(cliente.fechaFin);
    await expect(ingreso.getByRole("status")).toHaveCount(0);

    // INC03-VEN-03: la misma superficie de recepcion pinta el estado Vencido.
    const consulta = cardCon(page, "Consulta por cedula");
    await consulta.getByLabel("Cedula de consulta").fill(cliente.cedula);
    await consulta.getByRole("button", { name: "Consultar" }).click();
    await expect(consulta.getByText("Vencido", { exact: true })).toBeVisible();
    await expect(consulta.getByText("Activo", { exact: true })).toHaveCount(0);
    await expect(consulta.getByLabel("Alertas del cliente")).toBeVisible();
  });
});
