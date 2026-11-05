/**
 * INC-09 (RED) — Ficha staff: anamnesis deportiva (HU-09/HU-10 / C1 / C4).
 * Filas de la matriz de navegación APROBADA del spec INC-09:
 *   NAV-AN-07  ficha DUENO 23/23 vs RECEP 19/23 campos = 20/25 props: los 5
 *              sensibles de DEC-055 ausentes en RED y DOM + sin controles
 *   NAV-AN-08  creación con pre-llenado 1, 2, 9, 10 (DEC-056a); 3-8 vacíos
 *
 * Contrato de UI fijado por este RED (C1/C4/C7, para el GREEN T10):
 *  - Sección "Anamnesis deportiva" inline en `/clientes/[id]` (vista solo
 *    lectura por defecto; editor bajo demanda solo DUENO).
 *  - RECEP renderiza POR PRESENCIA DE CLAVE: los 5 sensibles
 *    (`rh, antecedentesMedicos, antecedentesFamiliares, enfermedadRelevante,
 *    cualEnfermedad`) no existen en el DOM ni en la respuesta de red.
 *  - DUENO ve los 23/23 campos y el botón "Modificar anamnesis".
 *  - Pre-llenado (DEC-056a): "Nombre completo", "Número de documento",
 *    "Número de contacto", "Correo electrónico"; los campos 3-8 (Sexo, RH,
 *    Edad, Fecha de nacimiento, Lugar de nacimiento, Estado civil, Dirección
 *    de residencia) nacen vacíos y editables.
 *
 * FASE RED (2026-11-04): la sección y el endpoint NO existen (GREEN T9/T10).
 * El orden de pasos deja el primer fallo rojo como aserción de pantalla.
 *
 * Restricciones INC00-QA-01/02: sin `isVisible()` condicional, skips ni
 * `only`; localizadores `exact: true` + `toHaveCount(1|0)` (C7).
 */
import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import {
  API_URL,
  crearClienteApi,
  tokenApi,
  loginComoDueno,
} from "./e2e-helpers";
import {
  CLAVES_SENSIBLES,
  ETIQUETAS_SENSIBLES,
  crearAnamnesisApi,
  loginComoRecepcionista,
  payloadConSensiblesRastreables,
  regionAnamnesis,
} from "./inc09-anamnesis-e2e-helpers";

/** Valores distintivos para probar ausencia en red y DOM. */
const VALORES_SENSIBLES = [
  "AB-",
  "consume psicoactivos",
  "Abuelo con Alzheimer",
  "Hipertension severa",
];

async function crearFichaConAnamnesis(
  request: APIRequestContext,
  opciones: { nombres?: string; apellidos?: string } = {}
) {
  const cliente = await crearClienteApi(request, {
    sedeId: "sede-1",
    nombres: opciones.nombres ?? "Anamnesis",
    apellidos: opciones.apellidos ?? "Staff",
  });
  await crearAnamnesisApi(request, cliente.id, payloadConSensiblesRastreables());
  return cliente;
}

/** Captura la respuesta de red de GET .../anamnesis del navegador. */
function capturarGetAnamnesis(page: Page): Array<{ url: string; status: number; json: () => Promise<any>; text: () => Promise<string> }> {
  const respuestas: Array<{ url: string; status: number; json: () => Promise<any>; text: () => Promise<string> }> = [];
  page.on("response", (respuesta) => {
    const url = respuesta.url();
    if (!url.startsWith(API_URL)) return;
    if (!url.includes("/anamnesis")) return;
    if (respuesta.request().method() !== "GET") return;
    respuestas.push({
      url,
      status: respuesta.status(),
      json: () => respuesta.json(),
      text: () => respuesta.text(),
    });
  });
  return respuestas;
}

test.describe("NAV-AN-07 DUENO: ficha 23/23 con los 5 sensibles", () => {
  test("la vista DUENO muestra los 23 campos y la respuesta de red trae las 5 claves sensibles", async ({
    page,
    request,
  }) => {
    const cliente = await crearFichaConAnamnesis(request, {
      nombres: "Dueno",
      apellidos: "Completo",
    });

    await loginComoDueno(page);
    const respuestas = capturarGetAnamnesis(page);
    await page.goto(`/clientes/${cliente.id}`);

    const region = regionAnamnesis(page);
    await expect(region).toHaveCount(1);

    // 23/23: los 5 sensibles visibles con sus etiquetas y valores.
    for (const etiqueta of ETIQUETAS_SENSIBLES) {
      await expect(region.getByText(etiqueta, { exact: true })).toHaveCount(1);
    }
    await expect(region.getByText("Hipertension severa", { exact: true })).toHaveCount(1);
    await expect(region.getByText("Nombre completo", { exact: true })).toHaveCount(1);

    // Control de edición bajo demanda (C1): exactamente un botón.
    await expect(
      page.getByRole("button", { name: "Modificar anamnesis", exact: true })
    ).toHaveCount(1);

    // Red: la vista DUENO trae las 5 claves con sus valores.
    await expect
      .poll(() => respuestas.length, {
        message: "la ficha debe consultar la anamnesis por red",
      })
      .toBeGreaterThan(0);
    const cuerpo = await respuestas[0].json();
    expect(cuerpo).toHaveProperty("nombreCompleto");
    for (const clave of CLAVES_SENSIBLES) {
      expect(cuerpo, `la vista DUENO trae ${clave}`).toHaveProperty(clave);
    }
  });
});

