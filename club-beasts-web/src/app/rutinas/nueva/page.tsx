/**
 * INC-10 (GREEN T8) — `/rutinas/nueva`: selector de tipo (DEC-018/DEC-064) y
 * editor de creación (C4). El selector se pinta sin `tipo` (botones exactos
 * "Rutina generica" | "Rutina de induccion" | "Rutina personalizada"); al
 * elegir tipo se navega al editor. NAV-RU-04/09: el selector es un paso
 * transitorio — al volver con el "atrás" del navegador se deriva al listado
 * (un único `router.replace`, sin bucles de redirect).
 */
"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Navbar } from "@/components";
import RutinaEditor from "@/components/rutinas/RutinaEditor";
import { api } from "@/lib/api";
import type { BorradorRutina, TipoRutina } from "@/lib/rutina-schemas";

const SELECTOR_TIPOS: Array<{ etiqueta: string; tipo: TipoRutina }> = [
  { etiqueta: "Rutina generica", tipo: "GENERICA" },
  { etiqueta: "Rutina de induccion", tipo: "INDUCCION" },
  { etiqueta: "Rutina personalizada", tipo: "PERSONALIZADA" },
];

/**
 * Marca las restauraciones del navegador (back/forward) hacia el selector sin
 * `tipo`: al aterrizar ahí por "atrás", el paso se deriva al listado (C3,
 * NAV-RU-04/09 "vuelve al listado sin bucles de redirect"). Registrado a
 * nivel de módulo para cubrir el popstate que ocurre ANTES del montaje.
 */
const restauracionSelector = { pendiente: false };

if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    const { pathname, search } = window.location;
    if (pathname === "/rutinas/nueva" && !new URLSearchParams(search).get("tipo")) {
      restauracionSelector.pendiente = true;
    }
  });
}

function EditorNuevaRutina() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const rol = (session?.user as { role?: string } | undefined)?.role;
  const tipoParam = searchParams.get("tipo");
  const tipoRutina = SELECTOR_TIPOS.find((item) => item.tipo === tipoParam)?.tipo ?? null;
  const [errorApi, setErrorApi] = useState("");
  const [guardando, setGuardando] = useState(false);

  // DEC-065: solo DUENO crea (RECEPCIONISTA queda en lectura).
  useEffect(() => {
    if (rol === "RECEPCIONISTA") router.replace("/rutinas");
  }, [rol, router]);

  // NAV-RU-04/09: "atrás" al selector -> el listado (sin bucles de redirect).
  useEffect(() => {
    if (!restauracionSelector.pendiente || tipoRutina) return;
    restauracionSelector.pendiente = false;
    router.replace("/rutinas");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- derivación por restauración del navegador.
  }, [tipoRutina]);

  if (rol === "RECEPCIONISTA") {
    return null;
  }

  const elegirTipo = (tipo: TipoRutina) => {
    router.push(`/rutinas/nueva?tipo=${tipo}`);
  };

  const aplicar = async (payload: BorradorRutina) => {
    if (guardando) return;
    setGuardando(true);
    setErrorApi("");
    try {
      const creado =
        payload.tipoRutina === "PERSONALIZADA"
          ? await api.rutinas.crearPersonalizada(payload)
          : await api.rutinas.crear(payload);
      router.push(`/rutinas/${(creado as { id: string }).id}`);
    } catch (err) {
      setErrorApi((err as Error).message || "No se pudo crear la rutina.");
      setGuardando(false);
    }
  };

  return (
    <main className="min-h-screen bg-near-black">
      <div className="pt-24 pb-12">
        <div className="max-w-3xl mx-auto px-5">
          {errorApi ? (
            <div
              role="alert"
              className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-card"
            >
              <p className="text-red-400 text-sm">{errorApi}</p>
            </div>
          ) : null}

          {!tipoRutina ? (
            <div className="p-5 bg-dark-surface border border-gray-800 rounded-card">
              <h1 className="text-2xl font-display font-bold text-white uppercase">
                Crear rutina
              </h1>
              <p className="mt-2 text-gray-400 text-sm">
                Elige el tipo de rutina que quieres registrar.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                {SELECTOR_TIPOS.map((item) => (
                  <button
                    key={item.tipo}
                    type="button"
                    onClick={() => elegirTipo(item.tipo)}
                    className="px-5 py-2.5 text-sm font-medium text-white bg-royal hover:bg-royal-dark rounded-card transition-colors"
                  >
                    {item.etiqueta}
                  </button>
                ))}
              </div>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => router.push("/rutinas")}
                  className="px-5 py-2.5 text-sm font-medium text-gray-300 border border-gray-700 rounded-card hover:bg-dark-surface transition-colors"
                >
                  Volver al listado
                </button>
              </div>
            </div>
          ) : (
            <RutinaEditor
              tipoRutina={tipoRutina}
              inicial={null}
              onAplicar={aplicar}
              onDescartar={() => router.push("/rutinas")}
              onVolver={() => router.push("/rutinas")}
            />
          )}
        </div>
      </div>
    </main>
  );
}

export default function NuevaRutinaPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-near-black" />}>
      {/* INC10-NAV-AUD-06 (DEC-053/INC-08): showAuth habilita el control
          "Salir" del Navbar (`signOut({ callbackUrl: "/" })`) — unico por
          pantalla y FUERA de <main> (C7 de NAV-RU-02/07). */}
      <Navbar showAuth />
      <EditorNuevaRutina />
    </Suspense>
  );
}
