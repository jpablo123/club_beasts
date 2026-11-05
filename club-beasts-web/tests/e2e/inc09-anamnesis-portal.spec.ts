/**
 * INC-09 (RED) — Portal del cliente: anamnesis deportiva (HU-28 / C2).
 * Filas de la matriz de navegación APROBADA del spec INC-09:
 *   NAV-AN-01  /portal/anamnesis con datos -> secciones S1-S4, solo lectura
 *   NAV-AN-02  /portal/anamnesis SIN_REGISTRO -> mensaje claro, sin formulario
 *   NAV-AN-03  URL directa/recarga/atras -> conserva vista, sin datos ajenos
 *   NAV-AN-04  URL staff manipulada por CLIENTE -> redirect a /portal sin datos
 *   NAV-AN-09  DEC-060: sinMembresiaActiva -> link no pintado; URL directa
 *              deriva al aviso DEC-051
 *
 * Contrato de UI fijado por este RED (C2/C7, para el GREEN T10):
 *  - Pagina nueva `/portal/anamnesis` con entrada = link "Mi anamnesis" en
 *    `/portal` (fuera de <nav>), pintado SOLO con servicio vigente (DEC-060).
 *  - Vista solo lectura: `region "Anamnesis deportiva"` con las 4 secciones
 *    (encabezados exactos de `SECCIONES_ANAMNESIS`) y SIN controles de
 *    edición ("Aplicar cambios" toHaveCount(0)).
 *  - SIN_REGISTRO: mensaje literal "Aun no hay una anamnesis registrada para
 *    este cliente." sin formulario editable.
 *  - DEC-060: con `sinMembresiaActiva` el link no se pinta y la URL directa
 *    deriva al aviso DEC-051 ("No tienes una membresia activa").
 *
 * FASE RED (2026-11-04): `/portal/anamnesis`, el link y los endpoints de
 * anamnesis NO existen (GREEN T9/T10). Los tests fallan por COMPORTAMIENTO
 * AUSENTE. Nota de aplicabilidad: la aserción "link no pintado" de NAV-AN-09
 * es débil en rojo (hoy no existe ningún link); su contrapartida positiva es
 * NAV-AN-01 (`toHaveCount(1)` con servicio vigente, mismos localizadores).
 *
 * Restricciones INC00-QA-01/02: sin `isVisible()` condicional, `waitForTimeout`,
 * skips ni `only`; localizadores `exact: true` + `toHaveCount(1|0)` (C7).
 */
import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import {
  cambiarEstadoCliente,
  crearClienteApi,
  crearClientePortalApi,
  crearVigenciaApi,
  hoyBogota,
  loginComoClienteCon,
  sumarDias,
  type ClienteFixture,
} from "./e2e-helpers";
import {
  ENCABEZADOS_SECCIONES,
  MENSAJE_SIN_REGISTRO,
  crearAnamnesisApi,
  payloadAnamnesisCompleto,
  regionAnamnesis,
} from "./inc09-anamnesis-e2e-helpers";

const PIN_CLIENTE = "1234";
const WEB_URL = "http://localhost:3000";
const TITULO_AVISO = "No tienes una membresia activa";

/** Cliente portal con GYM ACTIVA (link "Mi anamnesis" pintado, DEC-060). */
async function crearClienteConServicio(
  request: APIRequestContext,
  opciones: { nombres?: string; apellidos?: string } = {}
): Promise<ClienteFixture> {
  const cliente = await crearClientePortalApi(request, {
    sedeId: "sede-1",
    nombres: opciones.nombres ?? "Anamnesis",
    apellidos: opciones.apellidos ?? "Portal",
  });
  await cambiarEstadoCliente(request, cliente.id, "ACTIVO");
  await crearVigenciaApi(
    request,
    cliente.id,
    hoyBogota(),
    sumarDias(hoyBogota(), 30)
  );
  return cliente;
}

