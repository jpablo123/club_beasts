"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { Navbar, HeroSection, Button } from "@/components";

export default function Home() {
  const { data: session } = useSession();

  return (
    <main className="min-h-screen">
      <Navbar showAuth={false} />

      <HeroSection
        title="Alto Rendimiento"
        subtitle="Club Beasts"
        description="Transforma tu potencial en resultados. Elite fitness, disciplina y excelencia."
      >
        <div className="flex flex-wrap gap-4">
          {session ? (
            <Link href={session.user?.role === "CLIENTE" ? "/portal" : "/clientes"}>
              <Button size="lg">Ir al sistema</Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button size="lg">Iniciar sesion</Button>
              </Link>
              <Link href="/login-cliente">
                <Button variant="secondary" size="lg">
                  Portal Cliente
                </Button>
              </Link>
            </>
          )}
        </div>
      </HeroSection>

      <section className="py-24 bg-black">
        <div className="max-w-[1200px] mx-auto px-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-royal/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-royal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-display font-bold text-white uppercase mb-2">Fuerza</h3>
              <p className="text-gray-400">Entrenamiento de alto impacto para maximizar tu potencial fisico.</p>
            </div>
            <div className="text-center p-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-royal/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-royal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-display font-bold text-white uppercase mb-2">Disciplina</h3>
              <p className="text-gray-400">Constantancia y compromiso como base del exito deportivo.</p>
            </div>
            <div className="text-center p-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-royal/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-royal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-display font-bold text-white uppercase mb-2">Resultados</h3>
              <p className="text-gray-400">Metricas y progreso medible para cada atleta.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-12 bg-near-black border-t border-gray-800">
        <div className="max-w-[1200px] mx-auto px-5 text-center">
          <p className="text-gray-500 text-sm">
            2026 Club Beasts David Rozo. Alto rendimiento deportivo.
          </p>
        </div>
      </footer>
    </main>
  );
}
