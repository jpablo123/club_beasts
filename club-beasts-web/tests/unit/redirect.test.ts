/**
 * INC00-AUTH-03 — resolvePostLoginPath y su guard anti-open-redirect
 * Incremento: INC-00-estabilizacion-fases-1-2 (cierre hallazgo B2)
 *
 * La recuperacion centralizada conserva la pantalla original en el
 * `callbackUrl` del login. Antes de usarlo, `resolvePostLoginPath` debe
 * aceptar solo rutas internas: un `callbackUrl` manipulado (`//host`,
 * `http://externo`, `javascript:...`) jamas puede convertirse en una
 * redireccion abierta.
 *
 * Cubre ademas el retorno a la pantalla original: tras consumir el aviso de
 * sesion expirada (`reason=session_expired`) el `callbackUrl` debe seguir
 * disponible para que el login devuelva al destino original.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolvePostLoginPath } from "../../src/lib/redirect.js";
import { searchWithoutSessionNotice } from "../../src/lib/session-notice.js";

function installWindowSearch(search: string): void {
  (globalThis as { window?: unknown }).window = { location: { search } };
}

function removeWindow(): void {
  delete (globalThis as { window?: unknown }).window;
}

beforeEach(() => {
  removeWindow();
});

afterEach(() => {
  removeWindow();
});

describe("resolvePostLoginPath — guard anti-open-redirect", () => {
  it("acepta una ruta interna valida y regresa a esa pantalla", () => {
    installWindowSearch("?callbackUrl=%2Fclientes%2Fcliente-42");
    expect(resolvePostLoginPath("/login")).toBe("/clientes/cliente-42");
  });

  it("conserva la query de la ruta interna original", () => {
    installWindowSearch("?callbackUrl=%2Fclientes%3Fsearch%3Dana%26page%3D2");
    expect(resolvePostLoginPath("/clientes")).toBe("/clientes?search=ana&page=2");
  });

  it("rechaza un protocolo relativo a otro host (//host)", () => {
    installWindowSearch("?callbackUrl=%2F%2Fevil.example.com%2Frobar");
    expect(resolvePostLoginPath("/clientes")).toBe("/clientes");
  });

  it("rechaza la variante con barra invertida (/\\host)", () => {
    installWindowSearch("?callbackUrl=%2F%5Cevil.example.com%2Frobar");
    expect(resolvePostLoginPath("/clientes")).toBe("/clientes");
  });

  it("rechaza una URL externa http", () => {
    installWindowSearch("?callbackUrl=http%3A%2F%2Fevil.example.com%2Frobar");
    expect(resolvePostLoginPath("/clientes")).toBe("/clientes");
  });

  it("rechaza una URL externa https", () => {
    installWindowSearch("?callbackUrl=https%3A%2F%2Fevil.example.com%2Frobar");
    expect(resolvePostLoginPath("/clientes")).toBe("/clientes");
  });

  it("rechaza un esquema peligroso (javascript:)", () => {
    installWindowSearch("?callbackUrl=javascript%3Aalert(1)");
    expect(resolvePostLoginPath("/clientes")).toBe("/clientes");
  });

  it("usa el fallback cuando no hay callbackUrl", () => {
    installWindowSearch("?utm_source=newsletter");
    expect(resolvePostLoginPath("/clientes")).toBe("/clientes");
  });

  it("usa el fallback cuando la query esta vacia", () => {
    installWindowSearch("");
    expect(resolvePostLoginPath("/login-cliente")).toBe("/login-cliente");
  });

  it("usa el fallback fuera del navegador (sin window)", () => {
    expect(resolvePostLoginPath("/clientes")).toBe("/clientes");
  });
});

describe("INC00-AUTH-03 retorno a la pantalla original", () => {
  it("tras consumir el aviso de sesion expirada el callbackUrl sigue resolviendo el destino original", () => {
    const arrived = "?reason=session_expired&callbackUrl=%2Fclientes%2Fcliente-42";

    // El banner elimina solo `reason` al mostrar el mensaje aprobado...
    const afterNotice = searchWithoutSessionNotice(arrived);
    installWindowSearch(afterNotice);

    // ...y el login sigue pudiendo regresar a la pantalla original.
    expect(afterNotice).not.toContain("reason=");
    expect(afterNotice).toContain("callbackUrl=");
    expect(resolvePostLoginPath("/clientes")).toBe("/clientes/cliente-42");
  });

  it("un callbackUrl manipulado sigue cayendo al fallback tras consumir el aviso", () => {
    const arrived = "?reason=session_expired&callbackUrl=%2F%2Fevil.example.com%2Frobar";
    installWindowSearch(searchWithoutSessionNotice(arrived));

    expect(resolvePostLoginPath("/clientes")).toBe("/clientes");
  });
});
