// @vitest-environment jsdom
/**
 * INC-06 (RED) — aviso de activar membresia en el portal del cliente.
 * Criterios: `INC06-ACC-01`, `INC06-ACC-06`, `INC06-ACC-07` (regresion).
 *
 * DEC-051 (copy fijo, opcion (a) en PEND-01/02/03/04):
 *  - Titulo del aviso: "No tienes una membresia activa".
 *  - Subtexto/CTA: "Contacta recepcion para activar tu membresia y volver a
 *    acceder".
 *  - NUNCA la palabra "suspension" (evita la colision con el estado
 *    `SUSPENDIDO` del cliente, HU-17/DEC-030).
 *  - Superficie: aviso a PANTALLA COMPLETA dentro de /portal (solo Navbar +
 *    tarjeta central; sin tarjetas de estado/rutina/plan/identidad).
 *  - Accesibilidad (INC06-ACC-06): `role="alert"` (equivalente accesible
 *    fijado por este RED) que porta el copy completo; titulo como heading
 *    (estructura semantica legible por lector de pantalla).
 *
 * FASE RED (2026-10-29): `src/app/portal/page.tsx` ignora el campo
 * `sinMembresiaActiva` del resumen y pinta el portal completo, por lo que los
 * tests del aviso fallan (el copy no existe). Las regresiones
 * (`sinMembresiaActiva: false` -> portal completo; PIN obligatorio intacto)
 * pasan hoy y protegen el GREEN de frontend-developer.
 *
 * GREEN (frontend-developer): pantalla de aviso en `/portal` cuando
 * `sinMembresiaActiva` es true (PEND-03(a)) con el copy de PEND-01; pintado
 * actual intacto cuando es false. Ninguna asercion cambia.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";

/** Copy exacto DEC-051 PEND-01(a): sin la palabra "suspension". */
const TITULO_AVISO = "No tienes una membresia activa";
const SUBTEXTO_AVISO =
  "Contacta recepcion para activar tu membresia y volver a acceder";

/** Tarjetas que DEC-051 PEND-03(a) excluye del aviso a pantalla completa. */
const TARJETAS_PORTAL = [
  "Mi Informacion",
  "Estado de acceso",
  "Mi Rutina",
  "Plan Nutricional",
];

const { mockResumen, mockSesion } = vi.hoisted(() => ({
  mockResumen: vi.fn(),
  mockSesion: {
    value: {
      data: {
        user: { name: "Cliente Aviso", role: "CLIENTE", debeCambiarPin: false },
      },
      status: "authenticated",
      update: vi.fn(),
    },
  },
}));

// Mock del cliente API: el portal consume api.portal.resumen() y de ahi sale
// `sinMembresiaActiva` (R3: booleano simple, sin campos nuevos — R11).
vi.mock("@/lib/api", () => ({
  api: {
    portal: {
      resumen: (...args: unknown[]) => mockResumen(...args),
    },
  },
}));

vi.mock("next-auth/react", () => ({
  useSession: () => mockSesion.value,
  getSession: vi.fn(async () => null),
  signOut: vi.fn(),
  signIn: vi.fn(),
}));

