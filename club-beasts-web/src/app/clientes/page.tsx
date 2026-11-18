"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type ApiError } from "@/lib/api";
import { Card, Button, Badge, Input, Select, Navbar, PageHeader } from "@/components";
import {
  TAMANO_PAGINA_CLIENTES,
  construirParamsClientes,
  puedeAvanzarPagina,
  puedeRetrocederPagina,
  textoPagina,
  OPCIONES_SEDE_FILTRO,
} from "@/lib/clientes-lista";

interface Cliente {
  id: string;
  cedula: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  email?: string;
  estado: string;
  sede: { nombre: string };
}

const estadoBadgeVariant: Record<string, "royal" | "success" | "warning" | "danger" | "gray"> = {
  NUEVO: "warning",
  ACTIVO: "success",
  SUSPENDIDO: "danger",
  RETIRADO: "gray",
  INACTIVO: "gray",
};

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState("");
  const [sedeId, setSedeId] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchClientes = async () => {
    setLoading(true);
    setError("");
    try {
      const data = (await api.clientes.list(
        construirParamsClientes({
          search,
          estado,
          sedeId,
          page,
          limit: TAMANO_PAGINA_CLIENTES,
        })
      )) as { clientes: Cliente[]; total?: number; pages?: number };
      setClientes(data.clientes);
      setTotal(typeof data.total === "number" ? data.total : data.clientes.length);
      setPages(typeof data.pages === "number" && data.pages > 0 ? data.pages : 1);
    } catch (err) {
      // INC00-AUTH-06: el error (p. ej. de red) se muestra en la UI y ofrece
      // reintento; la sesión no se cierra por un fallo de red.
      const apiErr = err as ApiError;
      setClientes([]);
      setError(
        apiErr.message || "No se pudo conectar con el servidor. Intenta de nuevo."
      );
    } finally {
      setLoading(false);
    }
  };

  // INC00-CLI-05: cualquier cambio de filtro o de pagina vuelve a consultar.
  useEffect(() => {
    fetchClientes();
  }, [search, estado, sedeId, page]);

  // Los filtros siempre reinician la paginacion a la pagina 1.
  const cambiarSearch = (valor: string) => {
    setPage(1);
    setSearch(valor);
  };

  const cambiarEstado = (valor: string) => {
    setPage(1);
    setEstado(valor);
  };

  const cambiarSede = (valor: string) => {
    setPage(1);
    setSedeId(valor);
  };

  const estadoOptions = [
    { value: "", label: "Todos los estados" },
    { value: "NUEVO", label: "Nuevo" },
    { value: "ACTIVO", label: "Activo" },
    { value: "SUSPENDIDO", label: "Suspendido" },
    { value: "RETIRADO", label: "Retirado" },
    { value: "INACTIVO", label: "Inactivo" },
  ];

  const navLinks = [
    { label: "Clientes", href: "/clientes" },
    { label: "Rutinas", href: "/rutinas" },
    { label: "Dashboard", href: "/dashboard" },
  ];

  return (
    <main className="min-h-screen bg-near-black">
      <Navbar links={navLinks} />

      <div className="pt-24 pb-12">
        <div className="max-w-[1200px] mx-auto px-5">
          <PageHeader
            title="Clientes"
            description="Gestion de clientes del gimnasio"
            actions={
              <Link href="/clientes/nuevo">
                <Button>+ Nuevo Cliente</Button>
              </Link>
            }
          />

          {error && (
            <div
              role="alert"
              className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <p className="text-red-400 text-sm">{error}</p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fetchClientes()}
              >
                Reintentar
              </Button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Buscar por cedula o nombre..."
                value={search}
                onChange={(e) => cambiarSearch(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                aria-label="Filtrar por estado"
                value={estado}
                onChange={(e) => cambiarEstado(e.target.value)}
                options={estadoOptions}
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                aria-label="Filtrar por sede"
                value={sedeId}
                onChange={(e) => cambiarSede(e.target.value)}
                options={OPCIONES_SEDE_FILTRO}
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-400">Cargando clientes...</p>
            </div>
          ) : error ? null : clientes.length === 0 ? (
            <Card padding="lg">
              <p className="text-gray-400 text-center">No se encontraron clientes</p>
            </Card>
          ) : (
            <Card padding="sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Cedula</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Nombre</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Telefono</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Sede</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Estado</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {clientes.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-800/30 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-300 font-mono">{c.cedula}</td>
                        <td className="px-4 py-3 text-sm text-white">{c.nombres} {c.apellidos}</td>
                        <td className="px-4 py-3 text-sm text-gray-300">{c.telefono}</td>
                        <td className="px-4 py-3 text-sm text-gray-300">{c.sede.nombre}</td>
                        <td className="px-4 py-3 text-sm">
                          <Badge variant={estadoBadgeVariant[c.estado] || "gray"}>
                            {c.estado}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <Link
                            href={`/clientes/${c.id}`}
                            className="text-royal hover:text-royal-light transition-colors"
                          >
                            Ver ficha
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* INC00-CLI-05: paginacion real con page/limit/pages/total */}
          {!loading && !error && pages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
              <div className="flex items-center gap-3 text-sm text-gray-400">
                <span>{textoPagina(page, pages)}</span>
                <span>{total} resultados</span>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={!puedeRetrocederPagina(page)}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Anterior
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={!puedeAvanzarPagina(page, pages)}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
