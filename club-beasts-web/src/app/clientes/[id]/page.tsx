"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Card, Button, Badge, Input, Navbar, PageHeader } from "@/components";

interface Cliente {
  id: string;
  cedula: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  email?: string;
  estado: string;
  observaciones?: string;
  sede: { id: string; nombre: string };
  createdAt: string;
}

const estadoBadgeVariant: Record<string, "royal" | "success" | "warning" | "danger" | "gray"> = {
  NUEVO: "warning",
  ACTIVO: "success",
  SUSPENDIDO: "danger",
  RETIRADO: "gray",
  INACTIVO: "gray",
};

export default function FichaClientePage() {
  const params = useParams();
  const router = useRouter();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCliente();
  }, [params.id]);

  const loadCliente = async () => {
    try {
      const data = await api.clientes.get(params.id as string);
      setCliente(data);
      setForm(data);
    } catch (err) {
      setError("Cliente no encontrado");
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload: Record<string, any> = {
        nombres: form.nombres,
        apellidos: form.apellidos,
      };
      if (form.telefono) payload.telefono = form.telefono;
      if (form.sede?.id) payload.sedeId = form.sede.id;
      if (form.email) payload.email = form.email;
      if (form.observaciones) payload.observaciones = form.observaciones;

      await api.clientes.update(params.id as string, payload);
      setEditing(false);
      loadCliente();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const navLinks = [
    { label: "Clientes", href: "/clientes" },
    { label: "Dashboard", href: "/dashboard" },
  ];

  if (error) {
    return (
      <main className="min-h-screen bg-near-black">
        <Navbar links={navLinks} />
        <div className="pt-24 pb-12">
          <div className="max-w-3xl mx-auto px-5">
            <Card padding="lg">
              <p className="text-red-400 text-center">{error}</p>
            </Card>
          </div>
        </div>
      </main>
    );
  }

  if (!cliente) {
    return (
      <main className="min-h-screen bg-near-black">
        <Navbar links={navLinks} />
        <div className="pt-24 pb-12">
          <div className="max-w-3xl mx-auto px-5">
            <div className="text-center py-12">
              <p className="text-gray-400">Cargando cliente...</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-near-black">
      <Navbar links={navLinks} />

      <div className="pt-24 pb-12">
        <div className="max-w-3xl mx-auto px-5">
          <PageHeader
            title="Ficha del Cliente"
            description={`${cliente.nombres} ${cliente.apellidos}`}
            actions={
              editing ? (
                <>
                  <Button onClick={handleSave} loading={loading}>
                    Guardar
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => { setEditing(false); setForm(cliente); }}
                  >
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button onClick={() => setEditing(true)}>
                  Editar
                </Button>
              )
            }
          />

          <Card padding="lg">
            <div className="flex items-center gap-4 mb-6">
              <Badge variant={estadoBadgeVariant[cliente.estado] || "gray"} size="md">
                {cliente.estado}
              </Badge>
              <span className="text-gray-400 text-sm">Sede: {cliente.sede.nombre}</span>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Cedula</label>
                  <p className="text-white font-mono">{cliente.cedula}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Estado</label>
                  <p className="text-white">{cliente.estado}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Nombres</label>
                  {editing ? (
                    <Input
                      type="text"
                      value={form.nombres}
                      onChange={(e) => setForm({ ...form, nombres: e.target.value })}
                    />
                  ) : (
                    <p className="text-white">{cliente.nombres}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Apellidos</label>
                  {editing ? (
                    <Input
                      type="text"
                      value={form.apellidos}
                      onChange={(e) => setForm({ ...form, apellidos: e.target.value })}
                    />
                  ) : (
                    <p className="text-white">{cliente.apellidos}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Telefono</label>
                  {editing ? (
                    <Input
                      type="text"
                      value={form.telefono}
                      onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                    />
                  ) : (
                    <p className="text-white">{cliente.telefono}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
                  {editing ? (
                    <Input
                      type="email"
                      value={form.email || ""}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  ) : (
                    <p className="text-white">{cliente.email || "-"}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Observaciones</label>
                {editing ? (
                  <textarea
                    value={form.observaciones || ""}
                    onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
                    className="w-full px-4 py-2.5 bg-dark-surface border border-gray-700 rounded-card text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-royal focus:border-transparent transition-colors"
                    rows={3}
                  />
                ) : (
                  <p className="text-white">{cliente.observaciones || "-"}</p>
                )}
              </div>

              <div className="pt-6 border-t border-gray-800">
                <p className="text-sm text-gray-500">
                  Creado: {new Date(cliente.createdAt).toLocaleDateString("es-CO")}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
