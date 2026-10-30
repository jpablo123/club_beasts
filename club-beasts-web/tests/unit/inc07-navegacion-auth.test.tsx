// @vitest-environment jsdom
/**
 * INC-07 (RED) — Navegacion de regreso al dashboard en login y cambio de PIN.
 * Criterios: INC07-NAV-01..05 (unit; NAV-06 es la regresion E2E).
 *
 * DEC-049 + DEC-050 (destino por rol/estado) + contrato C1..C6:
 *  - `/login` y `/login-cliente` agregan un link visible "Volver al inicio":
 *    `href="/"` por defecto (anonimo); `href="/dashboard"` (staff) en `/login`
 *    y `href="/portal"` (CLIENTE) en `/login-cliente` cuando `useSession()`
 *    reporta sesion (ramas hoy inobservables en navegador porque el middleware
 *    redirige; aqui se inspeccionan con `useSession` mockeable).
 *  - Rama `debeCambiarPin` de `/portal`: link "Volver al inicio" `href="/"`
 *    fuera de `<nav>` (nunca `a[href="/"]` global: coincide el logo Navbar).
 *  - Rama `pinChangeSuccess`: CTA "Ir a mi portal" `<a href="/portal">` nativo.
 *  - `INC07-NAV-05`: el link nuevo no consume ni borra el `callbackUrl`.
 *
 * FASE RED (2026-10-29): `src/app/login/page.tsx`, `src/app/login-cliente/page.tsx`
 * y `src/app/portal/page.tsx` NO pintan aun ninguno de estos links/CTA, asi que
 * cada test que aserta el localizador nuevo FALLA hoy (elemento no encontrado
 * por getAllByRole/findAllByRole). La base existente (188 tests) no se toca.
 *
 * Localizadores (C4 para unit): `getByRole("link", { name })` con nombre
 * string, que en `@testing-library/dom` compara por IGUALDAD completa y
 * sensible a mayúsculas (`matches()`: `normalizedText === matcher`) — la
 * semántica exacta equivalente al `exact: true` de Playwright (esta version
 * de RTL no expone `exact` en `ByRoleOptions`) + `href` exacto via
 * `getAttribute("href")` + unicidad via
 * `getAllByRole(...).toHaveLength(1)` (equivalente RTL del `toHaveCount(1)` de
 * Playwright; el proyecto no incluye jest-dom, y `getByRole` con `hidden: false`
 * por defecto ya excluye nodos ocultos, equivalente de `toBeVisible()` a nivel
 * de DOM). El orden de Tab se aserta con `compareDocumentPosition` por
 * pantalla/estado. En la rama `debeCambiarPin` NUNCA se usa el selector global
 * `a[href="/"]` (coincidiria el logo del Navbar).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

const { pushMock, refreshMock, sessionState, updateMock, apiResumenMock, changePinMock } =
  vi.hoisted(() => ({
    pushMock: vi.fn(),
    refreshMock: vi.fn(),
    // Estado mutable de useSession: cada test fija la sesion que necesita.
    sessionState: {
      current: {
        data: null,
        status: "unauthenticated",
      } as {
        data: Record<string, unknown> | null;
        status: string;
      },
    },
    updateMock: vi.fn(),
    apiResumenMock: vi.fn(),
    changePinMock: vi.fn(),
  }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock, replace: vi.fn() }),
}));

vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
  getSession: vi.fn(async () => null),
  signOut: vi.fn(),
  useSession: () => ({
    data: sessionState.current.data,
    status: sessionState.current.status,
    update: updateMock,
  }),
}));

// next/link se colapsa a un <a href> nativo: el href exacto es observable.
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

// Solo la pagina de portal consume la API (resumen + changePin); los logins no.
vi.mock("@/lib/api", () => ({
  api: {
    portal: { resumen: (...args: unknown[]) => apiResumenMock(...args) },
    auth: { changePin: (...args: unknown[]) => changePinMock(...args) },
  },
}));

import LoginPage from "@/app/login/page";
import LoginClientePage from "@/app/login-cliente/page";
import PortalPage from "@/app/portal/page";

function setUrl(path: string): void {
  window.history.replaceState({}, "", path);
}

function sesionStaff() {
  sessionState.current = {
    data: { user: { name: "David Rozo", role: "DUENO" } },
    status: "authenticated",
  };
}

function sesionCliente(debeCambiarPin: boolean) {
  sessionState.current = {
    data: {
      user: { name: "Cliente Portal", role: "CLIENTE", debeCambiarPin },
    },
    status: "authenticated",
  };
}

function sesionAnonima() {
  sessionState.current = { data: null, status: "unauthenticated" };
}

/** Unico link por nombre exacto (equivalente de toHaveCount(1)); lanza si no existe. */
function linkUnico(name: string): HTMLAnchorElement {
  const links = screen.getAllByRole("link", { name });
  expect(links).toHaveLength(1);
  return links[0] as HTMLAnchorElement;
}

