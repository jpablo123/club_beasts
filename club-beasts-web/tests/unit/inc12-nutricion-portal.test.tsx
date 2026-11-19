// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const { mockResumen, mockPortalPlan, mockReplace, sesion } = vi.hoisted(() => ({
  mockResumen: vi.fn(),
  mockPortalPlan: vi.fn(),
  mockReplace: vi.fn(),
  sesion: { autenticado: true, debeCambiarPin: false },
}));

vi.mock("@/lib/api", () => ({
  api: {
    portal: {
      resumen: (...args: unknown[]) => mockResumen(...args),
      planNutricional: (...args: unknown[]) => mockPortalPlan(...args),
    },
  },
}));

vi.mock("next-auth/react", () => ({
  useSession: () =>
    sesion.autenticado
      ? {
          data: { user: { name: "Cliente", role: "CLIENTE", debeCambiarPin: sesion.debeCambiarPin } },
          status: "authenticated",
        }
      : { data: null, status: "unauthenticated" },
  getSession: vi.fn(async () => null),
  signOut: vi.fn(),
  signIn: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: mockReplace, refresh: vi.fn() }),
  useParams: () => ({}),
}));

const RUTA = "../../src/app/portal/plan-nutricional/page";

async function importarPagina(): Promise<any> {
  const ruta: string = RUTA;
  try {
    return await import(/* @vite-ignore */ ruta);
  } catch {
    throw new Error("INC12-RED: falta la página de producto @/app/portal/plan-nutricional/page (GREEN).");
  }
}

beforeEach(() => {
  mockResumen.mockReset();
  mockPortalPlan.mockReset();
  mockReplace.mockClear();
  sesion.autenticado = true;
  sesion.debeCambiarPin = false;
});

afterEach(() => cleanup());

describe("portal/plan-nutricional — gate DEC-079", () => {
  it("sinMembresiaActiva -> replace('/portal') y api.portal.planNutricional JAMÁS se llama", async () => {
    mockResumen.mockResolvedValue({ sinMembresiaActiva: true });
    const pagina = await importarPagina();
    render(<pagina.default />);
    await vi.waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/portal");
    });
    expect(mockResumen).toHaveBeenCalledTimes(1);
    expect(mockPortalPlan).not.toHaveBeenCalled();
  });

  it("con servicio vigente consulta api.portal.planNutricional y renderiza región 'Mi plan nutricional'", async () => {
    mockResumen.mockResolvedValue({ sinMembresiaActiva: false });
    mockPortalPlan.mockResolvedValue({ nombre: "Plan portal INC12" });
    const pagina = await importarPagina();
    render(<pagina.default />);
    const region = await screen.findByRole("region", { name: /^Mi plan nutricional$/ });
    expect(region).toBeTruthy();
    expect(mockPortalPlan).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Plan portal INC12")).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

describe("portal/plan-nutricional — mensaje SIN_PLAN", () => {
  it("'No tienes un plan nutricional activo' en role=alert con literal exacto", async () => {
    mockResumen.mockResolvedValue({ sinMembresiaActiva: false });
    mockPortalPlan.mockResolvedValue({ mensaje: "No tienes un plan nutricional activo" });
    const pagina = await importarPagina();
    render(<pagina.default />);
    const alerta = await screen.findByRole("alert");
    expect(alerta.textContent).toBe("No tienes un plan nutricional activo");
  });
});

describe("portal/plan-nutricional — guarda PIN obligatoria", () => {
  it("debeCambiarPin -> replace('/portal') sin consultar resumen ni plan", async () => {
    sesion.debeCambiarPin = true;
    const pagina = await importarPagina();
    render(<pagina.default />);
    await vi.waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/portal");
    });
    expect(mockResumen).not.toHaveBeenCalled();
    expect(mockPortalPlan).not.toHaveBeenCalled();
  });
});