/**
 * INC-10 (GREEN T8) — `/rutinas/[id]/editar`: edición de rutina (NAV-RU-05/06,
 * C1/DEC-065). RECEPCIONISTA -> redirect al detalle (solo lectura). "Aplicar
 * cambios" -> detalle; "Descartar cambios" -> detalle (confirmación C5 si está
 * sucio); "Volver al listado" -> /rutinas. El PATCH nunca lleva `tipoRutina`
 * (inmutable).
 */
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Navbar } from "@/components";
import RutinaEditor from "@/components/rutinas/RutinaEditor";
import { api } from "@/lib/api";
import type {
  BorradorPersonalizada,
  BorradorRutina,
  DiagnosticoPersonalizada,
  HallazgoBiomecanico,
  InformacionGeneral,
  Macrociclo,
  MedidaAntropometrica,
  Sesion,
  TestEvaluacion,
  TipoRutina,
} from "@/lib/rutina-schemas";

function normalizarDesdeApi(datos: Record<string, unknown>): BorradorRutina {
  const tipoRutina = String(datos.tipoRutina ?? "GENERICA") as TipoRutina;
  if (tipoRutina === "PERSONALIZADA") {
    const personalizada: BorradorPersonalizada = {
      tipoRutina: "PERSONALIZADA",
      nombre: String(datos.nombre ?? ""),
      descripcion: (datos.descripcion as string | null) ?? null,
      informacionGeneral: (datos.informacionGeneral ?? {
        objetivoGeneral: "",
        nivelExperiencia: "",
        fechaEvaluacion: "",
      }) as InformacionGeneral,
      diagnostico: (datos.diagnostico ?? {
        diagnostico: "",
        restriccionesMedicas: null,
        lesionesPrevias: null,
        observacionesGenerales: null,
      }) as DiagnosticoPersonalizada,
      macrociclos: (datos.macrociclos ?? []) as Macrociclo[],
      tests: (datos.tests ?? []) as TestEvaluacion[],
      antropometria: (datos.antropometria ?? []) as MedidaAntropometrica[],
      analisisBiomecanico: (datos.analisisBiomecanico ?? []) as HallazgoBiomecanico[],
    };
    return personalizada;
  }
  return {
    tipoRutina: tipoRutina === "INDUCCION" ? "INDUCCION" : "GENERICA",
    nombre: String(datos.nombre ?? ""),
    descripcion: (datos.descripcion as string | null) ?? null,
    objetivo: (datos.objetivo as string | null) ?? null,
    nivelExperiencia: (datos.nivelExperiencia as string | null) ?? null,
    sesiones: (datos.sesiones ?? []) as Sesion[],
  };
}

export default function EditarRutinaPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const rol = (session?.user as { role?: string } | undefined)?.role;
  const rutinaId = String(params.id ?? "");
  const [inicial, setInicial] = useState<BorradorRutina | null>(null);
  const [noEncontrada, setNoEncontrada] = useState(false);
  const [errorApi, setErrorApi] = useState("");
  const [guardando, setGuardando] = useState(false);

  // C1/NAV-RU-05: RECEPCIONISTA con URL directa -> detalle (solo lectura).
  useEffect(() => {
    if (rol === "RECEPCIONISTA") router.replace(`/rutinas/${rutinaId}`);
  }, [rol, rutinaId, router]);

  useEffect(() => {
    if (rol !== "DUENO") return;
    let vivo = true;
    (async () => {
      try {
        const datos = await api.rutinas.obtener(rutinaId);
        if (vivo) setInicial(normalizarDesdeApi(datos as Record<string, unknown>));
      } catch {
        if (vivo) setNoEncontrada(true);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [rol, rutinaId]);

  if (rol === "RECEPCIONISTA") return null;

  const aplicar = async (payload: BorradorRutina) => {
    if (guardando) return;
    setGuardando(true);
    setErrorApi("");
    try {
      // `tipoRutina` es inmutable: no viaja en el PATCH (contrato R1).
      const { tipoRutina: _tipoRutina, ...resto } = payload;
      await api.rutinas.actualizar(rutinaId, resto);
      router.push(`/rutinas/${rutinaId}`);
    } catch (err) {
      setErrorApi((err as Error).message || "No se pudo actualizar la rutina.");
      setGuardando(false);
    }
  };

  return (
    <main className="min-h-screen bg-near-black">
      {/* INC10-NAV-AUD-06 (DEC-053/INC-08): showAuth habilita el control
          "Salir" del Navbar (`signOut({ callbackUrl: "/" })`) — unico por
          pantalla y fuera de las regiones de rutinas (C7). */}
      <Navbar showAuth />

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

          {noEncontrada ? (
            <div className="p-5 bg-dark-surface border border-gray-800 rounded-card">
              <p className="text-white">Rutina no encontrada</p>
              <button
                type="button"
                onClick={() => router.push("/rutinas")}
                className="mt-4 px-5 py-2.5 text-sm font-medium text-gray-300 border border-gray-700 rounded-card hover:bg-dark-surface transition-colors"
              >
                Volver al listado
              </button>
            </div>
          ) : !inicial ? (
            <p className="text-gray-400">Cargando...</p>
          ) : (
            <RutinaEditor
              tipoRutina={inicial.tipoRutina}
              inicial={inicial}
              onAplicar={aplicar}
              onDescartar={() => router.push(`/rutinas/${rutinaId}`)}
              onVolver={() => router.push("/rutinas")}
            />
          )}
        </div>
      </div>
    </main>
  );
}