/** `segundo` viene despues que `primero` en el DOM (orden de tabulacion). */
function vieneDespuesDe(primero: Element, segundo: Element): boolean {
  return !!(
    primero.compareDocumentPosition(segundo) & Node.DOCUMENT_POSITION_FOLLOWING
  );
}

/** Envio del login staff con credenciales validas (signIn mockeado resuelve ok). */
function enviarLoginStaff(container: HTMLElement): void {
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "dueno@clubbeasts.com" },
  });
  fireEvent.change(screen.getByLabelText("Contrasena"), {
    target: { value: "secret123" },
  });
  fireEvent.submit(container.querySelector("form") as HTMLFormElement);
}

const RESUMEN = {
  cliente: {
    id: "cliente-1",
    nombres: "Ana Maria",
    apellidos: "Perez Gomez",
    cedula: "1234567890",
    sede: { id: "sede-1", nombre: "Sede Principal" },
  },
  estadoAccesoGym: "ACTIVA",
  fechaVencimiento: "2026-12-31",
  congelacion: null,
  fechaActual: "2026-06-15",
};

beforeEach(() => {
  pushMock.mockReset();
  refreshMock.mockReset();
  updateMock.mockReset();
  apiResumenMock.mockReset();
  changePinMock.mockReset();
  sesionAnonima();
  setUrl("/login");
});

afterEach(() => {
  cleanup();
});

describe("INC07-NAV-01: /login (staff) incluye el link 'Volver al inicio'", () => {
  it("anonimo: renderiza UN link 'Volver al inicio' href=/ alcanzable por Tab tras campos, boton y link cruzado", () => {
    setUrl("/login");
    const { container } = render(<LoginPage />);

    const link = linkUnico("Volver al inicio");
    expect(link.getAttribute("href")).toBe("/");

    // Orden de Tab: el link va DESPUES del boton de envio y del link cruzado
    // existente (contrato C1: "hermano DESPUES del link existente"), de modo
    // que Tab lo alcanza al final del bloque.
    const boton = screen.getByRole("button", { name: "Ingresar" });
    const cruzado = screen.getByRole("link", {
      name: "Portal del Cliente",
    });
    expect(vieneDespuesDe(boton, link)).toBe(true);
    expect(vieneDespuesDe(cruzado, link)).toBe(true);
    expect(container.querySelector("form")).toBeTruthy();
  });

  it("con sesion staff el href apunta a /dashboard (DEC-050, rama C1)", () => {
    setUrl("/login");
    sesionStaff();
    render(<LoginPage />);

    const link = linkUnico("Volver al inicio");
    expect(link.getAttribute("href")).toBe("/dashboard");
  });
});

describe("INC07-NAV-02: /login-cliente incluye el link y conserva el cruzado", () => {
  it("anonimo: link 'Volver al inicio' href=/ tras el link cruzado, que se conserva con href=/login", () => {
    setUrl("/login-cliente");
    render(<LoginClientePage />);

    const link = linkUnico("Volver al inicio");
    expect(link.getAttribute("href")).toBe("/");

    // El link cruzado existente se conserva intacto y va ANTES del nuevo.
    const cruzado = screen.getByRole("link", {
      name: "Iniciar sesion como Dueno/Recepcionista",
    });
    expect(cruzado.getAttribute("href")).toBe("/login");
    expect(vieneDespuesDe(cruzado, link)).toBe(true);
  });

  it("con sesion CLIENTE el href apunta a /portal (DEC-050, rama C1)", () => {
    setUrl("/login-cliente");
    sesionCliente(false);
    render(<LoginClientePage />);

    const link = linkUnico("Volver al inicio");
    expect(link.getAttribute("href")).toBe("/portal");
  });
});

describe("INC07-NAV-03: rama debeCambiarPin de /portal incluye el link de regreso", () => {
  it("pinta el formulario y UN link 'Volver al inicio' href=/ fuera de <nav>, tras el boton; navegar y volver repinta el formulario", async () => {
    setUrl("/portal");
    sesionCliente(true);
    apiResumenMock.mockResolvedValue(RESUMEN);

    const { container, unmount } = render(<PortalPage />);

    await screen.findByRole("heading", { name: "Cambio de PIN Obligatorio" });

    const link = linkUnico("Volver al inicio");
    expect(link.getAttribute("href")).toBe("/");

    // C3: el link NUEVO esta fuera de <nav> (dentro de <nav> vive el logo del
    // Navbar, que tambien es a[href="/"]: jamas se cuenta por selector global).
    expect(link.closest("nav")).toBeNull();

    // Orden de Tab: alcanzable despues del boton del formulario.
    const boton = screen.getByRole("button", { name: "Cambiar PIN" });
    expect(vieneDespuesDe(boton, link)).toBe(true);
    expect(container.querySelector("form")).toBeTruthy();

    // INC07-CONF-02 / INC07-R03: navegar fuera y volver a entrar NO bypassa la
    // guarda `debeCambiarPin`: /portal repinta el formulario obligatorio.
    unmount();
    render(<PortalPage />);
    await screen.findByRole("heading", { name: "Cambio de PIN Obligatorio" });
  });
});

