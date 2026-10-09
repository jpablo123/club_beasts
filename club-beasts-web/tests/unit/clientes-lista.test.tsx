// @vitest-environment jsdom
/**
 * INC00-CLI-05 — Filtros, estados vacios, error y paginacion de la lista.
 * Incremento: INC-00-estabilizacion-fases-1-2 (Tarea 11 / GAP-003)
 *
 * INC00-QA-03: los filtros se prueban con fixtures que garantizan al menos un
 * resultado incluido y otro excluido (sede-1 vs sede-2).
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
import {
  construirParamsClientes,
  puedeAvanzarPagina,
  puedeRetrocederPagina,
  textoPagina,
  OPCIONES_SEDE_FILTRO,
} from "@/lib/clientes-lista";

/* ------------------------------------------------------------------ */
/* Fixtures deterministas                                             */
/* ------------------------------------------------------------------ */

interface Fila {
  id: string;
  cedula: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  estado: string;
  sede: { id: string; nombre: string };
}

function generarClientes(cantidad: number): Fila[] {
  const rows: Fila[] = Array.from({ length: cantidad }, (_, i) => ({
    id: `c${i + 1}`,
    cedula: String(1111111111 + i),
    nombres: `Nombre${i + 1}`,
    apellidos: `Apellido${i + 1}`,
    telefono: `30000000${i}`,
    estado: i % 3 === 0 ? "NUEVO" : "ACTIVO",
    sede:
      i % 2 === 0
        ? { id: "sede-1", nombre: "Sede Principal" }
        : { id: "sede-2", nombre: "Sede Secundaria" },
  }));

  // Cliente incluido/excluido conocidos para el filtro por sede.
  rows[0] = { ...rows[0], nombres: "Ana", apellidos: "Perez", estado: "ACTIVO" };
  rows[1] = { ...rows[1], nombres: "Luis", apellidos: "Gomez", estado: "ACTIVO" };
  return rows;
}

const FIXTURES = generarClientes(45); // 45 resultados, limit 20 -> 3 paginas

type Params = {
  search?: string;
  sedeId?: string;
  estado?: string;
  page?: number;
  limit?: number;
};

/** Backend simulado: aplica los mismos filtros y paginacion que la API. */
function servidorClientes(params: Params = {}) {
  const rows = FIXTURES.filter(
    (c) =>
      (!params.sedeId || c.sede.id === params.sedeId) &&
      (!params.estado || c.estado === params.estado) &&
      (!params.search ||
        `${c.nombres} ${c.apellidos} ${c.cedula}`
          .toLowerCase()
          .includes(params.search.toLowerCase()))
  );
  const limit = params.limit ?? 20;
  const page = params.page ?? 1;
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const desde = (page - 1) * limit;
  return {
    clientes: rows.slice(desde, desde + limit),
    total,
    page,
    limit,
    pages,
  };
}

/* ------------------------------------------------------------------ */
/* (1) Logica pura de params/paginacion                                */
/* ------------------------------------------------------------------ */

describe("logica de filtros y paginacion de la lista", () => {
  it("incluye search, estado, sedeId, page y limit cuando tienen valor", () => {
    expect(
      construirParamsClientes({
        search: "ana",
        estado: "ACTIVO",
        sedeId: "sede-2",
        page: 3,
        limit: 20,
      })
    ).toEqual({
      search: "ana",
      estado: "ACTIVO",
      sedeId: "sede-2",
      page: 3,
      limit: 20,
    });
  });

  it("omite los filtros vacios (excluido asertado)", () => {
    expect(
      construirParamsClientes({ search: "", estado: "", sedeId: "", page: 1, limit: 20 })
    ).toEqual({ page: 1, limit: 20 });
  });

  it("deshabilita Anterior en la primera pagina y Siguiente en la ultima", () => {
    expect(puedeRetrocederPagina(1)).toBe(false);
    expect(puedeRetrocederPagina(2)).toBe(true);
    expect(puedeAvanzarPagina(1, 3)).toBe(true);
    expect(puedeAvanzarPagina(3, 3)).toBe(false);
  });

  it("describe la pagina actual", () => {
    expect(textoPagina(2, 3)).toBe("Página 2 de 3");
  });

  it("el filtro de sede usa las dos sedes del seed y 'Todas las sedes'", () => {
    expect(OPCIONES_SEDE_FILTRO).toEqual([
      { value: "", label: "Todas las sedes" },
      { value: "sede-1", label: "Sede Principal" },
      { value: "sede-2", label: "Sede Secundaria" },
    ]);
  });
});

