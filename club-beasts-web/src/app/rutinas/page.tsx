/**
 * INC-10 (GREEN T8) — `/rutinas`: listado staff de rutinas (NAV-RU-01/23/24,
 * C1). Región "Rutinas", filtros `tipo`/`nombre` en searchParams, entrada al
 * detalle por link y al formulario con "Crear rutina".
 */
"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Navbar, PageHeader } from "@/components";
import RutinaListado from "@/components/rutinas/RutinaListado";
import { api, type RutinaResumenDTO } from "@/lib/api";

function ListadoRutinas() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const rol = (session?.user as { role?: string } | undefined)?.role;

  const [tipo, setTipo] = useState(searchParams.get("tipo") ?? "");
  const [nombre, setNombre] = useState(searchParams.get("nombre") ?? "");
  const [rutinas, setRutinas] = useState<RutinaResumenDTO[] | null>(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const data = await api.rutinas.listar();
        if (vivo) setRutinas(data.rutinas ?? []);
      } catch {
        if (vivo) setRutinas([]);
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  // Filtros en searchParams (tipo exacto + nombre subcadena insensible, AND).
  const sincronizarUrl = (nuevoTipo: string, nuevoNombre: string) => {
    const query = new URLSearchParams();
    if (nuevoTipo) query.set("tipo", nuevoTipo);
    if (nuevoNombre) query.set("nombre", nuevoNombre);
    const qs = query.toString();
    router.replace(`/rutinas${qs ? `?${qs}` : ""}`);
  };

  const filtradas = (rutinas ?? []).filter((rutina) => {
    const coincideTipo = !tipo || rutina.tipoRutina === tipo;
    const coincideNombre =
      !nombre || rutina.nombre.toLowerCase().includes(nombre.toLowerCase());
    return coincideTipo && coincideNombre;
  });

  return (
    <main className="min-h-screen bg-near-black">
      {/* INC10-NAV-AUD-06 (DEC-053/INC-08): showAuth habilita el control
          "Salir" del Navbar (`signOut({ callbackUrl: "/" })`) — unico por
          pantalla y fuera de la region "Rutinas" (C7). */}
      <Navbar showAuth />

      <div className="pt-24 pb-12">
        <div className="max-w-3xl mx-auto px-5">
          <PageHeader
            title="Rutinas"
            description="Rutinas registradas en el club"
          />
          <div className="mt-6">
            {rutinas === null ? (
              <p className="text-gray-400">Cargando...</p>
            ) : (
              <RutinaListado
                rutinas={filtradas}
                tipo={tipo}
                nombre={nombre}
                onCambiarTipo={(valor) => {
                  setTipo(valor);
                  sincronizarUrl(valor, nombre);
                }}
                onCambiarNombre={(valor) => {
                  setNombre(valor);
                  sincronizarUrl(tipo, valor);
                }}
                onCrear={() => router.push("/rutinas/nueva")}
                puedeCrear={rol === "DUENO"}
              />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function RutinasPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-near-black" />}>
      <ListadoRutinas />
    </Suspense>
  );
}
