import { describe, it, expect } from "vitest";

describe("inc12 nutricion schemas (RED)", () => {
  it("exporta planNutricionalSchema desde src/lib/plan-nutricional-schemas", async () => {
    const mod: any = await import("@/lib/plan-nutricional-schemas");
    expect(mod.planNutricionalSchema).toBeDefined();
  });
});