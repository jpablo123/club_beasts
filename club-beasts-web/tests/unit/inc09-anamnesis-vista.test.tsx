// @vitest-environment jsdom
/**
 * INC-09 (RED) — Vista de anamnesis en la ficha staff (HU-10/HU-09).
 * Criterios: AN-13/AN-15 (vista por rol), NAV-AN-07 (RECEP sin sensibles en
 * DOM), C1 (montaje bajo demanda), C4 (render POR PRESENCIA DE CLAVE), badge
 * PENDIENTE/COMPLETA (AN-22) y SIN_REGISTRO (R2).
 *
 * Contrato fijado por este RED para `src/components/anamnesis/AnamnesisSection`
 * (GREEN T10, ratificación C1/C4/C7):
 *  - Export default `AnamnesisSection({ clienteId, cliente })` donde `cliente`
 *    = `{ nombres, apellidos, cedula, telefono, email? }` (fuente del
 *    pre-llenado DEC-056a). El rol sale de `useSession()` ("DUENO" |
 *    "RECEPCIONISTA") y los datos de `api.anamnesis.get(clienteId)`.
 *  - Renderiza `<section role="region" aria-label="Anamnesis deportiva">`
 *    (scope C7, `exact: true`) con la vista de SOLO LECTURA por defecto.
 *  - Vista POR PRESENCIA DE CLAVE (C4): cada clave del DTO renderiza su
 *    etiqueta exacta del Anexo + su valor (una vez); las claves AUSENTES no
 *    dejan NINGÚN rastro en el DOM (sin placeholder ni "Restringido").
 *    Etiquetas del Anexo DEC-052: "Nombre completo", "Número de documento",
 *    "Sexo", "RH", "Edad", "Fecha de nacimiento", "Lugar de nacimiento",
 *    "Estado civil", "Dirección de residencia", "Número de contacto",
 *    "Correo electrónico", "Practica algún deporte", "Cual deporte",
 *    "Tiempo que practica", "Contacto de emergencia", "EPS",
 *    "Antecedentes médicos", "Antecedentes familiares", "Enfermedad relevante",
 *    "Cual enfermedad", "Objetivos de entrenamiento", "Nivel de actividad",
 *    "Días que no puede entrenar", "Hora para acostarse", "Comidas al día".
 *  - Editor SOLO DUENO bajo demanda (C1): botón "Diligenciar anamnesis"
 *    (SIN_REGISTRO) o "Modificar anamnesis" (con datos); con rol
 *    RECEPCIONISTA no existe botón ni controles (toHaveCount(0)).
 *  - Badge con el texto exacto "PENDIENTE" o "COMPLETA" según `estado` del DTO.
 *  - SIN_REGISTRO: muestra el `mensaje` del DTO sin formulario editable.
 *  - Sin nombres accesibles con los substrings prohibidos de C7.
 *
 * FASE RED (2026-11-04): el componente NO existe (GREEN T10). Los tests fallan
 * por COMPORTAMIENTO AUSENTE (pantalla inexistente) con mensaje explícito.
 *
 * Restricciones INC00-QA-01/02: sin `isVisible()` condicional, skips ni
 * `only`; toda ausencia se asierta tras guarda positiva.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const { mockAnamnesisGet, rolActual } = vi.hoisted(() => ({
  mockAnamnesisGet: vi.fn(),
  rolActual: { valor: "DUENO" as string },
}));

vi.mock("@/lib/api", () => ({
  api: {
    anamnesis: {
      get: (...args: unknown[]) => mockAnamnesisGet(...args),
      create: vi.fn(),
      update: vi.fn(),
    },
    portal: { anamnesis: vi.fn() },
  },
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { name: "Admin", role: rolActual.valor } },
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

const RUTA_SECCION = "../../src/components/anamnesis/AnamnesisSection";

async function importarSeccion(): Promise<any> {
  const ruta: string = RUTA_SECCION;
  try {
    return await import(/* @vite-ignore */ ruta);
  } catch {
    throw new Error(
      "INC09-RED: falta el componente de producto " +
        "@/components/anamnesis/AnamnesisSection (GREEN T10). " +
        "Fallo de comportamiento ausente esperado."
    );
  }
}

