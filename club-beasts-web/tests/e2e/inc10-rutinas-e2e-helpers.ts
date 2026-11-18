/**
 * INC-10 (RED) — helpers E2E de rutinas (matriz NAV-RU-01..24, re-escopos
 * C2/C7 del spec).
 *
 * No modifica `e2e-helpers.ts` (base intacta): aquí viven los fixtures y
 * localizadores propios del incremento.
 *
 * Set de localizadores C3 (ratificados, `exact: true`):
 *  - Regiones: "Rutinas", "Rutina activa", "Historial de rutinas", "Mi rutina".
 *  - Botones: "Crear rutina", "Modificar rutina", "Aplicar cambios",
 *    "Descartar cambios", "Asignar rutina", "Confirmar asignación",
 *    "Agregar sesión", "Agregar ejercicio", "Agregar serie", "Quitar serie",
 *    "Agregar macrociclo", "Agregar mesociclo", "Agregar microciclo",
 *    "Ver versión asignada", "Volver al listado", "Volver a la ficha",
 *    "Volver al portal", "Si, descartar", "Seguir editando".
 *  - Labels: "Inicio de la asignación" (NUNCA "Fecha de inicio"),
 *    "Nombre de la rutina", "Tipo de rutina", "Nombre", "Rutina",
 *    "Notas de la serie" (NUNCA "Observaciones").
 *  - Badges: "ACTIVA" | "CERRADA" | "SIN_RUTINA" | "OCULTA_POR_VIGENCIA"
 *    (mayúsculas; sin choque con los exactos base "Activo"/"Activa").
 *  - Mensajes: "No tienes una rutina activa" (SIN_RUTINA_MENSAJE),
 *    "Aun no hay rutinas registradas" (listado vacío),
 *    "Aun no hay rutinas asignadas" (historial vacío),
 *    "Rutina no encontrada" (404 de detalle), "Cambios sin guardar" (C5).
 *  - Selector de tipo en /rutinas/nueva: botones "Rutina generica",
 *    "Rutina de induccion", "Rutina personalizada" (DEC-018/DEC-064).
 *
 * Invariantes C3: 1 único heading "Mi Rutina" en /portal (el acceso es el
 * link "Mi rutina activa", nunca un heading).
 *
 * Substrings prohibidos (C7) verificados SOLO dentro de las regiones/pantallas
 * NUEVAS (el Navbar base "Salir" y el "Cerrar sesion" del portal son UI
 * preexistente fuera de alcance):
 *   Editar, Guardar, Cancelar, Observaciones, Estado, Motivo,
 *   Fecha de inicio, Fecha de fin, Consultar, Ver ficha, Nombres,
 *   Ingresar, Salir, Registrar ingreso, Cerrar sesion.
 */
import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { API_URL, hoyBogota, sumarDias, tokenApi } from "./e2e-helpers";

// ─── Localizadores C3 ────────────────────────────────────────────────────────

export const REGION_RUTINAS = "Rutinas";
export const REGION_RUTINA_ACTIVA = "Rutina activa";
export const REGION_HISTORIAL = "Historial de rutinas";
export const REGION_MI_RUTINA = "Mi rutina";

export const BTN_CREAR_RUTINA = "Crear rutina";
export const BTN_MODIFICAR_RUTINA = "Modificar rutina";
export const BTN_APLICAR_CAMBIOS = "Aplicar cambios";
export const BTN_DESCARTAR_CAMBIOS = "Descartar cambios";
export const BTN_ASIGNAR_RUTINA = "Asignar rutina";
export const BTN_CONFIRMAR_ASIGNACION = "Confirmar asignación";
export const BTN_VER_VERSION = "Ver versión asignada";
export const BTN_VOLVER_LISTADO = "Volver al listado";
export const BTN_VOLVER_FICHA = "Volver a la ficha";
export const BTN_VOLVER_PORTAL = "Volver al portal";
export const BTN_SI_DESCARTAR = "Si, descartar";
export const BTN_SEGUIR_EDITANDO = "Seguir editando";

export const LABEL_INICIO_ASIGNACION = "Inicio de la asignación";
export const SIN_RUTINA_MENSAJE = "No tienes una rutina activa";
export const LISTADO_VACIO_MENSAJE = "Aun no hay rutinas registradas";
export const HISTORIAL_VACIO_MENSAJE = "Aun no hay rutinas asignadas";
export const RUTINA_NO_ENCONTRADA_MENSAJE = "Rutina no encontrada";
export const BANNER_CAMBIOS_SIN_GUARDAR = "Cambios sin guardar";
export const TITULO_AVISO = "No tienes una membresia activa";

