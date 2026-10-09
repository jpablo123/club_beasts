"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { OPCIONES_SEDE } from "@/lib/sedes";
import { Card, Button, Input, Select, Navbar, PageHeader } from "@/components";

export default function NuevoClientePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    cedula: "",
    nombres: "",
    apellidos: "",
    telefono: "",
    email: "",
    sedeId: "sede-1",
    observaciones: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api.clientes.create(form);
      router.push("/clientes");
    } catch (err: any) {
      setError(err.message || "Error al crear cliente");
    } finally {
      setLoading(false);
    }
  };

  // Mismo listado de sedes del seed que usa la lista y la ficha (sin endpoint).
  const sedeOptions = OPCIONES_SEDE;

  const navLinks = [
    { label: "Clientes", href: "/clientes" },
    { label: "Dashboard", href: "/dashboard" },
  ];

  return (
    <main className="min-h-screen bg-near-black">
      <Navbar links={navLinks} />

      <div className="pt-24 pb-12">
        <div className="max-w-2xl mx-auto px-5">
          <PageHeader
            title="Nuevo Cliente"
            description="Registra un nuevo cliente en el sistema"
          />

          {error && (
            <div className="mb-6 p-3 bg-red-500/20 text-red-400 rounded-card text-sm">
              {error}
            </div>
          )}

          <Card padding="lg">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Cedula *"
                  type="text"
                  value={form.cedula}
                  onChange={(e) => setForm({ ...form, cedula: e.target.value })}
                  required
                />
                <Select
                  label="Sede *"
                  value={form.sedeId}
                  onChange={(e) => setForm({ ...form, sedeId: e.target.value })}
                  options={sedeOptions}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Nombres *"
                  type="text"
                  value={form.nombres}
                  onChange={(e) => setForm({ ...form, nombres: e.target.value })}
                  required
                />
                <Input
                  label="Apellidos *"
                  type="text"
                  value={form.apellidos}
                  onChange={(e) => setForm({ ...form, apellidos: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Telefono *"
                  type="text"
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  required
                />
                <Input
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Observaciones
                </label>
                <textarea
                  value={form.observaciones}
                  onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
                  className="w-full px-4 py-2.5 bg-dark-surface border border-gray-700 rounded-card text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-royal focus:border-transparent transition-colors"
                  rows={3}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit" loading={loading}>
                  Crear Cliente
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => router.push("/clientes")}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </main>
  );
}
