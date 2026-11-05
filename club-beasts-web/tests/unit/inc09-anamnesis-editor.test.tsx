// @vitest-environment jsdom
/**
 * INC-09 (RED) — Editor de anamnesis (HU-09/HU-11, formulario DUENO).
 * Criterios: AN-07 (condicionales 12/18b se limpian al pasar a NO), AN-10
 * ("Ninguno" exclusivo), AN-26 (guarda de body en cliente), C3a (=R3: `null`
 * explícito en campos vaciados), C5 (banner "Cambios sin guardar" +
 * `beforeunload` + "Descartar cambios" con `role="alertdialog"`), DEC-056a
 * (pre-llenado 1,2,9,10 en el formulario; 3-8 vacíos).
 *
 * Contrato fijado por este RED para `src/components/anamnesis/AnamnesisEditor`
 * (GREEN T10, ratificación C3/C3a/C5/C7):
 *  - Export default `AnamnesisEditor({ clienteId, cliente, inicial, onGuardado,
 *    onDescartar })`: `inicial` = datos existentes (edición) o null (creación,
 *    aplica `prellenarAnamnesisDesdeCliente`). El rol es DUENO (el montaje lo
 *    controla AnamnesisSection).
 *  - Campos con la etiqueta exacta del Anexo DEC-052 (ver
 *    inc09-anamnesis-vista.test.tsx) — queries `exact: true`.
 *  - Botones "Aplicar cambios" (guardar) y "Descartar cambios"; banner
 *    "Cambios sin guardar" mientras el formulario está sucio (y listener
 *    `beforeunload` registrado solo mientras está sucio).
 *  - Payload C3a/R3: en EDICIÓN envía solo los campos CAMBIADOS respecto de
 *    `inicial` — con `null` EXPLÍCITO cuando el usuario vació uno que estaba
 *    diligenciado; los no tocados quedan AUSENTES (merge: conserva). En
 *    CREACIÓN envía solo los diligenciados.
 *  - AN-26 en cliente: sin ningún campo diligenciado no llama a la API y
 *    muestra "La anamnesis debe tener al menos un campo diligenciado".
 *  - Condicionales: al cambiar "Practica algún deporte" a "NO" se limpia
 *    "Cual deporte"; al cambiar "Enfermedad relevante" a "NO" se limpia
 *    "Cual enfermedad" (evita el 400 AN-07).
 *  - "Ninguno" exclusivo en "Antecedentes médicos" (AN-10): al marcarlo se
 *    desmarcan los demás y viceversa.
 *  - "Descartar cambios" abre `role="alertdialog"` con "Si, descartar" /
 *    "Seguir editando"; "Seguir editando" conserva lo escrito.
 *  - Llamadas API: `api.anamnesis.create(clienteId, campos)` (creación) o
 *    `api.anamnesis.update(clienteId, campos)` (edición).
 *
 * FASE RED (2026-11-04): el componente NO existe (GREEN T10).
 *
 * Restricciones INC00-QA-01/02: sin `isVisible()` condicional, skips ni
 * `only`, sin pasos opcionales.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const { mockAnamnesisCreate, mockAnamnesisUpdate, mockAnamnesisGet } = vi.hoisted(
  () => ({
    mockAnamnesisCreate: vi.fn(),
    mockAnamnesisUpdate: vi.fn(),
    mockAnamnesisGet: vi.fn(),
  })
);

vi.mock("@/lib/api", () => ({
  api: {
    anamnesis: {
      get: (...args: unknown[]) => mockAnamnesisGet(...args),
      create: (...args: unknown[]) => mockAnamnesisCreate(...args),
      update: (...args: unknown[]) => mockAnamnesisUpdate(...args),
    },
    portal: { anamnesis: vi.fn() },
  },
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { name: "Admin", role: "DUENO" } },
    status: "authenticated",
  }),
  getSession: vi.fn(async () => null),
  signOut: vi.fn(),
  signIn: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "cliente-1" }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
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

const RUTA_EDITOR = "../../src/components/anamnesis/AnamnesisEditor";

async function importarEditor(): Promise<any> {
  const ruta: string = RUTA_EDITOR;
  try {
    return await import(/* @vite-ignore */ ruta);
  } catch {
    throw new Error(
      "INC09-RED: falta el componente de producto " +
        "@/components/anamnesis/AnamnesisEditor (GREEN T10). " +
        "Fallo de comportamiento ausente esperado."
    );
  }
}