/** Substrings prohibidos C7 (verificados dentro de las regiones nuevas). */
export const PROHIBIDOS = [
  "Editar",
  "Guardar",
  "Cancelar",
  "Observaciones",
  "Estado",
  "Motivo",
  "Fecha de inicio",
  "Fecha de fin",
  "Consultar",
  "Ver ficha",
  "Nombres",
  "Ingresar",
  "Salir",
  "Registrar ingreso",
  "Cerrar sesion",
] as const;

// ─── Scopes de región ────────────────────────────────────────────────────────

export function regionRutinas(page: Page) {
  return page.getByRole("region", { name: REGION_RUTINAS, exact: true });
}

export function regionRutinaActiva(page: Page) {
  return page.getByRole("region", { name: REGION_RUTINA_ACTIVA, exact: true });
}

export function regionHistorial(page: Page) {
  return page.getByRole("region", { name: REGION_HISTORIAL, exact: true });
}

export function regionMiRutina(page: Page) {
  return page.getByRole("region", { name: REGION_MI_RUTINA, exact: true });
}

/** Tarjeta "Mi Rutina" de /portal (heading único, acceso por link). */
export function cardMiRutina(page: Page) {
  return page
    .locator("div.rounded-card")
    .filter({ has: page.getByRole("heading", { name: "Mi Rutina", exact: true }) });
}

/**
 * Assert C7: ningún nombre accesible de control dentro del scope contiene los
 * substrings prohibidos. Requiere una guarda positiva previa en el test.
 */
export async function verificarSinProhibidos(
  scope: Page | import("@playwright/test").Locator,
  contexto: string
): Promise<void> {
  const nombres: string[] = [];
  for (const rol of ["button", "link", "textbox", "combobox", "checkbox", "radio"]) {
    const controles = scope.getByRole(rol as any);
    const total = await controles.count();
    for (let i = 0; i < total; i++) {
      const nombre = (await controles.nth(i).getAttribute("aria-label")) ?? "";
      const texto = await controles.nth(i).innerText().catch(() => "");
      const etiqueta = await controles
        .nth(i)
        .evaluate((el: HTMLElement) => {
          const id = el.getAttribute("id");
          if (!id) return "";
          const label = document.querySelector(`label[for="${id}"]`);
          return label ? label.textContent ?? "" : "";
        })
        .catch(() => "");
      nombres.push(`${nombre}\n${texto}\n${etiqueta}`);
    }
  }
  const unido = nombres.join("\n");
  for (const prohibido of PROHIBIDOS) {
    expect(
      unido.includes(prohibido),
      `${contexto}: substring prohibido '${prohibido}' en los controles del scope`
    ).toBe(false);
  }
}

// ─── Fixtures de rutinas via API (RED: fallo explícito documentado) ──────────

export interface RespuestaRutina {
  id: string;
  nombre: string;
  tipoRutina: string;
}

/**
 * Crea una rutina base via API (fixture). Si el endpoint aún no existe (RED),
 * el fallo es explícito y documentado: comportamiento ausente, no fixture rota.
 */
export async function crearRutinaBaseApi(
  request: APIRequestContext,
  payload: Record<string, unknown>
): Promise<RespuestaRutina> {
  const token = await tokenApi(request);
  const res = await request.post(`${API_URL}/rutinas`, {
    headers: { Authorization: `Bearer ${token}` },
    data: payload,
  });
  expect(
    res.ok(),
    `FIXTURE INC-10 (RED): POST /rutinas devolvio ${res.status()} (esperado 201). ` +
      `Si es 404 el endpoint de rutinas aun no existe (GREEN T7) — fallo de ` +
      `comportamiento ausente esperado. ${await res.text()}`
  ).toBe(true);
  return (await res.json()) as RespuestaRutina;
}

/** Crea una rutina personalizada via API (fixture) con la misma tolerancia RED. */
export async function crearRutinaPersonalizadaApi(
  request: APIRequestContext,
  payload: Record<string, unknown>
): Promise<RespuestaRutina> {
  const token = await tokenApi(request);
  const res = await request.post(`${API_URL}/rutinas-personalizadas`, {
    headers: { Authorization: `Bearer ${token}` },
    data: payload,
  });
  expect(
    res.ok(),
    `FIXTURE INC-10 (RED): POST /rutinas-personalizadas devolvio ${res.status()} ` +
      `(esperado 201). Endpoint ausente hasta GREEN T7. ${await res.text()}`
  ).toBe(true);
  return (await res.json()) as RespuestaRutina;
}

/** Asigna una rutina a un cliente via API (fixture) — tolerancia RED. */
export async function asignarRutinaApi(
  request: APIRequestContext,
  clienteId: string,
  rutinaId: string,
  fechaInicio?: string
): Promise<void> {
  const token = await tokenApi(request);
  const res = await request.post(`${API_URL}/clientes/${clienteId}/rutinas/asignacion`, {
    headers: { Authorization: `Bearer ${token}` },
    data: fechaInicio ? { rutinaId, fechaInicio } : { rutinaId },
  });
  expect(
    res.ok(),
    `FIXTURE INC-10 (RED): POST .../rutinas/asignacion devolvio ${res.status()} ` +
      `(esperado 201). Endpoint ausente hasta GREEN T7. ${await res.text()}`
  ).toBe(true);
}

