import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

/** Codigo de error del backend para un login de cliente con cuenta INACTIVA. */
const CODIGO_CLIENTE_INACTIVO = "AUTH_CLIENTE_INACTIVO";

/**
 * INC04-CLI-04 (DEC-034): Auth.js v5 beta solo permite ver al cliente el
 * `type` de los errores client-safe (`CredentialsSignin` => `error=...`) y,
 * ademas, el `code` configurable de `CredentialsSignin` (=> `code=...` en la
 * misma URL de error). Cualquier otro error lanzado dentro de `authorize` se
 * reporta al navegador como `Configuration` y el literal del backend se
 * pierde. Este error lanza `CredentialsSignin` con `code` = literal aprobado
 * del backend ("La cuenta esta inactiva. Contacte con recepcion."), que la
 * pagina /login-cliente lee de `result.code` y muestra en su role=alert.
 */
class CuentaInactivaSignin extends CredentialsSignin {
  constructor(literal: string) {
    super();
    this.code = literal;
  }
}

/**
 * Body JSON de un error del backend como `{ code, error }` tipados. Respuestas
 * sin body o con body no-objeto producen `{}` para no lanzar al leer `.code`.
 */
function leerErrorBackend(body: unknown): { code?: string; error?: string } {
  if (typeof body !== "object" || body === null) return {};
  const data = body as { code?: unknown; error?: unknown };
  return {
    code: typeof data.code === "string" ? data.code : undefined,
    error: typeof data.error === "string" && data.error ? data.error : undefined,
  };
}

const nextAuthSecret = process.env.NEXTAUTH_SECRET;
if (!nextAuthSecret) {
  throw new Error("NEXTAUTH_SECRET no está configurado. Define la variable de entorno antes de iniciar.");
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        cedula: { label: "Cédula", type: "text" },
        pin: { label: "PIN", type: "password" },
        loginType: { label: "Login Type", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials) return null;

        const loginType = credentials.loginType as string;

        if (loginType === "cliente") {
          const cedula = credentials.cedula as string;
          const pin = credentials.pin as string;

          if (!cedula || !pin) return null;

          try {
            const res = await fetch(`${API_URL}/auth/login-cliente`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ cedula, pin }),
            });

            if (!res.ok) {
              // INC04-CLI-04 (DEC-034): el 401 de cuenta inactiva propagaria su
              // literal via `CredentialsSignin.code`; el resto de fallos
              // (credenciales invalidas, token, sesion) sigue retornando null,
              // que Auth.js traduce a CredentialsSignin generico.
              const { code, error } = leerErrorBackend(
                await res.json().catch(() => null)
              );
              if (code === CODIGO_CLIENTE_INACTIVO && error) {
                throw new CuentaInactivaSignin(error);
              }
              return null;
            }

            const data = await res.json();
            return {
              id: data.cliente.id,
              name: `${data.cliente.nombres} ${data.cliente.apellidos}`,
              email: data.cliente.cedula,
              role: "CLIENTE",
              token: data.token,
              tokenExpiresAt: data.tokenExpiresAt,
              debeCambiarPin: data.cliente.debeCambiarPin,
            };
          } catch {
            return null;
          }
        } else {
          const email = credentials.email as string;
          const password = credentials.password as string;

          if (!email || !password) return null;

          try {
            const res = await fetch(`${API_URL}/auth/login`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email, password }),
            });

            if (!res.ok) return null;

            const data = await res.json();
            return {
              id: data.user.id,
              name: data.user.nombre,
              email: data.user.email,
              role: data.user.rol,
              token: data.token,
              tokenExpiresAt: data.tokenExpiresAt,
              debeCambiarPin: false,
            };
          } catch {
            return null;
          }
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = (user as { role: string }).role;
        token.apiToken = (user as { token: string }).token;
        token.apiTokenExpiresAt = (user as { tokenExpiresAt: number }).tokenExpiresAt;
        token.debeCambiarPin = (user as { debeCambiarPin: boolean }).debeCambiarPin;
      }
      if (trigger === "update" && session?.user) {
        const s = session.user as { debeCambiarPin?: boolean };
        if (s.debeCambiarPin !== undefined) {
          token.debeCambiarPin = s.debeCambiarPin;
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.user.role = token.role as string;
      (session.user as { apiToken: string }).apiToken = token.apiToken as string;
      (session.user as { apiTokenExpiresAt: number }).apiTokenExpiresAt = token.apiTokenExpiresAt as number;
      (session.user as { debeCambiarPin: boolean }).debeCambiarPin = token.debeCambiarPin as boolean;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: nextAuthSecret,
});
