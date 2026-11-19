"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { api, type ApiError } from "@/lib/api";
import { resolveSessionExit } from "@/lib/session-recovery";
import { SESSION_EXPIRED_MESSAGE } from "@/lib/session-notice";
import { construirPayloadEdicionCliente } from "@/lib/cliente-payload";
import { OPCIONES_SEDE, sedePorId } from "@/lib/sedes";
import { Card, Button, Badge, Input, Select, Navbar, PageHeader } from "@/components";
import MembershipSection from "@/components/MembershipSection";
import AnamnesisSection from "@/components/anamnesis/AnamnesisSection";
import RutinaSection from "@/components/rutinas/RutinaSection";
import HistorialRutinas from "@/components/rutinas/HistorialRutinas";
import PlanNutricionalSection from "@/components/nutricion/PlanNutricionalSection";
import HistorialPlanesNutricionales from "@/components/nutricion/HistorialPlanesNutricionales";
import HistorialCliente from "@/components/HistorialCliente";
import { duplicarEntradaDeHistorial } from "@/lib/nav-entrada";

interface Cliente {
  id: string;
  cedula: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  email?: string | null;
  estado: string;
  observaciones?: string | null;
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

const estadoOptions = [
  { value: "NUEVO", label: "Nuevo" },
  { value: "ACTIVO", label: "Activo" },
  { value: "SUSPENDIDO", label: "Suspendido" },
  { value: "RETIRADO", label: "Retirado" },
  { value: "INACTIVO", label: "Inactivo" },
];

export default function FichaClientePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [editing, setEditing] = useState(false);
  // INC-04 / DEC-035 (EST-06): el formulario lleva `motivo` ademas del DTO;
  // el payload lo emite solo cuando cambia el estado (ver cliente-payload).
  const [form, setForm] = useState<Partial<Cliente> & { motivo?: string }>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState("");

  const userRole = (session?.user as { role?: string })?.role;
  const canEdit = userRole === "DUENO" || userRole === "RECEPCIONISTA";

  // INC-10 (NAV-RU-14): URL directa + recarga + atrÃ¡s conservan la ficha.
  useEffect(() => {
    duplicarEntradaDeHistorial();
  }, []);

  useEffect(() => {
    loadCliente();
  }, [params.id]);

