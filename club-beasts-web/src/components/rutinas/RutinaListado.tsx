/**
 * INC-10 (GREEN T8) — RutinaListado: listado de rutinas staff (NAV-RU-01,
 * NAV-RU-23). Región exacta "Rutinas", botón "Crear rutina", una fila por
 * rutina (nombre = link al detalle) y filtros `tipo` (exacto) / `nombre`
 * (subcadena insensible) en searchParams. Vacío -> "Aun no hay rutinas
 * registradas".
 */
"use client";

import Link from "next/link";
import type { RutinaResumenDTO } from "@/lib/api";
import { TIPO_RUTINA } from "@/lib/rutina-schemas";

export interface RutinaListadoProps {
  rutinas: RutinaResumenDTO[];
  tipo: string;
  nombre: string;
  onCambiarTipo: (valor: string) => void;
  onCambiarNombre: (valor: string) => void;
  onCrear: () => void;
  puedeCrear: boolean;
}

export default function RutinaListado({
  rutinas,
  tipo,
  nombre,
  onCambiarTipo,
  onCambiarNombre,
  onCrear,
  puedeCrear,
}: RutinaListadoProps) {
  return (
    <section
      role="region"
      aria-label="Rutinas"
      className="p-5 bg-dark-surface border border-gray-800 rounded-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-display font-bold text-white uppercase">
          Rutinas registradas
        </h2>
        {puedeCrear ? (
          <button
            type="button"
            onClick={onCrear}
            className="px-5 py-2.5 text-sm font-medium text-white bg-royal hover:bg-royal-dark rounded-card transition-colors"
          >
            Crear rutina
          </button>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="filtro-tipo" className="block text-sm text-gray-400 mb-1">
            Tipo de rutina
          </label>
          <select
            id="filtro-tipo"
            value={tipo}
            onChange={(e) => onCambiarTipo(e.target.value)}
            className="w-full px-3 py-2.5 bg-near-black border border-gray-700 rounded-card text-white focus:outline-none focus:ring-2 focus:ring-royal"
          >
            <option value="">Todos</option>
            {TIPO_RUTINA.map((valor) => (
              <option key={valor} value={valor}>
                {valor}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filtro-nombre" className="block text-sm text-gray-400 mb-1">
            Nombre
          </label>
          <input
            id="filtro-nombre"
            type="text"
            value={nombre}
            onChange={(e) => onCambiarNombre(e.target.value)}
            className="w-full px-3 py-2.5 bg-near-black border border-gray-700 rounded-card text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-royal"
          />
        </div>
      </div>

      <div className="mt-5">
        {rutinas.length === 0 ? (
          <p className="text-gray-400">Aun no hay rutinas registradas</p>
        ) : (
          <ul className="divide-y divide-gray-800">
            {rutinas.map((rutina) => (
              <li key={rutina.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                <Link
                  href={`/rutinas/${rutina.id}`}
                  className="text-white hover:text-royal-light transition-colors"
                >
                  {rutina.nombre}
                </Link>
                <span className="text-gray-500 text-sm">{rutina.tipoRutina}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
