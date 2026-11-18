/**
 * INC-10 (GREEN T8) — `/portal/rutina`: rutina activa del cliente (HU-26 / C8 /
 * NAV-RU-18..22).
 *
 * Contrato fijado por el RED (tests/unit/inc10-rutinas-portal-gate.test.tsx):
 *  - Orden de datos (DEC-060, patrón `/portal/anamnesis`): 1) sesión; 2) guarda
 *    PIN (`debeCambiarPin` -> `router.replace("/portal")`, sin llamar a la API);
 *    3) `api.portal.resumen()`; si `sinMembresiaActiva` -> `replace("/portal")`
 *    y `api.portal.rutina` JAMÁS se llama; 4) solo entonces `api.portal.rutina()`.
 *  - `<section role="region" aria-label="Mi rutina">` (exact) con la vista de
 *    solo lectura (estructura completa, DEC-068) o `SIN_RUTINA_MENSAJE` en
 *    `role="alert"` (C8).
 *  - Vista SOLO LECTURA: sin botones de escritura (RU-40). Sin
 *    `repararUrlDelPortal` (patrón `/portal/anamnesis`).
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Navbar, PageHeader } from "@/components";
import RutinaVista, { type RutinaContenido } from "@/components/rutinas/RutinaVista";
import { api, type ApiError, type PortalResumen } from "@/lib/api";
import { resolveSessionExit } from "@/lib/session-recovery";
import { duplicarEntradaDeHistorial } from "@/lib/nav-entrada";
import { SIN_RUTINA_MENSAJE } from "@/lib/rutina-schemas";

export default function PortalRutinaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [rutina, setRutina] = useState<RutinaContenido | null>(null);
  const [sinRutina, setSinRutina] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);
  const vivo = useRef(true);

  useEffect(() => {
    vivo.current = true;
    return () => {
      vivo.current = false;
    };
  }, []);

  // NAV-RU-14/20: URL directa + recarga + atrás conservan la misma vista.
  useEffect(() => {
    duplicarEntradaDeHistorial();
  }, []);

  const debeCambiarPin = Boolean(
    (session?.user as { debeCambiarPin?: boolean } | undefined)?.debeCambiarPin
  );

  // Guarda PIN (sin bypass): el portal es el único destino.
  useEffect(() => {
    if (status !== "authenticated" || !debeCambiarPin) return;
    router.replace("/portal");
  }, [status, debeCambiarPin, router]);

  useEffect(() => {
    if (status !== "authenticated" || debeCambiarPin) return;
    // SIN guarda por ref (StrictMode dev): con doble efecto la primera
    // consulta quedaba descartada y la vista se quedaba en "Cargando..."
    // (INC-10 GREEN T8, cierre E2E). `activo` por ejecución cubre el
    // desmontaje real y el cambio de dependencias.
    let activo = true;
    (async () => {
      try {
        // DEC-060: el gate corre ANTES de consultar la rutina.
        const resumen = (await api.portal.resumen()) as unknown as PortalResumen;
        if (!activo) return;
        if (resumen.sinMembresiaActiva) {
          router.replace("/portal");
          return;
        }
        const datos = (await api.portal.rutina()) as Record<string, unknown>;
        if (!activo) return;
        if (typeof datos.mensaje === "string") {
          setSinRutina(true);
        } else {
          setRutina(datos as RutinaContenido);
        }
        setError("");
      } catch (err) {
        const apiErr = err as ApiError;
        if (apiErr.kind === "session_expired") {
          const exit = resolveSessionExit("/login-cliente");
          if (exit) router.push(exit);
          return;
        }
        if (activo) setError(apiErr.message || "No se pudo cargar tu rutina.");
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- el router del mock cambia por render; la consulta es por montaje (NAV-RU-20).
  }, [status, debeCambiarPin]);

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-near-black">
        <div className="flex items-center justify-center h-screen">
          <p className="text-gray-400">Cargando...</p>
        </div>
      </main>
    );
  }

  if (!session) {
    const exit = resolveSessionExit("/login-cliente");
    if (exit) router.push(exit);
    return null;
  }

  return (
    <main className="min-h-screen bg-near-black">
      <Navbar showAuth={false} />

      <div className="pt-24 pb-12">
        <div className="max-w-3xl mx-auto px-5">
          <PageHeader title="Mi rutina" description="Rutina activa del club" />

          {error ? (
            <div
              role="alert"
              className="mt-6 p-3 bg-red-500/10 border border-red-500/30 rounded-card"
            >
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          ) : null}

          {cargando ? (
            <p className="mt-6 text-gray-400">Cargando...</p>
          ) : null}

          {sinRutina ? (
            <div
              role="alert"
              className="mt-6 p-3 bg-amber-500/10 border border-amber-500/30 rounded-card"
            >
              <p className="text-amber-400 text-sm">{SIN_RUTINA_MENSAJE}</p>
            </div>
          ) : null}

          {rutina ? (
            <section
              role="region"
              aria-label="Mi rutina"
              className="mt-6 p-5 bg-dark-surface border border-gray-800 rounded-card"
            >
              <RutinaVista rutina={rutina} />
            </section>
          ) : null}

          <div className="mt-6">
            <button
              type="button"
              onClick={() => router.push("/portal")}
              className="px-5 py-2.5 text-sm font-medium text-gray-300 border border-gray-700 rounded-card hover:bg-dark-surface transition-colors"
            >
              Volver al portal
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
