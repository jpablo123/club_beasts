/**
 * Filtros y paginacion de la lista de clientes (INC00-CLI-05).
 *
 * La API responde `{ clientes, total, page, limit, pages }`
 * (`limit` 1..100, default 20); la logica pura de params y de extremos de
 * paginacion vive aqui para poder probarla sin renderizar la pagina.
 */
import { OPCIONES_SEDE_FILTRO } from "./sedes";

export { OPCIONES_SEDE_FILTRO };

/** Tamano de pagina usado por la UI (default del backend: 20). */
export const TAMANO_PAGINA_CLIENTES = 20;

export interface FiltroClientes {
  search: string;
  estado: string;
  sedeId: string;
  page: number;
  limit: number;
}

export interface ParamsClientesList {
  search?: string;
  sedeId?: string;
  estado?: string;
  page?: number;
  limit?: number;
}

/**
 * Parametros para `GET /clientes`. Solo se envian los filtros con valor;
 * `page` y `limit` siempre van para que la paginacion sea determinista.
 */
export function construirParamsClientes(filtro: FiltroClientes): ParamsClientesList {
  const params: ParamsClientesList = { page: filtro.page, limit: filtro.limit };
  if (filtro.search) params.search = filtro.search;
  if (filtro.estado) params.estado = filtro.estado;
  if (filtro.sedeId) params.sedeId = filtro.sedeId;
  return params;
}

/** Anterior solo tiene sentido desde la segunda pagina en adelante. */
export function puedeRetrocederPagina(page: number): boolean {
  return page > 1;
}

/** Siguiente solo tiene sentido mientras haya una pagina posterior. */
export function puedeAvanzarPagina(page: number, pages: number): boolean {
  return page < pages;
}

export function textoPagina(page: number, pages: number): string {
  return `Página ${page} de ${pages}`;
}
