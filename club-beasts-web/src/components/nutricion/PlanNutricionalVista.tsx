"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { PlanNutricional } from "@/lib/plan-nutricional-schemas";

export interface PlanNutricionalVistaProps {
  id?: string;
  datos?: PlanNutricional;
}

export default function PlanNutricionalVista({ id, datos }: PlanNutricionalVistaProps) {
  const [data, setData] = useState<PlanNutricional | null>(datos ?? null);
  const [loading, setLoading] = useState(!datos);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (datos) { setData(datos); setLoading(false); return; }
    let vivo = true;
    (async () => {
      try {
        const res = id
          ? await api.planesNutricionales.obtener<PlanNutricional>(id)
          : await api.portal.planNutricional<PlanNutricional>();
        if (vivo) setData(res);
      } catch (e: any) {
        if (vivo) setError(e?.message || "Error al cargar el plan");
      } finally {
        if (vivo) setLoading(false);
      }
    })();
    return () => { vivo = false; };
  }, [id, datos]);

  if (loading) return <p className="text-gray-400">Cargando...</p>;
  if (error) return <p className="text-red-400">{error}</p>;
  if (!data) return <p className="text-gray-400">No tienes un plan nutricional activo</p>;

  return (
    <div>
      <section className="mt-6">
        <h3 className="text-lg font-display font-bold text-white uppercase mb-2">Datos biometricos</h3>
        <p className="text-gray-400">Peso: <span className="text-white font-mono">{data.datosBiometricos.pesoKg} kg</span></p>
        <p className="text-gray-400">Talla: <span className="text-white font-mono">{data.datosBiometricos.tallaCm} cm</span></p>
        {data.datosBiometricos.porcentajeGrasa != null ? (
          <p className="text-gray-400">% grasa: <span className="text-white font-mono">{data.datosBiometricos.porcentajeGrasa}</span></p>
        ) : null}
      </section>
      <section className="mt-6">
        <h3 className="text-lg font-display font-bold text-white uppercase mb-2">Objetivos calóricos</h3>
        <p className="text-white font-mono">{data.objetivosCaloricos} kcal</p>
      </section>
      {data.macronutrientes ? (
        <section className="mt-6">
          <h3 className="text-lg font-display font-bold text-white uppercase mb-2">Macronutrientes</h3>
          <p className="text-gray-400">Proteína: <span className="text-white font-mono">{data.macronutrientes.proteinaG ?? "-"} g</span></p>
          <p className="text-gray-400">Carbohidratos: <span className="text-white font-mono">{data.macronutrientes.carbohidratosG ?? "-"} g</span></p>
          <p className="text-gray-400">Grasas: <span className="text-white font-mono">{data.macronutrientes.grasasG ?? "-"} g</span></p>
        </section>
      ) : null}
      <section className="mt-6">
        <h3 className="text-lg font-display font-bold text-white uppercase mb-2">Tiempos de comida</h3>
        <ul className="divide-y divide-gray-800">
          {data.tiemposComida.map((t, i) => (
            <li key={i} className="py-3">
              <p className="text-white font-medium">{t.nombre}</p>
              <ul className="ml-4 mt-1 space-y-1">
                {t.alimentos.map((a, j) => (
                  <li key={j} className="text-gray-400 text-sm">{a.nombre} — {a.cantidad} {a.unidad}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>
      {data.recomendaciones ? (
        <section className="mt-6">
          <h3 className="text-lg font-display font-bold text-white uppercase mb-2">Recomendaciones</h3>
          <p className="text-gray-300">{data.recomendaciones}</p>
        </section>
      ) : null}
      {data.suplementacion ? (
        <section className="mt-6">
          <h3 className="text-lg font-display font-bold text-white uppercase mb-2">Suplementación</h3>
          <p className="text-gray-300">{data.suplementacion}</p>
        </section>
      ) : null}
    </div>
  );
}