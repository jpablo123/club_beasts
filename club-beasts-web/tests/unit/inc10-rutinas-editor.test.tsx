// @vitest-environment jsdom
/**
 * INC-10 (RED) — Editor de rutinas (C4: borrador único por ruta de índice).
 * Criterios: RU-02/RU-10/RU-13/RU-19 (validación espejo), C4 (acordeones,
 * filas-tabla de series, un solo draft `useState` con helpers por ruta de
 * índice, límites de contadores, errores `role="alert"` + foco al primer
 * error) y C7 (sin substrings prohibidos).
 *
 * Contrato fijado por este RED para `src/components/rutinas/RutinaEditor`
 * (GREEN T8, ratificación C3/C4/C7):
 *  - Export default `RutinaEditor({ tipoRutina, inicial, onAplicar,
 *    onDescartar })` con `tipoRutina` ∈ { GENERICA, INDUCCION, PERSONALIZADA }
 *    y `inicial` = borrador con la forma del payload de creación (o null).
 *  - Borrador único por ruta de índice: "Agregar serie" dentro del grupo del
 *    ejercicio N agrega SOLO a ese ejercicio (los demás no cambian).
 *  - Cada ejercicio se renderiza `role="group"` con `aria-label` = nombre del
 *    ejercicio (para localizar el alcance de cada acción).
 *  - Etiquetas exactas: "Nombre de la rutina", "Repeticiones", "Intensidad",
 *    "Descanso (segundos)", "Notas de la serie" (NUNCA "Observaciones"),
 *    "Objetivo general", "Fecha de evaluación", "Inicio del ciclo",
 *    "Fin del ciclo" (NUNCA "Fecha de inicio"/"Fecha de fin").
 *  - Botones (C3): "Agregar sesión", "Agregar ejercicio", "Agregar serie",
 *    "Quitar serie", "Agregar macrociclo", "Agregar mesociclo",
 *    "Agregar microciclo", "Agregar test", "Agregar medida",
 *    "Agregar hallazgo", "Aplicar cambios", "Descartar cambios".
 *  - Límites de contadores (C4): cuando una colección alcanza su máximo el
 *    botón "Agregar X" queda `disabled` (macrociclos 20, mesociclos 20/macro,
 *    microciclos 20/meso, sesiones 30/micro, ejercicios 30/sesión, series
 *    30/ejercicio, evaluaciones 50/sección).
 *  - "Aplicar cambios" valida con el espejo `src/lib/rutina-schemas.ts` y en
 *    error renderiza un `role="alert"` con los mensajes del canónico y mueve
 *    el foco al primer campo inválido; válido llama `onAplicar(payload)`.
 *  - "Descartar cambios" llama `onDescartar`.
 *
 * FASE RED (2026-11-05): el componente NO existe (GREEN T8).
 *
 * ENMIENDA INC10-FIX-04 (2026-11-15, hallazgo REV-01 / decisión de Producto
 * 2026-11-15): el cap de contadores del editor pasa de GLOBAL (suma de todo el
 * árbol) a POR NODO, es decir el límite del padre, coherente con el espejo
 * `rutina-schemas` / RU-19 (que ya validaba por nodo; NO se tocó).
 * Efecto en este archivo: el fixture del caso "con 20 macrociclos" ensambla
 * ahora `Macro 1` con 20 mesociclos (39 mesociclos en total en el árbol),
 * un árbol VÁLIDO por C4 que la UI anterior bloqueaba por cap global. Se
 * conservan sin cambio las expectativas "límite 20 macrociclos" y "20
 * mesociclos por macro" y se AÑADE la aserción de que en `Macro 2` (1 meso)
 * "Agregar mesociclo" queda HABILITADO bajo el cap por nodo. Ninguna otra
 * expectativa de negocio cambia; ningún test se elimina.
 *
 * Restricciones INC00-QA-01/02: sin `isVisible()` condicional, skips ni
 * `only`; toda ausencia se asierta tras guarda positiva.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

const { mockOnAplicar, mockOnDescartar } = vi.hoisted(() => ({
  mockOnAplicar: vi.fn(),
  mockOnDescartar: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  } & Record<string, unknown>) => (
    <a href={typeof href === "string" ? href : "#"} {...rest}>
      {children}
    </a>
  ),
}));

const RUTA_EDITOR = "../../src/components/rutinas/RutinaEditor";

async function importarEditor(): Promise<any> {
  const ruta: string = RUTA_EDITOR;
  try {
    return await import(/* @vite-ignore */ ruta);
  } catch {
    throw new Error(
      "INC10-RED: falta el componente de producto @/components/rutinas/RutinaEditor " +
        "(GREEN T8). Fallo de comportamiento ausente esperado."
    );
  }
}

