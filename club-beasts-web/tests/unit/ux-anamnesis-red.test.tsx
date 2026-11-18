import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "..", "..");
const FILES = [
  "src/components/anamnesis/AnamnesisSection.tsx",
  "src/components/anamnesis/AnamnesisVista.tsx",
  "src/components/anamnesis/AnamnesisEditor.tsx",
  "src/components/MembershipSection.tsx",
];

describe("UX-01 font-display en encabezados (RED)", () => {
  for (const f of FILES) {
    it(`${f} no usa font-oswald y usa font-display`, () => {
      const src = readFileSync(resolve(ROOT, f), "utf8");
      expect(src).not.toMatch(/font-oswald/);
      expect(src).toMatch(/font-display/);
    });
  }
});

// UX-02..UX-04 moved to dedicated files ux-anamnesis-ux0*.test.tsx
