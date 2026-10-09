/**
 * INC00-CLI-03 — Email y observaciones se limpian de forma intencional (null).
 * Incremento: INC-00-estabilizacion-fases-1-2 (Tarea 11 / GAP-003)
 *
 * INC00-CLI-02 — Editar cliente envia sedeId y estado.
 *
 * Contrato PATCH /clientes/:id (fijado, no se modifica):
 *  - opcionales: nombres, apellidos, telefono, email, sedeId, estado, observaciones
 *  - `email` y `observaciones` aceptan `null` (borrado intencional)
 *  - `estado` es enum NUEVO|ACTIVO|SUSPENDIDO|RETIRADO|INACTIVO
 */
import { describe, it, expect } from "vitest";
import { construirPayloadEdicionCliente } from "@/lib/cliente-payload";

const BASE = {
  nombres: "Ana",
  apellidos: "Perez",
  telefono: "3001112233",
  email: "ana@clubbeasts.com",
  observaciones: "Observacion previa",
  estado: "ACTIVO",
  sede: { id: "sede-1", nombre: "Sede Principal" },
};

describe("INC00-CLI-03 limpieza intencional de campos opcionales", () => {
  it("envia email: null cuando el campo queda vacio (en vez de omitirlo)", () => {
    const payload = construirPayloadEdicionCliente({ ...BASE, email: "" });

    expect(Object.prototype.hasOwnProperty.call(payload, "email")).toBe(true);
    expect(payload.email).toBeNull();
  });

  it("envia observaciones: null cuando el campo queda en blanco", () => {
    const payload = construirPayloadEdicionCliente({
      ...BASE,
      observaciones: "   \n ",
    });

    expect(Object.prototype.hasOwnProperty.call(payload, "observaciones")).toBe(true);
    expect(payload.observaciones).toBeNull();
  });

  it("conserva el valor cuando el campo tiene contenido", () => {
    const payload = construirPayloadEdicionCliente(BASE);

    expect(payload.email).toBe("ana@clubbeasts.com");
    expect(payload.observaciones).toBe("Observacion previa");
  });

  it("omite telefono vacio: el contrato no admite null en telefono", () => {
    const payload = construirPayloadEdicionCliente({ ...BASE, telefono: "" });

    expect(Object.prototype.hasOwnProperty.call(payload, "telefono")).toBe(false);
  });

  it("siempre incluye nombres y apellidos", () => {
    const payload = construirPayloadEdicionCliente({ ...BASE, email: "", observaciones: "" });

    expect(payload.nombres).toBe("Ana");
    expect(payload.apellidos).toBe("Perez");
  });
});

describe("INC00-CLI-02 sede y estado en la edicion", () => {
  it("incluye sedeId tomado de la sede seleccionada", () => {
    const payload = construirPayloadEdicionCliente({
      ...BASE,
      sede: { id: "sede-2", nombre: "Sede Secundaria" },
    });

    expect(payload.sedeId).toBe("sede-2");
    expect(Object.prototype.hasOwnProperty.call(payload, "sede")).toBe(false);
  });

  it("incluye estado con valor del enum", () => {
    const payload = construirPayloadEdicionCliente({ ...BASE, estado: "SUSPENDIDO" });

    expect(payload.estado).toBe("SUSPENDIDO");
  });

  it("omite sedeId y estado cuando no vienen en el formulario", () => {
    const payload = construirPayloadEdicionCliente({
      nombres: "Ana",
      apellidos: "Perez",
      email: "",
      observaciones: "",
    });

    expect(Object.prototype.hasOwnProperty.call(payload, "sedeId")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(payload, "estado")).toBe(false);
  });
});
