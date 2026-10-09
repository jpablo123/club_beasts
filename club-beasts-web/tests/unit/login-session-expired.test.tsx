// @vitest-environment jsdom
/**
 * INC00-AUTH-02 / INC00-AUTH-03 — pantallas de login
 * Incremento: INC-00-estabilizacion-fases-1-2 (cierre hallazgos B1 y B2)
 *
 * B1: cuando la recuperacion de sesion llega al login con
 * `reason=session_expired`, la pantalla muestra el mensaje aprobado del
 * backend y elimina el param (un refresco no lo vuelve a mostrar).
 * B3/Auth-03: tras iniciar sesion con `callbackUrl`, el usuario regresa a la
 * pantalla original.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const { pushMock, refreshMock, signInMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
  signInMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock, replace: vi.fn() }),
}));

vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => signInMock(...args),
  getSession: vi.fn(async () => null),
  useSession: () => ({ data: null, status: "unauthenticated" }),
  signOut: vi.fn(),
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

import LoginPage from "@/app/login/page";
import LoginClientePage from "@/app/login-cliente/page";
import { resolvePostLoginPath } from "@/lib/redirect";

const APPROVED_MESSAGE =
  "Tu sesión venció por seguridad. Inicia sesión de nuevo para continuar.";

function setUrl(path: string): void {
  window.history.replaceState({}, "", path);
}

beforeEach(() => {
  pushMock.mockReset();
  refreshMock.mockReset();
  signInMock.mockReset();
  signInMock.mockResolvedValue({ error: null });
  setUrl("/login");
});

afterEach(() => {
  cleanup();
});

describe("INC00-AUTH-02 el login muestra el mensaje aprobado", () => {
  it("/login muestra el mensaje aprobado cuando llega con reason=session_expired", () => {
    setUrl("/login?reason=session_expired&callbackUrl=%2Fclientes%2Fcliente-42");

    render(<LoginPage />);

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toBe(APPROVED_MESSAGE);
  });

  it("muestra el mensaje una sola vez: elimina reason y conserva callbackUrl", () => {
    setUrl("/login?reason=session_expired&callbackUrl=%2Fclientes%2Fcliente-42");

    const { unmount } = render(<LoginPage />);
    unmount();

    // Param consumido: la URL conserva el retorno pero ya no el motivo.
    expect(window.location.search).not.toContain("reason=");
    expect(window.location.search).toContain("callbackUrl=%2Fclientes%2Fcliente-42");

    // Simula un refresco con la URL ya limpia: no vuelve a mostrarse.
    render(<LoginPage />);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("/login-cliente tambien muestra el mensaje aprobado", () => {
    setUrl(
      "/login-cliente?reason=session_expired&callbackUrl=%2Fportal"
    );

    render(<LoginClientePage />);

    expect(screen.getByRole("alert").textContent).toBe(APPROVED_MESSAGE);
    expect(window.location.search).not.toContain("reason=");
    expect(window.location.search).toContain("callbackUrl=%2Fportal");
  });

  it("sin reason=session_expired no se muestra ningun aviso", () => {
    setUrl("/login?callbackUrl=%2Fclientes");

    render(<LoginPage />);

    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("INC00-AUTH-03 regreso a la pantalla original tras iniciar sesion", () => {
  it("/login empuja hacia el callbackUrl conservado", async () => {
    setUrl("/login?reason=session_expired&callbackUrl=%2Fclientes%2Fcliente-42");
    const { container } = render(<LoginPage />);
    expect(screen.getByRole("alert")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "dueño@clubbeasts.com" },
    });
    fireEvent.change(screen.getByLabelText("Contrasena"), {
      target: { value: "secret123" },
    });
    fireEvent.submit(container.querySelector("form") as HTMLFormElement);

    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith("/clientes/cliente-42")
    );
    expect(resolvePostLoginPath("/clientes")).toBe("/clientes/cliente-42");
  });

  it("/login-cliente empuja hacia el callbackUrl del portal", async () => {
    setUrl("/login-cliente?callbackUrl=%2Fportal");

    const { container } = render(<LoginClientePage />);

    fireEvent.change(screen.getByLabelText("Cedula"), {
      target: { value: "1234567890" },
    });
    fireEvent.change(screen.getByLabelText("PIN (4 digitos)"), {
      target: { value: "1234" },
    });
    fireEvent.submit(container.querySelector("form") as HTMLFormElement);

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/portal"));
  });

  it("sin callbackUrl regresa al destino por defecto de cada login", async () => {
    setUrl("/login");

    const { container } = render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "dueño@clubbeasts.com" },
    });
    fireEvent.change(screen.getByLabelText("Contrasena"), {
      target: { value: "secret123" },
    });
    fireEvent.submit(container.querySelector("form") as HTMLFormElement);

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/clientes"));
  });
});
