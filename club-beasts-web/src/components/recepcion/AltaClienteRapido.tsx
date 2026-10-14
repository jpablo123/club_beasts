"use client";

import { useState } from "react";
import { Badge, Button, Card, Input } from "@/components";
import { api, type ApiError, type ClienteRapido } from "@/lib/api";

/** `NUEVO` -> `Nuevo` (RAP-06 pinta el estado en legible). */
function estadoLegible(estado: string): string {
  if (!estado) return estado;
  return estado.charAt(0) + estado.slice(1).toLowerCase();
}

/**
 * HU-31 / `INC03-RAP-01..07`: alta rapida de cliente desde recepcion.
 *
 * - DEC-031: el formulario exige solo `{cedula, nombres, apellidos,
 *   telefono}` y NO envia `sedeId` (si se omite, el backend usa la sede del
 *   recepcionista derivada del token).
 * - DEC-032: el 201 trae `perfilPendiente: true` y se pinta la marca.
 * - DEC-033: `Completar perfil` hace `PATCH /clientes/:id` con `email`; el
 *   backend limpia la marca cuando el cliente queda con email.
 * - Errores 400/409 del backend en `role="alert"` (sin marca de exito).
 */
export default function AltaClienteRapido() {
  const [cedula, setCedula] = useState("");
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [resultado, setResultado] = useState<ClienteRapido | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const crear = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCargando(true);
    setError("");
    setResultado(null);
    try {
      // Payload minimo exacto: sin sedeId (DEC-031). El 201 ya viene tipado
      // como ClienteRapido (contrato del endpoint, sin cast en la UI).
      const data = await api.recepcion.crearClienteRapido({
        cedula,
        nombres,
        apellidos,
        telefono,
      });
      setResultado(data);
    } catch (err) {
      setError((err as ApiError).message || "No se pudo crear el cliente.");
    } finally {
      setCargando(false);
    }
  };

  const completarPerfil = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!resultado) return;
    setCargando(true);
    setError("");
    try {
      // DEC-033: el PATCH devuelve el DTO actualizado; se declara el contrato
      // via generic del apiClient en vez de cast en la UI.
      const data = await api.clientes.update<ClienteRapido>(resultado.id, { email });
      setResultado(data);
    } catch (err) {
      setError((err as ApiError).message || "No se pudo completar el perfil.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <Card padding="lg">
      <h2 className="text-xl font-display font-bold text-white uppercase mb-1">
        Cliente rapido
      </h2>
      <p className="text-sm text-gray-400 mb-4">
        Alta minima: la sede la asigna el backend desde tu sesion.
      </p>

      <form onSubmit={crear} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          type="text"
          inputMode="numeric"
          aria-label="Cedula rapida"
          placeholder="Cedula"
          value={cedula}
          onChange={(e) => setCedula(e.target.value)}
        />
        <Input
          type="text"
          aria-label="Nombres rapido"
          placeholder="Nombres"
          value={nombres}
          onChange={(e) => setNombres(e.target.value)}
        />
        <Input
          type="text"
          aria-label="Apellidos rapido"
          placeholder="Apellidos"
          value={apellidos}
          onChange={(e) => setApellidos(e.target.value)}
        />
        <Input
          type="tel"
          inputMode="numeric"
          aria-label="Telefono rapido"
          placeholder="3XXXXXXXXX"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
        />
        <div className="sm:col-span-2 flex justify-end">
          <Button type="submit" loading={cargando}>
            Crear cliente rapido
          </Button>
        </div>
      </form>

      {error && (
        <div
          role="alert"
          className="mt-4 p-3 rounded-card bg-red-500/10 border border-red-500/30"
        >
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {resultado && (
        <div className="mt-6 border-t border-gray-800 pt-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-white font-medium">
              {resultado.nombres} {resultado.apellidos}
            </span>
            <Badge variant="warning">{estadoLegible(resultado.estado)}</Badge>
            {resultado.perfilPendiente && (
              <Badge variant="royal">Perfil pendiente</Badge>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <p className="text-sm text-gray-400">Cedula</p>
              <p className="text-white font-mono">{resultado.cedula}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Sede asignada</p>
              <p className="text-white">Sede: {resultado.sede.nombre}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Creado por</p>
              <p className="text-white">{resultado.creadoPor.nombre}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Telefono</p>
              <p className="text-white font-mono">{resultado.telefono}</p>
            </div>
          </div>

          {resultado.perfilPendiente && (
            <form
              onSubmit={completarPerfil}
              className="mt-5 flex flex-col sm:flex-row gap-3 items-end"
            >
              <div className="flex-1 w-full">
                <Input
                  type="email"
                  aria-label="Email para completar perfil"
                  placeholder="correo@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <Button type="submit" loading={cargando} className="sm:w-auto w-full">
                Completar perfil
              </Button>
            </form>
          )}
        </div>
      )}
    </Card>
  );
}
