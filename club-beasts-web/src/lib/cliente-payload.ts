/**
 * Construccion del payload de `PATCH /clientes/:id` (INC00-CLI-02, INC00-CLI-03).
 *
 * Contrato fijado:
 *  - opcionales: nombres, apellidos, telefono, email, sedeId, estado, observaciones;
 *  - `email` y `observaciones` aceptan `null` como borrado INTENCIONAL;
 *  - `estado` es el enum NUEVO|ACTIVO|SUSPENDIDO|RETIRADO|INACTIVO;
 *  - INC-04 / DEC-035: `motivo` (3-200) acompaña a `estado` en todo cambio.
 *
 * Antes el formulario omitia esos campos cuando estaban vacios
 * (`if (form.email)`), asi que un borrado nunca llegaba al backend.
 */
export interface FormEdicionCliente {
  nombres?: string;
  apellidos?: string;
  telefono?: string;
  email?: string | null;
  observaciones?: string | null;
  estado?: string;
  /**
   * INC-04 / DEC-035: motivo del cambio de estado (3-200 caracteres).
   * El backend lo exige en todo PATCH que traiga `estado`; la web lo envia
   * solo cuando el formulario trae estado (CONF-07: un motivo "viajero" sin
   * estado no viaja en el payload).
   */
  motivo?: string;
  sede?: { id: string; nombre?: string } | null;
}

/**
 * `null` cuando el campo esta vacio o solo contiene espacios (borrado
 * intencional); el valor original cuando hay contenido.
 */
function valorOpcional(valor?: string | null): string | null {
  return valor && valor.trim() !== "" ? valor : null;
}

export function construirPayloadEdicionCliente(
  form: FormEdicionCliente
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    nombres: form.nombres,
    apellidos: form.apellidos,
  };

  // telefono no admite null en el contrato: si queda vacio se omite.
  if (form.telefono) payload.telefono = form.telefono;

  if (form.estado) payload.estado = form.estado;
  if (form.sede?.id) payload.sedeId = form.sede.id;

  // INC-04 / DEC-035 (EST-06): el motivo del cambio de estado viaja SOLO
  // junto a un `estado` presente y sin quedar vacio (solo espacios = sin
  // motivo). Asi el backend recibe `{ estado, motivo }` en todo cambio y un
  // motivo sin estado se ignora (CONF-07), que es lo que el historial exige.
  const motivo = form.motivo?.trim();
  if (form.estado && motivo) payload.motivo = motivo;

  // INC00-CLI-03: siempre se envian, con null si el usuario los limpio.
  payload.email = valorOpcional(form.email);
  payload.observaciones = valorOpcional(form.observaciones);

  return payload;
}