const CLIENTE = {
  nombres: "Ana",
  apellidos: "Perez",
  cedula: "1020304050",
  telefono: "3001234567",
  email: "ana@mail.com",
};

/** Registro existente (edición) con campos diligenciados para vaciar. */
const INICIAL = {
  nombreCompleto: "Ana Maria Perez",
  numeroDocumento: "1020304050",
  sexo: "FEMENINO",
  rh: "O+",
  edad: 25,
  fechaNacimiento: "1998-04-12",
  lugarNacimiento: "Bogota D.C.",
  estadoCivil: "Soltero",
  direccionResidencia: "Calle 45 # 12-34",
  numeroContacto: "3001234567",
  correoElectronico: "ana@mail.com",
  practicaDeporte: "SI",
  cualDeporte: "Futbol",
  tiempoQuePractica: "3 anos",
  contactoEmergencia: "Maria Perez 3001112233",
  eps: "Nueva EPS",
  antecedentesMedicos: ["Alergias"],
  antecedentesFamiliares: "Diabetes en abuelos",
  enfermedadRelevante: "SI",
  cualEnfermedad: "Hipertension",
  objetivosEntrenamiento: "Ganar masa muscular",
  nivelActividad: "estoy bastante activo durante mi dia",
  diasNoEntrenamiento: ["lunes", "viernes"],
  horaAcostarse: "22:30",
  comidasPorDia: 3,
};

async function renderEditor(props: Record<string, unknown> = {}) {
  const onGuardado = vi.fn();
  const onDescartar = vi.fn();
  const { default: AnamnesisEditor } = await importarEditor();
  render(
    <AnamnesisEditor
      clienteId="cliente-1"
      cliente={CLIENTE}
      inicial={null}
      onGuardado={onGuardado}
      onDescartar={onDescartar}
      {...props}
    />
  );
  return { onGuardado, onDescartar };
}

beforeEach(() => {
  mockAnamnesisCreate.mockReset();
  mockAnamnesisUpdate.mockReset();
  mockAnamnesisGet.mockReset();
  mockAnamnesisCreate.mockResolvedValue({ estado: "PENDIENTE" });
  mockAnamnesisUpdate.mockResolvedValue({ estado: "PENDIENTE" });
});

afterEach(() => {
  cleanup();
});

describe("DEC-056a pre-llenado en el formulario (1, 2, 9, 10; 3-8 vacíos)", () => {
  it("los campos 1, 2, 9, 10 nacen pre-llenados desde la ficha", async () => {
    await renderEditor();
    expect((screen.getByLabelText("Nombre completo") as HTMLInputElement).value).toBe(
      "Ana Perez"
    );
    expect((screen.getByLabelText("Número de documento") as HTMLInputElement).value).toBe(
      "1020304050"
    );
    expect((screen.getByLabelText("Número de contacto") as HTMLInputElement).value).toBe(
      "3001234567"
    );
    expect((screen.getByLabelText("Correo electrónico") as HTMLInputElement).value).toBe(
      "ana@mail.com"
    );
  });

  it("los campos 3-8 nacen vacíos y editables", async () => {
    await renderEditor();
    expect((screen.getByLabelText("Sexo") as HTMLSelectElement).value).toBe("");
    expect((screen.getByLabelText("RH") as HTMLSelectElement).value).toBe("");
    expect((screen.getByLabelText("Edad") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("Fecha de nacimiento") as HTMLInputElement).value).toBe(
      ""
    );
    expect((screen.getByLabelText("Lugar de nacimiento") as HTMLInputElement).value).toBe(
      ""
    );
    expect((screen.getByLabelText("Estado civil") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("Dirección de residencia") as HTMLInputElement).value).toBe(
      ""
    );
  });
});