/** Serie válida mínima del borrador. */
const SERIE = { repeticiones: "8-12", intensidad: "70% 1RM", descansoSegundos: 90 };

/** Borrador base válido (1 sesión -> 1 ejercicio -> 1 serie). */
function draftBase(ajustes: Record<string, unknown> = {}) {
  return {
    tipoRutina: "GENERICA",
    nombre: "Rutina draft INC10",
    descripcion: "Descripcion base original",
    objetivo: "Objetivo base",
    nivelExperiencia: "PRINCIPIANTE",
    sesiones: [
      {
        nombre: "Sesion fuerza A",
        dia: "lunes",
        ejercicios: [{ nombre: "Press banca", series: [{ ...SERIE }] }],
      },
    ],
    ...ajustes,
  };
}

/** Borrador personalizado válido mínimo. */
function draftPersonalizada(ajustes: Record<string, unknown> = {}) {
  return {
    tipoRutina: "PERSONALIZADA",
    nombre: "Rutina draft pers INC10",
    informacionGeneral: {
      objetivoGeneral: "Ganar masa muscular",
      nivelExperiencia: "INTERMEDIO",
      fechaEvaluacion: "2026-01-01",
    },
    diagnostico: { diagnostico: "Buena postura general" },
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
                    ejercicios: [{ nombre: "Press banca", series: [{ ...SERIE }] }],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    ...ajustes,
  };
}

async function renderEditor(props: Record<string, unknown>) {
  const modulo = await importarEditor();
  const Editor = modulo.default;
  return render(
    <Editor
      tipoRutina="GENERICA"
      inicial={null}
      onAplicar={mockOnAplicar}
      onDescartar={mockOnDescartar}
      {...props}
    />
  );
}

beforeEach(() => {
  mockOnAplicar.mockClear();
  mockOnDescartar.mockClear();
});

afterEach(() => {
  cleanup();
});

describe("RutinaEditor — estructura y controles (C3/C4)", () => {
  it("renderiza las etiquetas y botones exactos del contrato para GENERICA", async () => {
    await renderEditor({ tipoRutina: "GENERICA", inicial: draftBase() });

    expect(screen.getByLabelText("Nombre de la rutina")).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Aplicar cambios$/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Descartar cambios$/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Agregar sesión$/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Agregar ejercicio$/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Agregar serie$/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Quitar serie$/ })).toBeTruthy();

    // Sin substrings prohibidos (C7) en etiquetas de campos de la serie.
    expect(screen.queryByLabelText("Observaciones")).toBeNull();
    expect(screen.getByLabelText("Notas de la serie")).toBeTruthy();
  });

  it("PERSONALIZADA agrega los controles del árbol macro-meso-micro y evaluaciones", async () => {
    await renderEditor({ tipoRutina: "PERSONALIZADA", inicial: draftPersonalizada() });

    for (const boton of [
      "Agregar macrociclo",
      "Agregar mesociclo",
      "Agregar microciclo",
      "Agregar test",
      "Agregar medida",
      "Agregar hallazgo",
    ]) {
      expect(screen.getByRole("button", { name: new RegExp("^" + boton + "$") }), boton).toBeTruthy();
    }
    expect(screen.getByLabelText("Objetivo general")).toBeTruthy();
    expect(screen.getByLabelText("Fecha de evaluación")).toBeTruthy();
    // C7: nunca "Fecha de inicio"/"Fecha de fin" como etiquetas.
    expect(screen.queryByLabelText("Fecha de inicio")).toBeNull();
    expect(screen.queryByLabelText("Fecha de fin")).toBeNull();
  });
});

