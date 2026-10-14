"use client";

import { useState } from "react";
import { Card, Button, Input, Select } from "@/components";
import { api, type ApiError, type Ingreso } from "@/lib/api";
import { OPCIONES_SEDE } from "@/lib/sedes";

/**
 * HU-30 / `INC03-ING-01..09,11`: registro de ingreso por sede y historial.
 *
 * El body es exactamente `{cedula, sedeId}` (fecha/hora las calcula el
 * servidor). El 201 confirma en `role="status"`; cualquier error del
 * backend (400 validacion, 404 cliente inexistente, 403
 * `INGRESO_NO_PERMITIDO` por vencimiento/estado) se muestra en
 * `role="alert"` sin dejar confirmacion visible (`INC03-VEN-04`).
 */
export default function RegistrarIngreso() {
  const [cedula, setCedula] = useState("");
  const [sedeId, setSedeId] = useState(OPCIONES_SEDE[0]?.value ?? "");
  const [ingreso, setIngreso] = useState<Ingreso | null>(null);
  const [historial, setHistorial] = useState<Ingreso[] | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const registrar = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCargando(true);
    setError("");
    setIngreso(null);
    try {
      const respuesta = await api.recepcion.registrarIngreso({
        cedula,
        sedeId,
      });
      setIngreso(respuesta);
    } catch (err) {
      setError((err as ApiError).message || "No se pudo registrar el ingreso.");
    } finally {
      setCargando(false);
    }
  };

  const verHistorial = async () => {
    setError("");
    setIngreso(null);
    try {
      // El listado ya viene tipado como IngresosList (schema del backend).
      const data = await api.recepcion.listarIngresos(cedula);
      setHistorial(data.ingresos);
    } catch (err) {
      setHistorial(null);
      setError((err as ApiError).message || "No se pudo cargar el historial.");
    }
  };

  return (
    <Card padding="lg">
      <h2 className="text-xl font-display font-bold text-white uppercase mb-4">
        Registrar ingreso
      </h2>

      <form onSubmit={registrar} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
          <div>
            <Input
              type="text"
              inputMode="numeric"
              aria-label="Cedula de ingreso"
              placeholder="Ej. 1234567890"
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
            />
          </div>
          <div>
            <Select
              aria-label="Sede de ingreso"
              value={sedeId}
              onChange={(e) => setSedeId(e.target.value)}
              options={OPCIONES_SEDE}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" loading={cargando}>
            Registrar ingreso
          </Button>
          <Button type="button" variant="secondary" onClick={verHistorial}>
            Ver historial
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

      {ingreso && (
        <div
          role="status"
          className="mt-4 p-3 rounded-card bg-emerald-500/10 border border-emerald-500/30"
        >
          <p className="text-emerald-400 text-sm font-medium">Ingreso registrado</p>
          <div className="flex flex-wrap items-center gap-3 mt-1">
            <span className="text-gray-300 text-sm font-mono">{ingreso.fecha}</span>
            <span className="text-gray-300 text-sm font-mono">{ingreso.hora}</span>
            <span className="text-gray-400 text-sm">
              Sede: {ingreso.sede.nombre}
            </span>
          </div>
        </div>
      )}

      {historial && (
        <div className="mt-5 border-t border-gray-800 pt-4">
          <p className="text-sm text-gray-400 mb-2">
            Historial de ingresos ({historial.length})
          </p>
          {historial.length === 0 ? (
            <p className="text-gray-500 text-sm">Sin ingresos registrados.</p>
          ) : (
            <ul className="divide-y divide-gray-800">
              {historial.map((item) => (
                <li key={item.id} className="py-2 flex flex-wrap items-center gap-3">
                  <span className="text-white text-sm font-mono">{item.fecha}</span>
                  <span className="text-gray-300 text-sm font-mono">{item.hora}</span>
                  <span className="text-gray-400 text-sm">
                    Sede: {item.sede.nombre}
                  </span>
                  <span className="text-gray-500 text-sm">
                    Registrado por: {item.registradoPor.nombre}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}
