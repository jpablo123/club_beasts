/**
 * INC-10 (GREEN T8) — CicloAccordion: acordeón por ciclo del editor de
 * personalizada (C4). El botón de encabezado expone `aria-expanded` y el panel
 * SOLO se renderiza expandido. El contenedor es `role="group"` con
 * `aria-label` = nombre del ciclo (alcance de acciones por ruta de índice).
 */
"use client";

import { useState, type ReactNode } from "react";

export interface CicloAccordionProps {
  nombre: string;
  children: ReactNode;
  /** Abierto por defecto (scaffold navegable, C4). */
  abiertoInicial?: boolean;
}

export default function CicloAccordion({
  nombre,
  children,
  abiertoInicial = true,
}: CicloAccordionProps) {
  const [abierto, setAbierto] = useState(abiertoInicial);

  return (
    <div
      role="group"
      aria-label={nombre}
      className="border border-gray-800 rounded-card mb-3"
    >
      <button
        type="button"
        aria-expanded={abierto}
        onClick={() => setAbierto((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left text-white font-medium hover:bg-dark-surface/60 rounded-card transition-colors"
      >
        <span>{nombre}</span>
        <span className="text-gray-500 text-sm">{abierto ? "Ocultar" : "Mostrar"}</span>
      </button>
      {abierto ? <div className="px-4 pb-4">{children}</div> : null}
    </div>
  );
}
