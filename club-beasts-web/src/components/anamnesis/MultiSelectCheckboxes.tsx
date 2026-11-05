"use client";

/**
 * INC-09 (GREEN T10) — Multi-select de checkboxes de la anamnesis (campos 16 y
 * 21). Criterios AN-10 ("Ninguno" exclusivo), C8 (targets >= 44px, foco
 * visible) y C7 (nombres accesibles = los literales exactos del Anexo, sin
 * substrings prohibidos).
 *
 * Semántica accesible: `fieldset` + `legend` con la etiqueta exacta del campo;
 * cada opción es un `<label>` que envuelve su checkbox (nombre accesible =
 * literal de la opción, p. ej. "fuma"). "Ninguno" es EXCLUSIVO cuando existe
 * en el conjunto de opciones (campo 16): al marcarlo se desmarcan los demás y
 * viceversa (AN-10). El campo 21 (días) no tiene literal "Ninguno" en el
 * Anexo: solo aplica la regla de sin repetidos.
 */

interface MultiSelectCheckboxesProps {
  etiqueta: string;
  opciones: readonly string[];
  valor: string[];
  onChange: (valor: string[]) => void;
  /** Literal exclusivo (por defecto "Ninguno" si existe en `opciones`). */
  exclusivo?: string;
}

export default function MultiSelectCheckboxes({
  etiqueta,
  opciones,
  valor,
  onChange,
  exclusivo = "Ninguno",
}: MultiSelectCheckboxesProps) {
  const exclusivoPresente = opciones.includes(exclusivo);

  const alternar = (opcion: string) => {
    const marcado = valor.includes(opcion);
    if (marcado) {
      // Sin repetidos: desmarcar solo retira la opción.
      onChange(valor.filter((v) => v !== opcion));
      return;
    }
    if (exclusivoPresente && opcion === exclusivo) {
      // "Ninguno" exclusivo: desmarca todos los demás (AN-10).
      onChange([exclusivo]);
      return;
    }
    if (exclusivoPresente) {
      // "Ninguno" no se combina: marcar otra opción lo retira (AN-10).
      onChange([...valor.filter((v) => v !== exclusivo), opcion]);
      return;
    }
    onChange([...valor, opcion]);
  };

  return (
    <fieldset className="border-0 p-0 m-0 min-w-0">
      <legend className="block text-sm font-medium text-gray-300 mb-1">
        {etiqueta}
      </legend>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
        {opciones.map((opcion) => (
          <label
            key={opcion}
            className="flex items-center gap-3 min-h-[44px] px-1 py-1 rounded-card cursor-pointer text-white text-sm hover:bg-dark-surface transition-colors"
          >
            <input
              type="checkbox"
              checked={valor.includes(opcion)}
              onChange={() => alternar(opcion)}
              className="w-4 h-4 shrink-0 bg-dark-surface border-gray-700 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-royal"
            />
            <span>{opcion}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