vi.mock("next/navigation", () => ({
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

import PortalPage from "@/app/portal/page";

/** Resumen base (portalResumenResponseSchema, HU-25) + flag de INC-06. */
function resumenCon(sinMembresiaActiva: boolean) {
  return {
    cliente: {
      id: "cliente-1",
      nombres: "Ana Maria",
      apellidos: "Perez Gomez",
      cedula: "1234567890",
      sede: { id: "sede-1", nombre: "Sede Principal" },
    },
    estadoAccesoGym: sinMembresiaActiva ? "VENCIDA" : "ACTIVA",
    fechaVencimiento: sinMembresiaActiva ? "2026-05-31" : "2026-12-31",
    congelacion: null,
    fechaActual: "2026-06-15",
    sinMembresiaActiva,
  };
}

beforeEach(() => {
  mockResumen.mockReset();
  mockSesion.value = {
    data: {
      user: { name: "Cliente Aviso", role: "CLIENTE", debeCambiarPin: false },
    },
    status: "authenticated",
    update: vi.fn(),
  };
});

afterEach(() => {
  cleanup();
});

// ─── INC06-ACC-01 / ACC-06 — aviso a pantalla completa con copy DEC-051 ─────

describe("INC06-ACC-01/06 el aviso de activar membresia se sirve a pantalla completa", () => {
  it("ACC-01/06 con sinMembresiaActiva true renderiza el copy exacto de DEC-051 PEND-01(a)", async () => {
    mockResumen.mockResolvedValue(resumenCon(true));

    render(<PortalPage />);

    await waitFor(() => expect(mockResumen).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(TITULO_AVISO)).toBeTruthy();
    expect(await screen.findByText(SUBTEXTO_AVISO)).toBeTruthy();
  });

  it("ACC-06 el aviso vive en un role=alert accesible con el copy completo y el titulo es heading (estructura semantica)", async () => {
    mockResumen.mockResolvedValue(resumenCon(true));

    render(<PortalPage />);

    const alertas = await screen.findAllByRole("alert");
    const aviso = alertas.filter((nodo) =>
      (nodo.textContent ?? "").includes(TITULO_AVISO)
    );
    expect(aviso).toHaveLength(1);
    expect(aviso[0].textContent).toContain(SUBTEXTO_AVISO);
    // Legible por lector de pantalla: el titulo del aviso es un heading.
    expect(screen.getByRole("heading", { name: TITULO_AVISO })).toBeTruthy();
  });

  it("ACC-06 el copy del aviso nunca usa la palabra 'suspension' (DEC-051 PEND-01(a))", async () => {
    mockResumen.mockResolvedValue(resumenCon(true));

    render(<PortalPage />);

    // El aviso se renderiza (si no, la guardia de copy seria vacia).
    expect(await screen.findByText(TITULO_AVISO)).toBeTruthy();
    expect(document.body.textContent ?? "").not.toMatch(/suspensi[oó]n/i);
  });

  it("ACC-01 DEC-051 PEND-03(a): el aviso reemplaza el portal completo (sin tarjetas de estado/rutina/plan/identidad)", async () => {
    mockResumen.mockResolvedValue(resumenCon(true));

    render(<PortalPage />);

    expect(await screen.findByText(TITULO_AVISO)).toBeTruthy();
    for (const tarjeta of TARJETAS_PORTAL) {
      expect(
        screen.queryByRole("heading", { name: tarjeta }),
        `la tarjeta "${tarjeta}" no debe pintarse en el aviso a pantalla completa`
      ).toBeNull();
    }
  });
});

// ─── INC06-ACC-07 — regresion: con acceso el portal queda intacto ────────────

describe("INC06-ACC-07 con membresia activa el portal se pinta completo y sin aviso", () => {
  it("ACC-07 con sinMembresiaActiva false se pintan las tarjetas del portal y no hay aviso", async () => {
    mockResumen.mockResolvedValue(resumenCon(false));

    render(<PortalPage />);

    await waitFor(() => expect(mockResumen).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Ana Maria Perez Gomez")).toBeTruthy();
    for (const tarjeta of TARJETAS_PORTAL) {
      expect(
        await screen.findByRole("heading", { name: tarjeta }),
        `la tarjeta "${tarjeta}" del portal debe seguir pintandose`
      ).toBeTruthy();
    }
    expect(await screen.findByText("Activo")).toBeTruthy();
    expect(screen.queryByText(TITULO_AVISO)).toBeNull();
    expect(screen.queryByText(SUBTEXTO_AVISO)).toBeNull();
  });

  it("ACC-07 el flujo de cambio de PIN obligatorio no se ve afectado por el aviso (HU-03 intacta)", async () => {
    // Con PIN pendiente la pantalla de cambio va ANTES del portal y del
    // aviso: el bloqueo de membresia no altera el flujo de identidad (DEC-051
    // PEND-02(a): identidad != acceso).
    mockSesion.value = {
      data: {
        user: { name: "Cliente Aviso", role: "CLIENTE", debeCambiarPin: true },
      },
      status: "authenticated",
      update: vi.fn(),
    };
    mockResumen.mockResolvedValue(resumenCon(true));

    render(<PortalPage />);

    expect(
      await screen.findByRole("heading", { name: "Cambio de PIN Obligatorio" })
    ).toBeTruthy();
    expect(screen.queryByText(TITULO_AVISO)).toBeNull();
    expect(screen.queryByText(SUBTEXTO_AVISO)).toBeNull();
  });
});