/** Etiquetas de los 5 campos SENSIBLES (DEC-055). */
const ETIQUETAS_SENSIBLES = [
  "RH",
  "Antecedentes médicos",
  "Antecedentes familiares",
  "Enfermedad relevante",
  "Cual enfermedad",
];

/** Valores distintivos de los sensibles (no deben aparecer nunca a RECEP). */
const VALORES_SENSIBLES = [
  "AB-",
  "consume psicoactivos",
  "Abuelo con Alzheimer",
  "Hipertension severa",
];

const CLIENTE = {
  nombres: "Ana",
  apellidos: "Perez",
  cedula: "1020304050",
  telefono: "3001234567",
  email: "ana@mail.com",
};

/** 20/25 propiedades (19/23 campos) + metadatos staff: la vista RECEP real. */
const DTO_RECEP = {
  nombreCompleto: "Ana Maria Perez",
  numeroDocumento: "1020304050",
  sexo: "FEMENINO",
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
  objetivosEntrenamiento: "Ganar masa muscular",
  nivelActividad: "estoy bastante activo durante mi dia",
  diasNoEntrenamiento: ["lunes", "viernes"],
  horaAcostarse: "22:30",
  comidasPorDia: 3,
  clienteId: "cliente-1",
  estado: "COMPLETA",
  fechaActualizacion: "2026-11-04T10:00:00.000Z",
  actualizadoPorId: "user-1",
};

/** 25/25 propiedades + metadatos: la vista DUENO real. */
const DTO_DUENO = {
  ...DTO_RECEP,
  rh: "AB-",
  antecedentesMedicos: ["consume psicoactivos"],
  antecedentesFamiliares: "Abuelo con Alzheimer",
  enfermedadRelevante: "SI",
  cualEnfermedad: "Hipertension severa",
};

const DTO_SIN_REGISTRO = {
  estado: "SIN_REGISTRO",
  mensaje: "Aun no hay una anamnesis registrada para este cliente.",
};

async function renderSeccion(dto: Record<string, unknown>) {
  mockAnamnesisGet.mockResolvedValue(dto);
  const { default: AnamnesisSection } = await importarSeccion();
  render(<AnamnesisSection clienteId="cliente-1" cliente={CLIENTE} />);
  return screen.getByRole("region", { name: /^Anamnesis deportiva$/ });
}

beforeEach(() => {
  rolActual.valor = "DUENO";
  mockAnamnesisGet.mockReset();
});

afterEach(() => {
  cleanup();
});

describe("C4 render por presencia de clave (RECEP sin rastro de sensibles)", () => {
  it("la vista RECEP muestra la parte operativa y ningun rastro de los 5 sensibles", async () => {
    rolActual.valor = "RECEPCIONISTA";
    const region = await renderSeccion(DTO_RECEP);

    // Guarda positiva: la vista operativa realmente renderiza datos.
    expect(screen.getAllByText("Nombre completo", { exact: true })).toHaveLength(1);
    expect(screen.getAllByText("Ana Maria Perez", { exact: true })).toHaveLength(1);
    expect(screen.getAllByText("EPS", { exact: true })).toHaveLength(1);
    expect(region).toBeTruthy();

    // Los 5 sensibles (DEC-055) no existen en el DOM: ni etiquetas ni valores.
    for (const etiqueta of ETIQUETAS_SENSIBLES) {
      expect(
        screen.queryAllByText(etiqueta, { exact: true }),
        `etiqueta sensible ${etiqueta}`
      ).toHaveLength(0);
    }
    for (const valor of VALORES_SENSIBLES) {
      expect(
        screen.queryAllByText(valor, { exact: true }),
        `valor sensible ${valor}`
      ).toHaveLength(0);
    }
    // C4: sin placeholder tipo "Restringido" para lo ausente.
    expect(screen.queryAllByText(/restringid/i)).toHaveLength(0);
  });

  it("la vista DUENO muestra los 5 sensibles con sus valores", async () => {
    rolActual.valor = "DUENO";
    await renderSeccion(DTO_DUENO);

    expect(screen.getAllByText("Nombre completo", { exact: true })).toHaveLength(1);
    for (const etiqueta of ETIQUETAS_SENSIBLES) {
      expect(
        screen.queryAllByText(etiqueta, { exact: true }),
        `etiqueta sensible ${etiqueta}`
      ).toHaveLength(1);
    }
    expect(screen.getAllByText("Hipertension severa", { exact: true })).toHaveLength(1);
    expect(screen.getAllByText("Abuelo con Alzheimer", { exact: true })).toHaveLength(1);
  });
});

