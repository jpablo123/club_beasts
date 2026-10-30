"use client";

import { useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, Input, Button } from "@/components";
import SessionExpiredBanner from "@/components/SessionExpiredBanner";
import { resolvePostLoginPath } from "@/lib/redirect";

export default function LoginPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // INC-07 (DEC-050, C1 / INC07-NAV-01): destino del link "Volver al inicio"
  // por rol y estado. La rama con sesion staff es hoy inobservable en
  // navegador (middleware.ts redirige /login autenticado a /clientes antes de
  // montar la pagina): el link se renderiza SIEMPRE visible (sin gatear por
  // `status`, para no romper su visibilidad/Tab durante `loading`) y solo
  // cambia su `href`.
  const role = (session?.user as { role?: string } | undefined)?.role;
  const esStaff = role === "DUENO" || role === "RECEPCIONISTA";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        loginType: "internal",
        redirect: false,
      });

      if (result?.error) {
        setError("Credenciales invalidas");
      } else {
        // INC00-AUTH-03: regresa a la pantalla original cuando aplica.
        router.push(resolvePostLoginPath("/clientes"));
        router.refresh();
      }
    } catch {
      setError("Error de conexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-near-black p-5">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-display font-bold text-white uppercase tracking-wide mb-2">
            Iniciar Sesion
          </h1>
          <p className="text-gray-400">Dueno o Recepcionista</p>
        </div>

        <Card padding="lg">
          {/* INC00-AUTH-02: mensaje aprobado tras una recuperación de sesión. */}
          <SessionExpiredBanner />

          {error && (
            <div className="mb-6 p-3 bg-red-500/20 text-red-400 rounded-card text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
            />
            <Input
              label="Contrasena"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              required
            />
            <Button
              type="submit"
              loading={loading}
              className="w-full"
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </Button>
          </form>
        </Card>

        <div className="mt-6 text-center">
          <Link
            href="/login-cliente"
            className="text-sm text-gray-400 hover:text-royal transition-colors"
          >
            Portal del Cliente
          </Link>
          {/* INC-07 (INC07-NAV-01): link de regreso, hermano DESPUES del link
              cruzado (orden de tabulacion logico). */}
          <Link
            href={esStaff ? "/dashboard" : "/"}
            className="block mt-2 text-sm text-gray-400 hover:text-royal transition-colors"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