/** PATCH /rutinas/:rutinaId via API (fixture de edición) — tolerancia RED. */
export async function actualizarRutinaApi(
  request: APIRequestContext,
  rutinaId: string,
  payload: Record<string, unknown>
): Promise<void> {
  const token = await tokenApi(request);
  const res = await request.patch(`${API_URL}/rutinas/${rutinaId}`, {
    headers: { Authorization: `Bearer ${token}` },
    data: payload,
  });
  expect(
    res.ok(),
    `FIXTURE INC-10 (RED): PATCH /rutinas/${rutinaId} devolvio ${res.status()} ` +
      `(esperado 200). Endpoint ausente hasta GREEN T7. ${await res.text()}`
  ).toBe(true);
}

/** Vigencia del servicio personalizado via API (endpoint YA ACEPTADO HU-13). */
export async function crearVigenciaPersonalizadaApi(
  request: APIRequestContext,
  clienteId: string,
  fechaInicio: string,
  fechaFin: string
): Promise<void> {
  const token = await tokenApi(request);
  const res = await request.post(
    `${API_URL}/clientes/${clienteId}/servicios-personalizado`,
    {
      headers: { Authorization: `Bearer ${token}` },
      data: { fechaInicio, fechaFin },
    }
  );
  expect(
    res.ok(),
    `FIXTURE INC-10: POST /clientes/${clienteId}/servicios-personalizado devolvio ` +
      `${res.status()}: ${await res.text()}`
  ).toBe(true);
}

// ─── Payloads canónicos (HU-18/HU-19-schemas) ───────────────────────────────

export function payloadRutinaBase(ajustes: Record<string, unknown> = {}) {
  return {
    tipoRutina: "GENERICA",
    nombre: "Rutina E2E INC10",
    descripcion: "Descripcion base E2E",
    objetivo: "Objetivo base E2E",
    nivelExperiencia: "PRINCIPIANTE",
    sesiones: [
      {
        nombre: "Sesion fuerza A",
        dia: "lunes",
        ejercicios: [
          {
            nombre: "Press banca",
            series: [
              { repeticiones: "8-12", intensidad: "70% 1RM", descansoSegundos: 90 },
            ],
          },
        ],
      },
    ],
    ...ajustes,
  };
}

export function payloadRutinaPersonalizada(ajustes: Record<string, unknown> = {}) {
  return {
    tipoRutina: "PERSONALIZADA",
    nombre: "Rutina pers E2E INC10",
    descripcion: "Descripcion personalizada E2E",
    informacionGeneral: {
      objetivoGeneral: "Ganar masa muscular",
      nivelExperiencia: "INTERMEDIO",
      fechaEvaluacion: "2026-01-01",
    },
    diagnostico: {
      diagnostico: "Buena postura general",
      restriccionesMedicas: null,
      lesionesPrevias: null,
      observacionesGenerales: null,
    },
    macrociclos: [
      {
        nombre: "Macro 1",
        fechaInicio: "2026-01-01",
        fechaFin: "2026-12-31",
        mesociclos: [
          {
            nombre: "Meso 1",
            fechaInicio: "2026-01-01",
            fechaFin: "2026-06-30",
            microciclos: [
              {
                nombre: "Micro 1",
                fechaInicio: "2026-01-01",
                fechaFin: "2026-01-31",
                sesiones: [
                  {
                    nombre: "Sesion fuerza A",
                    ejercicios: [
                      {
                        nombre: "Sentadilla",
                        series: [
                          {
                            repeticiones: "5",
                            intensidad: "80% 1RM",
                            descansoSegundos: 180,
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    tests: [{ nombre: "1RM sentadilla", resultado: "100 kg", fecha: "2026-01-01" }],
    antropometria: [
      { medida: "peso", valor: 75.5, unidad: "kg", fecha: "2026-01-01" },
    ],
    analisisBiomecanico: [
      { zona: "RODILLA", hallazgo: "LEVE", fecha: "2026-01-01" },
    ],
    ...ajustes,
  };
}

// ─── Sesión y navegación ─────────────────────────────────────────────────────

/** Login de recepcionista (seed) por la UI; aterriza en /clientes. */
export async function loginComoRecepcionista(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill("recep@clubbeasts.com");
  await page.getByLabel("Contrasena").fill("recep123");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/.*clientes/);
}

/** Navegación al listado de rutinas por URL directa con sesión staff. */
export async function abrirListadoRutinas(page: Page): Promise<void> {
  await page.goto("/rutinas");
}
