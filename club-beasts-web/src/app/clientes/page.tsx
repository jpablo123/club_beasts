"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card, Button, Badge, Input, Select, Navbar, PageHeader } from "@/components";

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
  const [loading, setLoading] = useState(true);

  const fetchClientes = async () => {
    setLoading(true);
    try {
      const data = await api.clientes.list({ search, estado });
      setClientes(data.clientes);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchClientes();
  }, [search, estado]);

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

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Buscar por cedula o nombre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                options={estadoOptions}
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-400">Cargando clientes...</p>
            </div>
          ) : clientes.length === 0 ? (
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
        </div>
      </div>
    </main>
  );
}
