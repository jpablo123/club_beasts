/**
 * Sedes del seed.
 *
 * No existe endpoint de sedes (contrato fijado): este listado es el mismo
 * que ya usaba la pantalla de alta de clientes y se comparte para filtros,
 * edicion y creacion. No se agrega ninguna llamada a la API.
 */
export interface Sede {
  id: string;
  nombre: string;
}

export const SEDES: Sede[] = [
  { id: "sede-1", nombre: "Sede Principal" },
  { id: "sede-2", nombre: "Sede Secundaria" },
];

/** Opciones para selects de formulario (alta/edicion de cliente). */
export const OPCIONES_SEDE: { value: string; label: string }[] = SEDES.map((s) => ({
  value: s.id,
  label: s.nombre,
}));

/** Opciones para el filtro de la lista (incluye "Todas las sedes"). */
export const OPCIONES_SEDE_FILTRO: { value: string; label: string }[] = [
  { value: "", label: "Todas las sedes" },
  ...OPCIONES_SEDE,
];

export function sedePorId(id: string): Sede | undefined {
  return SEDES.find((s) => s.id === id);
}