test.describe("NAV-AN-07 RECEPCIONISTA: 19/23 campos = 20/25 props sin sensibles", () => {
  test("los 5 sensibles no existen en red ni en DOM y no hay controles de edición", async ({
    page,
    request,
  }) => {
    const cliente = await crearFichaConAnamnesis(request, {
      nombres: "Recep",
      apellidos: "Parcial",
    });

    await loginComoRecepcionista(page);
    const respuestas = capturarGetAnamnesis(page);
    await page.goto(`/clientes/${cliente.id}`);

    const region = regionAnamnesis(page);
    await expect(region).toHaveCount(1);

    // Guarda positiva: la parte operativa SÍ renderiza.
    await expect(region.getByText("Nombre completo", { exact: true })).toHaveCount(1);
    await expect(region.getByText("Ana Maria Perez", { exact: true })).toHaveCount(1);
    await expect(region.getByText("EPS", { exact: true })).toHaveCount(1);

    // DOM: los 5 sensibles no existen (ni etiquetas, ni valores, ni placeholder).
    for (const etiqueta of ETIQUETAS_SENSIBLES) {
      await expect(region.getByText(etiqueta, { exact: true }), `etiqueta ${etiqueta}`).toHaveCount(0);
    }
    for (const valor of VALORES_SENSIBLES) {
      await expect(page.getByText(valor, { exact: true }), `valor ${valor}`).toHaveCount(0);
    }
    await expect(page.getByText(/restringid/i)).toHaveCount(0);

    // Controles: ninguno para RECEP (C1/C4).
    await expect(
      page.getByRole("button", { name: "Modificar anamnesis", exact: true })
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Diligenciar anamnesis", exact: true })
    ).toHaveCount(0);

    // Red (INC09-R05): las 5 claves no viajan en absoluto.
    await expect
      .poll(() => respuestas.length, {
        message: "la ficha debe consultar la anamnesis por red",
      })
      .toBeGreaterThan(0);
    expect(respuestas[0].status).toBe(200);
    const crudo = await respuestas[0].text();
    const cuerpo = JSON.parse(crudo);
    expect(cuerpo).toHaveProperty("nombreCompleto"); // guarda positiva
    for (const clave of CLAVES_SENSIBLES) {
      expect(cuerpo, `clave ${clave} ausente en red`).not.toHaveProperty(clave);
    }
    for (const valor of VALORES_SENSIBLES) {
      expect(crudo, `valor ${valor} ausente en el crudo`).not.toContain(valor);
    }
  });
});

