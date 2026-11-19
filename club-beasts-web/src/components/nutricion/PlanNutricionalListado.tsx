"use client";
import type { PlanNutricional } from "@/lib/plan-nutricional-schemas";

export interface PlanNutricionalListadoProps {
  planes: PlanNutricional[];
  onNuevo?: () => void;
  onVer: (plan: PlanNutricional) => void;
}

export default function PlanNutricionalListado({ planes, onNuevo, onVer }: PlanNutricionalListadoProps) {
  return (
    <section className="p-5 bg-dark-surface border border-gray-800 rounded-card">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-bold text-white uppercase">Planes nutricionales</h2>
        {onNuevo ? <button onClick={onNuevo} className="px-5 py-2.5 text-sm font-medium text-white bg-royal hover:bg-royal-dark rounded-card">Nuevo plan</button> : null}
      </div>
      {planes.length === 0 ? (
        <p className="mt-4 text-gray-400">Aun no hay planes registrados</p>
      ) : (
        <ul className="mt-4 divide-y divide-gray-800">
          {planes.map((plan, i) => (
            <li key={i} className="py-3">
              <button onClick={() => onVer(plan)} className="text-white hover:text-royal-light">Ver plan {i + 1}</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}