describe("AN-07: los condicionales se limpian al cambiar la pregunta a NO", () => {
  it("practicaDeporte=NO limpia 'Cual deporte'", async () => {
    await renderEditor();
    const cualDeporte = screen.getByLabelText("Cual deporte") as HTMLInputElement;
    fireEvent.change(cualDeporte, { target: { value: "Futbol" } });
    expect(cualDeporte.value).toBe("Futbol");

    fireEvent.change(screen.getByLabelText("Practica algún deporte"), {
      target: { value: "NO" },
    });
    expect(cualDeporte.value).toBe("");
  });

  it("enfermedadRelevante=NO limpia 'Cual enfermedad'", async () => {
    await renderEditor();
    const cualEnfermedad = screen.getByLabelText("Cual enfermedad") as HTMLInputElement;
    fireEvent.change(cualEnfermedad, { target: { value: "Hipertension" } });
    expect(cualEnfermedad.value).toBe("Hipertension");

    fireEvent.change(screen.getByLabelText("Enfermedad relevante"), {
      target: { value: "NO" },
    });
    expect(cualEnfermedad.value).toBe("");
  });
});

describe("AN-10: 'Ninguno' exclusivo en Antecedentes médicos", () => {
  it("marcar 'Ninguno' desmarca los demás y viceversa", async () => {
    await renderEditor();
    const fuma = screen.getByLabelText("fuma") as HTMLInputElement;
    const ninguno = screen.getByLabelText("Ninguno") as HTMLInputElement;
    const alergias = screen.getByLabelText("Alergias") as HTMLInputElement;

    fireEvent.click(fuma);
    expect(fuma.checked).toBe(true);

    fireEvent.click(ninguno);
    expect(ninguno.checked).toBe(true);
    expect(fuma.checked).toBe(false);

    fireEvent.click(alergias);
    expect(alergias.checked).toBe(true);
    expect(ninguno.checked).toBe(false);
  });
});

describe("AN-26 en cliente: al menos un campo diligenciado", () => {
  it("sin ningún campo diligenciado muestra el error y no llama a la API", async () => {
    const { onGuardado } = await renderEditor();

    // Se vacían los 4 pre-llenados (DEC-056a) y no se diligencia nada más.
    for (const etiqueta of [
      "Nombre completo",
      "Número de documento",
      "Número de contacto",
      "Correo electrónico",
    ]) {
      fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: "" } });
    }

    fireEvent.click(screen.getByRole("button", { name: /^Aplicar cambios$/ }));

    expect(
      screen.getAllByText("La anamnesis debe tener al menos un campo diligenciado", {
        exact: true,
      })
    ).toHaveLength(1);
    expect(mockAnamnesisCreate).not.toHaveBeenCalled();
    expect(mockAnamnesisUpdate).not.toHaveBeenCalled();
    expect(onGuardado).not.toHaveBeenCalled();
  });
});

