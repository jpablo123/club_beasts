"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, Input, Button } from "@/components";
import SessionExpiredBanner from "@/components/SessionExpiredBanner";
import { resolvePostLoginPath } from "@/lib/redirect";

export default function LoginClientePage() {
  const router = useRouter();
  const [cedula, setCedula] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!/^\d{4}$/.test(pin)) {
      setError("El PIN debe ser de 4 digitos");
      return;
    }

    setLoading(true);

    try {
      const result = await signIn("credentials", {
        cedula,
        pin,
        loginType: "cliente",
        redirect: false,
      });

      if (result?.error) {
        if (result.error === "CredentialsSignin") {
          // INC04-CLI-04 (DEC-034): Auth.js v5 acota lo que puede viajar al
          // navegador: el fallo de credenciales llega como
          // `error=CredentialsSignin` con `code=credentials`, y el literal
          // aprobado del backend de una cuenta inactiva viaja como `code`
          // propio (propagado por src/lib/auth.ts). Con `code` distinto del
          // generico se muestra el literal; sin el, sigue siendo un PIN o
          // cedula invalido. La sesion vencida (DEC-010) no pasa por aqui: se
          // anuncia con el banner de recuperacion.
          setError(
            result.code && result.code !== "credentials"
              ? result.code
              : "Cedula o PIN invalido"
          );
        } else {
          setError(result.error);
        }
      } else {
        // INC00-AUTH-03: regresa a la pantalla original cuando aplica.
        router.push(resolvePostLoginPath("/portal"));
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
            Portal del Cliente
          </h1>
          <p className="text-gray-400">Ingresa con tu cedula y PIN</p>
        </div>

        <Card padding="lg">
          {/* INC00-AUTH-02: mensaje aprobado tras una recuperación de sesión. */}
          <SessionExpiredBanner />

          {error && (
            <div
              role="alert"
              className="mb-6 p-3 bg-red-500/20 text-red-400 rounded-card text-sm"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Cedula"
              type="text"
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              placeholder="Ingresa tu cedula"
              required
            />
            <Input
              label="PIN (4 digitos)"
              type="password"
              maxLength={4}
              pattern="\d{4}"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="****"
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
            href="/login"
            className="text-sm text-gray-400 hover:text-royal transition-colors"
          >
            Iniciar sesion como Dueno/Recepcionista
          </Link>
        </div>
      </div>
    </main>
  );
}
