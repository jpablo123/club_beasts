import { describe, it, expect } from "vitest";
import {
  loginUserSchema,
  loginClientSchema,
  resetPinSchema,
} from "../../src/schemas/auth.schema.js";
import {
  createMembresiaSchema,
  updateMembresiaSchema,
} from "../../src/schemas/membresia.schema.js";

// ─── Auth Schemas ────────────────────────────────────────────────────────────

describe("Auth Schemas", () => {
  describe("loginUserSchema", () => {
    it("acepta email y password válidos", () => {
      const result = loginUserSchema.safeParse({
        email: "admin@clubbeasts.com",
        password: "admin123",
      });
      expect(result.success).toBe(true);
    });

    it("rechaza email con formato inválido", () => {
      const result = loginUserSchema.safeParse({
        email: "no-email",
        password: "admin123",
      });
      expect(result.success).toBe(false);
    });

    it("rechaza email sin @", () => {
      const result = loginUserSchema.safeParse({
        email: "testexample.com",
        password: "admin123",
      });
      expect(result.success).toBe(false);
    });

    it("rechaza email sin dominio", () => {
      const result = loginUserSchema.safeParse({
        email: "test@",
        password: "admin123",
      });
      expect(result.success).toBe(false);
    });

    it("rechaza password vacío", () => {
      const result = loginUserSchema.safeParse({
        email: "admin@clubbeasts.com",
        password: "",
      });
      expect(result.success).toBe(false);
    });

    it("rechaza campos faltantes", () => {
      const result = loginUserSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("loginClientSchema", () => {
    it("acepta cédula y PIN válidos", () => {
      const result = loginClientSchema.safeParse({
        cedula: "1234567890",
        pin: "1234",
      });
      expect(result.success).toBe(true);
    });

    it("rechaza cédula inválida (con letras)", () => {
      const result = loginClientSchema.safeParse({
        cedula: "abc123",
        pin: "1234",
      });
      expect(result.success).toBe(false);
    });

    it("rechaza cédula corta (5 dígitos)", () => {
      const result = loginClientSchema.safeParse({
        cedula: "12345",
        pin: "1234",
      });
      expect(result.success).toBe(false);
    });

    it("rechaza cédula larga (11 dígitos)", () => {
      const result = loginClientSchema.safeParse({
        cedula: "12345678901",
        pin: "1234",
      });
      expect(result.success).toBe(false);
    });

    it("rechaza PIN inválido (no numérico)", () => {
      const result = loginClientSchema.safeParse({
        cedula: "1234567890",
        pin: "abcd",
      });
      expect(result.success).toBe(false);
    });

    it("rechaza PIN de 3 dígitos", () => {
      const result = loginClientSchema.safeParse({
        cedula: "1234567890",
        pin: "123",
      });
      expect(result.success).toBe(false);
    });

    it("rechaza PIN de 5 dígitos", () => {
      const result = loginClientSchema.safeParse({
        cedula: "1234567890",
        pin: "12345",
      });
      expect(result.success).toBe(false);
    });

    it("rechaza campos faltantes", () => {
      const result = loginClientSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("resetPinSchema", () => {
    it("acepta clienteId y newPin válidos", () => {
      const result = resetPinSchema.safeParse({
        clienteId: "cliente-1",
        newPin: "5678",
      });
      expect(result.success).toBe(true);
    });

    it("requiere clienteId", () => {
      const result = resetPinSchema.safeParse({
        newPin: "5678",
      });
      expect(result.success).toBe(false);
    });

    it("rechaza clienteId vacío", () => {
      const result = resetPinSchema.safeParse({
        clienteId: "",
        newPin: "5678",
      });
      expect(result.success).toBe(false);
    });

    it("rechaza newPin con formato inválido", () => {
      const result = resetPinSchema.safeParse({
        clienteId: "cliente-1",
        newPin: "abc",
      });
      expect(result.success).toBe(false);
    });

    it("rechaza newPin de 3 dígitos", () => {
      const result = resetPinSchema.safeParse({
        clienteId: "cliente-1",
        newPin: "123",
      });
      expect(result.success).toBe(false);
    });

    it("rechaza campos faltantes", () => {
      const result = resetPinSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });
});

// ─── Membresía Schemas ───────────────────────────────────────────────────────

describe("Membresía Schemas", () => {
  describe("createMembresiaSchema", () => {
    it("acepta fechas válidas", () => {
      const result = createMembresiaSchema.safeParse({
        fechaInicio: "2025-01-01",
        fechaFin: "2025-12-31",
      });
      expect(result.success).toBe(true);
    });

    it("acepta inicio igual a fin (membresía de un día)", () => {
      const result = createMembresiaSchema.safeParse({
        fechaInicio: "2025-06-15",
        fechaFin: "2025-06-15",
      });
      expect(result.success).toBe(true);
    });

    it("rechaza fecha de inicio inválida (mes 13)", () => {
      const result = createMembresiaSchema.safeParse({
        fechaInicio: "2025-13-01",
        fechaFin: "2025-12-31",
      });
      expect(result.success).toBe(false);
    });

    it("rechaza fecha fin inválida (día 32)", () => {
      const result = createMembresiaSchema.safeParse({
        fechaInicio: "2025-01-01",
        fechaFin: "2025-01-32",
      });
      expect(result.success).toBe(false);
    });

    it("rechaza formato de fecha inválido (DD/MM/YYYY)", () => {
      const result = createMembresiaSchema.safeParse({
        fechaInicio: "01/01/2025",
        fechaFin: "12/31/2025",
      });
      expect(result.success).toBe(false);
    });

    it("rechaza fin anterior a inicio", () => {
      const result = createMembresiaSchema.safeParse({
        fechaInicio: "2025-12-31",
        fechaFin: "2025-01-01",
      });
      expect(result.success).toBe(false);
    });

    it("rechaza campos requeridos faltantes", () => {
      const result = createMembresiaSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("rechaza fecha bisiesta inválida (29 febrero en año no bisiesto)", () => {
      const result = createMembresiaSchema.safeParse({
        fechaInicio: "2025-02-29",
        fechaFin: "2025-03-01",
      });
      expect(result.success).toBe(false);
    });

    it("acepta 29 febrero en año bisiesto", () => {
      const result = createMembresiaSchema.safeParse({
        fechaInicio: "2024-02-29",
        fechaFin: "2024-03-01",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("updateMembresiaSchema", () => {
    it("requiere version", () => {
      const result = updateMembresiaSchema.safeParse({
        fechaInicio: "2025-01-01",
      });
      expect(result.success).toBe(false);
    });

    it("acepta solo version (fechas opcionales)", () => {
      const result = updateMembresiaSchema.safeParse({
        version: 1,
      });
      expect(result.success).toBe(true);
    });

    it("acepta fechas opcionales con version", () => {
      const result = updateMembresiaSchema.safeParse({
        fechaInicio: "2025-01-01",
        fechaFin: "2025-12-31",
        version: 2,
      });
      expect(result.success).toBe(true);
    });

    it("rechaza version no entera", () => {
      const result = updateMembresiaSchema.safeParse({
        version: 1.5,
      });
      expect(result.success).toBe(false);
    });

    it("rechaza version negativa", () => {
      const result = updateMembresiaSchema.safeParse({
        version: -1,
      });
      expect(result.success).toBe(false);
    });

    it("rechaza version cero", () => {
      const result = updateMembresiaSchema.safeParse({
        version: 0,
      });
      expect(result.success).toBe(false);
    });

    it("rechaza fin anterior a inicio cuando ambas se envían", () => {
      const result = updateMembresiaSchema.safeParse({
        fechaInicio: "2025-12-31",
        fechaFin: "2025-01-01",
        version: 1,
      });
      expect(result.success).toBe(false);
    });

    it("acepta solo fechaInicio sin fechaFin", () => {
      const result = updateMembresiaSchema.safeParse({
        fechaInicio: "2025-06-01",
        version: 1,
      });
      expect(result.success).toBe(true);
    });

    it("acepta solo fechaFin sin fechaInicio", () => {
      const result = updateMembresiaSchema.safeParse({
        fechaFin: "2025-12-31",
        version: 1,
      });
      expect(result.success).toBe(true);
    });

    it("acepta objeto vacío sin version (falla por requerido)", () => {
      const result = updateMembresiaSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });
});
