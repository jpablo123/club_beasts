/**
 * INC-10 (GREEN T8) â€” `/rutinas/[id]`: detalle de la rutina (NAV-RU-06/NAV-RU-24,
 * C3). Vista `RutinaVista` (solo lectura, whitelist), "Modificar rutina" solo
 * DUENO (DEC-065) y "Volver al listado". URL a rutina inexistente -> 404 con
 * "Rutina no encontrada" + "Volver al listado".
 */
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Navbar } from "@/components";
import RutinaVista, { type RutinaContenido } from "@/components/rutinas/RutinaVista";
import { api } from "@/lib/api";
import { MENSAJES_ASIGNACION } from "@/lib/rutina-schemas";

export default function DetalleRutinaPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const rol = (session?.user as { role?: string } | undefined)?.role;
  const rutinaId = String(params.id ?? "");
  const [rutina, setRutina] = useState<RutinaContenido | null>(null);
  const [noEncontrada, setNoEncontrada] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const datos = await api.rutinas.obtener(rutinaId);
        if (vivo) setRutina(datos as RutinaContenido);
      } catch {
        if (vivo) setNoEncontrada(true);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [rutinaId]);

  return (
    <main className="min-h-screen bg-near-black">
      {/* INC10-NAV-AUD-06 (DEC-053/INC-08): showAuth habilita el control
          "Salir" del Navbar (`signOut({ callbackUrl: "/" })`) â€” unico por
          pantalla y fuera de las regiones de rutinas (C7). */}
      <Navbar showAuth links={[{ label: "Rutinas", href: "/rutinas" }, { label: "Clientes", href: "/clientes" }, { label: "Dashboard", href: "/dashboard" }]} />

      <div className="pt-24 pb-12">
        <div className="max-w-3xl mx-auto px-5">
          {noEncontrada ? (
            <div className="p-5 bg-dark-surface border border-gray-800 rounded-card">
              <p className="text-white">{MENSAJES_ASIGNACION.RUTINA_NO_ENCONTRADA}</p>
              <button
                type="button"
                onClick={() => router.push("/rutinas")}
                className="mt-4 px-5 py-2.5 text-sm font-medium text-gray-300 border border-gray-700 rounded-card hover:bg-dark-surface transition-colors"
              >
                Volver al listado
              </button>
            </div>
          ) : !rutina ? (
            <p className="text-gray-400">Cargando...</p>
          ) : (
            <div>
              <div className="flex flex-wrap gap-3">
                {rol === "DUENO" ? (
                  <button
                    type="button"
                    onClick={() => router.push(`/rutinas/${rutinaId}/editar`)}
                    className="px-5 py-2.5 text-sm font-medium text-white bg-royal hover:bg-royal-dark rounded-card transition-colors"
                  >
                    Modificar rutina
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => router.push("/rutinas")}
                  className="px-5 py-2.5 text-sm font-medium text-gray-300 border border-gray-700 rounded-card hover:bg-dark-surface transition-colors"
                >
                  Volver al listado
                </button>
              </div>
              <div className="mt-6 p-5 bg-dark-surface border border-gray-800 rounded-card">
                <RutinaVista rutina={rutina} />
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