test.describe("NAV-AN-08 creación con pre-llenado (DEC-056a)", () => {
  test("los campos 1, 2, 9, 10 nacen pre-llenados y los campos 3-8 vacíos", async ({
    page,
    request,
  }) => {
    const cliente = await crearClienteApi(request, {
      sedeId: "sede-1",
      nombres: "Anamnesis",
      apellidos: "Prefill",
    });
    // Ficha con datos conocidos para los 4 campos pre-llenables.
    const token = await tokenApi(request);
    const telefono = "3009998877";
    const email = "prefill@test.com";
    const res = await request.patch(`${API_URL}/clientes/${cliente.id}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { telefono, email },
    });
    expect(res.ok(), `PATCH /clientes/${cliente.id} devolvio ${res.status()}`).toBe(true);

    await loginComoDueno(page);
    await page.goto(`/clientes/${cliente.id}`);
    await expect(regionAnamnesis(page)).toHaveCount(1);

    await page
      .getByRole("button", { name: "Diligenciar anamnesis", exact: true })
      .click();

    // Campos 1, 2, 9, 10 pre-llenados desde la ficha (editables).
    await expect(page.getByLabel("Nombre completo", { exact: true })).toHaveValue(
      "Anamnesis Prefill"
    );
    await expect(page.getByLabel("Número de documento", { exact: true })).toHaveValue(
      cliente.cedula
    );
    await expect(page.getByLabel("Número de contacto", { exact: true })).toHaveValue(
      telefono
    );
    await expect(page.getByLabel("Correo electrónico", { exact: true })).toHaveValue(
      email
    );

    // Campos 3-8 vacíos y editables.
    await expect(page.getByLabel("Sexo", { exact: true })).toHaveValue("");
    await expect(page.getByLabel("RH", { exact: true })).toHaveValue("");
    await expect(page.getByLabel("Edad", { exact: true })).toHaveValue("");
    await expect(page.getByLabel("Fecha de nacimiento", { exact: true })).toHaveValue("");
    await expect(page.getByLabel("Lugar de nacimiento", { exact: true })).toHaveValue("");
    await expect(page.getByLabel("Estado civil", { exact: true })).toHaveValue("");
    await expect(
      page.getByLabel("Dirección de residencia", { exact: true })
    ).toHaveValue("");
  });
});

// ─── INC09-FIX-03 (SOLO pruebas) — NAV-F-04: editabilidad explícita ──────────
// Hallazgo de cobertura de la auditoría de navegación INC-09 sobre NAV-AN-08
// (DEC-056a): además de los valores pre-llenados/vacíos, el viaje ejecuta la
// EDICIÓN real de los campos 2, 9, 10 pre-llenados y de los 3-8 vacíos
// (`toBeEnabled()` + `fill`/`selectOption` + valor nuevo observado).
test.describe("NAV-F-04 editabilidad explícita del pre-llenado (DEC-056a)", () => {
  test("los campos 2, 9, 10 pre-llenados y los campos 3-8 vacíos aceptan edición", async ({
    page,
    request,
  }) => {
    const cliente = await crearClienteApi(request, {
      sedeId: "sede-1",
      nombres: "Edita",
      apellidos: "Prefill",
    });
    const token = await tokenApi(request);
    const telefono = "3009998877";
    const email = "edita@test.com";
    const res = await request.patch(`${API_URL}/clientes/${cliente.id}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { telefono, email },
    });
    expect(res.ok(), `PATCH /clientes/${cliente.id} devolvio ${res.status()}`).toBe(true);

    await loginComoDueno(page);
    await page.goto(`/clientes/${cliente.id}`);
    await expect(regionAnamnesis(page)).toHaveCount(1);
    await page
      .getByRole("button", { name: "Diligenciar anamnesis", exact: true })
      .click();

    // Campos 2, 9, 10 pre-llenados: editables (habilitados + edición real).
    const documento = page.getByLabel("Número de documento", { exact: true });
    await expect(documento).toBeEnabled();
    await documento.fill("111222333");
    await expect(documento).toHaveValue("111222333");

    const contacto = page.getByLabel("Número de contacto", { exact: true });
    await expect(contacto).toBeEnabled();
    await contacto.fill("3007776655");
    await expect(contacto).toHaveValue("3007776655");

    const correo = page.getByLabel("Correo electrónico", { exact: true });
    await expect(correo).toBeEnabled();
    await correo.fill("editado@test.com");
    await expect(correo).toHaveValue("editado@test.com");

    // Campo 1 pre-llenado (incluido por completitud del ciclo DEC-056a).
    const nombre = page.getByLabel("Nombre completo", { exact: true });
    await expect(nombre).toBeEnabled();
    await nombre.fill("Nombre Editado");
    await expect(nombre).toHaveValue("Nombre Editado");

    // Campos 3-8 vacíos: editables (habilitados + edición real).
    const sexo = page.getByLabel("Sexo", { exact: true });
    await expect(sexo).toBeEnabled();
    await sexo.selectOption("MASCULINO");
    await expect(sexo).toHaveValue("MASCULINO");

    const rh = page.getByLabel("RH", { exact: true });
    await expect(rh).toBeEnabled();
    await rh.selectOption("A-");
    await expect(rh).toHaveValue("A-");

    const edad = page.getByLabel("Edad", { exact: true });
    await expect(edad).toBeEnabled();
    await edad.fill("30");
    await expect(edad).toHaveValue("30");

    const fechaNacimiento = page.getByLabel("Fecha de nacimiento", { exact: true });
    await expect(fechaNacimiento).toBeEnabled();
    await fechaNacimiento.fill("1995-06-15");
    await expect(fechaNacimiento).toHaveValue("1995-06-15");

    const lugar = page.getByLabel("Lugar de nacimiento", { exact: true });
    await expect(lugar).toBeEnabled();
    await lugar.fill("Medellin");
    await expect(lugar).toHaveValue("Medellin");

    const estadoCivil = page.getByLabel("Estado civil", { exact: true });
    await expect(estadoCivil).toBeEnabled();
    await estadoCivil.fill("Casado");
    await expect(estadoCivil).toHaveValue("Casado");

    const direccion = page.getByLabel("Dirección de residencia", { exact: true });
    await expect(direccion).toBeEnabled();
    await direccion.fill("Calle 1 # 2-3");
    await expect(direccion).toHaveValue("Calle 1 # 2-3");
  });
});
