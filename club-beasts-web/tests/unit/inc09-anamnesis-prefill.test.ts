/**
 * INC-09 (RED) — Pre-llenado del formulario de anamnesis (DEC-056a / NAV-AN-08).
 *
 * Contrato fijado por este RED para `src/lib/anamnesis-prefill.ts` (GREEN T10):
 *   export function prellenarAnamnesisDesdeCliente(cliente: {
 *     nombres: string;
 *     apellidos: string;
 *     cedula: string;
 *     telefono: string;
 *     email?: string | null;
 *   }): {
 *     nombreCompleto: string;        // campo 1
 *     numeroDocumento: string;       // campo 2
 *     numeroContacto: string;        // campo 9
 *     correoElectronico: string | null; // campo 10 (null sin email)
 *   };
 *
 * DEC-056a (C6 resuelto): el pre-llenado es del FRONTEND y SOLO cubre los
 * campos 1, 2, 9, 10; los campos 3-8 nacen VACÍOS y editables (el backend no
 * auto-rellena). La copia snapshot se guarda al diligenciar (DEC-056).
 *
 * FASE RED (2026-11-04): `src/lib/anamnesis-prefill.ts` NO existe (GREEN T10).
 * Los tests fallan por COMPORTAMIENTO AUSENTE (módulo/pantalla inexistente),
 * con mensaje de fallo explícito — no por sintaxis.
 */
import { describe, it, expect } from "vitest";

const RUTA_PREFILL = "../../src/lib/anamnesis-prefill";

async function importarPrefill(): Promise<any> {
  const ruta: string = RUTA_PREFILL;
  try {
    return await import(/* @vite-ignore */ ruta);
  } catch {
    throw new Error(
      "INC09-RED: falta el modulo de producto src/lib/anamnesis-prefill.ts " +
        "(pre-llenado DEC-056a, GREEN T10). Fallo de comportamiento ausente esperado."
    );
  }
}

const CLIENTE = {
  nombres: "Carlos",
  apellidos: "Rodriguez",
  cedula: "1020304050",
  telefono: "3001234567",
  email: "carlos@test.com",
};

/** Campos 3-8 del Anexo: nacen vacíos (DEC-056a). */
const CAMPOS_3_A_8 = [
  "sexo",
  "rh",
  "edad",
  "fechaNacimiento",
  "lugarNacimiento",
  "estadoCivil",
  "direccionResidencia",
];

describe("DEC-056a pre-llenado solo de los campos 1, 2, 9, 10", () => {
  it("devuelve exactamente las 4 claves pre-llenables", async () => {
    const mod = await importarPrefill();
    const prefill = mod.prellenarAnamnesisDesdeCliente(CLIENTE);
    expect(Object.keys(prefill).sort()).toEqual([
      "correoElectronico",
      "nombreCompleto",
      "numeroContacto",
      "numeroDocumento",
    ]);
  });

  it("mapea los campos 1, 2, 9, 10 desde la ficha del Cliente", async () => {
    const mod = await importarPrefill();
    const prefill = mod.prellenarAnamnesisDesdeCliente(CLIENTE);
    expect(prefill.nombreCompleto).toBe("Carlos Rodriguez"); // campo 1
    expect(prefill.numeroDocumento).toBe("1020304050"); // campo 2
    expect(prefill.numeroContacto).toBe("3001234567"); // campo 9
    expect(prefill.correoElectronico).toBe("carlos@test.com"); // campo 10
  });

  it("los campos 3-8 quedan vacíos (nunca pre-llenados)", async () => {
    const mod = await importarPrefill();
    const prefill = mod.prellenarAnamnesisDesdeCliente(CLIENTE);
    for (const campo of CAMPOS_3_A_8) {
      expect(prefill, `el campo ${campo} no debe pre-llenarse`).not.toHaveProperty(campo);
    }
  });

  it("sin email en la ficha, el campo 10 queda null (editable)", async () => {
    const mod = await importarPrefill();
    const prefill = mod.prellenarAnamnesisDesdeCliente({
      ...CLIENTE,
      email: null,
    });
    expect(prefill.correoElectronico).toBeNull();
    expect(prefill.nombreCompleto).toBe("Carlos Rodriguez");
  });
});
