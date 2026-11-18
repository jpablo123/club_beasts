"use client";

/**
 * INC-09 (GREEN T10) — Vista de SOLO LECTURA de la anamnesis deportiva.
 * Criterios C4 (render POR PRESENCIA DE CLAVE), NAV-AN-07 (los 5 sensibles de
 * DEC-055 no existen en el DOM cuando sus claves no viajan) y AN-30
 * (agrupación en las 4 secciones S1-S4 del Anexo).
 *
 * Regla C4 (defensa en profundidad): cada clave PRESENTE en el DTO renderiza
 * su etiqueta exacta del Anexo + su valor (una vez); las claves AUSENTES no
 * dejan ningún rastro en el DOM (sin placeholder, sin "Restringido"): la API
 * ya filtra las 5 claves sensibles para RECEPCIONISTA (`anamnesisRecepcionSchema`)
 * y aquí simplemente no se pintan.
 *
 * Nota de accesibilidad: las etiquetas de la vista son texto (`<dt>`), no
 * `<label>` de controles: jamás colisionan con los localizadores `getByLabel`
 * de la base (C1/C7).
 */
import {
  SECCIONES_ANAMNESIS,
  type SeccionAnamnesis,
} from "@/lib/anamnesis-schemas";
import {
  ETIQUETAS_CAMPOS,
  CAMPOS_SENSIBLES,
  formatearValor,
  type AnamnesisDatos,
  type ClaveAnamnesis,
  type ValorAnamnesis,
} from "@/lib/anamnesis-campos";

interface AnamnesisVistaProps {
  datos: AnamnesisDatos;
}

/** Presencia de clave CON valor diligenciado (C4: sin rastro de lo ausente). */
function visible(valor: ValorAnamnesis): boolean {
  if (valor === null || valor === undefined || valor === "") return false;
  if (Array.isArray(valor)) return valor.length > 0;
  return true;
}

export default function AnamnesisVista({ datos }: AnamnesisVistaProps) {
  const secciones = (Object.keys(SECCIONES_ANAMNESIS) as SeccionAnamnesis[])
    .map((clave) => {
      const seccion = SECCIONES_ANAMNESIS[clave];
      const filas = seccion.campos
        .filter((campo) => visible(datos[campo as ClaveAnamnesis]))
        .map((campo) => ({
          campo: campo as ClaveAnamnesis,
          valor: datos[campo as ClaveAnamnesis],
        }));
      return { titulo: seccion.titulo, filas };
    })
    .filter((seccion) => seccion.filas.length > 0);

  return (
    <div className="space-y-6">
      {secciones.map((seccion) => (
        <div key={seccion.titulo}>
          <h3 className="font-display text-lg font-bold text-white uppercase tracking-wide mb-3">
            {seccion.titulo}
          </h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            {seccion.filas.map((fila) => (
              <div key={fila.campo}>
                <dt className="text-sm text-gray-400">
                  {ETIQUETAS_CAMPOS[fila.campo]}
                </dt>
                <dd className="text-white">{formatearValor(fila.valor)}</dd>
                {CAMPOS_SENSIBLES.includes(fila.campo) && (
                  <dd className="text-xs text-amber-400">Informacion confidencial</dd>
                )}
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}
