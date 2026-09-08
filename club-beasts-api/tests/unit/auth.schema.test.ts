import { describe, it, expect } from "vitest";
import {
  loginUserSchema,
  loginClientSchema,
  resetPinSchema,
} from "../../src/schemas/auth.schema.js";

describe("Auth Schemas", () => {
  describe("loginUserSchema", () => {
    it("acepta email y password válidos", () => {
      const result = loginUserSchema.safeParse({
        email: "test@example.com",
        password: "admin123",
      });
      expect(result.success).toBe(true);
    });

    it("rechaza email vacío", () => {
      const result = loginUserSchema.safeParse({
        email: "",
        password: "admin123",
      });
      expect(result.success).toBe(false);
    });

    it("rechaza email sin formato válido", () => {
      const result = loginUserSchema.safeParse({
        email: "sinformato",
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
        email: "test@example.com",
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

    it("acepta cédula de 6 dígitos", () => {
      const result = loginClientSchema.safeParse({
        cedula: "123456",
        pin: "1234",
      });
      expect(result.success).toBe(true);
    });

    it("acepta cédula de 10 dígitos", () => {
      const result = loginClientSchema.safeParse({
        cedula: "1234567890",
        pin: "1234",
      });
      expect(result.success).toBe(true);
    });

    it("rechaza cédula de 5 dígitos", () => {
      const result = loginClientSchema.safeParse({
        cedula: "12345",
        pin: "1234",
      });
      expect(result.success).toBe(false);
    });

    it("rechaza cédula de 11 dígitos", () => {
      const result = loginClientSchema.safeParse({
        cedula: "12345678901",
        pin: "1234",
      });
      expect(result.success).toBe(false);
    });

    it("rechaza cédula con letras", () => {
      const result = loginClientSchema.safeParse({
        cedula: "abcdefgh",
        pin: "1234",
      });
      expect(result.success).toBe(false);
    });

    it("rechaza cédula vacía", () => {
      const result = loginClientSchema.safeParse({
        cedula: "",
        pin: "1234",
      });
      expect(result.success).toBe(false);
    });

    it("acepta PIN de 4 dígitos", () => {
      const result = loginClientSchema.safeParse({
        cedula: "1234567890",
        pin: "5678",
      });
      expect(result.success).toBe(true);
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

    it("rechaza PIN con letras", () => {
      const result = loginClientSchema.safeParse({
        cedula: "1234567890",
        pin: "abcd",
      });
      expect(result.success).toBe(false);
    });

    it("rechaza PIN vacío", () => {
      const result = loginClientSchema.safeParse({
        cedula: "1234567890",
        pin: "",
      });
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

    it("rechaza clienteId vacío", () => {
      const result = resetPinSchema.safeParse({
        clienteId: "",
        newPin: "5678",
      });
      expect(result.success).toBe(false);
    });

    it("rechaza newPin inválido", () => {
      const result = resetPinSchema.safeParse({
        clienteId: "cliente-1",
        newPin: "abcd",
      });
      expect(result.success).toBe(false);
    });

    it("rechaza campos faltantes", () => {
      const result = resetPinSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });
});
