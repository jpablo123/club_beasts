"use client";

import { useState } from "react";
import { Card, Button, Input } from "@/components";
import EstadoAccesoBadge from "@/components/EstadoAccesoBadge";
import { api, type ApiError, type ConsultaRecepcion } from "@/lib/api";

/**
 * HU-29 / `INC03-REC-01..09`: consulta de cliente por cedula desde
 * recepcion. Pinta identidad, estado (CONF-04), vencimiento, congelacion,
 * ultimo ingreso y alertas derivadas del estado (DEC-028); los errores
 * 400/404/403 del backend se muestran tal cual en `role="alert"`.
 */
export default function ConsultaCliente() {
  const [cedula, setCedula] = useState("");
  const [resultado, setResultado] = useState<ConsultaRecepcion | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const consultar = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCargando(true);
    setError("");
    setResultado(null);
    try {
      // El 200 ya viene tipado como ConsultaRecepcion (schema del backend).
      const data = await api.recepcion.consulta(cedula);
      setResultado(data);
    } catch (err) {
      setError((err as ApiError).message || "No se pudo consultar el cliente.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <Card padding="lg">
      <h2 className="text-xl font-display font-bold text-white uppercase mb-4">
        Consulta por cedula
      </h2>

      <form onSubmit={consultar} className="flex flex-col sm:flex-row gap-3 items-end">
        <div className="flex-1 w-full">
          <Input
            type="text"
            inputMode="numeric"
            aria-label="Cedula de consulta"
            placeholder="Ej. 1234567890"
            value={cedula}
            onChange={(e) => setCedula(e.target.value)}
          />
        </div>
        <Button type="submit" loading={cargando} className="sm:w-auto w-full">
          Consultar
        </Button>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-400">Nombre completo</p>
              <p className="text-white">{resultado.nombreCompleto}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Cedula</p>
              <p className="text-white font-mono">{resultado.cedula}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Sede</p>
              {/* Prefijo "Sede: ": la sede ya se pinta en el select de
                  ingresos y `getByText` exige una unica coincidencia exacta. */}
              <p className="text-white">Sede: {resultado.sede.nombre}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Estado de acceso</p>
              <EstadoAccesoBadge estado={resultado.estadoAccesoGym} size="md" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Fecha de vencimiento</p>
              {resultado.fechaVencimiento ? (
                <p className="text-white font-mono">{resultado.fechaVencimiento}</p>
              ) : (
                <p className="text-gray-500">Sin fecha de vencimiento</p>
              )}
            </div>
            {resultado.congelacion && (
              <div>
                <p className="text-sm text-gray-400">Congelacion</p>
                <div className="flex items-center gap-2">
                  <p className="text-white font-mono">
                    {resultado.congelacion.fechaInicio}
                  </p>
                  <span className="text-gray-500">a</span>
                  <p className="text-white font-mono">
                    {resultado.congelacion.fechaFin}
                  </p>
                </div>
              </div>
            )}
            <div className="sm:col-span-2">
              <p className="text-sm text-gray-400">Ultimo ingreso</p>
              {resultado.ultimoIngreso ? (
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-white font-mono">{resultado.ultimoIngreso.fecha}</p>
                  <p className="text-gray-300 font-mono">
                    {resultado.ultimoIngreso.hora}
                  </p>
                  <p className="text-gray-400">
                    Sede: {resultado.ultimoIngreso.sede.nombre}
                  </p>
                </div>
              ) : (
                <p className="text-gray-500">Sin ingresos registrados</p>
              )}
            </div>
          </div>

          {resultado.alertas.length > 0 && (
            <div className="mt-5 space-y-2" aria-label="Alertas del cliente">
              <p className="text-sm text-gray-400">Alertas</p>
              {resultado.alertas.map((alerta) => (
                <div
                  key={alerta.codigo}
                  className="p-3 rounded-card bg-amber-500/10 border border-amber-500/30"
                >
                  <p className="text-amber-400 text-sm">{alerta.mensaje}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
