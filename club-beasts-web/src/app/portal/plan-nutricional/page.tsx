"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Navbar, PageHeader } from "@/components";
import { api } from "@/lib/api";
import { resolveSessionExit } from "@/lib/session-recovery";
import { SIN_PLAN_NUTRICIONAL_MENSAJE } from "@/lib/plan-nutricional-schemas";

const SIN_PLAN_NUTRICIONAL_MENSAJE_LOCAL = "No tienes un plan nutricional activo";

export default function PortalPlanNutricionalPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [datos, setDatos] = useState<any>(null);
  const [sinPlan, setSinPlan] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);

  const debeCambiarPin = Boolean(
    (session?.user as { debeCambiarPin?: boolean } | undefined)?.debeCambiarPin
  );

  useEffect(() => {
    if (status !== "authenticated" || !debeCambiarPin) return;
    router.replace("/portal");
  }, [status, debeCambiarPin, router]);

  useEffect(() => {
    if (status !== "authenticated" || debeCambiarPin) return;
    let activo = true;
    (async () => {
      try {
        const resumen = (await api.portal.resumen()) as any;
        if (!activo) return;
        if (resumen.sinMembresiaActiva) {
          router.replace("/portal");
          return;
        }
        const data = (await api.portal.planNutricional()) as any;
        if (!activo) return;
        if (typeof data?.mensaje === "string") {
          setSinPlan(true);
        } else {
          setDatos(data);
        }
        setError("");
      } catch (err: any) {
        if (err?.kind === "session_expired") {
          const exit = resolveSessionExit("/login-cliente");
          if (exit) router.push(exit);
          return;
        }
        if (activo) setError(err?.message || "No se pudo cargar tu plan nutricional.");
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
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
          <PageHeader title="Mi plan nutricional" description="Plan nutricional activo del club" />

          {error ? (
            <div role="alert" className="mt-6 p-3 bg-red-500/10 border border-red-500/30 rounded-card">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          ) : null}

          {cargando ? <p className="mt-6 text-gray-400">Cargando...</p> : null}

          {sinPlan ? (
            <div role="alert" className="mt-6 p-3 bg-amber-500/10 border border-amber-500/30 rounded-card">
              <p className="text-amber-400 text-sm">{SIN_PLAN_NUTRICIONAL_MENSAJE_LOCAL}</p>
            </div>
          ) : null}

          {datos ? (
            <section role="region" aria-label="Mi plan nutricional" className="mt-6 p-5 bg-dark-surface border border-gray-800 rounded-card">
              <p className="text-white">{datos.nombre}</p>
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