describe("RutinaEditor — borrador por ruta de índice (C4)", () => {
  it("'Agregar serie' en el ejercicio N agrega SOLO a ese ejercicio", async () => {
    await renderEditor({
      tipoRutina: "GENERICA",
      inicial: draftBase({
        sesiones: [
          {
            nombre: "Sesion fuerza A",
            dia: "lunes",
            ejercicios: [
              { nombre: "Press banca", series: [{ ...SERIE }] },
              { nombre: "Sentadilla", series: [{ ...SERIE }] },
            ],
          },
        ],
      }),
    });

    const grupoB = screen.getByRole("group", { name: "Sentadilla" });
    const grupoA = screen.getByRole("group", { name: "Press banca" });
    expect(within(grupoA).getAllByRole("button", { name: "Quitar serie" })).toHaveLength(1);
    expect(within(grupoB).getAllByRole("button", { name: "Quitar serie" })).toHaveLength(1);

    fireEvent.click(within(grupoB).getByRole("button", { name: "Agregar serie" }));

    expect(
      within(grupoB).getAllByRole("button", { name: "Quitar serie" }),
      "el ejercicio B recibió la serie"
    ).toHaveLength(2);
    expect(
      within(grupoA).getAllByRole("button", { name: "Quitar serie" }),
      "el ejercicio A no cambió"
    ).toHaveLength(1);
  });

  it("'Agregar sesión' incrementa el borrador sin tocar las sesiones existentes", async () => {
    await renderEditor({ tipoRutina: "GENERICA", inicial: draftBase() });
    expect(screen.getAllByRole("group", { name: "Press banca" })).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Agregar sesión" }));

    // La sesión original conserva su ejercicio; la nueva nace vacía.
    expect(screen.getAllByRole("group", { name: "Press banca" })).toHaveLength(1);
  });
});

describe("RutinaEditor — límites de contadores (C4)", () => {
  it("con 30 series en un ejercicio el botón 'Agregar serie' queda disabled", async () => {
    const series30 = Array.from({ length: 30 }, () => ({ ...SERIE }));
    await renderEditor({
      tipoRutina: "GENERICA",
      inicial: draftBase({
        sesiones: [
          {
            nombre: "Sesion fuerza A",
            ejercicios: [{ nombre: "Press banca", series: series30 }],
          },
        ],
      }),
    });
    const grupo = screen.getByRole("group", { name: "Press banca" });
    expect(within(grupo).getAllByRole("button", { name: "Quitar serie" })).toHaveLength(30);
    const agregar = within(grupo).getByRole("button", { name: "Agregar serie" });
    expect((agregar as HTMLButtonElement).disabled, "límite 30 series/ejercicio").toBe(true);
  });

  it("con 20 macrociclos el botón 'Agregar macrociclo' queda disabled", async () => {
    // ENMIENDA INC10-FIX-04 (REV-01): `Macro 1` ensambla 20 mesociclos (su
    // límite POR NODO, C4); el resto de macros mantiene 1 meso, con lo que el
    // árbol totaliza 39 mesociclos -> válido por C4 (20/macro, espejo RU-19)
    // y ANTES bloqueado por el cap GLOBAL del editor.
    const macrociclos20 = Array.from({ length: 20 }, (_, i) => ({
      nombre: `Macro ${i + 1}`,
      fechaInicio: "2026-01-01",
      fechaFin: "2026-12-31",
      mesociclos: Array.from({ length: i === 0 ? 20 : 1 }, (_, k) => ({
        nombre: `Meso ${k + 1}`,
        fechaInicio: "2026-01-01",
        fechaFin: "2026-06-30",
        microciclos: [
          {
            nombre: `Micro ${k + 1}`,
            fechaInicio: "2026-01-01",
            fechaFin: "2026-01-31",
            sesiones: [
              {
                nombre: `Sesion ${k + 1}`,
                ejercicios: [{ nombre: `Ejercicio ${k + 1}`, series: [{ ...SERIE }] }],
              },
            ],
          },
        ],
      })),
    }));
    await renderEditor({
      tipoRutina: "PERSONALIZADA",
      inicial: draftPersonalizada({ macrociclos: macrociclos20 }),
    });
    const agregarMacro = screen.getByRole("button", { name: "Agregar macrociclo" });
    expect((agregarMacro as HTMLButtonElement).disabled, "límite 20 macrociclos").toBe(true);

    // "Agregar mesociclo" vive dentro del panel de cada macrociclo (alcance).
    const primerMacro = screen.getByRole("group", { name: "Macro 1" });
    const agregarMeso = within(primerMacro).getByRole("button", { name: "Agregar mesociclo" });
    expect((agregarMeso as HTMLButtonElement).disabled, "20 mesociclos por macro").toBe(true);

    // ENMIENDA INC10-FIX-04 (REV-01): cap POR NODO. Macro 2 sólo tiene 1 meso,
    // así que su botón queda habilitado aunque el árbol global (39 mesos)
    // supera el viejo cap global de 20 que la UI anterior imponía.
    const segundoMacro = screen.getByRole("group", { name: "Macro 2" });
    const agregarMeso2 = within(segundoMacro).getByRole("button", {
      name: "Agregar mesociclo",
    });
    expect(
      (agregarMeso2 as HTMLButtonElement).disabled,
      "cap por nodo: 1/20 mesociclos en Macro 2 -> habilitado pese a 39 mesos globales"
    ).toBe(false);
  });

  it("bajo el límite los botones de agregar quedan habilitados", async () => {
    await renderEditor({ tipoRutina: "GENERICA", inicial: draftBase() });
    const grupo = screen.getByRole("group", { name: "Press banca" });
    expect(
      (within(grupo).getByRole("button", { name: "Agregar serie" }) as HTMLButtonElement).disabled
    ).toBe(false);
  });
});