describe("C1 editor solo DUENO, montaje bajo demanda", () => {
  it("RECEPCIONISTA no ve ningun control de edicion", async () => {
    rolActual.valor = "RECEPCIONISTA";
    await renderSeccion(DTO_RECEP);

    // Guarda positiva: la ficha anamnesis esta montada.
    expect(screen.getAllByText("Ana Maria Perez", { exact: true })).toHaveLength(1);
    expect(
      screen.queryAllByRole("button", { name: /^Modificar anamnesis$/ })
    ).toHaveLength(0);
    expect(
      screen.queryAllByRole("button", { name: /^Diligenciar anamnesis$/ })
    ).toHaveLength(0);
  });

  it("DUENO con datos ve exactamente un boton 'Modificar anamnesis' y ningun 'Diligenciar anamnesis'", async () => {
    rolActual.valor = "DUENO";
    await renderSeccion(DTO_DUENO);

    expect(
      screen.getAllByRole("button", { name: /^Modificar anamnesis$/ })
    ).toHaveLength(1);
    expect(
      screen.queryAllByRole("button", { name: /^Diligenciar anamnesis$/ })
    ).toHaveLength(0);
  });

  it("DUENO sin registro ve exactamente un boton 'Diligenciar anamnesis'", async () => {
    rolActual.valor = "DUENO";
    await renderSeccion(DTO_SIN_REGISTRO);

    expect(
      screen.getAllByRole("button", { name: /^Diligenciar anamnesis$/ })
    ).toHaveLength(1);
  });
});

describe("badge PENDIENTE/COMPLETA (AN-22) y SIN_REGISTRO (R2)", () => {
  it("el badge refleja el estado PENDIENTE del DTO", async () => {
    rolActual.valor = "DUENO";
    await renderSeccion({ ...DTO_DUENO, estado: "PENDIENTE" });

    expect(screen.getAllByText("PENDIENTE", { exact: true })).toHaveLength(1);
    expect(screen.queryAllByText("COMPLETA", { exact: true })).toHaveLength(0);
  });

  it("el badge refleja el estado COMPLETA del DTO", async () => {
    rolActual.valor = "DUENO";
    await renderSeccion({ ...DTO_DUENO, estado: "COMPLETA" });

    expect(screen.getAllByText("COMPLETA", { exact: true })).toHaveLength(1);
    expect(screen.queryAllByText("PENDIENTE", { exact: true })).toHaveLength(0);
  });

  it("SIN_REGISTRO muestra el mensaje literal sin datos del formulario", async () => {
    rolActual.valor = "DUENO";
    await renderSeccion(DTO_SIN_REGISTRO);

    expect(
      screen.getAllByText(
        "Aun no hay una anamnesis registrada para este cliente.",
        { exact: true }
      )
    ).toHaveLength(1);
    expect(
      screen.queryAllByText("Nombre completo", { exact: true })
    ).toHaveLength(0);
  });
});