describe("C3a/R3: null explícito en campos vaciados (payload de edición)", () => {
  it("vaciar un campo diligenciado envía la clave con null; los no tocados quedan ausentes", async () => {
    await renderEditor({ inicial: INICIAL });

    const tiempo = screen.getByLabelText("Tiempo que practica") as HTMLInputElement;
    fireEvent.change(tiempo, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /^Aplicar cambios$/ }));

    expect(mockAnamnesisUpdate).toHaveBeenCalledTimes(1);
    const [clienteId, payload] = mockAnamnesisUpdate.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(clienteId).toBe("cliente-1");
    // C3a: el vaciado viaja como `null` explícito (no como ausencia).
    expect(payload).toHaveProperty("tiempoQuePractica", null);
    // Merge: lo no tocado viaja ausente (el backend lo conserva).
    expect(payload).not.toHaveProperty("nombreCompleto");
    expect(payload).not.toHaveProperty("eps");
    expect(mockAnamnesisCreate).not.toHaveBeenCalled();
  });

  it("cambiar un campo envía solo esa clave con el nuevo valor", async () => {
    await renderEditor({ inicial: INICIAL });

    fireEvent.change(screen.getByLabelText("Comidas al día"), {
      target: { value: "5" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Aplicar cambios$/ }));

    expect(mockAnamnesisUpdate).toHaveBeenCalledTimes(1);
    const [, payload] = mockAnamnesisUpdate.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(payload).toHaveProperty("comidasPorDia", 5);
    expect(payload).not.toHaveProperty("tiempoQuePractica");
  });
});

describe("C5: banner 'Cambios sin guardar', beforeunload y 'Descartar cambios'", () => {
  it("el banner y el listener beforeunload aparecen solo con cambios sin guardar", async () => {
    const spyAdd = vi.spyOn(window, "addEventListener");
    await renderEditor();

    expect(screen.queryAllByText("Cambios sin guardar", { exact: true })).toHaveLength(0);

    fireEvent.change(screen.getByLabelText("Nombre completo"), {
      target: { value: "Ana Maria Perez" },
    });
    expect(screen.getAllByText("Cambios sin guardar", { exact: true })).toHaveLength(1);
    expect(
      spyAdd.mock.calls.filter(([tipo]) => tipo === "beforeunload").length
    ).toBeGreaterThan(0);

    spyAdd.mockRestore();
  });

  it("'Descartar cambios' abre alertdialog; 'Seguir editando' conserva lo escrito", async () => {
    const { onDescartar } = await renderEditor();
    const nombre = screen.getByLabelText("Nombre completo") as HTMLInputElement;
    fireEvent.change(nombre, { target: { value: "Ana Maria Perez" } });

    fireEvent.click(
      screen.getByRole("button", { name: /^Descartar cambios$/ })
    );
    const dialogo = screen.getByRole("alertdialog");
    expect(dialogo).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /^Seguir editando$/ }));
    expect(screen.queryAllByRole("alertdialog")).toHaveLength(0);
    expect(nombre.value).toBe("Ana Maria Perez"); // se conserva si se cancela
    expect(onDescartar).not.toHaveBeenCalled();
  });

  it("'Si, descartar' cierra el editor vía onDescartar", async () => {
    const { onDescartar } = await renderEditor();
    fireEvent.change(screen.getByLabelText("Nombre completo"), {
      target: { value: "Ana Maria Perez" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /^Descartar cambios$/ })
    );
    fireEvent.click(screen.getByRole("button", { name: /^Si, descartar$/ }));
    expect(onDescartar).toHaveBeenCalledTimes(1);
    expect(screen.queryAllByRole("alertdialog")).toHaveLength(0);
  });
});

describe("guardado feliz (contrato api.anamnesis.*)", () => {
  it("creación: api.anamnesis.create(clienteId, diligenciados) y onGuardado", async () => {
    const { onGuardado } = await renderEditor();
    fireEvent.change(screen.getByLabelText("Edad"), { target: { value: "25" } });
    fireEvent.click(screen.getByRole("button", { name: /^Aplicar cambios$/ }));

    expect(mockAnamnesisCreate).toHaveBeenCalledTimes(1);
    const [clienteId, payload] = mockAnamnesisCreate.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(clienteId).toBe("cliente-1");
    expect(payload).toHaveProperty("nombreCompleto", "Ana Perez"); // pre-llenado cuenta
    expect(payload).toHaveProperty("edad", 25);
    expect(onGuardado).toHaveBeenCalledTimes(1);
  });
});
