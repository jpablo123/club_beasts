/**
 * INC-09 (GREEN T10) — Pre-llenado del formulario de anamnesis (DEC-056a).
 * Criterio C6 / NAV-AN-08.
 *
 * DEC-056a (C6 resuelto): el pre-llenado es del FRONTEND y SOLO cubre los
 * campos 1, 2, 9, 10 del Anexo DEC-052 (snapshot desde la ficha `Cliente`);
 * los campos 3-8 nacen VACÍOS y editables (el backend no auto-rellena).
 * Campo 10 sin email en la ficha -> `null` (editable).
 */

export interface ClientePrefill {
  nombres: string;
  apellidos: string;
  cedula: string;
  telefono: string;
  email?: string | null;
}

export interface AnamnesisPrefill {
  /** Campo 1. */
  nombreCompleto: string;
  /** Campo 2. */
  numeroDocumento: string;
  /** Campo 9. */
  numeroContacto: string;
  /** Campo 10 (`null` si la ficha no tiene email). */
  correoElectronico: string | null;
}

export function prellenarAnamnesisDesdeCliente(cliente: ClientePrefill): AnamnesisPrefill {
  return {
    nombreCompleto: `${cliente.nombres} ${cliente.apellidos}`,
    numeroDocumento: cliente.cedula,
    numeroContacto: cliente.telefono,
    correoElectronico: cliente.email ?? null,
  };
}
