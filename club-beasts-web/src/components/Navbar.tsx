"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import Logo from "./Logo";
import Button from "./Button";

interface NavLink {
  label: string;
  href: string;
}

interface NavbarProps {
  links?: NavLink[];
  showAuth?: boolean;
}

export default function Navbar({ links = [], showAuth = true }: NavbarProps) {
  const { data: session } = useSession();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-near-black/80 backdrop-blur-md border-b border-gray-800">
      <div className="max-w-[1200px] mx-auto px-5 h-16 flex items-center justify-between">
        <Link href="/" className="flex-shrink-0">
          <Logo size="md" />
        </Link>

        {links.length > 0 && (
          <div className="hidden md:flex items-center gap-8">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-gray-400 hover:text-white transition-colors font-medium"
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}

        {showAuth && (
          <div className="flex items-center gap-4">
            {session ? (
              <>
                <span className="text-sm text-gray-400 hidden sm:inline">
                  {session.user?.name}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signOut({ callbackUrl: "/" })}
                >
                  Salir
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Iniciar sesion
                  </Button>
                </Link>
                <Link href="/login-cliente">
                  <Button variant="primary" size="sm">
                    Portal Cliente
                  </Button>
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