/* ------------------------------------------------------------------ */
/* (2) UI de la lista                                                  */
/* ------------------------------------------------------------------ */

beforeEach(() => {
  mockList.mockReset();
  mockList.mockImplementation(async (params?: Params) => servidorClientes(params));
});

afterEach(() => {
  cleanup();
});

describe("INC00-CLI-05 filtro por sede (incluido y excluido)", () => {
  it("al filtrar por sede-2 muestra solo clientes de esa sede", async () => {
    render(<ClientesPage />);

    // Estado inicial: los dos clientes destacados estan visibles.
    await screen.findByText("Ana Perez");
    expect(screen.getByText("Luis Gomez")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Filtrar por sede"), {
      target: { value: "sede-2" },
    });

    // Incluido: cliente de sede-2.
    await waitFor(() => expect(screen.getByText("Luis Gomez")).toBeTruthy());
    // Excluido: cliente de sede-1.
    expect(screen.queryByText("Ana Perez")).toBeNull();

    expect(mockList).toHaveBeenLastCalledWith(
      expect.objectContaining({ sedeId: "sede-2", page: 1, limit: 20 })
    );
  });

  it("al filtrar por estado muestra solo clientes de ese estado", async () => {
    render(<ClientesPage />);

    await screen.findByText("Ana Perez");

    fireEvent.change(screen.getByLabelText("Filtrar por estado"), {
      target: { value: "NUEVO" },
    });

    // Ana Perez es ACTIVO -> excluida; los NUEVO si entran.
    await waitFor(() => expect(screen.queryByText("Ana Perez")).toBeNull());
    expect(screen.getByText("Nombre4 Apellido4")).toBeTruthy(); // i=3 -> NUEVO
    expect(mockList).toHaveBeenLastCalledWith(
      expect.objectContaining({ estado: "NUEVO", page: 1 })
    );
  });
});

describe("INC00-CLI-05 paginacion", () => {
  it("muestra indicador, total y controles deshabilitados en los extremos", async () => {
    render(<ClientesPage />);

    await screen.findByText("Página 1 de 3");
    expect(screen.getByText("45 resultados")).toBeTruthy();

    const anterior = screen.getByRole("button", { name: "Anterior" });
    const siguiente = screen.getByRole("button", { name: "Siguiente" });
    expect((anterior as HTMLButtonElement).disabled).toBe(true);
    expect((siguiente as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(siguiente);
    await screen.findByText("Página 2 de 3");
    expect(mockList).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
    expect(
      (screen.getByRole("button", { name: "Anterior" }) as HTMLButtonElement).disabled
    ).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    await screen.findByText("Página 3 de 3");
    expect(
      (screen.getByRole("button", { name: "Siguiente" }) as HTMLButtonElement).disabled
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: "Anterior" }) as HTMLButtonElement).disabled
    ).toBe(false);
  });

  it("reinicia a la pagina 1 al cambiar la sede", async () => {
    render(<ClientesPage />);

    await screen.findByText("Página 1 de 3");
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    await screen.findByText("Página 2 de 3");

    fireEvent.change(screen.getByLabelText("Filtrar por sede"), {
      target: { value: "sede-1" },
    });

    await waitFor(() =>
      expect(mockList).toHaveBeenLastCalledWith(
        expect.objectContaining({ sedeId: "sede-1", page: 1 })
      )
    );
  });

  it("reinicia a la pagina 1 al cambiar el estado", async () => {
    render(<ClientesPage />);

    await screen.findByText("Página 1 de 3");
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    await screen.findByText("Página 2 de 3");

    fireEvent.change(screen.getByLabelText("Filtrar por estado"), {
      target: { value: "NUEVO" },
    });

    await waitFor(() =>
      expect(mockList).toHaveBeenLastCalledWith(
        expect.objectContaining({ estado: "NUEVO", page: 1 })
      )
    );
    expect(screen.queryByText("Página 2 de 3")).toBeNull();
  });

  it("reinicia a la pagina 1 al cambiar el termino de busqueda y muestra el estado vacio", async () => {
    render(<ClientesPage />);

    await screen.findByText("Página 1 de 3");
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    await screen.findByText("Página 2 de 3");

    fireEvent.change(screen.getByPlaceholderText("Buscar por cedula o nombre..."), {
      target: { value: "zzz-sin-resultados" },
    });

    await waitFor(() =>
      expect(mockList).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: "zzz-sin-resultados", page: 1 })
      )
    );
    await screen.findByText("No se encontraron clientes");
    expect(screen.queryByText("Página 2 de 3")).toBeNull();
  });
});
