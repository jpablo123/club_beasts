/**
 * INC04-EST-06 (web, `cliente-payload.ts`) — RED del motivo en el payload de
 * edicion de cliente.
 *
 * Contrato (DEC-035 opcion a + CONF-07): `construirPayloadEdicionCliente`
 * incluye `motivo` SOLO cuando el formulario trae `estado` (cambio de
 * estado); un motivo "viajero" sin estado no viaja en el payload (el backend
 * lo ignoraria y el historial no debe registrarse).
 *
 * Estado RED (2026-10-19): `FormEdicionCliente` (`src/lib/cliente-payload.ts`)
 * no tiene campo `motivo` y la linea 41 arma el payload sin el, asi que:
 *  - `payload.motivo` es `undefined` cuando el form cambia de estado
 *    (asercion principal: FALLA en RED);
 *  - las aserciones de omision (CONF-07 y motivo en blanco) pasan hoy por
 *    accidente y se mantienen como pin de no-regresion del GREEN.
 * GREEN (frontend-developer): agregar `motivo?: string` a
 * `FormEdicionCliente` y enviarlo trimmeado solo si `form.estado` esta
 * presente y el motivo no queda vacio.
 */
import { describe, it, expect } from "vitest";
import {
  construirPayloadEdicionCliente,
  type FormEdicionCliente,
} from "@/lib/cliente-payload";

const BASE: FormEdicionCliente = {
  nombres: "Ana",
  apellidos: "Perez",
  telefono: "3001112233",
  email: "ana@clubbeasts.com",
  observaciones: "Observacion previa",
  estado: "ACTIVO",
  sede: { id: "sede-1", nombre: "Sede Principal" },
};

describe("INC04-EST-06 el motivo viaja con el cambio de estado (DEC-035)", () => {
  it("incluye motivo cuando el formulario trae estado", () => {
    // El cast hacia `FormEdicionCliente & { motivo?: string }` es el contrato
    // previsto para el GREEN; en RED el helper descarta el campo.
    const payload = construirPayloadEdicionCliente({
      ...BASE,
      estado: "INACTIVO",
      motivo: "Mudanza de ciudad",
    } as FormEdicionCliente & { motivo?: string });

    expect(payload.motivo).toBe("Mudanza de ciudad");
  });

  it("omite motivo cuando el formulario no trae estado (CONF-07)", () => {
    const payload = construirPayloadEdicionCliente({
      nombres: "Ana",
      apellidos: "Perez",
      email: "",
      observaciones: "",
      motivo: "Motivo viajero sin estado",
    } as FormEdicionCliente & { motivo?: string });

    expect(Object.prototype.hasOwnProperty.call(payload, "motivo")).toBe(false);
  });

  it("omite motivo en blanco (solo espacios) aunque haya cambio de estado", () => {
    const payload = construirPayloadEdicionCliente({
      ...BASE,
      estado: "SUSPENDIDO",
      motivo: "   ",
    } as FormEdicionCliente & { motivo?: string });

    expect(Object.prototype.hasOwnProperty.call(payload, "motivo")).toBe(false);
  });

  it("conserva el resto del contrato del payload al agregar motivo", () => {
    const payload = construirPayloadEdicionCliente({
      ...BASE,
      estado: "RETIRADO",
      motivo: "Baja definitiva",
    } as FormEdicionCliente & { motivo?: string });

    expect(payload.estado).toBe("RETIRADO");
    expect(payload.sedeId).toBe("sede-1");
    expect(payload.email).toBe("ana@clubbeasts.com");
    expect(payload.observaciones).toBe("Observacion previa");
    expect(payload.nombres).toBe("Ana");
  });
});
