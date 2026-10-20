import { describe, it, expect } from "vitest";
import {
  createClienteSchema,
  updateClienteSchema,
  searchClientesSchema,
  clienteParamsSchema,
} from "../../src/schemas/cliente.schema.js";

describe("Cliente Schemas", () => {
  describe("createClienteSchema", () => {
    const validCliente = {
      cedula: "1234567890",
      nombres: "Carlos",
      apellidos: "López",
      telefono: "3001234567",
      sedeId: "sede-1",
    };

    it("acepta cliente válido", () => {
      const result = createClienteSchema.safeParse(validCliente);
      expect(result.success).toBe(true);
    });

    it("acepta cliente con email válido", () => {
      const result = createClienteSchema.safeParse({
        ...validCliente,
        email: "carlos@test.com",
      });
      expect(result.success).toBe(true);
    });

    it("acepta cliente con observaciones", () => {
      const result = createClienteSchema.safeParse({
        ...validCliente,
        observaciones: "Cliente nuevo",
      });
      expect(result.success).toBe(true);
    });

    it("rechaza cédula inválida", () => {
      const result = createClienteSchema.safeParse({
        ...validCliente,
        cedula: "12345",
      });
      expect(result.success).toBe(false);
    });

    it("rechaza cédula con letras", () => {
      const result = createClienteSchema.safeParse({
        ...validCliente,
        cedula: "abcdefgh",
      });
      expect(result.success).toBe(false);
    });

    it("rechaza nombres con números", () => {
      const result = createClienteSchema.safeParse({
        ...validCliente,
        nombres: "Carlos123",
      });
      expect(result.success).toBe(false);
    });

    it("rechaza nombres con caracteres especiales", () => {
      const result = createClienteSchema.safeParse({
        ...validCliente,
        nombres: "Carlos@",
      });
      expect(result.success).toBe(false);
    });

    it("rechaza apellidos inválidos", () => {
      const result = createClienteSchema.safeParse({
        ...validCliente,
        apellidos: "López123",
      });
      expect(result.success).toBe(false);
    });

    it("rechaza teléfono formato fijo", () => {
      const result = createClienteSchema.safeParse({
        ...validCliente,
        telefono: "2001234567",
      });
      expect(result.success).toBe(false);
    });

    it("rechaza teléfono corto", () => {
      const result = createClienteSchema.safeParse({
        ...validCliente,
        telefono: "300123456",
      });
      expect(result.success).toBe(false);
    });

    it("rechaza teléfono largo", () => {
      const result = createClienteSchema.safeParse({
        ...validCliente,
        telefono: "30012345678",
      });
      expect(result.success).toBe(false);
    });

    it("rechaza email con formato inválido", () => {
      const result = createClienteSchema.safeParse({
        ...validCliente,
        email: "invalido",
      });
      expect(result.success).toBe(false);
    });

    it("acepta email vacío (opcional)", () => {
      const result = createClienteSchema.safeParse({
        ...validCliente,
        email: "",
      });
      expect(result.success).toBe(true);
    });

    it("rechaza sedeId vacío", () => {
      const result = createClienteSchema.safeParse({
        ...validCliente,
        sedeId: "",
      });
      expect(result.success).toBe(false);
    });

    it("rechaza campos requeridos faltantes", () => {
      const result = createClienteSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("rechaza observaciones mayores a 500 caracteres", () => {
      const result = createClienteSchema.safeParse({
        ...validCliente,
        observaciones: "a".repeat(501),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateClienteSchema", () => {
    it("acepta actualización parcial válida", () => {
      const result = updateClienteSchema.safeParse({
        telefono: "3009999999",
      });
      expect(result.success).toBe(true);
    });

    it("acepta actualizar estado válido", () => {
      const result = updateClienteSchema.safeParse({
        estado: "ACTIVO",
      });
      expect(result.success).toBe(true);
    });

    it("rechaza estado inválido", () => {
      const result = updateClienteSchema.safeParse({
        estado: "ESTADO_INVALIDO",
      });
      expect(result.success).toBe(false);
    });

    /**
     * INC-04 / gap G-02 (DEC-035 + CONF-04/CONF-07): el motivo del cambio de
     * estado viaja en el mismo PATCH que el `estado`. Limites 3..200 con los
     * mensajes exactos del contrato G14 (`HU-08-schemas.ts:28-31`, espejo
     * `HU-17-schemas.ts:66-69`).
     */
    it("acepta motivo valido junto al estado (INC-04 / DEC-035)", () => {
      const result = updateClienteSchema.safeParse({
        estado: "INACTIVO",
        motivo: "Bloqueo por lesión de rodilla",
      });
      expect(result.success).toBe(true);
    });

    it("acepta motivo en el limite inferior de 3 caracteres (CONF-04)", () => {
      const result = updateClienteSchema.safeParse({
        estado: "RETIRADO",
        motivo: "abc",
      });
      expect(result.success).toBe(true);
    });

    it("acepta motivo en el limite superior de 200 caracteres (CONF-04)", () => {
      const result = updateClienteSchema.safeParse({
        estado: "SUSPENDIDO",
        motivo: "a".repeat(200),
      });
      expect(result.success).toBe(true);
    });

    it("rechaza motivo de 1 a 2 caracteres con el mensaje G14", () => {
      const result = updateClienteSchema.safeParse({
        estado: "INACTIVO",
        motivo: "ab",
      });
      expect(result.success).toBe(false);
      expect(result.error?.errors[0].message).toBe(
        "Motivo debe tener al menos 3 caracteres"
      );
    });

    it("rechaza motivo vacío literal con el mensaje G14 de longitud mínima", () => {
      const result = updateClienteSchema.safeParse({
        estado: "INACTIVO",
        motivo: "",
      });
      expect(result.success).toBe(false);
      expect(result.error?.errors[0].message).toBe(
        "Motivo debe tener al menos 3 caracteres"
      );
    });

    it("rechaza motivo de 201 caracteres con el mensaje G14", () => {
      const result = updateClienteSchema.safeParse({
        estado: "INACTIVO",
        motivo: "a".repeat(201),
      });
      expect(result.success).toBe(false);
      expect(result.error?.errors[0].message).toBe(
        "Motivo no puede exceder 200 caracteres"
      );
    });

    it("acepta motivo viajero sin estado (CONF-07: la obligatoriedad la emite el endpoint)", () => {
      const result = updateClienteSchema.safeParse({
        telefono: "3009999999",
        motivo: "Motivo viajero sin cambio de estado",
      });
      expect(result.success).toBe(true);
    });

    it("rechaza teléfono inválido", () => {
      const result = updateClienteSchema.safeParse({
        telefono: "2001234567",
      });
      expect(result.success).toBe(false);
    });

    it("rechaza email inválido", () => {
      const result = updateClienteSchema.safeParse({
        email: "invalido",
      });
      expect(result.success).toBe(false);
    });

    it("rechaza nombres inválidos", () => {
      const result = updateClienteSchema.safeParse({
        nombres: "Carlos123",
      });
      expect(result.success).toBe(false);
    });

    it("acepta objeto vacío (sin cambios)", () => {
      const result = updateClienteSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("acepta email null (viene de BD)", () => {
      const result = updateClienteSchema.safeParse({
        email: null,
      });
      expect(result.success).toBe(true);
    });

    it("acepta observaciones null (viene de BD)", () => {
      const result = updateClienteSchema.safeParse({
        observaciones: null,
      });
      expect(result.success).toBe(true);
    });

    it("acepta email y observaciones null juntos", () => {
      const result = updateClienteSchema.safeParse({
        email: null,
        observaciones: null,
        telefono: "3009999999",
      });
      expect(result.success).toBe(true);
    });

    it("acepta email válido con observaciones null", () => {
      const result = updateClienteSchema.safeParse({
        email: "test@test.com",
        observaciones: null,
      });
      expect(result.success).toBe(true);
    });

    it("acepta email vacío con observaciones null", () => {
      const result = updateClienteSchema.safeParse({
        email: "",
        observaciones: null,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("searchClientesSchema", () => {
    it("acepta query vacía", () => {
      const result = searchClientesSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("acepta búsqueda válida", () => {
      const result = searchClientesSchema.safeParse({
        search: "Carlos",
      });
      expect(result.success).toBe(true);
    });

    it("acepta filtro por sede", () => {
      const result = searchClientesSchema.safeParse({
        sedeId: "sede-1",
      });
      expect(result.success).toBe(true);
    });

    it("acepta filtro por estado válido", () => {
      const result = searchClientesSchema.safeParse({
        estado: "ACTIVO",
      });
      expect(result.success).toBe(true);
    });

    it("rechaza estado inválido", () => {
      const result = searchClientesSchema.safeParse({
        estado: "ESTADO_INVALIDO",
      });
      expect(result.success).toBe(false);
    });

    it("acepta paginación válida", () => {
      const result = searchClientesSchema.safeParse({
        page: "1",
        limit: "10",
      });
      expect(result.success).toBe(true);
    });

    it("rechaza page 0", () => {
      const result = searchClientesSchema.safeParse({
        page: "0",
      });
      expect(result.success).toBe(false);
    });

    it("rechaza page negativo", () => {
      const result = searchClientesSchema.safeParse({
        page: "-1",
      });
      expect(result.success).toBe(false);
    });

    it("rechaza page no numérico", () => {
      const result = searchClientesSchema.safeParse({
        page: "abc",
      });
      expect(result.success).toBe(false);
    });

    it("rechaza limit 0", () => {
      const result = searchClientesSchema.safeParse({
        limit: "0",
      });
      expect(result.success).toBe(false);
    });

    it("rechaza limit mayor a 100", () => {
      const result = searchClientesSchema.safeParse({
        limit: "101",
      });
      expect(result.success).toBe(false);
    });

    it("rechaza limit no numérico", () => {
      const result = searchClientesSchema.safeParse({
        limit: "abc",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("clienteParamsSchema", () => {
    it("acepta id válido", () => {
      const result = clienteParamsSchema.safeParse({ id: "cliente-1" });
      expect(result.success).toBe(true);
    });

    it("rechaza id vacío", () => {
      const result = clienteParamsSchema.safeParse({ id: "" });
      expect(result.success).toBe(false);
    });

    it("rechaza id faltante", () => {
      const result = clienteParamsSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });
});
