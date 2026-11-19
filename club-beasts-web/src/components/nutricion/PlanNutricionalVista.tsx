"use client";
import type { PlanNutricional } from "@/lib/plan-nutricional-schemas";

export interface PlanNutricionalVistaProps {
  datos: PlanNutricional;
}

export default function PlanNutricionalVista({ datos }: PlanNutricionalVistaProps) {
  return (
    <div>
      <section className="mt-6">
        <h3 className="text-lg font-display font-bold text-white uppercase mb-2">Datos biometricos</h3>
        <p className="text-gray-400">Peso: <span className="text-white font-mono">{datos.datosBiometricos.pesoKg} kg</span></p>
        <p className="text-gray-400">Talla: <span className="text-white font-mono">{datos.datosBiometricos.tallaCm} cm</span></p>
        {datos.datosBiometricos.porcentajeGrasa != null ? (
          <p className="text-gray-400">% grasa: <span className="text-white font-mono">{datos.datosBiometricos.porcentajeGrasa}</span></p>
        ) : null}
      </section>
      <section className="mt-6">
        <h3 className="text-lg font-display font-bold text-white uppercase mb-2">Objetivos calóricos</h3>
        <p className="text-white font-mono">{datos.objetivosCaloricos} kcal</p>
      </section>
      {datos.macronutrientes ? (
        <section className="mt-6">
          <h3 className="text-lg font-display font-bold text-white uppercase mb-2">Macronutrientes</h3>
          <p className="text-gray-400">Proteína: <span className="text-white font-mono">{datos.macronutrientes.proteinaG ?? "-"} g</span></p>
          <p className="text-gray-400">Carbohidratos: <span className="text-white font-mono">{datos.macronutrientes.carbohidratosG ?? "-"} g</span></p>
          <p className="text-gray-400">Grasas: <span className="text-white font-mono">{datos.macronutrientes.grasasG ?? "-"} g</span></p>
        </section>
      ) : null}
      <section className="mt-6">
        <h3 className="text-lg font-display font-bold text-white uppercase mb-2">Tiempos de comida</h3>
        <ul className="divide-y divide-gray-800">
          {datos.tiemposComida.map((t, i) => (
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
      {datos.recomendaciones ? (
        <section className="mt-6">
          <h3 className="text-lg font-display font-bold text-white uppercase mb-2">Recomendaciones</h3>
          <p className="text-gray-300">{datos.recomendaciones}</p>
        </section>
      ) : null}
      {datos.suplementacion ? (
        <section className="mt-6">
          <h3 className="text-lg font-display font-bold text-white uppercase mb-2">Suplementación</h3>
          <p className="text-gray-300">{datos.suplementacion}</p>
        </section>
      ) : null}
    </div>
  );
}