// @vitest-environment jsdom
/**
 * INC-08 (RED) — Logout propio de la pantalla `/recepcion` (DEC-053).
 * Criterios: `INC08-NAV-01`, `INC08-NAV-02`, `INC08-NAV-03`.
 *
 * Contrato fijado por este RED (para el GREEN, T8):
 *  - `/recepcion` con sesion staff (DUENO o RECEPCIONISTA) muestra UN control
 *    "Salir" (role="button", nombre exacto) ademas de las herramientas.
 *  - El handler es exactamente el patron del Navbar:
 *    `signOut({ callbackUrl: "/" })` (DEC-053). Ni mas claves, ni otra URL.
 *  - El control es un `<button>` nativo en el orden de tabulacion (tabIndex 0,
 *    enfocable): los navegadores le dan activacion con Enter/Space sin JS
 *    extra. La activacion real con Tab + Enter/Space se verifica en navegador
 *    real en `tests/e2e/inc08-logout-recepcion.spec.ts` (fila 3 de la matriz);
 *    aqui se fija el contrato DOM que la hace posible (patron INC-07: el
 *    detalle de teclado vive en E2E, el contrato de render en unit).
 *  - El control nuevo NO reemplaza ni duplica la marca del Navbar:
 *    exactamente UN "Salir" por pantalla (localizador endurecido C4:
 *    `exact: true` + conteo unico).
 *
 * FASE RED (2026-10-30): el control aun no existe en `src/app/recepcion/page`
 * (hoy `showAuth={false}` oculta el logout del Navbar), asi que cada test
 * falla en el localizador: "Unable to find role button 'Salir'".
 *
 * PIN obligatorio intacto: esta suite no toca autenticacion, guards
 * `debeCambiarPin` ni middleware; solo observa el render y el handler.
 *
 * Restricciones INC00-QA-01/02: sin `isVisible()` condicional, skips ni
 * `only`, sin aserciones vacias.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const { mockSignOut, mockConsulta, mockPush } = vi.hoisted(() => ({
  mockSignOut: vi.fn(),
  mockConsulta: vi.fn(),
  mockPush: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: {
    recepcion: {
      consulta: (...args: unknown[]) => mockConsulta(...args),
    },
  },
}));

let roleActual: string | null = "DUENO";

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: roleActual
      ? { user: { name: "Staff Recepcion", role: roleActual } }
      : null,
    status: roleActual ? "authenticated" : "unauthenticated",
    update: vi.fn(),
  }),
  getSession: vi.fn(async () => null),
  signOut: (...args: unknown[]) => mockSignOut(...args),
  signIn: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), refresh: vi.fn() }),
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

import RecepcionPage from "@/app/recepcion/page";

/**
 * Localizador endurecido (C4): rol button con nombre "Salir". En RTL el
 * string de `name` de `getByRole` es coincidencia exacta de nombre accesible
 * (sin substring) — mismo espiritu que `exact: true` de Playwright.
 */
function salirControl() {
  return screen.getByRole("button", { name: "Salir" });
}

beforeEach(() => {
  roleActual = "DUENO";
  mockSignOut.mockReset();
  mockConsulta.mockReset();
  mockPush.mockReset();
});

afterEach(() => {
  cleanup();
});

// ─── INC08-NAV-01: control "Salir" visible para DUENO y RECEPCIONISTA ────────

describe("INC08-NAV-01 /recepcion muestra el control 'Salir' para el staff", () => {
  it("DUENO: existe exactamente un control 'Salir' (role button, nombre exacto)", () => {
    roleActual = "DUENO";
    render(<RecepcionPage />);

    const salir = salirControl();
    // Un unico control: ni duplicado con el Navbar ni dos viajes de salida.
    expect(screen.getAllByRole("button", { name: "Salir" })).toHaveLength(1);
    // El patron del Navbar (DEC-053) es un <button> con el label "Salir".
    expect(salir.tagName).toBe("BUTTON");
    expect(salir.textContent).toBe("Salir");
  });

  it("RECEPCIONISTA: existe exactamente un control 'Salir' (role button, nombre exacto)", () => {
    roleActual = "RECEPCIONISTA";
    render(<RecepcionPage />);

    const salir = salirControl();
    expect(screen.getAllByRole("button", { name: "Salir" })).toHaveLength(1);
    expect(salir.tagName).toBe("BUTTON");
    expect(salir.textContent).toBe("Salir");
  });
});

// ─── INC08-NAV-02: handler signOut({ callbackUrl: "/" }) (patron Navbar) ─────

describe("INC08-NAV-02 el control 'Salir' cierra sesion con el patron del Navbar", () => {
  it("activar 'Salir' invoca signOut({ callbackUrl: '/' }) exactamente una vez", () => {
    roleActual = "DUENO";
    render(<RecepcionPage />);

    fireEvent.click(salirControl());

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    // DEC-053: patron exacto del Navbar, destino "/" (landing). Ni
    // callbackUrl distinto, ni claves extra (p. ej. redirect) que cambien
    // el contrato observado.
    expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: "/" });
  });
});

// ─── INC08-NAV-03: alcanzable por teclado (contrato DOM) ─────────────────────

describe("INC08-NAV-03 el control 'Salir' es alcanzable por teclado", () => {
  it("es un <button> nativo en el orden de tabulacion (tabIndex 0) y recibe foco", () => {
    roleActual = "RECEPCIONISTA";
    render(<RecepcionPage />);

    const salir = salirControl();
    // Contrato DOM de la activacion con Enter/Space en navegador real: boton
    // nativo, sin tabindex="-1" y enfocable (la verificacion de Tab + Enter y
    // Space con foco visible vive en el E2E de la fila 3 de la matriz).
    expect(salir.tagName).toBe("BUTTON");
    expect(salir.tabIndex).toBe(0);

    salir.focus();
    expect(document.activeElement).toBe(salir);
  });
});

// ─── H-INC08-02: fallback CLIENTE de /recepcion (contrato del enlace) ────────

/**
 * H-INC08-02 (cierre del vacio de cobertura de la auditoria de navegacion de
 * INC-08): la capa 2 de la salida segura — el fallback de `recepcion/page.tsx`
 * para sesiones no-staff — debe mostrar el enlace "Volver a mi portal" con
 * destino `/portal` y NO pintar ninguna herramienta de recepcion ni el
 * control "Salir". En navegacion real la capa 1 (`middleware.ts:36`) redirige
 * antes de renderizar, por eso el contrato del enlace se fija aqui (render con
 * sesion CLIENTE) mientras el recorrido de navegador ejecutado vive en
 * `tests/e2e/inc08-logout-recepcion.spec.ts` (H-INC08-02). Si este contrato
 * falla es hallazgo de producto: se reporta, no se arregla aqui.
 */
describe("H-INC08-02 /recepcion con sesion CLIENTE muestra la salida segura a /portal", () => {
  it("CLIENTE: sin herramientas de recepcion, sin 'Salir' y con el enlace 'Volver a mi portal' -> /portal", () => {
    roleActual = "CLIENTE";
    render(<RecepcionPage />);

    // Sin fuga de la UI de recepcion (capa 2): ni herramientas ni "Salir".
    expect(screen.queryByRole("heading", { name: "Consulta por cedula" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Registrar ingreso" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Cliente rapido" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Salir" })).toBeNull();

    // Salida segura: el enlace "Volver a mi portal" apunta exactamente a /portal.
    const volver = screen.getByRole("link", { name: "Volver a mi portal" });
    expect(volver.getAttribute("href")).toBe("/portal");
  });
});
