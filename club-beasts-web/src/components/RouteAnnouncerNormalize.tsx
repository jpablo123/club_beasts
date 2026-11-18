/**
 * INC-10 (GREEN T8) — Normalización del anunciador de ruta de Next.js
 * (C3/C4: `role="alert"` es el contrato de los mensajes de la UI).
 *
 * Next.js inserta `<next-route-announcer>` (shadow DOM) con un
 * `role="alert"` SIEMPRE presente, que compite con los mensajes de la
 * aplicación en las búsquedas globales `getByRole("alert")` (los tests del RED
 * asientan UN alert por pantalla). El anunciador conserva su
 * `aria-live="assertive"`: las anunciaciones de ruta siguen funcionando; solo
 * se retira el `role` redundante (alert ≡ live-assertive) para que
 * `role="alert"` quede reservado a los mensajes de negocio.
 */
"use client";

import { useEffect } from "react";

export default function RouteAnnouncerNormalize() {
  useEffect(() => {
    const normalizar = (): boolean => {
      // El anunciador vive dentro del shadow root de <next-route-announcer>.
      const contenedor = document.getElementsByTagName("next-route-announcer")[0];
      const nodo =
        contenedor?.shadowRoot?.getElementById("__next-route-announcer__") ??
        document.getElementById("__next-route-announcer__");
      if (!nodo) return false;
      nodo.removeAttribute("role");
      return true;
    };

    if (normalizar()) return;

    const observer = new MutationObserver(() => {
      if (normalizar()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    const corte = window.setTimeout(() => observer.disconnect(), 3000);
    return () => {
      observer.disconnect();
      window.clearTimeout(corte);
    };
  }, []);

  return null;
}