describe("RutinaEditor — errores role=alert y foco al primer error (C4)", () => {
  it("nombre inválido -> role=alert con el mensaje canónico y foco en 'Nombre de la rutina'", async () => {
    await renderEditor({
      tipoRutina: "GENERICA",
      inicial: draftBase({ nombre: "ab" }),
    });

    fireEvent.click(screen.getByRole("button", { name: "Aplicar cambios" }));

    const alerta = screen.getByRole("alert");
    expect(alerta.textContent).toContain("Nombre debe tener entre 3 y 100 caracteres");
    const campo = screen.getByLabelText("Nombre de la rutina");
    expect(document.activeElement, "foco al primer error").toBe(campo);
    expect(mockOnAplicar, "no se aplica con errores").not.toHaveBeenCalled();
  });

  it("sin sesiones -> role=alert con 'Debe registrar al menos 1 sesión'", async () => {
    await renderEditor({
      tipoRutina: "GENERICA",
      inicial: draftBase({ sesiones: [] }),
    });

    fireEvent.click(screen.getByRole("button", { name: "Aplicar cambios" }));

    const alerta = screen.getByRole("alert");
    expect(alerta.textContent).toContain("Debe registrar al menos 1 sesión");
    expect(mockOnAplicar).not.toHaveBeenCalled();
  });
});

describe("RutinaEditor — aplicar y descartar", () => {
  it("borrador válido -> onAplicar con el payload ensamblado (sesiones por índice)", async () => {
    await renderEditor({ tipoRutina: "GENERICA", inicial: draftBase() });

    fireEvent.click(screen.getByRole("button", { name: "Aplicar cambios" }));

    expect(mockOnAplicar).toHaveBeenCalledTimes(1);
    const payload = mockOnAplicar.mock.calls[0][0];
    expect(payload.nombre).toBe("Rutina draft INC10");
    expect(payload.sesiones).toHaveLength(1);
    expect(payload.sesiones[0].ejercicios[0].series[0].repeticiones).toBe("8-12");
  });

  it("'Descartar cambios' llama onDescartar", async () => {
    await renderEditor({ tipoRutina: "GENERICA", inicial: draftBase() });
    fireEvent.click(screen.getByRole("button", { name: "Descartar cambios" }));
    expect(mockOnDescartar).toHaveBeenCalledTimes(1);
  });
});