  const loadCliente = async () => {
    try {
      const data = (await api.clientes.get(params.id as string)) as unknown as Cliente;
      setCliente(data);
      setForm(data);
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.kind === "session_expired") {
        // INC00-AUTH-02/03: se muestra el mensaje aprobado y se sale hacia el
        // login correcto conservando esta pantalla. Si la recuperaciÃ³n
        // centralizada ya estÃ¡ en curso, `resolveSessionExit` devuelve null y
        // esta pÃ¡gina no compite (evita perder el callbackUrl).
        setError(apiErr.message || SESSION_EXPIRED_MESSAGE);
        const exit = resolveSessionExit("/login");
        if (exit) router.push(exit);
        return;
      }
      setError(apiErr.message || "Cliente no encontrado");
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // INC00-CLI-02/03: sede y estado se envian en la edicion y los campos
      // opcionales limpiados viajan como `null` (borrado intencional).
      // INC-08 / DEC-054 (INC08-ED-01..03): `estado` viaja SOLO cuando el
      // usuario lo cambio respecto al persistido; editar un campo suelto
      // guarda sin `estado` ni `motivo` (el builder solo emite `motivo`
      // junto a `estado`, asi que omitir el estado alcanza). Cuando el
      // estado SI cambia, el payload viaja completo y el backend sigue
      // exigiendo `motivo` (DEC-035 intacta).
      const cambioEstado = Boolean(form.estado) && form.estado !== cliente?.estado;
      const payload = construirPayloadEdicionCliente({
        ...form,
        estado: cambioEstado ? form.estado : undefined,
        motivo: cambioEstado ? form.motivo : undefined,
      });

      await api.clientes.update(params.id as string, payload);
      setEditing(false);
      loadCliente();
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.kind === "session_expired") {
        // Misma salida que en la carga: sin `router.push("/login")` suelto que
        // compita con la recuperaciÃ³n y pierda el callbackUrl (hallazgo B2).
        setError(apiErr.message || SESSION_EXPIRED_MESSAGE);
        const exit = resolveSessionExit("/login");
        if (exit) router.push(exit);
        return;
      }
      setError(apiErr.message || "Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPin = async () => {
    if (!window.confirm("Â¿Resetear el PIN del cliente?")) return;
    setLoading(true);
    setError("");
    setResetMsg("");
    try {
      await api.clientes.resetPin(params.id as string);
      setResetMsg("PIN reseteado correctamente");
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "Error al resetear PIN");
    } finally {
      setLoading(false);
    }
  };

  const navLinks = [
    { label: "Clientes", href: "/clientes" },
    { label: "Rutinas", href: "/rutinas" },
    { label: "Dashboard", href: "/dashboard" },
  ];

  if (error && !cliente) {
    return (
      <main className="min-h-screen bg-near-black">
        <Navbar links={navLinks} />
        <div className="pt-24 pb-12">
          <div className="max-w-3xl mx-auto px-5">
            <Card padding="lg">
              {/* Accesible: el error de carga se anuncia como alert. */}
              <p role="alert" className="text-red-400 text-center">{error}</p>
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
          {/* Error inline (INC04-EST-06: rol alert accesible, p. ej. el 400
              "Motivo es requerido cuando cambia el estado"). */}
          {error && (
            <div
              role="alert"
              className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-card"
            >
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <PageHeader
            title="Ficha del Cliente"
            description={`${cliente.nombres} ${cliente.apellidos}`}
            actions={
              canEdit && editing ? (
                <>
                  <Button onClick={handleSave} loading={loading}>
                    Guardar
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => { setEditing(false); setForm(cliente); setError(""); }}
                  >
                    Cancelar
                  </Button>
                </>
              ) : canEdit ? (
                <>
                  <Button onClick={() => setEditing(true)}>
                    Editar
                  </Button>
                  <Button variant="secondary" onClick={handleResetPin} loading={loading}>
                    Resetear PIN
                  </Button>
                </>
              ) : undefined
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
                  {editing && canEdit ? (
                    <Select
                      label="Estado"
                      value={form.estado ?? cliente.estado}
                      onChange={(e) => setForm({ ...form, estado: e.target.value })}
                      options={estadoOptions}
                    />
                  ) : (
                    <>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Estado</label>
                      <p className="text-white">{cliente.estado}</p>
                    </>
                  )}
                </div>
                {/* INC00-CLI-02: la sede solo es editable para DUENO/RECEPCIONISTA. */}
                {editing && canEdit && (
                  <div>
                    <Select
                      label="Sede"
                      value={form.sede?.id ?? cliente.sede.id}
                      onChange={(e) => {
                        const sede = sedePorId(e.target.value);
                        if (sede) setForm({ ...form, sede: { id: sede.id, nombre: sede.nombre } });
                      }}
                      options={OPCIONES_SEDE}
                    />
                  </div>
                )}
              </div>

              {/* INC-04 / DEC-035 (EST-06): el backend exige `motivo` en todo
                  cambio de estado, asi que el formulario lo captura siempre
                  que hay modo edicion con permiso (DUENO/RECEPCIONISTA).
                  DEC-041: al ser un campo staff-only, el rol CLIENTE nunca lo
                  ve (no existe modo edicion para ese rol). */}
              {editing && canEdit && (
                <div>
                  <Input
                    label="Motivo"
                    type="text"
                    value={form.motivo || ""}
                    onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                    placeholder="Motivo del cambio de estado"
                    maxLength={200}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Obligatorio cuando cambias el estado (3 a 200 caracteres).
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Nombres</label>
                  {editing ? (
                    <Input
                      type="text"
                      value={form.nombres || ""}
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
                      value={form.apellidos || ""}
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
                      value={form.telefono || ""}
                      onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                    />
                  ) : (
                    <p className="text-white">{cliente.telefono}</p>
                  )}
                </div>
                <div>
                  {editing ? (
                    <Input
                      label="Email"
                      type="email"
                      value={form.email || ""}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  ) : (
                    <>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
                      <p className="text-white">{cliente.email || "-"}</p>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor="observaciones"
                  className="block text-sm font-medium text-gray-400 mb-1"
                >
                  Observaciones
                </label>
                {editing ? (
                  <textarea
                    id="observaciones"
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

          {/* SecciÃ³n de membresÃ­as - solo para DUENO/RECEPCIONISTA.
              `canManage` gobierna las acciones de pausa (DEC-017 / HU15-C05). */}
          {canEdit && <MembershipSection clienteId={cliente.id} canManage={canEdit} />}

          {/* INC-09 (C1): "Anamnesis deportiva" inline tras MembershipSection.
              Vista solo lectura por defecto; editor bajo demanda solo DUENO
              (DEC-058) y con los 5 sensibles filtrados por la API (DEC-055). */}
          {canEdit && (
            <AnamnesisSection
              clienteId={cliente.id}
              cliente={{
                nombres: cliente.nombres,
                apellidos: cliente.apellidos,
                cedula: cliente.cedula,
                telefono: cliente.telefono,
                email: cliente.email,
              }}
            />
          )}

          {/* INC-10 (C1/C9): rutina activa e historial desde los endpoints
              propios `/clientes/:id/rutinas/{activa,historial}`. Montaje bajo
              demanda; solo DUENO edita/asigna (DEC-065). */}          <div className="space-y-6 mt-6">
            {canEdit && <RutinaSection clienteId={cliente.id} />}
            {canEdit && <HistorialRutinas clienteId={cliente.id} />}          </div>
        </div>
      </div>
    </main>
  );
}


