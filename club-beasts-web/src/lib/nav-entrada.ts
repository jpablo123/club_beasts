/**
 * INC-10 (GREEN T8) — Coherencia de "atrás" en pantallas de URL directa
 * (NAV-RU-14 / NAV-RU-20: recarga + atrás conservan la MISMA vista coherente,
 * sin bucles de redirect).
 *
 * El contrato del RED exige que, tras entrar por URL directa a una pantalla y
 * recargar, el "atrás" del navegador aterrice en la misma vista (la entrada
 * previa de la historia es ajena al flujo, p. ej. /clientes o /portal). Para
 * eso la pantalla DUPLICA su propia entrada de historia al montar por carga
 * documental fresca (`performance` navigation type `navigate` y misma URL):
 * el primer "atrás" cae en la copia (misma vista) y el segundo sale con
 * normalidad. Un documento solo duplica UNA vez (sin bucles: back/forward no
 * re-duplica). Enlaces por navegación client-side y recargas NO duplican.
 */

let duplicadaEnEsteDocumento = false;

export function duplicarEntradaDeHistorial(): void {
  if (duplicadaEnEsteDocumento) return;
  if (typeof window === "undefined" || typeof performance === "undefined") return;
  const entradas = performance.getEntriesByType("navigation");
  const navegacion = entradas[0] as PerformanceNavigationTiming | undefined;
  if (!navegacion || navegacion.type !== "navigate") return;
  if (navegacion.name !== window.location.href) return;
  duplicadaEnEsteDocumento = true;
  try {
    window.history.pushState(window.history.state, "");
  } catch {
    // Sin API de historia utilizable: la vista queda como está.
    duplicadaEnEsteDocumento = false;
  }
}
