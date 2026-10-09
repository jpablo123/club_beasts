/**
 * INC00-AUTH-02 — aviso de sesion expirada en la pantalla de login
 * Incremento: INC-00-estabilizacion-fases-1-2 (cierre hallazgo B1)
 *
 * La recuperacion llega al login con `reason=session_expired`. La pantalla
 * debe mostrar EXACTAMENTE el mensaje aprobado que usa el backend en
 * `AUTH_TOKEN_EXPIRED` (club-beasts-api/src/plugins/auth.ts) y luego eliminar
 * el param para que un refresco no vuelva a mostrarlo, sin tocar el
 * `callbackUrl` (INC00-AUTH-03).
 */
import { describe, it, expect } from "vitest";
import {
  SESSION_EXPIRED_MESSAGE,
  SESSION_EXPIRED_REASON,
  sessionNoticeForSearch,
  searchWithoutSessionNotice,
} from "../../src/lib/session-notice.js";

/** Texto aprobado del backend para AUTH_TOKEN_EXPIRED. */
const BACKEND_APPROVED_MESSAGE =
  "Tu sesión venció por seguridad. Inicia sesión de nuevo para continuar.";

describe("sessionNoticeForSearch — mensaje aprobado", () => {
  it("devuelve EXACTAMENTE el mensaje aprobado del backend cuando reason=session_expired", () => {
    expect(SESSION_EXPIRED_MESSAGE).toBe(BACKEND_APPROVED_MESSAGE);
    expect(SESSION_EXPIRED_REASON).toBe("session_expired");
    expect(
      sessionNoticeForSearch("?reason=session_expired&callbackUrl=%2Fclientes")
    ).toBe(BACKEND_APPROVED_MESSAGE);
  });

  it("devuelve null cuando no hay reason", () => {
    expect(sessionNoticeForSearch("?callbackUrl=%2Fclientes")).toBeNull();
    expect(sessionNoticeForSearch("")).toBeNull();
  });

  it("devuelve null cuando el reason es otro (no muestra mensajes inventados)", () => {
    expect(sessionNoticeForSearch("?reason=invalid_credentials")).toBeNull();
    expect(sessionNoticeForSearch("?reason=forbidden")).toBeNull();
  });
});

describe("searchWithoutSessionNotice — elimina solo el param del aviso", () => {
  it("elimina reason y conserva el callbackUrl", () => {
    const cleaned = searchWithoutSessionNotice(
      "?reason=session_expired&callbackUrl=%2Fclientes%2Fcliente-42"
    );
    expect(cleaned).not.toContain("reason=");
    expect(cleaned).toContain("callbackUrl=%2Fclientes%2Fcliente-42");
  });

  it("devuelve la query vacia cuando el unico param era reason", () => {
    expect(searchWithoutSessionNotice("?reason=session_expired")).toBe("");
  });

  it("no altera la query cuando no hay reason", () => {
    expect(searchWithoutSessionNotice("?callbackUrl=%2Fportal")).toBe(
      "?callbackUrl=%2Fportal"
    );
  });

  it("no altera una query vacia", () => {
    expect(searchWithoutSessionNotice("")).toBe("");
  });
});