/** Cliente portal SIN ninguna vigencia -> sinMembresiaActiva (INC-06 R1). */
async function crearClienteSinServicio(
  request: APIRequestContext
): Promise<ClienteFixture> {
  const cliente = await crearClientePortalApi(request, {
    sedeId: "sede-1",
    nombres: "Sin",
    apellidos: "Servicio",
  });
  await cambiarEstadoCliente(request, cliente.id, "ACTIVO");
  return cliente;
}

function linkMiAnamnesis(page: Page) {
  return page.getByRole("link", { name: "Mi anamnesis", exact: true });
}

test.describe("NAV-AN-01 /portal/anamnesis con datos (CLIENTE)", () => {
  test("el link 'Mi anamnesis' abre la vista con las 4 secciones S1-S4 en solo lectura", async ({
    page,
    request,
  }) => {
    const cliente = await crearClienteConServicio(request, {
      nombres: "Con",
      apellidos: "Datos",
    });
    await crearAnamnesisApi(
      request,
      cliente.id,
      payloadAnamnesisCompleto({
        objetivosEntrenamiento: "Objetivos del cliente A",
      })
    );

    await loginComoClienteCon(page, cliente.cedula, PIN_CLIENTE);
    await expect(linkMiAnamnesis(page)).toHaveCount(1); // DEC-060: con servicio

    await linkMiAnamnesis(page).click();
    await expect(page).toHaveURL(/\/portal\/anamnesis/);

    const region = regionAnamnesis(page);
    await expect(region).toHaveCount(1);

    // AN-30: las 4 secciones exactas del Anexo, en orden.
    for (const encabezado of ENCABEZADOS_SECCIONES) {
      await expect(
        region.getByRole("heading", { name: encabezado, exact: true })
      ).toHaveCount(1);
    }

    // Valores propios visibles (incluidos sus sensibles: son datos del titular).
    await expect(region.getByText("Ana Maria Perez", { exact: true })).toHaveCount(1);
    await expect(
      region.getByText("Objetivos del cliente A", { exact: true })
    ).toHaveCount(1);

    // Solo lectura (AN-29): ningún control de edición en el portal.
    await expect(
      page.getByRole("button", { name: "Aplicar cambios", exact: true })
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Diligenciar anamnesis", exact: true })
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Modificar anamnesis", exact: true })
    ).toHaveCount(0);
  });
});

test.describe("NAV-AN-02 /portal/anamnesis SIN_REGISTRO", () => {
  test("muestra el mensaje claro sin formulario editable", async ({
    page,
    request,
  }) => {
    const cliente = await crearClienteConServicio(request, {
      nombres: "Sin",
      apellidos: "Registro",
    });

    await loginComoClienteCon(page, cliente.cedula, PIN_CLIENTE);
    await expect(linkMiAnamnesis(page)).toHaveCount(1);
    await linkMiAnamnesis(page).click();
    await expect(page).toHaveURL(/\/portal\/anamnesis/);

    await expect(
      page.getByText(MENSAJE_SIN_REGISTRO, { exact: true })
    ).toHaveCount(1);
    await expect(
      page.getByRole("button", { name: "Aplicar cambios", exact: true })
    ).toHaveCount(0);
  });
});

