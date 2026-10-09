// @vitest-environment jsdom
/**
 * INC00-AUTH-06 — lista de clientes: el error de red se muestra en la UI
 * Incremento: INC-00-estabilizacion-fases-1-2 (advertencia menor del cierre)
 *
 * Antes el error de `api.clientes.list` solo iba a `console.error`: el usuario
 * veia "No se encontraron clientes" como si todo estuviera bien. Ahora el
 * mensaje de indisponibilidad se muestra y ofrece reintento; la sesion se
 * conserva.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const { mockList } = vi.hoisted(() => ({ mockList: vi.fn() }));

vi.mock("@/lib/api", () => ({
  api: { clientes: { list: (...args: unknown[]) => mockList(...args) } },
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: null, status: "unauthenticated" }),
  getSession: vi.fn(async () => null),
  signOut: vi.fn(),
  signIn: vi.fn(),
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

import ClientesPage from "@/app/clientes/page";

const NETWORK_MESSAGE =
  "Error de red: no se pudo conectar con el servidor (http://localhost:3001). Verifique que el backend esté ejecutándose.";

function networkError(message?: string): Error {
  const err = new Error(message);
  (err as Error & { kind?: string }).kind = "network";
  return err;
}

beforeEach(() => {
  mockList.mockReset();
});

afterEach(() => {
  cleanup();
});

describe("INC00-AUTH-06 error de red visible en la lista de clientes", () => {
  it("muestra el mensaje de indisponibilidad en la UI y ofrece reintento", async () => {
    mockList.mockRejectedValueOnce(networkError(NETWORK_MESSAGE));

    render(<ClientesPage />);

    const alert = await waitFor(() => screen.getByRole("alert"));
    expect(alert.textContent).toContain("Error de red");

    const retry = screen.getByRole("button", { name: "Reintentar" });

    // El reintento vuelve a consultar y, si la red vuelve, pinta la lista.
    mockList.mockResolvedValueOnce({
      clientes: [
        {
          id: "cliente-1",
          cedula: "1234567890",
          nombres: "Ana",
          apellidos: "Perez",
          telefono: "3001112233",
          estado: "ACTIVO",
          sede: { nombre: "Sede Norte" },
        },
      ],
    });

    fireEvent.click(retry);

    await waitFor(() => expect(screen.getByText("Ver ficha")).toBeTruthy());
    expect(screen.queryByRole("alert")).toBeNull();
    expect(mockList).toHaveBeenCalledTimes(2);
  });

  it("usa un mensaje de respaldo cuando el error no trae texto", async () => {
    mockList.mockRejectedValueOnce(networkError(""));

    render(<ClientesPage />);

    const alert = await waitFor(() => screen.getByRole("alert"));
    // El texto exacto vive en el parrafo del banner (el contenedor incluye el boton).
    expect(alert.querySelector("p")?.textContent).toBe(
      "No se pudo conectar con el servidor. Intenta de nuevo."
    );
  });

  it("no muestra 'No se encontraron clientes' cuando la carga fallo", async () => {
    mockList.mockRejectedValueOnce(networkError(NETWORK_MESSAGE));

    render(<ClientesPage />);

    await waitFor(() => screen.getByRole("alert"));
    expect(screen.queryByText("No se encontraron clientes")).toBeNull();
  });
});
