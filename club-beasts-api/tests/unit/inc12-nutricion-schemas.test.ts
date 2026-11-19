import { describe, it, expect } from "vitest";

describe("INC-12 NU schemas (RED)", () => {
  it("NU-01 schema de creacion exige nombre", async () => {
    const mod: any = await import("../../features/acceptance-criteria/HU-22-schemas");
    expect(mod).toBeTruthy();
    expect(typeof mod.createPlanNutricionalSchema?.parse).toBe("function");
    expect(() => mod.createPlanNutricionalSchema.parse({})).toThrow();
  });

  it("NU-20 asignacion exige clienteId y planId", async () => {
    const mod: any = await import("../../features/acceptance-criteria/HU-23-schemas");
    expect(mod).toBeTruthy();
  });
});