/**
 * Aviso de sesion expirada en la pantalla de login (INC00-AUTH-02).
 *
 * La recuperacion centralizada (`src/lib/session-recovery.ts`) llega al login
 * con `reason=session_expired` junto al `callbackUrl` de la pantalla original.
 * La pantalla muestra el mensaje aprobado y elimina unicamente ese param, de
 * modo que un refresco no vuelva a mostrarlo pero el retorno a la pantalla
 * original (INC00-AUTH-03) siga intacto.
 */

/** Param de query que marca la llegada desde una recuperacion de sesion. */
export const SESSION_EXPIRED_PARAM = "reason";

/** Valor de ese param: una salida por sesion expirada. */
export const SESSION_EXPIRED_REASON = "session_expired";

/**
 * Mensaje aprobado: exactamente el texto que el backend devuelve en
 * `AUTH_TOKEN_EXPIRED` (club-beasts-api/src/plugins/auth.ts) y que el
 * `ApiError` entrega a la UI.
 */
export const SESSION_EXPIRED_MESSAGE =
  "Tu sesión venció por seguridad. Inicia sesión de nuevo para continuar.";

/**
 * Mensaje aprobado a mostrar en la pantalla, o `null` si la query no marca
 * una sesion expirada (nunca inventa mensajes para otros motivos).
 */
export function sessionNoticeForSearch(search: string): string | null {
  const params = new URLSearchParams(search);
  return params.get(SESSION_EXPIRED_PARAM) === SESSION_EXPIRED_REASON
    ? SESSION_EXPIRED_MESSAGE
    : null;
}

/**
 * Query resultante despues de consumir el aviso: elimina solo `reason` y
 * conserva los demas params (`callbackUrl`, filtros, etc.).
 */
export function searchWithoutSessionNotice(search: string): string {
  const params = new URLSearchParams(search);
  if (params.get(SESSION_EXPIRED_PARAM) !== SESSION_EXPIRED_REASON) {
    return search;
  }

  params.delete(SESSION_EXPIRED_PARAM);
  const query = params.toString();
  return query ? `?${query}` : "";
}
