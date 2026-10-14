"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, Navbar, PageHeader } from "@/components";
import ConsultaRecepcion from "@/components/recepcion/ConsultaRecepcion";
import RegistrarIngreso from "@/components/recepcion/RegistrarIngreso";
import AltaClienteRapido from "@/components/recepcion/AltaClienteRapido";
import { resolveSessionExit } from "@/lib/session-recovery";

const NAV_LINKS = [
  { label: "Clientes", href: "/clientes" },
  { label: "Recepcion", href: "/recepcion" },
  { label: "Dashboard", href: "/dashboard" },
];

/**
 * Pantalla de recepcion de INC-03 (HU-29 consulta + HU-30 ingreso + HU-31
 * alta rapida). Criterios: `INC03-REC-*`, `INC03-ING-*`, `INC03-RAP-*`,
 * `INC03-VEN-03`.
 *
 * Permisos (DEC-001 / INC03-REC-08 / INC03-ING-09 / INC03-RAP-05): el
 * middleware ya redirige al CLIENTE; aqui se repite la guarda (defensa en
 * profundidad) para que un rol CLIENTE no pinte ninguna herramienta de
 * recepcion ni dispare llamadas al backend.
 */
export default function RecepcionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

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
    // Recuperacion centralizada de sesion (INC00-AUTH-03): no competimos con
    // su navegacion; si no esta en curso, salimos hacia /login.
    const exit = resolveSessionExit("/login");
    if (exit) router.push(exit);
    return null;
  }

  const role = (session.user as { role?: string })?.role;
  const esStaff = role === "DUENO" || role === "RECEPCIONISTA";

  return (
    <main className="min-h-screen bg-near-black">
      {/* showAuth={false}: el nombre de la sesion no debe duplicar el texto
          del creador pintado por el alta rapida (unicidad de aserciones). */}
      <Navbar links={esStaff ? NAV_LINKS : []} showAuth={false} />

      <div className="pt-24 pb-12">
        <div className="max-w-[1200px] mx-auto px-5">
          <PageHeader
            title="Recepcion"
            description="Consulta por cedula, registro de ingresos y alta rapida"
          />

          {!esStaff ? (
            <Card padding="lg">
              <p className="text-gray-400">
                Esta pantalla es exclusiva del personal de recepcion
                (dueno y recepcionistas).
              </p>
              <Link
                href="/portal"
                className="inline-block mt-4 text-royal hover:text-royal-light text-sm font-medium transition-colors"
              >
                Volver a mi portal
              </Link>
            </Card>
          ) : (
            <div className="space-y-6">
              <ConsultaRecepcion />
              <RegistrarIngreso />
              <AltaClienteRapido />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
