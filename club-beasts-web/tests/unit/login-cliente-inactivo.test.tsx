// @vitest-environment jsdom
/**
 * INC04-CLI-04 (web) — RED del mensaje de cuenta inactiva en /login-cliente.
 *
 * Contrato (HU08-C04a + DEC-034 + R11): cuando el backend responde 401
 * `AUTH_CLIENTE_INACTIVO`, el portal del cliente muestra el literal G14
 * "La cuenta está inactiva. Contacte con recepción." en un elemento con
 * role=alert (mismo patron accesible del banner de sesion vencida).
 *
 * Estado RED (2026-10-19): `src/app/login-cliente/page.tsx:37-38` traduce
 * CUALQUIER `result.error` de `signIn` al mensaje generico "Cedula o PIN
 * invalido" y el div de error no tiene role=alert, asi que:
 *  - el mensaje literal del backend nunca llega a la pantalla (FALLA);
 *  - el contenedor del error no es un `alert` accesible (FALLA).
 * GREEN (frontend-developer): propagar el `error` del backend desde el
 * provider de next-auth (`src/lib/authorize` devuelve null hoy y pierde el
 * mensaje) y distinguir en la pagina el caso AUTH_CLIENTE_INACTIVO del
 * Cedula/PIN invalido, renderizando el literal en un role=alert.
 *
 * R11 (api.ts): la clasificacion del 401 AUTH_CLIENTE_INACTIVO se prueba en
 * `api-errors.test.ts` (kind != session_expired); aqui solo vive la UI.
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

import LoginClientePage from "@/app/login-cliente/page";

const MENSAJE_INACTIVA = "La cuenta está inactiva. Contacte con recepción.";

function setUrl(path: string): void {
  window.history.replaceState({}, "", path);
}

async function enviarLogin(): Promise<void> {
  const { container } = render(<LoginClientePage />);
  fireEvent.change(screen.getByLabelText("Cedula"), {
    target: { value: "9914000001" },
  });
  fireEvent.change(screen.getByLabelText("PIN (4 digitos)"), {
    target: { value: "1234" },
  });
  fireEvent.submit(container.querySelector("form") as HTMLFormElement);
}

beforeEach(() => {
  pushMock.mockReset();
  refreshMock.mockReset();
  signInMock.mockReset();
  setUrl("/login-cliente");
});

afterEach(() => {
  cleanup();
});

describe("INC04-CLI-04 el portal muestra la cuenta inactiva", () => {
  it("muestra el literal del backend en un role=alert cuando signIn devuelve el error de cuenta inactiva", async () => {
    signInMock.mockResolvedValue({ error: MENSAJE_INACTIVA });

    await enviarLogin();

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe(MENSAJE_INACTIVA);
    // No navega al portal con la cuenta bloqueada.
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("el error generico de credenciales sigue mostrando el mensaje de PIN invalido", async () => {
    signInMock.mockResolvedValue({ error: "CredentialsSignin" });

    await enviarLogin();

    await waitFor(() =>
      expect(screen.getByText("Cedula o PIN invalido")).toBeTruthy()
    );
    expect(pushMock).not.toHaveBeenCalled();
  });
});