describe("INC07-NAV-04: rama pinChangeSuccess de /portal muestra el CTA al portal", () => {
  it("tras cambiar el PIN exitosamente la tarjeta de exito muestra UNO 'Ir a mi portal' href=/portal nativo, fuera de <nav> y tras el titulo", async () => {
    setUrl("/portal");
    sesionCliente(true);
    apiResumenMock.mockResolvedValue(RESUMEN);
    changePinMock.mockResolvedValue({});

    render(<PortalPage />);

    await screen.findByRole("heading", { name: "Cambio de PIN Obligatorio" });

    fireEvent.change(screen.getByLabelText("PIN Actual"), {
      target: { value: "1234" },
    });
    fireEvent.change(screen.getByLabelText("Nuevo PIN", { exact: true }), {
      target: { value: "4321" },
    });
    fireEvent.change(screen.getByLabelText("Confirmar Nuevo PIN"), {
      target: { value: "4321" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "Cambiar PIN" }).closest("form") as HTMLFormElement
    );

    // El CTA aparece con el exito (RED: aun no existe).
    const cta = (await screen.findAllByRole("link", {
      name: "Ir a mi portal",
    }))[0] as HTMLAnchorElement;
    expect(
      screen.getAllByRole("link", { name: "Ir a mi portal" })
    ).toHaveLength(1);
    expect(cta.getAttribute("href")).toBe("/portal");

    // C2/C3: CTA dentro de la tarjeta de exito, fuera de <nav>, tras el titulo.
    expect(cta.closest("nav")).toBeNull();
    const titulo = screen.getByRole("heading", { name: "PIN Actualizado" });
    expect(vieneDespuesDe(titulo, cta)).toBe(true);

    // La pantalla de exito reemplaza al formulario (sin callejon visible).
    expect(
      screen.queryByRole("heading", { name: "Cambio de PIN Obligatorio" })
    ).toBeNull();
  });
});

describe("INC07-NAV-05: el link nuevo no consume el callbackUrl (INC00-AUTH-03)", () => {
  it("/login con callbackUrl=/clientes: el query sobrevive al render del link y el submit regresa a /clientes", async () => {
    setUrl("/login?callbackUrl=%2Fclientes");
    const { container } = render(<LoginPage />);

    // El link coexiste con el query param sin consumirlo (RED: aun no existe).
    const link = linkUnico("Volver al inicio");
    expect(link.getAttribute("href")).toBe("/");
    expect(window.location.search).toContain("callbackUrl=%2Fclientes");

    enviarLoginStaff(container);

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/clientes"));
  });

  it("/login con callbackUrl interno distinto del fallback lo respeta (no es el fallback /clientes)", async () => {
    // Prueba observabilidad real del param: /clientes/cliente-42 jamas seria
    // el resultado de un fallback /clientes, asi que solo puede venir del
    // callbackUrl consumido del formulario.
    setUrl("/login?callbackUrl=%2Fclientes%2Fcliente-42");
    const { container } = render(<LoginPage />);

    const link = linkUnico("Volver al inicio");
    expect(link.getAttribute("href")).toBe("/");

    enviarLoginStaff(container);

    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith("/clientes/cliente-42")
    );
  });

  it("/login sin callbackUrl conserva el fallback /clientes", async () => {
    setUrl("/login");
    const { container } = render(<LoginPage />);

    const link = linkUnico("Volver al inicio");
    expect(link.getAttribute("href")).toBe("/");

    enviarLoginStaff(container);

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/clientes"));
  });

  it("/login-cliente sin callbackUrl conserva el fallback /portal", async () => {
    setUrl("/login-cliente");
    const { container } = render(<LoginClientePage />);

    const link = linkUnico("Volver al inicio");
    expect(link.getAttribute("href")).toBe("/");

    fireEvent.change(screen.getByLabelText("Cedula"), {
      target: { value: "1234567890" },
    });
    fireEvent.change(screen.getByLabelText("PIN (4 digitos)"), {
      target: { value: "1234" },
    });
    fireEvent.submit(container.querySelector("form") as HTMLFormElement);

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/portal"));
  });
});