test.describe("NAV-AN-03 URL directa / recarga / atras", () => {
  test("la recarga conserva la vista y el atras no expone datos ajenos", async ({
    page,
    request,
  }) => {
    const cliente = await crearClienteConServicio(request, {
      nombres: "Propia",
      apellidos: "Vista",
    });
    await crearAnamnesisApi(
      request,
      cliente.id,
      payloadAnamnesisCompleto({
        objetivosEntrenamiento: "Objetivos del cliente A",
      })
    );
    // Cliente B cuyos datos NO deben aparecer jamás (AN-31/NAV-AN-04).
    const clienteB = await crearClienteConServicio(request, {
      nombres: "Ajena",
      apellidos: "Vista",
    });
    await crearAnamnesisApi(
      request,
      clienteB.id,
      payloadAnamnesisCompleto({
        objetivosEntrenamiento: "Objetivos del cliente B",
      })
    );

    await loginComoClienteCon(page, cliente.cedula, PIN_CLIENTE);

    // URL directa.
    await page.goto("/portal/anamnesis");
    await expect(page).toHaveURL(/\/portal\/anamnesis/);
    await expect(regionAnamnesis(page)).toHaveCount(1);

    // Recarga: conserva la vista (es dato del servidor, no estado de navegación).
    await page.reload();
    await expect(regionAnamnesis(page)).toHaveCount(1);
    await expect(
      regionAnamnesis(page).getByText("Objetivos del cliente A", { exact: true })
    ).toHaveCount(1);

    // URL staff manipulada -> middleware redirige exactamente a /portal.
    await page.goto(`${WEB_URL}/clientes/${clienteB.id}`);
    await expect(page).toHaveURL(/\/portal\/?$/);

    // Atras: vuelve a SU anamnesis; jamás datos de B.
    await page.goBack();
    await expect(page).toHaveURL(/\/portal\/anamnesis/);
    await expect(regionAnamnesis(page)).toHaveCount(1);
    await expect(
      regionAnamnesis(page).getByText("Objetivos del cliente B", { exact: true })
    ).toHaveCount(0);
    await expect(
      page.getByText("Objetivos del cliente B", { exact: true })
    ).toHaveCount(0);
  });
});

test.describe("NAV-AN-04 URL staff manipulada por CLIENTE", () => {
  test("la URL de la ficha de otro cliente redirige a /portal sin exponer datos", async ({
    page,
    request,
  }) => {
    const clienteA = await crearClienteConServicio(request, {
      nombres: "Cliente",
      apellidos: "Alfa",
    });
    const clienteB = await crearClienteConServicio(request, {
      nombres: "Cliente",
      apellidos: "Beta",
    });
    await crearAnamnesisApi(
      request,
      clienteB.id,
      payloadAnamnesisCompleto({
        objetivosEntrenamiento: "Objetivos del cliente B",
      })
    );

    await loginComoClienteCon(page, clienteA.cedula, PIN_CLIENTE);
    await page.goto(`${WEB_URL}/clientes/${clienteB.id}`);

    await expect(page).toHaveURL(/\/portal\/?$/);
    // Sin ningún dato de B ni de su anamnesis.
    await expect(regionAnamnesis(page)).toHaveCount(0);
    await expect(
      page.getByText("Objetivos del cliente B", { exact: true })
    ).toHaveCount(0);
  });
});

test.describe("NAV-AN-09 DEC-060: acceso gateado por servicio vigente", () => {
  test("con sinMembresiaActiva el link no se pinta y la URL directa deriva al aviso", async ({
    page,
    request,
  }) => {
    const cliente = await crearClienteSinServicio(request);

    await loginComoClienteCon(page, cliente.cedula, PIN_CLIENTE);
    await expect(page).toHaveURL(/\/portal\/?$/);

    // Guarda positiva: el cliente real está en el estado sin membresía activa
    // (aviso DEC-051 a pantalla completa).
    await expect(
      page.getByRole("heading", { name: TITULO_AVISO, exact: true })
    ).toHaveCount(1);

    // DEC-060: el link no se pinta sin servicio vigente.
    await expect(linkMiAnamnesis(page)).toHaveCount(0);

    // URL directa: DERIVA a /portal (redirección exacta) con el aviso, sin datos.
    await page.goto("/portal/anamnesis");
    await expect(page).toHaveURL(/\/portal\/?$/);
    await expect(
      page.getByRole("heading", { name: TITULO_AVISO, exact: true })
    ).toHaveCount(1);
    await expect(regionAnamnesis(page)).toHaveCount(0);
    await expect(
      page.getByText("Ana Maria Perez", { exact: true })
    ).toHaveCount(0);
  });
});
