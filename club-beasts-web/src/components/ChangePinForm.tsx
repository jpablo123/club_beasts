"use client";

import { useState } from "react";
import { api, type ApiError } from "@/lib/api";
import { Card, Button, Input } from "@/components";

interface ChangePinFormProps {
  /** Puede ser async: el portal persiste el flag de sesion aqui dentro. */
  onSuccess: () => void | Promise<void>;
}

export default function ChangePinForm({ onSuccess }: ChangePinFormProps) {
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = (): string | null => {
    if (!currentPin || !newPin || !confirmPin) {
      return "Todos los campos son obligatorios.";
    }
    if (!/^\d{4}$/.test(currentPin)) {
      return "El PIN actual debe ser de 4 digitos.";
    }
    if (!/^\d{4}$/.test(newPin)) {
      return "El nuevo PIN debe ser de 4 digitos.";
    }
    if (newPin === currentPin) {
      return "El nuevo PIN debe ser diferente al actual.";
    }
    if (newPin !== confirmPin) {
      return "Los PINs nuevos no coinciden.";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      await api.auth.changePin(currentPin, newPin);
      // Se espera tambien el onSuccess (async en el portal): el boton
      // permanece en `loading` hasta que el flag de sesion persiste, sin
      // un frame intermedio en el que el formulario quede habilitado.
      await onSuccess();
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.kind === "invalid_credentials") {
        setError("El PIN actual es incorrecto.");
      } else {
        setError(apiErr.message || "Error al cambiar el PIN.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card padding="lg" className="mt-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-royal/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-royal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-display font-bold text-white uppercase">
              Cambio de PIN Obligatorio
            </h3>
            <p className="text-gray-400 text-sm">
              Por seguridad, debes cambiar tu PIN antes de continuar.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="PIN Actual"
          type="password"
          value={currentPin}
          onChange={(e) => setCurrentPin(e.target.value)}
          placeholder="****"
          maxLength={4}
        />
        <Input
          label="Nuevo PIN"
          type="password"
          value={newPin}
          onChange={(e) => setNewPin(e.target.value)}
          placeholder="****"
          maxLength={4}
        />
        <Input
          label="Confirmar Nuevo PIN"
          type="password"
          value={confirmPin}
          onChange={(e) => setConfirmPin(e.target.value)}
          placeholder="****"
          maxLength={4}
        />

        {error && (
          <p className="text-red-400 text-sm">{error}</p>
        )}

        <Button type="submit" loading={loading} className="w-full">
          Cambiar PIN
        </Button>
      </form>
    </Card>
  );
}
